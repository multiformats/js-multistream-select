'use strict'

const select = require('./select')
const handle = require('./handle')
const ls = require('./ls')

const PROTOCOL_ID = '/multistream/1.0.0'

exports.PROTOCOL_ID = PROTOCOL_ID

class MultistreamSelect {
  constructor (stream) {
    this._stream = stream
    this._shaken = false
  }

  // Perform the multistream-select handshake
  async _handshake () {
    if (this._shaken) return
    const { stream } = await select(this._stream, PROTOCOL_ID)
    this._stream = stream
    this._shaken = true
  }
}

class Dialer extends MultistreamSelect {
  async select (protocols) {
    await this._handshake()
    return select(this._stream, protocols)
  }

  async ls () {
    await this._handshake()
    const { stream, protocols } = await ls(this._stream)
    this._stream = stream
    return protocols
  }
}

exports.Dialer = Dialer

class Listener extends MultistreamSelect {
  async handle (protocols) {
    await this._handshake()
    return handle(this._stream, protocols)
  }
}

exports.Listener = Listener
