'use strict'

const log = require('debug')('it-multistream-select:select')
const errCode = require('err-code')
const multistream = require('./multistream')
const toReaderWriter = require('./to-reader-writer')

module.exports = async (stream, protocols) => {
  protocols = Array.isArray(protocols) ? protocols : [protocols]
  const { reader, writer, rest } = toReaderWriter(stream)

  for (const protocol of protocols) {
    log('write "%s"', protocol)
    multistream.write(writer, protocol)
    const response = (await multistream.read(reader)).toString()
    log('read "%s" "%s"', protocol, response)

    if (response === protocol) {
      writer.end() // End our writer so others can start writing to stream
      return { stream: rest, protocol }
    }
  }

  writer.end()
  throw errCode(new Error(`protocol selection failed`), 'ERR_UNSUPPORTED_PROTOCOL')
}
