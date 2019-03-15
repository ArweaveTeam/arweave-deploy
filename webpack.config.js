const path = require('path');
const webpack = require('webpack');
const merge = require('webpack-merge');
const Compiler = require('./compiler');

const config = [];

config.common = {
    entry: './src/app.ts',
    mode: 'development',
    target: 'node',
    module: {
        rules: [
            {
                test: /\.ts?$/,
                use: 'ts-loader',
                exclude: /node_modules/
            }
        ]
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js', '.json']
    },
    devtool: 'inline-source-map',
    devServer: {
        contentBase: './dist'
    },
    plugins: [
        new webpack.DefinePlugin({
            __VERSION__: JSON.stringify(require("./package.json").version),
            'global.GENTLY': false 
        }),
    ],
    output: {
        filename: 'arweave',
        path: path.resolve(__dirname, 'dist')
    },
    externals: ['bufferutil', 'utf-8-validate'],
}

config.build = merge(config.common, {
    name: 'build',
    plugins: [
        new webpack.BannerPlugin({
            banner: '#!/usr/bin/env node',
            raw: true
        })
    ]
});

config.package = merge(config.common, {
    name: 'package',
    plugins: [
        new Compiler(path.resolve(__dirname, 'dist/.build/arweave.js')),
    ],
    output: {
        filename: 'arweave.js',
        path: path.resolve(__dirname, 'dist/.build')
    }
});

module.exports = [config.build, config.package];
