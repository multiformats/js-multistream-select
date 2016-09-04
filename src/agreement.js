'use strict'

const handshake = require('pull-handshake')
const lp = require('pull-length-prefixed')
const pull = require('pull-stream')
const Connection = require('interface-connection').Connection
const debug = require('debug')
const log = debug('multistream:agreement')
log.error = debug('multistream:agreement:error')

exports.dial = (header, cb) => {
  const stream = handshake({timeout: 60 * 1000}, cb)
  const shake = stream.handshake

  log('writing header %s', header)
  writeEncoded(shake, new Buffer(header + '\n'), cb)

  lp.decodeFromReader(shake, (err, data) => {
    if (err) return cb(err)
    const protocol = data.toString().slice(0, -1)
    if (protocol !== header) {
      cb(new Error(`Unkown header: "${protocol}"`))
    }

    log('header ack')
    cb(null, shake.rest())
  })

  return stream
}

exports.listen = (rawConn, handlersMap, defaultHandler) => {
  const cb = (err) => {
    // TODO: pass errors somewhere
    log.error(err)
  }
  const stream = handshake({timeout: 60 * 1000}, cb)
  const shake = stream.handshake

  lp.decodeFromReader(shake, (err, data) => {
    if (err) return cb(err)
    log('received: %s', data.toString())
    const protocol = data.toString().slice(0, -1)
    const [key] = Object.keys(handlersMap).filter((id) => id === protocol)

    if (key) {
      log('ack: %s', protocol)
      writeEncoded(shake, data, cb)
      handlersMap[key](new Connection(shake.rest(), rawConn))
    } else {
      log('unkown protocol: %s', protocol)
      defaultHandler(protocol, shake.rest())
    }
  })

  return stream
}

function encode (msg, cb) {
  const values = Buffer.isBuffer(msg) ? [msg] : [new Buffer(msg)]

  pull(
    pull.values(values),
    lp.encode(),
    pull.collect((err, encoded) => {
      if (err) return cb(err)
      cb(null, encoded[0])
    })
  )
}

function writeEncoded (writer, msg, cb) {
  encode(msg, (err, msg) => {
    if (err) return cb(err)
    writer.write(msg)
  })
}
