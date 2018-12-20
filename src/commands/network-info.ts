import { Command } from '../command';

export class NetworkInfoCommand extends Command{

    public signature = 'network-info';

    public description = 'Get current network info';

    async action (transactionId: string, args: string, optional: string): Promise<void> {

        const start = Date.now();

        const response =  await this.arweave.network.getInfo();

        const end = Date.now();


        this.log(JSON.stringify({
            host: this.arweave.api.getConfig().host,
            port: this.arweave.api.getConfig().port,
            response: response,
            response_time: `${end - start}ms`
        }, null, 4));

    }
}
