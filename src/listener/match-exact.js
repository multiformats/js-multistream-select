'use strict'

function matchExact (myProtocol, senderProtocol, callback) {
  if (myProtocol === senderProtocol) {
    callback(null, true)
  } else {
    callback(null, false)
  }
}

module.exports = matchExact
