'use strict'

const lpm = require('length-prefixed-message')
const PROTOCOL_ID = require('./protocol-id')
const varint = require('varint')
const range = require('lodash.range')
const parallel = require('run-parallel')

exports = module.exports = Multistream

function Multistream (conn, isListener, readyCallback) {
  if (!(this instanceof Multistream)) {
    return new Multistream(conn, isListener, readyCallback)
  }

  if (typeof isListener === 'function') {
    readyCallback = isListener
    isListener = false
  }

  if (!readyCallback) {
    readyCallback = function noop () {}
  }

  const handlers = {}

  this.addHandler = (protocol, handlerFunc) => {
    if (!isListener) {
      throw new Error('This conn is not on listener mode, can not handle')
    }

    if ((typeof handlerFunc !== 'function')) {
      throw new Error('handler function must be a function')
    }

    handlers[protocol] = handlerFunc
  }

  this.select = (protocol, callback) => {
    if (isListener) {
      return callback(new Error('This conn is on listener mode, can not select'))
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
    if (isListener) {
      return callback(new Error('This conn is on listener mode, can not ls'))
    }

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

  if (isListener) {
    lpm.write(conn, new Buffer(PROTOCOL_ID + '\n'))
    listenerMultistreamHandshakeCheck()
  } else {
    lpm.read(conn, (buffer) => {
      const msg = buffer.toString().slice(0, -1)
      if (msg === PROTOCOL_ID) {
        lpm.write(conn, new Buffer(PROTOCOL_ID + '\n'))
        readyCallback(null, this)
      } else {
        readyCallback(new Error('Incompatible multistream'))
      }
    })
  }

  function listenerMultistreamHandshakeCheck () {
    lpm.read(conn, (buffer) => {
      const msg = buffer.toString().slice(0, -1)
      if (msg === PROTOCOL_ID) {
        lpm.read(conn, incMsg)
        readyCallback(null, this)
      } else {
        // TODO This would be where we try to support other versions
        // of multistream (backwards compatible). Currently we have
        // just one, so this never happens.
        return readyCallback(new Error('not supported version of multistream'))
      }
    })
  }

  function incMsg (msgBuffer) {
    const msg = msgBuffer.toString().slice(0, -1)

    if (msg === 'ls') {
      const protos = Object.keys(handlers)
      const nProtos = protos.length
      // total size of the list of protocols, including varint and newline
      const size = protos.reduce((size, proto) => {
        var p = new Buffer(proto + '\n')
        var el = varint.encodingLength(p.length)
        return size + el
      }, 0)

      var nProtoVI = new Buffer(varint.encode(nProtos))
      var sizeVI = new Buffer(varint.encode(size))
      var buf = Buffer.concat([nProtoVI, sizeVI, new Buffer('\n')])
      lpm.write(conn, buf)
      protos.forEach((proto) => {
        lpm.write(conn, new Buffer(proto + '\n'))
      })
    }

    if (handlers[msg]) {
      // Protocol supported, ACK back
      lpm.write(conn, new Buffer(msg + '\n'))
      return handlers[msg](conn)
    } else {
      // Protocol not supported, wait for new handshake
      lpm.write(conn, new Buffer('na' + '\n'))
    }

    // continue listening
    lpm.read(conn, incMsg)
  }
}

function times (i, work, callback) {
  parallel(range(i).map((i) => (callback) => work(i, callback)), callback)
}
