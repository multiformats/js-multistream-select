'use strict'

const select = require('./select')
const handle = require('./handle')
const ls = require('./ls')
const { PROTOCOL_ID } = require('./constants')

exports.PROTOCOL_ID = PROTOCOL_ID

/**
 * @typedef {import('bl/BufferList')} BufferList
 * @typedef {import('./types').DuplexStream<Uint8Array | BufferList>} DuplexStream
 * @typedef {import('./types').AbortOptions} AbortOptions
 */

class MultistreamSelect {
  /**
   * @param {DuplexStream} stream
   */
  constructor (stream) {
    this._stream = stream
    this._shaken = false
  }

  /**
   * Perform the multistream-select handshake
   *
   * @param {AbortOptions} [options]
   */
  async _handshake (options) {
    if (this._shaken) return
    const { stream } = await select(this._stream, PROTOCOL_ID, undefined, options)
    this._stream = stream
    this._shaken = true
  }
}

class Dialer extends MultistreamSelect {
  /**
   * @param {string | string[]} protocols
   * @param {AbortOptions} [options]
   */
  select (protocols, options) {
    return select(this._stream, protocols, this._shaken ? undefined : PROTOCOL_ID, options)
  }

  /**
   * @param {AbortOptions} [options]
   */
  async ls (options) {
    await this._handshake(options)
    /** @type {{ stream: DuplexStream, protocols: string[] }} */
    const res = await ls(this._stream, options)
    const { stream, protocols } = res
    this._stream = stream
    return protocols
  }
}

exports.Dialer = Dialer

class Listener extends MultistreamSelect {
  /**
   * @param {string | string[]} protocols
   * @param {AbortOptions} [options]
   */
  handle (protocols, options) {
    return handle(this._stream, protocols, options)
  }
}

exports.Listener = Listener
