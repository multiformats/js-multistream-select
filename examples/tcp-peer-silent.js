var tcp = require('net')
var Silent = require('../src').Silent

var socket = tcp.connect({port: 8124}, connected)

function connected () {
  var ms = new Silent()

  ms.handle(socket, function () {
    ms.addHandler('/cake/1.2.3', function (err, ds) {
      if (err) {
        return console.log(err)
      }
      ds.pipe(process.stdout)
    })
  })
}

socket.on('end', function () {
  console.log('disconnected from server')
})
