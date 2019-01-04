// Output an object containing the given `access` and `decrypt` keys given the 
// input name.
import * as crypto from 'crypto';
export function parseName(raw_name) {
    let parts = raw_name.split('.');
    let name = parts[0];
    let hash_count = Math.pow(2, parseInt(parts[1]));
    let hash = crypto.createHash('sha256').update(name);

    for(let i = 0; i < hash_count; i++) {
        hash.update(name);
    }
    
    let total_buffer = hash.digest();

    let silo_ref = {};
    silo_ref.access = total_buffer.slice(0, 15);
    silo_ref.decrypt = total_buffer.slice(16, 31);
    return silo_ref;
}