var webpack = require('webpack');
var path = require('path');
var dotenv = require('dotenv');

dotenv.load();

module.exports = {
    devtool: 'inline-cheap-source-map',
    entry: './client/index.js',

    output: {
        path: path.join(__dirname, 'dist'),
        filename: 'bundle.js',
        publicPath: '/dist/'
    },

    resolve: {
        modulesDirectories: ['node_modules'],
        extensions: ['', '.js', '.elm']
    },

    module: {
        loaders: [
            {
                test: /\.elm$/,
                exclude: [/elm-stuff/, /node_modules/],
                loader: 'elm-webpack?cache=false'
            },
            {
                test: /node_modules[\\\/]auth0-lock[\\\/].*\.js$/,
                loaders: [
                    'transform-loader/cacheable?brfs',
                    'transform-loader/cacheable?packageify'
                ]
            },
            {
                test: /node_modules[\\\/]auth0-lock[\\\/].*\.ejs$/,
                loader: 'transform-loader/cacheable?ejsify'
            },
            {
                test: /\.json$/,
                loader: 'json-loader'
            }
        ],

        noParse: /\.elm$/
    },

    plugins: [
        new webpack.DefinePlugin({
            'process.env': {
                'NODE_ENV': JSON.stringify('development'),
                'AUTH0_CLIENTID': JSON.stringify(process.env.AUTH0_CLIENTID),
                'AUTH0_URL': JSON.stringify(process.env.AUTH0_URL)
            }
        })
    ]
};
