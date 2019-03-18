import { Command } from '../command';
import { File } from '../lib/file';
import { PrepareTransactionOptions, parseData } from '../lib/TransactionBuilder';
import { resolve } from 'path';
import chalk from 'chalk';
import { logo } from '../ascii';
import {inspect} from 'util';
import * as http from 'http';
import * as url from 'url';
import { HtmlParser } from '../parsers/text-html';
import { watch, Stats } from 'fs';

import { Source, subResource } from '../lib/inline-source-context';
import * as WebSocket from 'ws';
interface Build {
    output: Buffer,
    report: BuildInfo
}

interface BuildInfo{
    timestamp: number
    entry: {
        name: string
        path: string
        size: {
            bytes: number
        }
    },
    size: {
        bytes: number
    },
    sources: Source[]
}

interface Session{
    status: {
        buildInProgress: boolean
    }
    build?: Build
}

function readData(stream: http.IncomingMessage){
    const chunks: Buffer[] = [];

    return new Promise((resolve, reject) => {
        stream.on("data", function (chunk: Buffer) {
            chunks.push(chunk);
        });
    
        // Send the buffer or you can put it into a var
        stream.on("end", function () {
            resolve(Buffer.concat(chunks));
        });
    });
}

export class ServeCommand extends Command {

    public signature = 'serve <file_path>';

    public description = 'Serve a web app';

    private wss: WebSocket.Server;

    private session: Session = {
        status: {
            buildInProgress: false
        }
    };

