import * as crypto from 'crypto';

export class SiloReference {

    private access: Buffer;
    private decrypt: Buffer;

    constructor(name: string) {

        const parsed = name.match(/^([a-z0-9]+)\.([0-9]+)/i);

        if (!parsed) {
            throw new Error(`Invalid Silo name, must be a name in the format of [a-z0-9]+.[0-9]+, e.g. 'bubble.7'`);
        }

        const access = parsed[1];

        const hashCount = Math.pow(2, parseInt(parsed[2]));

        const digest = this.hash(access, hashCount);

        this.access = digest.slice(0, 15);
        this.decrypt = digest.slice(16, 31);
    }

    public getName(): string {
        return this.access.toString();
    }

    public getEncryptionKey(): string {
        return this.decrypt.toString();
    }

    private hash(input: string, rounds: number): Buffer {

        let digest = crypto.createHash('sha256').update(input).digest();

        for (let count = 0; count < (rounds - 1); count++) {
            digest = crypto.createHash('sha256').update(input).digest();
        }

        return digest;
    }
}
