'use strict'

const varint = require('varint')
const pull = require('pull-stream')
const pullLP = require('pull-length-prefixed')
const Connection = require('interface-connection').Connection
const util = require('../util')
const select = require('../select')

const PROTOCOL_ID = require('./../constants').PROTOCOL_ID

module.exports = class Dialer {
  constructor () {
    this.conn = null
    this.log = util.log.dialer()
  }

  // perform the multistream handshake
  handle (rawConn, callback) {
    this.log('dialer handle conn')
    const s = select(PROTOCOL_ID, (err, conn) => {
      if (err) {
        return callback(err)
      }
      this.log('handshake success')

      this.conn = new Connection(conn, rawConn)

      callback()
    }, this.log)

    pull(
      rawConn,
      s,
      rawConn
    )
  }

  select (protocol, callback) {
    this.log('dialer select ' + protocol)
    if (!this.conn) {
      return callback(new Error('multistream handshake has not finalized yet'))
    }

    const s = select(protocol, (err, conn) => {
      if (err) {
        this.conn = new Connection(conn, this.conn)
        return callback(err)
      }
      callback(null, new Connection(conn, this.conn))
    }, this.log)

    pull(
      this.conn,
      s,
      this.conn
    )
  }

  ls (callback) {
    const lsStream = select('ls', (err, conn) => {
      if (err) {
        return callback(err)
      }

      pull(
        conn,
        pullLP.decode(),
        collectLs(conn),
        pull.map(stringify),
        pull.collect((err, list) => {
          if (err) {
            return callback(err)
          }
          callback(null, list.slice(1))
        })
      )
    }, this.log)

    pull(
      this.conn,
      lsStream,
      this.conn
    )
  }
}

function stringify (buf) {
  return buf.toString().slice(0, -1)
}

function collectLs (conn) {
  let first = true
  let counter = 0

  return pull.take((msg) => {
    if (first) {
      varint.decode(msg)
      counter = varint.decode(msg, varint.decode.bytes)
      return true
    }

    return counter-- > 0
  })
}
