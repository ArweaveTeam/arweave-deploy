import { formatTags, Wallet, WalletCollection } from '.';
import Transaction from 'arweave/node/lib/transaction';
import { File } from '../../../lib/file';

export class MemoryDriver {
    protected data: WalletCollection;

    constructor(wallets: WalletCollection) {
        this.data = wallets;
    }

    public async hasWallet(address: string): Promise<boolean> {
        console.log('data', this.data, this.data.hasOwnProperty(address));
        return this.data.hasOwnProperty(address);
    }

    public async getWallet(address: string): Promise<Wallet> {
        console.log('fetching wallet', address);
        return this.data[address];
    }

    protected async updateWallet(
        address: string,
        { balance, last_tx }: { balance: string; last_tx: string },
    ): Promise<void> {
        if (this.hasWallet(address)) {
            if (balance) {
                this.data[address].balance = balance;
            }
            if (last_tx) {
                this.data[address].last_tx = last_tx;
            }
        }
        this.data[address] = {
            address: address,
            balance: balance || '0',
            last_tx: last_tx || '',
        };
    }
}
