# Arweave Deploy

- [Arweave Deploy](#arweave-deploy)
  - [Installation](#installation)
    - [NPM (recommended)](#npm-recommended)
    - [Manual](#manual)
  - [Quickstart](#quickstart)
    - [Deploy a HTML document](#deploy-a-html-document)
    - [Deploy a packaged HTML document (recommended)](#deploy-a-packaged-html-document-recommended)
      - [tl;dr](#tldr)
      - [The Problem](#the-problem)
      - [The solution](#the-solution)
      - [Example: Stylesheet](#example-stylesheet)
      - [Example: Javascript](#example-javascript)
      - [Example: Image](#example-image)

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


### Deploy a HTML document

Deploy single HTML page, if you have have external resources refreenced from your file like `<link rel="stylesheet" href="assets/style.css">` then use the [Deploy a SPA web app](#deploy-a-packaged-html-file) workflow.

```
arweave deploy path-to-my-app/index.html
```
Once confirmed you'll see a transaction ID and URL
```
Your file is deploying! 🚀,
Once your file is mined into a block it'll be available on the following URL,

https://arweave.net/3T261RAQIj2DQmOk1t_zPQnoxVbh5qtMA1-NdzOHKKE

You can check it's status using 'arweave status 3T261RAQIj2DQmOk1t_zPQnoxVbh5qtMA1-NdzOHKKE'
```

⚠️ If your HTML file has references to external assets or CDNs (e.g. using jQuery from a CDN, or referencing an image hosted on S3/imgur/etc), then your HTML file may break at some point in the future if those external URLs change or are removed. As data deployed to Arweave is permanent you will not be able to update these references later. Use the `--package` flag explained below to avoid this.


### Deploy a packaged HTML document (recommended)

To avoid having external dependencies we can package our HTML and external assets into a single file.

#### tl;dr
You almost always want to use the `--package` flag when deploying a HTML file, unless there's a good reason not to, or for some reason it doesn't work or fit your workflow. [Here's why]().

#### The Problem

Conside this example:

```html
<!-- sample/original/index.html -->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>Hello world</title>
    <link rel="stylesheet" href="assets/style.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.3.1/jquery.js"></script>
</head>
<body>
    <div class="content">
        <img src="https://ichef.bbci.co.uk/news/660/cpsprodpb/71E1/production/_99735192_gettyimages-459467912.jpg" alt="A permanent cat picture">
        <p>Q: Why is this cat so grumpy?</p>
        <p>A: Nobody knows.</p>
    </div>
</body>
</html>
```

Here we have a page with 3 external assets.

```html
<link rel="stylesheet" href="assets/style.css">
```

This references will simply _not_ work when deployed, as your page will get a URL like `arweave.net/your-tx-id`. As the arweave data API is flat you we can't have an `assets` directory, and we can't have a named file. All data on the arweave network gets pseudorandom ID and address like `arweave.net/hNvBcEOgEpeFTnYyLYayaU1h6jgG1KSl5Ujvab2js8Q`. you could upload your CSS first, then your HTML and use the CSS file transaction ID as the `href` like `<link rel="stylesheet" href="your-css-trasnaction-id">` but that's a lot of work.

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.3.1/jquery.js"></script>

<img src="https://ichef.bbci.co.uk/news/660/cpsprodpb/71E1/production/_99735192_gettyimages-459467912.jpg" alt="A permanent and grumpy cat">
```

These two lines wil work... _for now_. If the BBC change their image URLs or remove the linked image it's now gone forever, any arweave pages that refernced it will now have a blank space where that image was. The same issue exists for the cloudflare jQuery reference, so _at some point_ this arweave page will stop working correctly. Maybe it's tomorrow, maybe it's 10 years.

#### The solution

We can use the `--package` flag to avoid all of this. It works by looking for references to external content and then imports and inlines it directly into your HTML.

```
arweave deploy my-hello-world-demo/index.html --package
```


If you want to see how you file will be packaged before deploying then you can use the package command to test a packaged version of your file.

```
arweave package path-to-my-app/index.html my-packaged-output.html
```


#### Example: Stylesheet
So now this stylesheet reference
```html
<link rel="stylesheet" href="assets/style.css">
```

Becomes this 
```html
<style>
body {
    background: #383B44;
    text-align: center;
}

.content{
    margin: 10% auto;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 1.5rem;
    color: #FFFFFF;
}
</style>
```

#### Example: Javascript
This javascript reference
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.3.1/jquery.js"></script>
```
Becomes this

```html
<script>!function(e,t){"use strict";"object"==typeof module&&"object"==typeof module.exports?module.exports=e.document?t(e,!0):function(e){if(!e.document)throw new Error("jQuery requires a window with a document");return t(e)}:t(e)}("undefined"!=typeof window?window:this,function(e,t){"use strict";var n=[],r=e.document...
```

#### Example: Image
This image reference
```html
<img src="https://ichef.bbci.co.uk/news/660/cpsprodpb/71E1/production/_99735192_gettyimages-459467912.jpg" alt="A permanent cat picture">
```
Becomes this 
```html
<img alt="A permanent cat picture" src="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj...
```

