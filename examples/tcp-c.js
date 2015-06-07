var tcp = require('net')
var MultiStream = require('../src')

var socket = tcp.connect({port: 8124}, connected)

function connected () {
  console.log('info: connected to server!')

  var ms = new MultiStream()

  console.log('info: sending `ls`')
  ms.ls(socket, function (err, ls) {
    if (err) {
      return console.log(err)
    }

    console.log('info: \n', ls)
    ms.select('/dogs/0.1.0', socket, function (err, ds) {
      if (err) {
        return console.log(err)
      }
      console.log('info: selected /dogs/0.1.0')
      process.stdin.pipe(ds)
    })

  })

}

socket.on('end', function () {
  console.log('disconnected from server')
})
