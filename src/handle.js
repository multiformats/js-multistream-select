'use strict'

const debug = require('debug')
const BufferList = require('bl/BufferList')
const multistream = require('./multistream')
// @ts-expect-error no types
const handshake = require('it-handshake')
const { PROTOCOL_ID } = require('./constants')

const log = Object.assign(debug('mss:handle'), {
  error: debug('mss:handle:error')
})

/**
 * @typedef {import('./types').DuplexStream<Uint8Array | BufferList>} DuplexStream
 * @typedef {import('./types').AbortOptions} AbortOptions
 */

/**
 * @param {DuplexStream} stream
 * @param {string | string[]} protocols
 * @param {AbortOptions} [options]
 */
module.exports = async function handle (stream, protocols, options) {
  protocols = Array.isArray(protocols) ? protocols : [protocols]
  const { writer, reader, rest, stream: shakeStream } = handshake(stream)

  while (true) {
    const protocol = (await multistream.read(reader, options)).toString()
    log('read "%s"', protocol)

    if (protocol === PROTOCOL_ID) {
      log('respond with "%s" for "%s"', PROTOCOL_ID, protocol)
      multistream.write(writer, PROTOCOL_ID)
      continue
    }

    if (protocols.includes(protocol)) {
      multistream.write(writer, protocol)
      log('respond with "%s" for "%s"', protocol, protocol)
      rest()
      return { stream: shakeStream, protocol }
    }

    if (protocol === 'ls') {
      // <varint-msg-len><varint-proto-name-len><proto-name>\n<varint-proto-name-len><proto-name>\n\n
      multistream.write(writer, new BufferList(
        // @ts-expect-error BufferList does not accept Uint8Array[] as a constructor arg
        protocols.map(p => multistream.encode(p))
      ))
      log('respond with "%s" for %s', protocols, protocol)
      continue
    }

    multistream.write(writer, 'na')
    log('respond with "na" for "%s"', protocol)
  }
}
