var webpack = require('webpack');
var config = require('./webpack.config.js');

config.plugins = [
    new webpack.DefinePlugin({
        'process.env': {
            'NODE_ENV': JSON.stringify('production'),
            'AUTH0_CLIENTID': JSON.stringify(process.env.AUTH0_CLIENTID),
            'AUTH0_URL': JSON.stringify(process.env.AUTH0_URL)
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
