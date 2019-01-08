import { Arweave } from "arweave/dist/node/arweave/arweave";
import { JWKInterface } from "arweave/dist/node/arweave/lib/Wallet";
import chalk from 'chalk';
import * as commander from "commander";
import * as promptly from 'promptly';
import * as keys from './lib/keys';

export abstract class Command {

    protected arweave: Arweave;
    protected log: any;
    protected context: commander.Command;
    protected cwd: string;

    protected abstract description: string;

    constructor(arweave: Arweave, cwd: string, log: any) {
        this.arweave = arweave;
        this.cwd = cwd;
        this.log = log ? log : console.log;
    }

    setContext(context: commander.Command) {
        this.context = context;
    }


    formatWinston(value: string): string {
        return this.context.parent.winston ? value + ' Winston' : this.arweave.ar.winstonToAr(value) + ' AR';
    }

    confirm(message: string): Promise<boolean> {
        return promptly.confirm(message);
    }

    prompt(message: string): Promise<string> {
        return promptly.prompt(message);
    }

    passwordPrompt(message: string): Promise<string> {
        return promptly.password(message);
    }

    async getKey(options?: { inline?: true, file?: true, saved?: true }): Promise<JWKInterface> {

        if (!options || options.file) {
            if (this.context.parent.keyFile) {
                return keys.loadFromFile(this.context.parent.keyFile, this.cwd);
            }
        }

        if (!options || options.saved) {
            const rememberedAddress = await keys.recallKeyAddress();

            if (rememberedAddress) {
                const rememberedKey = await keys.recallKey(await promptly.password(
                    chalk.greenBright(`Enter your encryption passphrase to decrypt ${rememberedAddress}`
                    )));

                return rememberedKey;
            }
        }
    }

    async getKeyAddress() {
        const keyFilePath = await this.context.parent.keyFile;

        if (keyFilePath) {
            const key = await keys.loadFromFile(keyFilePath, this.cwd);
            return this.arweave.wallets.jwkToAddress(key);
        }

        const rememberedAddress = await keys.recallKeyAddress();

        if (rememberedAddress) {
            return rememberedAddress;
        }
    }
}