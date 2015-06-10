var tcp = require('net')
var Select = require('../src').Select

tcp.createServer(function (socket) {
  var ms = new Select()

  ms.handle(socket)

  ms.addHandler('/dogs/0.1.0', function (ds) {
    ds.pipe(process.stdout)
  })
}).listen(8125)
