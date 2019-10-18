import Transaction from 'arweave/node/lib/transaction';
import { sync as globSync } from 'glob';
import { join, resolve } from 'path';
import { Command } from '../command';
import { File } from '../lib/file';
import chalk from 'chalk';
import { uploadTransactions } from '../lib/upload-progress-queue';

type transactionId = string;
type path = string;
declare var __VERSION__: string;

export interface Manifest {
    manifest: 'arweave/paths';
    version: '0.1.0';
    index?: {
        path: path;
    };
    paths: ManifestPathMap;
}

interface ManifestPathMap {
    [index: string]: { id: transactionId };
}

export class DeployDirCommand extends Command {
    public signature = 'deploy-dir <dir_path>';

    public description = 'Deploy a directory';

    public options = [
        {
            signature: '--ignore-index',
            description: 'Ignore index.html as the upload index',
        },
        {
            signature: '--force-skip-confirmation',
            description: 'Skip warnings, confirmations, and force upload',
        }
    ];

    async getAssets(cwd: string, basePath: string): Promise<{ path: string; file: File }[]> {
        const file = new File(basePath, cwd);

        if (!(await file.exists())) {
            throw new Error(`Path not found: ${await file.getPath()}`);
        }

        if (!(await file.info()).isDirectory()) {
            throw new Error(`Path is not a directory: ${await file.getPath()}`);
        }

        const resolvedBasePath =
            basePath.startsWith('~') || basePath.startsWith('/') ? resolve(basePath) : join(cwd, basePath);

        const paths = globSync('**/*', { cwd: resolvedBasePath, nodir: true });

        this.print([``, `Preparing files from ${resolvedBasePath}`]);

        return paths.map(path => {
            return {
                path: path,
                file: new File(path, resolvedBasePath),
            };
        });
    }

    async action(path: string) {
        const key = await this.getKey();

        const noIndex = this.context.ignoreIndex;

        const indexPath = noIndex ? null : 'index.html';

        const assets = await this.getAssets(this.cwd, path);

        const transactions: Transaction[] = [];
        const pathMap: ManifestPathMap = {};

        let totalCostWinston = '0';
        let totalSize = 0;

        const anchor = (await this.arweave.api.get('tx_anchor')).data;

        this.print([``, `${'ID'.padEnd(43)} ${'Size'.padEnd(12)} ${'Fee'.padEnd(15)} ${'Type'.padEnd(20)} ${'Path'}`]);

        await Promise.all(
            assets.map(async asset => {
                const data = await asset.file.read();
                const contentType = asset.file.getType();
                const transaction = await this.arweave.createTransaction(
                    {
                        data: data,
                        last_tx: anchor,
                    },
                    key,
                );

                transaction.addTag('Content-Type', contentType);
                transaction.addTag('User-Agent', `ArweaveDeploy/${__VERSION__}`);

                await this.arweave.transactions.sign(transaction, key);

                transactions.push(transaction);

                pathMap[asset.path] = { id: transaction.id };

                this.print(
                    `${transaction.id} ${File.bytesForHumans(data.byteLength).padEnd(12)} ${this.arweave.ar
                        .winstonToAr(transaction.reward)
                        .padEnd(15)} ${contentType.padEnd(20)} ${asset.path}${asset.path == indexPath ? '*': ''}`,
                );

                totalCostWinston = this.arweave.ar.add(totalCostWinston, transaction.reward);
                totalSize += data.byteLength;
            }),
        );

        const manifest = await generateManifest(pathMap, indexPath);
        const manifestData = Buffer.from(JSON.stringify(manifest), 'utf8');

        const manifestTx = await this.arweave.createTransaction(
            {
                data: manifestData,
                last_tx: anchor,
            },
            key,
        );

        manifestTx.addTag('Content-Type', 'application/x.arweave-manifest+json');

        await this.arweave.transactions.sign(manifestTx, key);

        this.print([
            ``,
            `${manifestTx.id} ${File.bytesForHumans(manifestData.byteLength).padEnd(12)} ${this.arweave.ar
                .winstonToAr(manifestTx.reward)
                .padEnd(15)} application/x.arweave-manifest+json`,
        ]);

        totalCostWinston = this.arweave.ar.add(totalCostWinston, manifestTx.reward);

        if (this.context.parent.debug) {
            console.log('manifest', JSON.stringify(manifest, null, 4));
        }

        const address = await this.arweave.wallets.jwkToAddress(key);
        const balance = await this.arweave.wallets.getBalance(address);
        const balanceAfter = this.arweave.ar.sub(balance, totalCostWinston);

        this.print([
            ``,
            `Summary`,
            ``,
            `Index: ${manifest.index ? manifest.index.path : 'not set'}`,
            `Number of files: ${assets.length} + 1 manifest`,
            `Total size: ${File.bytesForHumans(totalSize)}`,
            `Total price: ${this.formatWinston(totalCostWinston)}`,
            ``,
            `Wallet`,
            ``,
            `Address: ${address}`,
            `Current balance: ${this.formatWinston(balance)}`,
            `Balance after uploading: ${this.formatWinston(balanceAfter)}`,
            ``,
        ]);

        if (!this.context.forceSkipConfirmation) {
            const confirmed = await this.prompt(
                chalk.green(`Carefully check the above details are correct, then Type CONFIRM to complete this upload`),
            );

            if (confirmed !== 'CONFIRM') {
                throw new Error(`User cancelled`);
            }
        }

        this.print([
            ``,
            `Uploading...`,
            ``,
        ]);

        await uploadTransactions(this.arweave, [manifestTx, ...transactions]);

        this.print([
            ``,
            `Your files are being deployed! 🚀`,
            `Once your files are mined into blocks they'll be available on the following URL`,
            ``,
            chalk.cyanBright(`https://arweave.net/${manifestTx.id}`),
        ]);
    }
}

function generateManifest(pathMap: ManifestPathMap, indexPath: string | undefined) {

    const manifest: Manifest = {
        manifest: 'arweave/paths',
        version: '0.1.0',
        paths: pathMap,
    };

    if (indexPath) {
        if (!Object.keys(pathMap).includes(indexPath)) {
            throw new Error(`--index path not found in directory paths: ${indexPath}`);
        }
        manifest.index = {
            path: indexPath,
        };
    }

    return manifest;
}
