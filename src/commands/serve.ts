import { Command } from '../command';
import { File } from '../lib/file';
import { PrepareTransactionOptions, parseData } from '../lib/TransactionBuilder';
import { resolve } from 'path';
import chalk from 'chalk';
import { logo } from '../ascii';

import * as http from 'http';

export class ServeCommand extends Command {

    public signature = 'serve <file_path>';

    public description = 'Serve a web app';

    async action(path: string) {

        const inputFile = new File(path, this.cwd);

        const port = this.arweave.api.config.port;

        if (!inputFile.exists()) {
            throw new Error(`File not found: ${path}`);
        }
        
        this.arweave.api.config.logging = true;
        this.arweave.api.config.logger = (message: string) => {
            this.serveLog(`[request proxy] ${message}`)
        };

        const server = http.createServer((request: http.IncomingMessage, response: http.ServerResponse) => {
            this.onRequest(inputFile, request, response);
        });

        server.on('error', (error: Error) => {
            this.serveLog('Error!', {error: error});
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

        await new Promise(resolve => {
            server.on('close', () => {
                this.serveLog('Stopping server...');
                resolve();
            })
        });
    }

    protected async onRequest(inputFile: File, request: http.IncomingMessage, response: http.ServerResponse){

        this.serveLog(`Incoming request: ${request.url}`);

        if (request.url.match(/^\/develop/i)) {
            return this.onBuildRequest(inputFile, request, response);
        }

        if (request.url.match(/^\/favicon.ico$/i)) {
            return this.onFaviconRequest(inputFile, request, response);
        }

        return this.onProxyRequest(inputFile, request, response);
    }

    protected async onBuildRequest(inputFile: File, request: http.IncomingMessage, response: http.ServerResponse){

        this.serveLog(`Building: ${inputFile.getPath()}`);

        const options: PrepareTransactionOptions = {
            package: true,
        };

        try {
            const {data, contentType} = await parseData(inputFile, options);

            this.serveLog(`Successfully built: ${inputFile.getPath()}`, {
                data: {
                    type: contentType,
                    size: File.bytesForHumans(data.byteLength),
                    bytes: data.byteLength,
                }
            });

            response.writeHead(200, {'Content-Type': contentType});
            response.write(data);
            response.end();

        } catch (error) {
            this.log(`Failed to process file: ${inputFile.getPath()}`);
            this.log(error);
            this.onBuildError(error, request, response)
        }
    }



    protected async onBuildError(error: Error, request: http.IncomingMessage, response: http.ServerResponse){        

        console.log('Received error', error);

        const assetsDir = resolve('./src/assets/');

        console.log('assetsDir', assetsDir);

        const errorPage = new File('serve.error.html', assetsDir);

        const src = await errorPage.read();


        response.writeHead(200, {'Content-Type': 'text/html'});

        response.write(src);

        const injectError = `<script>document.getElementById('output').innerHTML = \`${error.stack}\`</script>`

        response.write(injectError);

        response.end();
    }

    protected async onProxyRequest(inputFile: File, request: http.IncomingMessage, response: http.ServerResponse){

        let proxyResponse = {
            headers: <http.OutgoingHttpHeaders>{},
            data: Buffer.alloc(0),
            status: 500
        };

        try {
            const arweaveResponse = await this.arweave.api.request().request({
                method: request.method,
                // Substring to remove the initial / otherwise the url will get mapped to host.net//rest-of-url
                url: request.url.substring(1),
                responseType: 'arraybuffer'
            });

            proxyResponse = {
                headers: arweaveResponse.headers,
                status: arweaveResponse.status,
                data: arweaveResponse.data,
            }
        } catch (error) {
            this.serveLog(`Error on proxy request: ${error.response.status}`)
            this.onBuildError(error, request, response);
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

    protected async onFaviconRequest(inputFile: File, request: http.IncomingMessage, response: http.ServerResponse){        
        const assetsDir = resolve('./src/assets/');

        const icon = new File('favicon.ico', assetsDir);

        const data = await icon.read();

        const contentType = await icon.getType();

        response.writeHead(200, {'Content-Type': contentType});
        response.write(data);
        response.end();
    }

    protected serveLog(message: string, additional: {error?: Error, data?: any} = {}): void{
        console.log(`${new Date().toISOString().substr(11, 8)} [arweave serve] ${message}`);
        if (additional.data) {
            console.log(additional.data);
        }
        if (additional.error) {
            console.error(additional.error);
        }
    }

}