    async action(path: string) {

        const inputFile = new File(path, this.cwd);

        this.consoleLog(`Watching application directory for changes: ${inputFile.getDirectory()}`);

        watch(inputFile.getDirectory(), {recursive: true}, (event: string, filename: string) => {
            this.consoleLog(`File changed: ${filename}`);

            if (!this.session.status.buildInProgress) {
                this.startBuild(inputFile);
            }
        });

        const port = this.arweave.api.config.port;

        if (!inputFile.exists()) {
            throw new Error(`File not found: ${path}`);
        }

        this.arweave.api.config.logging = true;

        this.arweave.api.config.logger = (message: string) => {
            this.consoleLog(`[request proxy] ${message}`)
        };

        const server = http.createServer((request: http.IncomingMessage, response: http.ServerResponse): void => {
            this.onRequest(inputFile, request, response);
        });

        this.wss = new WebSocket.Server({ port: 1985, server: server });

        this.wss.on('connection', (ws: WebSocket) => {
            ws.on('message', (message: WebSocket.Data) => {
                this.wsOnMessage(ws, message);
            });
            ws.on('error', (error: Error) => {
                this.consoleLog('ws:error', {error: error});
            });
        });


        server.on('error', (error: Error) => {
            this.consoleLog('Error!', {error: error});
        });

        server.on('listening', () => {
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
                chalk.cyan(`https://docs.arweave.org/developers/tools/arweave-deploy/development-server`)
            ]);
        });

        server.listen(port);

        this.startBuild(inputFile);

        await new Promise(resolve => {
            server.on('close', () => {
                this.consoleLog('Stopping server...');
                resolve();
            })
        });
    }

    protected async wsPush(message: any, ws?: WebSocket){
        console.log('wsPush:message', message);
        if (ws) {
            ws.send(JSON.stringify(message));
            return;
        }
        this.wss.clients.forEach((ws: WebSocket) => {
            ws.send(JSON.stringify(message));
        });
    }

    protected async wsOnMessage(ws: WebSocket, message:WebSocket.Data){
        let request = JSON.parse(<string>message);
        if (request.action == 'build.get') {
            this.wsPush({action: 'build.new', data: this.session.build ? this.session.build.report : {}})
        }
    }

    protected async onRequest(inputFile: File, request: http.IncomingMessage, response: http.ServerResponse){

        this.consoleLog(`Incoming request: ${request.url}`);

        if (request.url.match(/^\/app$/i)) {
            return this.onAppServeRequest(inputFile, request, response);
        }

        if (request.url.match(/^\/build$/i)) {
            return this.onBuildUIRequest(inputFile, request, response);
        }

        if (request.url.match(/^\/favicon.ico$/i)) {
            return this.onFaviconRequest(inputFile, request, response);
        }

        return this.onProxyRequest(inputFile, request, response);
    }

    protected async startBuild(inputFile: File): Promise<void>{
        this.session.status.buildInProgress = true;
        try {
            this.consoleLog(`Starting build...`);
            this.wsPush({action: 'build.starting'});
            this.session.build = await this.newBuild(inputFile);
            this.consoleLog(`Build complete!`);
            this.wsPush({action: 'build.new', data: this.session.build.report});
        } catch (error) {
            this.session.status.buildInProgress = false;
            this.consoleLog(`Build error: ${error}`);
            throw error;
        }
        this.session.status.buildInProgress = false;
    }


    protected async onAppServeRequest(inputFile: File, request: http.IncomingMessage, response: http.ServerResponse): Promise<void>{
        try {
            const assetsDir = resolve('./src/assets/');
            const reloadScript = new File('inject.js', assetsDir);
            const reloadSrc = await reloadScript.read();

            response.writeHead(200, {'Content-Type': 'text/html'});
            response.write(this.session.build ? this.session.build.output : '');
            response.write(reloadSrc);
    
            response.end();

        } catch (error) {
            this.wsPush({action: 'build.failed'});
            this.log(`Failed to process file: ${inputFile.getPath()}`);
            this.log(error);
        }
    }

    protected async newBuild(inputFile: File): Promise<Build> {

        const packaged = await (new HtmlParser()).build(inputFile, {package: true});
        const output = Buffer.from(packaged.html);

        this.consoleLog(`Successfully built: ${inputFile.getPath()}`, {
            data: {
                type: 'text/html',
                size: File.bytesForHumans(output.byteLength),
                bytes: output.byteLength,
            }
        });

        const buidlIsValid = packaged.sources.reduce((carry: boolean, current: Source) => carry && !current.errored, true);

        const refs = {
            external: packaged.sources.reduce((carry: number, current: Source) => {

                let remotes = carry + (current.isRemote ? 1 : 0);

                if (current.subResources) {
                    remotes += current.subResources.reduce((carry: number, current: subResource) => (carry + (current.isRemote ? 1 : 0)), 0)
                }

                return remotes;
            }, 0)
        };

        return {
            output: output,
            report: {
                timestamp: Date.now(),
                entry: {
                    name: inputFile.getName(),
                    path: inputFile.getPath(),
                    size: {
                        bytes: (await inputFile.info()).size
                    }
                },
                size: {
                    bytes: output.byteLength,
                },
                sources: packaged.sources,
            }
        }
    }

    protected async onBuildAPIRequest(inputFile: File, request: http.IncomingMessage, response: http.ServerResponse): Promise<void>{

        let parsedUrl = url.parse(request.url);

        if (parseData) {
            
        }

        response.writeHead(200, {'Content-Type': 'application/json'});

        response.write(Buffer.from(JSON.stringify(this.session.build || {}, (key: any, value: any) => {
            if (value instanceof Error) {
                return value.message;
            }
            return value;
        })));


        response.end();
    }

    protected async onBuildUIRequest(inputFile: File, request: http.IncomingMessage, response: http.ServerResponse): Promise<void>{

        const assetsDir = resolve('./src/assets/');

        // console.log('assetsDir', assetsDir);

        const errorPage = new File('ui.html', assetsDir);

        const src = await errorPage.read();

        response.writeHead(200, {'Content-Type': 'text/html'});

        response.write(src);

        response.end();
    }

    protected async onProxyRequest(inputFile: File, request: http.IncomingMessage, response: http.ServerResponse): Promise<void>{

        let proxyResponse = {
            headers: <http.OutgoingHttpHeaders>{},
            data: Buffer.alloc(0),
            status: 500
        };

        const data = await readData(request);

        try {
            const arweaveResponse = await this.arweave.api.request().request({
                method: request.method,
                // Substring to remove the initial / otherwise the url will get mapped to host.net//rest-of-url
                url: request.url.substring(1),
                responseType: 'arraybuffer',
                data: data
            });

            proxyResponse = {
                headers: arweaveResponse.headers,
                status: arweaveResponse.status,
                data: arweaveResponse.data,
            }
        } catch (error) {
            this.consoleLog(`Error on proxy request: ${error.response.status}`)

            // console.error(error);
            // inspect(error);

            if (error.response) {
                proxyResponse = {
                    headers: error.response.headers,
                    status: error.response.status,
                    data: error.response.data,
                }
            }
        }

        response.writeHead(proxyResponse.status, proxyResponse.headers);
        response.write(proxyResponse.data);
        response.end();
    }

    protected async onFaviconRequest(inputFile: File, request: http.IncomingMessage, response: http.ServerResponse): Promise<void>{
        const assetsDir = resolve('./src/assets/');

        const icon = new File('favicon.ico', assetsDir);

        const data = await icon.read();

        const contentType = await icon.getType();

        response.writeHead(200, {'Content-Type': contentType});
        response.write(data);
        response.end();
    }

    protected consoleLog(message: string, additional: {error?: Error, data?: any} = {}): void{
        console.log(`${new Date().toISOString().substr(11, 8)} [arweave serve] ${message}`);
        if (additional.data) {
            console.log(additional.data);
        }
        if (additional.error) {
            console.error(additional.error);
        }
    }

}
