'use strict'

var tcp = require('net')
var Interactive = require('../src').Interactive

function connected () {
  var msi = new Interactive()
  console.log('info: sending `ls`')

  msi.handle(socket, function () {
    msi.ls(function (err, result) {
      if (err) {
        return console.log(err)
      }
      console.log('ls results: ', result)
    })
  })
}

var socket = tcp.connect({port: 8124}, connected)

socket.on('end', function () {
  console.log('disconnected from server')
})
