'use strict';

require('es6-promise').polyfill();
require('whatwg-fetch');

var Elm;
var app;
var store;
var db;
var token;
var createStore = require('./store');
var upgradeMDL = require('./upgrade-mdl');
var serverSync = require('./server-sync.js');
var PouchDB = require('pouchdb-browser');

Elm = require('../src/App.elm');

db = new PouchDB('shows');

store = createStore(db);

upgradeMDL();

app = Elm.Main.embed(document.getElementById('elm'));

app.ports.persistShow.subscribe(function(show) {
    store.saveShow(show)
    .then(function loadRev(response) {
        app.ports.loadRev.send({id: show.id, rev: response.rev});
    })
    .catch(function(err) {
        console.log(err);
    });
});

app.ports.removeShow.subscribe(function(show) {
    store.removeShow(show)
    .catch(function(err) {
        console.log(err);
    });
});

app.ports.showNotification.subscribe(function(message) {
    var snackbarContainer = document.querySelector('.js-elmtv__snackbar');
    snackbarContainer.MaterialSnackbar.showSnackbar({
        message: message
    });
});

app.ports.logInUser.subscribe(function(login) {
    serverSync.logInUser();
});

app.ports.logOutUser.subscribe(function(login) {
    serverSync.logOutUser()
        .then(function(loggedOut) {
            if (loggedOut) {
                app.ports.loggedInState.send({
                    loggedIn: false,
                    email: '',
                    picture: ''
                })
            }
        });
});

function fetchAll() {
    store.fetchShows()
        .then(function getShows(shows) {
            app.ports.loadShows.send(shows);
        })
        .catch(function(err) {
            console.log(err);
        });
}

setTimeout(function() {
    serverSync.authenticate()
        .then(function(token) {
            serverSync.getProfile()
                .then(function(profile) {
                    app.ports.loggedInState.send({
                        loggedIn: true,
                        email: profile.email,
                        picture: profile.picture
                    });
                })
                .catch(function(err) {
                    console.log(err);
                });
            serverSync.start(db, function onChange(change) {
                if (change.direction === 'pull') {
                    fetchAll();
                }
            });
        });
    fetchAll();
}, 0);

if (process.env.NODE_ENV === 'production') {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('service-worker.js');
    }
}
