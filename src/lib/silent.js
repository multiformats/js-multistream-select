'use strict'

var lpm = require('length-prefixed-message')
var PROTOCOLID = require('./protocol-id')

exports = module.exports = Silent
exports.createSilent = createSilent

function createSilent () {
  return new Silent()
}

function Silent () {
  var self = this
  if (!(self instanceof Silent)) {
    throw new Error('Silent must be called with new, or used with Silent')
  }

  self.handle = function handle (duplexStream, callback) {
    self.duplexStream = duplexStream
    lpm.read(duplexStream, function (msgBuffer) {
      var msg = msgBuffer.toString().slice(0, -1)

      if (msg === PROTOCOLID) {
        callback()
      } else {
        duplexStream.end()
        callback(new Error('Received non supported MultiStream version' + msg))
      }
    })
  }

  self.addHandler = function addHandler (protocol, callback) {
    lpm.read(self.duplexStream, function (msgBuffer) {
      var msg = msgBuffer.toString().slice(0, -1)
      if (msg === protocol) {
        return callback(null, self.duplexStream)
      } else {
        self.duplexStream.end()
        callback(new Error('Received non supported Protocol or Version: ' + msg))
      }
    })
  }
}
