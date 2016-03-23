/* eslint-env mocha */
'use strict'

var expect = require('chai').expect
var streamPair = require('stream-pair')
var MultiStream = require('../../src/')
var fs = require('fs')
var bl = require('bl')

describe('Compliance', function () {
  this.timeout(60000)

  var listener
  var dialer

  beforeEach(() => {
    const pair = streamPair.create()
    dialer = pair
    listener = pair.other
  })

  it('Select', function (done) {
    var ms = new MultiStream.Select()
    ms.addHandler('/dogs/0.1.0', function (ds) {})
    ms.addHandler('/cats/1.2.11', function (ds) {})

    ms.handle(listener)

    var input = fs.readFileSync('./test/spec/pristine/select.in')
    var expectedOutput = fs.readFileSync('./test/spec/pristine/select.out')

    dialer.write(input)
    dialer.end()
    listener.end()

    dialer.pipe(bl((err, output) => {
      expect(err).to.not.exist
      expect(output).to.be.eql(expectedOutput)
      done()
    }))
  })

  it('Interactive', function (done) {
    var ms = new MultiStream.Interactive()
    var input = fs.readFileSync('./test/spec/pristine/interactive.in')
    var expectedOutput = fs.readFileSync('./test/spec/pristine/interactive.out')
    dialer.write(input)
    dialer.pipe(bl((err, output) => {
      expect(err).to.not.exist
      expect(output).to.be.eql(expectedOutput)
      done()
    }))

    ms.handle(listener, function () {
      ms.ls(function (err, ls) {
        expect(err).to.not.exist
      })
      ms.select('/mouse/1.1.0', function (err, ds) {
        expect(err).to.be.instanceof(Error)
      })
      ms.select('/dogs/0.1.0', function (err, ds) {
        expect(err).to.be.equal(null)
        ds.write('hey')
      })

      dialer.end()
      listener.end()
    })
  })

  it('Silent', function (done) {
    var ms = new MultiStream.Silent()
    var input = fs.readFileSync('./test/spec/pristine/silent.in')
    var expectedOutput = fs.readFileSync('./test/spec/pristine/silent.out')

    dialer.write(input)

    dialer.pipe(bl((err, output) => {
      expect(err).to.not.exist
      expect(output).to.be.eql(expectedOutput)
      done()
    }))

    ms.handle(listener, function () {
      dialer.end()
      listener.end()
    })
  })

  it('BroadCast', function (done) {
    var ms = new MultiStream.Broadcast()

    var input = fs.readFileSync('./test/spec/pristine/broadcast.in')
    var expectedOutput = fs.readFileSync('./test/spec/pristine/broadcast.out')

    dialer.write(input)

    dialer.pipe(bl((err, output) => {
      expect(err).to.not.exist
      expect(output).to.be.eql(expectedOutput)
      done()
    }))

    ms.handle(listener)
    ms.broadcast('/bird/3.2.1', function (ds) {
      ds.write('hey, how is it going?')

      dialer.end()
      listener.end()
    })
  })
})
