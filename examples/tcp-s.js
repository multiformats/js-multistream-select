var tcp = require('net')
var MultiStream = require('../src')

tcp.createServer(function (socket) {
  var ms = new MultiStream(socket)

  ms.addHandler('/dogs/0.1.0', function (ds) {
    ds.pipe(process.stdout)
  })
}).listen(8124)
