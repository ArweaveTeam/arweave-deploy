import { Transaction, Tag } from 'arweave/node/arweave/lib/transaction';
import { Command } from '../command';
import { File } from '../lib/file';
import { buildTransaction, PrepareTransactionOptions } from '../lib/TransactionBuilder';
import chalk from 'chalk';

const REGEX_CONTENT_TYPE = /[a-z0-9-_]+\/[a-z0-9-_]+/i;
const REGEX_SILO_URI = /[a-z0-9-_]+\.[0-9]+/i;

export class DeployCommand extends Command {

    public signature = 'deploy <file_path>';

    public description = 'Deploy a file';

    public options = [
        {
            signature: '--silo-publish <silo_uri>',
            description: 'Define a Silo URI and publish the transaction on Silo',
            action: (value: string) => {
                if (value.match(REGEX_SILO_URI)) {
                    return value;
                }
                throw new Error('--silo-publish: Silo URIs can only contain letters, numbers, dashes and underscores, followed by dot and a number. E.g. My-silo-thing.2');
            }
        },
        {
            signature: '--content-type <mime_type>',
            description: 'Set the data content type manually',
            action: (value: string): string => {
                if (value.match(REGEX_CONTENT_TYPE)) {
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
        },
        {
            signature: '--dry-run [output_data_path]',
            description: 'Run through the deploy process without actually sending the transaction, an optional path can be specified to output the transaction object to.',
        },
        {
            signature: '--package',
            description: 'Package and optimise JS + CSS assets.',
        }
    ];

    async action(path: string) {

        if (this.context.dryRun) {
            this.print(chalk.red(`Dry run - this will not actually send your transaction but you can see how it will be processed.`));
        }

        const file = new File(path, this.cwd);

        const key = await this.getKey();

        const options: PrepareTransactionOptions = {
            siloUri: this.context.siloPublish,
            package: this.context.package,
            // Default behaviour is to have warnings on so force it to true if the user doesn't specify
            warnings: !this.context.forceSkipWarnings,
        };

        if (this.context.debug) {
            options.logger = this.print;
        }

        const {transaction, parser} = await buildTransaction(this.arweave, file, key, options);

        const address = await this.arweave.wallets.jwkToAddress(key);

        const balance = await this.arweave.wallets.getBalance(address);

        const balanceAfter = this.arweave.ar.sub(balance, transaction.reward);

        this.print([
            `\nFile\n`,
            `Path: ${path}`,
        ]);
        this.print(`Size: ${File.bytesForHumans(transaction.get('data', { decode: true, string: false }).byteLength)}`);

        if (parser && parser.description) {
            this.print(`Optimisations\n - ${parser.description}`);
        }

        this.print([
            `\nTransaction\n`,
            `ID: ${transaction.id}` + ((): string => {
                if (options.siloUri) {
                    return `\nSilo URI: ${options.siloUri}\n`;
                }
                return'';
            })(),
            `Price: ${this.formatWinston(transaction.reward)}`,
            `\nTags:\n\n${this.formatTags(transaction)}`,
            `\nWallet\n`,
            `Address: ${address}`,
            `Current balance: ${this.formatWinston(balance)}`,
            `Balance after uploading: ${this.formatWinston(balanceAfter)}`,
            ``,
        ]);

        if (this.context.dryRun) {
            // --dry-run can be a flag or a path to output the tx to
            if (typeof this.context.dryRun == 'string') {
                const output = new File(this.context.dryRun, this.cwd);
                await output.write(Buffer.from(JSON.stringify(transaction, null, 4), 'utf8'));
                this.print(chalk.red(`Transaction data saved to: ${output.getPath()}`));
            }
            return;
        }

        if (this.arweave.ar.isLessThan(balance, transaction.reward)) {
            throw new Error(`Insufficient balance: balance ${this.formatWinston(balance)}, fee: ${this.formatWinston(transaction.reward)}`);
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
            throw new Error(`Failed to submit transaction, unexpected status: ${response.status} - ${response.data}`);
        }

        this.print([
            `Your file is deploying! 🚀`,
            `Once your file is mined into a block it'll be available on the following URL`,
            ``,
            chalk.cyanBright(`http://arweave.net/${transaction.id}`),
            ``,
            `You can check it's status using 'arweave-deploy status ${transaction.id}'`
        ]);
    }

    /**
     * Gets the tags from a transaction and returns them
     * as a single object with tag names as keys. E.g.
     * 
     * {
     *   'Content-Type': 'text/html',
     *   'User-Agent': 'ArweaveDeploy/x.x.x'
     * }
     *
     * @private
     * @param {Transaction} transaction
     * @returns {{ [key: string]: string }}
     * @memberof DeployCommand
     */
    public getTags(transaction: Transaction): { [key: string]: string }{

        let tags: { [key: string]: string } = {};

        transaction.tags.forEach((tag: Tag) => {
            const decoded = {
                name: tag.get('name', { decode: true, string: true }),
                value: tag.get('value', { decode: true, string: true }),
            };

            tags[decoded.name] = decoded.value;
        });

        return tags;
    }

    /**
     * Get tags as a formatted string.
     * 
     *  - Tag-Name: Tag Value
     *  - Tag-Name-2: Tag Value 2
     *  - Tag-Name-3: Tag Value 3
     *
     * @private
     * @param {Transaction} transaction
     * @returns {string}
     * @memberof DeployCommand
     */
    public formatTags(transaction: Transaction): string {
        const tags = this.getTags(transaction);

        return Object.keys(tags).map((key: string): string => {
            return ` - ${key}: ${tags[key]}`;
        }).join('\n');
    }

}
