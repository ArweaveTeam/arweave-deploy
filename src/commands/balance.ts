import { Command } from '../command';

export class BalanceCommand extends Command {

    public signature = 'balance';

    public description = 'Get the balance of your wallet.';

    async action(): Promise<void> {

        let address = await this.getKeyAddress();

        if (!address) {
            throw new Error(`Arweave key required, try running this command again with '--key-file path/to/key/file.json'`);
        }

        let balance = await this.arweave.wallets.getBalance(address);

        this.log(`Address: ${address}`);
        this.log(`Balance: ${this.formatWinston(balance)}`);
    }
}
