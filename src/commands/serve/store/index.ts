import { resolve } from 'path';
import { appDirectoryPath } from '../../../lib/file';
import Transaction from 'arweave/node/lib/transaction';
import Arweave from 'arweave/node';
import { FilesystemDriver } from './transactions';
import { ownerToAddress, getSenderAddress } from '../helpers';
import { MemoryDriver } from './wallets';

export interface TxMetadataCollection {
    [key: string]: TxMetadata | undefined;
}

export interface TxMetadata {
    id: string;
    created: string;
    from: string;
    block: {
        id: string;
        height: number;
    };
    tags: TxMetadataTags;
}

export interface TxMetadataTags {
    [key: string]: string[];
}

export interface Wallet {
    address: string;
    balance: string;
    last_tx: string;
}

export interface WalletCollection {
    [key: string]: Wallet | undefined;
}

let arweave: Arweave;

let transactions: FilesystemDriver;
let wallets: MemoryDriver;

export async function initStore(arweaveInstance: Arweave, devWallets: WalletCollection) {
    arweave = arweaveInstance;
    transactions = new FilesystemDriver(resolve(appDirectoryPath(), 'txs.json'), resolve(appDirectoryPath(), 'txs'));
    wallets = new MemoryDriver(devWallets);

    await transactions.init();
}

export async function getAllMetadata(): Promise<TxMetadataCollection> {
    return transactions.getAllMetadata();
}

export async function getTransactionMetadata(id: string): Promise<TxMetadata> {
    return transactions.getTransactionMetadata(id);
}

export async function getTransaction(id: string): Promise<Transaction> {
    return transactions.getTransaction(id);
}

export async function hasTransaction(id: string): Promise<Boolean> {
    return transactions.hasTransaction(id);
}

export async function getWallet(address: string): Promise<Wallet> {
    return wallets.getWallet(address);
}

export async function hasWallet(address: string): Promise<Boolean> {
    return wallets.hasWallet(address);
}

export async function saveTransaction(transaction: Transaction) {
    const networkInfo = await arweave.network.getInfo();
    const fromAddress = await getSenderAddress(transaction);

    const wallet = await wallets.getWallet(fromAddress);

    const balance = arweave.ar.sub(wallet.balance, arweave.ar.add(transaction.reward, transaction.quantity));

    await transactions.storeTransaction(transaction, {
        block: networkInfo.current,
        height: networkInfo.height,
    });

    await wallets.updateWallet(fromAddress, { last_tx: transaction.id, balance: balance });
}
