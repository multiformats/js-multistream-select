/* eslint-env mocha */
'use strict'

const expect = require('chai').expect
const Rx = require('rxjs/Rx')

const varint = require('../src/varint')

describe('varint', () => {
  it('reads', (done) => {
    const source = Rx.Observable.from([
      varint.encode(new Buffer('hello')),
      varint.encode(new Buffer('world'))
    ])

    varint.create(source)
      .toArray()
      .subscribe((msgs) => {
        expect(msgs).be.eql([
          new Buffer('hello'),
          new Buffer('world')
        ])
        done()
      }, done)
  })

  it('writes', (done) => {
    const target = new Rx.Subject()
    const encoded = varint.create(target)

    target
      .toArray()
      .subscribe((msgs) => {
        expect(msgs).be.eql([
          varint.encode(new Buffer('hello')),
          varint.encode(new Buffer('world'))
        ])
        done()
      }, done)

    encoded.next(new Buffer('hello'))
    encoded.next(new Buffer('world'))
    encoded.complete()
  })
})
