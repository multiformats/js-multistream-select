'use strict'
const Rx = require('rxjs/Rx')
const varint = require('varint')

exports.encode = function encode (msg) {
  return Buffer.concat([
    new Buffer(varint.encode(msg.length)),
    Buffer.isBuffer(msg) ? msg : new Buffer (msg)
  ])
}

// [_, 1, _, 0, 3, 2, _, 3, 3]
function toBytes (observer) {
  return observer.mergeMap((msg) => {
    if (msg.length === 1) {
      return Rx.Observable.of(msg)
    }

    return Rx.Observable.from(msg.toJSON().data)
  })
}

class MsgState {
  constructor () {
    this.parsingLength = true
    this.lengthBytes = []
    this.messageBytes = []
    this.length = null
  }

  get ready () {
    return this.length === this.messageBytes.length
  }

  get message () {
    return new Buffer(this.messageBytes)
  }

  get parsingMessage () {
    return !this.parsingLength
  }

  add (byte) {
    if (this.parsingLength) {
      this.lengthBytes.push(byte)
      const len = varint.decode(this.lengthBytes)
      if (len) {
        this.length = len
        this.parsingLength = false
      }
      return this
    }

    if (this.ready) {
      const state = new MsgState()
      state.add(byte)
      return state
    }

    if (this.parsingMessage) {
      this.messageBytes.push(byte)
      return this
    }
  }
}

exports.create = function createVarint (observer) {
  const res = toBytes(observer)
          .scan(
            (state, byte) => state.add(byte),
            new MsgState()
          )
          .filter((state) => state.ready)
          .map((state) => state.message)

  res.next = (msg) => {
    console.log('writing', msg)
    observer.next(exports.encode(msg))
  }

  return res
}
