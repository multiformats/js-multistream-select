'use strict'
/* eslint-env mocha */

const chai = require('chai')
chai.use(require('dirty-chai'))
const { expect } = chai
const pipe = require('it-pipe')
const Crypto = require('crypto')
const BufferList = require('bl')
const Reader = require('it-reader')
const { collect } = require('streaming-iterables')
const Lp = require('it-length-prefixed')
const Multistream = require('../src/multistream')
const MSS = require('../')

describe('Listener', () => {
  describe('listener.handle', () => {
    it('should handle a protocol', async () => {
      const protocol = '/echo/1.0.0'
      const input = [Crypto.randomBytes(10), Crypto.randomBytes(64), Crypto.randomBytes(3)]

      const duplex = {
        sink: async source => {
          const reader = Reader(source)
          let msg

          // First message will be multistream-select header
          msg = await Multistream.read(reader)
          expect(msg.toString()).to.eql(MSS.PROTOCOL_ID)

          // Second message will be protocol
          msg = await Multistream.read(reader)
          expect(msg.toString()).to.eql(protocol)

          // Rest is data
          return collect(reader)
        },
        source: (async function * () {
          yield Multistream.encode(MSS.PROTOCOL_ID)
          yield Multistream.encode(protocol)
          yield * input
        })()
      }

      const mss = new MSS.Listener(duplex)
      const selection = await mss.handle(protocol)
      expect(selection.protocol).to.equal(protocol)

      const output = await pipe(selection.stream, selection.stream)
      expect(BufferList(output).slice()).to.eql(BufferList(input).slice())
    })

    it('should reject unhandled protocols', async () => {
      const protocols = ['/echo/2.0.0', '/echo/1.0.0']
      const handledProtocols = ['/test/1.0.0', protocols[protocols.length - 1]]
      const handledProtocol = protocols[protocols.length - 1]
      const input = [Crypto.randomBytes(10), Crypto.randomBytes(64), Crypto.randomBytes(3)]

      const duplex = {
        sink: async source => {
          const reader = Reader(source)
          let msg

          // First message will be multistream-select header
          msg = await Multistream.read(reader)
          expect(msg.toString()).to.eql(MSS.PROTOCOL_ID)

          // Second message will be na
          msg = await Multistream.read(reader)
          expect(msg.toString()).to.eql('na')

          // Third message will be handledProtocol
          msg = await Multistream.read(reader)
          expect(msg.toString()).to.eql(handledProtocol)

          // Rest is data
          return collect(reader)
        },
        source: (async function * () {
          yield Multistream.encode(MSS.PROTOCOL_ID)
          for (const protocol of protocols) {
            yield Multistream.encode(protocol)
          }
          yield * input
        })()
      }

      const mss = new MSS.Listener(duplex)
      const selection = await mss.handle(handledProtocols)
      expect(selection.protocol).to.equal(handledProtocol)

      const output = await pipe(selection.stream, selection.stream)
      expect(BufferList(output).slice()).to.eql(BufferList(input).slice())
    })

    it('should handle ls', async () => {
      const protocols = ['/echo/2.0.0', '/echo/1.0.0']
      const handledProtocols = ['/test/1.0.0', protocols[protocols.length - 1]]
      const handledProtocol = protocols[protocols.length - 1]
      const input = [Crypto.randomBytes(10), Crypto.randomBytes(64), Crypto.randomBytes(3)]

      const duplex = {
        sink: async source => {
          const reader = Reader(source)
          let msg

          // First message will be multistream-select header
          msg = await Multistream.read(reader)
          expect(msg.toString()).to.eql(MSS.PROTOCOL_ID)

          // Second message will be ls response
          msg = await Multistream.read(reader)

          const protocolsReader = Reader([msg])
          const lsProtocols = []

          // Decode each of the protocols from the reader
          await pipe(
            protocolsReader,
            Lp.decode(),
            async source => {
              for await (const protocol of source) {
                // Remove the newline
                lsProtocols.push(protocol.shallowSlice(0, -1).toString())
              }
            }
          )

          expect(lsProtocols).to.eql(handledProtocols)

          // Third message will be handledProtocol
          msg = await Multistream.read(reader)
          expect(msg.toString()).to.eql(handledProtocol)

          // Rest is data
          return collect(reader)
        },
        source: (async function * () {
          yield Multistream.encode(MSS.PROTOCOL_ID)
          yield Multistream.encode('ls')
          yield Multistream.encode(handledProtocol)
          yield * input
        })()
      }

      const mss = new MSS.Listener(duplex)
      const selection = await mss.handle(handledProtocols)
      expect(selection.protocol).to.equal(handledProtocol)

      const output = await pipe(selection.stream, selection.stream)
      expect(BufferList(output).slice()).to.eql(BufferList(input).slice())
    })
  })
})
