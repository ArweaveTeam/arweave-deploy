import { JWKInterface } from "arweave/node/lib/wallet";
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { File, appDirectoryPath } from "./file";

export function validateKeyComponents(obj: any): void {

    const expected = ['kty', 'n', 'e', 'd', 'p', 'q', 'dp', 'dq', 'qi'];

    expected.forEach(element => {
        if (obj.hasOwnProperty(element)) {
            if (typeof obj[element] !== 'string') {
                throw new Error(`Invalid field type: ${element}, expected a string value, got ${typeof obj[element]}`);
            }
        } else {
            throw new Error(`Arweave key missing required field: ${element}`);
        }
    });

    if (obj.kty !== 'RSA') {
        throw new Error(`Invalid key type (kty), expected RSA, got ${obj.kty}`);
    }

    if (obj.e !== 'AQAB') {
        throw new Error(`Invalid public expotent value, expected AQAB, git ${obj.e}`);
    }

    if (obj.n.length != 683) {
        throw new Error(`Invalid public key modulus (n) length, expected 683 characters (4098 bits), got ${obj.n.length}`);
    }

    if (obj.d.length != 683) {
        throw new Error(`Invalid private key exponent (d) length, expected 683 characters (4098 bits), got ${obj.d.length}`);
    }
}

/**
 *Check if a data string looks like it might be a key file
 *
 * @export
 * @param {string} data
 * @returns {boolean}
 */
export function isMaybeKey(data: string): boolean {
    try {
        const expected = ['kty', 'n', 'e', 'd', 'p', 'q', 'dp', 'dq', 'qi'];

        let decoded = JSON.parse(data);

        if (decoded && typeof decoded == 'object') {
            for (let index = 0; index < expected.length; index++) {
                const key = expected[index];
                if (decoded.hasOwnProperty(key)) {
                    return true;
                }
            }
        }

        return false;
    } catch (error) {
        return false;
    }
}


async function recall(): Promise<{ address: string, encrypted: string }> {
    const path = keyFilePath();

    const file = new File(path);

    if (!await file.exists()) {
        return;
    }

    const data = (await file.read()).toString();

    const decoded = JSON.parse(data);

    return {
        address: decoded.address,
        encrypted: decoded.key
    };
}

export async function recallKeyAddress(): Promise<string> {
    const data = await recall();

    if (data) {
        return data.address;
    }
}

export async function recallKey(passphrase: string): Promise<JWKInterface> {

    if (!passphrase) {
        throw new Error('Passphrase is empty');
    }

    const data = await recall();

    const decrypted = decrypt(Buffer.from(data.encrypted, 'base64'), passphrase);

    return JSON.parse(decrypted.toString());
}

export async function remember(key: JWKInterface, address: string, passphrase: string): Promise<void> {

    if (!passphrase) {
        throw new Error('Passphrase is empty');
    }

    const path = keyFilePath();

    const file = new File(path);

    const data = {
        address: address,
        key: encrypt(Buffer.from(JSON.stringify(key)), passphrase).toString('base64')
    };

    await file.write(Buffer.from(JSON.stringify(data)), {encoding: 'utf8'});
}

export async function forget(): Promise<void> {

    const path = keyFilePath();

    const file = new File(path);

    await file.delete();
}



function keyFilePath(): string {
    return path.resolve(appDirectoryPath(), 'key.json');
}


export function encrypt(data: Buffer, passphrase: string): Buffer {

    const key = crypto.pbkdf2Sync(passphrase, 'salt', 100000, 32, 'sha256')

    const algorithm = 'aes-256-cbc';

    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(algorithm, key, iv);

    const encrypted = Buffer.concat([iv, cipher.update(data), cipher.final()])

    return encrypted;
}


export function decrypt(encrypted: Buffer, passphrase: string): Buffer {
    try {
        const algorithm = 'aes-256-cbc';

        const key = crypto.pbkdf2Sync(passphrase, 'salt', 100000, 32, 'sha256')

        const iv = encrypted.slice(0, 16);

        const data = encrypted.slice(16);

        const decipher = crypto.createDecipheriv(algorithm, key, iv);

        const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);

        return decrypted;
    } catch (error) {
        throw new Error('Failed to decrypt')
    }
}


export async function loadFromFile(path: string, cwd: string) {

    const file = new File(path, cwd);

    if (!await file.exists()) {
        throw new Error(`File at path ${path} not found`);
    }

    let data = '';

    try {
        data = (await file.read({ encoding: 'utf-8' })).toString();
    } catch (error) {
        throw new Error(`Failed to read Arweave key file: ${error.message}`);
    }

    if (!data) {
        throw new Error(`Failed to read Arweave key file`);
    }

    try {
        const decoded = JSON.parse(data);

        if (typeof decoded !== 'object') {
            throw new Error('Failed to parse Arweave key file, the file format is invalid');
        }

        validateKeyComponents(decoded);

        return decoded;
    } catch (error) {
        throw new Error('Failed to parse Arweave key file, the file format is invalid');
    }
}