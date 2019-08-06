import { IncomingMessage, ServerResponse, OutgoingHttpHeaders } from 'http';
import { Session } from '.';
import { onArqlRequest } from './arql';
import { onProxyRequest } from './proxy';
import { postTransactionHandler, serveDataHandler, getTxStatusHandler, getTransactionHandler } from './transactions';
import { getBalanceHandler } from './wallets';
export interface Response {
    status: number;
    body: string | Buffer;
    headers: OutgoingHttpHeaders;
}
export type routeFunction = (request: IncomingMessage, session?: Session) => Promise<Response>;

async function empty(request: IncomingMessage): Promise<Response> {
    return {
        status: 200,
        body: '',
        headers: {},
    };
}

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

    // Get a wallet balance
    // /tx/[:id]/status
    if (path.match(/^\/wallet\/[a-z0-9-_]{43}\/balance$/i)) {
        return getBalanceHandler;
    }

    // Get a subfield from a transaction
    // // /tx/[:id]/[:field]
    // if (path.match(/^\/tx\/([a-z0-9-_]+)[a-z]+$/i)) {
    // }

    // /arql
    if (path.match(/^\/arql$/i)) {
        return onArqlRequest;
    }

    // Proxy all other requests to the network if we don't have a match.

    return empty;
}
