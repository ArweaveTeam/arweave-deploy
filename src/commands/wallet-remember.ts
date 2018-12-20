import * as keys from '../lib/keys';
import { Command } from '../command';
import chalk from 'chalk';

export class WalletRememberCommand extends Command{

    public signature = 'remember-wallet';

    public description = 'Save a wallet and use it as your default instead of using --key-file key.json';

    async action(){

        const key = await this.getKey({inline: true, file: true});

        if (!key) {
            throw new Error('Key required, use --key-file key.json');
        }

        const address = await this.arweave.wallets.jwkToAddress(key);

        this.log(`Address: ${address}`);

        if (address) {
            this.log(chalk.yellowBright(`You already have a saved wallet (${address}) which will be overwritten.`));

            if (!await this.confirm(`Are you sure you want to continue? (y/n)`)) {
                throw new Error(`User cancelled`);
            }
        }

        const passphrase = await this.passwordPrompt(
            chalk.greenBright(`Set an encryption passphrase`)
        );

        const passphraseRepeat = await this.passwordPrompt(
            chalk.greenBright(`Confirm your encryption passphrase`)
        );

        if (passphrase != passphraseRepeat) {
            throw new Error('Passphrase and confirmation do not match!');
        }

        keys.remember(key, await this.arweave.wallets.jwkToAddress(key), passphrase);
    }

}