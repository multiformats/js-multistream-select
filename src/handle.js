'use strict'

const log = require('debug')('it-multistream-select:handle')
const { Buffer } = require('buffer')
const BufferList = require('bl')
const Varint = require('varint')
const Multistream = require('./multistream')
const toReaderWriter = require('./to-reader-writer')

module.exports = async (stream, protocols) => {
  protocols = Array.isArray(protocols) ? protocols : [protocols]
  const { reader, writer, rest } = toReaderWriter(stream)

  while (true) {
    const protocol = (await Multistream.read(reader)).toString()
    log('read "%s"', protocol)

    if (protocols.includes(protocol)) {
      Multistream.write(writer, protocol)
      log('write "%s" "%s"', protocol, protocol)
      writer.end()
      return { stream: rest, protocol }
    }

    if (protocol === 'ls') {
      // <varint-msg-len><varint-num-protos><varint-proto-name-len><proto-name>\n<varint-proto-name-len><proto-name>\n
      Multistream.write(writer, new BufferList([
        Buffer.from(Varint.encode(protocols.length)),
        ...protocols.map(p => Multistream.encode(p))
      ]).shallowSlice(0, -1))
      log('write "%s" %s', protocol, protocols)
      continue
    }

    Multistream.write(writer, 'na')
    log('write "%s" "na"', protocol)
  }
}
