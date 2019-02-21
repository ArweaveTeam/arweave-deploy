# Arweave Deploy

- [Arweave Deploy](#arweave-deploy)
  - [Installation](#installation)
    - [NPM (recommended)](#npm-recommended)
    - [Manual](#manual)
  - [Quickstart](#quickstart)
  - [Usage](#usage)
    - [Load your keyfile](#load-your-keyfile)
    - [Deploy a file](#deploy-a-file)
    - [Deploy a packaged HTML file](#deploy-a-packaged-html-file)

## Installation

### NPM (recommended)
```
npm install -g arweave-deploy
```

```
npm update -g arweave-deploy
```

RSA key generation requires Node v10.12.0 so some features may be unavailable. If you're running an earlier versoin of node or don't want node installed at all, the precompiled binaries come bundled with the correct version.

### Manual

- [linux](dist/linux/arweave)
- [macos](dist/macos/arweave)
- [windows (x64)](dist/windows/arweave-x64.exe)
- [windows (x86)](dist/windows/arweave-x86.exe)


## Quickstart

```
arweave deploy path-to-my/file.txt --key-file path/to/arweave-key.json
```

## Usage

### Load your keyfile

The easiest way to use deploy is to save your keyfile, then you can simply run deploy commands without having to pass your key each time.

```
arweave key-save path/to/arweave-key.json
```
**Why do I need a keyfile?**

Arweave is a blockchain-like network, so each data upload (transaction) needs signing with a valid Arweave keyfile.

**I don't have any Arweave tokens?**

If you don't have any Arweave tokens [you can get 5 AR free to try this out](https://tokens.arweave.org).

**I already have an Arweave wallet, how do I use this?**

You can use the same keyfiles as the Arweave [chrome extension](https://chrome.google.com/webstore/detail/arweave/iplppiggblloelhoglpmkmbinggcaaoc?hl=en-GB), go to Wallets > Select a wallet > Select 'Export Key' to download the json keyfile.

### Deploy a file

If you're deploying HTML pages and have have external resources referenced, like stylesheets, javascript, or images, then use the [packaged HTML](#deploy-a-packaged-html-file-recommended-for-all-html) workflow.

```
arweave deploy path-to-my/file.txt
```
Once confirmed you'll see a transaction ID and URL
```
Your file is deploying! 🚀,
Once your file is mined into a block it'll be available on the following URL,

https://arweave.net/3T261RAQIj2DQmOk1t_zPQnoxVbh5qtMA1-NdzOHKKE

You can check it's status using 'arweave status 3T261RAQIj2DQmOk1t_zPQnoxVbh5qtMA1-NdzOHKKE'
```

### Deploy a packaged HTML file

To avoid having external dependencies we can package our HTML and external assets into a single self-contained file. Just add the `--package` flag to the deploy command.

Under the hood your page will be processed using this [inline-source](https://www.npmjs.com/package/inline-source) NPM package, it's a common tool used in gulp and webpack workflows.

[Read more](docs/packaging.md#the-problem) about why this is useful and how it works, with examples.

```
arweave deploy path-to/index.html --package
```

For you can use the package command to process the file without deploying it, this is useful for testing or debugging.

```
arweave package path-to/index.html output/packaged.html
```
