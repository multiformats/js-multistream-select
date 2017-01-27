/* eslint-env mocha */

'use strict'

const expect = require('chai').expect
const pull = require('pull-stream')
const mss = require('../src')
const parallel = require('run-parallel')
const series = require('run-series')

const util = require('./util')
const createPair = util.createPair

describe('semver-match', () => {
  let conns

  beforeEach((done) => {
    createPair(false, gotConns)

    function gotConns (err, _conns) {
      expect(err).to.not.exist
      conns = _conns
      done()
    }
  })

  it('should match', (done) => {
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
        msl.addHandler('/monster/1.0.0', (p, conn) => {
          pull(conn, conn)
        }, mss.matchSemver)
        next()
      },
      (next) => {
        msd.select('/monster/1.0.0', (err, conn) => {
          expect(err).to.not.exist

          pull(
            pull.values(['cookie']),
            conn,
            pull.collect((err, data) => {
              expect(err).to.not.exist
              expect(data[0].toString()).to.be.eql('cookie')
              next()
            })
          )
        })
      }
    ], done)
  })

  it('should not match', (done) => {
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
        msl.addHandler('/monster/1.1.0', (p, conn) => {
          pull(conn, conn)
        }, mss.matchSemver)
        next()
      },
      (next) => {
        msd.select('/monster/2.0.0', (err, conn) => {
          expect(err).to.exist
          next()
        })
      }
    ], done)
  })
})

