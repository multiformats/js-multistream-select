var Lab = require('lab')
var Code = require('code')
var lab = exports.lab = Lab.script()

var experiment = lab.experiment
var test = lab.test
var before = lab.before
var after = lab.after
var expect = Code.expect

var tcp = require('net')
var MultiStream = require('../../src/')
var capture = require('./capture')

experiment('Node.js Implementation: ', function () {
  var msS
  var msI
  var dogsDS

  before(function (done) {
    capture(8124, 8125, 'interactive', 'select')
    done()
  })

  after(function (done) {
    done()
  })

  test('create a Select MultiStream', function (done) {
    msS = new MultiStream.Select()
    expect(msS).to.be.an.instanceof(MultiStream.Select)
    done()
  })

  test('create a Interactive MultiStream()', function (done) {
    msI = new MultiStream.Interactive()
    expect(msI).to.be.an.instanceof(MultiStream.Interactive)
    done()
  })

  test('attach a duplex stream to Select MultiStream (tcp server)', function (done) {
    tcp.createServer(function (socket) {
      msS.handle(socket)
    }).listen(8125)
    done()
  })

  test('register two handlers', function (done) {
    msS.addHandler('/dogs/0.1.0', function (ds) {
      dogsDS = ds
    })

    msS.addHandler('/cats/1.2.11', function (ds) {})

    done()
  })

  test('ls', function (done) {
    var socket = tcp.connect({port: 8124}, connected)

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

  test('select one non existing protocol->handler', function (done) {
    msI.select('/mouse/1.1.0', function (err, ds) {
      expect(err).to.be.an.instanceof(Error)
      done()
    })
  })

  test('select one of the protocol->handler', function (done) {
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
