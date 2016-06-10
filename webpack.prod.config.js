var webpack = require('webpack');
var config = require('./webpack.config.js');

config.plugins = [
    new webpack.DefinePlugin({
        'process.env': {
            'NODE_ENV': JSON.stringify('production')
        }
    }),
    new webpack.optimize.UglifyJsPlugin({
        compress:{
            warnings: true
        },
        mangle: true
    })
];

config.devtool = false;

module.exports = config;
