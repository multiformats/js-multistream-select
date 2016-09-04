'use strict'

const lp = require('pull-length-prefixed')
const varint = require('varint')
const pull = require('pull-stream')
const Connection = require('interface-connection').Connection
const debug = require('debug')
const log = debug('multistream:dialer')

const PROTOCOL_ID = require('./constants').PROTOCOL_ID
const agrmt = require('./agreement')

module.exports = class Dialer {
  constructor () {
    this.conn = null
  }

  // perform the multistream handshake
  handle (rawConn, callback) {
    log('handling connection')
    const ms = agrmt.select(PROTOCOL_ID, (err, conn) => {
      if (err) {
        return callback(err)
      }
      log('handshake success')

      this.conn = new Connection(conn, rawConn)

      callback()
    })
    pull(rawConn, ms, rawConn)
  }

  select (protocol, callback) {
    log('dialer select %s', protocol)
    if (!this.conn) {
      return callback(new Error('multistream handshake has not finalized yet'))
    }

    const selectStream = agrmt.select(protocol, (err, conn) => {
      if (err) {
        this.conn = new Connection(conn, this.conn)
        return callback(err)
      }
      callback(null, new Connection(conn, this.conn))
    })

    pull(
      this.conn,
      selectStream,
      this.conn
    )
  }

  ls (callback) {
    const lsStream = agrmt.select('ls', (err, conn) => {
      if (err) {
        return callback(err)
      }

      pull(
        conn,
        lp.decode(),
        collectLs(conn),
        pull.map(stringify),
        pull.collect((err, list) => {
          if (err) {
            return callback(err)
          }
          callback(null, list.slice(1))
        })
      )
    })

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
      const size = varint.decode(msg) // eslint-disable-line
      counter = varint.decode(msg, varint.decode.bytes)
      return true
    }

    return counter-- > 0
  })
}
