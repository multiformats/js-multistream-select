var tcp = require('net')
var lpm = require('length-prefixed-message')

var client = tcp.connect({port: 8765}, connected)

function connected () {

  console.log('connected to server!')

  lpm.read(client, function (msgBuffer) {
    console.log('1- ', msgBuffer.toString())

    lpm.write(client, new Buffer('/cats'))

    client.on('data', function (data) {
      console.log('2- got something: ', data.toString())
    })

  })

}

client.on('end', function () {
  console.log('disconnected from server')
})
