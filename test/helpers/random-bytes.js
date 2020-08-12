'use strict'

function getRandomInt (max) {
  return Math.floor(Math.random() * Math.floor(max))
}

function randomBytes (num) {
  return new Uint8Array(num).map(() => getRandomInt(256))
}

module.exports = randomBytes
