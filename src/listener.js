'use strict'

const lps = require('length-prefixed-stream')
const PROTOCOL_ID = require('./protocol-id')
const varint = require('varint')

exports = module.exports = Listener

function Listener () {
  if (!(this instanceof Listener)) {
    return new Listener()
  }

  const handlers = {}
  const encode = lps.encode()
  const decode = lps.decode()
  let conn

  // perform the multistream handshake
  this.handle = (_conn, callback) => {
    encode.pipe(_conn)
    _conn.pipe(decode)

    encode.write(new Buffer(PROTOCOL_ID + '\n'))

    decode.once('data', (buffer) => {
      const msg = buffer.toString().slice(0, -1)
      if (msg === PROTOCOL_ID) {
        conn = _conn
        decode.once('data', incMsg)
        callback()
      } else {
        // TODO This would be where we try to support other versions
        // of multistream (backwards compatible). Currently we have
        // just one, so this never happens.
        return callback(new Error('not supported version of multistream'))
      }
    })

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
        encode.write(buf)
        protos.forEach((proto) => {
          encode.write(new Buffer(proto + '\n'))
        })
      }

      if (handlers[msg]) {
        // Protocol supported, ACK back
        encode.write(new Buffer(msg + '\n'))
        return handlers[msg](conn)
      } else {
        // Protocol not supported, wait for new handshake
        encode.write(new Buffer('na' + '\n'))
      }

      decode.once('data', incMsg)
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
