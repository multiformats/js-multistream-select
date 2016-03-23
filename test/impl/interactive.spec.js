/* eslint-env mocha */
'use strict'

var expect = require('chai').expect
var tcp = require('net')
var MultiStream = require('../../src/')

describe('Node.js Implementation: ', function () {
  var msS
  var msI
  var dogsDS

  it('create a Select MultiStream', function (done) {
    msS = new MultiStream.Select()
    expect(msS).to.be.an.instanceof(MultiStream.Select)
    done()
  })

  it('create a Interactive MultiStream()', function (done) {
    msI = new MultiStream.Interactive()
    expect(msI).to.be.an.instanceof(MultiStream.Interactive)
    done()
  })

  it('attach a duplex stream to Select MultiStream (tcp server)', function (done) {
    tcp.createServer(function (socket) {
      msS.handle(socket)
    }).listen(8010)
    done()
  })

  it('register two handlers', function (done) {
    msS.addHandler('/dogs/0.1.0', function (ds) {
      dogsDS = ds
    })

    msS.addHandler('/cats/1.2.11', function (ds) {})

    done()
  })

  it('ls', function (done) {
    var socket = tcp.connect({port: 8010}, connected)

    function connected () {
      msI.handle(socket, function () {
        msI.ls(function (err, ls) {
          if (err) {
            return console.log(err)
          }
          ls = JSON.parse(ls)
          expect(ls[0]).to.equal('/dogs/0.1.0')
          expect(ls[1]).to.equal('/cats/1.2.11')
          done()
        })
      })
    }
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
