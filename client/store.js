'use strict';

function createStore(db) {
    var exports = {};

    exports.fetchShows = function fetchShows() {
        return db.allDocs({include_docs: true})
            .then(function setRevs(shows) {
                if (shows.total_rows > 0) {
                    return shows.rows.map(function setRev(show) {
                        show.doc.rev = show.doc._rev;
                        return show.doc;
                    })
                }
                return [];
            });
    };

    exports.saveShow = function saveShow(show) {
        show._id = show.id.toString();
        show._rev = show.rev;
        return db.put(show);
    };

    return exports;
}

module.exports = createStore;
