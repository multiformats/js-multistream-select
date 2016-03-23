/* eslint-env mocha */
'use strict'

var expect = require('chai').expect
var tcp = require('net')
var MultiStream = require('../../src/')
var capture = require('./capture')

describe('Spec: one-was', function () {
  var msB
  var msS

  before(function () {
    capture(8200, 8201, 'silent', 'broadcast')
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
    tcp.createServer(function (socket) {
      msB.handle(socket)
    }).listen(8201)
  })

  it('Attach the silent receiver to the stream', function (done) {
    var socket = tcp.connect({port: 8200}, connected)

    function connected () {
      msS.handle(socket, function () {
        done()
      })
    }
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
