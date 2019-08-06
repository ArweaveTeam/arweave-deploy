import { resolve } from 'path';
import { appDirectoryPath } from '../../../lib/file';
import Transaction from 'arweave/node/lib/transaction';
import Arweave from 'arweave/node';
import { FilesystemDriver } from './filesystem';

export interface TxMetadataCollection {
    [key: string]: TxMetadata | undefined;
}

export interface TxMetadata {
    id: string;
    created: string;
    block: {
        id: string;
        height: number;
    };
    tags: TxMetadataTags;
}

export interface TxMetadataTags {
    [key: string]: string[];
}

let arweave: Arweave;

let driver: FilesystemDriver;

export async function initStore(arweaveInstance: Arweave) {
    arweave = arweaveInstance;
    driver = new FilesystemDriver(resolve(appDirectoryPath(), 'txs.json'), resolve(appDirectoryPath(), 'txs'));

    await driver.init();
}

export async function getAllMetadata(): Promise<TxMetadataCollection> {
    return driver.getAllMetadata();
}

export async function getTransactionMetadata(id: string): Promise<TxMetadata> {
    return driver.getTransactionMetadata(id);
}

export async function getTransaction(id: string): Promise<Transaction> {
    return driver.getTransaction(id);
}

export async function hasTransaction(id: string): Promise<Boolean> {
    return driver.hasTransaction(id);
}

export async function saveTransaction(transaction: Transaction) {
    const networkInfo = await arweave.network.getInfo();

    await driver.storeTransaction(transaction, {
        block: networkInfo.current,
        height: networkInfo.height,
    });
}

/**
 * Take a regular arweave transaction object and extract the tags,
 * decode them, and reduce the tags into a more efficient format
 * for search and storage.
 *
 * From: (all names and values base64 encoded)
 * [
 *   {"name": "some-tag", value: "value-a"},
 *   {"name": "some-tag", value: "value-b"},
 *   {"name": "some-other-tag", value: "some-other-value"}
 * ]
 *
 * To: (all names and values utf8 strings)
 * {
 *   "some-tag": ["value-a","value-b"],
 *   "some-other-tag": ["some-other-value"]
 * }
 *
 * @param {Transaction} transaction
 * @returns {TxMetadataTags}
 */
export function formatTags(transaction: Transaction): TxMetadataTags {
    const tags: { [key: string]: string[] } = {};

    transaction.tags.reduce((reduced, tag) => {
        const key = tag.get('name', { decode: true, string: true });
        const value = tag.get('value', { decode: true, string: true });

        if (reduced[key]) {
            reduced[key].push(value);
            return reduced;
        }

        reduced[key] = [value];

        return reduced;
    }, tags);

    return tags;
}
