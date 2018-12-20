import { Command } from '../command';
import * as keys from '../lib/keys';

export class InspectWalletCommand extends Command {

    public signature = 'inspect-wallet';

    public description = 'Inspect a key file';

    async action (): Promise<void> {

        const key = await this.getKey();

        const address = await this.arweave.wallets.jwkToAddress(key);

        const lastTx = await this.arweave.wallets.getLastTransactionID(address);

        const balance = await this.arweave.wallets.getBalance(address);

        this.log(JSON.stringify({
            address: address,
            balance: balance,
            last_transaction: lastTx,
        }, null, 4));

    }
}
