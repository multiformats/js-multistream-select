/* eslint-env mocha */
'use strict'

var expect = require('chai').expect
var streamPair = require('stream-pair')
var MultiStream = require('../../src/')

describe('Implementation: one-way', function () {
  var msB
  var msS
  var listener
  var dialer

  before(() => {
    const pair = streamPair.create()
    dialer = pair
    listener = pair.other
  })

  it('create a Broadcast MultiStream', function () {
    msB = new MultiStream.Broadcast()
    expect(msB).to.be.an.instanceof(MultiStream.Broadcast)
  })

  it('create a Silent MultiStream()', function () {
    msS = new MultiStream.Silent()
    expect(msS).to.be.an.instanceof(MultiStream.Silent)
  })

  it('attach a stream to Broadcast MultiStream (tcp server)', function () {
    msB.handle(listener)
  })

  it('Attach the silent receiver to the stream', function (done) {
    msS.handle(dialer, done)
  })

  it('register a handler', function (done) {
    msS.addHandler('/bird/3.2.1', function (err, ds) {
      expect(err).to.equal(null)
      ds.on('data', function (data) {
        expect(data.toString()).to.equal('hey, how is it going?')
        done()
      })
    })

    msB.broadcast('/bird/3.2.1', function (ds) {
      ds.write('hey, how is it going?')
    })
  })
})
