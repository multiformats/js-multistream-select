'use strict'

var tcp = require('net')
var Select = require('../src').Select

tcp.createServer(function (socket) {
  var ms = new Select()

  ms.handle(socket)

  ms.addHandler('/dogs/0.1.0', function (ds) {
    ds.pipe(process.stdout)
  })

  ms.addHandler('/cats/1.1.0', function (ds) {
    ds.pipe(ds)
  })

  ms.addHandler('/monkeys/4.1.0', function (ds) {
    ds.pipe(ds)
  })
}).listen(8124)
