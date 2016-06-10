var forward = require('./forward.js');

module.exports = function createApi(app) {
    app.use(forward(/\/api\/(.*)/, 'http://api.tvmaze.com'));
}
