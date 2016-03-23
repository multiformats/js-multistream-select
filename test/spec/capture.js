'use strict'

var path = require('path')
var tcp = require('net')
var fs = require('fs')

module.exports = function (srcPort, dstPort, srcName, dstName) {
  var folder = path.join(__dirname, '/pristine/')

  tcp.createServer(function (srcSocket) {
    var dstSocket = tcp.connect({port: dstPort}, connected)

    function connected () {
      srcSocket.pipe(dstSocket)
      dstSocket.pipe(srcSocket)

      dstSocket.pipe(fs.createWriteStream(folder + srcName + '.in'))
      srcSocket.pipe(fs.createWriteStream(folder + srcName + '.out'))

      srcSocket.pipe(fs.createWriteStream(folder + dstName + '.in'))
      dstSocket.pipe(fs.createWriteStream(folder + dstName + '.out'))
    }
  }).listen(srcPort)
}
