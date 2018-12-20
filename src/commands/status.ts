import { Command } from '../command';

export class StatusCommand extends Command{

    public signature = 'status <transaction_id>';

    public description = 'Check the status of a given transaction ID';

    async action (transactionId: string, args: string, optional: string): Promise<void> {

        const status =  await this.arweave.transactions.getStatus(transactionId);


        const codes = {
            200: 'Deployed',
            202: 'Pending',
            404: 'Not found'
        };

        const expanded = (<any>codes)[status];

        this.log(`Trasaction ID: ${transactionId}`);
        this.log(`Status: ${status} ${expanded ? expanded : ''}`);

        if (status == 200) {
            this.log(`URL: http://arweave.net/${transactionId}`);
        }

    }
}
