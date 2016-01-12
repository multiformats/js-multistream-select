var Lab = require('lab')
var Code = require('code')
var lab = exports.lab = Lab.script()
var lpm = require('length-prefixed-message')

var experiment = lab.experiment
var test = lab.test
var before = lab.before
var after = lab.after
var expect = Code.expect

var tcp = require('net')
var MultiStream = require('../../src/')

experiment('Node.js Implementation: ', function () {
  var msB
  var msS

  before(function (done) {
    done()
  })

  after(function (done) {
    done()
  })

  test('create a Broadcast MultiStream', function (done) {
    msB = new MultiStream.Broadcast()
    expect(msB).to.be.an.instanceof(MultiStream.Broadcast)
    done()
  })

  test('create a Broadcast MultiStream via utility function', function (done) {
    expect(MultiStream.Broadcast.createBroadcast()).to.be.an.instanceof(MultiStream.Broadcast)
    done()
  })

  test('throw an error if Broadcast function is misused', function (done) {
    try {
      MultiStream.Broadcast()
    } catch (e) {
      expect(e.message).to.equal('Broadcast must be called with new, or used with Broadcast')
      done()
    }
  })

  test('create a Silent MultiStream()', function (done) {
    msS = new MultiStream.Silent()
    expect(msS).to.be.an.instanceof(MultiStream.Silent)
    done()
  })

  test('create a Silent MultiStream via utility function', function (done) {
    expect(MultiStream.Silent.createSilent()).to.be.an.instanceof(MultiStream.Silent)
    done()
  })

  test('throw an error if Silent function is misused', function (done) {
    try {
      MultiStream.Silent()
    } catch (e) {
      expect(e.message).to.equal('Silent must be called with new, or used with Silent')
      done()
    }
  })

  test('attach a stream to Broadcast MultiStream (tcp server)', function (done) {
    tcp.createServer(function (socket) {
      msB.handle(socket)
    }).listen(8020)
    done()
  })

  test('Attach the silent receiver to the stream', function (done) {
    var socket = tcp.connect({port: 8020}, connected)

    function connected () {
      msS.handle(socket, function () {
        done()
      })
    }

  })

  test('register a handler', function (done) {
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

  test('closing socket for unsupported protocol', function (done) {
    var acc = new MultiStream.Silent()
    tcp.createServer(function (socket) {
      acc.handle(socket, function (err) {
        expect(err.message).to.equal('Received non supported MultiStream version /garbage/1.0.0')
        socket.on('end', done)

      })
    }).listen(8021)

    var socket = tcp.connect({port: 8021}, function tcpConnectionOpen () {
      lpm.write(socket, '/garbage/1.0.0\n')
    })
  })

})
