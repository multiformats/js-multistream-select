/* eslint-env mocha */

'use strict'

const expect = require('chai').expect
const streamPair = require('stream-pair')
const multistream = require('../src')
const parallel = require('run-parallel')
const series = require('run-series')
const bl = require('bl')

describe('multistream normal mode', function () {
  it('performs multistream handshake', (done) => {
    const sp = streamPair.create()
    const dialerConn = sp
    const listenerConn = sp.other

    parallel([
      (cb) => {
        const msl = new multistream.Listener()
        expect(msl).to.exist
        msl.handle(listenerConn, cb)
      },
      (cb) => {
        const msd = new multistream.Dialer()
        expect(msd).to.exist
        msd.handle(dialerConn, cb)
      }
    ], done)
  })

  it('handle and select a protocol', (done) => {
    const sp = streamPair.create()
    const dialerConn = sp
    const listenerConn = sp.other

    let msl
    let msd
    series([
      (next) => {
        parallel([
          (cb) => {
            msl = new multistream.Listener()
            expect(msl).to.exist
            msl.handle(listenerConn, cb)
          },
          (cb) => {
            msd = new multistream.Dialer()
            expect(msd).to.exist
            msd.handle(dialerConn, cb)
          }
        ], next)
      },
      (next) => {
        msl.addHandler('/monkey/1.0.0', (conn) => {
          conn.pipe(conn)
        })
        next()
      },
      (next) => {
        msd.select('/monkey/1.0.0', (err, conn) => {
          expect(err).to.not.exist
          conn.pipe(bl((err, data) => {
            expect(err).to.not.exist
            expect(data.toString()).to.equal('banana')
            next()
          }))
          conn.write('banana')
          conn.end()
        })
      }
    ], done)
  })

  it('select non existing proto', (done) => {
    const sp = streamPair.create()
    const dialerConn = sp
    const listenerConn = sp.other

    let msl
    let msd
    series([
      (next) => {
        parallel([
          (cb) => {
            msl = new multistream.Listener()
            expect(msl).to.exist
            msl.handle(listenerConn, cb)
          },
          (cb) => {
            msd = new multistream.Dialer()
            expect(msd).to.exist
            msd.handle(dialerConn, cb)
          }
        ], next)
      },
      (next) => {
        msd.select('/panda/1.0.0', (err) => {
          expect(err).to.exist
          next()
        })
      }
    ], done)
  })

  it('ls', (done) => {
    const sp = streamPair.create()
    const dialerConn = sp
    const listenerConn = sp.other

    let msl
    let msd
    series([
      (next) => {
        parallel([
          (cb) => {
            msl = new multistream.Listener()
            expect(msl).to.exist
            msl.handle(listenerConn, cb)
          },
          (cb) => {
            msd = new multistream.Dialer()
            expect(msd).to.exist
            msd.handle(dialerConn, cb)
          }
        ], next)
      },
      (next) => {
        msl.addHandler('/monkey/1.0.0', (conn) => {
          conn.pipe(conn)
        })
        next()
      },
      (next) => {
        msl.addHandler('/giraffe/2.0.0', (conn) => {
          conn.pipe(conn)
        })
        next()
      },
      (next) => {
        msl.addHandler('/elephant/2.5.0', (conn) => {
          conn.pipe(conn)
        })
        next()
      },
      (next) => {
        msd.ls((err, protocols) => {
          expect(err).to.not.exist
          expect(protocols).to.deep.equal([
            '/monkey/1.0.0',
            '/giraffe/2.0.0',
            '/elephant/2.5.0'
          ])
          next()
        })
      }
    ], done)
  })

  it('handler must be a function', (done) => {
    const sp = streamPair.create()
    const dialerConn = sp
    const listenerConn = sp.other

    let msl
    let msd
    series([
      (next) => {
        parallel([
          (cb) => {
            msl = new multistream.Listener()
            expect(msl).to.exist
            msl.handle(listenerConn, cb)
          },
          (cb) => {
            msd = new multistream.Dialer()
            expect(msd).to.exist
            msd.handle(dialerConn, cb)
          }
        ], next)
      },
      (next) => {
        try {
          msd.addHandler('/monkey/1.0.0', 'potato')
        } catch (err) {
          expect(err).to.exist
          next()
        }
      }
    ], done)
  })

  it('racing condition resistent', (done) => {
    const sp = streamPair.create()
    const dialerConn = sp
    const listenerConn = sp.other

    let msl
    let msd
    parallel([
      (cb) => {
        series([
          (next) => {
            msl = new multistream.Listener()
            expect(msl).to.exist
            setTimeout(() => {
              msl.handle(listenerConn, next)
            }, 200)
          },
          (next) => {
            msl.addHandler('/monkey/1.0.0', (conn) => {
              conn.pipe(conn)
            })
            next()
          }
        ], cb)
      },
      (cb) => {
        msd = new multistream.Dialer()
        msd.handle(dialerConn, (err) => {
          expect(err).to.not.exist
          msd.select('/monkey/1.0.0', (err, conn) => {
            expect(err).to.not.exist
            conn.pipe(bl((err, data) => {
              expect(err).to.not.exist
              expect(data.toString()).to.equal('banana')
              cb()
            }))
            conn.write('banana')
            conn.end()
          })
        })
      }
    ], done)
  })
})
