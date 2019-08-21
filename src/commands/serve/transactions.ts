import { IncomingMessage } from 'http';
import { Response } from './router';
import Transaction from 'arweave/node/lib/transaction';
import { saveTransaction, getTransactionMetadata, getTransaction, hasTransaction } from './store';
import { streamToJson } from './helpers';
import { Session } from '.';
import { proxyRequestHandler } from './proxy';

export async function postTransactionHandler(request: IncomingMessage, { arweave }: Session): Promise<Response> {
    try {
        const body = await streamToJson(request);

        const transaction = new Transaction(body);

        if (await hasTransaction(transaction.id)) {
            return {
                status: 208,
                body: 'Transaction already processed.',
                headers: {},
            };
        }

        try {
            if (!(await arweave.transactions.verify(transaction))) {
                throw new Error('Failed to verify transaction signature');
            }
        } catch (error) {
            console.error(error);
            return {
                status: 400,
                body: 'Transaction verification failed.',
                headers: {},
            };
        }

        await saveTransaction(transaction);

        return {
            status: 200,
            body: '',
            headers: {},
        };
    } catch (error) {
        console.error(error);
        return {
            status: 400,
            body: '',
            headers: {},
        };
    }
}

export async function getTransactionHandler(request: IncomingMessage): Promise<Response> {
    try {
        const id = extractTxId(request.url);
        const tx = await getTransaction(id);

        return {
            status: 200,
            body: JSON.stringify(tx),
            headers: {
                'Content-Type': 'application/json',
            },
        };
    } catch (error) {
        console.error(error);
        return {
            status: 404,
            body: '',
            headers: {},
        };
    }
}

export async function getTransactionFieldHandler(request: IncomingMessage): Promise<Response> {
    try {
        const id = extractTxId(request.url);
        const field = getTxFieldName(request.url);
        const tx = await getTransaction(id);

        if (!tx.hasOwnProperty(field)) {
            return {
                status: 400,
                body: '',
                headers: {},
            };
        }

        return {
            status: 200,
            body: tx[field],
            headers: {},
        };
    } catch (error) {
        console.error(error);
        return {
            status: 404,
            body: '',
            headers: {},
        };
    }
}

export async function getTxStatusHandler(request: IncomingMessage, { arweave }: Session): Promise<Response> {
    try {
        const id = extractTxId(request.url);
        const networkInfo = await arweave.network.getInfo();
        const meta = await getTransactionMetadata(id);
        if (meta) {
            return {
                status: 200,
                body: JSON.stringify({
                    block_indep_hash: meta.block.id,
                    block_height: meta.block.height,
                    number_of_confirmations: networkInfo.height - meta.block.height,
                }),
                headers: {
                    'Content-Type': 'application/json',
                },
            };
        }
    } catch (error) {
        console.error(error);
        return {
            status: 500,
            body: '',
            headers: {},
        };
    }
}

export async function serveDataHandler(request: IncomingMessage, session: Session): Promise<Response> {
    try {
        const id = extractTxId(request.url);

        if (hasTransaction(id)) {
            const tx = await getTransaction(id);
            const meta = await getTransactionMetadata(id);

            return {
                status: 200,
                body: Buffer.from(tx.get('data', { decode: true, string: false })),
                headers: {
                    'Content-Type': meta.tags['Content-Type'],
                },
            };
        } else {
            return proxyRequestHandler(request, session);
        }
    } catch (error) {
        console.error(error);
        return {
            status: 404,
            body: '',
            headers: {},
        };
    }
}

function extractTxId(url: string): string {
    const txIdRegex = /([a-z0-9-_]{43})/i;
    return url.match(txIdRegex)[1];
}

function getTxFieldName(url: string): string {
    const fieldRegex = /[a-z0-9-_]{43}\/([a-z0-9]+)?$/i;
    return url.match(fieldRegex)[1];
}
