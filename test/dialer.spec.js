'use strict'
/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 5] */

const { expect } = require('aegir/utils/chai')
const pipe = require('it-pipe')
const { collect } = require('streaming-iterables')
const BufferList = require('bl/BufferList')
const Pair = require('it-pair')
const Reader = require('it-reader')
const pTimeout = require('p-timeout')
const throwsAsync = require('./helpers/throws-async')
const Multistream = require('../src/multistream')
const MSS = require('../')
const randomBytes = require('./helpers/random-bytes')

describe('Dialer', () => {
  describe('dialer.select', () => {
    it('should select from single protocol', async () => {
      const protocol = '/echo/1.0.0'
      const duplex = Pair()

      const mss = new MSS.Dialer(duplex)
      const selection = await mss.select(protocol)
      expect(selection.protocol).to.equal(protocol)

      // Ensure stream is usable after selection
      const input = [randomBytes(10), randomBytes(64), randomBytes(3)]
      const output = await pipe(input, selection.stream, collect)
      expect(BufferList(output).slice()).to.eql(BufferList(input).slice())
    })

    it('should fail to select twice', async () => {
      const protocol = '/echo/1.0.0'
      const protocol2 = '/echo/2.0.0'
      const duplex = Pair()

      const mss = new MSS.Dialer(duplex)
      const selection = await mss.select(protocol)
      expect(selection.protocol).to.equal(protocol)

      // A second select will timeout
      await pTimeout(mss.select(protocol2), 1e3)
        .then(() => expect.fail('should have timed out'), (err) => {
          expect(err).to.exist()
        })
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
      expect(protocols).to.have.length(2)
      expect(selection.protocol).to.equal(selectedProtocol)

      // Ensure stream is usable after selection
      const input = [randomBytes(10), randomBytes(64), randomBytes(3)]
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
      const input = [randomBytes(10), randomBytes(64), randomBytes(3)]
      const output = await pipe(input, selection.stream, collect)
      expect(BufferList(output).slice()).to.eql(BufferList(input).slice())
    })
  })
})
