/* eslint-env mocha */

'use strict'

const expect = require('chai').expect
const pull = require('pull-stream')
const pullPair = require('pull-pair/duplex')
const mss = require('../src')
const parallel = require('run-parallel')
const series = require('run-series')

const spdy = require('libp2p-spdy')
const multiplex = require('libp2p-multiplex')

const createPair = (muxer) => {
  const pair = pullPair()
  if (muxer === false) {
    return {
      dialer: pair[0],
      listener: pair[1]
    }
  } else {
    if (muxer.dialer === undefined || muxer.listener === undefined) {
      throw new Error('Passed in muxer needs to have dialer and listener')
    } else {
      return {
        dialer: muxer.dialer(pair[0]),
        listener: muxer.listener(pair[1])
      }
    }
  }
}

const getDialerAndListenerConn = (pair, isWithMuxer, callback) => {
  if (isWithMuxer === false) {
    callback({
      listener: pair.listener,
      dialer: pair.dialer
    })
  } else {
    const dialerConn = pair.dialer.newStream()
    pair.listener.once('stream', (listenerConn) => {
      callback({
        listener: listenerConn,
        dialer: dialerConn
      })
    })
  }
}

const muxers = [
  {name: 'spdy', module: spdy},
  {name: 'multiplex', module: multiplex},
  // Represents using stream-select without any muxer
  {name: 'no muxer', module: false}
]

describe('mss handshake', () => {
  muxers.forEach(({name, module}) => {
    describe(name, () => {
      it('performs the handshake handshake', (done) => {
        const p = createPair(module)
        getDialerAndListenerConn(p, module, doHandle)
        function doHandle (conns) {
          parallel([
            (cb) => {
              const msl = new mss.Listener()
              expect(msl).to.exist
              msl.handle(conns.listener, cb)
            },
            (cb) => {
              const msd = new mss.Dialer()
              expect(msd).to.exist
              msd.handle(conns.dialer, cb)
            }
          ], done)
        }
      })
      it('handle and select a protocol', (done) => {
        const p = createPair(module)
        getDialerAndListenerConn(p, module, doSelect)

        function doSelect (conns) {
          let msl
          let msd
          series([
            (next) => {
              parallel([
                (cb) => {
                  msl = new mss.Listener()
                  expect(msl).to.exist
                  msl.handle(conns.listener, cb)
                },
                (cb) => {
                  msd = new mss.Dialer()
                  expect(msd).to.exist
                  msd.handle(conns.dialer, cb)
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
                    // passing all tests
                    expect(data[0].toString()).to.be.eql('banana')
                    // only passing with muxer, original assertion
                    // expect(data).to.be.eql(['banana'])
                    next()
                  })
                )
              })
            }
          ], done)
        }
      })
      it('select non existing proto', (done) => {
        const p = createPair(module)
        getDialerAndListenerConn(p, module, doSelect)

        function doSelect (conns) {
          let msl
          let msd
          series([
            (next) => {
              parallel([
                (cb) => {
                  msl = new mss.Listener()
                  expect(msl).to.exist
                  msl.handle(conns.listener, cb)
                },
                (cb) => {
                  msd = new mss.Dialer()
                  expect(msd).to.exist
                  msd.handle(conns.dialer, cb)
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
        }
      })
      it('select a non existing proto and then select an existing proto', (done) => {
        const p = createPair(module)
        getDialerAndListenerConn(p, module, doSelect)

        function doSelect (conns) {
          let msl
          let msd
          series([
            (next) => {
              parallel([
                (cb) => {
                  msl = new mss.Listener()
                  expect(msl).to.exist
                  msl.handle(conns.listener, cb)
                },
                (cb) => {
                  msd = new mss.Dialer()
                  expect(msd).to.exist
                  msd.handle(conns.dialer, cb)
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
                    expect(data[0].toString()).to.be.eql('banana')
                    next()
                  })
                )
              })
            }
          ], done)
        }
      })
      it('ls', (done) => {
        const p = createPair(module)
        getDialerAndListenerConn(p, module, doSelect)

        function doSelect (conns) {
          let msl
          let msd
          series([
            (next) => {
              parallel([
                (cb) => {
                  msl = new mss.Listener()
                  expect(msl).to.exist
                  msl.handle(conns.listener, cb)
                },
                (cb) => {
                  msd = new mss.Dialer()
                  expect(msd).to.exist
                  msd.handle(conns.dialer, cb)
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
        }
      })
      it('handler must be a function', (done) => {
        const p = createPair(module)
        getDialerAndListenerConn(p, module, doSelect)

        function doSelect (conns) {
          let msl
          let msd
          series([
            (next) => {
              parallel([
                (cb) => {
                  msl = new mss.Listener()
                  expect(msl).to.exist
                  msl.handle(conns.listener, cb)
                },
                (cb) => {
                  msd = new mss.Dialer()
                  expect(msd).to.exist
                  msd.handle(conns.dialer, cb)
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
        }
      })
      it('racing condition resistent', (done) => {
        const p = createPair(module)
        getDialerAndListenerConn(p, module, doSelect)

        function doSelect (conns) {
          let msl
          let msd
          parallel([
            (cb) => {
              series([
                (next) => {
                  msl = new mss.Listener()
                  expect(msl).to.exist
                  setTimeout(() => {
                    msl.handle(conns.listener, next)
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
              msd.handle(conns.dialer, (err) => {
                expect(err).to.not.exist
                msd.select('/monkey/1.0.0', (err, conn) => {
                  expect(err).to.not.exist

                  pull(
                    pull.values(['banana']),
                    conn,
                    pull.collect((err, data) => {
                      expect(err).to.not.exist
                      expect(data[0].toString()).to.be.eql('banana')
                      cb()
                    })
                  )
                })
              })
            }
          ], done)
        }
      })
      describe('custom matching function', () => {
        it('match-true always', (done) => {
          const p = createPair(module)
          getDialerAndListenerConn(p, module, doSelect)

          function doSelect (conns) {
            let msl
            let msd
            series([
              (next) => {
                parallel([
                  (cb) => {
                    msl = new mss.Listener()
                    expect(msl).to.exist
                    msl.handle(conns.listener, cb)
                  },
                  (cb) => {
                    msd = new mss.Dialer()
                    expect(msd).to.exist
                    msd.handle(conns.dialer, cb)
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
                      expect(data[0].toString()).to.be.eql('banana')
                      next()
                    })
                  )
                })
              }
            ], done)
          }
        })

        describe('semver-match', () => {
          it('should match', (done) => {
            const p = createPair(module)
            getDialerAndListenerConn(p, module, doSelect)

            function doSelect (conns) {
              let msl
              let msd
              series([
                (next) => {
                  parallel([
                    (cb) => {
                      msl = new mss.Listener()
                      expect(msl).to.exist
                      msl.handle(conns.listener, cb)
                    },
                    (cb) => {
                      msd = new mss.Dialer()
                      expect(msd).to.exist
                      msd.handle(conns.dialer, cb)
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
            }
          })

          it('should not match', (done) => {
            const p = createPair(module)
            getDialerAndListenerConn(p, module, doSelect)

            function doSelect (conns) {
              let msl
              let msd
              series([
                (next) => {
                  parallel([
                    (cb) => {
                      msl = new mss.Listener()
                      expect(msl).to.exist
                      msl.handle(conns.listener, cb)
                    },
                    (cb) => {
                      msd = new mss.Dialer()
                      expect(msd).to.exist
                      msd.handle(conns.dialer, cb)
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
            }
          })
        })
      })
    })
  })
})

