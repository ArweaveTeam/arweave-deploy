# Arweave Deploy

- [Arweave Deploy](#arweave-deploy)
  - [Build](#build)
    - [Build for local Node.js](#build-for-local-nodejs)
    - [Build portable binaries](#build-portable-binaries)
  - [Installation](#installation)
    - [NPM (recommended)](#npm-recommended)
    - [Manual](#manual)
  - [Quick Start](#quick-start)
  - [Usage](#usage)
    - [Deploy a file](#deploy-a-file)
    - [Deploy a file with Arweave+IPFS](#deploy-a-file-with-arweaveipfs)
    - [Deploy a packaged HTML file](#deploy-a-packaged-html-file)
    - [Check a deployment status](#check-a-deployment-status)
    - [Load your keyfile](#load-your-keyfile)
    - [Generate a keyfile](#generate-a-keyfile)
    - [Remove your keyfile](#remove-your-keyfile)
    - [Check your wallet balance](#check-your-wallet-balance)
    - [Send AR to another wallet](#send-ar-to-another-wallet)
    - [Manually generate and sign a transaction](#manually-generate-and-sign-a-transaction)
    - [Sign a message](#sign-a-message)
    - [Verify a signed message](#verify-a-signed-message)

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


### Manually generate and sign a transaction

This function can be used to manually generate and sign a transaction. As all of the transaction fields are user supplied no network connection is required, so this is especially useful for signing transactions on an air gapped machine.

The raw transaction output is only displayed on screen as a JSON object, **it will not submitted to the network even if an internet connection is present**. To submit the transaction you will need to manually post it to the network, this can be as simple as saving the JSON object in a file and using cURL e.g. `curl -X POST -d signed_tx_output.json https://arweave.net/tx`, or using Postman, or some other tool.

All amounts are specified in AR and _not_ Winston.

The `--anchor` parameter is used to anchor the transaction to a point in the blockweave, it must be either the last transaction ID for the sending wallet, or the ID of a recent block (_must_ be within the last 50, we recommend last 25). You can quickly find a recent block anchor value using https://arweave.net/tx_anchor

```
arweave sign-tx --key-file=path/to/arweave-key.json --to=pEbU_SLfRzEseum0_hMB1Ie-hqvpeHWypRhZiPoioDI --amount=20.5 --fee=0.25000000123 --anchor=9ADeIc9pNj737SB8P2-3iSiL7vKSaaO8joiNWdAr1FHxB4T1VRe7GwHQaz74prYU
```


```
Transaction

ID: i3P51MwXmoy0GTptd8aEHMVSsZo0MekuBChKPi98utI

To: pEbU_SLfRzEseum0_hMB1Ie-hqvpeHWypRhZiPoioDI
From: MDlauADgN7AoVQl4Eqmwr3xHXyKXMqADaiCas3mEyNQ
Amount: 20.500000000000 AR
Fee: 0.250000001230 AR
Total: 20.750000001230 AR

Signed Transaction:

{"id":"i3P51MwXmoy0GTptd8aEHMVSsZo0MekuBChKPi98utI","last_tx":"9ADeIc9pNj737SB8P2-3iSiL7vKSaaO8joiNWdAr1FHxB4T1VRe7GwHQaz74prYU","owner":"nFMF-h5inUShL8pOk4o_fJ8UqFFkB36U4T-y5Jq-oOWwMxTEcL9CqaTKmzmSj6e_4cBFjuJkXz-VhW7mOjTK1-DZNjrQdtPNHq1aWsz5BbNWOn_B92h6pqfpsi6ypvoGerZqqwee5r2CSAICJdZnAJ1qn0dz1kZ2IivnTkYz1y_NW7coV141-b--CSPrd6z5cQdXnlm7I3bVPzpbRmtDYAq0PgX1_HJmH1huHWBLYE_NYZgLpykv4s7J6i5Z_Lf9_RWpC45lwufJVQQVUF4r69Fw99GrM6gxvrdPhEvRk__ADWiwKNBRe_3ErYaOqfe4gCV7b8cPGbJ9M6hetONzVSbFdpGli2AWgVqm5jKyZV-dWhZ_EsJeq9MkbunYJN0QvtidXiFCj4tIrPwzYNUq2F1jd2j8UVrUTaQ_R_27JY5CgH7T-vk_elWESSdtnpgDKNsC4M3TFVaDC0jDEBcHmjDTvJTSPvl7hfWPf9pKY8ocJPDLpTdiGwNpFp45R4NAzvmhzuo8McdltECLn0kq8fmzleLy8KgEiggpYYug74fs_ZSLNcjOOK2CoXRk1IUN8euPU8MyBb3WevTXJjHiCJBxhaQ_4P9_fX32JxcBZ7pvJ3FUZt0YSdIgqeg-po3GVBOHip8lONPKbWvdNcWnpviMXAXqkmfljEd6IDtF0o0","tags":[],"target":"pEbU_SLfRzEseum0_hMB1Ie-hqvpeHWypRhZiPoioDI","quantity":"20500000000000","data":"","reward":"250000001230","signature":"cQrrMm9miIZZjJ-L6GXRl3OcAp_KUE3K9FI50Rt5Q44OBF-b8_h8keZY9qawDTleIGBuptjXF0A5zAdRbzDLhAOE9YIabB5suPMQd1-8JY0UordLXGpCxUpE416KM7bwKqU9FLrkAk0IbaA6RzMk9BaGqvE7HFFTt0gexeCrmzfC8U1qOcKI_PrED2wtBYC77ioThN37KLEMPXKnC54ruHwYJ7tkn5zyXecjaCTm4zbl7OmBs4iv490ryoTsRlEDgLz4F8bkuR-XY3bvX5T9_5DeCuT_kmpWXAGPE_TrY9FJik1Gija7S-qnKXjB0qznF3g4yXHULDXpRMhILBsM3xmtc_NXmU4Vk1iBSMxQyU0Y3P8Q_WJnAlqA2ENVrmY1R1K6IUTxxcrRv_UnKk34BVONddslCXhLQcJSdMfUZJW43R1vio8C9xuznYz1xyNn4BhT7gWnHEHzKq26YU3yru27cOnKQ0MF2SPVLNc8JeK8rK9ejXLRL89754ruMq7slhRMvkjB-Rzj323bxKp5DXJ_crg84hJMPCV5v8QcKln9q1XjxNvasGn0HActEqU-IxFC3eNDb2sZwf3lhVexVVl5Cni8PhF3AGYJm-vE_Vwh6JR9IP1Lh6SdoafVej9QS5JVfG853b9az71R4OhJzibIlbx6RsRaxf8hTzVeefE"}

This can now be posted to https://arweave.net/tx, or any Arweave node http://0.0.0.0:1984/tx
```

### Sign a message

This command can sign an arbitrary UTF-8 string message, using your Arweave private key. See the [verify command](#verify-a-signed-message) for verifying signatures.

```
arweave message-sign --message="my-test-message" --key-file="keys/MDlauADgN7AoVQl4Eqmwr3xHXyKXMqADaiCas3mEyNQ.json"
```

```
Arweave address: MDlauADgN7AoVQl4Eqmwr3xHXyKXMqADaiCas3mEyNQ

Message: my-test-message

Public key: nFMF-h5inUShL8pOk4o_fJ8UqFFkB36U4T-y5Jq-oOWwMxTEcL9CqaTKmzmSj6e_4cBFjuJkXz-VhW7mOjTK1-DZNjrQdtPNHq1aWsz5BbNWOn_B92h6pqfpsi6ypvoGerZqqwee5r2CSAICJdZnAJ1qn0dz1kZ2IivnTkYz1y_NW7coV141-b--CSPrd6z5cQdXnlm7I3bVPzpbRmtDYAq0PgX1_HJmH1huHWBLYE_NYZgLpykv4s7J6i5Z_Lf9_RWpC45lwufJVQQVUF4r69Fw99GrM6gxvrdPhEvRk__ADWiwKNBRe_3ErYaOqfe4gCV7b8cPGbJ9M6hetONzVSbFdpGli2AWgVqm5jKyZV-dWhZ_EsJeq9MkbunYJN0QvtidXiFCj4tIrPwzYNUq2F1jd2j8UVrUTaQ_R_27JY5CgH7T-vk_elWESSdtnpgDKNsC4M3TFVaDC0jDEBcHmjDTvJTSPvl7hfWPf9pKY8ocJPDLpTdiGwNpFp45R4NAzvmhzuo8McdltECLn0kq8fmzleLy8KgEiggpYYug74fs_ZSLNcjOOK2CoXRk1IUN8euPU8MyBb3WevTXJjHiCJBxhaQ_4P9_fX32JxcBZ7pvJ3FUZt0YSdIgqeg-po3GVBOHip8lONPKbWvdNcWnpviMXAXqkmfljEd6IDtF0o0

Signature: BRySjfhEdL3mf00x_t-edXPP08uyMzZ_XC-Hp_G6mrqqqZPSHgjURpK04eNHSxb7iT0ooQYPZ1-coqe0H8ecncQ029hUY6zmkJzsFRZ7oW0X2mNGjX-xUF-w1ynRy0mlNcCzrURyI2YjvIJlVBq-TYYsj6URAkbnoZDYddlOpLXMR8favqwXPeOL0j2zA8Fgu3fY_BsanzxNwvdN5fHrlcbg2hrkO7iKrr6LRqbeNn-SwLKIWridXvSEEJ1xk4JOLPWmGRUqxZdTq3DIz_CzIdNf7Plb-5hoG5EZr2Wyy0tL5YWWsFNjtgLMqooUk1P_36RDCuLEZioSOEIPFxQvvPFkEuqQ1aUr_FdUa1JuraGUsEMm3g0JIowdkTfYeXfukIuVNkYElKFA5WH-vYUTFlNUyNzjCoEjEotayrYsA1ZhmDtGbtYAfyk2ky2zG--Sdf4HjFWPf-HYVN65N_DU9UQpMmv20UoIkXVRxp_vvO0cleZTTeFW7-riGUePvHjlCiG6O7UQ3wRMRGxrP30NxEO01_jD3G2X2fjV7yBNk_DmiZZZ-D2-KodshxdgC4tPzERA1EyqnBoenSLNZYntYVdrJq5gvwP_S-N_cCWaEPuV4sG3Sb-tVN-KhrG2V-lFBUhrChfwYg9uVPoVTS86Kup58lqnbDX4J__Pwm3ZNug
```

### Verify a signed message

This command can verify the signature for an arbitrary UTF-8 string message signed using an Arweave private key. The parameter values can be filled using the output from the [message signing](#sign-a-message) command.
```
arweave message-verify \
--address="MDlauADgN7AoVQl4Eqmwr3xHXyKXMqADaiCas3mEyNQ" \
--message="my-test-message" \
--public-key="nFMF-h5inUShL8..." \
--signature="BRySjfhEdL3mf00x_t-edXPP08uyMzZ_XC-Hp_G6mrqqqZ..."
```
```
Signature verification passed
```

**Errors**

* `Signature verification failed: the signature is not valid for the given inputs`

  The signature is not valid. Either the message or signature values may have been copied incorrectly, or modified since the signature was generated.


* `Signature verification failed: public key does not match the given Arweave address`

  The `--public-key` does not correspond to the supplied Arweave address, given by `--address` . Arweave addresses are SHA-256 hashes of the raw RSA public key.

