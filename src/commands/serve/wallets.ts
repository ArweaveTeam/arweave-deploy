import { IncomingMessage } from 'http';
import { Response } from './router';
import { getWallet, hasWallet } from './store';

export async function getBalanceHandler(request: IncomingMessage): Promise<Response> {
    const address = extractAddress(request.url);

    if (await hasWallet(address)) {
        return {
            status: 200,
            body: (await getWallet(address)).balance,
            headers: {},
        };
    }

    return {
        status: 200,
        body: '0',
        headers: {},
    };
}

export async function getLastTxHandler(request: IncomingMessage): Promise<Response> {
    const address = extractAddress(request.url);

    if (await hasWallet(address)) {
        return {
            status: 200,
            body: (await getWallet(address)).last_tx,
            headers: {},
        };
    }

    return {
        status: 200,
        body: '0',
        headers: {},
    };
}

function extractAddress(string: string): string {
    const addressRegex = /([a-z0-9-_]{43})/i;
    return string.match(addressRegex)[1];
}
