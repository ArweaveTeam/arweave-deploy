export function validateKeyComponents(obj: any): void {

    const expected = ['kty', 'n','e','d','p','q','dp','dq','qi'];

    expected.forEach(element => {
        if (obj.hasOwnProperty(element)) {
            if (typeof obj[element] !== 'string') {
                throw new Error(`Invalid field type: ${element}, expected a string value, got ${typeof obj[element]}`);
            }
        }else{
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
        const expected = ['kty', 'n','e','d','p','q','dp','dq','qi'];

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