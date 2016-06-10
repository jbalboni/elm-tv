var forward = require('./forward.js');

module.exports = function createDb(app) {
    if (process.env.NODE_ENV === 'production') {
        app.use(forward(/\/db\/(.*)/, `https://${process.env.CLOUDANT_USER}:${process.env.CLOUDANT_PASS}@${process.env.CLOUDANT_HOST}.cloudant.com`));

        console.log('Started Cloudant forwarding');

        return null;
    } else {
        var PouchDB = require('pouchdb-node');
        var LocalPouchDB = PouchDB.defaults({prefix: './pouch/'});
        var expressPouch = require('express-pouchdb')(LocalPouchDB);
        app.use('/db', expressPouch);

        console.log('Started local PouchDB');

        return new LocalPouchDB('shows');
    }
}
