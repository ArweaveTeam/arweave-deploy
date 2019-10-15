
import { Command } from '../command';
import chalk from 'chalk';

const REGEX_ADDRESS = /^[a-z0-9-_]{43}$/i;
const REGEX_AR_VALUE = /^([0-9]+|[0-9]+\.[0-9]{1,12})$/i;
const REGEX_ANCHOR = /^([a-z0-9-_]{43}|[a-z0-9-_]{64})$/i;

export class SignTxCommand extends Command {

    public signature = 'sign-tx';

    public description = 'Generate and sign a transaction';

    public options = [
        {
            signature: '--to <wallet_address>',
            description: 'The AR recipient wallet address',
        },
        {
            signature: '--amount <amount_in_ar>',
            description: 'The amount to send in AR (e.g. 123 or 123.456)',
        },
        {
            signature: '--fee <fee_in_ar>',
            description: 'The transaction fee in AR (e.g. 123 or 123.456)',
        },
        {
            signature: '--anchor <anchor_value>',
            description: 'The transaction anchor (last_tx from sending wallet, or the ID of one of a last 50 block)',
        },
    ];

    async action() {
        if (!this.context.to || !this.context.to.match(REGEX_ADDRESS)) {
            throw new Error(`(--to) Invalid Arweave to address, should match regex: ${REGEX_ADDRESS}`);
        }

        if (!this.context.amount || !this.context.amount.match(REGEX_AR_VALUE)) {
            throw new Error(`(--amount) Invalid AR amount, should be an AR amount as an integer (123), or decimal value (123.456) with up to 12 significant digits (123.456789123456)`);
        }

        if (!this.context.fee || !this.context.fee.match(REGEX_AR_VALUE)) {
            throw new Error(`(--fee) Invalid fee amount, should be an AR amount as an integer (123), or decimal value (123.456) with up to 12 significant digits (123.456789123456)`);
        }

        if (!this.context.anchor || !this.context.anchor.match(REGEX_ANCHOR)) {
            throw new Error(`(--anchor) Invalid transaction anchor, should be either the last_tx for the sending wallet, or a recent block ID (within the last 50 blocks)\n Try: https://viewblock.io/arweave/blocks`);
        }

        const winstonAmount = this.arweave.ar.arToWinston(this.context.amount);
        const winstonFee = this.arweave.ar.arToWinston(this.context.fee);

        const key = await this.getKey();


        const transaction = await this.arweave.createTransaction({
            target: this.context.to,
            quantity: winstonAmount,
            reward: winstonFee,
            last_tx: this.context.anchor,
        }, key);
        
        await this.arweave.transactions.sign(transaction, key);

        const address = await this.arweave.wallets.jwkToAddress(key);

        const total = this.arweave.ar.add(
            transaction.quantity,
            transaction.reward

        );

        this.print([
            `\nTransaction\n`,
            `ID: ${transaction.id}`,
            ``,
            `To: ${this.context.to}`,
            `From: ${address}`,
            `Amount: ${this.formatWinston(transaction.quantity)}`,
            `Fee: ${this.formatWinston(transaction.reward)}`,
            `Total: ${this.formatWinston(total)}`,
            ``,
        ]);

        this.print([
            `Signed Transaction:`,
            ``,
            `${JSON.stringify(transaction.toJSON())}`,
            ``,
            `This can now be posted to https://arweave.net/tx, or any Arweave node http://0.0.0.0:1984/tx`,
        ]);
    }

}
