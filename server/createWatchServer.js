module.exports = function createWatchServer(app) {
    if (process.env.NODE_ENV !== 'production') {
        const webpack = require('webpack');
        const config = require('../webpack.config.js');
        const compiler = webpack(config);

        app.use(require('webpack-dev-middleware')(compiler, {
            noInfo: false, //true,
            publicPath: '/dist'
        }));

        console.log('Started webpack dev server');
    }
}
