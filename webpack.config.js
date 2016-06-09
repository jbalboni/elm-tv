var webpack = require('webpack');
var path = require('path');

module.exports = {
    devtool: 'cheap-module-inline',
    entry: './client/index.js',

    output: {
        path: path.join(__dirname, 'dist'),
        filename: 'index.js',
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
            }
        ],

        noParse: /\.elm$/
    },

    plugins: [
        new webpack.DefinePlugin({
          'process.env': {
            'NODE_ENV': JSON.stringify('development')
          }
        }),
        // new webpack.optimize.UglifyJsPlugin({
        //   compress:{
        //     warnings: true
        //   }
        // })
    ]
};
