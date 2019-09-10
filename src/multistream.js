'use strict'

const { Buffer } = require('buffer')
const BufferList = require('bl')
const lp = require('it-length-prefixed')
const pipe = require('it-pipe')
const errCode = require('err-code')

const NewLine = Buffer.from('\n')

async function oneChunk (source) {
  for await (const chunk of source) return chunk // We only need one!
}

exports.encode = buffer => lp.encode.single(new BufferList([buffer, NewLine]))

exports.write = (writer, buffer) => writer.push(exports.encode(buffer))

exports.read = async reader => {
  let byteLength = 1 // Read single byte chunks until the length is known
  const varByteSource = { // No return impl - we want the reader to remain readable
    [Symbol.asyncIterator] () { return this },
    next: () => reader.next(byteLength)
  }

  // Once the length has been parsed, read chunk for that length
  const onLength = l => { byteLength = l }
  const buf = await pipe(varByteSource, lp.decode({ onLength }), oneChunk)

  if (buf.get(buf.length - 1) !== NewLine[0]) {
    throw errCode(new Error('missing newline'), 'ERR_INVALID_MULTISTREAM_SELECT_MESSAGE')
  }

  return buf.shallowSlice(0, -1) // Remove newline
}
