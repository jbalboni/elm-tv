const path = require('path');
const express = require('express');
const webpack = require('webpack');
const config = require('./webpack.config.js');

const app = express();
const compiler = webpack(config);

if (process.env.NODE_ENV !== 'production') {
    var dotenv = require('dotenv');
    dotenv.load();

    app.use(require('webpack-dev-middleware')(compiler, {
        noInfo: true,
        publicPath: '/dist'
    }));
}

app.use('/dist', express.static('dist'));

if (process.env.NODE_ENV === 'production') {
    var request = require('request');
    var forward = function(pattern, host){
        return function(req, res, next){
            if (req.url.match(pattern)) {
                var db_path = req.url.match(pattern)[1],
                    db_url = [host, db_path].join('/');

                req.pipe(request[req.method.toLowerCase()](db_url)).pipe(res);
            } else {
                next();
            }
        }
    };

    app.use(forward(/\/db\/(.*)/, `https://${process.env.CLOUDANT_USER}:${process.env.CLOUDANT_PASS}@${process.env.CLOUDANT_HOST}.cloudant.com`));
} else {
    var PouchDB = require('pouchdb-node');
    var LocalPouchDB = PouchDB.defaults({prefix: './pouch/'});
    var expressPouch = require('express-pouchdb')(LocalPouchDB);
    app.use('/db', expressPouch);
    var myPouch = new LocalPouchDB('shows');
}

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client', 'index.html'));
});

app.listen(process.env.port || 3000, '0.0.0.0', (err) => {
    if (err) {
        console.log(err);
        return;
    }

    console.log('Listening at http://localhost:3000');
});
