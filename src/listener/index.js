'use strict'

const pull = require('pull-stream')
const isFunction = require('lodash.isfunction')
const assert = require('assert')
const select = require('../select')
const selectHandler = require('./select-handler')
const lsHandler = require('./ls-handler')
const matchExact = require('./match-exact')

const util = require('./../util')
const Connection = require('interface-connection').Connection

const PROTOCOL_ID = require('./../constants').PROTOCOL_ID

module.exports = class Listener {
  constructor () {
    this.handlers = {
      ls: {
        handlerFunc: (protocol, conn) => lsHandler(this, conn),
        matchFunc: matchExact

      }
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
  addHandler (protocol, handlerFunc, matchFunc) {
    this.log('adding handler: ' + protocol)
    assert(isFunction(handlerFunc), 'handler must be a function')

    if (this.handlers[protocol]) {
      this.log('overwriting handler for ' + protocol)
    }

    if (!matchFunc) {
      matchFunc = matchExact
    }

    this.handlers[protocol] = {
      handlerFunc: handlerFunc,
      matchFunc: matchFunc
    }
  }
}
