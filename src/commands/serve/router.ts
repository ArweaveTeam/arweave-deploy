import { IncomingMessage, ServerResponse, OutgoingHttpHeaders } from 'http';
import { Session } from '.';
import { onArqlRequest } from './arql';
import { onProxyRequest } from './proxy';
import { postTransactionHandler, serveDataHandler, getTxStatusHandler, getTransactionHandler } from './transactions';
export interface Response {
    status: number;
    body: string | Buffer;
    headers: OutgoingHttpHeaders;
}
export type routeFunction = (request: IncomingMessage, session?: Session) => Promise<Response>;

export function matchRoute(path: string): routeFunction {
    // if (path.match(/^\/app$/i)) {
    //     return this.appServeHandler;
    // }

    // if (path.match(/^\/build$/i)) {
    //     return this.onBuildUIRequest
    // }

    // if (path.match(/^\/favicon.ico$/i)) {
    //     return this.onFaviconRequest
    // }

    // Post new transaction
    // /tx/[:id]
    if (path.match(/^\/tx$/i)) {
        return postTransactionHandler;
    }

    // Get transaction object by id
    // /tx/[:id]
    if (path.match(/^\/tx\/([a-z0-9-_]+)$/i)) {
        return getTransactionHandler;
    }

    // Magic endpoint to serve data
    // /[:txid]
    if (path.match(/^\/([a-z0-9-_]{43})$/i)) {
        return serveDataHandler;
    }

    // Get a transaction status by id
    // /tx/[:id]/status
    if (path.match(/^\/tx\/[a-z0-9-_]{43}\/status$/i)) {
        return getTxStatusHandler;
    }

    // Get a subfield from a transaction
    // // /tx/[:id]/[:field]
    // if (path.match(/^\/tx\/([a-z0-9-_]+)[a-z]+$/i)) {
    // }

    // /arql
    if (path.match(/^\/arql$/i)) {
        return onArqlRequest;
    }

    return onProxyRequest;
}
