/* eslint-env mocha */
'use strict'

const expect = require('chai').expect
const Rx = require('rxjs/Rx')

const varint = require('../src/varint')

describe.only('varint', () => {
  it('works', (done) => {
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
})
