'use strict'
const Rx = require('rxjs/Rx')
const varint = require('varint')

exports.encode = function encode (msg) {
  return Buffer.concat([
    new Buffer(varint.encode(msg.length)),
    msg
  ])
}

// [_, 1, _, 0, 3, 2, _, 3, 3]

exports.create = function createVarint (observer) {
  const bytes = observer.mergeMap((msg) => {
    if (msg.length === 1) {
      return Rx.Observable.of(msg)
    }

    return Rx.Observable.from(msg.toJSON().data)
  })

  const delimiter = bytes.filter((byte) => !(byte & 0x80))

  // len|___len|___len|___len
  const res = bytes
          .bufferWhen(delimiter)
          .bufferCount(2)
          .expand(([len, msg]) => {
            const parsedLen = varint.decode(len)
            return Rx.Observable
              .of(msg.slice(parsedLen))
              .concat(rest.skip(2))
          })

  res.next = (msg) => {
    observer.next(exports.encode(msg))
  }

  return res
}
