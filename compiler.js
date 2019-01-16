const fs = require('fs');
const path = require('path');
const compile = require('nexe').compile;

module.exports = class Compiler {

    constructor(path){
        this.path = path
    }
    apply(compiler) {

        fs.mkdirSync(path.resolve(__dirname, './dist/macos'), {recursive: true})
        fs.mkdirSync(path.resolve(__dirname, './dist/linux'), {recursive: true})
        fs.mkdirSync(path.resolve(__dirname, './dist/windows'), {recursive: true})

        compiler.hooks.done.tapAsync(
            'nexe-build',
            (compilation, callback) => {

                const builds = [];

                builds.push(compile({
                    input: this.path,
                    output: path.resolve(__dirname, './dist/macos/arweave'),
                    build: false,
                    targets: [
                        { version: '10.15.0', platform: 'macos', arch: 'x64' },
                    ]
                }));

                builds.push(compile({
                    input: this.path,
                    output: path.resolve(__dirname, './dist/linux/arweave'),
                    build: false,
                    targets: [
                        { version: '10.15.0', platform: 'linux', arch: 'x64' },
                    ]
                }));

                builds.push(compile({
                    input: this.path,
                    output: path.resolve(__dirname, './dist/windows/arweave-x64.exe'),
                    build: false,
                    targets: [
                        { version: '10.15.0', platform: 'windows', arch: 'x64' },
                    ]
                }));

                builds.push(compile({
                    input: this.path,
                    output: path.resolve(__dirname, './dist/windows/arweave-x86.exe'),
                    build: false,
                    targets: [
                        { version: '10.15.0', platform: 'windows', arch: 'x86' },
                    ]
                }));

                Promise.all(builds).then(() => {callback()});
            }
        );
    }
}