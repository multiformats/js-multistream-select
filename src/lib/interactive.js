var lpm = require('length-prefixed-message')
var PROTOCOLID = require('./protocol-id')

exports = module.exports = Interactive
exports.createInteractive = createInteractive

function createInteractive () {
  return new Interactive()
}

function Interactive () {
  var self = this
  if (!(self instanceof Interactive)) {
    throw new Error('MultiStream must be called with new, or used with createMultiStream')
  }

  self.handle = handle

  function handle (duplexStream, callback) {
    self.duplexStream = duplexStream

    lpm.read(duplexStream, function (msgBuffer) {
      var msg = msgBuffer.toString()
      if (msg === PROTOCOLID) {
        lpm.write(duplexStream, new Buffer(PROTOCOLID)) // Sending the ACK
        callback()
      } else {
        lpm.write(duplexStream, new Buffer('na'))
      // TODO: multistream/version not supported, propose a new one.
      // So far we only have one version.
      }
    })
  }

  self.ls = function ls (callback) {
    lpm.write(self.duplexStream, new Buffer('ls'))
    lpm.read(self.duplexStream, function (msgBuffer) {
      callback(null, msgBuffer.toString())
    })
  }

  self.select = function select (protocol, callback) {
    lpm.write(self.duplexStream, new Buffer(protocol))
    lpm.read(self.duplexStream, function (msgBuffer) {
      if (msgBuffer.toString() === protocol) {
        return callback(null, self.duplexStream)
      }
      if (msgBuffer.toString() === 'na') {
        return callback(new Error(protocol + ' not supported'))
      }
    })
  }
}
