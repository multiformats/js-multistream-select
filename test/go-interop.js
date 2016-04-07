// WIP
// 1. Ensure that both can communicat
// 2. Write this in the form of a lab test where the latest go-multistream binary gets pulled and run againsts node-multistream
'use strict'

var tcp = require('net')
var lpm = require('length-prefixed-message')

var client = tcp.connect({port: 8765}, connected)

function connected () {
  console.log('connected to server!')

  lpm.read(client, function (msgBuffer) {
    console.log('1-', msgBuffer.toString().slice(0, -1))

    lpm.write(client, new Buffer('/cats' + '\n'))

    client.on('data', function (data) {
      console.log('2-', data.toString())
    })
  })
}

client.on('end', function () {
  console.log('disconnected from server')
})
