'use strict'

var tcp = require('net')
var Interactive = require('../src').Interactive

var socket = tcp.connect({port: 8124}, connected)

function connected () {
  var msi = new Interactive()
  console.log('info: sending `ls`')

  msi.handle(socket, function () {
    msi.ls(function (err, result) {
      if (err) {
        return console.log(err)
      }
      console.log('ls results: ', result)

      msi.select('/dogs/0.1.0', function (err, ds) {
        if (err) {
          return console.log(err)
        }
        process.stdin.pipe(ds)
      })
    })
  })
}

socket.on('end', function () {
  console.log('disconnected from server')
})
