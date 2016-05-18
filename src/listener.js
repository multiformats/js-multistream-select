'use strict'

const lpm = require('length-prefixed-message')
const PROTOCOL_ID = require('./protocol-id')
const varint = require('varint')

exports = module.exports = Listener

function Listener () {
  if (!(this instanceof Listener)) {
    return new Listener()
  }

  const handlers = {}
  let conn

  // perform the multistream handshake
  this.handle = (_conn, callback) => {
    lpm.write(_conn, new Buffer(PROTOCOL_ID + '\n'))
    listenerMultistreamHandshakeCheck()

    function listenerMultistreamHandshakeCheck () {
      lpm.read(_conn, (buffer) => {
        const msg = buffer.toString().slice(0, -1)
        if (msg === PROTOCOL_ID) {
          conn = _conn
          lpm.read(conn, incMsg)
          callback()
        } else {
          // TODO This would be where we try to support other versions
          // of multistream (backwards compatible). Currently we have
          // just one, so this never happens.
          return callback(new Error('not supported version of multistream'))
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

  // be ready for a given `protocol`
  this.addHandler = (protocol, handlerFunc) => {
    if ((typeof handlerFunc !== 'function')) {
      throw new Error('handler function must be a function')
    }

    handlers[protocol] = handlerFunc
  }
}
