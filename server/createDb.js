const request = require('request');
const crypto = require('crypto');

const forward = require('./forward.js');

const dbPath = '/db';
const cloudantUrl = `https://${process.env.CLOUDANT_HOST}.cloudant.com`;
const localUrl = 'http://127.0.0.1:5984';
const authHeader = {
    'Authorization': 'Basic ' + (new Buffer(`${process.env.CLOUDANT_USER}:${process.env.CLOUDANT_PASS}`).toString('base64'))
}
const localAuthHeader = {
    'Authorization': 'Basic ' + (new Buffer(`admin:test`).toString('base64'))
}

function createLocalDb() {
    return (req, res) => {
        const hash = crypto.createHash('md5').update(req.user.sub).digest('hex');
        const name = 'shows_' + hash;

        request.put(`${localUrl}/${name}`, {
            headers: localAuthHeader
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
        app.post('/db/name', createLocalDb());
        app.use(forward(/\/db\/(.*)/, localUrl, authHeader));

        console.log('Started local db forwarding');
    }
}
