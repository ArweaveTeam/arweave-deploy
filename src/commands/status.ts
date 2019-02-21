import { Command } from '../command';

export class StatusCommand extends Command {

    public signature = 'status <transaction_id>';

    public description = 'Check the status of a given transaction ID';

    async action(transactionId: string, args: string, optional: string): Promise<void> {

        const response = await this.arweave.transactions.getStatus(transactionId);
        
        this.print(`Trasaction ID: ${transactionId}`);

        const codes = {
            202: 'Pending ⛏',
            404: 'Not found (or not yet propagated, this can take a few seconds)',
            400: 'Invalid transaction',
            410: 'Transaction failed',
            500: 'Unknown error',
        };

        if (response.status == 200) {
            this.print([
                ``,
                `Status: ${response.status} Accepted 🚀`,
                ``,
                ` - Block: ${response.confirmed.block_height}`,
                ` - Block hash: ${response.confirmed.block_indep_hash}`,
                ` - Confirmations: ${response.confirmed.number_of_confirmations}`,
                ``,
                `URL: https://arweave.net/${transactionId}`,
                `Block URL: https://arweave.net/block/hash/${response.confirmed.block_indep_hash}`,
                ``,
                `Block explorer URL: https://viewblock.io/arweave/block/${response.confirmed.block_height}`,
                ``,
            ]);
        }else{
            this.print(`Status: ${response.status} ${(<any>codes)[response.status] || ''}`);
        }

    }
}
