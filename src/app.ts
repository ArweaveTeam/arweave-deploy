import { JWKInterface } from 'arweave-js/dist/node/arweave/lib/Wallet';
import * as Arweave from 'arweave-js/dist/node/node';
import * as program from 'commander';
import * as mime from 'mime';
import chalk from 'chalk';
import * as promptly from 'promptly';
import { File } from './lib/file';
import { validateKeyComponents, isMaybeKey } from './lib/keys';

const cwd = process.cwd();

const log = console.log;

const arweave = Arweave.init({host: 'wallet-1.nodes.arweave.org', logging: false});

function quit(exitcode = 0){
    process.exit(exitcode);
}

function formatWinston(program: any, value: string): string{
    return program.winston ? value + ' Winston' : arweave.ar.winstonToAr(value) + ' AR';
}

log();
/**
 * Catch and handle some global events
 */
process
    .on('uncaughtException', function (error: Error) {
        log(chalk.redBright(''));
        log(chalk.redBright(error.message));
        log(chalk.redBright(''));
        quit(1);
    });

process
    .on('unhandledRejection', (reason, p) => {
        log(chalk.redBright(''));
        log(chalk.redBright(reason));
        log(chalk.redBright(''));
        quit(1);
    });

/**
* Change some commander default help options
*/
program
    .usage('\n  arweave-deploy [command] [options]')

program
    .on('--help', function(){
    log('')
    log('Examples:');
    log('  upload index.html --key keyfile.json ');
    log('  test index.html --key keyfile.json ');
    log('  balance --key keyfile.json ');
    log('')
    log('More help:');
    log(chalk.cyan('  https://docs.arweave.org/developers/tools/arweave-deploy\n'));
});
/**
 * Argument definitions
 */
program
    .option('--winston', 'Display winston values instead of AR.')


program
    .option('--content-type <mime_type>', 'Set the data content type manually', (value: string): string => {
        if (value.match(/.+\/.+/)) {
            return value;
        }
        throw new Error('--content-type: Invalid content-type, must be a valid mime type in the format of */*, e.g. text/html');
    })

program
    .option('--force-skip-confirmation', 'Skip warnings and confirmation and force upload.')

program
    .option('--force-skip-warnings', 'Skip warnings and disable safety checks.')

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
                    throw new Error(`--key: Failed to read Arweave key file: ${error.message}`);
                }
            }

            try {
                let decoded =  JSON.parse(data ? data : value);

                if (typeof decoded !== 'object') {
                    throw new Error('--key: Failed to parse Arweave key file');
                }

                // This will throw an exception if there's a validation error so no need to capture anything
                validateKeyComponents(decoded);

                return decoded;

            } catch (error) {
                throw new Error(`--key: Failed to parse Arweave key file: ${error.message}`);
            }

    })

/**
 * CLI commands
 */
program
    .command('balance')
    .description('Get the balance of your wallet.')
    .action(async () => {

        log(`${chalk.cyanBright('Arweave Deploy')} / Balance check`);
        log(``);

        let key = await program.key;

        if (!key) {
            throw new Error(`Arweave key required, try running this command again with '--key path/to/key/file.json'`);
        }

        let address = await arweave.wallets.jwkToAddress(key);

        let balance = await arweave.wallets.getBalance(address);

        log(`Address: ${address}`);
        log(`Balance: ${formatWinston(program, balance)}`);

    })

program
    .command('test <file_path>')
    .description('Test the deployment without committing anything')
    .action(async (path) => {

        log(`${chalk.cyanBright('Arweave Deploy')} / Test`);
        log(``);

        log(chalk.yellowBright('TEST MODE - Nothing will actually be uploaded as part of this process.'));
        log(``);

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

        const address = key ? await arweave.wallets.jwkToAddress(key) : null;

        const balance = key ? await arweave.wallets.getBalance(address) : null;

        const price = await arweave.transactions.getPrice(bytes);

        const balanceAfter = key ? arweave.ar.sub(balance, price): null;

        // The content-type tag value can be supplied by the user
        // this can be useful if the mime auto-detection fails for
        // whatever reason or the user wants to set another value.
        const type = program.contentType ? program.contentType : mime.getType(path);

        const transaction = await arweave.createTransaction({
            data: data,
            reward: price
        }, key);

        transaction.addTag('Content-Type', type);

        await arweave.transactions.sign(transaction, key);

        log(chalk.green(`File: ${path}`));
        log(`Type: ${type}`);
        log(`Size: ${File.bytesForHumans(bytes)}`);
        log(`Wallet address: ${address}`);
        log(`Price: ${formatWinston(program, price)}`);
        log(`Current balance: ${formatWinston(program, balance)}`);
        log(`Balance after uploading: ${formatWinston(program, balanceAfter)}`);

        if (!program.forceSkipWarnings && isMaybeKey(data)) {
            let confirmed = await promptly.confirm(chalk.redBright(`The data you're uploading looks like it might be a key file, are you sure you want to continue? Y/N (default: N)`));
            log(``);

            if (!confirmed) {
                throw new Error('Cancelled');
            }
        }

        log(`The URL for your file would be`);
        log(``);
        log(chalk.cyanBright(`http://arweave.net/${transaction.id}`));
        log(``);

    })

program
    .command('upload <file_path>')
    .description('Deploy a file to the weave')
    .action(async (path) => {

        log(`${chalk.cyanBright('Arweave Deploy')} / Upload`);
        log(``);
        
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

        const address = await arweave.wallets.jwkToAddress(key);

        const balance = await arweave.wallets.getBalance(address);

        const price = await arweave.transactions.getPrice(bytes);

        const balanceAfter = arweave.ar.sub(balance, price);

        // The content-type tag value can be supplied by the user
        // this can be useful if the mime auto-detection fails for
        // whatever reason or the user wants to set another value.
        const type = program.contentType ? program.contentType : mime.getType(path);

        const transaction = await arweave.createTransaction({
            data: data,
            reward: price
        }, key);


        transaction.addTag('Content-Type', type);

        await arweave.transactions.sign(transaction, key);

        log(`File: ${path}`);
        log(`Type: ${type}`);
        log(`Size: ${File.bytesForHumans(bytes)}`);
        log(`Wallet address: ${address}`);
        log(`Price: ${formatWinston(program, price)}`);
        log(`Current balance: ${formatWinston(program, balance)}`);
        log(`Balance after uploading: ${formatWinston(program, balanceAfter)}`);
        log(``);

        if (arweave.ar.isLessThan(balance, price)) {
            throw new Error(`Insufficient balance`);
        }

        if (!program.forceSkipWarnings && isMaybeKey(data)) {
            let confirmed = await promptly.confirm(chalk.redBright(`The data you're uploading looks like it might be a key file, are you sure you want to continue? Y/N (default: N)`));
            log(``);

            if (!confirmed) {
                throw new Error('Cancelled');
            }
        }

        if (!program.forceSkipConfirmation ) {

            const confirmed = await promptly.prompt(chalk.green(`Carefully check the above details are correct, then Type CONFIRM to complete this upload`));
            log(``);

            if (confirmed !== 'CONFIRM') {
                throw new Error(`Upload cancelled`);
            }
        }

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

        log(`Your file is deploying! 🚀`);
        log(`Once your file is mined into a block it'll be available on the following URL`);
        log(``);
        log(chalk.cyanBright(`http://arweave.net/${transaction.id}`));
        log(``);
    })

if (!process.argv.slice(2).length) {
    program.help();
}

program.parse(process.argv);