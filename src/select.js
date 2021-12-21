'use strict'

const debug = require('debug')
const errCode = require('err-code')
const multistream = require('./multistream')
// @ts-expect-error no types
const handshake = require('it-handshake')

const log = Object.assign(debug('mss:select'), {
  error: debug('mss:select:error')
})

/**
 * @typedef {import('bl/BufferList')} BufferList
 * @typedef {import('./types').DuplexStream<Uint8Array | BufferList>} DuplexStream
 * @typedef {import('./types').AbortOptions} AbortOptions
 */

/**
 * @param {DuplexStream} stream
 * @param {string | string[]} protocols
 * @param {string} [protocolId]
 * @param {AbortOptions} [options]
 */
module.exports = async function select (stream, protocols, protocolId, options) {
  protocols = Array.isArray(protocols) ? [...protocols] : [protocols]
  const { reader, writer, rest, stream: shakeStream } = handshake(stream)

  const protocol = protocols.shift()

  if (!protocol) {
    throw new Error('At least one protocol must be specified')
  }

  if (protocolId) {
    log('select: write ["%s", "%s"]', protocolId, protocol)
    multistream.writeAll(writer, [protocolId, protocol])
  } else {
    log('select: write "%s"', protocol)
    multistream.write(writer, protocol)
  }

  let response = (await multistream.read(reader, options)).toString()
  log('select: read "%s"', response)

  // Read the protocol response if we got the protocolId in return
  if (response === protocolId) {
    response = (await multistream.read(reader, options)).toString()
    log('select: read "%s"', response)
  }

  // We're done
  if (response === protocol) {
    rest()
    return { stream: shakeStream, protocol }
  }

  // We haven't gotten a valid ack, try the other protocols
  for (const protocol of protocols) {
    log('select: write "%s"', protocol)
    multistream.write(writer, protocol)
    const response = (await multistream.read(reader, options)).toString()
    log('select: read "%s" for "%s"', response, protocol)

    if (response === protocol) {
      rest() // End our writer so others can start writing to stream
      return { stream: shakeStream, protocol }
    }
  }

  rest()
  throw errCode(new Error('protocol selection failed'), 'ERR_UNSUPPORTED_PROTOCOL')
}
