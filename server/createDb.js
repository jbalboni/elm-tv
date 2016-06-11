const request = require('request');
const forward = require('./forward.js');
const dbPath = '/db';
require('dotenv').load();
const crypto = require('crypto');
const cloudantUrl = `https://${process.env.CLOUDANT_HOST}.cloudant.com`;
const authHeader = {
    'Authorization': 'Basic ' + (new Buffer(`${process.env.CLOUDANT_USER}:${process.env.CLOUDANT_PASS}`).toString('base64'))
}

function createLocalDb(PouchDB) {
    return (req, res) => {
        const hash = crypto.createHash('md5').update(req.user.sub).digest('hex');
        const name = 'shows_' + hash;
        const db = new PouchDB(name);
        res.send({name});
    }
}

function createCloudantDb() {
    return (req, res) => {
        const hash = crypto.createHash('md5').update(req.user.sub).digest('hex');
        const name = 'shows_' + hash;

        request.put(`${cloudantUrl}/${name}`, {
            headers: authHeader
        })
            .on('response', function(response) {
                if (response.statusCode === 201
                    || response.statusCode === 202
                    || response.statusCode === 412) {
                    res.send({name});
                } else {
                    console.log(`${response.statusCode} - ${response.statusMessage}`);
                    res.status(500).send('Failed to create or retrieve the database name');
                }
            });
    }
}

module.exports = function createDb(app, jwtCheck) {
    app.use(dbPath, jwtCheck);

    app.use(dbPath, function(req, res, next) {
        const hash = crypto.createHash('md5').update(req.user.sub).digest('hex');
        const name = 'shows_' + hash;
        if (req.url === '/' || req.url === '/name' || req.url.startsWith(`/${name}`)) {
            next();
        } else {
            res.status(403).end();
        }
    });

    if (process.env.NODE_ENV === 'production') {
        app.post('/db/name', createCloudantDb());
        app.use(forward(/\/db\/(.*)/, cloudantUrl, authHeader));

        console.log('Started Cloudant forwarding');
    } else {
        var PouchDB = require('pouchdb-node');
        var LocalPouchDB = PouchDB.defaults({prefix: './pouch/'});
        var expressPouch = require('express-pouchdb')(LocalPouchDB);

        app.post('/db/name', createLocalDb(LocalPouchDB));

        app.use(dbPath, expressPouch);

        console.log('Started local PouchDB');
    }
}
