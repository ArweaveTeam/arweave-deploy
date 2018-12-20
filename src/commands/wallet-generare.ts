import { Command } from '../command';
import chalk from 'chalk';
import { File } from '../lib/file';

export class WalletGenerateCommand extends Command{

    public signature = 'generate-wallet <output_file>';

    public description = 'Generate a new wallet key file';

    async action(path: string){

        const wallet =  await this.arweave.wallets.generate();
        const address = await this.arweave.wallets.jwkToAddress(wallet);

        const file = new File(path ? path : `arweave-keyfile-${address}.json`, this.cwd);

        if (await file.exists()) {
            let confirmed = await this.confirm(
                chalk.redBright(`Looks like the output file already exists, do you want to overwrite it? Y/N\n`)
            );

            if (!confirmed) {
                throw new Error(`User cancelled`);
            }
        }

        await file.write(Buffer.from(JSON.stringify(wallet, null, 4)));

        this.log(chalk.cyanBright(`Your new wallet address: ${address}\n`));

        this.log(`Successfully saved key to ${path}`);
    }

}