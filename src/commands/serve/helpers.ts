import { IncomingMessage } from 'http';
import { createHash } from 'crypto';
import ArweaveUtils from 'arweave/node/lib/utils';
import Transaction from 'arweave/node/lib/transaction';

export function readIncomingMessageData(stream: IncomingMessage): Promise<Buffer> {
    const chunks: Buffer[] = [];

    return new Promise((resolve, reject) => {
        stream.on('data', function(chunk: Buffer) {
            chunks.push(chunk);
        });

        stream.on('end', function() {
            resolve(Buffer.concat(chunks));
        });
    });
}

export async function streamToJson(stream: IncomingMessage): Promise<object> {
    return JSON.parse((await readIncomingMessageData(stream)).toString());
}

export async function ownerToAddress(publicKey: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const digest = createHash('sha256')
            .update(ArweaveUtils.b64UrlToBuffer(publicKey))
            .digest();

        resolve(ArweaveUtils.bufferTob64Url(digest));
    });
}

export async function wait(milliseconds: number) {
    return new Promise(resolve => {
        setTimeout(resolve, milliseconds);
    });
}

export function getSenderAddress(transaction: Transaction): Promise<string> {
    return ownerToAddress(transaction.owner);
}
