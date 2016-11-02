'use strict'

const handshake = require('pull-handshake')
const lp = require('pull-length-prefixed')
const Connection = require('interface-connection').Connection
const writeEncoded = require('../util.js').writeEncoded

function selectHandler (rawConn, handlersMap, log) {
  const cb = (err) => {
    // incoming errors are irrelevant for the app
    log.error(err)
  }

  const stream = handshake({ timeout: 60 * 1000 }, cb)
  const shake = stream.handshake

  next()
  return stream

  function next () {
    lp.decodeFromReader(shake, (err, data) => {
      if (err) {
        return cb(err)
      }
      log('received:', data.toString())
      const protocol = data.toString().slice(0, -1)
      const result = Object.keys(handlersMap).filter((id) => id === protocol)
      const key = result && result[0]

      if (key) {
        log('send ack back of: ' + protocol)
        writeEncoded(shake, data, cb)
        handlersMap[key](new Connection(shake.rest(), rawConn))
      } else {
        log('not supported protocol: ' + protocol)
        writeEncoded(shake, new Buffer('na\n'))
        next()
      }
    })
  }
}

module.exports = selectHandler
