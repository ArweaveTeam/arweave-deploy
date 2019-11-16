import Arweave from 'arweave/node';
import chalk from 'chalk';
import { Command } from 'commander';
import { BalanceCommand } from './commands/balance';
import { DeployCommand } from './commands/deploy';
import { DeployDirCommand } from './commands/deploy-dir';
import { SendCommand } from './commands/send';
import { NetworkInfoCommand } from './commands/network-info';
import { StatusCommand } from './commands/status';

import { logo } from './ascii';
import { KeyCreateCommand } from './commands/key-create';
import { KeyForgetCommand } from './commands/key-forget';
import { KeySaveCommand } from './commands/key-save';
import { KeyExportCommand } from './commands/key-export';
import { KeyInspectCommand } from './commands/key-inspect';
import { PackageCommand } from './commands/package';

declare var __VERSION__: string;

const cwd = process.cwd();

const log = console.log;

const arweave = Arweave.init({
    host: 'arweave.net',
    port: 443,
    protocol: 'https',
    timeout: 20000,
    logging: false,
    logger: log,
});

const commands = [
    new DeployCommand(arweave, cwd, log),
    new DeployDirCommand(arweave, cwd, log),
    new SendCommand(arweave, cwd, log),
    new StatusCommand(arweave, cwd, log),
    new BalanceCommand(arweave, cwd, log),
    new NetworkInfoCommand(arweave, cwd, log),
    new KeyCreateCommand(arweave, cwd, log),
    new KeySaveCommand(arweave, cwd, log),
    new KeyExportCommand(arweave, cwd, log),
    new KeyForgetCommand(arweave, cwd, log),
    new KeyInspectCommand(arweave, cwd, log),
    new PackageCommand(arweave, cwd, log),
];

const cli = new Command();

cli.option('-v --version', 'Show the version number', (): void => {
    log(__VERSION__);
    quit(0);
});

cli.option('--host <hostname_or_ip>', 'Set the network hostname to use', (host: string): void => {
    arweave.api.getConfig().host = host;
    /**
     * Arguments are parsed in the order they're defined here, so if the user changes the hostname away
     * from the default (arweave.net), then we should reset the protocol and port to the network
     * defaults.
     */
    arweave.api.getConfig().protocol = 'http';
    arweave.api.getConfig().port = '1984';
});

cli.option('--protocol <protocol>', 'Set the protocol to use (http or https)', (protocol: string): void => {
    arweave.api.getConfig().protocol = protocol;
});

cli.option('--port <port_number>', 'Set the network port to use', (port: string): void => {
    arweave.api.getConfig().port = port;
});

cli.option('--timeout <milliseconds>', 'Set the network request timeout', (timeout: string): void => {
    if (!Number(timeout)) {
        throw new Error('Invalid --timeout option, expected integer');
    }
    arweave.api.getConfig().timeout = Number(timeout);
});

cli.option('--key-file <key_file_path>', 'Path to an Arweave key file', (path: string): string => {
    return path;
});

cli.option('--winston', 'Display winston values instead of AR');

cli.option('--debug', 'Enable additional logging', (): void => {
    arweave.api.getConfig().logging = true;
});

commands.forEach(command => {
    const instance = cli.command(command.getSignature());

    instance.description(command.getDescription());

    const options = command.getOptions();

    options.forEach(option => {
        instance.option(option.signature, option.description, option.action);
    });

    /**
     * We need to intercept and manually invoke the handler
     * with the correct context.
     */
    instance.action((...args) => {
        if (cli.debug) {
            log('Loaded config:');
            log(JSON.stringify(arweave.api.getConfig(), null, 4));
        }

        command.action
            .apply(command, [...args])
            .then(() => {
                quit(0);
            })
            .catch((error: any) => {
                log(chalk.redBright(error.message));
                if (cli.debug && error.stack) {
                    log(chalk.redBright(''));
                    log(chalk.redBright(error.stack));
                }
                quit(1);
            });
    });

    command.setContext(instance);
});

function quit(exitcode = 0) {
    process.exit(exitcode);
}

/**
 * Catch and handle some global events
 */
process.on('uncaughtException', function(error: Error) {
    log(chalk.redBright(error.message));
    if (cli.debug && error.stack) {
        log(chalk.redBright(''));
        log(error.stack);
    }
    quit(1);
});

process.on('unhandledRejection', (reason: any, p) => {
    log(chalk.redBright(reason));
    if (cli.debug && reason.stack) {
        log(chalk.redBright(''));
        log(reason.stack);
    }
    quit(1);
});

cli.on('--help', function() {
    log('');
    log('Examples:');
    log('  Without a saved key file');
    log('    arweave deploy index.html --key-file path/to/my/keyfile.json');
    log('    arweave save-key --key-file path/to/my/keyfile.json');
    log('    arweave balance --key-file path/to/my/keyfile.json');
    log('  With a saved key file');
    log('    arweave deploy index.html');
    log('    arweave balance');
    log('');
    log('Command specific options and flags:');
    log(chalk.green('  arweave {command} --help, e.g. arweave deploy --help'));
    log('');
    log('More help:');
    log(chalk.cyan('  https://github.com/arweaveTeam/arweave-deploy\n'));
});

// error on unknown commands
cli.on('command:*', function() {
    cli.help();
});

if (!process.argv.slice(2).length) {
    log(chalk.cyan(logo()));
    cli.help();
}

cli.parse(process.argv);
