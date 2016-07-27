'use strict'

const Rx = require('rxjs/Rx')
const debug = require('debug')
const log = debug('multistream:listener')

const PROTOCOL_ID = require('./protocol-id')
const varint = require('./varint')
const mMsg = require('./m-msg')

module.exports = class Listener {
  constructor (observer) {
    this.conn = varint.create(observer)

    this.handlers = {}

    this._setupHandshake()
  }

  _ls () {
    const protos = Object.keys(this.handlers)
    const nProtos = protos.length
    // total size of the list of protocols,
    // including varint and newline
    const size = protos.reduce((size, proto) => {
      const p = mMsg(proto)
      const el = varint.encodingLength(p.length)
      return size + el
    }, 0)

    const header = Buffer.concat([
      new Buffer(varint.encode(nProtos)),
      new Buffer(varint.encode(size)),
      new Buffer('\n')
    ])

    return [header].concat(protos.map(mMsg))
  }

  _setupHandshake () {
    log('initiating multistream')
    this.conn.next(mMsg(PROTOCOL_ID))

    const isLs = (msg) => msg === 'ls'
    const isHandler = (msg) => Boolean(this.handlers[msg])
    const isUnknown = (msg) => !isLs(msg) && !isHandler(msg)

    const shake = this.conn
      .map((msg) => msg.toString().slice(0, -1))
      .first()
      .mergeMap((msg) => {
        log('message', msg)
        if (msg === PROTOCOL_ID) {
          log('ack multistream')
          return this.conn
        }
        // TODO: This would be where we try to support
        // other versions of multistream (backwards
        // compatible). Currently we have
        // just one, so this never happens.
        return Rx.Observable.throw(
          new Error('not supported version of multistream')
        )
      })
      .map((msg) => msg.toString().slice(0, -1))
      .subscribe((msg) => {
        log('processing msg', msg)

        if (isLs(msg)) {
          log('sending ls')
          this.ls().forEach((line) => {
            this.conn.next(line)
          })
        }

        if (isHandler(msg)) {
          log('ack: %s', msg)
          // Protocol supported, ACK back
          this.conn.next(mMsg(msg))
          this.handlers[msg].next(this.conn)
          shake.unsubscribe()
        }

        if (isUnknown(msg)) {
          log('unkown protocol: %s', msg)
          // Protocol not supported, wait for new handshake
          this.conn.next(mMsg('na'))
        }
      })
  }

  // be ready for a given `protocol`
  addHandler (protocol) {
    this.handlers[protocol] = new Rx.Subject()

    return this.handlers[protocol]
  }
}
