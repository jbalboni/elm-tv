var request = require('request');

module.exports = function forward(pattern, host, header){
    return function(req, res, next){
        if (req.url.match(pattern)) {
            var db_path = req.url.match(pattern)[1],
                db_url = [host, db_path].join('/');

            req.pipe(request[req.method.toLowerCase()](db_url, { headers: header})).pipe(res);
        } else {
            next();
        }
    }
};
