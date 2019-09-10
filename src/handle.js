'use strict'

const log = require('debug')('it-multistream-select:handle')
const BufferList = require('bl')
const multistream = require('./multistream')
const toReaderWriter = require('./to-reader-writer')

module.exports = async (stream, protocols) => {
  protocols = Array.isArray(protocols) ? protocols : [protocols]
  const { reader, writer, rest } = toReaderWriter(stream)

  while (true) {
    const protocol = (await multistream.read(reader)).toString()
    log('read "%s"', protocol)

    if (protocols.includes(protocol)) {
      multistream.write(writer, protocol)
      log('write "%s" "%s"', protocol, protocol)
      writer.end()
      return { stream: rest, protocol }
    }

    if (protocol === 'ls') {
      // <varint-msg-len><varint-proto-name-len><proto-name>\n<varint-proto-name-len><proto-name>\n\n
      multistream.write(writer, new BufferList(
        protocols.map(p => multistream.encode(p))
      ))
      log('write "%s" %s', protocol, protocols)
      continue
    }

    multistream.write(writer, 'na')
    log('write "%s" "na"', protocol)
  }
}
