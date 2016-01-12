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
var PROTOCOLID = require('../../src/lib/protocol-id')
var lpm = require('length-prefixed-message')

experiment('Node.js Implementation: ', function () {
  var msS
  var msI
  var dogsDS

  before(function (done) {
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

  test('create a Select MultiStream via function', function (done) {
    expect(MultiStream.Select.createSelect()).to.be.an.instanceof(MultiStream.Select)
    done()
  })

  test('throw an error if Select function is misused', function (done) {
    try {
      MultiStream.Select()
    } catch (e) {
      expect(e.message).to.equal('Select must be called with new, or used with createSelect')
      done()
    }
  })

  test('create a Interactive MultiStream()', function (done) {
    msI = new MultiStream.Interactive()
    expect(msI).to.be.an.instanceof(MultiStream.Interactive)
    done()
  })

  test('create a Interactive MultiStream() via utility function', function (done) {
    expect(MultiStream.Interactive.createInteractive()).to.be.an.instanceof(MultiStream.Interactive)
    done()
  })

  test('throw an error if Interactive function is misused', function (done) {
    try {
      MultiStream.Interactive()
    } catch (e) {
      expect(e.message).to.equal('MultiStream must be called with new, or used with createMultiStream')
      done()
    }
  })

  test('attach a duplex stream to Select MultiStream (tcp server)', function (done) {
    tcp.createServer(function (socket) {
      msS.handle(socket)
    }).listen(8010)
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

  test('Select closes connection for non supported protocol', function (done) {
    var select = new MultiStream.Select()
    tcp.createServer(function (socket) {
      select.handle(socket)
      socket.on('end', function () {
        done()
      })
    }).listen(8011)

    var socket = tcp.connect({port: 8011}, function tcpConnectionOpen () {
      lpm.write(socket, PROTOCOLID + '\n')
      lpm.write(socket, 'na\n')
    })
  })

  test('Interactive responds with `na` for wrong protocol', function (done) {
    var interactive = new MultiStream.Interactive()
    var server = tcp.createServer(function (socket) {
      interactive.handle(socket)
    })
    server.listen(8012)

    var socket = tcp.connect({port: 8012}, function tcpConnectionOpen () {
      lpm.write(socket, '/garbage/1.2.3\n')
    })
    socket.on('data', function (data) {
      if (data.toString().indexOf('na\n') >= 0) {
        done()
      }
    })
  })

  test('Interactive handles `na` handler response', function (done) {
    var interactive = new MultiStream.Interactive()
    tcp.createServer(function (socket) {
      interactive.handle(socket, function () {
        interactive.select('skipping')
        interactive.select('whatever', function (err) {
          expect(err.message).to.equal('whatever not supported')
          done()
        })
      })
    }).listen(8013)

    var socket = tcp.connect({port: 8013}, function tcpConnectionOpen () {
      lpm.write(socket, PROTOCOLID + '\n')
      lpm.write(socket, 'nan\n')
      lpm.write(socket, 'na\n')
    })
  })

})
