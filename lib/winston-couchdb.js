/* jshint camelcase: false */
'use strict';
/*
 * Couchdb.js: Transport for logging to Couchdb
 *
 * (C) 2011 Max Ogden
 * MIT LICENSE
 *
 */

const winston = require('winston'),
    common = require('winston/lib/winston/common'),
    util = require('util'),
    cycle = require('cycle'),
    Stream = require('stream').Stream,
    TransportStream = require('winston-transport');
;

/**
 * Compatiability function for Winston3. Clone funtion doesn't exist there so making one here which does
 * what Winston3 does.
 * @param {*} source 
 */
const clone = (source) => {
  return Object.assign({}, source)
}
/**
 * Add our compatibility clone function if not present in winston
 */
if(!("clone" in common)){
  common.clone =  clone;
}

/**
 * Transport for logging to a CouchDb Database.
 * @type {Stream}
 * @extends {TransportStream}
 */
module.exports = class Couchdb extends TransportStream {
  /**
   * ### function Couchdb (options)
   * #### @options {Object} Options for this instance.
   * Constructor function for the Console transport object responsible
   * for making arbitrary HTTP requests whenever log messages and metadata
   * are received.
   */
  constructor(options = {}) {
    super(options);
    this.options = options;

    // Expose the name of this Transport on the prototype.
    this.name   = options.name   || 'couchdb';
    this.db     = options.db     || options.database || 'winston';
    this.host   = !!(/^https?:/.test(options.host)) ? 
      options.host
      : `http://${options.host || 'http://localhost'}`;
    this.port   = options.port   || 5984;
    this.url    = `${this.host}:${this.port}`;
    this.auth   = options.auth;
    this.secure = /^https:/i.test(this.host) || !!(options.ssl || options.secure);

    // Legacy
    if (options.user) {
      this.auth = {
        username: options.user,
        password: options.pass || ''
      };
    }
  };

  /**
   * Core logging method exposed to Winston. Metadata is optional.
   * @param {string} level Level at which to log the message.
   * @param {string} msg Message to log
   * @param {Object} meta **Optional** Additional metadata to attach
   * @param {function} callback Continuation to respond to when complete.
   */
  log(level, msg, meta, callback) {
    if (this.silent) {
      return callback && callback(null, true);
    }
    level = level || 'info';

    //
    // Write logging event to the outgoing request body
    //
    const params = common.clone(cycle.decycle(meta)) || {};
    // RFC3339/ISO8601 format instead of common.timestamp()
    params.timestamp = new Date();
    params.message = msg;
    params.level = level || 'info';

    // Perform logging request
    this.client.insert({
      resource: 'log',
      params: params
    }, (err) =>  {
      //
      // Propagate the `error` back up to the `Logger` that this
      // instance belongs to.
      //
      if (err) {
        this.emit('error', err);
        if (callback) callback(err, false);
        return;
      }

      // TODO: emit 'logged' correctly,
      // keep track of pending logs.
      setImmediate(() => {
        this.emit('logged', level, msg);
      });  

      if (callback) callback(null, true);
    });
  };

  /**
   * Ensure the `byTimestamp` view. This is necessary for the `from` and `until` options.
   * @param {function} callback Continuation to respond to when complete.
   */
  _ensureView(callback = (() => {})) {
    if (this._ensuredView) return callback();

    this._ensuredView = true;

    const checkDB = () => {
      this.client.info((err, exists) => {
        if (err) return callback(err);
        return !exists
          ? this.client.create(checkView)
          : checkView();
      });
    }

    const checkView = (err) => {
      if (err) return callback(err);
      this.client.get('_design/Logs', (err, result) => {
        return !err && result
          ? callback()
          : save();
      });
    }

    const save = (err) => {
      if (err) return callback(err);
      // If we were to ignore `from` and `until`,
      // this wouldn't be necessary. We could just
      // use .all() or _all_docs.
      this.client.insert({
        _id: '_design/Logs',
        views: {
          byTimestamp: {
            map: function (doc) {
              if (doc.resource === 'log') {
                /* global emit */
                emit(doc.params.timestamp, doc);
              }
            }.toString()
          }
        }
      }, callback);
    }

    checkDB();
  };

  /**
   * Ensure the existence of a Nano client.
   */
  _ensureClient() {
    if (this._client) return this._client;
    const Nano = require('nano');
    const config = {
      url: this.url,
      requestDefaults: {
        host: this.host,
        port: this.port,
        auth: this.auth,
        strictSSL: this.secure
      },
      port: this.port,
      cookie: this.cookie
    };
    this._client = Nano(config).use(this.db);
    this._ensureView();
    return this._client;
  };
    
  get client() {
    return this._ensureClient();
  }

  /**
   * Query the transport. Options object is optional.
   * @param {Object} options Loggly-like query options for this instance.
   * @param {function} callback Continuation to respond to when complete.
   */
  query(options, callback) {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }

    const query = {};

    options = this.normalizeQuery(options);

    if (!this._ensuredView) {
      return this._ensureView((err) => {
        if (err) return callback(err);
        this.query(options, callback);
      });
    }

    if (options.rows) query.limit = options.rows;
    if (options.start) query.skip = options.start;
    if (options.order === 'desc') {
      query.descending = true;
      if (options.from) query.endkey = options.from.toISOString();
      if (options.until) query.startkey = options.until.toISOString();
    } else {
      if (options.from) query.startkey = options.from.toISOString();
      if (options.until) query.endkey = options.until.toISOString();
    }

    this.client.view('_design/Logs', 'byTimestamp', query, (err, docs) => {
      if (err) return callback(err);

      docs = docs.map((doc) => {
        doc = doc.params;
        return doc;
      });

      if (options.fields) {
        docs.forEach((doc) => {
          Object.keys(doc).forEach((key) => {
            if (!~options.fields.indexOf(key)) {
              delete doc[key];
            }
          });
        });
      }

      callback(null, docs);
    });
  };

  /**
   * Returns a log stream for this transport. Options object is optional.
   * @param {Object} options Stream options for this instance.
   */
  stream(options) {
    const stream = new Stream();
    let feed;

    options = options || {},

    stream.destroy = () => {
      this.destroyed = true;
      try {
        feed.stop();
      } catch (e) {
        ;
      }
    };

    this.client.info((err, info) => {
      if (err) return stream.emit('error', err);

      if (options.start === -1) {
        delete options.start;
      }

      if (options.start == null) {
        options.start = info.update_seq || 0;
      }

      // Possibly allow some kind
      // of basic querying here?
      feed = this.client.follow({
        include_docs: true,
        feed: 'continuous',
        style: 'main_only',
        descending: false,
        since: options.start
      });

      feed.on('change', (change) => {
        if (!change.deleted && change.doc && change.doc.params) {
          stream.emit('log', change.doc.params);
        }
      });

      feed.on('error', (err) => {
        stream.emit('error', err);
      });
    });

    return stream;
  };

  /**
   * Registers the transport to winston
   */
  static registerTransport() {
    /**
     * TODO: add property description.
     * @type {Couchdb}
     */
    Object.defineProperty(winston.transports, 'Couchdb', {
      configurable: true,
      enumerable: true,
      get() {
        return Couchdb;
      }
    });
  }

}
