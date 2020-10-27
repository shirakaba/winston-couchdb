winston-couchdb
===============

A full featured CouchDB transport for winston with some winston 3 cababilities.

[![Build Status](https://travis-ci.org/indexzero/winston-couchdb.png)](https://travis-ci.org/indexzero/winston-couchdb)

## Install

```bash
npm i --save winston winston-couchdb
```

## Setup

```js
// 1. Import winston and winston-couchdb
const winston = require('winston')
  , WinstonCouchdb = require('winston-couchdb')

// 2. With Winston3, set up the logger with createLogger.
// The transports property can remain empty, but has data to show how it's used.
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    //
    // - Write all logs with level `error` and below to `error.log`
    // - Write all logs with level `info` and below to `combined.log`
    //
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// 3. Register the custom transport
WinstonCouchdb.registerTransport(winston);

// 4. Add the WinstonCouchdb transporter to the logger.
logger.add(new WinstonCouchdb({
  host: 'localhost'
  , port: 5984
  // optional
  , auth: {username: 'user', password: 'pass'}
  , secure: false
  , level: 'info'
}));

// 5. Start logging
logger.log('Hello world', ()=>{});
logger.log('info', 'hello world with custom level', {}, () => {});

```
