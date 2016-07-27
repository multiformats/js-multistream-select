'use strict'

const Rx = require('rxjs/Rx')
const varint = require('varint')
const debug = require('debug')
const log = debug('multistream:dialer')

const PROTOCOL_ID = require('./protocol-id')
const varintObserver = require('./varint').create
const mMsg = require('./m-msg')

module.exports = class Dialer {
  constructor (observer) {
    this.conn = varintObserver(observer)
      .map((msg) => msg.toString().slice(0, -1))

    this._setupHandshake()
    this._handshakeObserver = new Rx.Subject()
  }

  // perform the multistream handshake
  _setupHandshake () {
    this.conn
      .first()
      .mergeMap((msg) => {
        if (msg === PROTOCOL_ID) {
          log('ack multistream')
          this.conn.next(mMsg(PROTOCOL_ID))
          this._handshakeObserver.next()
          return this.conn
        }
        const err = new Error('Incompatible multistream')
        this._handshakeObserver.error(err)
        return Rx.Observable.throw(err)
      })
      .subscribe()
  }

  select (protocol) {
    const res = new Rx.ReplaySubject()

    const shake = this._handshakeObserver
      .mergeMap(() => {
        log('selecting %s', protocol)
        this.conn.next(mMsg(protocol))
        return this.conn
      })
      .first()
      .mergeMap((msg) => {
        log('processing msg', msg)
        if (msg === protocol) {
          log('ack: %s', protocol)
          res.subscribe(this.conn)
          this.conn.subscribe(res)
          shake.unsubscribe()
          return Rx.Observable.empty()
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
      .subscribe()

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
