'use strict';

var Elm;
var app;
var store;
var db
var createStore = require('./store');
var PouchDB = require('pouchdb-browser');

var remoteCouch = window.location.protocol + '//' + window.location.host + '/db/shows';

Elm = require('../src/App/App.elm');

db = new PouchDB('shows');

store = createStore(db);

app = Elm.Main.fullscreen();

app.ports.persistShow.subscribe(function(show) {
  store.saveShow(show)
    .then(function loadRev(response) {
        app.ports.loadRev.send({id: show.id, rev: response.rev});
    })
    .catch(function(err) {
        console.log(err);
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
    db.sync(remoteCouch, {
        live: true,
        retry: true
    }).on('change', function(change) {
        if (change.direction === 'pull') {
            fetchAll();
        }
    });
    fetchAll();
}, 0);

if (process.env.NODE_ENV === 'production') {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('service-worker.js');
    }
}
