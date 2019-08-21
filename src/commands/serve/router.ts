import { IncomingMessage, ServerResponse, OutgoingHttpHeaders } from 'http';
import { Session } from '.';
import { arqlRequestHandler } from './arql';
import { proxyRequestHandler } from './proxy';
import {
    postTransactionHandler,
    serveDataHandler,
    getTxStatusHandler,
    getTransactionHandler,
    getTransactionFieldHandler,
} from './transactions';
import { getBalanceHandler, getLastTxHandler } from './wallets';
import { resolve } from 'path';
import { File } from '../../lib/file';
import { wait } from './helpers';
import { hasTransaction } from './store';
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

export async function httpRequestHandler(
    httpRequest: IncomingMessage,
    httpResponse: ServerResponse,
    session: Session,
): Promise<void> {
    try {
        session.log(`[request] ${httpRequest.url}`);

        const handler = await getRouteHandler(httpRequest.url);

        if (!handler) {
            throw new Error(`No handler for route: ${httpRequest.url}`);
        }

        const handlerResponse = await handler.apply(this, [httpRequest, session]);

        httpResponse.writeHead(handlerResponse.status, handlerResponse.headers);
        httpResponse.write(handlerResponse.body);
        httpResponse.end();
    } catch (error) {
        session.log(`[request] ERROR: ${error}`);
    }
}

async function appServeHandler(request: IncomingMessage, { log, build }: Session): Promise<Response> {
    try {
        // If there's not a valid build yet then simply wait until there is
        while (!build) {
            await wait(100);
        }

        return {
            status: 200,
            headers: {
                'Content-Type': 'text/html',
            },
            body: build.output,
        };
    } catch (error) {
        log(`Failed to serve app`);
        log(error);
    }
}

async function faviconRequestHandler(request: IncomingMessage): Promise<Response> {
    const assetsDir = resolve('./src/assets/');
    const iconFile = new File('favicon.ico', assetsDir);
    return {
        status: 200,
        headers: {
            'Content-Type': await iconFile.getType(),
        },
        body: await iconFile.read(),
    };
}

async function getRouteHandler(path: string): Promise<routeFunction> {
    const hash = extractHash(path);

    if (path.match(/^\/app$/i)) {
        return appServeHandler;
    }

    if (path.match(/^\/favicon.ico$/i)) {
        return faviconRequestHandler;
    }

    // Post new transaction
    // /tx/[:id]
    if (path.match(/^\/tx$/i)) {
        return postTransactionHandler;
    }

    // Get transaction object by id
    // /tx/[:id]
    if (path.match(/^\/tx\/([a-z0-9-_]+)$/i)) {
        if (await hasTransaction(hash)) {
            return getTransactionHandler;
        }
    }

    // Magic endpoint to serve data
    // /[:txid]
    if (path.match(/^\/([a-z0-9-_]{43})$/i)) {
        if (await hasTransaction(hash)) {
            return serveDataHandler;
        }
    }

    // Get a transaction status by id
    // /tx/[:id]/status
    if (path.match(/^\/tx\/[a-z0-9-_]{43}\/status$/i)) {
        if (await hasTransaction(hash)) {
            return getTxStatusHandler;
        }
    }

    // Get a wallet balance
    // /tx/[:id]/status
    if (path.match(/^\/wallet\/[a-z0-9-_]{43}\/balance$/i)) {
        return getBalanceHandler;
    }

    // Get a wallet balance
    // /tx/[:id]/status
    if (path.match(/^\/wallet\/[a-z0-9-_]{43}\/last_tx$/i)) {
        return getLastTxHandler;
    }

    // Get a subfield from a transaction
    // /tx/[:id]/[:field]
    if (path.match(/^\/tx\/([a-z0-9-_]{43})\/[a-z0-9]+$/i)) {
        if (await hasTransaction(hash)) {
            return getTransactionFieldHandler;
        }
    }

    // /arql
    if (path.match(/^\/arql$/i)) {
        return arqlRequestHandler;
    }

    // Proxy all other requests to the network if we don't have a match.

    return proxyRequestHandler;
}

function extractHash(string: string): string | null {
    const hashRegex = /([a-z0-9-_]{43})/i;
    const match = string.match(hashRegex);
    return match ? match[1] : null;
}
