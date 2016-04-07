/* eslint-env mocha */
'use strict'

var expect = require('chai').expect
var path = require('path')
var tcp = require('net')
var MultiStream = require('../../src/')
var fs = require('fs')
var buffertools = require('buffertools')

describe('Compliance Tests: ', function () {
  this.timeout(60000)

  it('Select', function (done) {
    var ms = new MultiStream.Select()
    ms.addHandler('/dogs/0.1.0', function (ds) {})
    ms.addHandler('/cats/1.2.11', function (ds) {})

    tcp.createServer(function (socket) {
      ms.handle(socket)
    }).listen(9000)

    var inject = tcp.connect({port: 9000})

    inject.on('connect', function () {
      var input = fs.createReadStream('./test/spec/pristine/select.in')
      input.pipe(inject)
      setTimeout(function () {
        // Compare both pristine and test output to validate the test
        var fileA = fs.readFileSync('./test/spec/pristine/select.out')
        var fileB = fs.readFileSync(path.join(__dirname, '/select-test.out'))
        var result = buffertools.equals(fileA, fileB)
        expect(result).to.equal(true)
        done()
      }, 500)

      inject.pipe(fs.createWriteStream(path.join(__dirname, '/select-test.out')))
    })
  })

  it('Interactive', function (done) {
    var ms = new MultiStream.Interactive()

    tcp.createServer(function (socket) {
      fs.createReadStream('./test/spec/pristine/interactive.in').pipe(socket)
      socket.pipe(fs.createWriteStream(path.join(__dirname, '/interactive-test.out')))
    }).listen(9001)

    var socket = tcp.connect({port: 9001})

    socket.on('connect', function () {
      ms.handle(socket, function () {
        ms.ls(function (err, ls) {
          if (err) { return console.log(err) }
        })
        ms.select('/mouse/1.1.0', function (err, ds) {
          expect(err).to.be.instanceof(Error)
        })
        ms.select('/dogs/0.1.0', function (err, ds) {
          expect(err).to.be.equal(null)
          ds.write('hey')
        })

        setTimeout(function () {
          // Compare both pristine and test output to validate the test
          var fileA = fs.readFileSync('./test/spec/pristine/interactive.out')
          var fileB = fs.readFileSync(path.join(__dirname, '/interactive-test.out'))
          var result = buffertools.equals(fileA, fileB)
          expect(result).to.equal(true)
          done()
        }, 500)
      })
    })
  })

  it('Silent', function (done) {
    var ms = new MultiStream.Silent()

    tcp.createServer(function (socket) {
      fs.createReadStream('./test/spec/pristine/silent.in').pipe(socket)
      socket.pipe(fs.createWriteStream(path.join(__dirname, '/silent-test.out')))
    }).listen(9002)

    var socket = tcp.connect({port: 9002})

    socket.on('connect', function () {
      ms.handle(socket, function () {
        setTimeout(function () {
          // Compare both pristine and test output to validate the test
          var fileA = fs.readFileSync('./test/spec/pristine/silent.out')
          var fileB = fs.readFileSync(path.join(__dirname, '/silent-test.out'))
          var result = buffertools.equals(fileA, fileB)
          expect(result).to.equal(true)
          done()
        }, 500)
      })
    })
  })

  it('BroadCast', function (done) {
    var ms = new MultiStream.Broadcast()

    tcp.createServer(function (socket) {
      ms.handle(socket)
      ms.broadcast('/bird/3.2.1', function (ds) {
        ds.write('hey, how is it going?')
      })
    }).listen(9003)

    var socket = tcp.connect({port: 9003})

    socket.on('connect', function () {
      var input = fs.createReadStream('./test/spec/pristine/broadcast.in')
      input.pipe(socket)
      setTimeout(function () {
        // Compare both pristine and test output to validate the test
        var fileA = fs.readFileSync('./test/spec/pristine/broadcast.out')
        var fileB = fs.readFileSync(path.join(__dirname, '/broadcast-test.out'))
        var result = buffertools.equals(fileA, fileB)
        expect(result).to.equal(true)
        done()
      }, 500)

      socket.pipe(fs.createWriteStream(path.join(__dirname, '/broadcast-test.out')))
    })
  })
})
