'use strict'

const handshake = require('pull-handshake')
const lp = require('pull-length-prefixed')
const pull = require('pull-stream')
const Connection = require('interface-connection').Connection
const debug = require('debug')
const log = debug('multistream:agreement')
log.error = debug('multistream:agreement:error')

exports.select = (multicodec, callback, msThreadId) => {
  const stream = handshake({
    timeout: 60 * 1000
  }, callback)

  const shake = stream.handshake

  log('(%s) writing multicodec %s', msThreadId, multicodec)
  writeEncoded(shake, new Buffer(multicodec + '\n'), callback)

  lp.decodeFromReader(shake, (err, data) => {
    if (err) {
      return callback(err)
    }
    const protocol = data.toString().slice(0, -1)

    if (protocol !== multicodec) {
      return callback(new Error(`"${multicodec}" not supported`), shake.rest())
    }

    log('(%s) received ack: %s', msThreadId, protocol)
    callback(null, shake.rest())
  })

  return stream
}

exports.handlerSelector = (rawConn, handlersMap, msThreadId) => {
  const cb = (err) => {
    // incoming errors are irrelevant for the app
    log.error(err)
  }

  const stream = handshake({
    timeout: 60 * 1000
  }, cb)

  const shake = stream.handshake

  next()

  function next () {
    lp.decodeFromReader(shake, (err, data) => {
      if (err) {
        return cb(err)
      }
      log('(%s) received: %s', msThreadId, data.toString())
      const protocol = data.toString().slice(0, -1)
      const result = Object.keys(handlersMap).filter((id) => id === protocol)
      const key = result && result[0]

      if (key) {
        log('(%s) send ack back of: %s', msThreadId, protocol)
        writeEncoded(shake, data, cb)
        handlersMap[key](new Connection(shake.rest(), rawConn))
      } else {
        log('(%s) not supported protocol: %s',
            msThreadId, protocol)
        writeEncoded(shake, new Buffer('na\n'))
        next()
      }
    })
  }

  return stream
}

// prefixes a message with a varint
function encode (msg, cb) {
  const values = Buffer.isBuffer(msg) ? [msg] : [new Buffer(msg)]

  pull(
    pull.values(values),
    lp.encode(),
    pull.collect((err, encoded) => {
      if (err) {
        return cb(err)
      }
      cb(null, encoded[0])
    })
  )
}

function writeEncoded (writer, msg, cb) {
  encode(msg, (err, msg) => {
    if (err) {
      return cb(err)
    }
    writer.write(msg)
  })
}
