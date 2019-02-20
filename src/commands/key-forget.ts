import * as keys from '../lib/keys';
import { Command } from '../command';
import chalk from 'chalk';

export class KeyForgetCommand extends Command {

    public signature = 'key-forget';

    public description = 'Forget your saved key file';

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