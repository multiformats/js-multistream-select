'use strict'

const lps = require('length-prefixed-stream')
const PROTOCOL_ID = require('./protocol-id')
const varint = require('varint')
const range = require('lodash.range')
const series = require('run-series')

exports = module.exports = Dialer

function Dialer () {
  if (!(this instanceof Dialer)) {
    return new Dialer()
  }

  const encode = lps.encode()
  const decode = lps.decode()
  let conn

  // perform the multistream handshake
  this.handle = (_conn, callback) => {
    encode.pipe(_conn)
    _conn.pipe(decode)

    decode.once('data', (buffer) => {
      const msg = buffer.toString().slice(0, -1)
      if (msg === PROTOCOL_ID) {
        encode.write(new Buffer(PROTOCOL_ID + '\n'))
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

    encode.write(new Buffer(protocol + '\n'))
    decode.once('data', function (msgBuffer) {
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
    encode.write(new Buffer('ls' + '\n'))
    let protos = []
    decode.once('data', function (msgBuffer) {
      const size = varint.decode(msgBuffer) // eslint-disable-line
      const nProtos = varint.decode(msgBuffer, varint.decode.bytes)

      timesSeries(nProtos, (n, next) => {
        decode.once('data', function (msgBuffer) {
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

function timesSeries (i, work, callback) {
  series(range(i).map((i) => (callback) => work(i, callback)), callback)
}
