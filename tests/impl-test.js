var Lab = require('lab')
var Code = require('code')
var lab = exports.lab = Lab.script()

var experiment = lab.experiment
var test = lab.test
var before = lab.before
var after = lab.after
var expect = Code.expect

var tcp = require('net')
var MultiStream = require('../src/')

experiment('Node.js Implementation: ', function () {
  var msS
  var msC
  var dogsDS

  before(function (done) {
    done()
  })

  after(function (done) {
    done()
  })

  test('create a MultiStream through createMultiStream', function (done) {
    msS = MultiStream.createMultiStream()
    expect(msS).to.be.an.instanceof(MultiStream)
    done()
  })

  test('create a MultiStream through new MultiStream()', function (done) {
    msC = new MultiStream()
    expect(msC).to.be.an.instanceof(MultiStream)
    done()
  })

  test('attach a duplex stream to MultiStream (tcp server)', function (done) {
    tcp.createServer(function (socket) {
      msS.handle(socket)
    }).listen(8124)
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
      msC.ls(socket, function (err, ls) {
        if (err) {
          return console.log(err)
        }
        ls = ls.split('\n')
        expect(ls[0]).to.equal('/dogs/0.1.0')
        expect(ls[1]).to.equal('/cats/1.2.11')
        done()
      })
    }

  })

  test('select one of the protocol->handler', function (done) {
    var socket = tcp.connect({port: 8124}, connected)

    function connected () {
      msC.select('/dogs/0.1.0', socket, function (err, ds) {
        if (err) {
          return console.log(err)
        }
        ds.write('hey')
        dogsDS.on('data', function (data) {
          expect(data.toString()).to.equal('hey')
          done()
        })
      })
    }
  })

  test('select one non existing protocol->handler', function (done) {
    var socket = tcp.connect({port: 8124}, connected)

    function connected () {
      msC.select('/mouse/1.1.0', socket, function (err, ds) {
        expect(err).to.be.an.instanceof(Error)
        done()
      })
    }
  })

})
