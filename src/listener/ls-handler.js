'use strict'

const pull = require('pull-stream')
const pullLP = require('pull-length-prefixed')
const varint = require('varint')

function lsHandler (self, conn) {
  const protos = Object.keys(self.handlers)
                       .filter((key) => key !== 'ls')

  const nProtos = protos.length
  // total size of the list of protocols, including varint and newline
  const size = protos.reduce((size, proto) => {
    const p = new Buffer(proto + '\n')
    const el = varint.encodingLength(p.length)
    return size + el
  }, 0)

  const buf = Buffer.concat([
    new Buffer(varint.encode(nProtos)),
    new Buffer(varint.encode(size)),
    new Buffer('\n')
  ])

  const encodedProtos = protos.map((proto) => {
    return new Buffer(proto + '\n')
  })
  const values = [buf].concat(encodedProtos)

  pull(
    pull.values(values),
    pullLP.encode(),
    conn
  )
}

module.exports = lsHandler
