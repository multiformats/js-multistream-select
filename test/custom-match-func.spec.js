/* eslint-env mocha */

'use strict'

const expect = require('chai').expect
const pull = require('pull-stream')
const mss = require('../src')
const parallel = require('run-parallel')
const series = require('run-series')

const util = require('./util')
const createPair = util.createPair

describe('custom matching function', () => {
  let conns

  beforeEach((done) => {
    createPair(false, gotConns)

    function gotConns (err, _conns) {
      expect(err).to.not.exist
      conns = _conns
      done()
    }
  })

  it('match-true always', (done) => {
    let msl
    let msd
    series([
      (next) => {
        parallel([
          (cb) => {
            msl = new mss.Listener()
            expect(msl).to.exist
            msl.handle(conns[0], cb)
          },
          (cb) => {
            msd = new mss.Dialer()
            expect(msd).to.exist
            msd.handle(conns[1], cb)
          }
        ], next)
      },
      (next) => {
        msl.addHandler('/does-not-matter/1.0.0', (p, conn) => {
          pull(conn, conn)
        }, (myProtocol, requestedProtocol, callback) => {
          callback(null, true)
        })
        next()
      },
      (next) => {
        msd.select('/it-is-gonna-match-anyway/1.0.0', (err, conn) => {
          expect(err).to.not.exist

          pull(
            pull.values([new Buffer('banana')]),
            conn,
            pull.collect((err, data) => {
              expect(err).to.not.exist
              expect(data).to.be.eql([new Buffer('banana')])
              next()
            })
          )
        })
      }
    ], done)
  })
})
