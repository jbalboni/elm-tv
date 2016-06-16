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

app.ports.logInUser.subscribe(function(login) {
    serverSync.logInUser();
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
        .then(function() {
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
