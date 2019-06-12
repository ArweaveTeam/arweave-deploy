import { Command } from '../command';
import { File } from '../lib/file';
import chalk from 'chalk';
import { recallKeyAddress } from '../lib/keys';

export class KeyExportCommand extends Command {

    public signature = 'key-export';

    public description = 'Decrypt and export your key file';

    async action(): Promise<void> {

        if (!(await recallKeyAddress())){
            throw new Error('No key available to export');
        }

        const key = await this.getKey();

        const address = await this.arweave.wallets.jwkToAddress(key);

        const output = new File(`arweave-keyfile-${address}.json`, this.cwd);

        const confirmed = await this.prompt(`Your key file will be decrypted and exported in plain text to: ${output.getPath()}\n` + chalk.green('Type CONFIRM to continue.'));

        if (confirmed !== 'CONFIRM') {
            throw new Error(`User cancelled`);
        }

        if (await output.exists()) {
            throw new Error(`File already exists at: ${output.getPath()}, move this file first to prevent overwriting.`);
        }

        await output.write(Buffer.from(JSON.stringify(key)));

        this.print(`Key file data saved to: ${output.getPath()}`);
    }
}
