'use strict'

const handshake = require('pull-handshake')
const pullLP = require('pull-length-prefixed')
const util = require('./util')
const writeEncoded = util.writeEncoded

const errCode = require('err-code')
const { errors } = require('./constants')

function select (multicodec, callback, log) {
  const stream = handshake({
    timeout: 60 * 1000
  }, callback)

  const shake = stream.handshake

  log('writing multicodec: ' + multicodec)
  writeEncoded(shake, Buffer.from(multicodec + '\n'), callback)

  pullLP.decodeFromReader(shake, (err, data) => {
    if (err) {
      return callback(err)
    }
    const protocol = data.toString().slice(0, -1)

    if (protocol !== multicodec) {
      const err = errCode(new Error(`"${multicodec}" not supported`), errors.MULTICODEC_NOT_SUPPORTED)

      return callback(err, shake.rest())
    }

    log('received ack: ' + protocol)
    callback(null, shake.rest())
  })

  return stream
}

module.exports = select
