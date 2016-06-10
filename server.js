const path = require('path');
const express = require('express');
const createDb = require('./server/createDb.js');
const createApi = require('./server/createApi.js');
const createWatchServer = require('./server/createWatchServer.js');

const app = express();

createWatchServer(app);
app.use('/dist', express.static('dist'));
createDb(app);
createApi(app);

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client', 'index.html'));
});

app.listen(process.env.port || 3000, '0.0.0.0', (err) => {
    if (err) {
        console.log(err);
        return;
    }

    console.log('Started server');
});
