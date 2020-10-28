// Type definitions for winston-couchdb
// Project: https://github.com/winstonjs/winston-couchdb
// Definitions by: Kemaric <https://github.com/kemaric>
// Definitions: https://github.com/kemaric/winston-couchdb/tree/feature/use-nano-vs-cradle

/// <reference types="node" />

import { Stream, TransportStreamOptions } from "winston-transport";
import * as TransportStream from "winston-transport";
import { DocumentScope } from "nano";
export interface IAuthOptions {

}

export interface MessageBody {
    /**
     * text for the log message
     */
    message: string;
    /**
     * level of the log
     */
    level: string;
    /**
     * Any additional meta information to send with the log
     */
    meta?: any;
}

export interface ICouchTransportStreamOptions extends TransportStreamOptions {
    /**
     * The name of this transport
     */
    name?: string;
    /**
     * The couchdb database this transport will connect and send logs to.
     */
    db?: string;
    /**
     * The couchdb database this transport will connect and send logs to.
     *          
     * @deprecated
     */
    database?: string;
    /**
     * Host name of the couchdb instance
     */
    host: string;
    /**
     * Port for the couchdb instance
     */
    port: number;
    auth?: IAuthOptions;
    /**
     * If we are using https
     */
    secure?: boolean;
    /**
     * If we are using https
     * @deprecated
     */
    ssl?: boolean;
    /**
     * Admin Username for authenticating to CouchDb
     */
    user?: string;
    /**
     * Admin password for authenticating to CouchDb
     */
    pass?: string;
}

/**
 * Compatiability function for Winston3. Clone funtion doesn't exist there so making one here which does
 * what Winston3 does.
 * @param {*} source 
 */
export function clone(source: any): any;

/**
 * Transport for logging to a CouchDb Database.
 * @type {Stream}
 * @extends {TransportStream}
 */
export class Couchdb extends TransportStream {

    get client(): DocumentScope<any>;

    /**
     * @constructor
     * Constructor function for the Console transport object responsible
     * for making arbitrary HTTP requests whenever log messages and metadata
     * are received.
     * @param {ICouchTransportStreamOptions} options 
     */
    constructor(options?: ICouchTransportStreamOptions);

    /**
     * Core logging method exposed to Winston. Metadata is optional.
     * @param {MessageBody} msg Message to log with meta and message
     * @param {function} callback Continuation to respond to when complete.
     */
    public log(msg: MessageBody, callback: Function): any;

    /**
     * Legacy core logging method exposed to Winston. Metadata is optional.
     * @param {string} level Level at which to log the message.
     * @param {string} msg Message to log
     * @param {Object} meta **Optional** Additional metadata to attach
     * @param {function} callback Continuation to respond to when complete.
     */
    legacylog(level, msg, meta, callback): any;

    /**
     * Query the transport. Options object is optional.
     * @param {Object} options Loggly-like query options for this instance.
     * @param {function} callback Continuation to respond to when complete.
     */
    query(options: Object | Function, callback?: Function): any;

    /**
     * Returns a log stream for this transport. Options object is optional.
     * @param {Object} options Stream options for this instance.
     */
    stream(options: Object): Stream;

    /**
     * Registers the transport to winston
     * @param _winston the winston module to register the transport to
     */
    static registerTransport(_winston?: typeof winston): void;

    /**
     * Ensure the `byTimestamp` view. This is necessary for the `from` and `until` options.
     * @param {function} callback Continuation to respond to when complete.
     */
    private _ensureView(callback?: Function): any;

    /**
    * Ensure the existence of a Nano client.
    */
    private _ensureClient(): DocumentScope<any>;


}