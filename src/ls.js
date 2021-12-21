'use strict'

// @ts-expect-error no types
const Reader = require('it-reader')
const debug = require('debug')
const multistream = require('./multistream')
// @ts-expect-error no types
const handshake = require('it-handshake')
const lp = require('it-length-prefixed')
const { pipe } = require('it-pipe')

const log = Object.assign(debug('mss:ls'), {
  error: debug('mss:ls:error')
})

/**
 * @typedef {import('bl/BufferList')} BufferList
 * @typedef {import('./types').DuplexStream<Uint8Array | BufferList>} DuplexStream
 * @typedef {import('./types').AbortOptions} AbortOptions
 */

/**
 * @param {DuplexStream} stream
 * @param {AbortOptions} [options]
 */
module.exports = async function ls (stream, options) {
  const { reader, writer, rest, stream: shakeStream } = handshake(stream)

  log('write "ls"')
  multistream.write(writer, 'ls')
  rest()

  // Next message from remote will be (e.g. for 2 protocols):
  // <varint-msg-len><varint-proto-name-len><proto-name>\n<varint-proto-name-len><proto-name>\n
  const res = await multistream.read(reader, options)

  // After reading response we have:
  // <varint-proto-name-len><proto-name>\n<varint-proto-name-len><proto-name>\n
  const protocolsReader = Reader([res])

  /**
   * @type {string[]}
   */
  const protocols = []

  // Decode each of the protocols from the reader
  await pipe(
    protocolsReader,
    lp.decode(),
    async (/** @type {AsyncIterable<BufferList>} */ source) => {
      for await (const protocol of source) {
        // Remove the newline
        protocols.push(protocol.shallowSlice(0, -1).toString())
      }
    }
  )

  /** @type {{ stream: DuplexStream, protocols: string[] }} */
  const output = { stream: shakeStream, protocols }

  return output
}
