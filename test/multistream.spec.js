'use strict'
/* eslint-env mocha */

const chai = require('chai')
chai.use(require('dirty-chai'))
const { expect } = chai
const Varint = require('varint')
const BufferList = require('bl/BufferList')
const Reader = require('it-reader')
const throwsAsync = require('./helpers/throws-async')
const Multistream = require('../src/multistream')
const uint8ArrayFromString = require('uint8arrays/from-string')
const uint8ArrayConcat = require('uint8arrays/concat')

describe('Multistream', () => {
  describe('Multistream.encode', () => {
    it('should encode data Buffer as a multistream-select message', () => {
      const input = uint8ArrayFromString(`TEST${Date.now()}`)
      const output = Multistream.encode(input)

      const expected = uint8ArrayConcat([
        Uint8Array.from(Varint.encode(input.length + 1)), // +1 to include newline
        input,
        uint8ArrayFromString('\n')
      ])

      expect(output.slice()).to.eql(expected)
    })

    it('should encode data BufferList as a multistream-select message', () => {
      const input = new BufferList([uint8ArrayFromString('TEST'), uint8ArrayFromString(`${Date.now()}`)])
      const output = Multistream.encode(input)

      const expected = uint8ArrayConcat([
        Uint8Array.from(Varint.encode(input.length + 1)), // +1 to include newline
        input.slice(),
        uint8ArrayFromString('\n')
      ])

      expect(output.slice()).to.eql(expected)
    })
  })

  describe('Multistream.write', () => {
    it('should encode and write a multistream-select message', () => {
      const input = uint8ArrayFromString(`TEST${Date.now()}`)
      const output = []
      const mockWriter = { push: d => output.push(d) }

      Multistream.write(mockWriter, input)

      const expected = uint8ArrayConcat([
        Uint8Array.from(Varint.encode(input.length + 1)), // +1 to include newline
        input,
        uint8ArrayFromString('\n')
      ])

      expect(output.length).to.equal(1)
      expect(output[0].slice()).to.eql(expected)
    })
  })

  describe('Multistream.read', () => {
    it('should decode a multistream-select message', async () => {
      const input = uint8ArrayFromString(`TEST${Date.now()}`)

      const reader = Reader([uint8ArrayConcat([
        Uint8Array.from(Varint.encode(input.length + 1)), // +1 to include newline
        input,
        uint8ArrayFromString('\n')
      ])])

      const output = await Multistream.read(reader)
      expect(output.slice()).to.eql(input)
    })

    it('should throw for non-newline delimited message', async () => {
      const input = uint8ArrayFromString(`TEST${Date.now()}`)

      const reader = Reader([uint8ArrayConcat([
        Uint8Array.from(Varint.encode(input.length)),
        input
      ])])

      const err = await throwsAsync(Multistream.read(reader))
      expect(err.code).to.equal('ERR_INVALID_MULTISTREAM_SELECT_MESSAGE')
    })
  })
})
