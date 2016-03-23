'use strict'

var lpm = require('length-prefixed-message')
var PROTOCOLID = require('./protocol-id')

exports = module.exports = Select
exports.createSelect = createSelect

function createSelect () {
  return new Select()
}

function Select () {
  if (!(this instanceof Select)) {
    throw new Error('Select must be called with new, or used with createSelect')
  }

  var handlers = {}
  // var compatible = false

  this.addHandler = function (header, handlerFunc) {
    handlers[header] = handlerFunc
  }

  this.handle = handle

  function handle (duplexStream) {
    lpm.write(duplexStream, new Buffer(PROTOCOLID + '\n'))
    interactive()

    function interactive () {
      lpm.read(duplexStream, function (buffer) {
        var msg = buffer.toString().slice(0, -1)

        if (msg === PROTOCOLID) { // ACK
          return interactive()
        }

        if (msg === 'na') {
          // If the client doesn't support our proposed multistream/version
          // we will wait for it to propose another version. So far, there
          // is only one version, so we will close the connection instead
          return duplexStream.end()
        }

        if (msg === 'ls') {
          lpm.write(duplexStream, new Buffer(JSON.stringify(Object.keys(handlers)) + '\n'))
          return interactive()
        }

        if (handlers[msg]) {
          lpm.write(duplexStream, new Buffer(msg + '\n'))
          return handlers[msg](duplexStream)
        } else {
          lpm.write(duplexStream, new Buffer('na' + '\n'))
          return interactive()
        }
      })
    }
  }
}
