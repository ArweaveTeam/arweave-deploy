import * as keys from '../lib/keys';
import { Command } from '../command';
import chalk from 'chalk';

export class WalletRememberCommand extends Command {

    public signature = 'remember-wallet <key_file_path>';

    public description = 'Save a wallet and use it as your default instead of using --key-file key.json';

    async action(path: string) {

        const key = await this.getKey({ path: path });

        const address = await this.arweave.wallets.jwkToAddress(key);

        this.print(`Address: ${address}`);

        const passphrase = await this.passwordPrompt(
            `Set an encryption passphrase`
        );

        const passphraseRepeat = await this.passwordPrompt(
            `Confirm your encryption passphrase`
        );

        if (passphrase != passphraseRepeat) {
            throw new Error('Passphrase and confirmation do not match!');
        }

        await keys.remember(key, await this.arweave.wallets.jwkToAddress(key), passphrase);

        this.print(chalk.greenBright(`Successfully saved key for wallet: ${address}`));
    }

}