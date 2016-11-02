'use strict'

const pull = require('pull-stream')
const pullLP = require('pull-length-prefixed')
const varint = require('varint')
const isFunction = require('lodash.isfunction')
const assert = require('assert')
const select = require('../select')
const selectHandler = require('./selectHandler')
const util = require('./../util')
const Connection = require('interface-connection').Connection

const PROTOCOL_ID = require('./../constants').PROTOCOL_ID

module.exports = class Listener {
  constructor () {
    this.handlers = {
      ls: (conn) => this._ls(conn)
    }
    this.log = util.log.listener()
  }

  // perform the multistream handshake
  handle (rawConn, callback) {
    this.log('listener handle conn')

    const selectStream = select(PROTOCOL_ID, (err, conn) => {
      if (err) {
        return callback(err)
      }

      const shConn = new Connection(conn, rawConn)

      const sh = selectHandler(shConn, this.handlers, this.log)

      pull(
        shConn,
        sh,
        shConn
      )

      callback()
    }, this.log)

    pull(
      rawConn,
      selectStream,
      rawConn
    )
  }

  // be ready for a given `protocol`
  addHandler (protocol, handler) {
    this.log('adding handler: ' + protocol)
    assert(isFunction(handler), 'handler must be a function')

    if (this.handlers[protocol]) {
      this.log('overwriting handler for ' + protocol)
    }

    this.handlers[protocol] = handler
  }

  // inner function - handler for `ls`
  _ls (conn) {
    const protos = Object.keys(this.handlers)
      .filter((key) => key !== 'ls')
    const nProtos = protos.length
    // total size of the list of protocols, including varint and newline
    const size = protos.reduce((size, proto) => {
      const p = new Buffer(proto + '\n')
      const el = varint.encodingLength(p.length)
      return size + el
    }, 0)

    const buf = Buffer.concat([
      new Buffer(varint.encode(nProtos)),
      new Buffer(varint.encode(size)),
      new Buffer('\n')
    ])

    const encodedProtos = protos.map((proto) => {
      return new Buffer(proto + '\n')
    })
    const values = [buf].concat(encodedProtos)

    pull(
      pull.values(values),
      pullLP.encode(),
      conn
    )
  }
}
