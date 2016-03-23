/* eslint-env mocha */
'use strict'

var expect = require('chai').expect
var tcp = require('net')
var MultiStream = require('../../src/')

describe('Node.js Implementation: ', function () {
  var msB
  var msS

  it('create a Broadcast MultiStream', function (done) {
    msB = new MultiStream.Broadcast()
    expect(msB).to.be.an.instanceof(MultiStream.Broadcast)
    done()
  })

  it('create a Silent MultiStream()', function (done) {
    msS = new MultiStream.Silent()
    expect(msS).to.be.an.instanceof(MultiStream.Silent)
    done()
  })

  it('attach a stream to Broadcast MultiStream (tcp server)', function (done) {
    tcp.createServer(function (socket) {
      msB.handle(socket)
    }).listen(8020)
    done()
  })

  it('Attach the silent receiver to the stream', function (done) {
    var socket = tcp.connect({port: 8020}, connected)

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
