import { Command } from '../../command';
import { File } from '../../lib/file';
import chalk from 'chalk';
import { logo } from '../../ascii';
import { IncomingMessage, ServerResponse, createServer, Server } from 'http';
import { HtmlParser } from '../../parsers/text-html';
import { watch } from 'fs';

import { Source } from '../../lib/inline-source-context';
import Arweave from 'arweave/node';
import { httpRequestHandler } from './router';
import { initStore } from './store';
import { getDevWallets, loadConfig, ServeConfig } from './config';

export interface Session {
    arweave: Arweave;
    status: {
        buildInProgress: boolean;
    };
    build: Build | null;
    log: Function;
    input: File | null;
    config: ServeConfig;
}

interface Build {
    output: Buffer;
    report: BuildInfo;
}

interface BuildInfo {
    timestamp: number;
    entry: {
        name: string;
        path: string;
        size: {
            bytes: number;
        };
    };
    size: {
        bytes: number;
    };
    sources: Source[];
}

export class ServeCommand extends Command {
    public signature = 'serve <file_path>';

    public description = 'Serve a web app using the Arweave deploy dev server';

    public options = [
        {
            signature: '--serve-config <path_to_config>',
            description: 'Serve config',
        },
        {
            signature: '--package',
            description: 'Package and optimise JS + CSS assets',
        },
    ];

    async action(path: string): Promise<void> {
        const serveConfig = await loadConfig(new File(this.context.serveConfig, this.cwd));

        const session: Session = newSession(this.arweave, serveConfig);

        const inputFile = new File(path, this.cwd);

        if (!inputFile.exists()) {
            throw new Error(`File not found: ${path}`);
        }

        session.log(`Watching application directory for changes: ${inputFile.getDirectory()}`);

        await initStore(this.arweave, getDevWallets(serveConfig));

        const server = createHttpServer(serveConfig.port || 1984, session);

        watch(inputFile.getDirectory(), { recursive: true }, (event: string, filename: string) => {
            session.log(`File changed: ${filename}`);

            if (!session.status.buildInProgress) {
                startBuild(inputFile, !!this.context.package, session);
            }
        });

        this.arweave.api.config.logging = true;

        this.arweave.api.config.logger = (message: string) => {
            session.log(`[request proxy] ${message}`);
        };

        startBuild(inputFile, !!this.context.package, session);

        await new Promise(resolve => {
            server.on('close', () => {
                session.log('Stopping server...');
                resolve();
            });
        });
    }

    protected showStartupInfo(port: number) {
        this.print([
            chalk.cyan(logo()),
            ``,
            ``,
            `Arweave local development server`,
            ``,
            `Arweave API proxy:`,
            chalk.cyanBright(` - http://localhost:${port}`),
            ``,
            `Your application`,
            chalk.cyanBright(` - http://localhost:${port}/app`),
            ``,
            `Server ready and waiting for connections...`,
            ``,
            `Now let's build something great! 🚀`,
            ``,
            `Need help?`,
            chalk.cyan(`https://docs.arweave.org/developers/tools/arweave-deploy/development-server`),
        ]);
    }
}

function newSession(arweave: Arweave, config: ServeConfig): Session {
    return {
        arweave: arweave,
        status: {
            buildInProgress: false,
        },
        log: (message: string, additional: { error?: Error; data?: any } = {}): void => {
            console.log(`${new Date().toISOString().substr(11, 8)} [arweave serve] ${message}`);
            if (additional.data) {
                console.log(additional.data);
            }
            if (additional.error) {
                console.error(additional.error);
            }
        },
        input: null,
        build: null,
        config: config,
    };
}

function createHttpServer(port: number, session: Session): Server {
    const server = createServer((request: IncomingMessage, response: ServerResponse): void => {
        httpRequestHandler(request, response, session);
    });

    server.listen(port);

    return server;
}

async function createBuild(inputFile: File, enablePackaging: boolean): Promise<Build> {
    const packaged = await new HtmlParser().build(inputFile, {
        package: enablePackaging,
    });

    const output = Buffer.from(packaged.html);

    return {
        output: output,
        report: {
            timestamp: Date.now(),
            entry: {
                name: inputFile.getName(),
                path: inputFile.getPath(),
                size: {
                    bytes: (await inputFile.info()).size,
                },
            },
            size: {
                bytes: output.byteLength,
            },
            sources: packaged.sources,
        },
    };
}

async function startBuild(inputFile: File, enablePackaging: boolean, session: Session): Promise<void> {
    session.status.buildInProgress = true;
    try {
        session.log(`Starting build...`);
        session.build = await createBuild(inputFile, enablePackaging);
        session.log(`Successfully built: ${inputFile.getPath()}`);
    } catch (error) {
        session.log(`Build error: ${error}`);
    } finally {
        session.status.buildInProgress = false;
    }
}
