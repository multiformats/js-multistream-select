js-multistream
==============

[![](https://img.shields.io/badge/made%20by-Protocol%20Labs-blue.svg?style=flat-square)](http://ipn.io)
[![](https://img.shields.io/badge/project-IPFS-blue.svg?style=flat-square)](http://ipfs.io/)
[![](https://img.shields.io/badge/freenode-%23ipfs-blue.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23ipfs)
[![Coverage Status](https://coveralls.io/repos/github/diasdavid/js-multistream/badge.svg?branch=master)](https://coveralls.io/github/diasdavid/js-multistream?branch=master)
[![Travis CI](https://travis-ci.org/diasdavid/js-multistream.svg?branch=master)](https://travis-ci.org/diasdavid/js-multistream)
[![Circle CI](https://circleci.com/gh/diasdavid/js-multistream.svg?style=svg)](https://circleci.com/gh/diasdavid/js-multistream)
[![Dependency Status](https://david-dm.org/diasdavid/js-multistream.svg?style=flat-square)](https://david-dm.org/diasdavid/js-multistream) [![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/feross/standard)

> JavaScript implementation of [multistream](https://github.com/jbenet/multistream).

## Installation

### npm

```sh
> npm i multistream-select
```

## Setup

### Node.js

```js
const multistream = require('multistream-select')
```

### Browser: Browserify, Webpack, other bundlers

The code published to npm that gets loaded on require is in fact a ES5
transpiled version with the right shims added. This means that you can require
it and use with your favourite bundler without having to adjust asset management
process.

```js
const multistream = require('multistream-select')
```

### Browser: `<script>` Tag

Loading this module through a script tag will make the `Multistream` obj available in
the global namespace.

```html
<script src="https://npmcdn.com/multistream-select/dist/index.min.js"></script>
<!-- OR -->
<script src="https://npmcdn.com/multistream-select/dist/index.js"></script>
```

## How does it work

Two modes of operation:
- silent - broadcast - For one-way style of communications (for when you need a push like MultiStream
- interactive - select - When you want to suport more than one Protocol in your MultiStream at the same time, where the receiver "selects" the right handler for a specific stream, while the sender "interactively" picks the protocol it wants to use throw `req-ack` and/or `ls` for protocol listing

### silent - broadcast

The sender doesn't have a confirmation of message reception. Both the dialing endpoint or the caller endpoint can act as the "broadcaster" while the other acts as silent

```
# Establis a connection through your desired transport
< /multistream-select/0.3.0            # let's speak multistream-select/0.3.0
< /pfs/QmBBQ.../time/0.1.2.            # i'm going to speak time/0.1.2
< 2015-06-07 14:32:11
```

### interactive - select

The caller will send "interactive" messages, expecting for some acknowledgement from the callee, which will "select" the handler for the desired and supported protocol

```
< /multistream-select/0.3.0  # i speak multistream-select/0.3.0
> /multistream-select/0.3.0  # ok, let's speak multistream-select/0.3.0
> /ipfs-dht/0.2.3            # i want to speak ipfs-dht/0.2.3
< na                         # ipfs-dht/0.2.3 is not available
> /ipfs-dht/0.1.9            # What about ipfs-dht/0.1.9 ?
< /ipfs-dht/0.1.9            # ok let's speak ipfs-dht/0.1.9 -- in a sense acts as an ACK
> <dht-message>
> <dht-message>
> <dht-message>
```

This mode also packs a `ls` option, so that the callee can list the protocols it currently supports

## Usage/Examples

### silent - broadcast

Reference to the examples on the examples folder:
- https://github.com/diasdavid/js-multistream/blob/master/examples/tcp-peer-silent.js
- https://github.com/diasdavid/js-multistream/blob/master/examples/tcp-peer-broadcast.js

### interactive - select

Reference to the examples on the examples folder:
- https://github.com/diasdavid/js-multistream/blob/master/examples/tcp-interactive.js
- https://github.com/diasdavid/js-multistream/blob/master/examples/tcp-select.js

## Other impl

- [go-multistream](https://github.com/whyrusleeping/go-multistream)
