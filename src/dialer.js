'use strict'

const Rx = require('rxjs/Rx')
const varint = require('varint')
const debug = require('debug')
const log = debug('multistream:dialer')

const PROTOCOL_ID = require('./protocol-id')
const varintObserver = require('./varint').create
const mMsg = require('./m-msg')

module.exports = class Dialer {
  // perform the multistream handshake
  handle (observer) {
    log('adding handler')

    this.conn = varintObserver(observer)
      .map((msg) => msg.toString().slice(0, -1))

    this.messages = this.conn
      .first()
      .mergeMap((msg) => {
        if (msg === PROTOCOL_ID) {
          log('ack multistream')
          this.conn.next(mMsg(PROTOCOL_ID))
          return this.conn.skip(1)
        }

        return Rx.Observable.throw(new Error('Incompatible multistream'))
      })
  }

  select (protocol) {
    log('selecting: %s', protocol)

    if (!this.conn) {
      return Rx.Observable.throw(new Error('Handshake not completed'))
    }

    this.conn.next(mMsg(protocol))

    const res = this.messages
      .first()
      .mergeMap((msg) => {
        if (msg === protocol) {
          log('ack protocol: %s', protocol)
          return this.messages.skip(1)
        }

        if (msg === 'na') {
          log('protocol: %s not supported', protocol)
          return Rx.Observable.throw(
            new Error(`${protocol} not supported`)
          )
        }

        log('unkown message: %s', msg)
        return Rx.Observable.throw(
          new Error('Unkown message type')
        )
      })

    this.conn.subscribe(res)
    return res
  }

  ls () {
    log('requesting ls')
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
