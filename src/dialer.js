'use strict'

const lpm = require('length-prefixed-message')
const PROTOCOL_ID = require('./protocol-id')
const varint = require('varint')
const range = require('lodash.range')
const parallel = require('run-parallel')

exports = module.exports = Dialer

function Dialer () {
  if (!(this instanceof Dialer)) {
    return new Dialer()
  }
  let conn

  // perform the multistream handshake
  this.handle = (_conn, callback) => {
    lpm.read(_conn, (buffer) => {
      const msg = buffer.toString().slice(0, -1)
      if (msg === PROTOCOL_ID) {
        lpm.write(_conn, new Buffer(PROTOCOL_ID + '\n'))
        conn = _conn
        callback()
      } else {
        callback(new Error('Incompatible multistream'))
      }
    })
  }

  this.select = (protocol, callback) => {
    if (!conn) {
      return callback(new Error('multistream handshake has not finalized yet'))
    }

    lpm.write(conn, new Buffer(protocol + '\n'))
    lpm.read(conn, function (msgBuffer) {
      const msg = msgBuffer.toString().slice(0, -1)
      if (msg === protocol) {
        return callback(null, conn)
      }
      if (msg === 'na') {
        return callback(new Error(protocol + ' not supported'))
      }
    })
  }

  this.ls = (callback) => {
    lpm.write(conn, new Buffer('ls' + '\n'))
    let protos = []
    lpm.read(conn, function (msgBuffer) {
      const size = varint.decode(msgBuffer) // eslint-disable-line
      const nProtos = varint.decode(msgBuffer, varint.decode.bytes)

      times(nProtos, (n, next) => {
        lpm.read(conn, function (msgBuffer) {
          protos.push(msgBuffer.toString().slice(0, -1))
          next()
        })
      }, (err) => {
        if (err) {
          return callback(err)
        }
        callback(null, protos)
      })
    })
  }
}

function times (i, work, callback) {
  parallel(range(i).map((i) => (callback) => work(i, callback)), callback)
}
