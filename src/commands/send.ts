
import { Command } from '../command';
import chalk from 'chalk';

const REGEX_ADDRESS = /[a-z0-9-_]{43}/i;

export class SendCommand extends Command {

    public signature = 'send <amount_in_ar> <to_arweave_address>';

    public description = 'Send AR to another wallet';

    async action(arAmount: string, toAddress: string) {

        if (!toAddress.match(REGEX_ADDRESS)) {
            throw new Error(`Invalid arweave address, should match regex: ${REGEX_ADDRESS}`);
        }

        const winstonAmount = this.arweave.ar.arToWinston(arAmount);

        const key = await this.getKey();

        const transaction = await this.arweave.createTransaction({
            target: toAddress,
            quantity: winstonAmount
        }, key);
        
        this.arweave.transactions.sign(transaction, key);

        const address = await this.arweave.wallets.jwkToAddress(key);

        const balance = await this.arweave.wallets.getBalance(address);

        const total = this.arweave.ar.add(
            transaction.quantity,
            transaction.reward
        );

        const balanceAfter = this.arweave.ar.sub(balance, total);

        this.print([
            `\nTransaction\n`,
            `ID: ${transaction.id}`,
            ``,
            `To: ${toAddress}`,
            `Amount: ${this.formatWinston(transaction.quantity)}`,
            `Fee: ${this.formatWinston(transaction.reward)}`,
            `Total: ${this.formatWinston(total)}`,
            `\nWallet\n`,
            `Address: ${address}`,
            `Current balance: ${this.formatWinston(balance)}`,
            `Balance after uploading: ${this.formatWinston(balanceAfter)}`,
            ``,
        ]);

        if (this.arweave.ar.isLessThan(balance, total)) {
            throw new Error(`Insufficient balance: balance ${this.formatWinston(balance)}, fee: ${this.formatWinston(transaction.reward)}`);
        }

        if (!this.context.forceSkipConfirmation) {
            const confirmed = await this.prompt(chalk.green(`Carefully check the above details are correct, then Type CONFIRM to complete this transaction`));

            if (confirmed !== 'CONFIRM') {
                throw new Error(`User cancelled`);
            }
        }

        const response = await this.arweave.transactions.post(Buffer.from(JSON.stringify(transaction), 'utf8'));

        if (response.status != 200) {
            throw new Error(`Failed to submit transaction, unexpected status: ${response.status} - ${response.data}`);
        }

        this.print([
            `Your AR is on its way! 🚀`,
            ``,
            `Block explorer link:`,
            ``,
            chalk.cyanBright(`https://viewblock.io/arweave/tx/${transaction.id}`),
            ``,
            `Your transaction can take a few minutes to propagate across the network.`,
        ]);
    }

}
