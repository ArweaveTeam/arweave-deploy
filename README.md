# Arweave Deploy

- [Arweave Deploy](#Arweave-Deploy)
  - [Build](#Build)
    - [Build for local Node.js](#Build-for-local-Nodejs)
    - [Build portable binaries](#Build-portable-binaries)
  - [Installation](#Installation)
    - [NPM (recommended)](#NPM-recommended)
    - [Manual](#Manual)
  - [Quick Start](#Quick-Start)
  - [Usage](#Usage)
    - [Deploy a file](#Deploy-a-file)
    - [Deploy a file with Arweave+IPFS](#Deploy-a-file-with-ArweaveIPFS)
    - [Deploy a packaged HTML file](#Deploy-a-packaged-HTML-file)
    - [Check a deployment status](#Check-a-deployment-status)
    - [Load your keyfile](#Load-your-keyfile)
    - [Generate a keyfile](#Generate-a-keyfile)
    - [Remove your keyfile](#Remove-your-keyfile)
    - [Check your wallet balance](#Check-your-wallet-balance)
    - [Send AR to another wallet](#Send-AR-to-another-wallet)

## Build

### Build for local Node.js

This will build to run on your locally installed Node.js using `#!/usr/bin/env node`.


```
npm install
npm run build

./dist/arweave
```

### Build portable binaries

This will build a set of portable binaries packaged with self-contained Node.js in a single executable, so they can be run on Linux, macOS, and Windows without Node.js installed.
```
npm install
npm run package

./dist/macos/arweave
./dist/linux/arweave
./dist/windows/arweave-x86.exe
./dist/windows/arweave-x64.exe
```

## Installation

### NPM (recommended)
```
npm install -g arweave-deploy
```

```
npm update -g arweave-deploy
```

RSA key generation requires Node v10.12.0 so some features may be unavailable. If you're running an earlier versoin of node or don't want node installed at all, the precompiled binaries below come bundled with the correct version.

### Manual

These binaries are around 30MB each as they come with a self-contained, bundled version of node.

- [linux](https://github.com/ArweaveTeam/arweave-deploy/raw/latest/dist/linux/arweave)
- [macos](https://github.com/ArweaveTeam/arweave-deploy/raw/latest/dist/macos/arweave)
- [windows (x64)](https://github.com/ArweaveTeam/arweave-deploy/raw/latest/dist/windows/arweave-x64.exe)
- [windows (x86)](https://github.com/ArweaveTeam/arweave-deploy/raw/latest/dist/windows/arweave-x86.exe)


## Quick Start

Deploy a file

```
arweave deploy path-to-my/file.html --key-file path/to/arweave-key.json
```

Deploy a HTML file

```
arweave deploy path-to-my/index.html --key-file path/to/arweave-key.json --package
```


Deploy a HTML file to Arweave+IPFS

```
arweave deploy path-to-my/index.html --key-file path/to/arweave-key.json --package --ipfs-publish
```

Save your keyfile
```
arweave key-save path/to/arweave-key.json
```

After saving your key you can now run commands without the `--key-file` option, like this

```
arweave deploy path-to-my/index.html --package
```

## Usage

### Deploy a file

If you're deploying HTML pages and have have external resources referenced, like style sheets, JavaScript, or images, then use the [packaged HTML](#deploy-a-packaged-html-file) workflow.

```
arweave deploy path-to-my/file.html
```
Once confirmed you'll see a transaction ID and URL
```
Your file is deploying! 🚀,
Once your file is mined into a block it'll be available on the following URL

https://arweave.net/3T261RAQIj2DQmOk1t_zPQnoxVbh5qtMA1-NdzOHKKE

You can check its status using 'arweave status 3T261RAQIj2DQmOk1t_zPQnoxVbh5qtMA1-NdzOHKKE'
```

### Deploy a file with Arweave+IPFS

*This feature is currently experimental.*

To deploy a file with Arweave+IPFS, just add the `--ipfs-publish` flag. After confirming the upload you'll see an ipfs.io link in addition to your arweave.net link.

Deploy will add an `IPFS-Add` tag with the IPFS content hash, e.g. `IPFS-Add:QmcsdfK24i1AijxdX16jNwkDutpbdwD2AGV4JmoBAXYvDj`. This tag tells Arweave nodes running the Arweave+IPFS extension to also make your data available over IPFS, so you'll then be able to access your content from any IPFS gateway, in addition to Arweave nodes and gateways. Pretty cool.

```
arweave deploy path-to-my/index.html --key-file path/to/arweave-key.json --package --ipfs-publish
```
```
Your file is deploying! 🚀
Once your file is mined into a block it'll be available on the following URL

https://arweave.net/1ArOtUjQN0G0K9qKiiX5GAoqfJ9ImhY6A71xAiL9lPw

https://ipfs.io/ipfs/QmWfVY9y3xjsixTgbd9AorQxH7VtMpzfx2HaWtsoUYecaX

You can check its status using 'arweave status 1ArOtUjQN0G0K9qKiiX5GAoqfJ9ImhY6A71xAiL9lPw'
```


### Deploy a packaged HTML file

To avoid having external dependencies we can package our HTML and external assets into a single self-contained file. Just add the `--package` flag to the deploy command.

Under the hood your page will be processed using this [inline-source](https://www.npmjs.com/package/inline-source) NPM package, it's a common tool used in gulp and webpack workflows.

[Read more about packaging](docs/packaging.md), why it's useful and how it works, with examples.

```
arweave deploy path-to/index.html --package
```

For you can use the package command to process the file without deploying it, this is useful for testing or debugging.

```
arweave package path-to/index.html output/packaged.html
```

### Check a deployment status

```
arweave status YOUR_TRANSACTION_ID
```

```
Trasaction ID: 3T261RAQIj2DQmOk1t_zPQnoxVbh5qtMA1-NdzOHKKE

Status: 200 Accepted

 - Block: 144339
 - Block hash: fMq_zmps-jgEAOC4Gi2s8ewAhgl31TzrOK8lSPVZWZlWhNfxCuZ-wD895F9rjFKK
 - Confirmations: 786

Transaction URL: https://arweave.net/3T261RAQIj2DQmOk1t_zPQnoxVbh5qtMA1-NdzOHKKE
Block URL: https://arweave.net/block/hash/fMq_zmps-jgEAOC4Gi2s8ewAhgl31TzrOK8lSPVZWZlWhNfxCuZ-wD895F9rjFKK

Block explorer URL: https://viewblock.io/arweave/block/144339
```

### Load your keyfile

The easiest way to use deploy is to load your keyfile first, then you can simply run deploy commands without having to pass your key each time. 

```
arweave key-save path/to/arweave-key.json
```

```
Address: 5rqCZeIG9flWzndFTXzqtGBdLahYDsn7BrfRE2Vbu6w
Set an encryption passphrase 
Confirm your encryption passphrase 
Successfully saved key file for wallet: 5rqCZeIG9flWzndFTXzqtGBdLahYDsn7BrfRE2Vbu6w
```

Your key file will be encrypted using the passphrase that you provide, and will be stored in `~/.arweave-deploy/key.json`.

**Why do I need a keyfile?**

Arweave is a blockchain-like network, so each data upload (transaction) needs signing with a valid Arweave keyfile.

**I don't have an Arweave key file or tokens?**

If you don't have any Arweave tokens [you can get 5 AR free to try this out](https://tokens.arweave.org).

**I already have an Arweave wallet, how do I get the keyfile?**

You can use the same keyfiles as the Arweave [Chrome Extension Wallet](https://chrome.google.com/webstore/detail/arweave/iplppiggblloelhoglpmkmbinggcaaoc?hl=en-GB), go to Wallets > Select a wallet > Select 'Export Key' to download the json keyfile.


### Generate a keyfile

If you want to generate a new keyfile you can do so using this command. This is useful if you don't want uploads to show from the same wallet address, or if you simply want to have a secondary wallet just used for deploying data.

```
arweave key-create new-arweave-key.json
```

```
Your new wallet address: 5rqCZeIG9flWzndFTXzqtGBdLahYDsn7BrfRE2Vbu6w

Successfully saved key to new-arweave-key.json
```

You need to transfer funds to your new wallet address before you can use the keyfile for deployments. You can use the [Chrome Extension Wallet](https://chrome.google.com/webstore/detail/arweave/iplppiggblloelhoglpmkmbinggcaaoc?hl=en-GB) for transacting AR between wallets.

### Remove your keyfile

To remove your saved keyfile simply run this command. After this you'll either need to save a new key or use the  `--key-file` option when using deploy.

```
arweave key-forget
```
```
You're about to forget your saved wallet: 5rqCZeIG9flWzndFTXzqtGBdLahYDsn7BrfRE2Vbu6w
Type CONFIRM to complete this action
```

### Check your wallet balance

```
arweave balance
```

```
Address: pEbU_SLfRzEseum0_hMB1Ie-hqvpeHWypRhZiPoioDI
Balance: 10.113659492352 AR
```

### Send AR to another wallet

```
arweave send <amount_in_ar> <to_arweave_address>
```
```
arweave send 10.5 DAJH66MHqEKImi4Jbuz8V7ZZFPauNGCdbJ0plp5vH8d
```

```
Transaction

ID: cuzpWQOqaxkO_TY-wEKoFh5RLgfNgKDhDbO1JAzCoos

To: DAJH66MHqEKImi4Jbuz8V7ZZFPauNGCdbJ0plp5vH8d
Amount: 10.422000000000 AR
Fee: 0.000214119475 AR
Total: 10.422214119475 AR

Wallet

Address: pEbU_SLfRzEseum0_hMB1Ie-hqvpeHWypRhZiPoioDI
Current balance: 11.095252211832 AR
Balance after uploading: 0.673038092357 AR
```
