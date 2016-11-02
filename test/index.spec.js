/* eslint-env mocha */

'use strict'

const expect = require('chai').expect
const pull = require('pull-stream')
const pullLP = require('pull-length-prefixed')
const pullPair = require('pull-pair/duplex')
const mss = require('../src')
const parallel = require('run-parallel')
const series = require('run-series')

describe('mss dialer', () => {
  it('sends the mss multicodec', (done) => {
    const p = pullPair()
    const dialerConn = p[0]
    const listenerConn = p[1]

    pull(
      listenerConn,
      pullLP.decode(),
      pull.drain((data) => {
        expect(data.toString()).to.equal('/multistream/1.0.0\n')
        done()
      })
    )

    const msd = new mss.Dialer()
    expect(msd).to.exist
    msd.handle(dialerConn, () => {})
  })
})
describe('mss listener', () => {
  it('sends the mss multicodec', (done) => {
    const p = pullPair()
    const dialerConn = p[0]
    const listenerConn = p[1]

    pull(
      dialerConn,
      pullLP.decode(),
      pull.drain((data) => {
        expect(data.toString()).to.equal('/multistream/1.0.0\n')
        done()
      })
    )

    const msl = new mss.Listener()
    expect(msl).to.exist
    msl.handle(listenerConn, () => {})
  })
})

