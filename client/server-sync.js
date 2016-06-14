'use strict';

var Auth0 = require('auth0-js');
var PouchDB = require('pouchdb-browser');
var url = window.location.protocol + '//' + window.location.host;
var remoteDbUrl = url + '/db/';

var auth0 = new Auth0({
    domain:       process.env.AUTH0_URL,
    clientID:     process.env.AUTH0_CLIENTID,
    callbackURL:  url,
    callbackOnLocationHash: true
});

var exports = {};

exports.authenticate = function start() {
    var promise = new Promise(function(resolve, reject) {
        var hash = auth0.parseHash(window.location.hash);
        var existingToken = localStorage.id_token;

        if (hash) {
            history.replaceState('', document.title, window.location.pathname);
            if (hash.error) {
                console.log('There was an error logging in', hash.error);
                localStorage.removeItem('id_token');
                reject(hash.error);
            } else {
                localStorage.setItem('id_token', hash.idToken);
                resolve(hash.idToken);
            }
        } else if (existingToken) {
            auth0.renewIdToken(existingToken, function (err, delegationResult) {
                if (err) {
                    localStorage.removeItem('id_token');
                    reject('Failed to get valid token');
                } else {
                    localStorage.setItem('id_token', delegationResult.id_token);
                    resolve(delegationResult.id_token);
                }
            });
        }
    });

    window.login = function() {
        auth0.login({
            connection: 'google-oauth2'
        });
    }

    return promise;
};

exports.isAuthenticated = function isAuthenticated() {
    return !!localStorage.id_token;
}

exports.logInUser = function logInUser() {
    auth0.login({
        connection: 'google-oauth2'
    });
};

exports.start = function sync(localDb, onChange) {
    var token = localStorage.id_token;
    fetch('/db/name', {
        method: 'POST',
        withCredentials: true,
        headers: {
            'Authorization': 'Bearer ' + token
        }
    }).then(function(response) {
        if (response.ok) {
            return response.json();
        } else {
            throw new Error('Failed to get database name');
        }
    }).then(function(data) {
        var remoteDb = new PouchDB(remoteDbUrl + data.name, {
            ajax: {
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            }
        });
        localDb.sync(remoteDb, {
            live: true,
            retry: true
        }).on('change', function(change) {
            if (onChange) {
                onChange(change);
            }
        });
    });
}

module.exports = exports;
