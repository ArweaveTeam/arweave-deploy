import { Command } from '../command';

export class KeyInspect extends Command {

    public signature = 'key-inspect';

    public description = 'Inspect a key file';

    async action(): Promise<void> {

        const key = await this.getKey();

        const address = await this.arweave.wallets.jwkToAddress(key);

        const lastTx = await this.arweave.wallets.getLastTransactionID(address);

        const balance = await this.arweave.wallets.getBalance(address);

        this.log(JSON.stringify({
            address: address,
            balance: this.formatWinston(balance),
            last_transaction: lastTx,
        }, null, 4));

    }
}
