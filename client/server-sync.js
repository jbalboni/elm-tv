'use strict';

var Auth0 = require('auth0-js');
var PouchDB = require('pouchdb-browser');
var remoteUrl = window.location.protocol + '//' + window.location.host + '/db/';

var exports = {};

exports.authenticate = function start() {
    var auth0 = new Auth0({
        domain:       process.env.AUTH0_URL,
        clientID:     process.env.AUTH0_CLIENTID,
        callbackURL:  'http://localhost:3000',
        callbackOnLocationHash: true
    });

    var hash = auth0.parseHash(window.location.hash);

    if (hash) {
      if (hash.error) {
        console.log("There was an error logging in", hash.error);
        alert('There was an error: ' + hash.error);
      } else {
        //save the token in the session:
        localStorage.setItem('id_token', hash.idToken);
      }
    }

    window.login = function() {
        auth0.login({
          connection: 'google-oauth2'
        });
    }
};

exports.isAuthenticated = function isAuthenticated() {
    return !!localStorage.id_token;
}

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
        var remoteDb = new PouchDB(remoteUrl + data.name, {
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
