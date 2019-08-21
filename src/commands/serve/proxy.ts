import { IncomingMessage } from 'http';
import { Session } from '.';
import { Response } from './router';
import { readIncomingMessageData } from './helpers';

export async function proxyRequestHandler(request: IncomingMessage, { arweave, log }: Session): Promise<Response> {
    const data = await readIncomingMessageData(request);

    try {
        const arweaveResponse = await arweave.api.request().request({
            method: request.method,
            // Substring to remove the initial / otherwise the url will get mapped to host.net//rest-of-url
            url: request.url.substring(1),
            responseType: 'arraybuffer',
            data: data,
        });

        return {
            headers: arweaveResponse.headers,
            status: arweaveResponse.status,
            body: arweaveResponse.data,
        };
    } catch (error) {
        log(`Error on proxy request: ${error.response.status}`);

        if (error.response) {
            return {
                headers: error.response.headers,
                status: error.response.status,
                body: error.response.data,
            };
        }
    }
}
