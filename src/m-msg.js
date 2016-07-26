'use strict'

module.exports = function mMsg (msg) {
  return new Buffer(msg + '\n')
}
