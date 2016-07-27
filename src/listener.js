'use strict'

const Rx = require('rxjs/Rx')
const debug = require('debug')
const log = debug('multistream:listener')

const PROTOCOL_ID = require('./protocol-id')
const varint = require('./varint')
const mMsg = require('./m-msg')

module.exports = class Listener {
  constructor () {
    this.handlers = {}
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

  handle (observer) {
    log('adding handler')
    const varObserver = varint.create(observer)

    const messages = varObserver
      .first()
      .mergeMap((msg) => {
        if (msg === PROTOCOL_ID) {
          log('ack multistream')
          return varObserver.skip(1)
        }
        // TODO This would be where we try to support other versions
        // of multistream (backwards compatible). Currently we have
        // just one, so this never happens.
        return Rx.Observable.throw(
          new Error('not supported version of multistream')
        )
      })
     .map((msg) => msg.toString().slice(0, -1))

    log('sending multistream')
    varObserver.next(mMsg(PROTOCOL_ID))

    const isLs = (msg) => msg === 'ls'
    const isHandler = (msg) => Boolean(this.handlers[msg])
    const isUnkwon = (msg) => !isLs(msg) && !isHandler(msg)

    const res = new Rx.Subject()
    messages
      .mergeMap((msg) => {
        if (isLs(msg)) {
          log('sending ls')
          this.ls().forEach((line) => {
            varObserver.next(line)
          })
        }

        if (isHandler(msg)) {
          // Protocol supported, ACK back
          varObserver.next(mMsg(msg))
          const handler = this.handlers[msg]
          handler.subscribe(messages.skip(1))
          varObserver.subscribe(handler)
          res.next(handler)
        }

        if (isUnkwon(msg)) {
          log('unkown protocol: %s', msg)
          // Protocol not supported, wait for new handshake
          varObserver.next(mMsg('na'))
        }

        return messages.skip(1)
      })

    varObserver.subscribe()
  }

  // be ready for a given `protocol`
  addHandler (protocol) {
    this.handlers[protocol] = new Rx.Subject()

    return this.handlers[protocol]
  }
}