describe('mss handshake', () => {
  it('performs the handshake handshake', (done) => {
    const p = pullPair()
    const dialerConn = p[0]
    const listenerConn = p[1]

    parallel([
      (cb) => {
        const msl = new mss.Listener()
        expect(msl).to.exist
        msl.handle(listenerConn, cb)
      },
      (cb) => {
        const msd = new mss.Dialer()
        expect(msd).to.exist
        msd.handle(dialerConn, cb)
      }
    ], done)
  })

  it('handle and select a protocol', (done) => {
    const p = pullPair()
    const dialerConn = p[0]
    const listenerConn = p[1]

    let msl
    let msd
    series([
      (next) => {
        parallel([
          (cb) => {
            msl = new mss.Listener()
            expect(msl).to.exist
            msl.handle(listenerConn, cb)
          },
          (cb) => {
            msd = new mss.Dialer()
            expect(msd).to.exist
            msd.handle(dialerConn, cb)
          }
        ], next)
      },
      (next) => {
        const protocol = '/monkey/1.0.0'
        msl.addHandler(protocol, (p, conn) => {
          expect(protocol).to.equal(p)
          pull(conn, conn)
        })
        next()
      },
      (next) => {
        msd.select('/monkey/1.0.0', (err, conn) => {
          expect(err).to.not.exist

          pull(
            pull.values(['banana']),
            conn,
            pull.collect((err, data) => {
              expect(err).to.not.exist
              expect(data).to.be.eql(['banana'])
              next()
            })
          )
        })
      }
    ], done)
  })

  it('select non existing proto', (done) => {
    const p = pullPair()
    const dialerConn = p[0]
    const listenerConn = p[1]

    let msl
    let msd
    series([
      (next) => {
        parallel([
          (cb) => {
            msl = new mss.Listener()
            expect(msl).to.exist
            msl.handle(listenerConn, cb)
          },
          (cb) => {
            msd = new mss.Dialer()
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

  it('select a non existing proto and then select an existing proto', (done) => {
    const p = pullPair()
    const dialerConn = p[0]
    const listenerConn = p[1]

    let msl
    let msd
    series([
      (next) => {
        parallel([
          (cb) => {
            msl = new mss.Listener()
            expect(msl).to.exist
            msl.handle(listenerConn, cb)
          },
          (cb) => {
            msd = new mss.Dialer()
            expect(msd).to.exist
            msd.handle(dialerConn, cb)
          }
        ], next)
      },
      (next) => {
        const protocol = '/monkey/1.0.0'
        msl.addHandler(protocol, (p, conn) => {
          expect(protocol).to.equal(p)
          pull(conn, conn)
        })
        next()
      },
      (next) => {
        msd.select('/sadpanda/1.0.0', (err) => {
          expect(err).to.exist
          next()
        })
      },
      (next) => {
        msd.select('/monkey/1.0.0', (err, conn) => {
          expect(err).to.not.exist
          pull(
            pull.values(['banana']),
            conn,
            pull.collect((err, data) => {
              expect(err).to.not.exist
              expect(data).to.be.eql(['banana'])
              next()
            })
          )
        })
      }
    ], done)
  })

  it('ls', (done) => {
    const p = pullPair()
    const dialerConn = p[0]
    const listenerConn = p[1]

    let msl
    let msd
    series([
      (next) => {
        parallel([
          (cb) => {
            msl = new mss.Listener()
            expect(msl).to.exist
            msl.handle(listenerConn, cb)
          },
          (cb) => {
            msd = new mss.Dialer()
            expect(msd).to.exist
            msd.handle(dialerConn, cb)
          }
        ], next)
      },
      (next) => {
        const protocol = '/monkey/1.0.0'
        msl.addHandler(protocol, (p, conn) => {
          expect(protocol).to.equal(p)
          pull(conn, conn)
        })
        next()
      },
      (next) => {
        msl.addHandler('/giraffe/2.0.0', (protocol, conn) => {
          pull(conn, conn)
        })
        next()
      },
      (next) => {
        msl.addHandler('/elephant/2.5.0', (protocol, conn) => {
          pull(conn, conn)
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
    const p = pullPair()
    const dialerConn = p[0]
    const listenerConn = p[1]

    let msl
    let msd
    series([
      (next) => {
        parallel([
          (cb) => {
            msl = new mss.Listener()
            expect(msl).to.exist
            msl.handle(listenerConn, cb)
          },
          (cb) => {
            msd = new mss.Dialer()
            expect(msd).to.exist
            msd.handle(dialerConn, cb)
          }
        ], next)
      },
      (next) => {
        expect(
          () => msl.addHandler('/monkey/1.0.0', 'potato')
        ).to.throw(
          /must be a function/
        )
        next()
      }
    ], done)
  })

  it('racing condition resistent', (done) => {
    const p = pullPair()
    const dialerConn = p[0]
    const listenerConn = p[1]

    let msl
    let msd
    parallel([
      (cb) => {
        series([
          (next) => {
            msl = new mss.Listener()
            expect(msl).to.exist
            setTimeout(() => {
              msl.handle(listenerConn, next)
            }, 200)
          },
          (next) => {
            msl.addHandler('/monkey/1.0.0', (protocol, conn) => {
              pull(conn, conn)
            })
            next()
          }
        ], cb)
      },
      (cb) => {
        msd = new mss.Dialer()
        msd.handle(dialerConn, (err) => {
          expect(err).to.not.exist
          msd.select('/monkey/1.0.0', (err, conn) => {
            expect(err).to.not.exist

            pull(
              pull.values(['banana']),
              conn,
              pull.collect((err, data) => {
                expect(err).to.not.exist
                expect(data).to.be.eql(['banana'])
                cb()
              })
            )
          })
        })
      }
    ], done)
  })
})

describe('custom matching function', () => {
  it('match-true always', (done) => {
    const p = pullPair()
    const dialerConn = p[0]
    const listenerConn = p[1]

    let msl
    let msd
    series([
      (next) => {
        parallel([
          (cb) => {
            msl = new mss.Listener()
            expect(msl).to.exist
            msl.handle(listenerConn, cb)
          },
          (cb) => {
            msd = new mss.Dialer()
            expect(msd).to.exist
            msd.handle(dialerConn, cb)
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
            pull.values(['banana']),
            conn,
            pull.collect((err, data) => {
              expect(err).to.not.exist
              expect(data).to.be.eql(['banana'])
              next()
            })
          )
        })
      }
    ], done)
  })

  describe('semver-match', () => {
    it('should match', (done) => {
      const p = pullPair()
      const dialerConn = p[0]
      const listenerConn = p[1]

      let msl
      let msd
      series([
        (next) => {
          parallel([
            (cb) => {
              msl = new mss.Listener()
              expect(msl).to.exist
              msl.handle(listenerConn, cb)
            },
            (cb) => {
              msd = new mss.Dialer()
              expect(msd).to.exist
              msd.handle(dialerConn, cb)
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
                expect(data).to.be.eql(['cookie'])
                next()
              })
            )
          })
        }
      ], done)
    })

    it('should not match', (done) => {
      const p = pullPair()
      const dialerConn = p[0]
      const listenerConn = p[1]

      let msl
      let msd
      series([
        (next) => {
          parallel([
            (cb) => {
              msl = new mss.Listener()
              expect(msl).to.exist
              msl.handle(listenerConn, cb)
            },
            (cb) => {
              msd = new mss.Dialer()
              expect(msd).to.exist
              msd.handle(dialerConn, cb)
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
})
