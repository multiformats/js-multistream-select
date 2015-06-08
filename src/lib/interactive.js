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
      var msg = msgBuffer.toString().slice(0, -1)
      if (msg === PROTOCOLID) {
        lpm.write(duplexStream, new Buffer(PROTOCOLID + '\n')) // Sending the ACK
        callback()
      } else {
        lpm.write(duplexStream, new Buffer('na' + '\n'))
      // TODO: multistream/version not supported, propose a new one.
      // So far we only have one version.
      }
    })
  }

  self.ls = function ls (callback) {
    lpm.write(self.duplexStream, new Buffer('ls' + '\n'))
    lpm.read(self.duplexStream, function (msgBuffer) {
      callback(null, msgBuffer.toString().slice(0, -1))
    })
  }

  self.select = function select (protocol, callback) {
    lpm.write(self.duplexStream, new Buffer(protocol + '\n'))
    lpm.read(self.duplexStream, function (msgBuffer) {
      if (msgBuffer.toString().slice(0, -1) === protocol) {
        return callback(null, self.duplexStream)
      }
      if (msgBuffer.toString().slice(0, -1) === 'na') {
        return callback(new Error(protocol + ' not supported'))
      }
    })
  }
}
