import * as keys from '../lib/keys';
import { Command } from '../command';
import chalk from 'chalk';

export class WalletForgetCommand extends Command {

    public signature = 'forget-wallet';

    public description = 'Forget your default key';

    async action(path: string): Promise<void> {

        const address = await keys.recallKeyAddress();

        this.log(`You're about to forget your saved wallet: ${address}`);

        const confirmed = await this.prompt(chalk.redBright(`Type CONFIRM to complete this action`));

        if (confirmed !== 'CONFIRM') {
            throw new Error(`User cancelled`);
        }

        keys.forget();
    }

}