import { Command } from '../command';
import chalk from 'chalk';
import { File } from '../lib/file';
import * as keys from '../lib/keys';
import * as mime from 'mime';
import { JWKInterface } from 'arweave/dist/node/arweave/lib/wallet';
import { Transaction } from 'arweave/dist/node/arweave/lib/transaction';
import * as crypto from 'crypto';
import { ArweaveUtils } from 'arweave/dist/node/arweave/lib/utils';

declare var __VERSION__: string;

export class DeployCommand extends Command {

    public signature = 'deploy <file_path>';

    public description = 'Deploy a file (an optional Silo reference can also be specified)';

    public options = [
        {
            signature: '--silo-publish <silo_uri>',
            description: 'Define a Silo URI and publish the transaction on Silo',
            action: (value: string) => {
                if (value.match(/[a-z0-9-_]+\.[0-9]+/i)) {
                    return value;
                }
                throw new Error('--silo-publish: Silo URIs can only contain letters, numbers, dashes and underscores, followed by dot and a number. E.g. My-silo-thing.2');
            }
        },
        {
            signature: '--content-type <mime_type>',
            description: 'Set the data content type manually',
            action: (value: string): string => {
                if (value.match(/[a-z0-9-_]+\/[a-z0-9-_]+/i)) {
                    return value;
                }
                throw new Error('--content-type: Invalid content-type, must be a valid mime type in the format of */*, e.g. text/html');
            }
        },
        {
            signature: '--force-skip-confirmation',
            description: 'Skip warnings, confirmations, and force upload',
        },
        {
            signature: '--force-skip-warnings',
            description: 'Skip warnings and disable safety checks',
        }
    ];


    async action(path: string) {

        const file = new File(path, this.cwd);

        if (!await file.exists()) {
            throw new Error(`Failed to read file at path: "${path}"`);
        }

        const data = (await file.read()).toString();

        const bytes = (await file.info()).size;

        const key = await this.getKey();

        if (!key) {
            throw new Error(`Arweave key required, try running this command again with '--key-file path/to/key/file.json'`);
        }

        const address = await this.arweave.wallets.jwkToAddress(key);

        const balance = await this.arweave.wallets.getBalance(address);

        // The content-type tag value can be supplied by the user
        // this can be useful if the mime auto-detection fails for
        // whatever reason or the user wants to set another value.
        const type = this.context.contentType ? this.context.contentType : mime.getType(path);

        // If a Silo destination is specified then we need to generate the transaction
        // a bit differently as the contents will be encrypted using part of the siloDestination
        // string, we also need to add an additional tag. Everything else is the same though.
        const transaction = this.context.siloPublish ? await this.newSiloTransaction(key, data, this.context.siloPublish) : await this.newTransaction(key, data);

        const balanceAfter = this.arweave.ar.sub(balance, transaction.reward);

        transaction.addTag('Content-Type', type);

        transaction.addTag('User-Agent', `ArweaveDeploy/${__VERSION__}`);

        await this.arweave.transactions.sign(transaction, key);

        if (!await this.arweave.transactions.verify(transaction)) {

            throw new Error(`Failed to verify transaction`);
        }

        const tags = transaction.tags.map((tag) => {
            const decoded = {
                name: tag.get('name', { decode: true, string: true }),
                value: tag.get('value', { decode: true, string: true }),
            };

            return `${decoded.name}: ${decoded.value}`;
        }).join(', ');

        this.log(`File: ${path}`);
        this.log(`Type: ${type}`);
        this.log(`Size: ${File.bytesForHumans(transaction.get('data', { decode: true, string: false }).byteLength)}`);
        this.log(`Tags: ${tags}`);
        this.log(``);
        this.log(`Wallet address: ${address}`);
        this.log(`Price: ${this.formatWinston(transaction.reward)}`);
        this.log(`Current balance: ${this.formatWinston(balance)}`);
        this.log(`Balance after uploading: ${this.formatWinston(balanceAfter)}`);
        this.log(``);
        this.log(`Transaction ID: ${transaction.id}`);
        this.log(``);

        if (this.context.siloPublish) {
            this.log(`Silo URI: ${this.context.siloPublish}`);
            this.log(``);
        }

        if (this.arweave.ar.isLessThan(balance, transaction.reward)) {
            throw new Error(`Insufficient balance`);
        }

        if (!this.context.forceSkipWarnings && keys.isMaybeKey(data)) {

            let confirmed = await this.confirm(chalk.redBright(`The data you're uploading looks like it might be a key file, are you sure you want to continue? Y/N`));
            this.log(``);

            if (!confirmed) {
                throw new Error(`User cancelled`);
            }
        }

        if (!this.context.forceSkipConfirmation) {

            const confirmed = await this.prompt(chalk.green(`Carefully check the above details are correct, then Type CONFIRM to complete this upload`));

            if (confirmed !== 'CONFIRM') {
                throw new Error(`User cancelled`);
            }
        }

        /**
         * Axios still haven't produced a release where the deprecated
         * buffer consructor issue has been fixed, so we need to manually
         * bufferify the transaction for now to avoid a deprecation warning
         * at runtime being printed to the cli.
         */
        const response = await this.arweave.transactions.post(Buffer.from(JSON.stringify(transaction), 'utf8'));

        if (response.status != 200) {
            throw new Error(`Failed to submit transaction, status ${response.status} - ${response.data}`);
        }

        this.log(`Your file is deploying! 🚀`);
        this.log(`Once your file is mined into a block it'll be available on the following URL`);
        this.log(``);
        this.log(chalk.cyanBright(`http://arweave.net/${transaction.id}`));
        this.log(``);
        this.log(`You can check it's status using 'arweave-deploy status ${transaction.id}'`);
        this.log(``);

    }

    private async newTransaction(key: JWKInterface, data: string): Promise<Transaction> {
        return this.arweave.createTransaction({
            data: data
        }, key);
    }

    private async newSiloTransaction(key: JWKInterface, data: string, siloURI: string): Promise<Transaction> {
        return this.arweave.createSiloTransaction({
            data: data,
        }, key, siloURI);

    }

}
