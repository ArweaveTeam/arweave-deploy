import * as Arweave from 'arweave/dist/node/node';
import chalk from 'chalk';
import * as cli from 'commander';
import { BalanceCommand } from './commands/balance';
import { DeployCommand } from './commands/deploy';
import { InspectWalletCommand } from './commands/inspect-wallet';
import { NetworkInfoCommand } from './commands/network-info';
import { StatusCommand } from './commands/status';
import { WalletForgetCommand } from './commands/wallet-forget';
import { WalletGenerateCommand } from './commands/wallet-generate';
import { WalletRememberCommand } from './commands/wallet-remember';



const host = 'arweave.net';

const port = 1984;

const cwd = process.cwd();

const log = console.log;

const arweave = Arweave.init({ host: host, port: port, logging: true });

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
    .option('--host <hostname_or_ip>', 'Set the network hostname to use', (host: string): void => {
        arweave.api.getConfig().host = host;
    })

cli
    .option('--port <port_number>', 'Set the network port to use', (port: string): void => {
        arweave.api.getConfig().port = port;
    })

cli
    .option('--key-file <key_file_path>', 'Path to an Arweave key file', (path: string): string => {
        return path;
    })


commands.forEach(instance => {

    const context = cli.command(instance.getSignature());

    context.description(instance.getDescription());

    const options = instance.getOptions();

    options.forEach((option) => {
        context.option(option.signature, option.description, option.action)
    });

    /**
     * We need to intercept and manually invoke the handler
     * with the correct context.
     */
    context.action((...args) => {
        instance.action.apply(instance, [...args])
    });

    instance.setContext(context);
});

function quit(exitcode = 0) {
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
    .on('--help', function () {
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
