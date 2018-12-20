import { Command } from '../command';
import chalk from 'chalk';
import { File } from '../lib/file';
import * as keys from '../lib/keys';
import * as mime from 'mime';

export class DeployCommand extends Command{

    public signature = 'deploy <file_path>';

    public description = 'Deploy a file';

    async action(path: string){
        const file = new File(path, this.cwd);

        if (!await file.exists()) {
            throw new Error(`Failed to read file at path: "${path}"`);
        }

        const data = (await file.read()).toString();

        const bytes = (await file.info()).size;

        let key = await this.getKey();

        if (!key) {
            throw new Error(`Arweave key required, try running this command again with '--key-file path/to/key/file.json'`);
        }

        const address = await this.arweave.wallets.jwkToAddress(key);

        const balance = await this.arweave.wallets.getBalance(address);

        const price = await this.arweave.transactions.getPrice(bytes);

        const balanceAfter = this.arweave.ar.sub(balance, price);

        // The content-type tag value can be supplied by the user
        // this can be useful if the mime auto-detection fails for
        // whatever reason or the user wants to set another value.
        const type = this.context.contentType ? this.context.contentType : mime.getType(path);

        const transaction = await this.arweave.createTransaction({
            data: data,
            reward: price
        }, key);


        transaction.addTag('Content-Type', type);

        await this.arweave.transactions.sign(transaction, key);

        this.log(`File: ${path}`);
        this.log(`Type: ${type}`);
        this.log(`Size: ${File.bytesForHumans(bytes)}`);
        this.log(`Wallet address: ${address}`);
        this.log(`Price: ${this.formatWinston(price)}`);
        this.log(`Current balance: ${this.formatWinston(balance)}`);
        this.log(`Balance after uploading: ${this.formatWinston(balanceAfter)}`);
        this.log(``);

        if (this.arweave.ar.isLessThan(balance, price)) {
            throw new Error(`Insufficient balance`);
        }

        if (!this.context.forceSkipWarnings && keys.isMaybeKey(data)) {

            let confirmed = await this.confirm(chalk.redBright(`The data you're uploading looks like it might be a key file, are you sure you want to continue? Y/N`));
            this.log(``);

            if (!confirmed) {
                throw new Error(`User cancelled`);
            }
        }

        if (!this.context.forceSkipConfirmation ) {

            const confirmed = await this.prompt(chalk.green(`Carefully check the above details are correct, then Type CONFIRM to complete this upload`));
            this.log(``);

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

        // @ts-ignore
        // const response = await arweave.transactions.post(Buffer.from(JSON.stringify(transaction)));

        // if (response.status != 200) {
        //     throw new Error(`Failed to submit transaction, status ${response.status} - ${response.data}`);
        // }

        this.log(`Your file is deploying! 🚀`);
        this.log(`Once your file is mined into a block it'll be available on the following URL`);
        this.log(``);
        this.log(chalk.cyanBright(`http://arweave.net/${transaction.id}`));
        this.log(``);
        this.log(`You can check it's status using 'arweave-deploy status ${transaction.id}'`);
        this.log(``);
    }

}
