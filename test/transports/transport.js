/*
 * transport.js: Tests for instances of the Webhook transport
 * 
 * (C) 2011 Marak Squires
 * MIT LICENSE
 */
/**
 * Originally ported from https://github.com/winstonjs/winston/tree/0.6.2/test
 */

const assert = require('assert'),
    winston = require('winston'),
    helpers = require('../helpers'),
    winstronTransports = require('winston/lib/winston/transports');

module.exports = (transport, options) => {
  const logger = transport instanceof winstronTransports.Console 
    ? transport 
    : winston.createLogger({
      format: winston.format.combine(
        winston.format.json()
      ),
      transports: [transport]
  });

  // hack to fix transports that don't log
  // any unit of time smaller than seconds
  const common = require('winston/lib/winston/common');
  common.timestamp = () => {
    return new Date().toISOString();
  };

  const transport = logger.transports[logger._names[0]];

  const out = {
    'topic': logger,
    'when passed valid options': {
      'should have the proper methods defined': () => {
        switch (transport.name) {
          case 'console':
            helpers.assertConsole(transport);
            break;
          case 'file':
            helpers.assertFile(transport);
            break;
          case 'webhook':
            helpers.assertWebhook(transport);
            break;
          case 'couchdb':
            helpers.assertCouchdb(transport);
            break;
        }
        assert.isFunction(transport.log);
      }
    },
    'the log() method': helpers.testNpmLevels(transport,
      'should respond with true', (ign, err, logged) => {
        assert.isNull(err);
        assert.isNotNull(logged);
      }
    ),
    'the stream() method': {
      'using no options': {
        'topic': () => {
          if (!transport.stream) return;

          logger.log('info', 'hello world', {});

          let cb = this.callback,
              j = 10,
              i = 10,
              results = [],
              stream = logger.stream();

          stream.on('log', (log) => {
            results.push(log);
            results.stream = stream;
            if (!--j) cb(null, results);
          });

          stream.on('error', () => {});

          while (i--) logger.log('info', 'hello world ' + i, {});
        },
        'should stream logs': (err, results) => {
          if (!transport.stream) return;
          assert.isNull(err);
          results.forEach((log) => {
            assert.ok(log.message.indexOf('hello world') === 0
                      || log.message.indexOf('test message') === 0);
          });
          results.stream.destroy();
        }
      },
      'using the `start` option': {
        'topic': () => {
          if (!transport.stream) return;

          let cb = this.callback,
              stream = logger.stream({ start: 0 });

          stream.on('log', (log) => {
            log.stream = stream;
            if (cb) cb(null, log);
            cb = null;
          });
        },
        'should stream logs': (err, log) => {
          if (!transport.stream) return;
          assert.isNull(err);
          assert.isNotNull(log.message);
          log.stream.destroy();
        }
      }
    },
    'after the logs have flushed': {
      'topic': () => {
        setTimeout(this.callback, 1000);
      },
      'the query() method': {
        'using basic querying': {
          'topic': () => {
            if (!transport.query) return;
            const cb = this.callback;
            logger.log('info', 'hello world', {}, () => {
              logger.query(cb);
            });
          },
          'should return matching results': (err, results) => {
            if (!transport.query) return;
            assert.isNull(err);
            results = results[transport.name];
            while (!Array.isArray(results)) {
              results = results[Object.keys(results).pop()];
            }
            var log = results.pop();
            assert.ok(log.message.indexOf('hello world') === 0
                      || log.message.indexOf('test message') === 0);
          }
        },
        'using the `rows` option': {
          'topic': () => {
            if (!transport.query) return;
            const cb = this.callback;
            logger.log('info', 'hello world', {}, () => {
              logger.query({ rows: 1 }, cb);
            });
          },
          'should return one result': (err, results) => {
            if (!transport.query) return;
            assert.isNull(err);
            results = results[transport.name];
            while (!Array.isArray(results)) {
              results = results[Object.keys(results).pop()];
            }
            assert.strictEqual(results.length, 1);
          }
        },
        'using `fields` and `order` option': {
          'topic': () => {
            if (!transport.query) return;
            const cb = this.callback;
            logger.log('info', 'hello world', {}, () => {
              logger.query({ order: 'asc', fields: ['timestamp'] }, cb);
            });
          },
          'should return matching results': (err, results) => {
            if (!transport.query) return;
            assert.isNull(err);
            results = results[transport.name];
            while (!Array.isArray(results)) {
              results = results[Object.keys(results).pop()];
            }
            assert.strictEqual(Object.keys(results[0]).length, 1);
            assert.ok(new Date(results.shift().timestamp) < new Date(results.pop().timestamp));
          }
        },
        'using the `from` and `until` option': {
          'topic': () => {
            if (!transport.query) return;
            const cb = this.callback;
            const start = new Date - 100 * 1000;
            const end = new Date + 100 * 1000;
            logger.query({ from: start, until: end }, cb);
          },
          'should return matching results': (err, results) => {
            if (!transport.query) return;
            assert.isNull(err);
            results = results[transport.name];
            while (!Array.isArray(results)) {
              results = results[Object.keys(results).pop()];
            }
            assert.ok(results.length >= 1);
          }
        },
        'using a bad `from` and `until` option': {
          'topic': () => {
            if (!transport.query) return;
            const cb = this.callback;
            logger.log('info', 'bad from and until', {}, () => {
              const now = new Date + 1000000;
              logger.query({ from: now, until: now }, cb);
            });
          },
          'should return no results': (err, results) => {
            if (!transport.query) return;
            assert.isNull(err);
            results = results[transport.name];
            while (!Array.isArray(results)) {
              results = results[Object.keys(results).pop()];
            }
            results = [results.filter((log) => {
              return log.message === 'bad from and until';
            }).pop()];
            assert.isUndefined(results[0]);
          }
        }
      }
    }
  };

  return out;
}
