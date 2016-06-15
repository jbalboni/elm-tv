if (process.env.NODE_ENV !== 'production') {
    const dotenv = require('dotenv');
    dotenv.load();
}

const path = require('path');
const express = require('express');
const jwt = require('express-jwt');
const compression = require('compression');
const createDb = require('./server/createDb.js');
const createApi = require('./server/createApi.js');
const createWatchServer = require('./server/createWatchServer.js');

const app = express();
app.use(compression());

var jwtCheck = jwt({
  secret: new Buffer(process.env.AUTH0_CLIENTSECRET, 'base64'),
  audience: process.env.AUTH0_CLIENTID
});

createWatchServer(app);
app.use('/dist', express.static('dist'));
createDb(app, jwtCheck);
createApi(app, jwtCheck);

app.get('/service-worker.js', (req, res) => {
    if (process.env.NODE_ENV !== 'production') {
        res.sendFile(path.join(__dirname, 'client', 'service-worker.js'));
    } else {
        res.sendFile(path.join(__dirname, 'dist', 'service-worker.js'));
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client', 'index.html'));
});

app.listen(process.env.port || 80, '0.0.0.0', (err) => {
    if (err) {
        console.log(err);
        return;
    }

    console.log('Started server');
});
