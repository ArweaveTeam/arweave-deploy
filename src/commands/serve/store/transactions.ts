import { existsSync, mkdirSync, accessSync, constants } from 'fs';
import { TxMetadataCollection, TxMetadata, TxMetadataTags } from '.';
import Transaction from 'arweave/node/lib/transaction';
import { File } from '../../../lib/file';
import { getSenderAddress } from '../helpers';

export class FilesystemDriver {
    protected databaseFile: File;

    protected transactionsPath: string;

    protected data: TxMetadataCollection;

    constructor(databasePath: string, transactionsPath: string) {
        this.transactionsPath = transactionsPath;
        this.databaseFile = new File(databasePath);
    }

    public async init(): Promise<void> {
        if (!(await this.databaseFile.exists())) {
            this.databaseFile.write(
                Buffer.from(
                    JSON.stringify({
                        transactions: {},
                        wallets: {},
                    }),
                ),
            );
        }

        if (!existsSync(this.transactionsPath)) {
            mkdirSync(this.transactionsPath, { recursive: true });
        }

        // Check if we can read/write to the transaction folder,
        // accessSync will throw an exception if we can't.
        accessSync(this.transactionsPath, constants.R_OK | constants.W_OK);

        this.data = JSON.parse((await this.databaseFile.read()).toString());
    }

    public async getAllMetadata(): Promise<TxMetadataCollection> {
        return this.data;
    }

    public async getTransactionMetadata(id: string): Promise<TxMetadata> {
        if (!(await this.hasTransaction(id))) {
            throw new Error(`Transaction data not found in store: ${this.transactionsPath}`);
        }
        return this.data[id];
    }

    public async hasTransaction(id: string): Promise<boolean> {
        return this.data.hasOwnProperty(id);
    }

    public async getTransaction(id: string): Promise<Transaction> {
        const file = new File(`${id}.json`, this.transactionsPath);

        if (!(await file.exists())) {
            throw new Error(`Transaction not found in store: ${this.transactionsPath}`);
        }

        return new Transaction(JSON.parse((await file.read()).toString()));
    }

    public async storeTransaction(transaction: Transaction, { height, block }: { height: number; block: string }) {
        this.data[transaction.id] = {
            id: transaction.id,
            created: new Date().toISOString(),
            from: await getSenderAddress(transaction),
            block: {
                id: block,
                height: height,
            },
            tags: await formatTags(transaction),
        };

        await Promise.all([this.commitDatabase(), this.commitTransaction(transaction)]);
    }

    protected async commitDatabase(): Promise<void> {
        await this.databaseFile.write(Buffer.from(JSON.stringify(this.data)));
    }

    protected async commitTransaction(transaction: Transaction): Promise<void> {
        const file = new File(`${transaction.id}.json`, this.transactionsPath);
        await file.write(Buffer.from(JSON.stringify(transaction)));
    }
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
async function formatTags(transaction: Transaction): Promise<TxMetadataTags> {
    const tags: { [key: string]: string[] } = {};

    const from = await getSenderAddress(transaction);

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

    tags.from = [from];

    if (transaction.target) {
        tags.to = [transaction.target];
    }

    return tags;
}
