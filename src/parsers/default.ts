import { File } from '../lib/file';
import { ContentParserInterface, PrepareTransactionOptions } from '../lib/TransactionBuilder';
import { isMaybeKey } from '../lib/keys';

export class DefaultParser implements ContentParserInterface {

    public description = '';

    async run(entry: File, options: PrepareTransactionOptions = {}) {

        const data = await entry.read();

        if (isMaybeKey(data.toString())) {
            throw new Error(`The data you're uploading looks like it might be a key file. Use --force-skip-warnings to ignore this.`);
        }

        return data;
    }
}
