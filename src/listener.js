'use strict'

const Rx = require('rxjs/Rx')
const PROTOCOL_ID = require('./protocol-id')
const varint = require('varint')

module.exports = class Listener {
  handle (observer) {
    const varObserver = createVarint(observer)

    varObserver
      .first()
      .mergeMap((msg) => {
        if (msg === PROTOCOL_ID) {
          return varObserver.skip(1)
        }
        // TODO This would be where we try to support other versions
        // of multistream (backwards compatible). Currently we have
        // just one, so this never happens.
        return Rx.Observable.throw(
          new Error('not supported version of multistream')
        )
      })

    varObserver.next(new Buffer(PROTOCOL_ID + '\n'))

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
  select (protocol) {

  }
}
