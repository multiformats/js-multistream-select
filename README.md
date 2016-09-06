# js-multistream

[![](https://img.shields.io/badge/made%20by-Protocol%20Labs-blue.svg?style=flat-square)](http://ipn.io)
[![](https://img.shields.io/badge/project-multiformats-blue.svg?style=flat-square)](http://github.com/multiformats/multiformats)
[![](https://img.shields.io/badge/project-IPFS-blue.svg?style=flat-square)](http://ipfs.io/)
[![](https://img.shields.io/badge/freenode-%23ipfs-blue.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23ipfs)
[![Coverage Status](https://coveralls.io/repos/github/diasdavid/js-multistream/badge.svg?branch=master)](https://coveralls.io/github/diasdavid/js-multistream?branch=master)
[![Travis CI](https://travis-ci.org/diasdavid/js-multistream.svg?branch=master)](https://travis-ci.org/diasdavid/js-multistream)
[![Circle CI](https://circleci.com/gh/diasdavid/js-multistream.svg?style=svg)](https://circleci.com/gh/diasdavid/js-multistream)
[![Dependency Status](https://david-dm.org/diasdavid/js-multistream.svg?style=flat-square)](https://david-dm.org/diasdavid/js-multistream) [![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/feross/standard)

> JavaScript implementation of [multistream](https://github.com/multiformats/multistream).

## Table of Contents

- [Background](#background)
  - [What is multistream](#what-is-multistream)
    - [Normal mode](#normal-mode)
- [Install](#install)
  - [npm](#npm)
  - [Setup](#setup)
    - [Node.js](#nodejs)
    - [Browser: Browserify, Webpack, other bundlers](#browser-browserify-webpack-other-bundlers)
    - [Browser: `<script>` Tag](#browser-script-tag)
- [Usage](#usage)
  - [Attach multistream to a connection (socket)](#attach-multistream-to-a-connection-socket)
  - [Handling a protocol](#handling-a-protocol)
  - [Selecting a protocol](#selecting-a-protocol)
  - [Listing the available protocols](#listing-the-available-protocols)
- [Maintainers](#maintainers)
- [Contribute](#contribute)
- [License](#license)

## Background

### What is multistream

tl;dr: multistream is protocol multiplexing per connection/stream. [Full spec here](https://github.com/jbenet/multistream)

multistream-select has currently one mode of operation:

- `normal` - handshake on a protocol on a given stream

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

## Install

### npm

```sh
> npm i multistream-select
```

### Setup

#### Node.js

```js
const multistream = require('multistream-select')
```

#### Browser: Browserify, Webpack, other bundlers

The code published to npm that gets loaded on require is in fact a ES5
transpiled version with the right shims added. This means that you can require
it and use with your favourite bundler without having to adjust asset management
process.

```js
const multistream = require('multistream-select')
```

#### Browser: `<script>` Tag

Loading this module through a script tag will make the `MultistreamSelect` obj available in
the global namespace.

```html
<script src="https://npmcdn.com/multistream-select/dist/index.min.js"></script>
<!-- OR -->
<script src="https://npmcdn.com/multistream-select/dist/index.js"></script>
```

## Usage

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

### This module uses `pull-streams`

We expose a streaming interface based on `pull-streams`, rather then on the Node.js core streams implementation (aka Node.js streams). `pull-streams` offers us a better mechanism for error handling and flow control guarantees. If you would like to know more about why we did this, see the discussion at this [issue](https://github.com/ipfs/js-ipfs/issues/362).

You can learn more about pull-streams at:

- [The history of Node.js streams, nodebp April 2014](https://www.youtube.com/watch?v=g5ewQEuXjsQ)
- [The history of streams, 2016](http://dominictarr.com/post/145135293917/history-of-streams)
- [pull-streams, the simple streaming primitive](http://dominictarr.com/post/149248845122/pull-streams-pull-streams-are-a-very-simple)
- [pull-streams documentation](https://pull-stream.github.io/)

#### Converting `pull-streams` to Node.js Streams

If you are a Node.js streams user, you can convert a pull-stream to a Node.js stream using the module [`pull-stream-to-stream`](https://github.com/dominictarr/pull-stream-to-stream), giving you an instance of a Node.js stream that is linked to the pull-stream. For example:

```js
const pullToStream = require('pull-stream-to-stream')

const nodeStreamInstance = pullToStream(pullStreamInstance)
// nodeStreamInstance is an instance of a Node.js Stream
```

To learn more about this utility, visit https://pull-stream.github.io/#pull-stream-to-stream.




## Maintainers

Captain: [@diasdavid](https://github.com/diasdavid).

## Contribute

Contributions welcome. Please check out [the issues](https://github.com/multiformats/js-multistream/issues).

Check out our [contributing document](https://github.com/multiformats/multiformats/blob/master/contributing.md) for more information on how we work, and about contributing in general. Please be aware that all interactions related to multiformats are subject to the IPFS [Code of Conduct](https://github.com/ipfs/community/blob/master/code-of-conduct.md).

Small note: If editing the Readme, please conform to the [standard-readme](https://github.com/RichardLitt/standard-readme) specification.

## License

[MIT](LICENSE) © David Dias
