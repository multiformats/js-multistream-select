'use strict'

const Rx = require('rxjs/Rx')
const varint = require('varint')

const PROTOCOL_ID = require('./protocol-id')
const varintObserver = require('./varint').create
const mMsg = require('./m-msg')

module.exports = class Dialer {
  // perform the multistream handshake
  handle (observer) {
    this.conn = varintObserver(observer)

    this.messages = this.conn
      .first()
      .mergeMap((msg) => {
        if (msg === PROTOCOL_ID) {
          this.conn.next(mMsg(PROTOCOL_ID))
          return this.conn.skip(1)
        }

        return Rx.Observable.throw(new Error('Incompatible multistream'))
      })
      .map((msg) => msg.toString().slice(0, -1))
  }

  select (protocol) {
    const res = new Rx.Subject()
    if (!this.conn) {
      return Rx.Observable.throw(new Error('Handshake not completed'))
    }

    this.conn.next(mMsg(protocol))

    this.messages
      .first()
      .mergeMap((msg) => {
        if (msg === protocol) {
          return this.messages.skip(1)
        }

        if (msg === 'na') {
          return Rx.Observable.throw(
            new Error(`${protocol} not supported`)
          )
        }

        return Rx.Observable.throw(
          new Error('Unkown message type')
        )
      })
      .subscribe(res)

    this.conn.subscribe(res)

    return res
  }

  ls () {
    this.conn.next(mMsg('ls'))
    return this.messages
      .first()
      .mergeMap((msg) => {
        const size = varint.decode(msg) // eslint-disable-line
        const nProtos = varint.decode(msg, varint.decode.bytes)
        return this.messages.skip(1).take(nProtos)
      })
  }
}
