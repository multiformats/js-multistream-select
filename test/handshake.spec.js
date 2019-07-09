/* eslint-env mocha */

'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)
const pull = require('pull-stream')
const mss = require('../src')
const parallel = require('run-parallel')
const series = require('run-series')

const spdy = require('libp2p-spdy')
const multiplex = require('pull-mplex')
const util = require('./util')
const createPair = util.createPair

const { errors } = require('../src/constants')

const options = [
  { name: 'over pull-pair' },
  { name: 'over spdy', muxer: spdy },
  { name: 'over mplex', muxer: multiplex }
]

options.forEach((option) => {
  describe('mss handshake with - ' + option.name, () => {
    let conns

    beforeEach((done) => {
      createPair(option.muxer, gotConns)

      function gotConns (err, _conns) {
        expect(err).to.not.exist()
        conns = _conns
        done()
      }
    })

    it('performs the mss handshake', (done) => {
      parallel([
        (cb) => {
          const msl = new mss.Listener()
          msl.handle(conns[0], cb)
        },
        (cb) => {
          const msd = new mss.Dialer()
          msd.handle(conns[1], cb)
        }
      ], done)
    })

    it('handle and select a protocol', (done) => {
      let msl
      let msd
      series([
        (next) => {
          parallel([
            (cb) => {
              msl = new mss.Listener()
              expect(msl).to.exist()
              msl.handle(conns[0], cb)
            },
            (cb) => {
              msd = new mss.Dialer()
              expect(msd).to.exist()
              msd.handle(conns[1], cb)
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
            expect(err).to.not.exist()

            pull(
              pull.values([Buffer.from('banana')]),
              conn,
              pull.collect((err, data) => {
                expect(err).to.not.exist()
                expect(data).to.be.eql([Buffer.from('banana')])
                next()
              })
            )
          })
        }
      ], done)
    })

    it('select non existing proto', (done) => {
      let msd

      series([
        (next) => {
          parallel([
            (cb) => {
              const msl = new mss.Listener()
              expect(msl).to.exist()
              msl.handle(conns[0], cb)
            },
            (cb) => {
              msd = new mss.Dialer()
              expect(msd).to.exist()
              msd.handle(conns[1], cb)
            }
          ], next)
        },
        (next) => {
          msd.select('/panda/1.0.0', (err) => {
            expect(err).to.exist()
            expect(err.code).to.eql(errors.MULTICODEC_NOT_SUPPORTED)
            next()
          })
        }
      ], done)
    })

    it('select a non existing proto and then select an existing proto', (done) => {
      let msl
      let msd

      series([
        (next) => {
          parallel([
            (cb) => {
              msl = new mss.Listener()
              expect(msl).to.exist()
              msl.handle(conns[0], cb)
            },
            (cb) => {
              msd = new mss.Dialer()
              expect(msd).to.exist()
              msd.handle(conns[1], cb)
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
            expect(err).to.exist()
            expect(err.code).to.eql(errors.MULTICODEC_NOT_SUPPORTED)
            next()
          })
        },
        (next) => {
          msd.select('/monkey/1.0.0', (err, conn) => {
            expect(err).to.not.exist()
            pull(
              pull.values([Buffer.from('banana')]),
              conn,
              pull.collect((err, data) => {
                expect(err).to.not.exist()
                expect(data).to.be.eql([Buffer.from('banana')])
                next()
              })
            )
          })
        }
      ], done)
    })

    it('ls', (done) => {
      let msl
      let msd

      series([
        (next) => {
          parallel([
            (cb) => {
              msl = new mss.Listener()
              expect(msl).to.exist()
              msl.handle(conns[0], cb)
            },
            (cb) => {
              msd = new mss.Dialer()
              expect(msd).to.exist()
              msd.handle(conns[1], cb)
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
            expect(err).to.not.exist()
            expect(protocols).to.eql([
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
      let msl
      let msd
      series([
        (next) => {
          parallel([
            (cb) => {
              msl = new mss.Listener()
              expect(msl).to.exist()
              msl.handle(conns[0], cb)
            },
            (cb) => {
              msd = new mss.Dialer()
              expect(msd).to.exist()
              msd.handle(conns[1], cb)
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
      let msl
      let msd

      parallel([
        (cb) => {
          series([
            (next) => {
              msl = new mss.Listener()
              expect(msl).to.exist()
              setTimeout(() => {
                msl.handle(conns[0], next)
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
          msd.handle(conns[1], (err) => {
            expect(err).to.not.exist()
            msd.select('/monkey/1.0.0', (err, conn) => {
              expect(err).to.not.exist()

              pull(
                pull.values([Buffer.from('banana')]),
                conn,
                pull.collect((err, data) => {
                  expect(err).to.not.exist()
                  expect(data).to.be.eql([Buffer.from('banana')])
                  cb()
                })
              )
            })
          })
        }
      ], done)
    })
  })
})
