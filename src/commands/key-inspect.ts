import { Command } from '../command';

export class KeyInspectCommand extends Command {

    public signature = 'key-inspect';

    public description = 'Inspect a key file';

    async action(): Promise<void> {

        const key = await this.getKey();

        const address = await this.arweave.wallets.jwkToAddress(key);

        let lastTx = ''  
        let balance = ''  

        try {
            lastTx = await this.arweave.wallets.getLastTransactionID(address);
            
        } catch (error) {
            lastTx = `unavailable: ${error.message}`;
        }

        try {
            balance = this.formatWinston(await this.arweave.wallets.getBalance(address))
        } catch (error) {
            balance = `unavailable: ${error.message}`;
        }

        this.log(JSON.stringify({
            address: address,
            balance: balance,
            last_transaction: lastTx,
        }, null, 4));

    }
}
