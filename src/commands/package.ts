import { Command } from '../command';
import { File } from '../lib/file';
import { PrepareTransactionOptions, parseData } from '../lib/TransactionBuilder';
import Transaction, { Tag } from 'arweave/node/lib/transaction';

export class PackageCommand extends Command {

    public signature = 'package <file_path> <packaged_output_path>';

    public description = 'Package a web app into a single file';

    public options = [
        {
            signature: '--force-skip-warnings',
            description: 'Skip warnings and disable safety checks',
        }
    ];

    async action(path: string, outputPath: string) {

        const file = new File(path, this.cwd);

        const options: PrepareTransactionOptions = {
            package: true,
            warnings: !this.context.forceSkipWarnings,
        };

        if (this.context.debug) {
            options.logger = this.print;
        }

        const {data, parser} = await parseData(file, options);

        if (parser && parser.description) {
            this.print(`Optimisations\n - ${parser.description}`);
        }

        const output = new File(outputPath, this.cwd);

        await output.write(data);

        this.print(`Packaged data saved to: ${output.getPath()}`);
    }

    /**
     * Gets the tags from a transaction and returns them
     * as a single object with tag names as keys. E.g.
     * 
     * {
     *   'Content-Type': 'text/html',
     *   'User-Agent': 'ArweaveDeploy/x.x.x'
     * }
     *
     * @private
     * @param {Transaction} transaction
     * @returns {{ [key: string]: string }}
     * @memberof DeployCommand
     */
    public getTags(transaction: Transaction): { [key: string]: string }{

        let tags: { [key: string]: string } = {};

        transaction.tags.forEach((tag: Tag) => {
            const decoded = {
                name: tag.get('name', { decode: true, string: true }),
                value: tag.get('value', { decode: true, string: true }),
            };

            tags[decoded.name] = decoded.value;
        });

        return tags;
    }

    protected async post(transaction: Transaction){
       
    }

    /**
     * Get tags as a formatted string.
     * 
     *  - Tag-Name: Tag Value
     *  - Tag-Name-2: Tag Value 2
     *  - Tag-Name-3: Tag Value 3
     *
     * @private
     * @param {Transaction} transaction
     * @returns {string}
     * @memberof DeployCommand
     */
    protected formatTags(transaction: Transaction): string {
        const tags = this.getTags(transaction);

        return Object.keys(tags).map((key: string): string => {
            return ` - ${key}: ${tags[key]}`;
        }).join('\n');
    }

}
