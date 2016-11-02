'use strict'

const pull = require('pull-stream')
const isFunction = require('lodash.isfunction')
const assert = require('assert')
const select = require('../select')
const selectHandler = require('./selectHandler')
const lsHandler = require('./lsHandler')

const util = require('./../util')
const Connection = require('interface-connection').Connection

const PROTOCOL_ID = require('./../constants').PROTOCOL_ID

module.exports = class Listener {
  constructor () {
    this.handlers = {
      ls: (protocol, conn) => lsHandler(this, conn)
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
}
