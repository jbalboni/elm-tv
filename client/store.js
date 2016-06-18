'use strict';

function createStore(db) {
    var exports = {};

    exports.fetchShows = function fetchShows() {
        return db.allDocs({include_docs: true})
            .then(function setRevs(shows) {
                if (shows.total_rows > 0) {
                    var showsWithRev = shows.rows.map(function setRev(show) {
                        show.doc.rev = show.doc._rev;
                        show.doc.added = show.doc.added || '';
                        return show.doc;
                    });

                    showsWithRev.sort(function(a, b) {
                        if (a.added < b.added) {
                            return 1;
                        } else if (a.added > b.added) {
                            return -1;
                        } else {
                            return 0;
                        }
                    });

                    return showsWithRev;
                }
                return [];
            });
    };

    exports.saveShow = function saveShow(show) {
        show._id = show.id.toString();
        show._rev = show.rev;
        return db.put(show);
    };

    exports.removeShow = function removeShow(show) {
        return db.remove(show.id.toString(), show.rev);
    };

    return exports;
}

module.exports = createStore;
