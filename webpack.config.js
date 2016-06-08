var webpack = require('webpack');

module.exports = {
    devtool: 'module',
    entry: './index.js',

    output: {
        path: './dist',
        filename: 'index.js'
    },

    resolve: {
        modulesDirectories: ['node_modules'],
        extensions: ['', '.js', '.elm']
    },

    module: {
        loaders: [
            {
                test: /\.html$/,
                exclude: /node_modules/,
                loader: 'file?name=[name].[ext]'
            },
            {
                test: /\.elm$/,
                exclude: [/elm-stuff/, /node_modules/],
                loader: 'elm-webpack?cache=false'
            }
        ],

        noParse: /\.elm$/
    },

    devServer: {
        inline: true,
        stats: 'errors-only',
        compress: true
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
