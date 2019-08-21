import { File } from '../../lib/file';
import { WalletCollection, Wallet } from './store';

export interface ServeConfig {
    port?: number;
    wallets?: {
        balances?: {
            [key: string]: string;
        };
    };
    arql?: {
        mergeExternal?: boolean;
    };
}

export async function loadConfig(file: File): Promise<ServeConfig> {
    if (!(await file.exists())) {
        throw new Error(`Config file not found: ${file.getPath()}`);
    }
    const fileContents = (await file.read()).toString();

    try {
        JSON.parse(fileContents);
    } catch (error) {
        throw new Error(`Error reading config file, invalid JSON: ${file.getPath()}`);
    }

    const config = JSON.parse(fileContents);

    Object.keys(config).forEach(key => {
        if (!['wallets', 'arql', 'port'].includes(key)) {
            throw new Error(`Unexpected key in config file: ${key}`);
        }
    });

    return config;
}

export function getDevWallets(config: ServeConfig): WalletCollection {
    if (!config.wallets || !config.wallets.balances) {
        return {};
    }

    return Object.keys(config.wallets.balances)
        .map(
            (address: string): Wallet => {
                return {
                    address: address,
                    last_tx: '',
                    balance: config.wallets.balances[address],
                };
            },
        )
        .reduce((walletList: WalletCollection, wallet: Wallet): WalletCollection => {
            walletList[wallet.address] = wallet;

            return walletList;
        }, {});
}
