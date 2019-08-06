import { IncomingMessage } from 'http';

export function readIncomingMessageData(stream: IncomingMessage): Promise<Buffer> {
    const chunks: Buffer[] = [];

    return new Promise((resolve, reject) => {
        stream.on('data', function(chunk: Buffer) {
            chunks.push(chunk);
        });

        stream.on('end', function() {
            resolve(Buffer.concat(chunks));
        });
    });
}

export async function streamToJson(stream: IncomingMessage): Promise<object> {
    return JSON.parse((await readIncomingMessageData(stream)).toString());
}
