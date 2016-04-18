/* eslint-env mocha */
'use strict'

var expect = require('chai').expect
var streamPair = require('stream-pair')
var MultiStream = require('../../src/')
var lpm = require('length-prefixed-message')
var PROTOCOLID = require('../../src/lib/protocol-id')

describe('Implmentation: interactive', function () {
  var msS
  var msI
  var dogsDS
  var listener
  var dialer

  before(() => {
    const pair = streamPair.create()
    dialer = pair
    listener = pair.other
  })

  describe('basics', () => {
    it('create a Select MultiStream', function () {
      msS = new MultiStream.Select()
      expect(msS).to.be.an.instanceof(MultiStream.Select)
    })

    it('create a Select MultiStream via function', function () {
      expect(
        MultiStream.Select.createSelect()
      ).to.be.an.instanceof(
        MultiStream.Select
      )
    })

    it('throw an error if Select function is misused', function () {
      expect(
        () => MultiStream.Select()
      ).to.throw(
        'Select must be called with new, or used with createSelect'
      )
    })

    it('create a Interactive MultiStream()', function () {
      msI = new MultiStream.Interactive()
      expect(msI).to.be.an.instanceof(MultiStream.Interactive)
    })

    it('attach a duplex stream to Select MultiStream', function () {
      msS.handle(listener)
    })

    it('create a Interactive MultiStream() via utility function', function () {
      expect(
        MultiStream.Interactive.createInteractive()
      ).to.be.an.instanceof(
        MultiStream.Interactive
      )
    })

    it('throw an error if Interactive function is misused', function () {
      expect(
        () => MultiStream.Interactive()
      ).to.throw(
        'MultiStream must be called with new, or used with createMultiStream'
      )
    })

    it('register two handlers', function () {
      msS.addHandler('/dogs/0.1.0', function (ds) {
        dogsDS = ds
      })

      msS.addHandler('/cats/1.2.11', function (ds) {})
    })

    it('ls', function (done) {
      msI.handle(dialer, () => {
        msI.ls((err, ls) => {
          expect(err).to.not.exist
          ls = JSON.parse(ls)
          expect(ls[0]).to.equal('/dogs/0.1.0')
          expect(ls[1]).to.equal('/cats/1.2.11')
          done()
        })
      })
    })

    it('select one non existing protocol->handler', function (done) {
      msI.select('/mouse/1.1.0', function (err, ds) {
        expect(err).to.be.an.instanceof(Error)
        done()
      })
    })

    it('select one of the protocol->handler', function (done) {
      msI.select('/dogs/0.1.0', function (err, ds) {
        if (err) {
          return console.log(err)
        }
        ds.write('hey')
        dogsDS.on('data', function (data) {
          expect(data.toString()).to.equal('hey')
          done()
        })
      })
    })
  })

  describe('varying connections', () => {
    beforeEach(() => {
      const pair = streamPair.create()
      dialer = pair
      listener = pair.other
    })

    it('Select closes connection for non supported protocol', function (done) {
      var select = new MultiStream.Select()
      select.handle(listener)
      listener.on('finish', done)

      lpm.write(dialer, PROTOCOLID + '\n')
      lpm.write(dialer, 'na\n')
    })

    it('Interactive responds with `na` for wrong protocol', function (done) {
      var interactive = new MultiStream.Interactive()
      interactive.handle(listener)

      dialer.on('data', (chunk) => {
        if (chunk.toString().indexOf('na\n') > -1) {
          done()
        }
      })
      lpm.write(dialer, '/garbage/1.2.3\n')
    })

    it('Interactive handles `na` handler response', function (done) {
      var interactive = new MultiStream.Interactive()
      interactive.handle(listener, () => {
        interactive.select('skipping')
        interactive.select('whatever', (err) => {
          expect(err.message).to.equal('whatever not supported')
          done()
        })
      })

      lpm.write(dialer, PROTOCOLID + '\n')
      lpm.write(dialer, 'nan\n')
      lpm.write(dialer, 'na\n')
    })
  })
})
