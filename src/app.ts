import * as Arweave from 'arweave-js/dist/node/node';
import chalk from 'chalk';
import * as cli from 'commander';
import { BalanceCommand } from './commands/balance';
import { DeployCommand } from './commands/deploy';
import { InspectWalletCommand } from './commands/inspect-wallet';
import { NetworkInfoCommand } from './commands/network-info';
import { StatusCommand } from './commands/status';
import { WalletForgetCommand } from './commands/wallet-forget';
import { WalletGenerateCommand } from './commands/wallet-generare';
import { WalletRememberCommand } from './commands/wallet-remember';


const host = 'arweave.net';

const port = 1984;

const cwd = process.cwd();

const log = console.log;

const arweave = Arweave.init({host: host, port: port, logging: false});

const commands = [
    new DeployCommand(arweave, cwd, log),
    new StatusCommand(arweave, cwd, log),
    new BalanceCommand(arweave, cwd, log),
    new NetworkInfoCommand(arweave, cwd, log),
    new WalletRememberCommand(arweave, cwd, log),
    new WalletForgetCommand(arweave, cwd, log),
    new WalletGenerateCommand(arweave, cwd, log),
    new InspectWalletCommand(arweave, cwd, log),
];

cli
    .option('--winston', 'Display winston values instead of AR')

cli
    .option('--force-skip-confirmation', 'Skip warnings, confirmations, and force upload')

cli
    .option('--force-skip-warnings', 'Skip warnings and disable safety checks')

cli
    .option('--host <hostname_or_ip>', 'Set the network hostname to use', (host: string): void => {
        arweave.api.getConfig().host = host;
    })

cli
    .option('--port <port_number>', 'Set the network port to use', (port: string): void => {
        arweave.api.getConfig().port = port;
    })

cli
    .option('--key-file <key_file_path>', 'Path to an Arweave key file', (path: string) : string => {
        return path;
    })

cli
    .option('--content-type <mime_type>', 'Set the data content type manually', (value: string): string => {
        if (value.match(/.+\/.+/)) {
            return value;
        }
        throw new Error('--content-type: Invalid content-type, must be a valid mime type in the format of */*, e.g. text/html');
    })

cli
    .option('--silo <silo_name>', 'Deploy with Silo using this name.', (value: string): string => {
        if (value.match(/[a-zA-Z0-9]+\.[0-9]+/)) {
            return value;
        }
        throw new Error('--silo: Invalid Silo name, must be a name in the format of [a-zA-Z0-9]+.[0-9]+, e.g. \'bubble.7\'');
    })

commands.forEach( instance => {

    const context = cli.command(instance.signature);

    context.description(instance.description);

    /**
     * We need to intercept and manually invoke the handler
     * with the correct context.
     */
    context.action((...args) => {
        instance.action.apply(instance, [...args])
    });

    instance.setContext(context);
});

function quit(exitcode = 0){
    process.exit(exitcode);
}

/**
 * Catch and handle some global events
 */
process
    .on('uncaughtException', function (error: Error) {
        log(chalk.redBright(error.message));
        log(chalk.redBright(''));
        log(error.stack);
        quit(1);
    });

process
    .on('unhandledRejection', (reason, p) => {
        log(chalk.redBright(reason));
        log(chalk.redBright(''));
        log(reason.stack);
        quit(1);
    });

cli
    .on('--help', function(){
        log('')
        log('Examples:');
        log('  arweave deploy index.html --key-file path/to/my/keyfile.json');
        log('  arweave remember-wallet --key-file path/to/my/keyfile.json');
        log('  arweave balance --key-file path/to/my/keyfile.json');
        log('')
        log('More help:');
        log(chalk.cyan('  https://docs.arweave.org/developers/tools/arweave-deploy\n'));
});

// error on unknown commands
cli.on('command:*', function () {
    cli.help();
  });

if (!process.argv.slice(2).length) {
    cli.help();
}

cli.parse(process.argv);
