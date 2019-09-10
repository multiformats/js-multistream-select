'use strict'
/* eslint-env mocha */

const chai = require('chai')
chai.use(require('dirty-chai'))
const { expect } = chai
const pipe = require('it-pipe')
const { collect } = require('streaming-iterables')
const Crypto = require('crypto')
const BufferList = require('bl')
const Pair = require('it-pair')
const Reader = require('it-reader')
const throwsAsync = require('./helpers/throws-async')
const Multistream = require('../src/multistream')
const MSS = require('../')

describe('Dialer', () => {
  describe('dialer.select', () => {
    it('should select from single protocol', async () => {
      const protocol = '/echo/1.0.0'
      const duplex = Pair()

      const mss = new MSS.Dialer(duplex)
      const selection = await mss.select(protocol)
      expect(selection.protocol).to.equal(protocol)

      // Ensure stream is usable after selection
      const input = [Crypto.randomBytes(10), Crypto.randomBytes(64), Crypto.randomBytes(3)]
      const output = await pipe(input, selection.stream, collect)
      expect(BufferList(output).slice()).to.eql(BufferList(input).slice())
    })

    it('should select from multiple protocols', async () => {
      const protocols = ['/echo/2.0.0', '/echo/1.0.0']
      const selectedProtocol = protocols[protocols.length - 1]
      const pair = Pair()
      const duplex = {
        sink: pair.sink,
        source: (async function * () {
          const reader = Reader(pair.source)
          let msg

          // First message will be multistream-select header
          msg = await Multistream.read(reader)
          expect(msg.toString()).to.eql(MSS.PROTOCOL_ID)

          // Echo it back
          yield Multistream.encode(MSS.PROTOCOL_ID)

          // Reject protocols until selectedProtocol appears
          while (true) {
            msg = await Multistream.read(reader)
            if (msg.toString() === selectedProtocol) {
              yield Multistream.encode(selectedProtocol)
              break
            } else {
              yield Multistream.encode('na')
            }
          }

          // Rest is data
          yield * reader
        })()
      }

      const mss = new MSS.Dialer(duplex)
      const selection = await mss.select(protocols)
      expect(selection.protocol).to.equal(selectedProtocol)

      // Ensure stream is usable after selection
      const input = [Crypto.randomBytes(10), Crypto.randomBytes(64), Crypto.randomBytes(3)]
      const output = await pipe(input, selection.stream, collect)
      expect(BufferList(output).slice()).to.eql(BufferList(input).slice())
    })

    it('should throw if protocol selection fails', async () => {
      const protocol = ['/echo/2.0.0', '/echo/1.0.0']
      const pair = Pair()
      const duplex = {
        sink: pair.sink,
        source: (async function * () {
          const reader = Reader(pair.source)
          let msg

          // First message will be multistream-select header
          msg = await Multistream.read(reader)
          expect(msg.toString()).to.eql(MSS.PROTOCOL_ID)

          // Echo it back
          yield Multistream.encode(MSS.PROTOCOL_ID)

          // Reject all protocols
          while (true) {
            msg = await Multistream.read(reader)
            yield Multistream.encode('na')
          }
        })()
      }

      const mss = new MSS.Dialer(duplex)
      const err = await throwsAsync(mss.select(protocol))
      expect(err.code).to.equal('ERR_UNSUPPORTED_PROTOCOL')
    })
  })

  describe('dialer.ls', () => {
    it('should list remote protocols', async () => {
      const protocols = ['/echo/2.0.0', '/echo/1.0.0']
      const selectedProtocol = protocols[protocols.length - 1]
      const pair = Pair()
      const duplex = {
        sink: pair.sink,
        source: (async function * () {
          const reader = Reader(pair.source)
          let msg

          // First message will be multistream-select header
          msg = await Multistream.read(reader)
          expect(msg.toString()).to.eql(MSS.PROTOCOL_ID)

          // Echo it back
          yield Multistream.encode(MSS.PROTOCOL_ID)

          // Second message will be ls
          msg = await Multistream.read(reader)
          expect(msg.toString()).to.eql('ls')

          // Respond with protocols
          yield Multistream.encode(new BufferList(
            protocols.map(p => Multistream.encode(p))
          ))

          // Third message will be selectedProtocol
          msg = await Multistream.read(reader)
          expect(msg.toString()).to.eql(selectedProtocol)

          // Echo it back
          yield Multistream.encode(selectedProtocol)

          // Rest is data
          yield * reader
        })()
      }

      const mss = new MSS.Dialer(duplex)
      const lsProtocols = await mss.ls()
      expect(lsProtocols).to.eql(protocols)

      const selection = await mss.select(selectedProtocol)
      expect(selection.protocol).to.equal(selectedProtocol)

      // Ensure stream is usable after selection
      const input = [Crypto.randomBytes(10), Crypto.randomBytes(64), Crypto.randomBytes(3)]
      const output = await pipe(input, selection.stream, collect)
      expect(BufferList(output).slice()).to.eql(BufferList(input).slice())
    })
  })
})
