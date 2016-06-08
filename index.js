'use strict';

var Elm;
var app;
var store;
var db
var createStore = require('./store');
var PouchDB = require('pouchdb');

require('./index.html');
Elm = require('./src/App/App.elm');

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

setTimeout(function() {
    store.fetchShows()
      .then(function getShows(shows) {
          app.ports.loadShows.send(shows);
      })
      .catch(function(err) {
          console.log(err);
      });
}, 0);
