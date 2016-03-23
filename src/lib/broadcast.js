'use strict'

var lpm = require('length-prefixed-message')
var PROTOCOLID = require('./protocol-id')

exports = module.exports = Broadcast
exports.createBroadcast = createBroadcast

function createBroadcast () {
  return new Broadcast()
}

function Broadcast () {
  var self = this
  if (!(self instanceof Broadcast)) {
    throw new Error('Broadcast must be called with new, or used with Broadcast')
  }

  self.handle = function handle (duplexStream, callback) {
    self.duplexStream = duplexStream
    lpm.write(self.duplexStream, new Buffer(PROTOCOLID + '\n'))
  }

  self.broadcast = function broadcast (protocol, callback) {
    lpm.write(self.duplexStream, new Buffer(protocol + '\n'))
    callback(self.duplexStream)
  }
}
