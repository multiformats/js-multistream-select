/* eslint-env mocha */
'use strict'

var expect = require('chai').expect
var streamPair = require('stream-pair')
var MultiStream = require('../../src/')

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

  it('create a Select MultiStream', function () {
    msS = new MultiStream.Select()
    expect(msS).to.be.an.instanceof(MultiStream.Select)
  })

  it('create a Interactive MultiStream()', function () {
    msI = new MultiStream.Interactive()
    expect(msI).to.be.an.instanceof(MultiStream.Interactive)
  })

  it('attach a duplex stream to Select MultiStream', function () {
    msS.handle(listener)
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
