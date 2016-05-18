multistream implementation in JavaScript
========================================

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

Loading this module through a script tag will make the `MultistreamSelect` obj available in
the global namespace.

```html
<script src="https://npmcdn.com/multistream-select/dist/index.min.js"></script>
<!-- OR -->
<script src="https://npmcdn.com/multistream-select/dist/index.js"></script>
```

## What is multistream

tl;dr: multistream is protocol multiplexing per connection/stream. [Full spec here](https://github.com/jbenet/multistream)

multistream-select has currently one mode of operation:

- normal - handshake on a protocol on a given stream

#### Normal mode

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

### Attach multistream to a connection (socket)

```JavaScript
const Multistream = require('multistream-select')

const ms = new multistream.Listener()
// or 
const ms = new multistream.Dialer()

// apply the multistream to the conn
ms.handle(conn, callback)
```

ms will be a dialer or listener multistream, depending on the `isListener` flag, which can be `true` or `false`.

### Handling a protocol

This function is only available in Listener mode

```JavaScript
ms.addHandler(<protocol>, <handlerFunc>)
```

- `protocol` is a string identifying the protocol.
- `handlerFunc` is a function of type `function (conn)` that will be called if there is a handshake performed on `protocol`.

### Selecting a protocol

This function is only available in Dialer mode

```JavaScript
ms.select(<protocol>, <callback>)
```

- `protocol` is a string of the protocol that we want to handshake.
- `callback` is a function of type `function (err, conn)` where `err` is an error object that gets passed if something wrong happend (e.g: if the protocol selected is not supported by the other end) and conn is the connection handshaked with the other end. 

### Listing the available protocols

This function is only available in Dialer mode

```JavaScript
ms.ls(<callback>)
```

`callback` is a function of type `function (err, protocols)` where `err` is an error object that gets passed if something wrong happend and `protocols` is an array of the supported protocols in the other end.

## Other implementations of multistream

- [go-multistream](https://github.com/whyrusleeping/go-multistream)
