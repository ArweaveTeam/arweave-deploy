import { JWKInterface } from 'arweave-js/dist/node/arweave/lib/Wallet';
import * as Arweave from 'arweave-js/dist/node/node';
import * as program from 'commander';
import * as mime from 'mime';
import * as promptly from 'promptly';
import { File } from './lib/file';
import { validateKeyComponents, isMaybeKey } from './lib/keys';
import { Output } from './lib/output';

const cwd = process.cwd();

const logger = new Output;

const arweave = Arweave.init({host: 'wallet-1.nodes.arweave.org', logging: false});


function quit(exitcode = 0){
    process.exit(exitcode);
}

function formatWinston(program: any, value: string): string{
    return program.winston ? value + ' Winston' : arweave.ar.winstonToAr(value) + ' AR';
}


/**
 * Catch and handle some global events
 */
process
    .on('uncaughtException', function (error: Error) {
        logger.red('');
        logger.red(error.message);
        logger.red('');
        quit(1);
    });

process
    .on('unhandledRejection', (reason, p) => {
        logger.red('');
        logger.red(reason);
        logger.red('');
        quit(1);
    });

/**
 * Argument definitions
 */
program
    .option('--winston', 'Display winston values instead of AR.')

program
    .option('--debug', 'Display additional debugging information.')

program
    .option('--key <key_string_or_path>', 'Path to an Arweave key file, or the Arweave key value as a string.', async (value: string) : Promise<JWKInterface> => {

            let file = new File(value, cwd);
            let data = '';

            /**
             * Check if the value passed through is a valid file path and read the data if so,
             * if it's not then in the next block we'll assume it's a JWK string that's been
             * passed so we'll try and decode it.
             */
            if (await file.exists()) {
                try {
                     data = (await file.read({encoding: 'utf-8'})).toString();
                } catch (error) {
                    throw new Error(`Failed to read Arweave key file: ${error.message}`);
                }
            }

            try {
                let decoded =  JSON.parse(data ? data : value);

                if (typeof decoded !== 'object') {
                    throw new Error('Failed to parse Arweave key file');
                }

                // This will throw an exception if there's a validation error so no need to capture anything
                validateKeyComponents(decoded);

                return decoded;

            } catch (error) {
                throw new Error(`Failed to parse Arweave key file: ${error.message}`);
            }

    })

/**
 * CLI commands
 */
program
    .command('balance')
    .description('Get the balance of your wallet.')
    .action(async () => {

        logger.blue(`Arweave Deploy / ${logger.control.reset}Balance check`);
        logger.blue('');

        let key = await program.key;

        if (!key) {
            throw new Error(`Arweave key required, try running this command again with '--key path/to/key/file.json'`);
        }

        let address = await arweave.wallets.jwkToAddress(key);

        let balance = await arweave.wallets.getBalance(address);

        logger.info(`Address: ${address}`);
        logger.info(`Balance: ${formatWinston(program, balance)}`);
        logger.blue(``);

    })

program
    .command('preview <file_path>')
    .description('Preview the deployment without committing anything')
    .action(async (path) => {

        logger.blue(`Arweave Deploy / ${logger.control.reset}Preview\n`);

        logger.yellow(`PREVIEW MODE - Nothing will actually be uploaded as part of this process.\n`);

        const file = new File(path, cwd);

        if (!await file.exists()) {
            throw new Error(`Failed to read file at path: "${file.getPath()}"`);
        }

        const data = (await file.read()).toString();

        const bytes = (await file.info()).size;

        const key = await program.key;

        if (!key) {
            throw new Error(`Arweave key required, try running this command again with '--key path/to/key/file.json'`);
        }

        if (isMaybeKey(data)) {
            let confirmed = await promptly.confirm(`${logger.control.bright}${logger.colors.red}The data you're uploading looks like it might be a key file, are you sure you want to continue? Y/N (default: N)${logger.control.reset}`);

            if (!confirmed) {
                throw new Error('Cancelled');
            }
        }

        const address = key ? await arweave.wallets.jwkToAddress(key) : null;

        const balance = key ? await arweave.wallets.getBalance(address) : null;

        const price = await arweave.transactions.getPrice(bytes);

        const balanceAfter = key ? arweave.ar.sub(balance, price): null;

        const type = mime.getType(path);

        const transaction = await arweave.createTransaction({
            data: data,
            reward: price
        }, key);

        transaction.addTag('Content-Type', type);

        await arweave.transactions.sign(transaction, key);

        logger.info(`File: ${path}`);
        logger.info(`Type: ${type}`);
        logger.info(`Size: ${File.bytesForHumans(bytes)}`);
        logger.info(`Wallet address: ${address}`);
        logger.info(`Price: ${formatWinston(program, price)}`);
        logger.info(`Current balance: ${formatWinston(program, balance)}`);
        logger.info(`Balance after uploading: ${formatWinston(program, balanceAfter)}`);
        logger.info(``);
        logger.info(`The URL for your file would be`);
        logger.info(``);
        logger.blue(`http://arweave.net/${transaction.id}`);
        logger.info(``);
    })

