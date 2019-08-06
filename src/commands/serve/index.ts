import { Command } from '../../command';
import { File } from '../../lib/file';
import { resolve } from 'path';
import chalk from 'chalk';
import { logo } from '../../ascii';
import { IncomingMessage, ServerResponse, createServer } from 'http';
import { HtmlParser } from '../../parsers/text-html';
import { watch } from 'fs';

import { Source } from '../../lib/inline-source-context';
import * as WebSocket from 'ws';
import Arweave from 'arweave/node';
import { matchRoute, Response } from './router';
import { initStore } from './store';

export interface Session {
    arweave: Arweave;
    status: {
        buildInProgress: boolean;
    };
    build: Build | null;
    log: Function;
    input: File | null;
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

    public description = 'Serve a web app';

    private wss: WebSocket.Server;

    private session: Session = {
        arweave: this.arweave,
        status: {
            buildInProgress: false,
        },
        log: this.consoleLog,
        input: null,
        build: null,
    };

    async action(path: string) {
        const inputFile = new File(path, this.cwd);

        if (!inputFile.exists()) {
            throw new Error(`File not found: ${path}`);
        }

        this.session.log(`Watching application directory for changes: ${inputFile.getDirectory()}`);

        watch(inputFile.getDirectory(), { recursive: true }, (event: string, filename: string) => {
            this.session.log(`File changed: ${filename}`);

            if (!this.session.status.buildInProgress) {
                this.startBuild(inputFile);
            }
        });

        const port = 1984;

        this.arweave.api.config.logging = true;

        this.arweave.api.config.logger = (message: string) => {
            this.session.log(`[request proxy] ${message}`);
        };

        await initStore(this.arweave);

        const server = createServer((request: IncomingMessage, response: ServerResponse): void => {
            this.onRequest(inputFile, request, response);
        });

        this.wss = new WebSocket.Server({ port: 1985, server: server });

        this.wss.on('connection', (ws: WebSocket) => {
            ws.on('message', (message: WebSocket.Data) => {
                this.wsOnMessage(ws, message);
            });
            ws.on('error', (error: Error) => {
                this.session.log('ws:error', { error: error });
            });
        });

        server.on('error', (error: Error) => {
            this.session.log('Error!', { error: error });
        });

        server.on('listening', () => {
            this.showStartupInfo(port);
        });

        server.listen(port);

        this.startBuild(inputFile);

        await new Promise(resolve => {
            server.on('close', () => {
                this.session.log('Stopping server...');
                resolve();
            });
        });
    }

    protected async wsPush(message: any, ws?: WebSocket) {
        console.log('wsPush:message', message);
        if (ws) {
            ws.send(JSON.stringify(message));
            return;
        }
        this.wss.clients.forEach((ws: WebSocket) => {
            ws.send(JSON.stringify(message));
        });
    }

    protected async wsOnMessage(ws: WebSocket, message: WebSocket.Data): Promise<void> {
        let request = JSON.parse(<string>message);
        if (request.action == 'build.get') {
            await this.wsPush({
                action: 'build.new',
                data: this.session.build ? this.session.build.report : {},
            });
        }
    }

    protected async onRequest(inputFile: File, request: IncomingMessage, response: ServerResponse): Promise<void> {
        this.session.log(`[request] ${request.url}`);

        const route = matchRoute(request.url);

        console.log(route);

        if (route) {
            const routeResponse = await route.apply(this, [request, this.session]);

            response.writeHead(routeResponse.status, routeResponse.headers);
            response.write(routeResponse.body);
            response.end();
            this.session.log(`[response]  ${routeResponse.status} - ${routeResponse.body.length} bytes`);
        }
    }

    protected async startBuild(inputFile: File): Promise<void> {
        this.session.status.buildInProgress = true;
        try {
            this.session.log(`Starting build...`);
            this.wsPush({ action: 'build.starting' });
            this.session.build = await this.newBuild(inputFile);
            this.session.log(`Build complete!`);
            this.wsPush({ action: 'build.new' });
        } catch (error) {
            this.session.status.buildInProgress = false;
            this.session.log(`Build error: ${error}`);
            throw error;
        }
        this.session.status.buildInProgress = false;
    }

    protected async onAppServeRequest(request: IncomingMessage, session?: Session): Promise<Response> {
        try {
            console.log('this', this);
            const assetsDir = resolve('./src/assets/');
            const reloadScript = new File('inject.js', assetsDir);
            const reloadSrc = await reloadScript.read();

            const appSrc = this.session.build ? this.session.build.output : Buffer.from('');

            return {
                status: 200,
                headers: {
                    'Content-Type': 'text/html',
                },
                body: Buffer.concat([appSrc, reloadSrc]),
            };
        } catch (error) {
            this.wsPush({ action: 'build.failed' });
            this.log(`Failed to process file: ${session.input.getPath()}`);
            this.log(error);
        }
    }

    protected async newBuild(inputFile: File): Promise<Build> {
        const packaged = await new HtmlParser().build(inputFile, {
            package: true,
        });
        const output = Buffer.from(packaged.html);

        this.session.log(`Successfully built: ${inputFile.getPath()}`, {
            data: {
                type: 'text/html',
                size: File.bytesForHumans(output.byteLength),
                bytes: output.byteLength,
            },
        });

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

    protected async onBuildAPIRequest(
        inputFile: File,
        request: IncomingMessage,
        response: ServerResponse,
        session?: Session,
    ): Promise<Response> {
        return {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
            },
            body: Buffer.from(
                JSON.stringify(this.session.build || {}, (key: any, value: any) => {
                    if (value instanceof Error) {
                        return value.message;
                    }
                    return value;
                }),
            ),
        };
    }

    protected async onBuildUIRequest(
        inputFile: File,
        request: IncomingMessage,
        response: ServerResponse,
        session?: Session,
    ): Promise<Response> {
        const assetsDir = resolve('./src/assets/');

        const uiFile = new File('ui.html', assetsDir);

        const uiSrc = await uiFile.read();

        return {
            status: 200,
            headers: {
                'Content-Type': 'text/html',
            },
            body: uiSrc,
        };
    }

    protected async onFaviconRequest(
        inputFile: File,
        request: IncomingMessage,
        response: ServerResponse,
        session?: Session,
    ): Promise<Response> {
        const assetsDir = resolve('./src/assets/');

        const icon = new File('favicon.ico', assetsDir);

        const data = await icon.read();

        const contentType = await icon.getType();

        return {
            status: 200,
            headers: {
                'Content-Type': contentType,
            },
            body: data,
        };
    }

    protected consoleLog(message: string, additional: { error?: Error; data?: any } = {}): void {
        console.log(`${new Date().toISOString().substr(11, 8)} [arweave serve] ${message}`);
        if (additional.data) {
            console.log(additional.data);
        }
        if (additional.error) {
            console.error(additional.error);
        }
    }

    protected showStartupInfo(port: number | string) {
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
            chalk.cyanBright(` - http://localhost:${port}/develop`),
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
