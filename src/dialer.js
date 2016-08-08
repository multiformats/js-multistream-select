'use strict'

const lp = require('pull-length-prefixed')
const varint = require('varint')
const pull = require('pull-stream')
const debug = require('debug')
const log = debug('libp2p:multistream:dialer')

const PROTOCOL_ID = require('./protocol-id')
const agreement = require('./agreement')

module.exports = class Dialer {
  constructor () {
    this.conn = null
  }

  // perform the multistream handshake
  handle (conn, cb) {
    log('handling connection')
    const ms = agreement.dial(PROTOCOL_ID, (err, conn) => {
      if (err) {
        return cb(err)
      }
      log('handshake success')

      this.conn = conn
      cb()
    })
    pull(conn, ms, conn)
  }

  select (protocol, cb) {
    log('selecting %s', protocol)
    if (!this.conn) {
      return cb(new Error('multistream handshake has not finalized yet'))
    }

    const stream = agreement.dial(protocol, (err, conn) => {
      if (err) {
        return cb(err)
      }
      // TODO: handle 'na'

      cb(null, conn)
    })

    pull(this.conn, stream, this.conn)
  }

  ls (cb) {
    const ls = agreement.dial('ls', (err, conn) => {
      if (err) return cb(err)

      pull(
        conn,
        lp.decode(),
        collectLs(conn),
        pull.map(stringify),
        pull.collect((err, list) => {
          if (err) return cb(err)
          return cb(null, list.slice(1))
        })
      )
    })

    pull(this.conn, ls, this.conn)
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
