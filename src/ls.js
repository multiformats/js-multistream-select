'use strict'

const Reader = require('it-reader')
const log = require('debug')('it-multistream-select:ls')
const Varint = require('varint')
const Multistream = require('./multistream')
const toReaderWriter = require('./to-reader-writer')

module.exports = async stream => {
  const { reader, writer, rest } = toReaderWriter(stream)

  log('write "ls"')
  Multistream.write(writer, 'ls')
  writer.end()

  // Next message from remote will be (e.g. for 2 protocols):
  // <varint-msg-len><varint-num-protos><varint-proto-name-len><proto-name>\n<varint-proto-name-len><proto-name>\n
  const res = await Multistream.read(reader)

  // After reading response we have:
  // <varint-num-protos><varint-proto-name-len><proto-name>\n<varint-proto-name-len><proto-name>
  //
  // FIXME: Varint.decode expects a Buffer not a BufferList. The .slice is a
  // slow copy of the whole message. We could use a proxy? Hacky but works:
  // https://github.com/alanshaw/it-length-prefixed/blob/37d9f181ad9b3e272d5c3636f0ae1f7d9fbf738d/src/decode.js#L10-L12
  const totalProtocols = Varint.decode(res.slice())
  log('%s total protocols', totalProtocols)

  // Append \n because there's no final \n at the end of an ls message
  // https://github.com/multiformats/go-multistream/issues/41
  const protocolsReader = Reader([res.shallowSlice(Varint.decode.bytes).append('\n')])
  const protocols = []

  for (let i = 0; i < totalProtocols; i++) {
    const protocol = await Multistream.read(protocolsReader)
    log('read "%s"', protocol)
    protocols.push(protocol.toString())
  }

  return { stream: rest, protocols }
}
