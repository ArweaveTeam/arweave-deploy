import { File } from './file';
import { JWKInterface } from 'arweave/node/arweave/lib/wallet';
import * as mime from 'mime';
import { Transaction } from 'arweave/node/arweave/lib/transaction';
import { HtmlParser } from '../parsers/text-html';
import { Arweave } from 'arweave/node/arweave/arweave';
import { DefaultParser } from '../parsers/default';

declare var __VERSION__: string;
export interface PrepareTransactionOptions {
    contentType?: string;
    siloUri?: string;
    package?: boolean;
    logger?: Function;
    warnings?: boolean;
}
export interface ContentParserInterface {
    description: string;
    run(entry: File, options: PrepareTransactionOptions): Promise<Buffer>
}

const parsers: { [key: string]: ContentParserInterface | undefined } = {
    'text/html': new HtmlParser,
    '*': new DefaultParser
}

export function getParser(contentType: string = '*'){
    return parsers[contentType] || parsers['*'];
}
/**
 * Take a File and create an arweave data transaction with it.
 * 
 * The content will be read from the file and run through any appropriate parser based
 * on the file content type.
 * 
 * Silo transactions will be run through parsers just like normal transactions but they will
 * have a slightly different output format, e.g. they'll have Silo-Name and Silo-Version tags,
 * the data field will be encrypted.
 *
 * @export
 * @param {File} file
 * @param {JWKInterface} key
 * @param {PrepareTransactionOptions} [options={}]
 * @returns {Promise<Transaction>}
 */
export async function buildTransaction(arweave: Arweave, file: File, key: JWKInterface, options: PrepareTransactionOptions = {}): Promise<{parser: ContentParserInterface, transaction: Transaction}>{

    if (!await file.exists()) {
        throw new Error(`Failed to read file at path: ${file.getPath()}`);
    }

    // The content-type tag value can be supplied by the user
    // this can be useful if the mime auto-detection fails for
    // whatever reason, or the user wants to set another value.
    const contentType = (options.contentType || mime.getType(file.getPath())) || 'application/octet-stream';

    if (!contentType.match('^text/.*$')) {
        throw new Error(`Detected content type: ${contentType}\nBETA NOTICE: text/* content types are currently supported, more content types will be supported in future releases.`);
    }

    // We need to read/parse the data before doing anything else as this will
    // change the data size, invalidate signatures etc.

    const parser = options.package ? getParser(contentType) : getParser('*');

    const data = await parser.run(file, options);

    if (data.byteLength >= 292969) {
        throw new Error(`Detcted byte size: ${data.byteLength}\nBETA NOTICE: Data uploads are currently limited to 3MB per transaction.`);
    }

    const transaction = await (options.siloUri ? newSiloTransaction(arweave, key, data, options.siloUri) : newTransaction(arweave, key, data));

    transaction.addTag('Content-Type', contentType);
    transaction.addTag('User-Agent', `ArweaveDeploy/${__VERSION__}`);

    await arweave.transactions.sign(transaction, key);

    if (!await arweave.transactions.verify(transaction)) {
        throw new Error(`Failed to sign transaction, signature verification failed`);
    }

    return {
        parser: parser,
        transaction: transaction
    };
}

async function newTransaction(arweave: Arweave, key: JWKInterface, data: Buffer ): Promise<Transaction> {
    return arweave.createTransaction({
        data: data
    }, key);
}

async function newSiloTransaction(arweave: Arweave, key: JWKInterface, data: Buffer, siloURI: string): Promise<Transaction> {
    return arweave.createSiloTransaction({
        data: data,
    }, key, siloURI);

}
