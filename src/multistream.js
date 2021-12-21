'use strict'

const BufferList = require('bl/BufferList')
const lp = require('it-length-prefixed')
const { pipe } = require('it-pipe')
const errCode = require('err-code')
const { fromString: uint8ArrayFromString } = require('uint8arrays/from-string')
const first = require('it-first')
const { source } = require('abortable-iterator')

/**
 * @typedef {import('it-pushable').Pushable<Uint8Array | BufferList>} Pushable
 * @typedef {import('./types').AbortOptions} AbortOptions
 */

const NewLine = uint8ArrayFromString('\n')

/**
 * @param {Uint8Array | BufferList | string} buffer
 * @returns {Uint8Array}
 */
function encode (buffer) {
  // @ts-expect-error BufferList accepts Buffer[], we pass Uint8Array[]
  return lp.encode.single(new BufferList([buffer, NewLine]))
}

/**
 * `write` encodes and writes a single buffer
 *
 * @param {Pushable} writer
 * @param {Uint8Array | BufferList | string} buffer
 */
function write (writer, buffer) {
  writer.push(encode(buffer))
}

/**
 * `writeAll` behaves like `write`, except it encodes an array of items as a single write
 *
 * @param {Pushable} writer
 * @param {(Uint8Array | BufferList | string)[]} buffers
 */
async function writeAll (writer, buffers) {
  // @ts-expect-error BufferList cannot append Uint8Arrays
  writer.push(buffers.reduce((bl, buffer) => bl.append(encode(buffer)), new BufferList()))
}

/**
 * @param {AsyncGenerator<Uint8Array | BufferList, void, number>} reader
 * @param {AbortOptions} [options]
 */
async function read (reader, options) {
  let byteLength = 1 // Read single byte chunks until the length is known
  const varByteSource = { // No return impl - we want the reader to remain readable
    [Symbol.asyncIterator] () { return this },
    next: () => reader.next(byteLength)
  }

  /** @type {AsyncIterable<Uint8Array | BufferList>} */
  let input = varByteSource

  // If we have been passed an abort signal, wrap the input source in an abortable
  // iterator that will throw if the operation is aborted
  if (options && options.signal) {
    input = source(varByteSource, options.signal)
  }

  // Once the length has been parsed, read chunk for that length
  const onLength = (/** @type {number} */ l) => { byteLength = l }

  /** @type {BufferList} */
  const buf = await pipe(
    input,
    lp.decode({ onLength }),
    first
  )

  if (buf.get(buf.length - 1) !== NewLine[0]) {
    throw errCode(new Error('missing newline'), 'ERR_INVALID_MULTISTREAM_SELECT_MESSAGE')
  }

  return buf.shallowSlice(0, -1) // Remove newline
}

module.exports = {
  encode,
  write,
  writeAll,
  read
}
