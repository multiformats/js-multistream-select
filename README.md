js-multistream
================

[![](https://img.shields.io/badge/made%20by-Protocol%20Labs-blue.svg?style=flat-square)](http://ipn.io)
[[![](https://img.shields.io/badge/freenode-%23ipfs-blue.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23ipfs)
[![Build Status](https://travis-ci.org/diasdavid/js-multistream.svg?style=flat-square)](https://travis-ci.org/diasdavid/js-multistream)](https://travis-ci.org/diasdavid/js-multistream/)
![](https://img.shields.io/badge/coverage-85-yellow.svg?style=flat-square)
[![Dependency Status](https://david-dm.org/diasdavid/js-multistream.svg?style=flat-square)](https://david-dm.org/diasdavid/js-multistream)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/feross/standard)

> JavaScript implementation of the multistream, as described in https://github.com/jbenet/multistream

**Note:** On npm, `js-multistream` can be found as [`multistream-select`](https://www.npmjs.com/package/multistream-select)

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
