/* eslint-env mocha */

'use strict'

const expect = require('chai').expect
const pull = require('pull-stream')
const mss = require('../src')
const pullLP = require('pull-length-prefixed')

const util = require('./util')
const createPair = util.createPair

describe('half-handshake', () => {
  let conns

  beforeEach((done) => {
    createPair(false, gotConns)

    function gotConns (err, _conns) {
      expect(err).to.not.exist // eslint-disable-line
      conns = _conns
      done()
    }
  })

  it('dialer - sends the mss multicodec', (done) => {
    const dialerConn = conns[0]
    const listenerConn = conns[1]

    pull(
      listenerConn,
      pullLP.decode(),
      pull.drain((data) => {
        expect(data.toString()).to.equal('/multistream/1.0.0\n')
        done()
      })
    )

    const msd = new mss.Dialer()
    expect(msd).to.exist // eslint-disable-line
    msd.handle(dialerConn, () => {})
  })

  it('listener sends the mss multicodec', (done) => {
    const dialerConn = conns[0]
    const listenerConn = conns[1]

    pull(
      dialerConn,
      pullLP.decode(),
      pull.drain((data) => {
        expect(data.toString()).to.equal('/multistream/1.0.0\n')
        done()
      })
    )

    const msl = new mss.Listener()
    expect(msl).to.exist // eslint-disable-line
    msl.handle(listenerConn, () => {})
  })
})
