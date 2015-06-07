var lpm = require('length-prefixed-message')

exports = module.exports = MultiStream
exports.createMultiStream = createMultiStream

var PROTOCOLID = '/multistream/1.0.0'

function createMultiStream (duplexStream) {
  return new MultiStream(duplexStream)
}

function MultiStream (duplexStream) {
  if (!(this instanceof MultiStream)) {
    throw new Error('MultiStream must be called with new, or used with createMultiStream')
  }

  // for MultiStream Server

  if (duplexStream) {
    handle(duplexStream)
  }

  var handlers = {}
  var compatible = false

  this.addHandler = function (header, callback) {
    handlers[header] = callback
  }

  this.handle = handle

  function handle (duplexStream) {
    function read () {
      lpm.read(duplexStream, function (buffer) {
        var msg = buffer.toString()

        console.log(msg)

        if (msg.indexOf('/multistream') > -1) {
          if (msg === PROTOCOLID) {
            compatible = true
            lpm.write(duplexStream, new Buffer('OK-supported'))
            return read()
          }
        }

        if (!compatible) {
          lpm.write(duplexStream, new Buffer('multistream version not compatible, versions supported: ' + PROTOCOLID))
          return read()
        }

        if (msg === 'ls') {
          var ls = Object.keys(handlers).reduce(function (p, c, i, a) {
            if (i === a.length) {
              return p + '\n' + c + '\n'
            } else {
              return p + '\n' + c
            }
          })

          lpm.write(duplexStream, ls)
          return read()
        }

        if (handlers[msg]) {
          lpm.write(duplexStream, new Buffer('OK-protocol'))
          return handlers[msg](duplexStream)
        } else {
          lpm.write(duplexStream, new Buffer('Not a valid protocol, type ls to learn about available protocols'))
          return read()
        }

      })
    }
    read()

  }

  // for MultiStream client

  var supported = false

  function checkSupport (ds, callback) {
    if (supported) {
      return callback(null, ds)
    }

    lpm.write(ds, new Buffer(PROTOCOLID))
    lpm.read(ds, function (buffer) {

      if (buffer.toString() === 'OK-supported') {
        supported = true
        return callback(null, ds)
      }
      return callback(new Error('multistream version not supported'), null)
    })
  }

  this.select = function (protocol, ds, callback) {
    checkSupport(ds, select)

    function select (err, ds) {
      if (err) {
        return callback(err, null)
      }
      lpm.write(ds, new Buffer(protocol))
      lpm.read(ds, function (buffer) {
        if (buffer.toString() === 'OK-protocol') {
          return callback(null, ds)
        }
        return callback(new Error(buffer.toString()), null)
      })
    }
  }

  this.ls = function (ds, callback) {
    checkSupport(ds, ls)

    function ls (err, ds) {
      if (err) {
        return callback(err, null)
      }

      lpm.write(ds, new Buffer('ls'))
      lpm.read(ds, function (buffer) {
        callback(null, buffer.toString())
      })
    }
  }

}