program
    .command('upload <file_path>')
    .description('Deploy a file to the weave')
    .action(async (path) => {

        logger.blue(`Arweave Deploy / ${logger.control.reset}File Upload`);
        logger.blue(``);
        
        const file = new File(path, cwd);

        if (!await file.exists()) {
            throw new Error(`Failed to read file at path: "${file.getPath()}"`);
        }

        const data = (await file.read()).toString();

        if (isMaybeKey(data)) {
            let confirmed = await promptly.confirm(`${logger.control.bright}${logger.colors.red}The data you're uploading looks like it might be a key file, are you sure you want to continue? Y/N (default: N)${logger.control.reset}`);

            if (!confirmed) {
                throw new Error('Cancelled');
            }
        }

        const bytes = (await file.info()).size;

        const key = await program.key;

        if (!key) {
            throw new Error(`Arweave key required, try running this command again with '--key path/to/key/file.json'`);
        }

        const address = await arweave.wallets.jwkToAddress(key);

        const balance = await arweave.wallets.getBalance(address);

        const price = await arweave.transactions.getPrice(bytes);

        const balanceAfter = arweave.ar.sub(balance, price);

        const type = mime.getType(path);

        const transaction = await arweave.createTransaction({
            data: data,
            reward: price
        }, key);


        transaction.addTag('Content-Type', type);

        logger.info(`File: ${path}`);
        logger.info(`Type: ${type}`);
        logger.info(`Size: ${File.bytesForHumans(bytes)}`);
        logger.info(`Wallet address: ${address}`);
        logger.info(`Price: ${formatWinston(program, price)}`);
        logger.info(`Current balance: ${formatWinston(program, balance)}`);
        logger.info(`Balance after uploading: ${formatWinston(program, balanceAfter)}`);
        logger.info(``);

        if (arweave.ar.isLessThan(balance, price)) {
            throw new Error(`Insufficient balance`);
        }

        const confirmed = await promptly.confirm(`${logger.control.bright}${logger.colors.green}Continue? (y/n)${logger.control.reset}`);

        if (!confirmed) {
            throw new Error(`Upload cancelled`);
        }

        await arweave.transactions.sign(transaction, key);

        /**
         * Axios still haven't produced a release where the deprecated
         * buffer consructor issue has been fixed, so we need to manually
         * bufferify the transaction for now to avoid a deprecation warning
         * at runtime being printed to the cli.
         */

        // @ts-ignore
        const response = await arweave.transactions.post(Buffer.from(JSON.stringify(transaction)));

        if (response.status != 200) {
            throw new Error(`Failed to submit transaction, status ${response.status} - ${response.data}`);
        }

        logger.info(`Your file is deploying! 🚀`);
        logger.info(`Once your file is mined into a block it'll be available on the following URL`);
        logger.info(``);
        logger.blue(`http://arweave.net/${transaction.id}`);
        logger.info(``);
    })

program.parse(process.argv);

if (!process.argv.slice(2).length) {
    program.outputHelp();
}
