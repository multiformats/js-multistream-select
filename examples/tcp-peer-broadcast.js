var tcp = require('net')
var Broadcast = require('../src').Broadcast

tcp.createServer(function (socket) {
  var ms = new Broadcast()

  ms.handle(socket)

  ms.broadcast('/cake/1.2.3', function (ds) {
    process.stdin.pipe(ds)
  })

}).listen(8124)
