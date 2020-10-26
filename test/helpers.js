/*
 * helpers.js: Test helpers for winston
 *
 * (C) 2010 Charlie Robbins
 * MIT LICENSE
 *
 */
/**
 * Originally ported from https://github.com/winstonjs/winston/tree/0.6.2/test
 */

var assert = require('assert'),
    fs = require('fs'),
    path = require('path'),
    spawn = require('child_process').spawn,
    util = require('util'),
    vows = require('vows'),
    winston = require('winston');    
    
var helpers = exports;

helpers.size = (obj) => {
  var size = 0, key;
  for (key in obj) {
    if (obj.hasOwnProperty(key)) {
      size++;
    }
  }
  
  return size;
};

helpers.tryUnlink = (file) => {
  try { fs.unlinkSync(file) }
  catch (ex) { }
};

helpers.assertDateInfo = (info) => {
  assert.isNumber(Date.parse(info));
};

helpers.assertProcessInfo = (info) => {
  assert.isNumber(info.pid);
  assert.isNumber(info.uid);
  assert.isNumber(info.gid);
  assert.isString(info.cwd);
  assert.isString(info.execPath);
  assert.isString(info.version);
  assert.isArray(info.argv);
  assert.isObject(info.memoryUsage);
};

helpers.assertOsInfo = (info) => {
  assert.isArray(info.loadavg);
  assert.isNumber(info.uptime);
};

helpers.assertTrace = (trace) => {
  trace.forEach((site) => {
    assert.isTrue(!site.column || typeof site.column === 'number');
    assert.isTrue(!site.line || typeof site.line === 'number');
    assert.isTrue(!site.file || typeof site.file === 'string');
    assert.isTrue(!site.method || typeof site.method === 'string');
    assert.isTrue(!site.function || typeof site.function === 'string');
    assert.isTrue(typeof site.native === 'boolean');
  });
};

helpers.assertLogger = (logger, level) => {
  assert.instanceOf(logger, winston.transports.Console);
  assert.isFunction(logger.log);
  assert.isFunction(logger.add);
  assert.isFunction(logger.remove);
  assert.equal(logger.level, level || "info");
  Object.keys(logger.levels).forEach((method) => {
    assert.isFunction(logger[method]);
  });
};

helpers.assertConsole = (transport) => {
  assert.instanceOf(transport, winston.transports.Console);
  assert.isFunction(transport.log);
};

helpers.assertFile = (transport) => {
  assert.instanceOf(transport, winston.transports.File);
  assert.isFunction(transport.log);
}

helpers.assertWebhook = (transport) => {
  assert.instanceOf(transport, winston.transports.Webhook);
  assert.isFunction(transport.log);
};

helpers.assertCouchdb = (transport) => {
  assert.instanceOf(transport, winston.transports.Couchdb);
  assert.isFunction(transport.log);
};

helpers.assertHandleExceptions = (options) => {
  return {
    topic: () => {
      const that = this,
          child = spawn('node', [options.script]);

      helpers.tryUnlink(options.logfile);
      child.on('exit', () => {
        fs.readFile(options.logfile, that.callback);
      });
    },
    "should save the error information to the specified file": (err, data) => {
      assert.isTrue(!err);
      data = JSON.parse(data);

      assert.isObject(data);
      helpers.assertProcessInfo(data.process);
      helpers.assertOsInfo(data.os);
      helpers.assertTrace(data.trace);
    }
  }
}

helpers.testNpmLevels = (transport, assertMsg, assertFn) => {
  return helpers.testLevels(winston.config.npm.levels, transport, assertMsg, assertFn);
};

helpers.testSyslogLevels = (transport, assertMsg, assertFn) => {
  return helpers.testLevels(winston.config.syslog.levels, transport, assertMsg, assertFn);
};

helpers.testLevels = (levels, transport, assertMsg, assertFn) => {
  const tests = {};
  
  Object.keys(levels).forEach((level) => {
    const test = {
      topic: () => {
        transport.log(level, 'test message', {}, this.callback.bind(this, null));
      }
    };
   
    test[assertMsg] = assertFn;
    tests['with the ' + level + ' level'] = test;
  });
  
  const metadatatest = {
    topic: () => {
      transport.log('info', 'test message', { metadata: true }, this.callback.bind(this, null));
    }
  };
  
  metadatatest[assertMsg] = assertFn;
  tests['when passed metadata'] = metadatatest;

  const primmetadatatest = {
    topic: () => {
      transport.log('info', 'test message', 'metadata', this.callback.bind(this, null));
    }
  };

  primmetadatatest[assertMsg] = assertFn;
  tests['when passed primitive metadata'] = primmetadatatest;

  const circmetadata = { }; 
  circmetadata['metadata'] = circmetadata;

  const circmetadatatest = {
    topic: () => {
      transport.log('info', 'test message', circmetadata, this.callback.bind(this, null));
    }
  };

  circmetadatatest[assertMsg] = assertFn;
  tests['when passed circular metadata'] = circmetadatatest;

  return tests;
};
