/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "/dist/";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Elm;
	var app;
	var store;
	var db
	var createStore = __webpack_require__(1);
	var PouchDB = __webpack_require__(2);

	var remoteCouch = window.location.protocol + '//' + window.location.host + '/db/shows';
	//var remoteCouch = 'https://fortionturinteredentlyne:5aee0a25287da2371ae7167927eb54d71751342f@jbalboni.cloudant.com/shows';

	Elm = __webpack_require__(38);

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

	function fetchInitial() {
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
	    }).on('change', function() {
	        fetchInitial();
	    });
	    fetchInitial();
	}, 0);


/***/ },
/* 1 */
/***/ function(module, exports) {

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


/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

	var PouchDB = _interopDefault(__webpack_require__(3));
	var IDBPouch = _interopDefault(__webpack_require__(20));
	var WebSqlPouch = _interopDefault(__webpack_require__(27));
	var HttpPouch = _interopDefault(__webpack_require__(29));
	var mapreduce = _interopDefault(__webpack_require__(31));
	var replication = _interopDefault(__webpack_require__(35));

	PouchDB.plugin(IDBPouch)
	  .plugin(WebSqlPouch)
	  .plugin(HttpPouch)
	  .plugin(mapreduce)
	  .plugin(replication);

	module.exports = PouchDB;

/***/ },
/* 3 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process, global) {'use strict';

	function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

	var jsExtend = __webpack_require__(5);
	var debug = _interopDefault(__webpack_require__(6));
	var inherits = _interopDefault(__webpack_require__(9));
	var Promise = _interopDefault(__webpack_require__(10));
	var pouchdbCollections = __webpack_require__(13);
	var getArguments = _interopDefault(__webpack_require__(14));
	var events = __webpack_require__(15);
	var pouchdbUtils = __webpack_require__(16);
	var pouchdbMerge = __webpack_require__(18);
	var scopedEval = _interopDefault(__webpack_require__(19));
	var pouchdbErrors = __webpack_require__(17);

	function evalFilter(input) {
	  return scopedEval('return ' + input + ';', {});
	}

	function evalView(input) {
	  /* jshint evil:true */
	  return new Function('doc', [
	    'var emitted = false;',
	    'var emit = function (a, b) {',
	    '  emitted = true;',
	    '};',
	    'var view = ' + input + ';',
	    'view(doc);',
	    'if (emitted) {',
	    '  return true;',
	    '}'
	  ].join('\n'));
	}

	inherits(Changes, events.EventEmitter);

	function tryCatchInChangeListener(self, change) {
	  // isolate try/catches to avoid V8 deoptimizations
	  try {
	    self.emit('change', change);
	  } catch (e) {
	    pouchdbUtils.guardedConsole('error', 'Error in .on("change", function):', e);
	  }
	}

	function Changes(db, opts, callback) {
	  events.EventEmitter.call(this);
	  var self = this;
	  this.db = db;
	  opts = opts ? pouchdbUtils.clone(opts) : {};
	  var complete = opts.complete = pouchdbUtils.once(function (err, resp) {
	    if (err) {
	      if (pouchdbUtils.listenerCount(self, 'error') > 0) {
	        self.emit('error', err);
	      }
	    } else {
	      self.emit('complete', resp);
	    }
	    self.removeAllListeners();
	    db.removeListener('destroyed', onDestroy);
	  });
	  if (callback) {
	    self.on('complete', function (resp) {
	      callback(null, resp);
	    });
	    self.on('error', callback);
	  }
	  function onDestroy() {
	    self.cancel();
	  }
	  db.once('destroyed', onDestroy);

	  opts.onChange = function (change) {
	    /* istanbul ignore if */
	    if (opts.isCancelled) {
	      return;
	    }
	    tryCatchInChangeListener(self, change);
	    if (self.startSeq && self.startSeq <= change.seq) {
	      self.startSeq = false;
	    }
	  };

	  var promise = new Promise(function (fulfill, reject) {
	    opts.complete = function (err, res) {
	      if (err) {
	        reject(err);
	      } else {
	        fulfill(res);
	      }
	    };
	  });
	  self.once('cancel', function () {
	    db.removeListener('destroyed', onDestroy);
	    opts.complete(null, {status: 'cancelled'});
	  });
	  this.then = promise.then.bind(promise);
	  this['catch'] = promise['catch'].bind(promise);
	  this.then(function (result) {
	    complete(null, result);
	  }, complete);



	  if (!db.taskqueue.isReady) {
	    db.taskqueue.addTask(function () {
	      if (self.isCancelled) {
	        self.emit('cancel');
	      } else {
	        self.doChanges(opts);
	      }
	    });
	  } else {
	    self.doChanges(opts);
	  }
	}
	Changes.prototype.cancel = function () {
	  this.isCancelled = true;
	  if (this.db.taskqueue.isReady) {
	    this.emit('cancel');
	  }
	};
	function processChange(doc, metadata, opts) {
	  var changeList = [{rev: doc._rev}];
	  if (opts.style === 'all_docs') {
	    changeList = pouchdbMerge.collectLeaves(metadata.rev_tree)
	    .map(function (x) { return {rev: x.rev}; });
	  }
	  var change = {
	    id: metadata.id,
	    changes: changeList,
	    doc: doc
	  };

	  if (pouchdbMerge.isDeleted(metadata, doc._rev)) {
	    change.deleted = true;
	  }
	  if (opts.conflicts) {
	    change.doc._conflicts = pouchdbMerge.collectConflicts(metadata);
	    if (!change.doc._conflicts.length) {
	      delete change.doc._conflicts;
	    }
	  }
	  return change;
	}

	Changes.prototype.doChanges = function (opts) {
	  var self = this;
	  var callback = opts.complete;

	  opts = pouchdbUtils.clone(opts);
	  if ('live' in opts && !('continuous' in opts)) {
	    opts.continuous = opts.live;
	  }
	  opts.processChange = processChange;

	  if (opts.since === 'latest') {
	    opts.since = 'now';
	  }
	  if (!opts.since) {
	    opts.since = 0;
	  }
	  if (opts.since === 'now') {
	    this.db.info().then(function (info) {
	      /* istanbul ignore if */
	      if (self.isCancelled) {
	        callback(null, {status: 'cancelled'});
	        return;
	      }
	      opts.since = info.update_seq;
	      self.doChanges(opts);
	    }, callback);
	    return;
	  }

	  if (opts.continuous && opts.since !== 'now') {
	    this.db.info().then(function (info) {
	      self.startSeq = info.update_seq;
	    /* istanbul ignore next */
	    }, function (err) {
	      if (err.id === 'idbNull') {
	        // db closed before this returned thats ok
	        return;
	      }
	      throw err;
	    });
	  }

	  if (opts.view && !opts.filter) {
	    opts.filter = '_view';
	  }

	  if (opts.filter && typeof opts.filter === 'string') {
	    if (opts.filter === '_view') {
	      opts.view = pouchdbUtils.normalizeDdocFunctionName(opts.view);
	    } else {
	      opts.filter = pouchdbUtils.normalizeDdocFunctionName(opts.filter);
	    }

	    if (this.db.type() !== 'http' && !opts.doc_ids) {
	      return this.filterChanges(opts);
	    }
	  }

	  if (!('descending' in opts)) {
	    opts.descending = false;
	  }

	  // 0 and 1 should return 1 document
	  opts.limit = opts.limit === 0 ? 1 : opts.limit;
	  opts.complete = callback;
	  var newPromise = this.db._changes(opts);
	  if (newPromise && typeof newPromise.cancel === 'function') {
	    var cancel = self.cancel;
	    self.cancel = getArguments(function (args) {
	      newPromise.cancel();
	      cancel.apply(this, args);
	    });
	  }
	};

	Changes.prototype.filterChanges = function (opts) {
	  var self = this;
	  var callback = opts.complete;
	  if (opts.filter === '_view') {
	    if (!opts.view || typeof opts.view !== 'string') {
	      var err = pouchdbErrors.createError(pouchdbErrors.BAD_REQUEST,
	        '`view` filter parameter not found or invalid.');
	      return callback(err);
	    }
	    // fetch a view from a design doc, make it behave like a filter
	    var viewName = pouchdbUtils.parseDdocFunctionName(opts.view);
	    this.db.get('_design/' + viewName[0], function (err, ddoc) {
	      /* istanbul ignore if */
	      if (self.isCancelled) {
	        return callback(null, {status: 'cancelled'});
	      }
	      /* istanbul ignore next */
	      if (err) {
	        return callback(pouchdbErrors.generateErrorFromResponse(err));
	      }
	      var mapFun = ddoc && ddoc.views && ddoc.views[viewName[1]] &&
	        ddoc.views[viewName[1]].map;
	      if (!mapFun) {
	        return callback(pouchdbErrors.createError(pouchdbErrors.MISSING_DOC,
	          (ddoc.views ? 'missing json key: ' + viewName[1] :
	            'missing json key: views')));
	      }
	      opts.filter = evalView(mapFun);
	      self.doChanges(opts);
	    });
	  } else {
	    // fetch a filter from a design doc
	    var filterName = pouchdbUtils.parseDdocFunctionName(opts.filter);
	    if (!filterName) {
	      return self.doChanges(opts);
	    }
	    this.db.get('_design/' + filterName[0], function (err, ddoc) {
	      /* istanbul ignore if */
	      if (self.isCancelled) {
	        return callback(null, {status: 'cancelled'});
	      }
	      /* istanbul ignore next */
	      if (err) {
	        return callback(pouchdbErrors.generateErrorFromResponse(err));
	      }
	      var filterFun = ddoc && ddoc.filters && ddoc.filters[filterName[1]];
	      if (!filterFun) {
	        return callback(pouchdbErrors.createError(pouchdbErrors.MISSING_DOC,
	          ((ddoc && ddoc.filters) ? 'missing json key: ' + filterName[1]
	            : 'missing json key: filters')));
	      }
	      opts.filter = evalFilter(filterFun);
	      self.doChanges(opts);
	    });
	  }
	};

	/*
	 * A generic pouch adapter
	 */

	function compare(left, right) {
	  return left < right ? -1 : left > right ? 1 : 0;
	}

	// returns first element of arr satisfying callback predicate
	function arrayFirst(arr, callback) {
	  for (var i = 0; i < arr.length; i++) {
	    if (callback(arr[i], i) === true) {
	      return arr[i];
	    }
	  }
	}

	// Wrapper for functions that call the bulkdocs api with a single doc,
	// if the first result is an error, return an error
	function yankError(callback) {
	  return function (err, results) {
	    if (err || (results[0] && results[0].error)) {
	      callback(err || results[0]);
	    } else {
	      callback(null, results.length ? results[0]  : results);
	    }
	  };
	}

	// clean docs given to us by the user
	function cleanDocs(docs) {
	  for (var i = 0; i < docs.length; i++) {
	    var doc = docs[i];
	    if (doc._deleted) {
	      delete doc._attachments; // ignore atts for deleted docs
	    } else if (doc._attachments) {
	      // filter out extraneous keys from _attachments
	      var atts = Object.keys(doc._attachments);
	      for (var j = 0; j < atts.length; j++) {
	        var att = atts[j];
	        doc._attachments[att] = pouchdbUtils.pick(doc._attachments[att],
	          ['data', 'digest', 'content_type', 'length', 'revpos', 'stub']);
	      }
	    }
	  }
	}

	// compare two docs, first by _id then by _rev
	function compareByIdThenRev(a, b) {
	  var idCompare = compare(a._id, b._id);
	  if (idCompare !== 0) {
	    return idCompare;
	  }
	  var aStart = a._revisions ? a._revisions.start : 0;
	  var bStart = b._revisions ? b._revisions.start : 0;
	  return compare(aStart, bStart);
	}

	// for every node in a revision tree computes its distance from the closest
	// leaf
	function computeHeight(revs) {
	  var height = {};
	  var edges = [];
	  pouchdbMerge.traverseRevTree(revs, function (isLeaf, pos, id, prnt) {
	    var rev = pos + "-" + id;
	    if (isLeaf) {
	      height[rev] = 0;
	    }
	    if (prnt !== undefined) {
	      edges.push({from: prnt, to: rev});
	    }
	    return rev;
	  });

	  edges.reverse();
	  edges.forEach(function (edge) {
	    if (height[edge.from] === undefined) {
	      height[edge.from] = 1 + height[edge.to];
	    } else {
	      height[edge.from] = Math.min(height[edge.from], 1 + height[edge.to]);
	    }
	  });
	  return height;
	}

	function allDocsKeysQuery(api, opts, callback) {
	  var keys =  ('limit' in opts) ?
	      opts.keys.slice(opts.skip, opts.limit + opts.skip) :
	      (opts.skip > 0) ? opts.keys.slice(opts.skip) : opts.keys;
	  if (opts.descending) {
	    keys.reverse();
	  }
	  if (!keys.length) {
	    return api._allDocs({limit: 0}, callback);
	  }
	  var finalResults = {
	    offset: opts.skip
	  };
	  return Promise.all(keys.map(function (key) {
	    var subOpts = jsExtend.extend({key: key, deleted: 'ok'}, opts);
	    ['limit', 'skip', 'keys'].forEach(function (optKey) {
	      delete subOpts[optKey];
	    });
	    return new Promise(function (resolve, reject) {
	      api._allDocs(subOpts, function (err, res) {
	        /* istanbul ignore if */
	        if (err) {
	          return reject(err);
	        }
	        finalResults.total_rows = res.total_rows;
	        resolve(res.rows[0] || {key: key, error: 'not_found'});
	      });
	    });
	  })).then(function (results) {
	    finalResults.rows = results;
	    return finalResults;
	  });
	}

	// all compaction is done in a queue, to avoid attaching
	// too many listeners at once
	function doNextCompaction(self) {
	  var task = self._compactionQueue[0];
	  var opts = task.opts;
	  var callback = task.callback;
	  self.get('_local/compaction').catch(function () {
	    return false;
	  }).then(function (doc) {
	    if (doc && doc.last_seq) {
	      opts.last_seq = doc.last_seq;
	    }
	    self._compact(opts, function (err, res) {
	      /* istanbul ignore if */
	      if (err) {
	        callback(err);
	      } else {
	        callback(null, res);
	      }
	      process.nextTick(function () {
	        self._compactionQueue.shift();
	        if (self._compactionQueue.length) {
	          doNextCompaction(self);
	        }
	      });
	    });
	  });
	}

	function attachmentNameError(name) {
	  if (name.charAt(0) === '_') {
	    return name + 'is not a valid attachment name, attachment ' +
	      'names cannot start with \'_\'';
	  }
	  return false;
	}

	inherits(AbstractPouchDB, events.EventEmitter);

	function AbstractPouchDB() {
	  events.EventEmitter.call(this);
	}

	AbstractPouchDB.prototype.post =
	  pouchdbUtils.adapterFun('post', function (doc, opts, callback) {
	  if (typeof opts === 'function') {
	    callback = opts;
	    opts = {};
	  }
	  if (typeof doc !== 'object' || Array.isArray(doc)) {
	    return callback(pouchdbErrors.createError(pouchdbErrors.NOT_AN_OBJECT));
	  }
	  this.bulkDocs({docs: [doc]}, opts, yankError(callback));
	});

	AbstractPouchDB.prototype.put =
	  pouchdbUtils.adapterFun('put', getArguments(function (args) {
	  var temp, temptype, opts, callback;
	  var warned = false;
	  var doc = args.shift();
	  var id = '_id' in doc;
	  if (typeof doc !== 'object' || Array.isArray(doc)) {
	    callback = args.pop();
	    return callback(pouchdbErrors.createError(pouchdbErrors.NOT_AN_OBJECT));
	  }

	  function warn() {
	    if (warned) {
	      return;
	    }
	    pouchdbUtils.guardedConsole('warn', 'db.put(doc, id, rev) has been deprecated and will be ' +
	                 'removed in a future release, please use ' +
	                 'db.put({_id: id, _rev: rev}) instead');
	    warned = true;
	  }

	  /* eslint no-constant-condition: 0 */
	  while (true) {
	    temp = args.shift();
	    temptype = typeof temp;
	    if (temptype === "string" && !id) {
	      warn();
	      doc._id = temp;
	      id = true;
	    } else if (temptype === "string" && id && !('_rev' in doc)) {
	      warn();
	      doc._rev = temp;
	    } else if (temptype === "object") {
	      opts = temp;
	    } else if (temptype === "function") {
	      callback = temp;
	    }
	    if (!args.length) {
	      break;
	    }
	  }
	  opts = opts || {};
	  pouchdbUtils.invalidIdError(doc._id);
	  if (pouchdbMerge.isLocalId(doc._id) && typeof this._putLocal === 'function') {
	    if (doc._deleted) {
	      return this._removeLocal(doc, callback);
	    } else {
	      return this._putLocal(doc, callback);
	    }
	  }
	  this.bulkDocs({docs: [doc]}, opts, yankError(callback));
	}));

	AbstractPouchDB.prototype.putAttachment =
	  pouchdbUtils.adapterFun('putAttachment', function (docId, attachmentId, rev,
	                                              blob, type) {
	  var api = this;
	  if (typeof type === 'function') {
	    type = blob;
	    blob = rev;
	    rev = null;
	  }
	  // Lets fix in https://github.com/pouchdb/pouchdb/issues/3267
	  /* istanbul ignore if */
	  if (typeof type === 'undefined') {
	    type = blob;
	    blob = rev;
	    rev = null;
	  }

	  function createAttachment(doc) {
	    var prevrevpos = '_rev' in doc ? parseInt(doc._rev, 10) : 0;
	    doc._attachments = doc._attachments || {};
	    doc._attachments[attachmentId] = {
	      content_type: type,
	      data: blob,
	      revpos: ++prevrevpos
	    };
	    return api.put(doc);
	  }

	  return api.get(docId).then(function (doc) {
	    if (doc._rev !== rev) {
	      throw pouchdbErrors.createError(pouchdbErrors.REV_CONFLICT);
	    }

	    return createAttachment(doc);
	  }, function (err) {
	     // create new doc
	    /* istanbul ignore else */
	    if (err.reason === pouchdbErrors.MISSING_DOC.message) {
	      return createAttachment({_id: docId});
	    } else {
	      throw err;
	    }
	  });
	});

	AbstractPouchDB.prototype.removeAttachment =
	  pouchdbUtils.adapterFun('removeAttachment', function (docId, attachmentId, rev,
	                                                 callback) {
	  var self = this;
	  self.get(docId, function (err, obj) {
	    /* istanbul ignore if */
	    if (err) {
	      callback(err);
	      return;
	    }
	    if (obj._rev !== rev) {
	      callback(pouchdbErrors.createError(pouchdbErrors.REV_CONFLICT));
	      return;
	    }
	    /* istanbul ignore if */
	    if (!obj._attachments) {
	      return callback();
	    }
	    delete obj._attachments[attachmentId];
	    if (Object.keys(obj._attachments).length === 0) {
	      delete obj._attachments;
	    }
	    self.put(obj, callback);
	  });
	});

	AbstractPouchDB.prototype.remove =
	  pouchdbUtils.adapterFun('remove', function (docOrId, optsOrRev, opts, callback) {
	  var doc;
	  if (typeof optsOrRev === 'string') {
	    // id, rev, opts, callback style
	    doc = {
	      _id: docOrId,
	      _rev: optsOrRev
	    };
	    if (typeof opts === 'function') {
	      callback = opts;
	      opts = {};
	    }
	  } else {
	    // doc, opts, callback style
	    doc = docOrId;
	    if (typeof optsOrRev === 'function') {
	      callback = optsOrRev;
	      opts = {};
	    } else {
	      callback = opts;
	      opts = optsOrRev;
	    }
	  }
	  opts = opts || {};
	  opts.was_delete = true;
	  var newDoc = {_id: doc._id, _rev: (doc._rev || opts.rev)};
	  newDoc._deleted = true;
	  if (pouchdbMerge.isLocalId(newDoc._id) && typeof this._removeLocal === 'function') {
	    return this._removeLocal(doc, callback);
	  }
	  this.bulkDocs({docs: [newDoc]}, opts, yankError(callback));
	});

	AbstractPouchDB.prototype.revsDiff =
	  pouchdbUtils.adapterFun('revsDiff', function (req, opts, callback) {
	  if (typeof opts === 'function') {
	    callback = opts;
	    opts = {};
	  }
	  var ids = Object.keys(req);

	  if (!ids.length) {
	    return callback(null, {});
	  }

	  var count = 0;
	  var missing = new pouchdbCollections.Map();

	  function addToMissing(id, revId) {
	    if (!missing.has(id)) {
	      missing.set(id, {missing: []});
	    }
	    missing.get(id).missing.push(revId);
	  }

	  function processDoc(id, rev_tree) {
	    // Is this fast enough? Maybe we should switch to a set simulated by a map
	    var missingForId = req[id].slice(0);
	    pouchdbMerge.traverseRevTree(rev_tree, function (isLeaf, pos, revHash, ctx,
	      opts) {
	        var rev = pos + '-' + revHash;
	        var idx = missingForId.indexOf(rev);
	        if (idx === -1) {
	          return;
	        }

	        missingForId.splice(idx, 1);
	        /* istanbul ignore if */
	        if (opts.status !== 'available') {
	          addToMissing(id, rev);
	        }
	      });

	    // Traversing the tree is synchronous, so now `missingForId` contains
	    // revisions that were not found in the tree
	    missingForId.forEach(function (rev) {
	      addToMissing(id, rev);
	    });
	  }

	  ids.map(function (id) {
	    this._getRevisionTree(id, function (err, rev_tree) {
	      if (err && err.status === 404 && err.message === 'missing') {
	        missing.set(id, {missing: req[id]});
	      } else if (err) {
	        /* istanbul ignore next */
	        return callback(err);
	      } else {
	        processDoc(id, rev_tree);
	      }

	      if (++count === ids.length) {
	        // convert LazyMap to object
	        var missingObj = {};
	        missing.forEach(function (value, key) {
	          missingObj[key] = value;
	        });
	        return callback(null, missingObj);
	      }
	    });
	  }, this);
	});

	// _bulk_get API for faster replication, as described in
	// https://github.com/apache/couchdb-chttpd/pull/33
	// At the "abstract" level, it will just run multiple get()s in
	// parallel, because this isn't much of a performance cost
	// for local databases (except the cost of multiple transactions, which is
	// small). The http adapter overrides this in order
	// to do a more efficient single HTTP request.
	AbstractPouchDB.prototype.bulkGet =
	  pouchdbUtils.adapterFun('bulkGet', function (opts, callback) {
	  pouchdbUtils.bulkGetShim(this, opts, callback);
	});

	// compact one document and fire callback
	// by compacting we mean removing all revisions which
	// are further from the leaf in revision tree than max_height
	AbstractPouchDB.prototype.compactDocument =
	  pouchdbUtils.adapterFun('compactDocument', function (docId, maxHeight, callback) {
	  var self = this;
	  this._getRevisionTree(docId, function (err, revTree) {
	    /* istanbul ignore if */
	    if (err) {
	      return callback(err);
	    }
	    var height = computeHeight(revTree);
	    var candidates = [];
	    var revs = [];
	    Object.keys(height).forEach(function (rev) {
	      if (height[rev] > maxHeight) {
	        candidates.push(rev);
	      }
	    });

	    pouchdbMerge.traverseRevTree(revTree, function (isLeaf, pos, revHash, ctx, opts) {
	      var rev = pos + '-' + revHash;
	      if (opts.status === 'available' && candidates.indexOf(rev) !== -1) {
	        revs.push(rev);
	      }
	    });
	    self._doCompaction(docId, revs, callback);
	  });
	});

	// compact the whole database using single document
	// compaction
	AbstractPouchDB.prototype.compact =
	  pouchdbUtils.adapterFun('compact', function (opts, callback) {
	  if (typeof opts === 'function') {
	    callback = opts;
	    opts = {};
	  }

	  var self = this;
	  opts = opts || {};

	  self._compactionQueue = self._compactionQueue || [];
	  self._compactionQueue.push({opts: opts, callback: callback});
	  if (self._compactionQueue.length === 1) {
	    doNextCompaction(self);
	  }
	});
	AbstractPouchDB.prototype._compact = function (opts, callback) {
	  var self = this;
	  var changesOpts = {
	    return_docs: false,
	    last_seq: opts.last_seq || 0
	  };
	  var promises = [];

	  function onChange(row) {
	    promises.push(self.compactDocument(row.id, 0));
	  }
	  function onComplete(resp) {
	    var lastSeq = resp.last_seq;
	    Promise.all(promises).then(function () {
	      return pouchdbUtils.upsert(self, '_local/compaction', function deltaFunc(doc) {
	        if (!doc.last_seq || doc.last_seq < lastSeq) {
	          doc.last_seq = lastSeq;
	          return doc;
	        }
	        return false; // somebody else got here first, don't update
	      });
	    }).then(function () {
	      callback(null, {ok: true});
	    }).catch(callback);
	  }
	  self.changes(changesOpts)
	    .on('change', onChange)
	    .on('complete', onComplete)
	    .on('error', callback);
	};
	/* Begin api wrappers. Specific functionality to storage belongs in the
	   _[method] */
	AbstractPouchDB.prototype.get =
	  pouchdbUtils.adapterFun('get', function (id, opts, callback) {
	  if (typeof opts === 'function') {
	    callback = opts;
	    opts = {};
	  }
	  if (typeof id !== 'string') {
	    return callback(pouchdbErrors.createError(pouchdbErrors.INVALID_ID));
	  }
	  if (pouchdbMerge.isLocalId(id) && typeof this._getLocal === 'function') {
	    return this._getLocal(id, callback);
	  }
	  var leaves = [], self = this;

	  function finishOpenRevs() {
	    var result = [];
	    var count = leaves.length;
	    /* istanbul ignore if */
	    if (!count) {
	      return callback(null, result);
	    }
	    // order with open_revs is unspecified
	    leaves.forEach(function (leaf) {
	      self.get(id, {
	        rev: leaf,
	        revs: opts.revs,
	        attachments: opts.attachments
	      }, function (err, doc) {
	        if (!err) {
	          result.push({ok: doc});
	        } else {
	          result.push({missing: leaf});
	        }
	        count--;
	        if (!count) {
	          callback(null, result);
	        }
	      });
	    });
	  }

	  if (opts.open_revs) {
	    if (opts.open_revs === "all") {
	      this._getRevisionTree(id, function (err, rev_tree) {
	        if (err) {
	          return callback(err);
	        }
	        leaves = pouchdbMerge.collectLeaves(rev_tree).map(function (leaf) {
	          return leaf.rev;
	        });
	        finishOpenRevs();
	      });
	    } else {
	      if (Array.isArray(opts.open_revs)) {
	        leaves = opts.open_revs;
	        for (var i = 0; i < leaves.length; i++) {
	          var l = leaves[i];
	          // looks like it's the only thing couchdb checks
	          if (!(typeof (l) === "string" && /^\d+-/.test(l))) {
	            return callback(pouchdbErrors.createError(pouchdbErrors.INVALID_REV));
	          }
	        }
	        finishOpenRevs();
	      } else {
	        return callback(pouchdbErrors.createError(pouchdbErrors.UNKNOWN_ERROR,
	          'function_clause'));
	      }
	    }
	    return; // open_revs does not like other options
	  }

	  return this._get(id, opts, function (err, result) {
	    if (err) {
	      return callback(err);
	    }

	    var doc = result.doc;
	    var metadata = result.metadata;
	    var ctx = result.ctx;

	    if (opts.conflicts) {
	      var conflicts = pouchdbMerge.collectConflicts(metadata);
	      if (conflicts.length) {
	        doc._conflicts = conflicts;
	      }
	    }

	    if (pouchdbMerge.isDeleted(metadata, doc._rev)) {
	      doc._deleted = true;
	    }

	    if (opts.revs || opts.revs_info) {
	      var paths = pouchdbMerge.rootToLeaf(metadata.rev_tree);
	      var path = arrayFirst(paths, function (arr) {
	        return arr.ids.map(function (x) { return x.id; })
	          .indexOf(doc._rev.split('-')[1]) !== -1;
	      });

	      var indexOfRev = path.ids.map(function (x) {return x.id; })
	        .indexOf(doc._rev.split('-')[1]) + 1;
	      var howMany = path.ids.length - indexOfRev;
	      path.ids.splice(indexOfRev, howMany);
	      path.ids.reverse();

	      if (opts.revs) {
	        doc._revisions = {
	          start: (path.pos + path.ids.length) - 1,
	          ids: path.ids.map(function (rev) {
	            return rev.id;
	          })
	        };
	      }
	      if (opts.revs_info) {
	        var pos =  path.pos + path.ids.length;
	        doc._revs_info = path.ids.map(function (rev) {
	          pos--;
	          return {
	            rev: pos + '-' + rev.id,
	            status: rev.opts.status
	          };
	        });
	      }
	    }

	    if (opts.attachments && doc._attachments) {
	      var attachments = doc._attachments;
	      var count = Object.keys(attachments).length;
	      if (count === 0) {
	        return callback(null, doc);
	      }
	      Object.keys(attachments).forEach(function (key) {
	        this._getAttachment(doc._id, key, attachments[key], {
	          // Previously the revision handling was done in adapter.js
	          // getAttachment, however since idb-next doesnt we need to
	          // pass the rev through
	          rev: doc._rev,
	          binary: opts.binary,
	          ctx: ctx
	        }, function (err, data) {
	          var att = doc._attachments[key];
	          att.data = data;
	          delete att.stub;
	          delete att.length;
	          if (!--count) {
	            callback(null, doc);
	          }
	        });
	      }, self);
	    } else {
	      if (doc._attachments) {
	        for (var key in doc._attachments) {
	          /* istanbul ignore else */
	          if (doc._attachments.hasOwnProperty(key)) {
	            doc._attachments[key].stub = true;
	          }
	        }
	      }
	      callback(null, doc);
	    }
	  });
	});

	// TODO: I dont like this, it forces an extra read for every
	// attachment read and enforces a confusing api between
	// adapter.js and the adapter implementation
	AbstractPouchDB.prototype.getAttachment =
	  pouchdbUtils.adapterFun('getAttachment', function (docId, attachmentId, opts,
	                                              callback) {
	  var self = this;
	  if (opts instanceof Function) {
	    callback = opts;
	    opts = {};
	  }
	  this._get(docId, opts, function (err, res) {
	    if (err) {
	      return callback(err);
	    }
	    if (res.doc._attachments && res.doc._attachments[attachmentId]) {
	      opts.ctx = res.ctx;
	      opts.binary = true;
	      self._getAttachment(docId, attachmentId,
	                          res.doc._attachments[attachmentId], opts, callback);
	    } else {
	      return callback(pouchdbErrors.createError(pouchdbErrors.MISSING_DOC));
	    }
	  });
	});

	AbstractPouchDB.prototype.allDocs =
	  pouchdbUtils.adapterFun('allDocs', function (opts, callback) {
	  if (typeof opts === 'function') {
	    callback = opts;
	    opts = {};
	  }
	  opts.skip = typeof opts.skip !== 'undefined' ? opts.skip : 0;
	  if (opts.start_key) {
	    opts.startkey = opts.start_key;
	  }
	  if (opts.end_key) {
	    opts.endkey = opts.end_key;
	  }
	  if ('keys' in opts) {
	    if (!Array.isArray(opts.keys)) {
	      return callback(new TypeError('options.keys must be an array'));
	    }
	    var incompatibleOpt =
	      ['startkey', 'endkey', 'key'].filter(function (incompatibleOpt) {
	      return incompatibleOpt in opts;
	    })[0];
	    if (incompatibleOpt) {
	      callback(pouchdbErrors.createError(pouchdbErrors.QUERY_PARSE_ERROR,
	        'Query parameter `' + incompatibleOpt +
	        '` is not compatible with multi-get'
	      ));
	      return;
	    }
	    if (this.type() !== 'http') {
	      return allDocsKeysQuery(this, opts, callback);
	    }
	  }

	  return this._allDocs(opts, callback);
	});

	AbstractPouchDB.prototype.changes = function (opts, callback) {
	  if (typeof opts === 'function') {
	    callback = opts;
	    opts = {};
	  }
	  return new Changes(this, opts, callback);
	};

	AbstractPouchDB.prototype.close =
	  pouchdbUtils.adapterFun('close', function (callback) {
	  this._closed = true;
	  return this._close(callback);
	});

	AbstractPouchDB.prototype.info = pouchdbUtils.adapterFun('info', function (callback) {
	  var self = this;
	  this._info(function (err, info) {
	    if (err) {
	      return callback(err);
	    }
	    // assume we know better than the adapter, unless it informs us
	    info.db_name = info.db_name || self._db_name;
	    info.auto_compaction = !!(self.auto_compaction && self.type() !== 'http');
	    info.adapter = self.type();
	    callback(null, info);
	  });
	});

	AbstractPouchDB.prototype.id = pouchdbUtils.adapterFun('id', function (callback) {
	  return this._id(callback);
	});

	AbstractPouchDB.prototype.type = function () {
	  /* istanbul ignore next */
	  return (typeof this._type === 'function') ? this._type() : this.adapter;
	};

	AbstractPouchDB.prototype.bulkDocs =
	  pouchdbUtils.adapterFun('bulkDocs', function (req, opts, callback) {
	  if (typeof opts === 'function') {
	    callback = opts;
	    opts = {};
	  }

	  opts = opts || {};

	  if (Array.isArray(req)) {
	    req = {
	      docs: req
	    };
	  }

	  if (!req || !req.docs || !Array.isArray(req.docs)) {
	    return callback(pouchdbErrors.createError(pouchdbErrors.MISSING_BULK_DOCS));
	  }

	  for (var i = 0; i < req.docs.length; ++i) {
	    if (typeof req.docs[i] !== 'object' || Array.isArray(req.docs[i])) {
	      return callback(pouchdbErrors.createError(pouchdbErrors.NOT_AN_OBJECT));
	    }
	  }

	  var attachmentError;
	  req.docs.forEach(function (doc) {
	    if (doc._attachments) {
	      Object.keys(doc._attachments).forEach(function (name) {
	        attachmentError = attachmentError || attachmentNameError(name);
	      });
	    }
	  });

	  if (attachmentError) {
	    return callback(pouchdbErrors.createError(pouchdbErrors.BAD_REQUEST, attachmentError));
	  }

	  if (!('new_edits' in opts)) {
	    if ('new_edits' in req) {
	      opts.new_edits = req.new_edits;
	    } else {
	      opts.new_edits = true;
	    }
	  }

	  if (!opts.new_edits && this.type() !== 'http') {
	    // ensure revisions of the same doc are sorted, so that
	    // the local adapter processes them correctly (#2935)
	    req.docs.sort(compareByIdThenRev);
	  }

	  cleanDocs(req.docs);

	  return this._bulkDocs(req, opts, function (err, res) {
	    if (err) {
	      return callback(err);
	    }
	    if (!opts.new_edits) {
	      // this is what couch does when new_edits is false
	      res = res.filter(function (x) {
	        return x.error;
	      });
	    }
	    callback(null, res);
	  });
	});

	AbstractPouchDB.prototype.registerDependentDatabase =
	  pouchdbUtils.adapterFun('registerDependentDatabase', function (dependentDb,
	                                                          callback) {
	  var depDB = new this.constructor(dependentDb, this.__opts);

	  function diffFun(doc) {
	    doc.dependentDbs = doc.dependentDbs || {};
	    if (doc.dependentDbs[dependentDb]) {
	      return false; // no update required
	    }
	    doc.dependentDbs[dependentDb] = true;
	    return doc;
	  }
	  pouchdbUtils.upsert(this, '_local/_pouch_dependentDbs', diffFun)
	    .then(function () {
	      callback(null, {db: depDB});
	    }).catch(callback);
	});

	AbstractPouchDB.prototype.destroy =
	  pouchdbUtils.adapterFun('destroy', function (opts, callback) {

	  if (typeof opts === 'function') {
	    callback = opts;
	    opts = {};
	  }

	  var self = this;
	  var usePrefix = 'use_prefix' in self ? self.use_prefix : true;

	  function destroyDb() {
	    // call destroy method of the particular adaptor
	    self._destroy(opts, function (err, resp) {
	      if (err) {
	        return callback(err);
	      }
	      self._destroyed = true;
	      self.emit('destroyed');
	      callback(null, resp || { 'ok': true });
	    });
	  }

	  if (self.type() === 'http') {
	    // no need to check for dependent DBs if it's a remote DB
	    return destroyDb();
	  }

	  self.get('_local/_pouch_dependentDbs', function (err, localDoc) {
	    if (err) {
	      /* istanbul ignore if */
	      if (err.status !== 404) {
	        return callback(err);
	      } else { // no dependencies
	        return destroyDb();
	      }
	    }
	    var dependentDbs = localDoc.dependentDbs;
	    var PouchDB = self.constructor;
	    var deletedMap = Object.keys(dependentDbs).map(function (name) {
	      // use_prefix is only false in the browser
	      /* istanbul ignore next */
	      var trueName = usePrefix ?
	        name.replace(new RegExp('^' + PouchDB.prefix), '') : name;
	      return new PouchDB(trueName, self.__opts).destroy();
	    });
	    Promise.all(deletedMap).then(destroyDb, callback);
	  });
	});

	function TaskQueue() {
	  this.isReady = false;
	  this.failed = false;
	  this.queue = [];
	}

	TaskQueue.prototype.execute = function () {
	  var fun;
	  if (this.failed) {
	    while ((fun = this.queue.shift())) {
	      fun(this.failed);
	    }
	  } else {
	    while ((fun = this.queue.shift())) {
	      fun();
	    }
	  }
	};

	TaskQueue.prototype.fail = function (err) {
	  this.failed = err;
	  this.execute();
	};

	TaskQueue.prototype.ready = function (db) {
	  this.isReady = true;
	  this.db = db;
	  this.execute();
	};

	TaskQueue.prototype.addTask = function (fun) {
	  this.queue.push(fun);
	  if (this.failed) {
	    this.execute();
	  }
	};

	function defaultCallback(err) {
	  /* istanbul ignore next */
	  if (err && global.debug) {
	    pouchdbUtils.guardedConsole('error', err);
	  }
	}

	// OK, so here's the deal. Consider this code:
	//     var db1 = new PouchDB('foo');
	//     var db2 = new PouchDB('foo');
	//     db1.destroy();
	// ^ these two both need to emit 'destroyed' events,
	// as well as the PouchDB constructor itself.
	// So we have one db object (whichever one got destroy() called on it)
	// responsible for emitting the initial event, which then gets emitted
	// by the constructor, which then broadcasts it to any other dbs
	// that may have been created with the same name.
	function prepareForDestruction(self, opts) {
	  var name = opts.originalName;
	  var ctor = self.constructor;
	  var destructionListeners = ctor._destructionListeners;

	  function onDestroyed() {
	    ctor.emit('destroyed', name);
	  }

	  function onConstructorDestroyed() {
	    self.removeListener('destroyed', onDestroyed);
	    self.emit('destroyed', self);
	  }

	  self.once('destroyed', onDestroyed);

	  // in setup.js, the constructor is primed to listen for destroy events
	  if (!destructionListeners.has(name)) {
	    destructionListeners.set(name, []);
	  }
	  destructionListeners.get(name).push(onConstructorDestroyed);
	}

	inherits(PouchDB, AbstractPouchDB);
	function PouchDB(name, opts, callback) {

	  /* istanbul ignore if */
	  if (!(this instanceof PouchDB)) {
	    return new PouchDB(name, opts, callback);
	  }

	  var self = this;
	  if (typeof opts === 'function' || typeof opts === 'undefined') {
	    callback = opts;
	    opts = {};
	  }

	  if (name && typeof name === 'object') {
	    opts = name;
	    name = undefined;
	  }

	  if (typeof callback === 'undefined') {
	    callback = defaultCallback;
	  } else {
	    var oldCallback = callback;
	    callback = function () {
	      pouchdbUtils.guardedConsole('warn', 'Using a callback for new PouchDB()' +
	                     'is deprecated.');
	      return oldCallback.apply(null, arguments);
	    };
	  }

	  name = name || opts.name;
	  opts = pouchdbUtils.clone(opts);
	  // if name was specified via opts, ignore for the sake of dependentDbs
	  delete opts.name;
	  this.__opts = opts;
	  var oldCB = callback;
	  self.auto_compaction = opts.auto_compaction;
	  self.prefix = PouchDB.prefix;
	  AbstractPouchDB.call(self);
	  self.taskqueue = new TaskQueue();
	  var promise = new Promise(function (fulfill, reject) {
	    callback = function (err, resp) {
	      /* istanbul ignore if */
	      if (err) {
	        return reject(err);
	      }
	      delete resp.then;
	      fulfill(resp);
	    };

	    opts = pouchdbUtils.clone(opts);
	    var backend, error;
	    (function () {
	      try {

	        if (typeof name !== 'string') {
	          error = new Error('Missing/invalid DB name');
	          error.code = 400;
	          throw error;
	        }

	        var prefixedName = (opts.prefix || '') + name;
	        backend = PouchDB.parseAdapter(prefixedName, opts);

	        opts.originalName = name;
	        opts.name = backend.name;
	        opts.adapter = opts.adapter || backend.adapter;
	        self._adapter = opts.adapter;
	        debug('pouchdb:adapter')('Picked adapter: ' + opts.adapter);

	        self._db_name = name;
	        if (!PouchDB.adapters[opts.adapter]) {
	          error = new Error('Adapter is missing');
	          error.code = 404;
	          throw error;
	        }

	        /* istanbul ignore if */
	        if (!PouchDB.adapters[opts.adapter].valid()) {
	          error = new Error('Invalid Adapter');
	          error.code = 404;
	          throw error;
	        }
	      } catch (err) {
	        self.taskqueue.fail(err);
	      }
	    }());
	    if (error) {
	      return reject(error); // constructor error, see above
	    }
	    self.adapter = opts.adapter;

	    // needs access to PouchDB;
	    self.replicate = {};

	    self.replicate.from = function (url, opts, callback) {
	      return self.constructor.replicate(url, self, opts, callback);
	    };

	    self.replicate.to = function (url, opts, callback) {
	      return self.constructor.replicate(self, url, opts, callback);
	    };

	    self.sync = function (dbName, opts, callback) {
	      return self.constructor.sync(self, dbName, opts, callback);
	    };

	    self.replicate.sync = self.sync;

	    PouchDB.adapters[opts.adapter].call(self, opts, function (err) {
	      /* istanbul ignore if */
	      if (err) {
	        self.taskqueue.fail(err);
	        callback(err);
	        return;
	      }
	      prepareForDestruction(self, opts);

	      self.emit('created', self);
	      PouchDB.emit('created', opts.originalName);
	      self.taskqueue.ready(self);
	      callback(null, self);
	    });

	  });
	  promise.then(function (resp) {
	    oldCB(null, resp);
	  }, oldCB);
	  self.then = promise.then.bind(promise);
	  self.catch = promise.catch.bind(promise);
	}

	PouchDB.debug = debug;

	PouchDB.adapters = {};
	PouchDB.preferredAdapters = [];

	PouchDB.prefix = '_pouch_';

	var eventEmitter = new events.EventEmitter();

	function setUpEventEmitter(Pouch) {
	  Object.keys(events.EventEmitter.prototype).forEach(function (key) {
	    if (typeof events.EventEmitter.prototype[key] === 'function') {
	      Pouch[key] = eventEmitter[key].bind(eventEmitter);
	    }
	  });

	  // these are created in constructor.js, and allow us to notify each DB with
	  // the same name that it was destroyed, via the constructor object
	  var destructListeners = Pouch._destructionListeners = new pouchdbCollections.Map();
	  Pouch.on('destroyed', function onConstructorDestroyed(name) {
	    destructListeners.get(name).forEach(function (callback) {
	      callback();
	    });
	    destructListeners.delete(name);
	  });
	}

	setUpEventEmitter(PouchDB);

	PouchDB.parseAdapter = function (name, opts) {
	  var match = name.match(/([a-z\-]*):\/\/(.*)/);
	  var adapter, adapterName;
	  if (match) {
	    // the http adapter expects the fully qualified name
	    name = /http(s?)/.test(match[1]) ? match[1] + '://' + match[2] : match[2];
	    adapter = match[1];
	    /* istanbul ignore if */
	    if (!PouchDB.adapters[adapter].valid()) {
	      throw 'Invalid adapter';
	    }
	    return {name: name, adapter: match[1]};
	  }

	  // check for browsers that have been upgraded from websql-only to websql+idb
	  var skipIdb = 'idb' in PouchDB.adapters && 'websql' in PouchDB.adapters &&
	    pouchdbUtils.hasLocalStorage() &&
	    localStorage['_pouch__websqldb_' + PouchDB.prefix + name];


	  if (opts.adapter) {
	    adapterName = opts.adapter;
	  } else if (typeof opts !== 'undefined' && opts.db) {
	    adapterName = 'leveldb';
	  } else { // automatically determine adapter
	    for (var i = 0; i < PouchDB.preferredAdapters.length; ++i) {
	      adapterName = PouchDB.preferredAdapters[i];
	      if (adapterName in PouchDB.adapters) {
	        /* istanbul ignore if */
	        if (skipIdb && adapterName === 'idb') {
	          // log it, because this can be confusing during development
	          pouchdbUtils.guardedConsole('log', 'PouchDB is downgrading "' + name + '" to WebSQL to' +
	            ' avoid data loss, because it was already opened with WebSQL.');
	          continue; // keep using websql to avoid user data loss
	        }
	        break;
	      }
	    }
	  }

	  adapter = PouchDB.adapters[adapterName];

	  // if adapter is invalid, then an error will be thrown later
	  var usePrefix = (adapter && 'use_prefix' in adapter) ?
	      adapter.use_prefix : true;

	  return {
	    name: usePrefix ? (PouchDB.prefix + name) : name,
	    adapter: adapterName
	  };
	};

	PouchDB.adapter = function (id, obj, addToPreferredAdapters) {
	  if (obj.valid()) {
	    PouchDB.adapters[id] = obj;
	    if (addToPreferredAdapters) {
	      PouchDB.preferredAdapters.push(id);
	    }
	  }
	};

	PouchDB.plugin = function (obj) {
	  if (typeof obj === 'function') { // function style for plugins
	    obj(PouchDB);
	  } else {
	    Object.keys(obj).forEach(function (id) { // object style for plugins
	      PouchDB.prototype[id] = obj[id];
	    });
	  }
	  return PouchDB;
	};

	PouchDB.defaults = function (defaultOpts) {
	  function PouchAlt(name, opts, callback) {
	    if (!(this instanceof PouchAlt)) {
	      return new PouchAlt(name, opts, callback);
	    }

	    if (typeof opts === 'function' || typeof opts === 'undefined') {
	      callback = opts;
	      opts = {};
	    }
	    if (name && typeof name === 'object') {
	      opts = name;
	      name = undefined;
	    }

	    opts = jsExtend.extend({}, defaultOpts, opts);
	    PouchDB.call(this, name, opts, callback);
	  }

	  inherits(PouchAlt, PouchDB);

	  PouchAlt.preferredAdapters = PouchDB.preferredAdapters.slice();
	  Object.keys(PouchDB).forEach(function (key) {
	    if (!(key in PouchAlt)) {
	      PouchAlt[key] = PouchDB[key];
	    }
	  });

	  return PouchAlt;
	};

	// managed automatically by set-version.js
	var version = "5.4.1";

	PouchDB.version = version;

	module.exports = PouchDB;
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(4), (function() { return this; }())))

/***/ },
/* 4 */
/***/ function(module, exports) {

	// shim for using process in browser

	var process = module.exports = {};
	var queue = [];
	var draining = false;
	var currentQueue;
	var queueIndex = -1;

	function cleanUpNextTick() {
	    if (!draining || !currentQueue) {
	        return;
	    }
	    draining = false;
	    if (currentQueue.length) {
	        queue = currentQueue.concat(queue);
	    } else {
	        queueIndex = -1;
	    }
	    if (queue.length) {
	        drainQueue();
	    }
	}

	function drainQueue() {
	    if (draining) {
	        return;
	    }
	    var timeout = setTimeout(cleanUpNextTick);
	    draining = true;

	    var len = queue.length;
	    while(len) {
	        currentQueue = queue;
	        queue = [];
	        while (++queueIndex < len) {
	            if (currentQueue) {
	                currentQueue[queueIndex].run();
	            }
	        }
	        queueIndex = -1;
	        len = queue.length;
	    }
	    currentQueue = null;
	    draining = false;
	    clearTimeout(timeout);
	}

	process.nextTick = function (fun) {
	    var args = new Array(arguments.length - 1);
	    if (arguments.length > 1) {
	        for (var i = 1; i < arguments.length; i++) {
	            args[i - 1] = arguments[i];
	        }
	    }
	    queue.push(new Item(fun, args));
	    if (queue.length === 1 && !draining) {
	        setTimeout(drainQueue, 0);
	    }
	};

	// v8 likes predictible objects
	function Item(fun, array) {
	    this.fun = fun;
	    this.array = array;
	}
	Item.prototype.run = function () {
	    this.fun.apply(null, this.array);
	};
	process.title = 'browser';
	process.browser = true;
	process.env = {};
	process.argv = [];
	process.version = ''; // empty string to avoid regexp issues
	process.versions = {};

	function noop() {}

	process.on = noop;
	process.addListener = noop;
	process.once = noop;
	process.off = noop;
	process.removeListener = noop;
	process.removeAllListeners = noop;
	process.emit = noop;

	process.binding = function (name) {
	    throw new Error('process.binding is not supported');
	};

	process.cwd = function () { return '/' };
	process.chdir = function (dir) {
	    throw new Error('process.chdir is not supported');
	};
	process.umask = function() { return 0; };


/***/ },
/* 5 */
/***/ function(module, exports, __webpack_require__) {

	(function(factory) {
	  if(true) {
	    factory(exports);
	  } else {
	    factory(this);
	  }
	}).call(this, function(root) { 

	  var slice   = Array.prototype.slice,
	      each    = Array.prototype.forEach;

	  var extend = function(obj) {
	    if(typeof obj !== 'object') throw obj + ' is not an object' ;

	    var sources = slice.call(arguments, 1); 

	    each.call(sources, function(source) {
	      if(source) {
	        for(var prop in source) {
	          if(typeof source[prop] === 'object' && obj[prop]) {
	            extend.call(obj, obj[prop], source[prop]);
	          } else {
	            obj[prop] = source[prop];
	          }
	        } 
	      }
	    });

	    return obj;
	  }

	  root.extend = extend;
	});


/***/ },
/* 6 */
/***/ function(module, exports, __webpack_require__) {

	
	/**
	 * This is the web browser implementation of `debug()`.
	 *
	 * Expose `debug()` as the module.
	 */

	exports = module.exports = __webpack_require__(7);
	exports.log = log;
	exports.formatArgs = formatArgs;
	exports.save = save;
	exports.load = load;
	exports.useColors = useColors;
	exports.storage = 'undefined' != typeof chrome
	               && 'undefined' != typeof chrome.storage
	                  ? chrome.storage.local
	                  : localstorage();

	/**
	 * Colors.
	 */

	exports.colors = [
	  'lightseagreen',
	  'forestgreen',
	  'goldenrod',
	  'dodgerblue',
	  'darkorchid',
	  'crimson'
	];

	/**
	 * Currently only WebKit-based Web Inspectors, Firefox >= v31,
	 * and the Firebug extension (any Firefox version) are known
	 * to support "%c" CSS customizations.
	 *
	 * TODO: add a `localStorage` variable to explicitly enable/disable colors
	 */

	function useColors() {
	  // is webkit? http://stackoverflow.com/a/16459606/376773
	  return ('WebkitAppearance' in document.documentElement.style) ||
	    // is firebug? http://stackoverflow.com/a/398120/376773
	    (window.console && (console.firebug || (console.exception && console.table))) ||
	    // is firefox >= v31?
	    // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
	    (navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31);
	}

	/**
	 * Map %j to `JSON.stringify()`, since no Web Inspectors do that by default.
	 */

	exports.formatters.j = function(v) {
	  return JSON.stringify(v);
	};


	/**
	 * Colorize log arguments if enabled.
	 *
	 * @api public
	 */

	function formatArgs() {
	  var args = arguments;
	  var useColors = this.useColors;

	  args[0] = (useColors ? '%c' : '')
	    + this.namespace
	    + (useColors ? ' %c' : ' ')
	    + args[0]
	    + (useColors ? '%c ' : ' ')
	    + '+' + exports.humanize(this.diff);

	  if (!useColors) return args;

	  var c = 'color: ' + this.color;
	  args = [args[0], c, 'color: inherit'].concat(Array.prototype.slice.call(args, 1));

	  // the final "%c" is somewhat tricky, because there could be other
	  // arguments passed either before or after the %c, so we need to
	  // figure out the correct index to insert the CSS into
	  var index = 0;
	  var lastC = 0;
	  args[0].replace(/%[a-z%]/g, function(match) {
	    if ('%%' === match) return;
	    index++;
	    if ('%c' === match) {
	      // we only are interested in the *last* %c
	      // (the user may have provided their own)
	      lastC = index;
	    }
	  });

	  args.splice(lastC, 0, c);
	  return args;
	}

	/**
	 * Invokes `console.log()` when available.
	 * No-op when `console.log` is not a "function".
	 *
	 * @api public
	 */

	function log() {
	  // this hackery is required for IE8/9, where
	  // the `console.log` function doesn't have 'apply'
	  return 'object' === typeof console
	    && console.log
	    && Function.prototype.apply.call(console.log, console, arguments);
	}

	/**
	 * Save `namespaces`.
	 *
	 * @param {String} namespaces
	 * @api private
	 */

	function save(namespaces) {
	  try {
	    if (null == namespaces) {
	      exports.storage.removeItem('debug');
	    } else {
	      exports.storage.debug = namespaces;
	    }
	  } catch(e) {}
	}

	/**
	 * Load `namespaces`.
	 *
	 * @return {String} returns the previously persisted debug modes
	 * @api private
	 */

	function load() {
	  var r;
	  try {
	    r = exports.storage.debug;
	  } catch(e) {}
	  return r;
	}

	/**
	 * Enable namespaces listed in `localStorage.debug` initially.
	 */

	exports.enable(load());

	/**
	 * Localstorage attempts to return the localstorage.
	 *
	 * This is necessary because safari throws
	 * when a user disables cookies/localstorage
	 * and you attempt to access it.
	 *
	 * @return {LocalStorage}
	 * @api private
	 */

	function localstorage(){
	  try {
	    return window.localStorage;
	  } catch (e) {}
	}


/***/ },
/* 7 */
/***/ function(module, exports, __webpack_require__) {

	
	/**
	 * This is the common logic for both the Node.js and web browser
	 * implementations of `debug()`.
	 *
	 * Expose `debug()` as the module.
	 */

	exports = module.exports = debug;
	exports.coerce = coerce;
	exports.disable = disable;
	exports.enable = enable;
	exports.enabled = enabled;
	exports.humanize = __webpack_require__(8);

	/**
	 * The currently active debug mode names, and names to skip.
	 */

	exports.names = [];
	exports.skips = [];

	/**
	 * Map of special "%n" handling functions, for the debug "format" argument.
	 *
	 * Valid key names are a single, lowercased letter, i.e. "n".
	 */

	exports.formatters = {};

	/**
	 * Previously assigned color.
	 */

	var prevColor = 0;

	/**
	 * Previous log timestamp.
	 */

	var prevTime;

	/**
	 * Select a color.
	 *
	 * @return {Number}
	 * @api private
	 */

	function selectColor() {
	  return exports.colors[prevColor++ % exports.colors.length];
	}

	/**
	 * Create a debugger with the given `namespace`.
	 *
	 * @param {String} namespace
	 * @return {Function}
	 * @api public
	 */

	function debug(namespace) {

	  // define the `disabled` version
	  function disabled() {
	  }
	  disabled.enabled = false;

	  // define the `enabled` version
	  function enabled() {

	    var self = enabled;

	    // set `diff` timestamp
	    var curr = +new Date();
	    var ms = curr - (prevTime || curr);
	    self.diff = ms;
	    self.prev = prevTime;
	    self.curr = curr;
	    prevTime = curr;

	    // add the `color` if not set
	    if (null == self.useColors) self.useColors = exports.useColors();
	    if (null == self.color && self.useColors) self.color = selectColor();

	    var args = Array.prototype.slice.call(arguments);

	    args[0] = exports.coerce(args[0]);

	    if ('string' !== typeof args[0]) {
	      // anything else let's inspect with %o
	      args = ['%o'].concat(args);
	    }

	    // apply any `formatters` transformations
	    var index = 0;
	    args[0] = args[0].replace(/%([a-z%])/g, function(match, format) {
	      // if we encounter an escaped % then don't increase the array index
	      if (match === '%%') return match;
	      index++;
	      var formatter = exports.formatters[format];
	      if ('function' === typeof formatter) {
	        var val = args[index];
	        match = formatter.call(self, val);

	        // now we need to remove `args[index]` since it's inlined in the `format`
	        args.splice(index, 1);
	        index--;
	      }
	      return match;
	    });

	    if ('function' === typeof exports.formatArgs) {
	      args = exports.formatArgs.apply(self, args);
	    }
	    var logFn = enabled.log || exports.log || console.log.bind(console);
	    logFn.apply(self, args);
	  }
	  enabled.enabled = true;

	  var fn = exports.enabled(namespace) ? enabled : disabled;

	  fn.namespace = namespace;

	  return fn;
	}

	/**
	 * Enables a debug mode by namespaces. This can include modes
	 * separated by a colon and wildcards.
	 *
	 * @param {String} namespaces
	 * @api public
	 */

	function enable(namespaces) {
	  exports.save(namespaces);

	  var split = (namespaces || '').split(/[\s,]+/);
	  var len = split.length;

	  for (var i = 0; i < len; i++) {
	    if (!split[i]) continue; // ignore empty strings
	    namespaces = split[i].replace(/\*/g, '.*?');
	    if (namespaces[0] === '-') {
	      exports.skips.push(new RegExp('^' + namespaces.substr(1) + '$'));
	    } else {
	      exports.names.push(new RegExp('^' + namespaces + '$'));
	    }
	  }
	}

	/**
	 * Disable debug output.
	 *
	 * @api public
	 */

	function disable() {
	  exports.enable('');
	}

	/**
	 * Returns true if the given mode name is enabled, false otherwise.
	 *
	 * @param {String} name
	 * @return {Boolean}
	 * @api public
	 */

	function enabled(name) {
	  var i, len;
	  for (i = 0, len = exports.skips.length; i < len; i++) {
	    if (exports.skips[i].test(name)) {
	      return false;
	    }
	  }
	  for (i = 0, len = exports.names.length; i < len; i++) {
	    if (exports.names[i].test(name)) {
	      return true;
	    }
	  }
	  return false;
	}

	/**
	 * Coerce `val`.
	 *
	 * @param {Mixed} val
	 * @return {Mixed}
	 * @api private
	 */

	function coerce(val) {
	  if (val instanceof Error) return val.stack || val.message;
	  return val;
	}


/***/ },
/* 8 */
/***/ function(module, exports) {

	/**
	 * Helpers.
	 */

	var s = 1000;
	var m = s * 60;
	var h = m * 60;
	var d = h * 24;
	var y = d * 365.25;

	/**
	 * Parse or format the given `val`.
	 *
	 * Options:
	 *
	 *  - `long` verbose formatting [false]
	 *
	 * @param {String|Number} val
	 * @param {Object} options
	 * @return {String|Number}
	 * @api public
	 */

	module.exports = function(val, options){
	  options = options || {};
	  if ('string' == typeof val) return parse(val);
	  return options.long
	    ? long(val)
	    : short(val);
	};

	/**
	 * Parse the given `str` and return milliseconds.
	 *
	 * @param {String} str
	 * @return {Number}
	 * @api private
	 */

	function parse(str) {
	  str = '' + str;
	  if (str.length > 10000) return;
	  var match = /^((?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|years?|yrs?|y)?$/i.exec(str);
	  if (!match) return;
	  var n = parseFloat(match[1]);
	  var type = (match[2] || 'ms').toLowerCase();
	  switch (type) {
	    case 'years':
	    case 'year':
	    case 'yrs':
	    case 'yr':
	    case 'y':
	      return n * y;
	    case 'days':
	    case 'day':
	    case 'd':
	      return n * d;
	    case 'hours':
	    case 'hour':
	    case 'hrs':
	    case 'hr':
	    case 'h':
	      return n * h;
	    case 'minutes':
	    case 'minute':
	    case 'mins':
	    case 'min':
	    case 'm':
	      return n * m;
	    case 'seconds':
	    case 'second':
	    case 'secs':
	    case 'sec':
	    case 's':
	      return n * s;
	    case 'milliseconds':
	    case 'millisecond':
	    case 'msecs':
	    case 'msec':
	    case 'ms':
	      return n;
	  }
	}

	/**
	 * Short format for `ms`.
	 *
	 * @param {Number} ms
	 * @return {String}
	 * @api private
	 */

	function short(ms) {
	  if (ms >= d) return Math.round(ms / d) + 'd';
	  if (ms >= h) return Math.round(ms / h) + 'h';
	  if (ms >= m) return Math.round(ms / m) + 'm';
	  if (ms >= s) return Math.round(ms / s) + 's';
	  return ms + 'ms';
	}

	/**
	 * Long format for `ms`.
	 *
	 * @param {Number} ms
	 * @return {String}
	 * @api private
	 */

	function long(ms) {
	  return plural(ms, d, 'day')
	    || plural(ms, h, 'hour')
	    || plural(ms, m, 'minute')
	    || plural(ms, s, 'second')
	    || ms + ' ms';
	}

	/**
	 * Pluralization helper.
	 */

	function plural(ms, n, name) {
	  if (ms < n) return;
	  if (ms < n * 1.5) return Math.floor(ms / n) + ' ' + name;
	  return Math.ceil(ms / n) + ' ' + name + 's';
	}


/***/ },
/* 9 */
/***/ function(module, exports) {

	if (typeof Object.create === 'function') {
	  // implementation from standard node.js 'util' module
	  module.exports = function inherits(ctor, superCtor) {
	    ctor.super_ = superCtor
	    ctor.prototype = Object.create(superCtor.prototype, {
	      constructor: {
	        value: ctor,
	        enumerable: false,
	        writable: true,
	        configurable: true
	      }
	    });
	  };
	} else {
	  // old school shim for old browsers
	  module.exports = function inherits(ctor, superCtor) {
	    ctor.super_ = superCtor
	    var TempCtor = function () {}
	    TempCtor.prototype = superCtor.prototype
	    ctor.prototype = new TempCtor()
	    ctor.prototype.constructor = ctor
	  }
	}


/***/ },
/* 10 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

	var lie = _interopDefault(__webpack_require__(11));

	/* istanbul ignore next */
	var PouchPromise = typeof Promise === 'function' ? Promise : lie;

	module.exports = PouchPromise;

/***/ },
/* 11 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {'use strict';
	var immediate = __webpack_require__(12);

	/* istanbul ignore next */
	function INTERNAL() {}

	var handlers = {};

	var REJECTED = ['REJECTED'];
	var FULFILLED = ['FULFILLED'];
	var PENDING = ['PENDING'];
	/* istanbul ignore else */
	if (!process.browser) {
	  // in which we actually take advantage of JS scoping
	  var UNHANDLED = ['UNHANDLED'];
	}

	module.exports = Promise;

	function Promise(resolver) {
	  if (typeof resolver !== 'function') {
	    throw new TypeError('resolver must be a function');
	  }
	  this.state = PENDING;
	  this.queue = [];
	  this.outcome = void 0;
	  /* istanbul ignore else */
	  if (!process.browser) {
	    this.handled = UNHANDLED;
	  }
	  if (resolver !== INTERNAL) {
	    safelyResolveThenable(this, resolver);
	  }
	}

	Promise.prototype.catch = function (onRejected) {
	  return this.then(null, onRejected);
	};
	Promise.prototype.then = function (onFulfilled, onRejected) {
	  if (typeof onFulfilled !== 'function' && this.state === FULFILLED ||
	    typeof onRejected !== 'function' && this.state === REJECTED) {
	    return this;
	  }
	  var promise = new this.constructor(INTERNAL);
	  /* istanbul ignore else */
	  if (!process.browser) {
	    if (this.handled === UNHANDLED) {
	      this.handled = null;
	    }
	  }
	  if (this.state !== PENDING) {
	    var resolver = this.state === FULFILLED ? onFulfilled : onRejected;
	    unwrap(promise, resolver, this.outcome);
	  } else {
	    this.queue.push(new QueueItem(promise, onFulfilled, onRejected));
	  }

	  return promise;
	};
	function QueueItem(promise, onFulfilled, onRejected) {
	  this.promise = promise;
	  if (typeof onFulfilled === 'function') {
	    this.onFulfilled = onFulfilled;
	    this.callFulfilled = this.otherCallFulfilled;
	  }
	  if (typeof onRejected === 'function') {
	    this.onRejected = onRejected;
	    this.callRejected = this.otherCallRejected;
	  }
	}
	QueueItem.prototype.callFulfilled = function (value) {
	  handlers.resolve(this.promise, value);
	};
	QueueItem.prototype.otherCallFulfilled = function (value) {
	  unwrap(this.promise, this.onFulfilled, value);
	};
	QueueItem.prototype.callRejected = function (value) {
	  handlers.reject(this.promise, value);
	};
	QueueItem.prototype.otherCallRejected = function (value) {
	  unwrap(this.promise, this.onRejected, value);
	};

	function unwrap(promise, func, value) {
	  immediate(function () {
	    var returnValue;
	    try {
	      returnValue = func(value);
	    } catch (e) {
	      return handlers.reject(promise, e);
	    }
	    if (returnValue === promise) {
	      handlers.reject(promise, new TypeError('Cannot resolve promise with itself'));
	    } else {
	      handlers.resolve(promise, returnValue);
	    }
	  });
	}

	handlers.resolve = function (self, value) {
	  var result = tryCatch(getThen, value);
	  if (result.status === 'error') {
	    return handlers.reject(self, result.value);
	  }
	  var thenable = result.value;

	  if (thenable) {
	    safelyResolveThenable(self, thenable);
	  } else {
	    self.state = FULFILLED;
	    self.outcome = value;
	    var i = -1;
	    var len = self.queue.length;
	    while (++i < len) {
	      self.queue[i].callFulfilled(value);
	    }
	  }
	  return self;
	};
	handlers.reject = function (self, error) {
	  self.state = REJECTED;
	  self.outcome = error;
	  /* istanbul ignore else */
	  if (!process.browser) {
	    if (self.handled === UNHANDLED) {
	      immediate(function () {
	        if (self.handled === UNHANDLED) {
	          process.emit('unhandledRejection', error, self);
	        }
	      });
	    }
	  }
	  var i = -1;
	  var len = self.queue.length;
	  while (++i < len) {
	    self.queue[i].callRejected(error);
	  }
	  return self;
	};

	function getThen(obj) {
	  // Make sure we only access the accessor once as required by the spec
	  var then = obj && obj.then;
	  if (obj && typeof obj === 'object' && typeof then === 'function') {
	    return function appyThen() {
	      then.apply(obj, arguments);
	    };
	  }
	}

	function safelyResolveThenable(self, thenable) {
	  // Either fulfill, reject or reject with error
	  var called = false;
	  function onError(value) {
	    if (called) {
	      return;
	    }
	    called = true;
	    handlers.reject(self, value);
	  }

	  function onSuccess(value) {
	    if (called) {
	      return;
	    }
	    called = true;
	    handlers.resolve(self, value);
	  }

	  function tryToUnwrap() {
	    thenable(onSuccess, onError);
	  }

	  var result = tryCatch(tryToUnwrap);
	  if (result.status === 'error') {
	    onError(result.value);
	  }
	}

	function tryCatch(func, value) {
	  var out = {};
	  try {
	    out.value = func(value);
	    out.status = 'success';
	  } catch (e) {
	    out.status = 'error';
	    out.value = e;
	  }
	  return out;
	}

	Promise.resolve = resolve;
	function resolve(value) {
	  if (value instanceof this) {
	    return value;
	  }
	  return handlers.resolve(new this(INTERNAL), value);
	}

	Promise.reject = reject;
	function reject(reason) {
	  var promise = new this(INTERNAL);
	  return handlers.reject(promise, reason);
	}

	Promise.all = all;
	function all(iterable) {
	  var self = this;
	  if (Object.prototype.toString.call(iterable) !== '[object Array]') {
	    return this.reject(new TypeError('must be an array'));
	  }

	  var len = iterable.length;
	  var called = false;
	  if (!len) {
	    return this.resolve([]);
	  }

	  var values = new Array(len);
	  var resolved = 0;
	  var i = -1;
	  var promise = new this(INTERNAL);

	  while (++i < len) {
	    allResolver(iterable[i], i);
	  }
	  return promise;
	  function allResolver(value, i) {
	    self.resolve(value).then(resolveFromAll, function (error) {
	      if (!called) {
	        called = true;
	        handlers.reject(promise, error);
	      }
	    });
	    function resolveFromAll(outValue) {
	      values[i] = outValue;
	      if (++resolved === len && !called) {
	        called = true;
	        handlers.resolve(promise, values);
	      }
	    }
	  }
	}

	Promise.race = race;
	function race(iterable) {
	  var self = this;
	  if (Object.prototype.toString.call(iterable) !== '[object Array]') {
	    return this.reject(new TypeError('must be an array'));
	  }

	  var len = iterable.length;
	  var called = false;
	  if (!len) {
	    return this.resolve([]);
	  }

	  var i = -1;
	  var promise = new this(INTERNAL);

	  while (++i < len) {
	    resolver(iterable[i]);
	  }
	  return promise;
	  function resolver(value) {
	    self.resolve(value).then(function (response) {
	      if (!called) {
	        called = true;
	        handlers.resolve(promise, response);
	      }
	    }, function (error) {
	      if (!called) {
	        called = true;
	        handlers.reject(promise, error);
	      }
	    });
	  }
	}

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(4)))

/***/ },
/* 12 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(global, process) {'use strict';
	var Mutation = global.MutationObserver || global.WebKitMutationObserver;

	var scheduleDrain;

	if (process.browser) {
	  if (Mutation) {
	    var called = 0;
	    var observer = new Mutation(nextTick);
	    var element = global.document.createTextNode('');
	    observer.observe(element, {
	      characterData: true
	    });
	    scheduleDrain = function () {
	      element.data = (called = ++called % 2);
	    };
	  } else if (!global.setImmediate && typeof global.MessageChannel !== 'undefined') {
	    var channel = new global.MessageChannel();
	    channel.port1.onmessage = nextTick;
	    scheduleDrain = function () {
	      channel.port2.postMessage(0);
	    };
	  } else if ('document' in global && 'onreadystatechange' in global.document.createElement('script')) {
	    scheduleDrain = function () {

	      // Create a <script> element; its readystatechange event will be fired asynchronously once it is inserted
	      // into the document. Do so, thus queuing up the task. Remember to clean up once it's been called.
	      var scriptEl = global.document.createElement('script');
	      scriptEl.onreadystatechange = function () {
	        nextTick();

	        scriptEl.onreadystatechange = null;
	        scriptEl.parentNode.removeChild(scriptEl);
	        scriptEl = null;
	      };
	      global.document.documentElement.appendChild(scriptEl);
	    };
	  } else {
	    scheduleDrain = function () {
	      setTimeout(nextTick, 0);
	    };
	  }
	} else {
	  scheduleDrain = function () {
	    process.nextTick(nextTick);
	  };
	}

	var draining;
	var queue = [];
	//named nextTick for less confusing stack traces
	function nextTick() {
	  draining = true;
	  var i, oldQueue;
	  var len = queue.length;
	  while (len) {
	    oldQueue = queue;
	    queue = [];
	    i = -1;
	    while (++i < len) {
	      oldQueue[i]();
	    }
	    len = queue.length;
	  }
	  draining = false;
	}

	module.exports = immediate;
	function immediate(task) {
	  if (queue.push(task) === 1 && !draining) {
	    scheduleDrain();
	  }
	}

	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }()), __webpack_require__(4)))

/***/ },
/* 13 */
/***/ function(module, exports) {

	'use strict';
	exports.Map = LazyMap; // TODO: use ES6 map
	exports.Set = LazySet; // TODO: use ES6 set
	// based on https://github.com/montagejs/collections
	function LazyMap() {
	  this.store = {};
	}
	LazyMap.prototype.mangle = function (key) {
	  if (typeof key !== "string") {
	    throw new TypeError("key must be a string but Got " + key);
	  }
	  return '$' + key;
	};
	LazyMap.prototype.unmangle = function (key) {
	  return key.substring(1);
	};
	LazyMap.prototype.get = function (key) {
	  var mangled = this.mangle(key);
	  if (mangled in this.store) {
	    return this.store[mangled];
	  }
	  return void 0;
	};
	LazyMap.prototype.set = function (key, value) {
	  var mangled = this.mangle(key);
	  this.store[mangled] = value;
	  return true;
	};
	LazyMap.prototype.has = function (key) {
	  var mangled = this.mangle(key);
	  return mangled in this.store;
	};
	LazyMap.prototype.delete = function (key) {
	  var mangled = this.mangle(key);
	  if (mangled in this.store) {
	    delete this.store[mangled];
	    return true;
	  }
	  return false;
	};
	LazyMap.prototype.forEach = function (cb) {
	  var keys = Object.keys(this.store);
	  for (var i = 0, len = keys.length; i < len; i++) {
	    var key = keys[i];
	    var value = this.store[key];
	    key = this.unmangle(key);
	    cb(value, key);
	  }
	};

	function LazySet(array) {
	  this.store = new LazyMap();

	  // init with an array
	  if (array && Array.isArray(array)) {
	    for (var i = 0, len = array.length; i < len; i++) {
	      this.add(array[i]);
	    }
	  }
	}
	LazySet.prototype.add = function (key) {
	  return this.store.set(key, true);
	};
	LazySet.prototype.has = function (key) {
	  return this.store.has(key);
	};
	LazySet.prototype.delete = function (key) {
	  return this.store.delete(key);
	};


/***/ },
/* 14 */
/***/ function(module, exports) {

	'use strict';

	module.exports = argsArray;

	function argsArray(fun) {
	  return function () {
	    var len = arguments.length;
	    if (len) {
	      var args = [];
	      var i = -1;
	      while (++i < len) {
	        args[i] = arguments[i];
	      }
	      return fun.call(this, args);
	    } else {
	      return fun.call(this, []);
	    }
	  };
	}

/***/ },
/* 15 */
/***/ function(module, exports) {

	// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	function EventEmitter() {
	  this._events = this._events || {};
	  this._maxListeners = this._maxListeners || undefined;
	}
	module.exports = EventEmitter;

	// Backwards-compat with node 0.10.x
	EventEmitter.EventEmitter = EventEmitter;

	EventEmitter.prototype._events = undefined;
	EventEmitter.prototype._maxListeners = undefined;

	// By default EventEmitters will print a warning if more than 10 listeners are
	// added to it. This is a useful default which helps finding memory leaks.
	EventEmitter.defaultMaxListeners = 10;

	// Obviously not all Emitters should be limited to 10. This function allows
	// that to be increased. Set to zero for unlimited.
	EventEmitter.prototype.setMaxListeners = function(n) {
	  if (!isNumber(n) || n < 0 || isNaN(n))
	    throw TypeError('n must be a positive number');
	  this._maxListeners = n;
	  return this;
	};

	EventEmitter.prototype.emit = function(type) {
	  var er, handler, len, args, i, listeners;

	  if (!this._events)
	    this._events = {};

	  // If there is no 'error' event listener then throw.
	  if (type === 'error') {
	    if (!this._events.error ||
	        (isObject(this._events.error) && !this._events.error.length)) {
	      er = arguments[1];
	      if (er instanceof Error) {
	        throw er; // Unhandled 'error' event
	      }
	      throw TypeError('Uncaught, unspecified "error" event.');
	    }
	  }

	  handler = this._events[type];

	  if (isUndefined(handler))
	    return false;

	  if (isFunction(handler)) {
	    switch (arguments.length) {
	      // fast cases
	      case 1:
	        handler.call(this);
	        break;
	      case 2:
	        handler.call(this, arguments[1]);
	        break;
	      case 3:
	        handler.call(this, arguments[1], arguments[2]);
	        break;
	      // slower
	      default:
	        args = Array.prototype.slice.call(arguments, 1);
	        handler.apply(this, args);
	    }
	  } else if (isObject(handler)) {
	    args = Array.prototype.slice.call(arguments, 1);
	    listeners = handler.slice();
	    len = listeners.length;
	    for (i = 0; i < len; i++)
	      listeners[i].apply(this, args);
	  }

	  return true;
	};

	EventEmitter.prototype.addListener = function(type, listener) {
	  var m;

	  if (!isFunction(listener))
	    throw TypeError('listener must be a function');

	  if (!this._events)
	    this._events = {};

	  // To avoid recursion in the case that type === "newListener"! Before
	  // adding it to the listeners, first emit "newListener".
	  if (this._events.newListener)
	    this.emit('newListener', type,
	              isFunction(listener.listener) ?
	              listener.listener : listener);

	  if (!this._events[type])
	    // Optimize the case of one listener. Don't need the extra array object.
	    this._events[type] = listener;
	  else if (isObject(this._events[type]))
	    // If we've already got an array, just append.
	    this._events[type].push(listener);
	  else
	    // Adding the second element, need to change to array.
	    this._events[type] = [this._events[type], listener];

	  // Check for listener leak
	  if (isObject(this._events[type]) && !this._events[type].warned) {
	    if (!isUndefined(this._maxListeners)) {
	      m = this._maxListeners;
	    } else {
	      m = EventEmitter.defaultMaxListeners;
	    }

	    if (m && m > 0 && this._events[type].length > m) {
	      this._events[type].warned = true;
	      console.error('(node) warning: possible EventEmitter memory ' +
	                    'leak detected. %d listeners added. ' +
	                    'Use emitter.setMaxListeners() to increase limit.',
	                    this._events[type].length);
	      if (typeof console.trace === 'function') {
	        // not supported in IE 10
	        console.trace();
	      }
	    }
	  }

	  return this;
	};

	EventEmitter.prototype.on = EventEmitter.prototype.addListener;

	EventEmitter.prototype.once = function(type, listener) {
	  if (!isFunction(listener))
	    throw TypeError('listener must be a function');

	  var fired = false;

	  function g() {
	    this.removeListener(type, g);

	    if (!fired) {
	      fired = true;
	      listener.apply(this, arguments);
	    }
	  }

	  g.listener = listener;
	  this.on(type, g);

	  return this;
	};

	// emits a 'removeListener' event iff the listener was removed
	EventEmitter.prototype.removeListener = function(type, listener) {
	  var list, position, length, i;

	  if (!isFunction(listener))
	    throw TypeError('listener must be a function');

	  if (!this._events || !this._events[type])
	    return this;

	  list = this._events[type];
	  length = list.length;
	  position = -1;

	  if (list === listener ||
	      (isFunction(list.listener) && list.listener === listener)) {
	    delete this._events[type];
	    if (this._events.removeListener)
	      this.emit('removeListener', type, listener);

	  } else if (isObject(list)) {
	    for (i = length; i-- > 0;) {
	      if (list[i] === listener ||
	          (list[i].listener && list[i].listener === listener)) {
	        position = i;
	        break;
	      }
	    }

	    if (position < 0)
	      return this;

	    if (list.length === 1) {
	      list.length = 0;
	      delete this._events[type];
	    } else {
	      list.splice(position, 1);
	    }

	    if (this._events.removeListener)
	      this.emit('removeListener', type, listener);
	  }

	  return this;
	};

	EventEmitter.prototype.removeAllListeners = function(type) {
	  var key, listeners;

	  if (!this._events)
	    return this;

	  // not listening for removeListener, no need to emit
	  if (!this._events.removeListener) {
	    if (arguments.length === 0)
	      this._events = {};
	    else if (this._events[type])
	      delete this._events[type];
	    return this;
	  }

	  // emit removeListener for all listeners on all events
	  if (arguments.length === 0) {
	    for (key in this._events) {
	      if (key === 'removeListener') continue;
	      this.removeAllListeners(key);
	    }
	    this.removeAllListeners('removeListener');
	    this._events = {};
	    return this;
	  }

	  listeners = this._events[type];

	  if (isFunction(listeners)) {
	    this.removeListener(type, listeners);
	  } else if (listeners) {
	    // LIFO order
	    while (listeners.length)
	      this.removeListener(type, listeners[listeners.length - 1]);
	  }
	  delete this._events[type];

	  return this;
	};

	EventEmitter.prototype.listeners = function(type) {
	  var ret;
	  if (!this._events || !this._events[type])
	    ret = [];
	  else if (isFunction(this._events[type]))
	    ret = [this._events[type]];
	  else
	    ret = this._events[type].slice();
	  return ret;
	};

	EventEmitter.prototype.listenerCount = function(type) {
	  if (this._events) {
	    var evlistener = this._events[type];

	    if (isFunction(evlistener))
	      return 1;
	    else if (evlistener)
	      return evlistener.length;
	  }
	  return 0;
	};

	EventEmitter.listenerCount = function(emitter, type) {
	  return emitter.listenerCount(type);
	};

	function isFunction(arg) {
	  return typeof arg === 'function';
	}

	function isNumber(arg) {
	  return typeof arg === 'number';
	}

	function isObject(arg) {
	  return typeof arg === 'object' && arg !== null;
	}

	function isUndefined(arg) {
	  return arg === void 0;
	}


/***/ },
/* 16 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {'use strict';

	Object.defineProperty(exports, '__esModule', { value: true });

	function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

	var Promise = _interopDefault(__webpack_require__(10));
	var getArguments = _interopDefault(__webpack_require__(14));
	var debug = _interopDefault(__webpack_require__(6));
	var events = __webpack_require__(15);
	var inherits = _interopDefault(__webpack_require__(9));
	var pouchdbErrors = __webpack_require__(17);

	function isBinaryObject(object) {
	  return object instanceof ArrayBuffer ||
	    (typeof Blob !== 'undefined' && object instanceof Blob);
	}

	function cloneArrayBuffer(buff) {
	  if (typeof buff.slice === 'function') {
	    return buff.slice(0);
	  }
	  // IE10-11 slice() polyfill
	  var target = new ArrayBuffer(buff.byteLength);
	  var targetArray = new Uint8Array(target);
	  var sourceArray = new Uint8Array(buff);
	  targetArray.set(sourceArray);
	  return target;
	}

	function cloneBinaryObject(object) {
	  if (object instanceof ArrayBuffer) {
	    return cloneArrayBuffer(object);
	  }
	  var size = object.size;
	  var type = object.type;
	  // Blob
	  if (typeof object.slice === 'function') {
	    return object.slice(0, size, type);
	  }
	  // PhantomJS slice() replacement
	  return object.webkitSlice(0, size, type);
	}

	// most of this is borrowed from lodash.isPlainObject:
	// https://github.com/fis-components/lodash.isplainobject/
	// blob/29c358140a74f252aeb08c9eb28bef86f2217d4a/index.js

	var funcToString = Function.prototype.toString;
	var objectCtorString = funcToString.call(Object);

	function isPlainObject(value) {
	  var proto = Object.getPrototypeOf(value);
	  /* istanbul ignore if */
	  if (proto === null) { // not sure when this happens, but I guess it can
	    return true;
	  }
	  var Ctor = proto.constructor;
	  return (typeof Ctor == 'function' &&
	    Ctor instanceof Ctor && funcToString.call(Ctor) == objectCtorString);
	}

	function clone(object) {
	  var newObject;
	  var i;
	  var len;

	  if (!object || typeof object !== 'object') {
	    return object;
	  }

	  if (Array.isArray(object)) {
	    newObject = [];
	    for (i = 0, len = object.length; i < len; i++) {
	      newObject[i] = clone(object[i]);
	    }
	    return newObject;
	  }

	  // special case: to avoid inconsistencies between IndexedDB
	  // and other backends, we automatically stringify Dates
	  if (object instanceof Date) {
	    return object.toISOString();
	  }

	  if (isBinaryObject(object)) {
	    return cloneBinaryObject(object);
	  }

	  if (!isPlainObject(object)) {
	    return object; // don't clone objects like Workers
	  }

	  newObject = {};
	  for (i in object) {
	    if (Object.prototype.hasOwnProperty.call(object, i)) {
	      var value = clone(object[i]);
	      if (typeof value !== 'undefined') {
	        newObject[i] = value;
	      }
	    }
	  }
	  return newObject;
	}

	function once(fun) {
	  var called = false;
	  return getArguments(function (args) {
	    /* istanbul ignore if */
	    if (called) {
	      // this is a smoke test and should never actually happen
	      throw new Error('once called more than once');
	    } else {
	      called = true;
	      fun.apply(this, args);
	    }
	  });
	}

	function toPromise(func) {
	  //create the function we will be returning
	  return getArguments(function (args) {
	    // Clone arguments
	    args = clone(args);
	    var self = this;
	    var tempCB =
	      (typeof args[args.length - 1] === 'function') ? args.pop() : false;
	    // if the last argument is a function, assume its a callback
	    var usedCB;
	    if (tempCB) {
	      // if it was a callback, create a new callback which calls it,
	      // but do so async so we don't trap any errors
	      usedCB = function (err, resp) {
	        process.nextTick(function () {
	          tempCB(err, resp);
	        });
	      };
	    }
	    var promise = new Promise(function (fulfill, reject) {
	      var resp;
	      try {
	        var callback = once(function (err, mesg) {
	          if (err) {
	            reject(err);
	          } else {
	            fulfill(mesg);
	          }
	        });
	        // create a callback for this invocation
	        // apply the function in the orig context
	        args.push(callback);
	        resp = func.apply(self, args);
	        if (resp && typeof resp.then === 'function') {
	          fulfill(resp);
	        }
	      } catch (e) {
	        reject(e);
	      }
	    });
	    // if there is a callback, call it back
	    if (usedCB) {
	      promise.then(function (result) {
	        usedCB(null, result);
	      }, usedCB);
	    }
	    return promise;
	  });
	}

	var log = debug('pouchdb:api');

	function adapterFun(name, callback) {
	  function logApiCall(self, name, args) {
	    /* istanbul ignore if */
	    if (log.enabled) {
	      var logArgs = [self._db_name, name];
	      for (var i = 0; i < args.length - 1; i++) {
	        logArgs.push(args[i]);
	      }
	      log.apply(null, logArgs);

	      // override the callback itself to log the response
	      var origCallback = args[args.length - 1];
	      args[args.length - 1] = function (err, res) {
	        var responseArgs = [self._db_name, name];
	        responseArgs = responseArgs.concat(
	          err ? ['error', err] : ['success', res]
	        );
	        log.apply(null, responseArgs);
	        origCallback(err, res);
	      };
	    }
	  }

	  return toPromise(getArguments(function (args) {
	    if (this._closed) {
	      return Promise.reject(new Error('database is closed'));
	    }
	    if (this._destroyed) {
	      return Promise.reject(new Error('database is destroyed'));
	    }
	    var self = this;
	    logApiCall(self, name, args);
	    if (!this.taskqueue.isReady) {
	      return new Promise(function (fulfill, reject) {
	        self.taskqueue.addTask(function (failed) {
	          if (failed) {
	            reject(failed);
	          } else {
	            fulfill(self[name].apply(self, args));
	          }
	        });
	      });
	    }
	    return callback.apply(this, args);
	  }));
	}

	// like underscore/lodash _.pick()
	function pick(obj, arr) {
	  var res = {};
	  for (var i = 0, len = arr.length; i < len; i++) {
	    var prop = arr[i];
	    if (prop in obj) {
	      res[prop] = obj[prop];
	    }
	  }
	  return res;
	}

	// Most browsers throttle concurrent requests at 6, so it's silly
	// to shim _bulk_get by trying to launch potentially hundreds of requests
	// and then letting the majority time out. We can handle this ourselves.
	var MAX_NUM_CONCURRENT_REQUESTS = 6;

	function identityFunction(x) {
	  return x;
	}

	function formatResultForOpenRevsGet(result) {
	  return [{
	    ok: result
	  }];
	}

	// shim for P/CouchDB adapters that don't directly implement _bulk_get
	function bulkGet(db, opts, callback) {
	  var requests = opts.docs;

	  // consolidate into one request per doc if possible
	  var requestsById = {};
	  requests.forEach(function (request) {
	    if (request.id in requestsById) {
	      requestsById[request.id].push(request);
	    } else {
	      requestsById[request.id] = [request];
	    }
	  });

	  var numDocs = Object.keys(requestsById).length;
	  var numDone = 0;
	  var perDocResults = new Array(numDocs);

	  function collapseResultsAndFinish() {
	    var results = [];
	    perDocResults.forEach(function (res) {
	      res.docs.forEach(function (info) {
	        results.push({
	          id: res.id,
	          docs: [info]
	        });
	      });
	    });
	    callback(null, {results: results});
	  }

	  function checkDone() {
	    if (++numDone === numDocs) {
	      collapseResultsAndFinish();
	    }
	  }

	  function gotResult(docIndex, id, docs) {
	    perDocResults[docIndex] = {id: id, docs: docs};
	    checkDone();
	  }

	  var allRequests = Object.keys(requestsById);

	  var i = 0;

	  function nextBatch() {

	    if (i >= allRequests.length) {
	      return;
	    }

	    var upTo = Math.min(i + MAX_NUM_CONCURRENT_REQUESTS, allRequests.length);
	    var batch = allRequests.slice(i, upTo);
	    processBatch(batch, i);
	    i += batch.length;
	  }

	  function processBatch(batch, offset) {
	    batch.forEach(function (docId, j) {
	      var docIdx = offset + j;
	      var docRequests = requestsById[docId];

	      // just use the first request as the "template"
	      // TODO: The _bulk_get API allows for more subtle use cases than this,
	      // but for now it is unlikely that there will be a mix of different
	      // "atts_since" or "attachments" in the same request, since it's just
	      // replicate.js that is using this for the moment.
	      // Also, atts_since is aspirational, since we don't support it yet.
	      var docOpts = pick(docRequests[0], ['atts_since', 'attachments']);
	      docOpts.open_revs = docRequests.map(function (request) {
	        // rev is optional, open_revs disallowed
	        return request.rev;
	      });

	      // remove falsey / undefined revisions
	      docOpts.open_revs = docOpts.open_revs.filter(identityFunction);

	      var formatResult = identityFunction;

	      if (docOpts.open_revs.length === 0) {
	        delete docOpts.open_revs;

	        // when fetching only the "winning" leaf,
	        // transform the result so it looks like an open_revs
	        // request
	        formatResult = formatResultForOpenRevsGet;
	      }

	      // globally-supplied options
	      ['revs', 'attachments', 'binary', 'ajax'].forEach(function (param) {
	        if (param in opts) {
	          docOpts[param] = opts[param];
	        }
	      });
	      db.get(docId, docOpts, function (err, res) {
	        var result;
	        /* istanbul ignore if */
	        if (err) {
	          result = [{error: err}];
	        } else {
	          result = formatResult(res);
	        }
	        gotResult(docIdx, docId, result);
	        nextBatch();
	      });
	    });
	  }

	  nextBatch();

	}

	function isChromeApp() {
	  return (typeof chrome !== "undefined" &&
	    typeof chrome.storage !== "undefined" &&
	    typeof chrome.storage.local !== "undefined");
	}

	var hasLocal;

	if (isChromeApp()) {
	  hasLocal = false;
	} else {
	  try {
	    localStorage.setItem('_pouch_check_localstorage', 1);
	    hasLocal = !!localStorage.getItem('_pouch_check_localstorage');
	  } catch (e) {
	    hasLocal = false;
	  }
	}

	function hasLocalStorage() {
	  return hasLocal;
	}

	inherits(Changes, events.EventEmitter);

	/* istanbul ignore next */
	function attachBrowserEvents(self) {
	  if (isChromeApp()) {
	    chrome.storage.onChanged.addListener(function (e) {
	      // make sure it's event addressed to us
	      if (e.db_name != null) {
	        //object only has oldValue, newValue members
	        self.emit(e.dbName.newValue);
	      }
	    });
	  } else if (hasLocalStorage()) {
	    if (typeof addEventListener !== 'undefined') {
	      addEventListener("storage", function (e) {
	        self.emit(e.key);
	      });
	    } else { // old IE
	      window.attachEvent("storage", function (e) {
	        self.emit(e.key);
	      });
	    }
	  }
	}

	function Changes() {
	  events.EventEmitter.call(this);
	  this._listeners = {};

	  attachBrowserEvents(this);
	}
	Changes.prototype.addListener = function (dbName, id, db, opts) {
	  /* istanbul ignore if */
	  if (this._listeners[id]) {
	    return;
	  }
	  var self = this;
	  var inprogress = false;
	  function eventFunction() {
	    /* istanbul ignore if */
	    if (!self._listeners[id]) {
	      return;
	    }
	    if (inprogress) {
	      inprogress = 'waiting';
	      return;
	    }
	    inprogress = true;
	    var changesOpts = pick(opts, [
	      'style', 'include_docs', 'attachments', 'conflicts', 'filter',
	      'doc_ids', 'view', 'since', 'query_params', 'binary'
	    ]);

	    /* istanbul ignore next */
	    function onError() {
	      inprogress = false;
	    }

	    db.changes(changesOpts).on('change', function (c) {
	      if (c.seq > opts.since && !opts.cancelled) {
	        opts.since = c.seq;
	        opts.onChange(c);
	      }
	    }).on('complete', function () {
	      if (inprogress === 'waiting') {
	        setTimeout(function (){
	          eventFunction();
	        },0);
	      }
	      inprogress = false;
	    }).on('error', onError);
	  }
	  this._listeners[id] = eventFunction;
	  this.on(dbName, eventFunction);
	};

	Changes.prototype.removeListener = function (dbName, id) {
	  /* istanbul ignore if */
	  if (!(id in this._listeners)) {
	    return;
	  }
	  events.EventEmitter.prototype.removeListener.call(this, dbName,
	    this._listeners[id]);
	};


	/* istanbul ignore next */
	Changes.prototype.notifyLocalWindows = function (dbName) {
	  //do a useless change on a storage thing
	  //in order to get other windows's listeners to activate
	  if (isChromeApp()) {
	    chrome.storage.local.set({dbName: dbName});
	  } else if (hasLocalStorage()) {
	    localStorage[dbName] = (localStorage[dbName] === "a") ? "b" : "a";
	  }
	};

	Changes.prototype.notify = function (dbName) {
	  this.emit(dbName);
	  this.notifyLocalWindows(dbName);
	};

	function guardedConsole(method) {
	  if (console !== 'undefined' && method in console) {
	    var args = Array.prototype.slice.call(arguments, 1);
	    console[method].apply(console, args);
	  }
	}

	function randomNumber(min, max) {
	  var maxTimeout = 600000; // Hard-coded default of 10 minutes
	  min = parseInt(min, 10) || 0;
	  max = parseInt(max, 10);
	  if (max !== max || max <= min) {
	    max = (min || 1) << 1; //doubling
	  } else {
	    max = max + 1;
	  }
	  // In order to not exceed maxTimeout, pick a random value between half of maxTimeout and maxTimeout
	  if(max > maxTimeout) {
	    min = maxTimeout >> 1; // divide by two
	    max = maxTimeout;
	  }
	  var ratio = Math.random();
	  var range = max - min;

	  return ~~(range * ratio + min); // ~~ coerces to an int, but fast.
	}

	function defaultBackOff(min) {
	  var max = 0;
	  if (!min) {
	    max = 2000;
	  }
	  return randomNumber(min, max);
	}

	// designed to give info to browser users, who are disturbed
	// when they see http errors in the console
	function explainError(status, str) {
	  guardedConsole('info', 'The above ' + status + ' is totally normal. ' + str);
	}

	function extendInner(obj, otherObj) {
	  for (var key in otherObj) {
	    if (otherObj.hasOwnProperty(key)) {
	      var value = clone(otherObj[key]);
	      if (typeof value !== 'undefined') {
	        obj[key] = value;
	      }
	    }
	  }
	}

	function extend(obj, obj2, obj3) {
	  extendInner(obj, obj2);
	  if (obj3) {
	    extendInner(obj, obj3);
	  }
	  return obj;
	}

	function tryFilter(filter, doc, req) {
	  try {
	    return !filter(doc, req);
	  } catch (err) {
	    var msg = 'Filter function threw: ' + err.toString();
	    return pouchdbErrors.createError(pouchdbErrors.BAD_REQUEST, msg);
	  }
	}

	function filterChange(opts) {
	  var req = {};
	  var hasFilter = opts.filter && typeof opts.filter === 'function';
	  req.query = opts.query_params;

	  return function filter(change) {
	    if (!change.doc) {
	      // CSG sends events on the changes feed that don't have documents,
	      // this hack makes a whole lot of existing code robust.
	      change.doc = {};
	    }

	    var filterReturn = hasFilter && tryFilter(opts.filter, change.doc, req);

	    if (typeof filterReturn === 'object') {
	      return filterReturn;
	    }

	    if (filterReturn) {
	      return false;
	    }

	    if (!opts.include_docs) {
	      delete change.doc;
	    } else if (!opts.attachments) {
	      for (var att in change.doc._attachments) {
	        /* istanbul ignore else */
	        if (change.doc._attachments.hasOwnProperty(att)) {
	          change.doc._attachments[att].stub = true;
	        }
	      }
	    }
	    return true;
	  };
	}

	function flatten(arrs) {
	  var res = [];
	  for (var i = 0, len = arrs.length; i < len; i++) {
	    res = res.concat(arrs[i]);
	  }
	  return res;
	}

	// shim for Function.prototype.name,
	// for browsers that don't support it like IE

	/* istanbul ignore next */
	function f() {}

	var hasName = f.name;
	var res;

	// We dont run coverage in IE
	/* istanbul ignore else */
	if (hasName) {
	  res = function (fun) {
	    return fun.name;
	  };
	} else {
	  res = function (fun) {
	    return fun.toString().match(/^\s*function\s*(\S*)\s*\(/)[1];
	  };
	}

	var functionName = res;

	// Determine id an ID is valid
	//   - invalid IDs begin with an underescore that does not begin '_design' or
	//     '_local'
	//   - any other string value is a valid id
	// Returns the specific error object for each case
	function invalidIdError(id) {
	  var err;
	  if (!id) {
	    err = pouchdbErrors.createError(pouchdbErrors.MISSING_ID);
	  } else if (typeof id !== 'string') {
	    err = pouchdbErrors.createError(pouchdbErrors.INVALID_ID);
	  } else if (/^_/.test(id) && !(/^_(design|local)/).test(id)) {
	    err = pouchdbErrors.createError(pouchdbErrors.RESERVED_ID);
	  }
	  if (err) {
	    throw err;
	  }
	}

	function isCordova() {
	  return (typeof cordova !== "undefined" ||
	  typeof PhoneGap !== "undefined" ||
	  typeof phonegap !== "undefined");
	}

	function listenerCount(ee, type) {
	  return 'listenerCount' in ee ? ee.listenerCount(type) :
	                                 events.EventEmitter.listenerCount(ee, type);
	}

	function parseDesignDocFunctionName(s) {
	  if (!s) {
	    return null;
	  }
	  var parts = s.split('/');
	  if (parts.length === 2) {
	    return parts;
	  }
	  if (parts.length === 1) {
	    return [s, s];
	  }
	  return null;
	}

	function normalizeDesignDocFunctionName(s) {
	  var normalized = parseDesignDocFunctionName(s);
	  return normalized ? normalized.join('/') : null;
	}

	// originally parseUri 1.2.2, now patched by us
	// (c) Steven Levithan <stevenlevithan.com>
	// MIT License
	var keys = ["source", "protocol", "authority", "userInfo", "user", "password",
	    "host", "port", "relative", "path", "directory", "file", "query", "anchor"];
	var qName ="queryKey";
	var qParser = /(?:^|&)([^&=]*)=?([^&]*)/g;

	// use the "loose" parser
	/* jshint maxlen: false */
	var parser = /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/;

	function parseUri(str) {
	  var m = parser.exec(str);
	  var uri = {};
	  var i = 14;

	  while (i--) {
	    var key = keys[i];
	    var value = m[i] || "";
	    var encoded = ['user', 'password'].indexOf(key) !== -1;
	    uri[key] = encoded ? decodeURIComponent(value) : value;
	  }

	  uri[qName] = {};
	  uri[keys[12]].replace(qParser, function ($0, $1, $2) {
	    if ($1) {
	      uri[qName][$1] = $2;
	    }
	  });

	  return uri;
	}

	// this is essentially the "update sugar" function from daleharvey/pouchdb#1388
	// the diffFun tells us what delta to apply to the doc.  it either returns
	// the doc, or false if it doesn't need to do an update after all
	function upsert(db, docId, diffFun) {
	  return new Promise(function (fulfill, reject) {
	    db.get(docId, function (err, doc) {
	      if (err) {
	        /* istanbul ignore next */
	        if (err.status !== 404) {
	          return reject(err);
	        }
	        doc = {};
	      }

	      // the user might change the _rev, so save it for posterity
	      var docRev = doc._rev;
	      var newDoc = diffFun(doc);

	      if (!newDoc) {
	        // if the diffFun returns falsy, we short-circuit as
	        // an optimization
	        return fulfill({updated: false, rev: docRev});
	      }

	      // users aren't allowed to modify these values,
	      // so reset them here
	      newDoc._id = docId;
	      newDoc._rev = docRev;
	      fulfill(tryAndPut(db, newDoc, diffFun));
	    });
	  });
	}

	function tryAndPut(db, doc, diffFun) {
	  return db.put(doc).then(function (res) {
	    return {
	      updated: true,
	      rev: res.rev
	    };
	  }, function (err) {
	    /* istanbul ignore next */
	    if (err.status !== 409) {
	      throw err;
	    }
	    return upsert(db, doc._id, diffFun);
	  });
	}

	// BEGIN Math.uuid.js

	/*!
	Math.uuid.js (v1.4)
	http://www.broofa.com
	mailto:robert@broofa.com

	Copyright (c) 2010 Robert Kieffer
	Dual licensed under the MIT and GPL licenses.
	*/

	/*
	 * Generate a random uuid.
	 *
	 * USAGE: Math.uuid(length, radix)
	 *   length - the desired number of characters
	 *   radix  - the number of allowable values for each character.
	 *
	 * EXAMPLES:
	 *   // No arguments  - returns RFC4122, version 4 ID
	 *   >>> Math.uuid()
	 *   "92329D39-6F5C-4520-ABFC-AAB64544E172"
	 *
	 *   // One argument - returns ID of the specified length
	 *   >>> Math.uuid(15)     // 15 character ID (default base=62)
	 *   "VcydxgltxrVZSTV"
	 *
	 *   // Two arguments - returns ID of the specified length, and radix. 
	 *   // (Radix must be <= 62)
	 *   >>> Math.uuid(8, 2)  // 8 character ID (base=2)
	 *   "01001010"
	 *   >>> Math.uuid(8, 10) // 8 character ID (base=10)
	 *   "47473046"
	 *   >>> Math.uuid(8, 16) // 8 character ID (base=16)
	 *   "098F4D35"
	 */
	var chars = (
	  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ' +
	  'abcdefghijklmnopqrstuvwxyz'
	).split('');
	function getValue(radix) {
	  return 0 | Math.random() * radix;
	}
	function uuid(len, radix) {
	  radix = radix || chars.length;
	  var out = '';
	  var i = -1;

	  if (len) {
	    // Compact form
	    while (++i < len) {
	      out += chars[getValue(radix)];
	    }
	    return out;
	  }
	    // rfc4122, version 4 form
	    // Fill in random data.  At i==19 set the high bits of clock sequence as
	    // per rfc4122, sec. 4.1.5
	  while (++i < 36) {
	    switch (i) {
	      case 8:
	      case 13:
	      case 18:
	      case 23:
	        out += '-';
	        break;
	      case 19:
	        out += chars[(getValue(16) & 0x3) | 0x8];
	        break;
	      default:
	        out += chars[getValue(16)];
	    }
	  }

	  return out;
	}

	exports.adapterFun = adapterFun;
	exports.bulkGetShim = bulkGet;
	exports.changesHandler = Changes;
	exports.clone = clone;
	exports.defaultBackOff = defaultBackOff;
	exports.explainError = explainError;
	exports.extend = extend;
	exports.filterChange = filterChange;
	exports.flatten = flatten;
	exports.functionName = functionName;
	exports.guardedConsole = guardedConsole;
	exports.hasLocalStorage = hasLocalStorage;
	exports.invalidIdError = invalidIdError;
	exports.isChromeApp = isChromeApp;
	exports.isCordova = isCordova;
	exports.listenerCount = listenerCount;
	exports.normalizeDdocFunctionName = normalizeDesignDocFunctionName;
	exports.once = once;
	exports.parseDdocFunctionName = parseDesignDocFunctionName;
	exports.parseUri = parseUri;
	exports.pick = pick;
	exports.toPromise = toPromise;
	exports.upsert = upsert;
	exports.uuid = uuid;
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(4)))

/***/ },
/* 17 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, '__esModule', { value: true });

	function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

	var inherits = _interopDefault(__webpack_require__(9));

	inherits(PouchError, Error);

	function PouchError(opts) {
	  Error.call(this, opts.reason);
	  this.status = opts.status;
	  this.name = opts.error;
	  this.message = opts.reason;
	  this.error = true;
	}

	PouchError.prototype.toString = function () {
	  return JSON.stringify({
	    status: this.status,
	    name: this.name,
	    message: this.message,
	    reason: this.reason
	  });
	};

	var UNAUTHORIZED = new PouchError({
	  status: 401,
	  error: 'unauthorized',
	  reason: "Name or password is incorrect."
	});

	var MISSING_BULK_DOCS = new PouchError({
	  status: 400,
	  error: 'bad_request',
	  reason: "Missing JSON list of 'docs'"
	});

	var MISSING_DOC = new PouchError({
	  status: 404,
	  error: 'not_found',
	  reason: 'missing'
	});

	var REV_CONFLICT = new PouchError({
	  status: 409,
	  error: 'conflict',
	  reason: 'Document update conflict'
	});

	var INVALID_ID = new PouchError({
	  status: 400,
	  error: 'invalid_id',
	  reason: '_id field must contain a string'
	});

	var MISSING_ID = new PouchError({
	  status: 412,
	  error: 'missing_id',
	  reason: '_id is required for puts'
	});

	var RESERVED_ID = new PouchError({
	  status: 400,
	  error: 'bad_request',
	  reason: 'Only reserved document ids may start with underscore.'
	});

	var NOT_OPEN = new PouchError({
	  status: 412,
	  error: 'precondition_failed',
	  reason: 'Database not open'
	});

	var UNKNOWN_ERROR = new PouchError({
	  status: 500,
	  error: 'unknown_error',
	  reason: 'Database encountered an unknown error'
	});

	var BAD_ARG = new PouchError({
	  status: 500,
	  error: 'badarg',
	  reason: 'Some query argument is invalid'
	});

	var INVALID_REQUEST = new PouchError({
	  status: 400,
	  error: 'invalid_request',
	  reason: 'Request was invalid'
	});

	var QUERY_PARSE_ERROR = new PouchError({
	  status: 400,
	  error: 'query_parse_error',
	  reason: 'Some query parameter is invalid'
	});

	var DOC_VALIDATION = new PouchError({
	  status: 500,
	  error: 'doc_validation',
	  reason: 'Bad special document member'
	});

	var BAD_REQUEST = new PouchError({
	  status: 400,
	  error: 'bad_request',
	  reason: 'Something wrong with the request'
	});

	var NOT_AN_OBJECT = new PouchError({
	  status: 400,
	  error: 'bad_request',
	  reason: 'Document must be a JSON object'
	});

	var DB_MISSING = new PouchError({
	  status: 404,
	  error: 'not_found',
	  reason: 'Database not found'
	});

	var IDB_ERROR = new PouchError({
	  status: 500,
	  error: 'indexed_db_went_bad',
	  reason: 'unknown'
	});

	var WSQ_ERROR = new PouchError({
	  status: 500,
	  error: 'web_sql_went_bad',
	  reason: 'unknown'
	});

	var LDB_ERROR = new PouchError({
	  status: 500,
	  error: 'levelDB_went_went_bad',
	  reason: 'unknown'
	});

	var FORBIDDEN = new PouchError({
	  status: 403,
	  error: 'forbidden',
	  reason: 'Forbidden by design doc validate_doc_update function'
	});

	var INVALID_REV = new PouchError({
	  status: 400,
	  error: 'bad_request',
	  reason: 'Invalid rev format'
	});

	var FILE_EXISTS = new PouchError({
	  status: 412,
	  error: 'file_exists',
	  reason: 'The database could not be created, the file already exists.'
	});

	var MISSING_STUB = new PouchError({
	  status: 412,
	  error: 'missing_stub'
	});

	var INVALID_URL = new PouchError({
	  status: 413,
	  error: 'invalid_url',
	  reason: 'Provided URL is invalid'
	});

	var allErrors = [
	  UNAUTHORIZED,
	  MISSING_BULK_DOCS,
	  MISSING_DOC,
	  REV_CONFLICT,
	  INVALID_ID,
	  MISSING_ID,
	  RESERVED_ID,
	  NOT_OPEN,
	  UNKNOWN_ERROR,
	  BAD_ARG,
	  INVALID_REQUEST,
	  QUERY_PARSE_ERROR,
	  DOC_VALIDATION,
	  BAD_REQUEST,
	  NOT_AN_OBJECT,
	  DB_MISSING,
	  WSQ_ERROR,
	  LDB_ERROR,
	  FORBIDDEN,
	  INVALID_REV,
	  FILE_EXISTS,
	  MISSING_STUB,
	  IDB_ERROR,
	  INVALID_URL
	];

	function createError(error, reason, name) {
	  function CustomPouchError(reason) {
	    // inherit error properties from our parent error manually
	    // so as to allow proper JSON parsing.
	    /* jshint ignore:start */
	    for (var p in error) {
	      if (typeof error[p] !== 'function') {
	        this[p] = error[p];
	      }
	    }
	    /* jshint ignore:end */
	    if (name !== undefined) {
	      this.name = name;
	    }
	    if (reason !== undefined) {
	      this.reason = reason;
	    }
	  }
	  CustomPouchError.prototype = PouchError.prototype;
	  return new CustomPouchError(reason);
	}

	// Find one of the errors defined above based on the value
	// of the specified property.
	// If reason is provided prefer the error matching that reason.
	// This is for differentiating between errors with the same name and status,
	// eg, bad_request.
	var getErrorTypeByProp = function (prop, value, reason) {
	  var errorsByProp = allErrors.filter(function (error) {
	    return error[prop] === value;
	  });
	  return (reason && errorsByProp.filter(function (error) {
	    return error.message === reason;
	  })[0]) || errorsByProp[0];
	};

	function generateErrorFromResponse(res) {
	  var error, errName, errType, errMsg, errReason;

	  errName = (res.error === true && typeof res.name === 'string') ?
	    res.name :
	    res.error;
	  errReason = res.reason;
	  errType = getErrorTypeByProp('name', errName, errReason);

	  if (res.missing ||
	    errReason === 'missing' ||
	    errReason === 'deleted' ||
	    errName === 'not_found') {
	    errType = MISSING_DOC;
	  } else if (errName === 'doc_validation') {
	    // doc validation needs special treatment since
	    // res.reason depends on the validation error.
	    // see utils.js
	    errType = DOC_VALIDATION;
	    errMsg = errReason;
	  } else if (errName === 'bad_request' && errType.message !== errReason) {
	    // if bad_request error already found based on reason don't override.
	    errType = BAD_REQUEST;
	  }

	  // fallback to error by status or unknown error.
	  if (!errType) {
	    errType = getErrorTypeByProp('status', res.status, errReason) ||
	      UNKNOWN_ERROR;
	  }

	  error = createError(errType, errReason, errName);

	  // Keep custom message.
	  if (errMsg) {
	    error.message = errMsg;
	  }

	  // Keep helpful response data in our error messages.
	  if (res.id) {
	    error.id = res.id;
	  }
	  if (res.status) {
	    error.status = res.status;
	  }
	  if (res.missing) {
	    error.missing = res.missing;
	  }

	  return error;
	}

	exports.UNAUTHORIZED = UNAUTHORIZED;
	exports.MISSING_BULK_DOCS = MISSING_BULK_DOCS;
	exports.MISSING_DOC = MISSING_DOC;
	exports.REV_CONFLICT = REV_CONFLICT;
	exports.INVALID_ID = INVALID_ID;
	exports.MISSING_ID = MISSING_ID;
	exports.RESERVED_ID = RESERVED_ID;
	exports.NOT_OPEN = NOT_OPEN;
	exports.UNKNOWN_ERROR = UNKNOWN_ERROR;
	exports.BAD_ARG = BAD_ARG;
	exports.INVALID_REQUEST = INVALID_REQUEST;
	exports.QUERY_PARSE_ERROR = QUERY_PARSE_ERROR;
	exports.DOC_VALIDATION = DOC_VALIDATION;
	exports.BAD_REQUEST = BAD_REQUEST;
	exports.NOT_AN_OBJECT = NOT_AN_OBJECT;
	exports.DB_MISSING = DB_MISSING;
	exports.WSQ_ERROR = WSQ_ERROR;
	exports.LDB_ERROR = LDB_ERROR;
	exports.FORBIDDEN = FORBIDDEN;
	exports.INVALID_REV = INVALID_REV;
	exports.FILE_EXISTS = FILE_EXISTS;
	exports.MISSING_STUB = MISSING_STUB;
	exports.IDB_ERROR = IDB_ERROR;
	exports.INVALID_URL = INVALID_URL;
	exports.getErrorTypeByProp = getErrorTypeByProp;
	exports.createError = createError;
	exports.generateErrorFromResponse = generateErrorFromResponse;

/***/ },
/* 18 */
/***/ function(module, exports) {

	'use strict';

	Object.defineProperty(exports, '__esModule', { value: true });

	// We fetch all leafs of the revision tree, and sort them based on tree length
	// and whether they were deleted, undeleted documents with the longest revision
	// tree (most edits) win
	// The final sort algorithm is slightly documented in a sidebar here:
	// http://guide.couchdb.org/draft/conflicts.html
	function winningRev(metadata) {
	  var winningId;
	  var winningPos;
	  var winningDeleted;
	  var toVisit = metadata.rev_tree.slice();
	  var node;
	  while ((node = toVisit.pop())) {
	    var tree = node.ids;
	    var branches = tree[2];
	    var pos = node.pos;
	    if (branches.length) { // non-leaf
	      for (var i = 0, len = branches.length; i < len; i++) {
	        toVisit.push({pos: pos + 1, ids: branches[i]});
	      }
	      continue;
	    }
	    var deleted = !!tree[1].deleted;
	    var id = tree[0];
	    // sort by deleted, then pos, then id
	    if (!winningId || (winningDeleted !== deleted ? winningDeleted :
	        winningPos !== pos ? winningPos < pos : winningId < id)) {
	      winningId = id;
	      winningPos = pos;
	      winningDeleted = deleted;
	    }
	  }

	  return winningPos + '-' + winningId;
	}

	// Pretty much all below can be combined into a higher order function to
	// traverse revisions
	// The return value from the callback will be passed as context to all
	// children of that node
	function traverseRevTree(revs, callback) {
	  var toVisit = revs.slice();

	  var node;
	  while ((node = toVisit.pop())) {
	    var pos = node.pos;
	    var tree = node.ids;
	    var branches = tree[2];
	    var newCtx =
	      callback(branches.length === 0, pos, tree[0], node.ctx, tree[1]);
	    for (var i = 0, len = branches.length; i < len; i++) {
	      toVisit.push({pos: pos + 1, ids: branches[i], ctx: newCtx});
	    }
	  }
	}

	function sortByPos(a, b) {
	  return a.pos - b.pos;
	}

	function collectLeaves(revs) {
	  var leaves = [];
	  traverseRevTree(revs, function (isLeaf, pos, id, acc, opts) {
	    if (isLeaf) {
	      leaves.push({rev: pos + "-" + id, pos: pos, opts: opts});
	    }
	  });
	  leaves.sort(sortByPos).reverse();
	  for (var i = 0, len = leaves.length; i < len; i++) {
	    delete leaves[i].pos;
	  }
	  return leaves;
	}

	// returns revs of all conflicts that is leaves such that
	// 1. are not deleted and
	// 2. are different than winning revision
	function collectConflicts(metadata) {
	  var win = winningRev(metadata);
	  var leaves = collectLeaves(metadata.rev_tree);
	  var conflicts = [];
	  for (var i = 0, len = leaves.length; i < len; i++) {
	    var leaf = leaves[i];
	    if (leaf.rev !== win && !leaf.opts.deleted) {
	      conflicts.push(leaf.rev);
	    }
	  }
	  return conflicts;
	}

	// compact a tree by marking its non-leafs as missing,
	// and return a list of revs to delete
	function compactTree(metadata) {
	  var revs = [];
	  traverseRevTree(metadata.rev_tree, function (isLeaf, pos,
	                                               revHash, ctx, opts) {
	    if (opts.status === 'available' && !isLeaf) {
	      revs.push(pos + '-' + revHash);
	      opts.status = 'missing';
	    }
	  });
	  return revs;
	}

	// build up a list of all the paths to the leafs in this revision tree
	function rootToLeaf(revs) {
	  var paths = [];
	  var toVisit = revs.slice();
	  var node;
	  while ((node = toVisit.pop())) {
	    var pos = node.pos;
	    var tree = node.ids;
	    var id = tree[0];
	    var opts = tree[1];
	    var branches = tree[2];
	    var isLeaf = branches.length === 0;

	    var history = node.history ? node.history.slice() : [];
	    history.push({id: id, opts: opts});
	    if (isLeaf) {
	      paths.push({pos: (pos + 1 - history.length), ids: history});
	    }
	    for (var i = 0, len = branches.length; i < len; i++) {
	      toVisit.push({pos: pos + 1, ids: branches[i], history: history});
	    }
	  }
	  return paths.reverse();
	}

	function sortByPos$1(a, b) {
	  return a.pos - b.pos;
	}

	// classic binary search
	function binarySearch(arr, item, comparator) {
	  var low = 0;
	  var high = arr.length;
	  var mid;
	  while (low < high) {
	    mid = (low + high) >>> 1;
	    if (comparator(arr[mid], item) < 0) {
	      low = mid + 1;
	    } else {
	      high = mid;
	    }
	  }
	  return low;
	}

	// assuming the arr is sorted, insert the item in the proper place
	function insertSorted(arr, item, comparator) {
	  var idx = binarySearch(arr, item, comparator);
	  arr.splice(idx, 0, item);
	}

	// Turn a path as a flat array into a tree with a single branch.
	// If any should be stemmed from the beginning of the array, that's passed
	// in as the second argument
	function pathToTree(path, numStemmed) {
	  var root;
	  var leaf;
	  for (var i = numStemmed, len = path.length; i < len; i++) {
	    var node = path[i];
	    var currentLeaf = [node.id, node.opts, []];
	    if (leaf) {
	      leaf[2].push(currentLeaf);
	      leaf = currentLeaf;
	    } else {
	      root = leaf = currentLeaf;
	    }
	  }
	  return root;
	}

	// compare the IDs of two trees
	function compareTree(a, b) {
	  return a[0] < b[0] ? -1 : 1;
	}

	// Merge two trees together
	// The roots of tree1 and tree2 must be the same revision
	function mergeTree(in_tree1, in_tree2) {
	  var queue = [{tree1: in_tree1, tree2: in_tree2}];
	  var conflicts = false;
	  while (queue.length > 0) {
	    var item = queue.pop();
	    var tree1 = item.tree1;
	    var tree2 = item.tree2;

	    if (tree1[1].status || tree2[1].status) {
	      tree1[1].status =
	        (tree1[1].status ===  'available' ||
	        tree2[1].status === 'available') ? 'available' : 'missing';
	    }

	    for (var i = 0; i < tree2[2].length; i++) {
	      if (!tree1[2][0]) {
	        conflicts = 'new_leaf';
	        tree1[2][0] = tree2[2][i];
	        continue;
	      }

	      var merged = false;
	      for (var j = 0; j < tree1[2].length; j++) {
	        if (tree1[2][j][0] === tree2[2][i][0]) {
	          queue.push({tree1: tree1[2][j], tree2: tree2[2][i]});
	          merged = true;
	        }
	      }
	      if (!merged) {
	        conflicts = 'new_branch';
	        insertSorted(tree1[2], tree2[2][i], compareTree);
	      }
	    }
	  }
	  return {conflicts: conflicts, tree: in_tree1};
	}

	function doMerge(tree, path, dontExpand) {
	  var restree = [];
	  var conflicts = false;
	  var merged = false;
	  var res;

	  if (!tree.length) {
	    return {tree: [path], conflicts: 'new_leaf'};
	  }

	  for (var i = 0, len = tree.length; i < len; i++) {
	    var branch = tree[i];
	    if (branch.pos === path.pos && branch.ids[0] === path.ids[0]) {
	      // Paths start at the same position and have the same root, so they need
	      // merged
	      res = mergeTree(branch.ids, path.ids);
	      restree.push({pos: branch.pos, ids: res.tree});
	      conflicts = conflicts || res.conflicts;
	      merged = true;
	    } else if (dontExpand !== true) {
	      // The paths start at a different position, take the earliest path and
	      // traverse up until it as at the same point from root as the path we
	      // want to merge.  If the keys match we return the longer path with the
	      // other merged After stemming we dont want to expand the trees

	      var t1 = branch.pos < path.pos ? branch : path;
	      var t2 = branch.pos < path.pos ? path : branch;
	      var diff = t2.pos - t1.pos;

	      var candidateParents = [];

	      var trees = [];
	      trees.push({ids: t1.ids, diff: diff, parent: null, parentIdx: null});
	      while (trees.length > 0) {
	        var item = trees.pop();
	        if (item.diff === 0) {
	          if (item.ids[0] === t2.ids[0]) {
	            candidateParents.push(item);
	          }
	          continue;
	        }
	        var elements = item.ids[2];
	        for (var j = 0, elementsLen = elements.length; j < elementsLen; j++) {
	          trees.push({
	            ids: elements[j],
	            diff: item.diff - 1,
	            parent: item.ids,
	            parentIdx: j
	          });
	        }
	      }

	      var el = candidateParents[0];

	      if (!el) {
	        restree.push(branch);
	      } else {
	        res = mergeTree(el.ids, t2.ids);
	        el.parent[2][el.parentIdx] = res.tree;
	        restree.push({pos: t1.pos, ids: t1.ids});
	        conflicts = conflicts || res.conflicts;
	        merged = true;
	      }
	    } else {
	      restree.push(branch);
	    }
	  }

	  // We didnt find
	  if (!merged) {
	    restree.push(path);
	  }

	  restree.sort(sortByPos$1);

	  return {
	    tree: restree,
	    conflicts: conflicts || 'internal_node'
	  };
	}

	// To ensure we dont grow the revision tree infinitely, we stem old revisions
	function stem(tree, depth) {
	  // First we break out the tree into a complete list of root to leaf paths
	  var paths = rootToLeaf(tree);
	  var maybeStem = {};

	  var result;
	  for (var i = 0, len = paths.length; i < len; i++) {
	    // Then for each path, we cut off the start of the path based on the
	    // `depth` to stem to, and generate a new set of flat trees
	    var path = paths[i];
	    var stemmed = path.ids;
	    var numStemmed = Math.max(0, stemmed.length - depth);
	    var stemmedNode = {
	      pos: path.pos + numStemmed,
	      ids: pathToTree(stemmed, numStemmed)
	    };

	    for (var s = 0; s < numStemmed; s++) {
	      var rev = (path.pos + s) + '-' + stemmed[s].id;
	      maybeStem[rev] = true;
	    }

	    // Then we remerge all those flat trees together, ensuring that we dont
	    // connect trees that would go beyond the depth limit
	    if (result) {
	      result = doMerge(result, stemmedNode, true).tree;
	    } else {
	      result = [stemmedNode];
	    }
	  }

	  traverseRevTree(result, function (isLeaf, pos, revHash) {
	    // some revisions may have been removed in a branch but not in another
	    delete maybeStem[pos + '-' + revHash];
	  });

	  return {
	    tree: result,
	    revs: Object.keys(maybeStem)
	  };
	}

	function merge(tree, path, depth) {
	  var newTree = doMerge(tree, path);
	  var stemmed = stem(newTree.tree, depth);
	  return {
	    tree: stemmed.tree,
	    stemmedRevs: stemmed.revs,
	    conflicts: newTree.conflicts
	  };
	}

	// return true if a rev exists in the rev tree, false otherwise
	function revExists(revs, rev) {
	  var toVisit = revs.slice();
	  var splitRev = rev.split('-');
	  var targetPos = parseInt(splitRev[0], 10);
	  var targetId = splitRev[1];

	  var node;
	  while ((node = toVisit.pop())) {
	    if (node.pos === targetPos && node.ids[0] === targetId) {
	      return true;
	    }
	    var branches = node.ids[2];
	    for (var i = 0, len = branches.length; i < len; i++) {
	      toVisit.push({pos: node.pos + 1, ids: branches[i]});
	    }
	  }
	  return false;
	}

	function getTrees(node) {
	  return node.ids;
	}

	// check if a specific revision of a doc has been deleted
	//  - metadata: the metadata object from the doc store
	//  - rev: (optional) the revision to check. defaults to winning revision
	function isDeleted(metadata, rev) {
	  if (!rev) {
	    rev = winningRev(metadata);
	  }
	  var id = rev.substring(rev.indexOf('-') + 1);
	  var toVisit = metadata.rev_tree.map(getTrees);

	  var tree;
	  while ((tree = toVisit.pop())) {
	    if (tree[0] === id) {
	      return !!tree[1].deleted;
	    }
	    toVisit = toVisit.concat(tree[2]);
	  }
	}

	function isLocalId(id) {
	  return (/^_local/).test(id);
	}

	exports.collectConflicts = collectConflicts;
	exports.collectLeaves = collectLeaves;
	exports.compactTree = compactTree;
	exports.isDeleted = isDeleted;
	exports.isLocalId = isLocalId;
	exports.merge = merge;
	exports.revExists = revExists;
	exports.rootToLeaf = rootToLeaf;
	exports.traverseRevTree = traverseRevTree;
	exports.winningRev = winningRev;

/***/ },
/* 19 */
/***/ function(module, exports) {

	// Generated by CoffeeScript 1.9.2
	(function() {
	  var hasProp = {}.hasOwnProperty,
	    slice = [].slice;

	  module.exports = function(source, scope) {
	    var key, keys, value, values;
	    keys = [];
	    values = [];
	    for (key in scope) {
	      if (!hasProp.call(scope, key)) continue;
	      value = scope[key];
	      if (key === 'this') {
	        continue;
	      }
	      keys.push(key);
	      values.push(value);
	    }
	    return Function.apply(null, slice.call(keys).concat([source])).apply(scope["this"], values);
	  };

	}).call(this);


/***/ },
/* 20 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {'use strict';

	function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

	var pouchdbUtils = __webpack_require__(16);
	var pouchdbMerge = __webpack_require__(18);
	var pouchdbCollections = __webpack_require__(13);
	var pouchdbErrors = __webpack_require__(17);
	var pouchdbAdapterUtils = __webpack_require__(21);
	var jsExtend = __webpack_require__(5);
	var Promise = _interopDefault(__webpack_require__(10));
	var pouchdbJson = __webpack_require__(25);
	var pouchdbBinaryUtils = __webpack_require__(22);

	// IndexedDB requires a versioned database structure, so we use the
	// version here to manage migrations.
	var ADAPTER_VERSION = 5;

	// The object stores created for each database
	// DOC_STORE stores the document meta data, its revision history and state
	// Keyed by document id
	var DOC_STORE = 'document-store';
	// BY_SEQ_STORE stores a particular version of a document, keyed by its
	// sequence id
	var BY_SEQ_STORE = 'by-sequence';
	// Where we store attachments
	var ATTACH_STORE = 'attach-store';
	// Where we store many-to-many relations
	// between attachment digests and seqs
	var ATTACH_AND_SEQ_STORE = 'attach-seq-store';

	// Where we store database-wide meta data in a single record
	// keyed by id: META_STORE
	var META_STORE = 'meta-store';
	// Where we store local documents
	var LOCAL_STORE = 'local-store';
	// Where we detect blob support
	var DETECT_BLOB_SUPPORT_STORE = 'detect-blob-support';

	function tryCode(fun, that, args, PouchDB) {
	  try {
	    fun.apply(that, args);
	  } catch (err) {
	    // Shouldn't happen, but in some odd cases
	    // IndexedDB implementations might throw a sync
	    // error, in which case this will at least log it.
	    PouchDB.emit('error', err);
	  }
	}

	var taskQueue = {
	  running: false,
	  queue: []
	};

	function applyNext(PouchDB) {
	  if (taskQueue.running || !taskQueue.queue.length) {
	    return;
	  }
	  taskQueue.running = true;
	  var item = taskQueue.queue.shift();
	  item.action(function (err, res) {
	    tryCode(item.callback, this, [err, res], PouchDB);
	    taskQueue.running = false;
	    process.nextTick(function () {
	      applyNext(PouchDB);
	    });
	  });
	}

	function idbError(callback) {
	  return function (evt) {
	    var message = 'unknown_error';
	    if (evt.target && evt.target.error) {
	      message = evt.target.error.name || evt.target.error.message;
	    }
	    callback(pouchdbErrors.createError(pouchdbErrors.IDB_ERROR, message, evt.type));
	  };
	}

	// Unfortunately, the metadata has to be stringified
	// when it is put into the database, because otherwise
	// IndexedDB can throw errors for deeply-nested objects.
	// Originally we just used JSON.parse/JSON.stringify; now
	// we use this custom vuvuzela library that avoids recursion.
	// If we could do it all over again, we'd probably use a
	// format for the revision trees other than JSON.
	function encodeMetadata(metadata, winningRev, deleted) {
	  return {
	    data: pouchdbJson.safeJsonStringify(metadata),
	    winningRev: winningRev,
	    deletedOrLocal: deleted ? '1' : '0',
	    seq: metadata.seq, // highest seq for this doc
	    id: metadata.id
	  };
	}

	function decodeMetadata(storedObject) {
	  if (!storedObject) {
	    return null;
	  }
	  var metadata = pouchdbJson.safeJsonParse(storedObject.data);
	  metadata.winningRev = storedObject.winningRev;
	  metadata.deleted = storedObject.deletedOrLocal === '1';
	  metadata.seq = storedObject.seq;
	  return metadata;
	}

	// read the doc back out from the database. we don't store the
	// _id or _rev because we already have _doc_id_rev.
	function decodeDoc(doc) {
	  if (!doc) {
	    return doc;
	  }
	  var idx = doc._doc_id_rev.lastIndexOf(':');
	  doc._id = doc._doc_id_rev.substring(0, idx - 1);
	  doc._rev = doc._doc_id_rev.substring(idx + 1);
	  delete doc._doc_id_rev;
	  return doc;
	}

	// Read a blob from the database, encoding as necessary
	// and translating from base64 if the IDB doesn't support
	// native Blobs
	function readBlobData(body, type, asBlob, callback) {
	  if (asBlob) {
	    if (!body) {
	      callback(pouchdbBinaryUtils.blob([''], {type: type}));
	    } else if (typeof body !== 'string') { // we have blob support
	      callback(body);
	    } else { // no blob support
	      callback(pouchdbBinaryUtils.base64StringToBlobOrBuffer(body, type));
	    }
	  } else { // as base64 string
	    if (!body) {
	      callback('');
	    } else if (typeof body !== 'string') { // we have blob support
	      pouchdbBinaryUtils.readAsBinaryString(body, function (binary) {
	        callback(pouchdbBinaryUtils.btoa(binary));
	      });
	    } else { // no blob support
	      callback(body);
	    }
	  }
	}

	function fetchAttachmentsIfNecessary(doc, opts, txn, cb) {
	  var attachments = Object.keys(doc._attachments || {});
	  if (!attachments.length) {
	    return cb && cb();
	  }
	  var numDone = 0;

	  function checkDone() {
	    if (++numDone === attachments.length && cb) {
	      cb();
	    }
	  }

	  function fetchAttachment(doc, att) {
	    var attObj = doc._attachments[att];
	    var digest = attObj.digest;
	    var req = txn.objectStore(ATTACH_STORE).get(digest);
	    req.onsuccess = function (e) {
	      attObj.body = e.target.result.body;
	      checkDone();
	    };
	  }

	  attachments.forEach(function (att) {
	    if (opts.attachments && opts.include_docs) {
	      fetchAttachment(doc, att);
	    } else {
	      doc._attachments[att].stub = true;
	      checkDone();
	    }
	  });
	}

	// IDB-specific postprocessing necessary because
	// we don't know whether we stored a true Blob or
	// a base64-encoded string, and if it's a Blob it
	// needs to be read outside of the transaction context
	function postProcessAttachments(results, asBlob) {
	  return Promise.all(results.map(function (row) {
	    if (row.doc && row.doc._attachments) {
	      var attNames = Object.keys(row.doc._attachments);
	      return Promise.all(attNames.map(function (att) {
	        var attObj = row.doc._attachments[att];
	        if (!('body' in attObj)) { // already processed
	          return;
	        }
	        var body = attObj.body;
	        var type = attObj.content_type;
	        return new Promise(function (resolve) {
	          readBlobData(body, type, asBlob, function (data) {
	            row.doc._attachments[att] = jsExtend.extend(
	              pouchdbUtils.pick(attObj, ['digest', 'content_type']),
	              {data: data}
	            );
	            resolve();
	          });
	        });
	      }));
	    }
	  }));
	}

	function compactRevs(revs, docId, txn) {

	  var possiblyOrphanedDigests = [];
	  var seqStore = txn.objectStore(BY_SEQ_STORE);
	  var attStore = txn.objectStore(ATTACH_STORE);
	  var attAndSeqStore = txn.objectStore(ATTACH_AND_SEQ_STORE);
	  var count = revs.length;

	  function checkDone() {
	    count--;
	    if (!count) { // done processing all revs
	      deleteOrphanedAttachments();
	    }
	  }

	  function deleteOrphanedAttachments() {
	    if (!possiblyOrphanedDigests.length) {
	      return;
	    }
	    possiblyOrphanedDigests.forEach(function (digest) {
	      var countReq = attAndSeqStore.index('digestSeq').count(
	        IDBKeyRange.bound(
	          digest + '::', digest + '::\uffff', false, false));
	      countReq.onsuccess = function (e) {
	        var count = e.target.result;
	        if (!count) {
	          // orphaned
	          attStore.delete(digest);
	        }
	      };
	    });
	  }

	  revs.forEach(function (rev) {
	    var index = seqStore.index('_doc_id_rev');
	    var key = docId + "::" + rev;
	    index.getKey(key).onsuccess = function (e) {
	      var seq = e.target.result;
	      if (typeof seq !== 'number') {
	        return checkDone();
	      }
	      seqStore.delete(seq);

	      var cursor = attAndSeqStore.index('seq')
	        .openCursor(IDBKeyRange.only(seq));

	      cursor.onsuccess = function (event) {
	        var cursor = event.target.result;
	        if (cursor) {
	          var digest = cursor.value.digestSeq.split('::')[0];
	          possiblyOrphanedDigests.push(digest);
	          attAndSeqStore.delete(cursor.primaryKey);
	          cursor.continue();
	        } else { // done
	          checkDone();
	        }
	      };
	    };
	  });
	}

	function openTransactionSafely(idb, stores, mode) {
	  try {
	    return {
	      txn: idb.transaction(stores, mode)
	    };
	  } catch (err) {
	    return {
	      error: err
	    };
	  }
	}

	function idbBulkDocs(dbOpts, req, opts, api, idb, idbChanges, callback) {
	  var docInfos = req.docs;
	  var txn;
	  var docStore;
	  var bySeqStore;
	  var attachStore;
	  var attachAndSeqStore;
	  var docInfoError;
	  var docCountDelta = 0;

	  for (var i = 0, len = docInfos.length; i < len; i++) {
	    var doc = docInfos[i];
	    if (doc._id && pouchdbAdapterUtils.isLocalId(doc._id)) {
	      continue;
	    }
	    doc = docInfos[i] = pouchdbAdapterUtils.parseDoc(doc, opts.new_edits);
	    if (doc.error && !docInfoError) {
	      docInfoError = doc;
	    }
	  }

	  if (docInfoError) {
	    return callback(docInfoError);
	  }

	  var results = new Array(docInfos.length);
	  var fetchedDocs = new pouchdbCollections.Map();
	  var preconditionErrored = false;
	  var blobType = api._meta.blobSupport ? 'blob' : 'base64';

	  pouchdbAdapterUtils.preprocessAttachments(docInfos, blobType, function (err) {
	    if (err) {
	      return callback(err);
	    }
	    startTransaction();
	  });

	  function startTransaction() {

	    var stores = [
	      DOC_STORE, BY_SEQ_STORE,
	      ATTACH_STORE,
	      LOCAL_STORE, ATTACH_AND_SEQ_STORE
	    ];
	    var txnResult = openTransactionSafely(idb, stores, 'readwrite');
	    if (txnResult.error) {
	      return callback(txnResult.error);
	    }
	    txn = txnResult.txn;
	    txn.onabort = idbError(callback);
	    txn.ontimeout = idbError(callback);
	    txn.oncomplete = complete;
	    docStore = txn.objectStore(DOC_STORE);
	    bySeqStore = txn.objectStore(BY_SEQ_STORE);
	    attachStore = txn.objectStore(ATTACH_STORE);
	    attachAndSeqStore = txn.objectStore(ATTACH_AND_SEQ_STORE);

	    verifyAttachments(function (err) {
	      if (err) {
	        preconditionErrored = true;
	        return callback(err);
	      }
	      fetchExistingDocs();
	    });
	  }

	  function idbProcessDocs() {
	    pouchdbAdapterUtils.processDocs(dbOpts.revs_limit, docInfos, api, fetchedDocs,
	                txn, results, writeDoc, opts);
	  }

	  function fetchExistingDocs() {

	    if (!docInfos.length) {
	      return;
	    }

	    var numFetched = 0;

	    function checkDone() {
	      if (++numFetched === docInfos.length) {
	        idbProcessDocs();
	      }
	    }

	    function readMetadata(event) {
	      var metadata = decodeMetadata(event.target.result);

	      if (metadata) {
	        fetchedDocs.set(metadata.id, metadata);
	      }
	      checkDone();
	    }

	    for (var i = 0, len = docInfos.length; i < len; i++) {
	      var docInfo = docInfos[i];
	      if (docInfo._id && pouchdbAdapterUtils.isLocalId(docInfo._id)) {
	        checkDone(); // skip local docs
	        continue;
	      }
	      var req = docStore.get(docInfo.metadata.id);
	      req.onsuccess = readMetadata;
	    }
	  }

	  function complete() {
	    if (preconditionErrored) {
	      return;
	    }

	    idbChanges.notify(api._meta.name);
	    api._meta.docCount += docCountDelta;
	    callback(null, results);
	  }

	  function verifyAttachment(digest, callback) {

	    var req = attachStore.get(digest);
	    req.onsuccess = function (e) {
	      if (!e.target.result) {
	        var err = pouchdbErrors.createError(pouchdbErrors.MISSING_STUB,
	          'unknown stub attachment with digest ' +
	          digest);
	        err.status = 412;
	        callback(err);
	      } else {
	        callback();
	      }
	    };
	  }

	  function verifyAttachments(finish) {


	    var digests = [];
	    docInfos.forEach(function (docInfo) {
	      if (docInfo.data && docInfo.data._attachments) {
	        Object.keys(docInfo.data._attachments).forEach(function (filename) {
	          var att = docInfo.data._attachments[filename];
	          if (att.stub) {
	            digests.push(att.digest);
	          }
	        });
	      }
	    });
	    if (!digests.length) {
	      return finish();
	    }
	    var numDone = 0;
	    var err;

	    function checkDone() {
	      if (++numDone === digests.length) {
	        finish(err);
	      }
	    }
	    digests.forEach(function (digest) {
	      verifyAttachment(digest, function (attErr) {
	        if (attErr && !err) {
	          err = attErr;
	        }
	        checkDone();
	      });
	    });
	  }

	  function writeDoc(docInfo, winningRev, winningRevIsDeleted, newRevIsDeleted,
	                    isUpdate, delta, resultsIdx, callback) {

	    docCountDelta += delta;

	    docInfo.metadata.winningRev = winningRev;
	    docInfo.metadata.deleted = winningRevIsDeleted;

	    var doc = docInfo.data;
	    doc._id = docInfo.metadata.id;
	    doc._rev = docInfo.metadata.rev;

	    if (newRevIsDeleted) {
	      doc._deleted = true;
	    }

	    var hasAttachments = doc._attachments &&
	      Object.keys(doc._attachments).length;
	    if (hasAttachments) {
	      return writeAttachments(docInfo, winningRev, winningRevIsDeleted,
	        isUpdate, resultsIdx, callback);
	    }

	    finishDoc(docInfo, winningRev, winningRevIsDeleted,
	      isUpdate, resultsIdx, callback);
	  }

	  function finishDoc(docInfo, winningRev, winningRevIsDeleted,
	                     isUpdate, resultsIdx, callback) {

	    var doc = docInfo.data;
	    var metadata = docInfo.metadata;

	    doc._doc_id_rev = metadata.id + '::' + metadata.rev;
	    delete doc._id;
	    delete doc._rev;

	    function afterPutDoc(e) {
	      var revsToDelete = docInfo.stemmedRevs || [];

	      if (isUpdate && api.auto_compaction) {
	        revsToDelete = revsToDelete.concat(pouchdbMerge.compactTree(docInfo.metadata));
	      }

	      if (revsToDelete && revsToDelete.length) {
	        compactRevs(revsToDelete, docInfo.metadata.id, txn);
	      }

	      metadata.seq = e.target.result;
	      // Current _rev is calculated from _rev_tree on read
	      delete metadata.rev;
	      var metadataToStore = encodeMetadata(metadata, winningRev,
	        winningRevIsDeleted);
	      var metaDataReq = docStore.put(metadataToStore);
	      metaDataReq.onsuccess = afterPutMetadata;
	    }

	    function afterPutDocError(e) {
	      // ConstraintError, need to update, not put (see #1638 for details)
	      e.preventDefault(); // avoid transaction abort
	      e.stopPropagation(); // avoid transaction onerror
	      var index = bySeqStore.index('_doc_id_rev');
	      var getKeyReq = index.getKey(doc._doc_id_rev);
	      getKeyReq.onsuccess = function (e) {
	        var putReq = bySeqStore.put(doc, e.target.result);
	        putReq.onsuccess = afterPutDoc;
	      };
	    }

	    function afterPutMetadata() {
	      results[resultsIdx] = {
	        ok: true,
	        id: metadata.id,
	        rev: winningRev
	      };
	      fetchedDocs.set(docInfo.metadata.id, docInfo.metadata);
	      insertAttachmentMappings(docInfo, metadata.seq, callback);
	    }

	    var putReq = bySeqStore.put(doc);

	    putReq.onsuccess = afterPutDoc;
	    putReq.onerror = afterPutDocError;
	  }

	  function writeAttachments(docInfo, winningRev, winningRevIsDeleted,
	                            isUpdate, resultsIdx, callback) {


	    var doc = docInfo.data;

	    var numDone = 0;
	    var attachments = Object.keys(doc._attachments);

	    function collectResults() {
	      if (numDone === attachments.length) {
	        finishDoc(docInfo, winningRev, winningRevIsDeleted,
	          isUpdate, resultsIdx, callback);
	      }
	    }

	    function attachmentSaved() {
	      numDone++;
	      collectResults();
	    }

	    attachments.forEach(function (key) {
	      var att = docInfo.data._attachments[key];
	      if (!att.stub) {
	        var data = att.data;
	        delete att.data;
	        att.revpos = parseInt(winningRev, 10);
	        var digest = att.digest;
	        saveAttachment(digest, data, attachmentSaved);
	      } else {
	        numDone++;
	        collectResults();
	      }
	    });
	  }

	  // map seqs to attachment digests, which
	  // we will need later during compaction
	  function insertAttachmentMappings(docInfo, seq, callback) {

	    var attsAdded = 0;
	    var attsToAdd = Object.keys(docInfo.data._attachments || {});

	    if (!attsToAdd.length) {
	      return callback();
	    }

	    function checkDone() {
	      if (++attsAdded === attsToAdd.length) {
	        callback();
	      }
	    }

	    function add(att) {
	      var digest = docInfo.data._attachments[att].digest;
	      var req = attachAndSeqStore.put({
	        seq: seq,
	        digestSeq: digest + '::' + seq
	      });

	      req.onsuccess = checkDone;
	      req.onerror = function (e) {
	        // this callback is for a constaint error, which we ignore
	        // because this docid/rev has already been associated with
	        // the digest (e.g. when new_edits == false)
	        e.preventDefault(); // avoid transaction abort
	        e.stopPropagation(); // avoid transaction onerror
	        checkDone();
	      };
	    }
	    for (var i = 0; i < attsToAdd.length; i++) {
	      add(attsToAdd[i]); // do in parallel
	    }
	  }

	  function saveAttachment(digest, data, callback) {


	    var getKeyReq = attachStore.count(digest);
	    getKeyReq.onsuccess = function (e) {
	      var count = e.target.result;
	      if (count) {
	        return callback(); // already exists
	      }
	      var newAtt = {
	        digest: digest,
	        body: data
	      };
	      var putReq = attachStore.put(newAtt);
	      putReq.onsuccess = callback;
	    };
	  }
	}

	function createKeyRange(start, end, inclusiveEnd, key, descending) {
	  try {
	    if (start && end) {
	      if (descending) {
	        return IDBKeyRange.bound(end, start, !inclusiveEnd, false);
	      } else {
	        return IDBKeyRange.bound(start, end, false, !inclusiveEnd);
	      }
	    } else if (start) {
	      if (descending) {
	        return IDBKeyRange.upperBound(start);
	      } else {
	        return IDBKeyRange.lowerBound(start);
	      }
	    } else if (end) {
	      if (descending) {
	        return IDBKeyRange.lowerBound(end, !inclusiveEnd);
	      } else {
	        return IDBKeyRange.upperBound(end, !inclusiveEnd);
	      }
	    } else if (key) {
	      return IDBKeyRange.only(key);
	    }
	  } catch (e) {
	    return {error: e};
	  }
	  return null;
	}

	function handleKeyRangeError(api, opts, err, callback) {
	  if (err.name === "DataError" && err.code === 0) {
	    // data error, start is less than end
	    return callback(null, {
	      total_rows: api._meta.docCount,
	      offset: opts.skip,
	      rows: []
	    });
	  }
	  callback(pouchdbErrors.createError(pouchdbErrors.IDB_ERROR, err.name, err.message));
	}

	function idbAllDocs(opts, api, idb, callback) {

	  function allDocsQuery(opts, callback) {
	    var start = 'startkey' in opts ? opts.startkey : false;
	    var end = 'endkey' in opts ? opts.endkey : false;
	    var key = 'key' in opts ? opts.key : false;
	    var skip = opts.skip || 0;
	    var limit = typeof opts.limit === 'number' ? opts.limit : -1;
	    var inclusiveEnd = opts.inclusive_end !== false;
	    var descending = 'descending' in opts && opts.descending ? 'prev' : null;

	    var keyRange = createKeyRange(start, end, inclusiveEnd, key, descending);
	    if (keyRange && keyRange.error) {
	      return handleKeyRangeError(api, opts, keyRange.error, callback);
	    }

	    var stores = [DOC_STORE, BY_SEQ_STORE];

	    if (opts.attachments) {
	      stores.push(ATTACH_STORE);
	    }
	    var txnResult = openTransactionSafely(idb, stores, 'readonly');
	    if (txnResult.error) {
	      return callback(txnResult.error);
	    }
	    var txn = txnResult.txn;
	    var docStore = txn.objectStore(DOC_STORE);
	    var seqStore = txn.objectStore(BY_SEQ_STORE);
	    var cursor = descending ?
	      docStore.openCursor(keyRange, descending) :
	      docStore.openCursor(keyRange);
	    var docIdRevIndex = seqStore.index('_doc_id_rev');
	    var results = [];
	    var docCount = 0;

	    // if the user specifies include_docs=true, then we don't
	    // want to block the main cursor while we're fetching the doc
	    function fetchDocAsynchronously(metadata, row, winningRev) {
	      var key = metadata.id + "::" + winningRev;
	      docIdRevIndex.get(key).onsuccess =  function onGetDoc(e) {
	        row.doc = decodeDoc(e.target.result);
	        if (opts.conflicts) {
	          row.doc._conflicts = pouchdbMerge.collectConflicts(metadata);
	        }
	        fetchAttachmentsIfNecessary(row.doc, opts, txn);
	      };
	    }

	    function allDocsInner(cursor, winningRev, metadata) {
	      var row = {
	        id: metadata.id,
	        key: metadata.id,
	        value: {
	          rev: winningRev
	        }
	      };
	      var deleted = metadata.deleted;
	      if (opts.deleted === 'ok') {
	        results.push(row);
	        // deleted docs are okay with "keys" requests
	        if (deleted) {
	          row.value.deleted = true;
	          row.doc = null;
	        } else if (opts.include_docs) {
	          fetchDocAsynchronously(metadata, row, winningRev);
	        }
	      } else if (!deleted && skip-- <= 0) {
	        results.push(row);
	        if (opts.include_docs) {
	          fetchDocAsynchronously(metadata, row, winningRev);
	        }
	        if (--limit === 0) {
	          return;
	        }
	      }
	      cursor.continue();
	    }

	    function onGetCursor(e) {
	      docCount = api._meta.docCount; // do this within the txn for consistency
	      var cursor = e.target.result;
	      if (!cursor) {
	        return;
	      }
	      var metadata = decodeMetadata(cursor.value);
	      var winningRev = metadata.winningRev;

	      allDocsInner(cursor, winningRev, metadata);
	    }

	    function onResultsReady() {
	      callback(null, {
	        total_rows: docCount,
	        offset: opts.skip,
	        rows: results
	      });
	    }

	    function onTxnComplete() {
	      if (opts.attachments) {
	        postProcessAttachments(results, opts.binary).then(onResultsReady);
	      } else {
	        onResultsReady();
	      }
	    }

	    txn.oncomplete = onTxnComplete;
	    cursor.onsuccess = onGetCursor;
	  }

	  function allDocs(opts, callback) {

	    if (opts.limit === 0) {
	      return callback(null, {
	        total_rows: api._meta.docCount,
	        offset: opts.skip,
	        rows: []
	      });
	    }
	    allDocsQuery(opts, callback);
	  }

	  allDocs(opts, callback);
	}

	//
	// Blobs are not supported in all versions of IndexedDB, notably
	// Chrome <37 and Android <5. In those versions, storing a blob will throw.
	//
	// Various other blob bugs exist in Chrome v37-42 (inclusive).
	// Detecting them is expensive and confusing to users, and Chrome 37-42
	// is at very low usage worldwide, so we do a hacky userAgent check instead.
	//
	// content-type bug: https://code.google.com/p/chromium/issues/detail?id=408120
	// 404 bug: https://code.google.com/p/chromium/issues/detail?id=447916
	// FileReader bug: https://code.google.com/p/chromium/issues/detail?id=447836
	//
	function checkBlobSupport(txn) {
	  return new Promise(function (resolve) {
	    var blob = pouchdbBinaryUtils.blob(['']);
	    txn.objectStore(DETECT_BLOB_SUPPORT_STORE).put(blob, 'key');

	    txn.onabort = function (e) {
	      // If the transaction aborts now its due to not being able to
	      // write to the database, likely due to the disk being full
	      e.preventDefault();
	      e.stopPropagation();
	      resolve(false);
	    };

	    txn.oncomplete = function () {
	      var matchedChrome = navigator.userAgent.match(/Chrome\/(\d+)/);
	      var matchedEdge = navigator.userAgent.match(/Edge\//);
	      // MS Edge pretends to be Chrome 42:
	      // https://msdn.microsoft.com/en-us/library/hh869301%28v=vs.85%29.aspx
	      resolve(matchedEdge || !matchedChrome ||
	        parseInt(matchedChrome[1], 10) >= 43);
	    };
	  }).catch(function () {
	    return false; // error, so assume unsupported
	  });
	}

	var cachedDBs = new pouchdbCollections.Map();
	var blobSupportPromise;
	var idbChanges = new pouchdbUtils.changesHandler();
	var openReqList = new pouchdbCollections.Map();

	function IdbPouch(opts, callback) {
	  var api = this;

	  taskQueue.queue.push({
	    action: function (thisCallback) {
	      init(api, opts, thisCallback);
	    },
	    callback: callback
	  });
	  applyNext(api.constructor);
	}

	function init(api, opts, callback) {

	  var dbName = opts.name;

	  var idb = null;
	  api._meta = null;

	  // called when creating a fresh new database
	  function createSchema(db) {
	    var docStore = db.createObjectStore(DOC_STORE, {keyPath : 'id'});
	    db.createObjectStore(BY_SEQ_STORE, {autoIncrement: true})
	      .createIndex('_doc_id_rev', '_doc_id_rev', {unique: true});
	    db.createObjectStore(ATTACH_STORE, {keyPath: 'digest'});
	    db.createObjectStore(META_STORE, {keyPath: 'id', autoIncrement: false});
	    db.createObjectStore(DETECT_BLOB_SUPPORT_STORE);

	    // added in v2
	    docStore.createIndex('deletedOrLocal', 'deletedOrLocal', {unique : false});

	    // added in v3
	    db.createObjectStore(LOCAL_STORE, {keyPath: '_id'});

	    // added in v4
	    var attAndSeqStore = db.createObjectStore(ATTACH_AND_SEQ_STORE,
	      {autoIncrement: true});
	    attAndSeqStore.createIndex('seq', 'seq');
	    attAndSeqStore.createIndex('digestSeq', 'digestSeq', {unique: true});
	  }

	  // migration to version 2
	  // unfortunately "deletedOrLocal" is a misnomer now that we no longer
	  // store local docs in the main doc-store, but whaddyagonnado
	  function addDeletedOrLocalIndex(txn, callback) {
	    var docStore = txn.objectStore(DOC_STORE);
	    docStore.createIndex('deletedOrLocal', 'deletedOrLocal', {unique : false});

	    docStore.openCursor().onsuccess = function (event) {
	      var cursor = event.target.result;
	      if (cursor) {
	        var metadata = cursor.value;
	        var deleted = pouchdbMerge.isDeleted(metadata);
	        metadata.deletedOrLocal = deleted ? "1" : "0";
	        docStore.put(metadata);
	        cursor.continue();
	      } else {
	        callback();
	      }
	    };
	  }

	  // migration to version 3 (part 1)
	  function createLocalStoreSchema(db) {
	    db.createObjectStore(LOCAL_STORE, {keyPath: '_id'})
	      .createIndex('_doc_id_rev', '_doc_id_rev', {unique: true});
	  }

	  // migration to version 3 (part 2)
	  function migrateLocalStore(txn, cb) {
	    var localStore = txn.objectStore(LOCAL_STORE);
	    var docStore = txn.objectStore(DOC_STORE);
	    var seqStore = txn.objectStore(BY_SEQ_STORE);

	    var cursor = docStore.openCursor();
	    cursor.onsuccess = function (event) {
	      var cursor = event.target.result;
	      if (cursor) {
	        var metadata = cursor.value;
	        var docId = metadata.id;
	        var local = pouchdbMerge.isLocalId(docId);
	        var rev = pouchdbMerge.winningRev(metadata);
	        if (local) {
	          var docIdRev = docId + "::" + rev;
	          // remove all seq entries
	          // associated with this docId
	          var start = docId + "::";
	          var end = docId + "::~";
	          var index = seqStore.index('_doc_id_rev');
	          var range = IDBKeyRange.bound(start, end, false, false);
	          var seqCursor = index.openCursor(range);
	          seqCursor.onsuccess = function (e) {
	            seqCursor = e.target.result;
	            if (!seqCursor) {
	              // done
	              docStore.delete(cursor.primaryKey);
	              cursor.continue();
	            } else {
	              var data = seqCursor.value;
	              if (data._doc_id_rev === docIdRev) {
	                localStore.put(data);
	              }
	              seqStore.delete(seqCursor.primaryKey);
	              seqCursor.continue();
	            }
	          };
	        } else {
	          cursor.continue();
	        }
	      } else if (cb) {
	        cb();
	      }
	    };
	  }

	  // migration to version 4 (part 1)
	  function addAttachAndSeqStore(db) {
	    var attAndSeqStore = db.createObjectStore(ATTACH_AND_SEQ_STORE,
	      {autoIncrement: true});
	    attAndSeqStore.createIndex('seq', 'seq');
	    attAndSeqStore.createIndex('digestSeq', 'digestSeq', {unique: true});
	  }

	  // migration to version 4 (part 2)
	  function migrateAttsAndSeqs(txn, callback) {
	    var seqStore = txn.objectStore(BY_SEQ_STORE);
	    var attStore = txn.objectStore(ATTACH_STORE);
	    var attAndSeqStore = txn.objectStore(ATTACH_AND_SEQ_STORE);

	    // need to actually populate the table. this is the expensive part,
	    // so as an optimization, check first that this database even
	    // contains attachments
	    var req = attStore.count();
	    req.onsuccess = function (e) {
	      var count = e.target.result;
	      if (!count) {
	        return callback(); // done
	      }

	      seqStore.openCursor().onsuccess = function (e) {
	        var cursor = e.target.result;
	        if (!cursor) {
	          return callback(); // done
	        }
	        var doc = cursor.value;
	        var seq = cursor.primaryKey;
	        var atts = Object.keys(doc._attachments || {});
	        var digestMap = {};
	        for (var j = 0; j < atts.length; j++) {
	          var att = doc._attachments[atts[j]];
	          digestMap[att.digest] = true; // uniq digests, just in case
	        }
	        var digests = Object.keys(digestMap);
	        for (j = 0; j < digests.length; j++) {
	          var digest = digests[j];
	          attAndSeqStore.put({
	            seq: seq,
	            digestSeq: digest + '::' + seq
	          });
	        }
	        cursor.continue();
	      };
	    };
	  }

	  // migration to version 5
	  // Instead of relying on on-the-fly migration of metadata,
	  // this brings the doc-store to its modern form:
	  // - metadata.winningrev
	  // - metadata.seq
	  // - stringify the metadata when storing it
	  function migrateMetadata(txn) {

	    function decodeMetadataCompat(storedObject) {
	      if (!storedObject.data) {
	        // old format, when we didn't store it stringified
	        storedObject.deleted = storedObject.deletedOrLocal === '1';
	        return storedObject;
	      }
	      return decodeMetadata(storedObject);
	    }

	    // ensure that every metadata has a winningRev and seq,
	    // which was previously created on-the-fly but better to migrate
	    var bySeqStore = txn.objectStore(BY_SEQ_STORE);
	    var docStore = txn.objectStore(DOC_STORE);
	    var cursor = docStore.openCursor();
	    cursor.onsuccess = function (e) {
	      var cursor = e.target.result;
	      if (!cursor) {
	        return; // done
	      }
	      var metadata = decodeMetadataCompat(cursor.value);

	      metadata.winningRev = metadata.winningRev ||
	        pouchdbMerge.winningRev(metadata);

	      function fetchMetadataSeq() {
	        // metadata.seq was added post-3.2.0, so if it's missing,
	        // we need to fetch it manually
	        var start = metadata.id + '::';
	        var end = metadata.id + '::\uffff';
	        var req = bySeqStore.index('_doc_id_rev').openCursor(
	          IDBKeyRange.bound(start, end));

	        var metadataSeq = 0;
	        req.onsuccess = function (e) {
	          var cursor = e.target.result;
	          if (!cursor) {
	            metadata.seq = metadataSeq;
	            return onGetMetadataSeq();
	          }
	          var seq = cursor.primaryKey;
	          if (seq > metadataSeq) {
	            metadataSeq = seq;
	          }
	          cursor.continue();
	        };
	      }

	      function onGetMetadataSeq() {
	        var metadataToStore = encodeMetadata(metadata,
	          metadata.winningRev, metadata.deleted);

	        var req = docStore.put(metadataToStore);
	        req.onsuccess = function () {
	          cursor.continue();
	        };
	      }

	      if (metadata.seq) {
	        return onGetMetadataSeq();
	      }

	      fetchMetadataSeq();
	    };

	  }

	  api.type = function () {
	    return 'idb';
	  };

	  api._id = pouchdbUtils.toPromise(function (callback) {
	    callback(null, api._meta.instanceId);
	  });

	  api._bulkDocs = function idb_bulkDocs(req, reqOpts, callback) {
	    idbBulkDocs(opts, req, reqOpts, api, idb, idbChanges, callback);
	  };

	  // First we look up the metadata in the ids database, then we fetch the
	  // current revision(s) from the by sequence store
	  api._get = function idb_get(id, opts, callback) {
	    var doc;
	    var metadata;
	    var err;
	    var txn = opts.ctx;
	    if (!txn) {
	      var txnResult = openTransactionSafely(idb,
	        [DOC_STORE, BY_SEQ_STORE, ATTACH_STORE], 'readonly');
	      if (txnResult.error) {
	        return callback(txnResult.error);
	      }
	      txn = txnResult.txn;
	    }

	    function finish() {
	      callback(err, {doc: doc, metadata: metadata, ctx: txn});
	    }

	    txn.objectStore(DOC_STORE).get(id).onsuccess = function (e) {
	      metadata = decodeMetadata(e.target.result);
	      // we can determine the result here if:
	      // 1. there is no such document
	      // 2. the document is deleted and we don't ask about specific rev
	      // When we ask with opts.rev we expect the answer to be either
	      // doc (possibly with _deleted=true) or missing error
	      if (!metadata) {
	        err = pouchdbErrors.createError(pouchdbErrors.MISSING_DOC, 'missing');
	        return finish();
	      }
	      if (pouchdbMerge.isDeleted(metadata) && !opts.rev) {
	        err = pouchdbErrors.createError(pouchdbErrors.MISSING_DOC, "deleted");
	        return finish();
	      }
	      var objectStore = txn.objectStore(BY_SEQ_STORE);

	      var rev = opts.rev || metadata.winningRev;
	      var key = metadata.id + '::' + rev;

	      objectStore.index('_doc_id_rev').get(key).onsuccess = function (e) {
	        doc = e.target.result;
	        if (doc) {
	          doc = decodeDoc(doc);
	        }
	        if (!doc) {
	          err = pouchdbErrors.createError(pouchdbErrors.MISSING_DOC, 'missing');
	          return finish();
	        }
	        finish();
	      };
	    };
	  };

	  api._getAttachment = function (docId, attachId, attachment, opts, callback) {
	    var txn;
	    if (opts.ctx) {
	      txn = opts.ctx;
	    } else {
	      var txnResult = openTransactionSafely(idb,
	        [DOC_STORE, BY_SEQ_STORE, ATTACH_STORE], 'readonly');
	      if (txnResult.error) {
	        return callback(txnResult.error);
	      }
	      txn = txnResult.txn;
	    }
	    var digest = attachment.digest;
	    var type = attachment.content_type;

	    txn.objectStore(ATTACH_STORE).get(digest).onsuccess = function (e) {
	      var body = e.target.result.body;
	      readBlobData(body, type, opts.binary, function (blobData) {
	        callback(null, blobData);
	      });
	    };
	  };

	  api._info = function idb_info(callback) {

	    if (idb === null || !cachedDBs.has(dbName)) {
	      var error = new Error('db isn\'t open');
	      error.id = 'idbNull';
	      return callback(error);
	    }
	    var updateSeq;
	    var docCount;

	    var txnResult = openTransactionSafely(idb, [BY_SEQ_STORE], 'readonly');
	    if (txnResult.error) {
	      return callback(txnResult.error);
	    }
	    var txn = txnResult.txn;
	    var cursor = txn.objectStore(BY_SEQ_STORE).openCursor(null, 'prev');
	    cursor.onsuccess = function (event) {
	      var cursor = event.target.result;
	      updateSeq = cursor ? cursor.key : 0;
	      // count within the same txn for consistency
	      docCount = api._meta.docCount;
	    };

	    txn.oncomplete = function () {
	      callback(null, {
	        doc_count: docCount,
	        update_seq: updateSeq,
	        // for debugging
	        idb_attachment_format: (api._meta.blobSupport ? 'binary' : 'base64')
	      });
	    };
	  };

	  api._allDocs = function idb_allDocs(opts, callback) {
	    idbAllDocs(opts, api, idb, callback);
	  };

	  api._changes = function (opts) {
	    opts = pouchdbUtils.clone(opts);

	    if (opts.continuous) {
	      var id = dbName + ':' + pouchdbUtils.uuid();
	      idbChanges.addListener(dbName, id, api, opts);
	      idbChanges.notify(dbName);
	      return {
	        cancel: function () {
	          idbChanges.removeListener(dbName, id);
	        }
	      };
	    }

	    var docIds = opts.doc_ids && new pouchdbCollections.Set(opts.doc_ids);

	    opts.since = opts.since || 0;
	    var lastSeq = opts.since;

	    var limit = 'limit' in opts ? opts.limit : -1;
	    if (limit === 0) {
	      limit = 1; // per CouchDB _changes spec
	    }
	    var returnDocs;
	    if ('return_docs' in opts) {
	      returnDocs = opts.return_docs;
	    } else if ('returnDocs' in opts) {
	      // TODO: Remove 'returnDocs' in favor of 'return_docs' in a future release
	      returnDocs = opts.returnDocs;
	    } else {
	      returnDocs = true;
	    }

	    var results = [];
	    var numResults = 0;
	    var filter = pouchdbUtils.filterChange(opts);
	    var docIdsToMetadata = new pouchdbCollections.Map();

	    var txn;
	    var bySeqStore;
	    var docStore;
	    var docIdRevIndex;

	    function onGetCursor(cursor) {

	      var doc = decodeDoc(cursor.value);
	      var seq = cursor.key;

	      if (docIds && !docIds.has(doc._id)) {
	        return cursor.continue();
	      }

	      var metadata;

	      function onGetMetadata() {
	        if (metadata.seq !== seq) {
	          // some other seq is later
	          return cursor.continue();
	        }

	        lastSeq = seq;

	        if (metadata.winningRev === doc._rev) {
	          return onGetWinningDoc(doc);
	        }

	        fetchWinningDoc();
	      }

	      function fetchWinningDoc() {
	        var docIdRev = doc._id + '::' + metadata.winningRev;
	        var req = docIdRevIndex.get(docIdRev);
	        req.onsuccess = function (e) {
	          onGetWinningDoc(decodeDoc(e.target.result));
	        };
	      }

	      function onGetWinningDoc(winningDoc) {

	        var change = opts.processChange(winningDoc, metadata, opts);
	        change.seq = metadata.seq;

	        var filtered = filter(change);
	        if (typeof filtered === 'object') {
	          return opts.complete(filtered);
	        }

	        if (filtered) {
	          numResults++;
	          if (returnDocs) {
	            results.push(change);
	          }
	          // process the attachment immediately
	          // for the benefit of live listeners
	          if (opts.attachments && opts.include_docs) {
	            fetchAttachmentsIfNecessary(winningDoc, opts, txn, function () {
	              postProcessAttachments([change], opts.binary).then(function () {
	                opts.onChange(change);
	              });
	            });
	          } else {
	            opts.onChange(change);
	          }
	        }
	        if (numResults !== limit) {
	          cursor.continue();
	        }
	      }

	      metadata = docIdsToMetadata.get(doc._id);
	      if (metadata) { // cached
	        return onGetMetadata();
	      }
	      // metadata not cached, have to go fetch it
	      docStore.get(doc._id).onsuccess = function (event) {
	        metadata = decodeMetadata(event.target.result);
	        docIdsToMetadata.set(doc._id, metadata);
	        onGetMetadata();
	      };
	    }

	    function onsuccess(event) {
	      var cursor = event.target.result;

	      if (!cursor) {
	        return;
	      }
	      onGetCursor(cursor);
	    }

	    function fetchChanges() {
	      var objectStores = [DOC_STORE, BY_SEQ_STORE];
	      if (opts.attachments) {
	        objectStores.push(ATTACH_STORE);
	      }
	      var txnResult = openTransactionSafely(idb, objectStores, 'readonly');
	      if (txnResult.error) {
	        return opts.complete(txnResult.error);
	      }
	      txn = txnResult.txn;
	      txn.onabort = idbError(opts.complete);
	      txn.oncomplete = onTxnComplete;

	      bySeqStore = txn.objectStore(BY_SEQ_STORE);
	      docStore = txn.objectStore(DOC_STORE);
	      docIdRevIndex = bySeqStore.index('_doc_id_rev');

	      var req;

	      if (opts.descending) {
	        req = bySeqStore.openCursor(null, 'prev');
	      } else {
	        req = bySeqStore.openCursor(IDBKeyRange.lowerBound(opts.since, true));
	      }

	      req.onsuccess = onsuccess;
	    }

	    fetchChanges();

	    function onTxnComplete() {

	      function finish() {
	        opts.complete(null, {
	          results: results,
	          last_seq: lastSeq
	        });
	      }

	      if (!opts.continuous && opts.attachments) {
	        // cannot guarantee that postProcessing was already done,
	        // so do it again
	        postProcessAttachments(results).then(finish);
	      } else {
	        finish();
	      }
	    }
	  };

	  api._close = function (callback) {
	    if (idb === null) {
	      return callback(pouchdbErrors.createError(pouchdbErrors.NOT_OPEN));
	    }

	    // https://developer.mozilla.org/en-US/docs/IndexedDB/IDBDatabase#close
	    // "Returns immediately and closes the connection in a separate thread..."
	    idb.close();
	    cachedDBs.delete(dbName);
	    idb = null;
	    callback();
	  };

	  api._getRevisionTree = function (docId, callback) {
	    var txnResult = openTransactionSafely(idb, [DOC_STORE], 'readonly');
	    if (txnResult.error) {
	      return callback(txnResult.error);
	    }
	    var txn = txnResult.txn;
	    var req = txn.objectStore(DOC_STORE).get(docId);
	    req.onsuccess = function (event) {
	      var doc = decodeMetadata(event.target.result);
	      if (!doc) {
	        callback(pouchdbErrors.createError(pouchdbErrors.MISSING_DOC));
	      } else {
	        callback(null, doc.rev_tree);
	      }
	    };
	  };

	  // This function removes revisions of document docId
	  // which are listed in revs and sets this document
	  // revision to to rev_tree
	  api._doCompaction = function (docId, revs, callback) {
	    var stores = [
	      DOC_STORE,
	      BY_SEQ_STORE,
	      ATTACH_STORE,
	      ATTACH_AND_SEQ_STORE
	    ];
	    var txnResult = openTransactionSafely(idb, stores, 'readwrite');
	    if (txnResult.error) {
	      return callback(txnResult.error);
	    }
	    var txn = txnResult.txn;

	    var docStore = txn.objectStore(DOC_STORE);

	    docStore.get(docId).onsuccess = function (event) {
	      var metadata = decodeMetadata(event.target.result);
	      pouchdbMerge.traverseRevTree(metadata.rev_tree, function (isLeaf, pos,
	                                                         revHash, ctx, opts) {
	        var rev = pos + '-' + revHash;
	        if (revs.indexOf(rev) !== -1) {
	          opts.status = 'missing';
	        }
	      });
	      compactRevs(revs, docId, txn);
	      var winningRev = metadata.winningRev;
	      var deleted = metadata.deleted;
	      txn.objectStore(DOC_STORE).put(
	        encodeMetadata(metadata, winningRev, deleted));
	    };
	    txn.onabort = idbError(callback);
	    txn.oncomplete = function () {
	      callback();
	    };
	  };


	  api._getLocal = function (id, callback) {
	    var txnResult = openTransactionSafely(idb, [LOCAL_STORE], 'readonly');
	    if (txnResult.error) {
	      return callback(txnResult.error);
	    }
	    var tx = txnResult.txn;
	    var req = tx.objectStore(LOCAL_STORE).get(id);

	    req.onerror = idbError(callback);
	    req.onsuccess = function (e) {
	      var doc = e.target.result;
	      if (!doc) {
	        callback(pouchdbErrors.createError(pouchdbErrors.MISSING_DOC));
	      } else {
	        delete doc['_doc_id_rev']; // for backwards compat
	        callback(null, doc);
	      }
	    };
	  };

	  api._putLocal = function (doc, opts, callback) {
	    if (typeof opts === 'function') {
	      callback = opts;
	      opts = {};
	    }
	    delete doc._revisions; // ignore this, trust the rev
	    var oldRev = doc._rev;
	    var id = doc._id;
	    if (!oldRev) {
	      doc._rev = '0-1';
	    } else {
	      doc._rev = '0-' + (parseInt(oldRev.split('-')[1], 10) + 1);
	    }

	    var tx = opts.ctx;
	    var ret;
	    if (!tx) {
	      var txnResult = openTransactionSafely(idb, [LOCAL_STORE], 'readwrite');
	      if (txnResult.error) {
	        return callback(txnResult.error);
	      }
	      tx = txnResult.txn;
	      tx.onerror = idbError(callback);
	      tx.oncomplete = function () {
	        if (ret) {
	          callback(null, ret);
	        }
	      };
	    }

	    var oStore = tx.objectStore(LOCAL_STORE);
	    var req;
	    if (oldRev) {
	      req = oStore.get(id);
	      req.onsuccess = function (e) {
	        var oldDoc = e.target.result;
	        if (!oldDoc || oldDoc._rev !== oldRev) {
	          callback(pouchdbErrors.createError(pouchdbErrors.REV_CONFLICT));
	        } else { // update
	          var req = oStore.put(doc);
	          req.onsuccess = function () {
	            ret = {ok: true, id: doc._id, rev: doc._rev};
	            if (opts.ctx) { // return immediately
	              callback(null, ret);
	            }
	          };
	        }
	      };
	    } else { // new doc
	      req = oStore.add(doc);
	      req.onerror = function (e) {
	        // constraint error, already exists
	        callback(pouchdbErrors.createError(pouchdbErrors.REV_CONFLICT));
	        e.preventDefault(); // avoid transaction abort
	        e.stopPropagation(); // avoid transaction onerror
	      };
	      req.onsuccess = function () {
	        ret = {ok: true, id: doc._id, rev: doc._rev};
	        if (opts.ctx) { // return immediately
	          callback(null, ret);
	        }
	      };
	    }
	  };

	  api._removeLocal = function (doc, opts, callback) {
	    if (typeof opts === 'function') {
	      callback = opts;
	      opts = {};
	    }
	    var tx = opts.ctx;
	    if (!tx) {
	      var txnResult = openTransactionSafely(idb, [LOCAL_STORE], 'readwrite');
	      if (txnResult.error) {
	        return callback(txnResult.error);
	      }
	      tx = txnResult.txn;
	      tx.oncomplete = function () {
	        if (ret) {
	          callback(null, ret);
	        }
	      };
	    }
	    var ret;
	    var id = doc._id;
	    var oStore = tx.objectStore(LOCAL_STORE);
	    var req = oStore.get(id);

	    req.onerror = idbError(callback);
	    req.onsuccess = function (e) {
	      var oldDoc = e.target.result;
	      if (!oldDoc || oldDoc._rev !== doc._rev) {
	        callback(pouchdbErrors.createError(pouchdbErrors.MISSING_DOC));
	      } else {
	        oStore.delete(id);
	        ret = {ok: true, id: id, rev: '0-0'};
	        if (opts.ctx) { // return immediately
	          callback(null, ret);
	        }
	      }
	    };
	  };

	  api._destroy = function (opts, callback) {
	    idbChanges.removeAllListeners(dbName);

	    //Close open request for "dbName" database to fix ie delay.
	    var openReq = openReqList.get(dbName);
	    if (openReq && openReq.result) {
	      openReq.result.close();
	      cachedDBs.delete(dbName);
	    }
	    var req = indexedDB.deleteDatabase(dbName);

	    req.onsuccess = function () {
	      //Remove open request from the list.
	      openReqList.delete(dbName);
	      if (pouchdbUtils.hasLocalStorage() && (dbName in localStorage)) {
	        delete localStorage[dbName];
	      }
	      callback(null, { 'ok': true });
	    };

	    req.onerror = idbError(callback);
	  };

	  var cached = cachedDBs.get(dbName);

	  if (cached) {
	    idb = cached.idb;
	    api._meta = cached.global;
	    process.nextTick(function () {
	      callback(null, api);
	    });
	    return;
	  }

	  var req;
	  if (opts.storage) {
	    req = tryStorageOption(dbName, opts.storage);
	  } else {
	    req = indexedDB.open(dbName, ADAPTER_VERSION);
	  }

	  openReqList.set(dbName, req);

	  req.onupgradeneeded = function (e) {
	    var db = e.target.result;
	    if (e.oldVersion < 1) {
	      return createSchema(db); // new db, initial schema
	    }
	    // do migrations

	    var txn = e.currentTarget.transaction;
	    // these migrations have to be done in this function, before
	    // control is returned to the event loop, because IndexedDB

	    if (e.oldVersion < 3) {
	      createLocalStoreSchema(db); // v2 -> v3
	    }
	    if (e.oldVersion < 4) {
	      addAttachAndSeqStore(db); // v3 -> v4
	    }

	    var migrations = [
	      addDeletedOrLocalIndex, // v1 -> v2
	      migrateLocalStore,      // v2 -> v3
	      migrateAttsAndSeqs,     // v3 -> v4
	      migrateMetadata         // v4 -> v5
	    ];

	    var i = e.oldVersion;

	    function next() {
	      var migration = migrations[i - 1];
	      i++;
	      if (migration) {
	        migration(txn, next);
	      }
	    }

	    next();
	  };

	  req.onsuccess = function (e) {

	    idb = e.target.result;

	    idb.onversionchange = function () {
	      idb.close();
	      cachedDBs.delete(dbName);
	    };

	    idb.onabort = function (e) {
	      pouchdbUtils.guardedConsole('error', 'Database has a global failure', e.target.error);
	      idb.close();
	      cachedDBs.delete(dbName);
	    };

	    var txn = idb.transaction([
	      META_STORE,
	      DETECT_BLOB_SUPPORT_STORE,
	      DOC_STORE
	    ], 'readwrite');

	    var req = txn.objectStore(META_STORE).get(META_STORE);

	    var blobSupport = null;
	    var docCount = null;
	    var instanceId = null;

	    req.onsuccess = function (e) {

	      var checkSetupComplete = function () {
	        if (blobSupport === null || docCount === null ||
	            instanceId === null) {
	          return;
	        } else {
	          api._meta = {
	            name: dbName,
	            instanceId: instanceId,
	            blobSupport: blobSupport,
	            docCount: docCount
	          };

	          cachedDBs.set(dbName, {
	            idb: idb,
	            global: api._meta
	          });
	          callback(null, api);
	        }
	      };

	      //
	      // fetch/store the id
	      //

	      var meta = e.target.result || {id: META_STORE};
	      if (dbName  + '_id' in meta) {
	        instanceId = meta[dbName + '_id'];
	        checkSetupComplete();
	      } else {
	        instanceId = pouchdbUtils.uuid();
	        meta[dbName + '_id'] = instanceId;
	        txn.objectStore(META_STORE).put(meta).onsuccess = function () {
	          checkSetupComplete();
	        };
	      }

	      //
	      // check blob support
	      //

	      if (!blobSupportPromise) {
	        // make sure blob support is only checked once
	        blobSupportPromise = checkBlobSupport(txn);
	      }

	      blobSupportPromise.then(function (val) {
	        blobSupport = val;
	        checkSetupComplete();
	      });

	      //
	      // count docs
	      //

	      var index = txn.objectStore(DOC_STORE).index('deletedOrLocal');
	      index.count(IDBKeyRange.only('0')).onsuccess = function (e) {
	        docCount = e.target.result;
	        checkSetupComplete();
	      };

	    };
	  };

	  req.onerror = function () {
	    var msg = 'Failed to open indexedDB, are you in private browsing mode?';
	    pouchdbUtils.guardedConsole('error', msg);
	    callback(pouchdbErrors.createError(pouchdbErrors.IDB_ERROR, msg));
	  };
	}

	IdbPouch.valid = function () {
	  // Issue #2533, we finally gave up on doing bug
	  // detection instead of browser sniffing. Safari brought us
	  // to our knees.
	  var isSafari = typeof openDatabase !== 'undefined' &&
	    /(Safari|iPhone|iPad|iPod)/.test(navigator.userAgent) &&
	    !/Chrome/.test(navigator.userAgent) &&
	    !/BlackBerry/.test(navigator.platform);

	  // some outdated implementations of IDB that appear on Samsung
	  // and HTC Android devices <4.4 are missing IDBKeyRange
	  return !isSafari && typeof indexedDB !== 'undefined' &&
	    typeof IDBKeyRange !== 'undefined';
	};

	function tryStorageOption(dbName, storage) {
	  try { // option only available in Firefox 26+
	    return indexedDB.open(dbName, {
	      version: ADAPTER_VERSION,
	      storage: storage
	    });
	  } catch(err) {
	      return indexedDB.open(dbName, ADAPTER_VERSION);
	  }
	}

	function index (PouchDB) {
	  PouchDB.adapter('idb', IdbPouch, true);
	}

	module.exports = index;
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(4)))

/***/ },
/* 21 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, '__esModule', { value: true });

	var pouchdbUtils = __webpack_require__(16);
	var pouchdbErrors = __webpack_require__(17);
	var pouchdbMerge = __webpack_require__(18);
	var pouchdbBinaryUtils = __webpack_require__(22);
	var pouchdbMd5 = __webpack_require__(23);
	var pouchdbCollections = __webpack_require__(13);

	function toObject(array) {
	  return array.reduce(function (obj, item) {
	    obj[item] = true;
	    return obj;
	  }, {});
	}
	// List of top level reserved words for doc
	var reservedWords = toObject([
	  '_id',
	  '_rev',
	  '_attachments',
	  '_deleted',
	  '_revisions',
	  '_revs_info',
	  '_conflicts',
	  '_deleted_conflicts',
	  '_local_seq',
	  '_rev_tree',
	  //replication documents
	  '_replication_id',
	  '_replication_state',
	  '_replication_state_time',
	  '_replication_state_reason',
	  '_replication_stats',
	  // Specific to Couchbase Sync Gateway
	  '_removed'
	]);

	// List of reserved words that should end up the document
	var dataWords = toObject([
	  '_attachments',
	  //replication documents
	  '_replication_id',
	  '_replication_state',
	  '_replication_state_time',
	  '_replication_state_reason',
	  '_replication_stats'
	]);

	function parseRevisionInfo(rev) {
	  if (!/^\d+\-./.test(rev)) {
	    return pouchdbErrors.createError(pouchdbErrors.INVALID_REV);
	  }
	  var idx = rev.indexOf('-');
	  var left = rev.substring(0, idx);
	  var right = rev.substring(idx + 1);
	  return {
	    prefix: parseInt(left, 10),
	    id: right
	  };
	}

	function makeRevTreeFromRevisions(revisions, opts) {
	  var pos = revisions.start - revisions.ids.length + 1;

	  var revisionIds = revisions.ids;
	  var ids = [revisionIds[0], opts, []];

	  for (var i = 1, len = revisionIds.length; i < len; i++) {
	    ids = [revisionIds[i], {status: 'missing'}, [ids]];
	  }

	  return [{
	    pos: pos,
	    ids: ids
	  }];
	}

	// Preprocess documents, parse their revisions, assign an id and a
	// revision for new writes that are missing them, etc
	function parseDoc(doc, newEdits) {

	  var nRevNum;
	  var newRevId;
	  var revInfo;
	  var opts = {status: 'available'};
	  if (doc._deleted) {
	    opts.deleted = true;
	  }

	  if (newEdits) {
	    if (!doc._id) {
	      doc._id = pouchdbUtils.uuid();
	    }
	    newRevId = pouchdbUtils.uuid(32, 16).toLowerCase();
	    if (doc._rev) {
	      revInfo = parseRevisionInfo(doc._rev);
	      if (revInfo.error) {
	        return revInfo;
	      }
	      doc._rev_tree = [{
	        pos: revInfo.prefix,
	        ids: [revInfo.id, {status: 'missing'}, [[newRevId, opts, []]]]
	      }];
	      nRevNum = revInfo.prefix + 1;
	    } else {
	      doc._rev_tree = [{
	        pos: 1,
	        ids : [newRevId, opts, []]
	      }];
	      nRevNum = 1;
	    }
	  } else {
	    if (doc._revisions) {
	      doc._rev_tree = makeRevTreeFromRevisions(doc._revisions, opts);
	      nRevNum = doc._revisions.start;
	      newRevId = doc._revisions.ids[0];
	    }
	    if (!doc._rev_tree) {
	      revInfo = parseRevisionInfo(doc._rev);
	      if (revInfo.error) {
	        return revInfo;
	      }
	      nRevNum = revInfo.prefix;
	      newRevId = revInfo.id;
	      doc._rev_tree = [{
	        pos: nRevNum,
	        ids: [newRevId, opts, []]
	      }];
	    }
	  }

	  pouchdbUtils.invalidIdError(doc._id);

	  doc._rev = nRevNum + '-' + newRevId;

	  var result = {metadata : {}, data : {}};
	  for (var key in doc) {
	    /* istanbul ignore else */
	    if (Object.prototype.hasOwnProperty.call(doc, key)) {
	      var specialKey = key[0] === '_';
	      if (specialKey && !reservedWords[key]) {
	        var error = pouchdbErrors.createError(pouchdbErrors.DOC_VALIDATION, key);
	        error.message = pouchdbErrors.DOC_VALIDATION.message + ': ' + key;
	        throw error;
	      } else if (specialKey && !dataWords[key]) {
	        result.metadata[key.slice(1)] = doc[key];
	      } else {
	        result.data[key] = doc[key];
	      }
	    }
	  }
	  return result;
	}

	function preprocessAttachments(docInfos, blobType, callback) {

	  if (!docInfos.length) {
	    return callback();
	  }

	  var docv = 0;

	  function parseBase64(data) {
	    try {
	      return pouchdbBinaryUtils.atob(data);
	    } catch (e) {
	      var err = pouchdbErrors.createError(pouchdbErrors.BAD_ARG,
	        'Attachment is not a valid base64 string');
	      return {error: err};
	    }
	  }

	  function preprocessAttachment(att, callback) {
	    if (att.stub) {
	      return callback();
	    }
	    if (typeof att.data === 'string') {
	      // input is assumed to be a base64 string

	      var asBinary = parseBase64(att.data);
	      if (asBinary.error) {
	        return callback(asBinary.error);
	      }

	      att.length = asBinary.length;
	      if (blobType === 'blob') {
	        att.data = pouchdbBinaryUtils.binaryStringToBlobOrBuffer(asBinary, att.content_type);
	      } else if (blobType === 'base64') {
	        att.data = pouchdbBinaryUtils.btoa(asBinary);
	      } else { // binary
	        att.data = asBinary;
	      }
	      pouchdbMd5.binaryMd5(asBinary, function (result) {
	        att.digest = 'md5-' + result;
	        callback();
	      });
	    } else { // input is a blob
	      pouchdbBinaryUtils.readAsArrayBuffer(att.data, function (buff) {
	        if (blobType === 'binary') {
	          att.data = pouchdbBinaryUtils.arrayBufferToBinaryString(buff);
	        } else if (blobType === 'base64') {
	          att.data = pouchdbBinaryUtils.arrayBufferToBase64(buff);
	        }
	        pouchdbMd5.binaryMd5(buff, function (result) {
	          att.digest = 'md5-' + result;
	          att.length = buff.byteLength;
	          callback();
	        });
	      });
	    }
	  }

	  var overallErr;

	  docInfos.forEach(function (docInfo) {
	    var attachments = docInfo.data && docInfo.data._attachments ?
	      Object.keys(docInfo.data._attachments) : [];
	    var recv = 0;

	    if (!attachments.length) {
	      return done();
	    }

	    function processedAttachment(err) {
	      overallErr = err;
	      recv++;
	      if (recv === attachments.length) {
	        done();
	      }
	    }

	    for (var key in docInfo.data._attachments) {
	      if (docInfo.data._attachments.hasOwnProperty(key)) {
	        preprocessAttachment(docInfo.data._attachments[key],
	          processedAttachment);
	      }
	    }
	  });

	  function done() {
	    docv++;
	    if (docInfos.length === docv) {
	      if (overallErr) {
	        callback(overallErr);
	      } else {
	        callback();
	      }
	    }
	  }
	}

	function updateDoc(revLimit, prev, docInfo, results,
	                   i, cb, writeDoc, newEdits) {

	  if (pouchdbMerge.revExists(prev.rev_tree, docInfo.metadata.rev)) {
	    results[i] = docInfo;
	    return cb();
	  }

	  // sometimes this is pre-calculated. historically not always
	  var previousWinningRev = prev.winningRev || pouchdbMerge.winningRev(prev);
	  var previouslyDeleted = 'deleted' in prev ? prev.deleted :
	    pouchdbMerge.isDeleted(prev, previousWinningRev);
	  var deleted = 'deleted' in docInfo.metadata ? docInfo.metadata.deleted :
	    pouchdbMerge.isDeleted(docInfo.metadata);
	  var isRoot = /^1-/.test(docInfo.metadata.rev);

	  if (previouslyDeleted && !deleted && newEdits && isRoot) {
	    var newDoc = docInfo.data;
	    newDoc._rev = previousWinningRev;
	    newDoc._id = docInfo.metadata.id;
	    docInfo = parseDoc(newDoc, newEdits);
	  }

	  var merged = pouchdbMerge.merge(prev.rev_tree, docInfo.metadata.rev_tree[0], revLimit);

	  var inConflict = newEdits && (((previouslyDeleted && deleted) ||
	    (!previouslyDeleted && merged.conflicts !== 'new_leaf') ||
	    (previouslyDeleted && !deleted && merged.conflicts === 'new_branch')));

	  if (inConflict) {
	    var err = pouchdbErrors.createError(pouchdbErrors.REV_CONFLICT);
	    results[i] = err;
	    return cb();
	  }

	  var newRev = docInfo.metadata.rev;
	  docInfo.metadata.rev_tree = merged.tree;
	  docInfo.stemmedRevs = merged.stemmedRevs || [];
	  /* istanbul ignore else */
	  if (prev.rev_map) {
	    docInfo.metadata.rev_map = prev.rev_map; // used only by leveldb
	  }

	  // recalculate
	  var winningRev = pouchdbMerge.winningRev(docInfo.metadata);
	  var winningRevIsDeleted = pouchdbMerge.isDeleted(docInfo.metadata, winningRev);

	  // calculate the total number of documents that were added/removed,
	  // from the perspective of total_rows/doc_count
	  var delta = (previouslyDeleted === winningRevIsDeleted) ? 0 :
	    previouslyDeleted < winningRevIsDeleted ? -1 : 1;

	  var newRevIsDeleted;
	  if (newRev === winningRev) {
	    // if the new rev is the same as the winning rev, we can reuse that value
	    newRevIsDeleted = winningRevIsDeleted;
	  } else {
	    // if they're not the same, then we need to recalculate
	    newRevIsDeleted = pouchdbMerge.isDeleted(docInfo.metadata, newRev);
	  }

	  writeDoc(docInfo, winningRev, winningRevIsDeleted, newRevIsDeleted,
	    true, delta, i, cb);
	}

	function rootIsMissing(docInfo) {
	  return docInfo.metadata.rev_tree[0].ids[1].status === 'missing';
	}

	function processDocs(revLimit, docInfos, api, fetchedDocs, tx, results,
	                     writeDoc, opts, overallCallback) {

	  // Default to 1000 locally
	  revLimit = revLimit || 1000;

	  function insertDoc(docInfo, resultsIdx, callback) {
	    // Cant insert new deleted documents
	    var winningRev = pouchdbMerge.winningRev(docInfo.metadata);
	    var deleted = pouchdbMerge.isDeleted(docInfo.metadata, winningRev);
	    if ('was_delete' in opts && deleted) {
	      results[resultsIdx] = pouchdbErrors.createError(pouchdbErrors.MISSING_DOC, 'deleted');
	      return callback();
	    }

	    // 4712 - detect whether a new document was inserted with a _rev
	    var inConflict = newEdits && rootIsMissing(docInfo);

	    if (inConflict) {
	      var err = pouchdbErrors.createError(pouchdbErrors.REV_CONFLICT);
	      results[resultsIdx] = err;
	      return callback();
	    }

	    var delta = deleted ? 0 : 1;

	    writeDoc(docInfo, winningRev, deleted, deleted, false,
	      delta, resultsIdx, callback);
	  }

	  var newEdits = opts.new_edits;
	  var idsToDocs = new pouchdbCollections.Map();

	  var docsDone = 0;
	  var docsToDo = docInfos.length;

	  function checkAllDocsDone() {
	    if (++docsDone === docsToDo && overallCallback) {
	      overallCallback();
	    }
	  }

	  docInfos.forEach(function (currentDoc, resultsIdx) {

	    if (currentDoc._id && pouchdbMerge.isLocalId(currentDoc._id)) {
	      var fun = currentDoc._deleted ? '_removeLocal' : '_putLocal';
	      api[fun](currentDoc, {ctx: tx}, function (err, res) {
	        results[resultsIdx] = err || res;
	        checkAllDocsDone();
	      });
	      return;
	    }

	    var id = currentDoc.metadata.id;
	    if (idsToDocs.has(id)) {
	      docsToDo--; // duplicate
	      idsToDocs.get(id).push([currentDoc, resultsIdx]);
	    } else {
	      idsToDocs.set(id, [[currentDoc, resultsIdx]]);
	    }
	  });

	  // in the case of new_edits, the user can provide multiple docs
	  // with the same id. these need to be processed sequentially
	  idsToDocs.forEach(function (docs, id) {
	    var numDone = 0;

	    function docWritten() {
	      if (++numDone < docs.length) {
	        nextDoc();
	      } else {
	        checkAllDocsDone();
	      }
	    }
	    function nextDoc() {
	      var value = docs[numDone];
	      var currentDoc = value[0];
	      var resultsIdx = value[1];

	      if (fetchedDocs.has(id)) {
	        updateDoc(revLimit, fetchedDocs.get(id), currentDoc, results,
	          resultsIdx, docWritten, writeDoc, newEdits);
	      } else {
	        // Ensure stemming applies to new writes as well
	        var merged = pouchdbMerge.merge([], currentDoc.metadata.rev_tree[0], revLimit);
	        currentDoc.metadata.rev_tree = merged.tree;
	        currentDoc.stemmedRevs = merged.stemmedRevs || [];
	        insertDoc(currentDoc, resultsIdx, docWritten);
	      }
	    }
	    nextDoc();
	  });
	}

	exports.invalidIdError = pouchdbUtils.invalidIdError;
	exports.isDeleted = pouchdbMerge.isDeleted;
	exports.isLocalId = pouchdbMerge.isLocalId;
	exports.normalizeDdocFunctionName = pouchdbUtils.normalizeDdocFunctionName;
	exports.parseDdocFunctionName = pouchdbUtils.parseDdocFunctionName;
	exports.parseDoc = parseDoc;
	exports.preprocessAttachments = preprocessAttachments;
	exports.processDocs = processDocs;
	exports.updateDoc = updateDoc;

/***/ },
/* 22 */
/***/ function(module, exports) {

	'use strict';

	Object.defineProperty(exports, '__esModule', { value: true });

	//Can't find original post, but this is close
	//http://stackoverflow.com/questions/6965107/ (continues on next line)
	//converting-between-strings-and-arraybuffers
	function arrayBufferToBinaryString(buffer) {
	  var binary = '';
	  var bytes = new Uint8Array(buffer);
	  var length = bytes.byteLength;
	  for (var i = 0; i < length; i++) {
	    binary += String.fromCharCode(bytes[i]);
	  }
	  return binary;
	}

	var atob$1 = function (str) {
	  return atob(str);
	};

	var btoa$1 = function (str) {
	  return btoa(str);
	};

	function arrayBufferToBase64(buffer) {
	  return btoa$1(arrayBufferToBinaryString(buffer));
	}

	// Abstracts constructing a Blob object, so it also works in older
	// browsers that don't support the native Blob constructor (e.g.
	// old QtWebKit versions, Android < 4.4).
	function createBlob(parts, properties) {
	  /* global BlobBuilder,MSBlobBuilder,MozBlobBuilder,WebKitBlobBuilder */
	  parts = parts || [];
	  properties = properties || {};
	  try {
	    return new Blob(parts, properties);
	  } catch (e) {
	    if (e.name !== "TypeError") {
	      throw e;
	    }
	    var Builder = typeof BlobBuilder !== 'undefined' ? BlobBuilder :
	                  typeof MSBlobBuilder !== 'undefined' ? MSBlobBuilder :
	                  typeof MozBlobBuilder !== 'undefined' ? MozBlobBuilder :
	                  WebKitBlobBuilder;
	    var builder = new Builder();
	    for (var i = 0; i < parts.length; i += 1) {
	      builder.append(parts[i]);
	    }
	    return builder.getBlob(properties.type);
	  }
	}

	// From http://stackoverflow.com/questions/14967647/ (continues on next line)
	// encode-decode-image-with-base64-breaks-image (2013-04-21)
	function binaryStringToArrayBuffer(bin) {
	  var length = bin.length;
	  var buf = new ArrayBuffer(length);
	  var arr = new Uint8Array(buf);
	  for (var i = 0; i < length; i++) {
	    arr[i] = bin.charCodeAt(i);
	  }
	  return buf;
	}

	function binStringToBluffer(binString, type) {
	  return createBlob([binaryStringToArrayBuffer(binString)], {type: type});
	}

	function b64ToBluffer(b64, type) {
	  return binStringToBluffer(atob$1(b64), type);
	}

	// shim for browsers that don't support it
	function readAsBinaryString(blob, callback) {
	  if (typeof FileReader === 'undefined') {
	    // fix for Firefox in a web worker
	    // https://bugzilla.mozilla.org/show_bug.cgi?id=901097
	    return callback(arrayBufferToBinaryString(
	      new FileReaderSync().readAsArrayBuffer(blob)));
	  }

	  var reader = new FileReader();
	  var hasBinaryString = typeof reader.readAsBinaryString === 'function';
	  reader.onloadend = function (e) {
	    var result = e.target.result || '';
	    if (hasBinaryString) {
	      return callback(result);
	    }
	    callback(arrayBufferToBinaryString(result));
	  };
	  if (hasBinaryString) {
	    reader.readAsBinaryString(blob);
	  } else {
	    reader.readAsArrayBuffer(blob);
	  }
	}

	function blobToBase64(blobOrBuffer, callback) {
	  readAsBinaryString(blobOrBuffer, function (bin) {
	    callback(btoa$1(bin));
	  });
	}

	// simplified API. universal browser support is assumed
	function readAsArrayBuffer(blob, callback) {
	  if (typeof FileReader === 'undefined') {
	    // fix for Firefox in a web worker:
	    // https://bugzilla.mozilla.org/show_bug.cgi?id=901097
	    return callback(new FileReaderSync().readAsArrayBuffer(blob));
	  }

	  var reader = new FileReader();
	  reader.onloadend = function (e) {
	    var result = e.target.result || new ArrayBuffer(0);
	    callback(result);
	  };
	  reader.readAsArrayBuffer(blob);
	}

	// this is not used in the browser
	function typedBuffer() {
	}

	exports.arrayBufferToBase64 = arrayBufferToBase64;
	exports.arrayBufferToBinaryString = arrayBufferToBinaryString;
	exports.atob = atob$1;
	exports.btoa = btoa$1;
	exports.base64StringToBlobOrBuffer = b64ToBluffer;
	exports.binaryStringToArrayBuffer = binaryStringToArrayBuffer;
	exports.binaryStringToBlobOrBuffer = binStringToBluffer;
	exports.blob = createBlob;
	exports.blobOrBufferToBase64 = blobToBase64;
	exports.readAsArrayBuffer = readAsArrayBuffer;
	exports.readAsBinaryString = readAsBinaryString;
	exports.typedBuffer = typedBuffer;

/***/ },
/* 23 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(global) {'use strict';

	Object.defineProperty(exports, '__esModule', { value: true });

	function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

	var pouchdbBinaryUtils = __webpack_require__(22);
	var Md5 = _interopDefault(__webpack_require__(24));

	var setImmediateShim = global.setImmediate || global.setTimeout;
	var MD5_CHUNK_SIZE = 32768;

	function rawToBase64(raw) {
	  return pouchdbBinaryUtils.btoa(raw);
	}

	function appendBuffer(buffer, data, start, end) {
	  if (start > 0 || end < data.byteLength) {
	    // only create a subarray if we really need to
	    data = new Uint8Array(data, start,
	      Math.min(end, data.byteLength) - start);
	  }
	  buffer.append(data);
	}

	function appendString(buffer, data, start, end) {
	  if (start > 0 || end < data.length) {
	    // only create a substring if we really need to
	    data = data.substring(start, end);
	  }
	  buffer.appendBinary(data);
	}

	function binaryMd5(data, callback) {
	  var inputIsString = typeof data === 'string';
	  var len = inputIsString ? data.length : data.byteLength;
	  var chunkSize = Math.min(MD5_CHUNK_SIZE, len);
	  var chunks = Math.ceil(len / chunkSize);
	  var currentChunk = 0;
	  var buffer = inputIsString ? new Md5() : new Md5.ArrayBuffer();

	  var append = inputIsString ? appendString : appendBuffer;

	  function loadNextChunk() {
	    var start = currentChunk * chunkSize;
	    var end = start + chunkSize;
	    currentChunk++;
	    if (currentChunk < chunks) {
	      append(buffer, data, start, end);
	      setImmediateShim(loadNextChunk);
	    } else {
	      append(buffer, data, start, end);
	      var raw = buffer.end(true);
	      var base64 = rawToBase64(raw);
	      callback(base64);
	      buffer.destroy();
	    }
	  }
	  loadNextChunk();
	}

	function stringMd5(string) {
	  return Md5.hash(string);
	}

	exports.binaryMd5 = binaryMd5;
	exports.stringMd5 = stringMd5;
	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }())))

/***/ },
/* 24 */
/***/ function(module, exports, __webpack_require__) {

	(function (factory) {
	    if (true) {
	        // Node/CommonJS
	        module.exports = factory();
	    } else if (typeof define === 'function' && define.amd) {
	        // AMD
	        define(factory);
	    } else {
	        // Browser globals (with support for web workers)
	        var glob;

	        try {
	            glob = window;
	        } catch (e) {
	            glob = self;
	        }

	        glob.SparkMD5 = factory();
	    }
	}(function (undefined) {

	    'use strict';

	    /*
	     * Fastest md5 implementation around (JKM md5).
	     * Credits: Joseph Myers
	     *
	     * @see http://www.myersdaily.org/joseph/javascript/md5-text.html
	     * @see http://jsperf.com/md5-shootout/7
	     */

	    /* this function is much faster,
	      so if possible we use it. Some IEs
	      are the only ones I know of that
	      need the idiotic second function,
	      generated by an if clause.  */
	    var add32 = function (a, b) {
	        return (a + b) & 0xFFFFFFFF;
	    },
	        hex_chr = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'];


	    function cmn(q, a, b, x, s, t) {
	        a = add32(add32(a, q), add32(x, t));
	        return add32((a << s) | (a >>> (32 - s)), b);
	    }

	    function ff(a, b, c, d, x, s, t) {
	        return cmn((b & c) | ((~b) & d), a, b, x, s, t);
	    }

	    function gg(a, b, c, d, x, s, t) {
	        return cmn((b & d) | (c & (~d)), a, b, x, s, t);
	    }

	    function hh(a, b, c, d, x, s, t) {
	        return cmn(b ^ c ^ d, a, b, x, s, t);
	    }

	    function ii(a, b, c, d, x, s, t) {
	        return cmn(c ^ (b | (~d)), a, b, x, s, t);
	    }

	    function md5cycle(x, k) {
	        var a = x[0],
	            b = x[1],
	            c = x[2],
	            d = x[3];

	        a = ff(a, b, c, d, k[0], 7, -680876936);
	        d = ff(d, a, b, c, k[1], 12, -389564586);
	        c = ff(c, d, a, b, k[2], 17, 606105819);
	        b = ff(b, c, d, a, k[3], 22, -1044525330);
	        a = ff(a, b, c, d, k[4], 7, -176418897);
	        d = ff(d, a, b, c, k[5], 12, 1200080426);
	        c = ff(c, d, a, b, k[6], 17, -1473231341);
	        b = ff(b, c, d, a, k[7], 22, -45705983);
	        a = ff(a, b, c, d, k[8], 7, 1770035416);
	        d = ff(d, a, b, c, k[9], 12, -1958414417);
	        c = ff(c, d, a, b, k[10], 17, -42063);
	        b = ff(b, c, d, a, k[11], 22, -1990404162);
	        a = ff(a, b, c, d, k[12], 7, 1804603682);
	        d = ff(d, a, b, c, k[13], 12, -40341101);
	        c = ff(c, d, a, b, k[14], 17, -1502002290);
	        b = ff(b, c, d, a, k[15], 22, 1236535329);

	        a = gg(a, b, c, d, k[1], 5, -165796510);
	        d = gg(d, a, b, c, k[6], 9, -1069501632);
	        c = gg(c, d, a, b, k[11], 14, 643717713);
	        b = gg(b, c, d, a, k[0], 20, -373897302);
	        a = gg(a, b, c, d, k[5], 5, -701558691);
	        d = gg(d, a, b, c, k[10], 9, 38016083);
	        c = gg(c, d, a, b, k[15], 14, -660478335);
	        b = gg(b, c, d, a, k[4], 20, -405537848);
	        a = gg(a, b, c, d, k[9], 5, 568446438);
	        d = gg(d, a, b, c, k[14], 9, -1019803690);
	        c = gg(c, d, a, b, k[3], 14, -187363961);
	        b = gg(b, c, d, a, k[8], 20, 1163531501);
	        a = gg(a, b, c, d, k[13], 5, -1444681467);
	        d = gg(d, a, b, c, k[2], 9, -51403784);
	        c = gg(c, d, a, b, k[7], 14, 1735328473);
	        b = gg(b, c, d, a, k[12], 20, -1926607734);

	        a = hh(a, b, c, d, k[5], 4, -378558);
	        d = hh(d, a, b, c, k[8], 11, -2022574463);
	        c = hh(c, d, a, b, k[11], 16, 1839030562);
	        b = hh(b, c, d, a, k[14], 23, -35309556);
	        a = hh(a, b, c, d, k[1], 4, -1530992060);
	        d = hh(d, a, b, c, k[4], 11, 1272893353);
	        c = hh(c, d, a, b, k[7], 16, -155497632);
	        b = hh(b, c, d, a, k[10], 23, -1094730640);
	        a = hh(a, b, c, d, k[13], 4, 681279174);
	        d = hh(d, a, b, c, k[0], 11, -358537222);
	        c = hh(c, d, a, b, k[3], 16, -722521979);
	        b = hh(b, c, d, a, k[6], 23, 76029189);
	        a = hh(a, b, c, d, k[9], 4, -640364487);
	        d = hh(d, a, b, c, k[12], 11, -421815835);
	        c = hh(c, d, a, b, k[15], 16, 530742520);
	        b = hh(b, c, d, a, k[2], 23, -995338651);

	        a = ii(a, b, c, d, k[0], 6, -198630844);
	        d = ii(d, a, b, c, k[7], 10, 1126891415);
	        c = ii(c, d, a, b, k[14], 15, -1416354905);
	        b = ii(b, c, d, a, k[5], 21, -57434055);
	        a = ii(a, b, c, d, k[12], 6, 1700485571);
	        d = ii(d, a, b, c, k[3], 10, -1894986606);
	        c = ii(c, d, a, b, k[10], 15, -1051523);
	        b = ii(b, c, d, a, k[1], 21, -2054922799);
	        a = ii(a, b, c, d, k[8], 6, 1873313359);
	        d = ii(d, a, b, c, k[15], 10, -30611744);
	        c = ii(c, d, a, b, k[6], 15, -1560198380);
	        b = ii(b, c, d, a, k[13], 21, 1309151649);
	        a = ii(a, b, c, d, k[4], 6, -145523070);
	        d = ii(d, a, b, c, k[11], 10, -1120210379);
	        c = ii(c, d, a, b, k[2], 15, 718787259);
	        b = ii(b, c, d, a, k[9], 21, -343485551);

	        x[0] = add32(a, x[0]);
	        x[1] = add32(b, x[1]);
	        x[2] = add32(c, x[2]);
	        x[3] = add32(d, x[3]);
	    }

	    function md5blk(s) {
	        var md5blks = [],
	            i; /* Andy King said do it this way. */

	        for (i = 0; i < 64; i += 4) {
	            md5blks[i >> 2] = s.charCodeAt(i) + (s.charCodeAt(i + 1) << 8) + (s.charCodeAt(i + 2) << 16) + (s.charCodeAt(i + 3) << 24);
	        }
	        return md5blks;
	    }

	    function md5blk_array(a) {
	        var md5blks = [],
	            i; /* Andy King said do it this way. */

	        for (i = 0; i < 64; i += 4) {
	            md5blks[i >> 2] = a[i] + (a[i + 1] << 8) + (a[i + 2] << 16) + (a[i + 3] << 24);
	        }
	        return md5blks;
	    }

	    function md51(s) {
	        var n = s.length,
	            state = [1732584193, -271733879, -1732584194, 271733878],
	            i,
	            length,
	            tail,
	            tmp,
	            lo,
	            hi;

	        for (i = 64; i <= n; i += 64) {
	            md5cycle(state, md5blk(s.substring(i - 64, i)));
	        }
	        s = s.substring(i - 64);
	        length = s.length;
	        tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
	        for (i = 0; i < length; i += 1) {
	            tail[i >> 2] |= s.charCodeAt(i) << ((i % 4) << 3);
	        }
	        tail[i >> 2] |= 0x80 << ((i % 4) << 3);
	        if (i > 55) {
	            md5cycle(state, tail);
	            for (i = 0; i < 16; i += 1) {
	                tail[i] = 0;
	            }
	        }

	        // Beware that the final length might not fit in 32 bits so we take care of that
	        tmp = n * 8;
	        tmp = tmp.toString(16).match(/(.*?)(.{0,8})$/);
	        lo = parseInt(tmp[2], 16);
	        hi = parseInt(tmp[1], 16) || 0;

	        tail[14] = lo;
	        tail[15] = hi;

	        md5cycle(state, tail);
	        return state;
	    }

	    function md51_array(a) {
	        var n = a.length,
	            state = [1732584193, -271733879, -1732584194, 271733878],
	            i,
	            length,
	            tail,
	            tmp,
	            lo,
	            hi;

	        for (i = 64; i <= n; i += 64) {
	            md5cycle(state, md5blk_array(a.subarray(i - 64, i)));
	        }

	        // Not sure if it is a bug, however IE10 will always produce a sub array of length 1
	        // containing the last element of the parent array if the sub array specified starts
	        // beyond the length of the parent array - weird.
	        // https://connect.microsoft.com/IE/feedback/details/771452/typed-array-subarray-issue
	        a = (i - 64) < n ? a.subarray(i - 64) : new Uint8Array(0);

	        length = a.length;
	        tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
	        for (i = 0; i < length; i += 1) {
	            tail[i >> 2] |= a[i] << ((i % 4) << 3);
	        }

	        tail[i >> 2] |= 0x80 << ((i % 4) << 3);
	        if (i > 55) {
	            md5cycle(state, tail);
	            for (i = 0; i < 16; i += 1) {
	                tail[i] = 0;
	            }
	        }

	        // Beware that the final length might not fit in 32 bits so we take care of that
	        tmp = n * 8;
	        tmp = tmp.toString(16).match(/(.*?)(.{0,8})$/);
	        lo = parseInt(tmp[2], 16);
	        hi = parseInt(tmp[1], 16) || 0;

	        tail[14] = lo;
	        tail[15] = hi;

	        md5cycle(state, tail);

	        return state;
	    }

	    function rhex(n) {
	        var s = '',
	            j;
	        for (j = 0; j < 4; j += 1) {
	            s += hex_chr[(n >> (j * 8 + 4)) & 0x0F] + hex_chr[(n >> (j * 8)) & 0x0F];
	        }
	        return s;
	    }

	    function hex(x) {
	        var i;
	        for (i = 0; i < x.length; i += 1) {
	            x[i] = rhex(x[i]);
	        }
	        return x.join('');
	    }

	    // In some cases the fast add32 function cannot be used..
	    if (hex(md51('hello')) !== '5d41402abc4b2a76b9719d911017c592') {
	        add32 = function (x, y) {
	            var lsw = (x & 0xFFFF) + (y & 0xFFFF),
	                msw = (x >> 16) + (y >> 16) + (lsw >> 16);
	            return (msw << 16) | (lsw & 0xFFFF);
	        };
	    }

	    // ---------------------------------------------------

	    /**
	     * ArrayBuffer slice polyfill.
	     *
	     * @see https://github.com/ttaubert/node-arraybuffer-slice
	     */

	    if (typeof ArrayBuffer !== 'undefined' && !ArrayBuffer.prototype.slice) {
	        (function () {
	            function clamp(val, length) {
	                val = (val | 0) || 0;

	                if (val < 0) {
	                    return Math.max(val + length, 0);
	                }

	                return Math.min(val, length);
	            }

	            ArrayBuffer.prototype.slice = function (from, to) {
	                var length = this.byteLength,
	                    begin = clamp(from, length),
	                    end = length,
	                    num,
	                    target,
	                    targetArray,
	                    sourceArray;

	                if (to !== undefined) {
	                    end = clamp(to, length);
	                }

	                if (begin > end) {
	                    return new ArrayBuffer(0);
	                }

	                num = end - begin;
	                target = new ArrayBuffer(num);
	                targetArray = new Uint8Array(target);

	                sourceArray = new Uint8Array(this, begin, num);
	                targetArray.set(sourceArray);

	                return target;
	            };
	        })();
	    }

	    // ---------------------------------------------------

	    /**
	     * Helpers.
	     */

	    function toUtf8(str) {
	        if (/[\u0080-\uFFFF]/.test(str)) {
	            str = unescape(encodeURIComponent(str));
	        }

	        return str;
	    }

	    function utf8Str2ArrayBuffer(str, returnUInt8Array) {
	        var length = str.length,
	           buff = new ArrayBuffer(length),
	           arr = new Uint8Array(buff),
	           i;

	        for (i = 0; i < length; i += 1) {
	            arr[i] = str.charCodeAt(i);
	        }

	        return returnUInt8Array ? arr : buff;
	    }

	    function arrayBuffer2Utf8Str(buff) {
	        return String.fromCharCode.apply(null, new Uint8Array(buff));
	    }

	    function concatenateArrayBuffers(first, second, returnUInt8Array) {
	        var result = new Uint8Array(first.byteLength + second.byteLength);

	        result.set(new Uint8Array(first));
	        result.set(new Uint8Array(second), first.byteLength);

	        return returnUInt8Array ? result : result.buffer;
	    }

	    function hexToBinaryString(hex) {
	        var bytes = [],
	            length = hex.length,
	            x;

	        for (x = 0; x < length - 1; x += 2) {
	            bytes.push(parseInt(hex.substr(x, 2), 16));
	        }

	        return String.fromCharCode.apply(String, bytes);
	    }

	    // ---------------------------------------------------

	    /**
	     * SparkMD5 OOP implementation.
	     *
	     * Use this class to perform an incremental md5, otherwise use the
	     * static methods instead.
	     */

	    function SparkMD5() {
	        // call reset to init the instance
	        this.reset();
	    }

	    /**
	     * Appends a string.
	     * A conversion will be applied if an utf8 string is detected.
	     *
	     * @param {String} str The string to be appended
	     *
	     * @return {SparkMD5} The instance itself
	     */
	    SparkMD5.prototype.append = function (str) {
	        // Converts the string to utf8 bytes if necessary
	        // Then append as binary
	        this.appendBinary(toUtf8(str));

	        return this;
	    };

	    /**
	     * Appends a binary string.
	     *
	     * @param {String} contents The binary string to be appended
	     *
	     * @return {SparkMD5} The instance itself
	     */
	    SparkMD5.prototype.appendBinary = function (contents) {
	        this._buff += contents;
	        this._length += contents.length;

	        var length = this._buff.length,
	            i;

	        for (i = 64; i <= length; i += 64) {
	            md5cycle(this._hash, md5blk(this._buff.substring(i - 64, i)));
	        }

	        this._buff = this._buff.substring(i - 64);

	        return this;
	    };

	    /**
	     * Finishes the incremental computation, reseting the internal state and
	     * returning the result.
	     *
	     * @param {Boolean} raw True to get the raw string, false to get the hex string
	     *
	     * @return {String} The result
	     */
	    SparkMD5.prototype.end = function (raw) {
	        var buff = this._buff,
	            length = buff.length,
	            i,
	            tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
	            ret;

	        for (i = 0; i < length; i += 1) {
	            tail[i >> 2] |= buff.charCodeAt(i) << ((i % 4) << 3);
	        }

	        this._finish(tail, length);
	        ret = hex(this._hash);

	        if (raw) {
	            ret = hexToBinaryString(ret);
	        }

	        this.reset();

	        return ret;
	    };

	    /**
	     * Resets the internal state of the computation.
	     *
	     * @return {SparkMD5} The instance itself
	     */
	    SparkMD5.prototype.reset = function () {
	        this._buff = '';
	        this._length = 0;
	        this._hash = [1732584193, -271733879, -1732584194, 271733878];

	        return this;
	    };

	    /**
	     * Gets the internal state of the computation.
	     *
	     * @return {Object} The state
	     */
	    SparkMD5.prototype.getState = function () {
	        return {
	            buff: this._buff,
	            length: this._length,
	            hash: this._hash
	        };
	    };

	    /**
	     * Gets the internal state of the computation.
	     *
	     * @param {Object} state The state
	     *
	     * @return {SparkMD5} The instance itself
	     */
	    SparkMD5.prototype.setState = function (state) {
	        this._buff = state.buff;
	        this._length = state.length;
	        this._hash = state.hash;

	        return this;
	    };

	    /**
	     * Releases memory used by the incremental buffer and other additional
	     * resources. If you plan to use the instance again, use reset instead.
	     */
	    SparkMD5.prototype.destroy = function () {
	        delete this._hash;
	        delete this._buff;
	        delete this._length;
	    };

	    /**
	     * Finish the final calculation based on the tail.
	     *
	     * @param {Array}  tail   The tail (will be modified)
	     * @param {Number} length The length of the remaining buffer
	     */
	    SparkMD5.prototype._finish = function (tail, length) {
	        var i = length,
	            tmp,
	            lo,
	            hi;

	        tail[i >> 2] |= 0x80 << ((i % 4) << 3);
	        if (i > 55) {
	            md5cycle(this._hash, tail);
	            for (i = 0; i < 16; i += 1) {
	                tail[i] = 0;
	            }
	        }

	        // Do the final computation based on the tail and length
	        // Beware that the final length may not fit in 32 bits so we take care of that
	        tmp = this._length * 8;
	        tmp = tmp.toString(16).match(/(.*?)(.{0,8})$/);
	        lo = parseInt(tmp[2], 16);
	        hi = parseInt(tmp[1], 16) || 0;

	        tail[14] = lo;
	        tail[15] = hi;
	        md5cycle(this._hash, tail);
	    };

	    /**
	     * Performs the md5 hash on a string.
	     * A conversion will be applied if utf8 string is detected.
	     *
	     * @param {String}  str The string
	     * @param {Boolean} raw True to get the raw string, false to get the hex string
	     *
	     * @return {String} The result
	     */
	    SparkMD5.hash = function (str, raw) {
	        // Converts the string to utf8 bytes if necessary
	        // Then compute it using the binary function
	        return SparkMD5.hashBinary(toUtf8(str), raw);
	    };

	    /**
	     * Performs the md5 hash on a binary string.
	     *
	     * @param {String}  content The binary string
	     * @param {Boolean} raw     True to get the raw string, false to get the hex string
	     *
	     * @return {String} The result
	     */
	    SparkMD5.hashBinary = function (content, raw) {
	        var hash = md51(content),
	            ret = hex(hash);

	        return raw ? hexToBinaryString(ret) : ret;
	    };

	    // ---------------------------------------------------

	    /**
	     * SparkMD5 OOP implementation for array buffers.
	     *
	     * Use this class to perform an incremental md5 ONLY for array buffers.
	     */
	    SparkMD5.ArrayBuffer = function () {
	        // call reset to init the instance
	        this.reset();
	    };

	    /**
	     * Appends an array buffer.
	     *
	     * @param {ArrayBuffer} arr The array to be appended
	     *
	     * @return {SparkMD5.ArrayBuffer} The instance itself
	     */
	    SparkMD5.ArrayBuffer.prototype.append = function (arr) {
	        var buff = concatenateArrayBuffers(this._buff.buffer, arr, true),
	            length = buff.length,
	            i;

	        this._length += arr.byteLength;

	        for (i = 64; i <= length; i += 64) {
	            md5cycle(this._hash, md5blk_array(buff.subarray(i - 64, i)));
	        }

	        this._buff = (i - 64) < length ? new Uint8Array(buff.buffer.slice(i - 64)) : new Uint8Array(0);

	        return this;
	    };

	    /**
	     * Finishes the incremental computation, reseting the internal state and
	     * returning the result.
	     *
	     * @param {Boolean} raw True to get the raw string, false to get the hex string
	     *
	     * @return {String} The result
	     */
	    SparkMD5.ArrayBuffer.prototype.end = function (raw) {
	        var buff = this._buff,
	            length = buff.length,
	            tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
	            i,
	            ret;

	        for (i = 0; i < length; i += 1) {
	            tail[i >> 2] |= buff[i] << ((i % 4) << 3);
	        }

	        this._finish(tail, length);
	        ret = hex(this._hash);

	        if (raw) {
	            ret = hexToBinaryString(ret);
	        }

	        this.reset();

	        return ret;
	    };

	    /**
	     * Resets the internal state of the computation.
	     *
	     * @return {SparkMD5.ArrayBuffer} The instance itself
	     */
	    SparkMD5.ArrayBuffer.prototype.reset = function () {
	        this._buff = new Uint8Array(0);
	        this._length = 0;
	        this._hash = [1732584193, -271733879, -1732584194, 271733878];

	        return this;
	    };

	    /**
	     * Gets the internal state of the computation.
	     *
	     * @return {Object} The state
	     */
	    SparkMD5.ArrayBuffer.prototype.getState = function () {
	        var state = SparkMD5.prototype.getState.call(this);

	        // Convert buffer to a string
	        state.buff = arrayBuffer2Utf8Str(state.buff);

	        return state;
	    };

	    /**
	     * Gets the internal state of the computation.
	     *
	     * @param {Object} state The state
	     *
	     * @return {SparkMD5.ArrayBuffer} The instance itself
	     */
	    SparkMD5.ArrayBuffer.prototype.setState = function (state) {
	        // Convert string to buffer
	        state.buff = utf8Str2ArrayBuffer(state.buff, true);

	        return SparkMD5.prototype.setState.call(this, state);
	    };

	    SparkMD5.ArrayBuffer.prototype.destroy = SparkMD5.prototype.destroy;

	    SparkMD5.ArrayBuffer.prototype._finish = SparkMD5.prototype._finish;

	    /**
	     * Performs the md5 hash on an array buffer.
	     *
	     * @param {ArrayBuffer} arr The array buffer
	     * @param {Boolean}     raw True to get the raw string, false to get the hex one
	     *
	     * @return {String} The result
	     */
	    SparkMD5.ArrayBuffer.hash = function (arr, raw) {
	        var hash = md51_array(new Uint8Array(arr)),
	            ret = hex(hash);

	        return raw ? hexToBinaryString(ret) : ret;
	    };

	    return SparkMD5;
	}));


/***/ },
/* 25 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, '__esModule', { value: true });

	function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

	var vuvuzela = _interopDefault(__webpack_require__(26));

	function slowJsonParse(str) {
	  try {
	    return JSON.parse(str);
	  } catch (e) {
	    /* istanbul ignore next */
	    return vuvuzela.parse(str);
	  }
	}

	function safeJsonParse(str) {
	  // try/catch is deoptimized in V8, leading to slower
	  // times than we'd like to have. Most documents are _not_
	  // huge, and do not require a slower code path just to parse them.
	  // We can be pretty sure that a document under 50000 characters
	  // will not be so deeply nested as to throw a stack overflow error
	  // (depends on the engine and available memory, though, so this is
	  // just a hunch). 50000 was chosen based on the average length
	  // of this string in our test suite, to try to find a number that covers
	  // most of our test cases (26 over this size, 26378 under it).
	  if (str.length < 50000) {
	    return JSON.parse(str);
	  }
	  return slowJsonParse(str);
	}

	function safeJsonStringify(json) {
	  try {
	    return JSON.stringify(json);
	  } catch (e) {
	    /* istanbul ignore next */
	    return vuvuzela.stringify(json);
	  }
	}

	exports.safeJsonParse = safeJsonParse;
	exports.safeJsonStringify = safeJsonStringify;

/***/ },
/* 26 */
/***/ function(module, exports) {

	'use strict';

	/**
	 * Stringify/parse functions that don't operate
	 * recursively, so they avoid call stack exceeded
	 * errors.
	 */
	exports.stringify = function stringify(input) {
	  var queue = [];
	  queue.push({obj: input});

	  var res = '';
	  var next, obj, prefix, val, i, arrayPrefix, keys, k, key, value, objPrefix;
	  while ((next = queue.pop())) {
	    obj = next.obj;
	    prefix = next.prefix || '';
	    val = next.val || '';
	    res += prefix;
	    if (val) {
	      res += val;
	    } else if (typeof obj !== 'object') {
	      res += typeof obj === 'undefined' ? null : JSON.stringify(obj);
	    } else if (obj === null) {
	      res += 'null';
	    } else if (Array.isArray(obj)) {
	      queue.push({val: ']'});
	      for (i = obj.length - 1; i >= 0; i--) {
	        arrayPrefix = i === 0 ? '' : ',';
	        queue.push({obj: obj[i], prefix: arrayPrefix});
	      }
	      queue.push({val: '['});
	    } else { // object
	      keys = [];
	      for (k in obj) {
	        if (obj.hasOwnProperty(k)) {
	          keys.push(k);
	        }
	      }
	      queue.push({val: '}'});
	      for (i = keys.length - 1; i >= 0; i--) {
	        key = keys[i];
	        value = obj[key];
	        objPrefix = (i > 0 ? ',' : '');
	        objPrefix += JSON.stringify(key) + ':';
	        queue.push({obj: value, prefix: objPrefix});
	      }
	      queue.push({val: '{'});
	    }
	  }
	  return res;
	};

	// Convenience function for the parse function.
	// This pop function is basically copied from
	// pouchCollate.parseIndexableString
	function pop(obj, stack, metaStack) {
	  var lastMetaElement = metaStack[metaStack.length - 1];
	  if (obj === lastMetaElement.element) {
	    // popping a meta-element, e.g. an object whose value is another object
	    metaStack.pop();
	    lastMetaElement = metaStack[metaStack.length - 1];
	  }
	  var element = lastMetaElement.element;
	  var lastElementIndex = lastMetaElement.index;
	  if (Array.isArray(element)) {
	    element.push(obj);
	  } else if (lastElementIndex === stack.length - 2) { // obj with key+value
	    var key = stack.pop();
	    element[key] = obj;
	  } else {
	    stack.push(obj); // obj with key only
	  }
	}

	exports.parse = function (str) {
	  var stack = [];
	  var metaStack = []; // stack for arrays and objects
	  var i = 0;
	  var collationIndex,parsedNum,numChar;
	  var parsedString,lastCh,numConsecutiveSlashes,ch;
	  var arrayElement, objElement;
	  while (true) {
	    collationIndex = str[i++];
	    if (collationIndex === '}' ||
	        collationIndex === ']' ||
	        typeof collationIndex === 'undefined') {
	      if (stack.length === 1) {
	        return stack.pop();
	      } else {
	        pop(stack.pop(), stack, metaStack);
	        continue;
	      }
	    }
	    switch (collationIndex) {
	      case ' ':
	      case '\t':
	      case '\n':
	      case ':':
	      case ',':
	        break;
	      case 'n':
	        i += 3; // 'ull'
	        pop(null, stack, metaStack);
	        break;
	      case 't':
	        i += 3; // 'rue'
	        pop(true, stack, metaStack);
	        break;
	      case 'f':
	        i += 4; // 'alse'
	        pop(false, stack, metaStack);
	        break;
	      case '0':
	      case '1':
	      case '2':
	      case '3':
	      case '4':
	      case '5':
	      case '6':
	      case '7':
	      case '8':
	      case '9':
	      case '-':
	        parsedNum = '';
	        i--;
	        while (true) {
	          numChar = str[i++];
	          if (/[\d\.\-e\+]/.test(numChar)) {
	            parsedNum += numChar;
	          } else {
	            i--;
	            break;
	          }
	        }
	        pop(parseFloat(parsedNum), stack, metaStack);
	        break;
	      case '"':
	        parsedString = '';
	        lastCh = void 0;
	        numConsecutiveSlashes = 0;
	        while (true) {
	          ch = str[i++];
	          if (ch !== '"' || (lastCh === '\\' &&
	              numConsecutiveSlashes % 2 === 1)) {
	            parsedString += ch;
	            lastCh = ch;
	            if (lastCh === '\\') {
	              numConsecutiveSlashes++;
	            } else {
	              numConsecutiveSlashes = 0;
	            }
	          } else {
	            break;
	          }
	        }
	        pop(JSON.parse('"' + parsedString + '"'), stack, metaStack);
	        break;
	      case '[':
	        arrayElement = { element: [], index: stack.length };
	        stack.push(arrayElement.element);
	        metaStack.push(arrayElement);
	        break;
	      case '{':
	        objElement = { element: {}, index: stack.length };
	        stack.push(objElement.element);
	        metaStack.push(objElement);
	        break;
	      default:
	        throw new Error(
	          'unexpectedly reached end of input: ' + collationIndex);
	    }
	  }
	};


/***/ },
/* 27 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

	var WebSqlPouchCore = _interopDefault(__webpack_require__(28));
	var jsExtend = __webpack_require__(5);
	var pouchdbUtils = __webpack_require__(16);

	function canOpenTestDB() {
	  try {
	    openDatabase('_pouch_validate_websql', 1, '', 1);
	    return true;
	  } catch (err) {
	    return false;
	  }
	}

	// WKWebView had a bug where WebSQL would throw a DOM Exception 18
	// (see https://bugs.webkit.org/show_bug.cgi?id=137760 and
	// https://github.com/pouchdb/pouchdb/issues/5079)
	// This has been fixed in latest WebKit, so we try to detect it here.
	function isValidWebSQL() {
	  // WKWebView UA:
	  //   Mozilla/5.0 (iPhone; CPU iPhone OS 9_2 like Mac OS X)
	  //   AppleWebKit/601.1.46 (KHTML, like Gecko) Mobile/13C75
	  // Chrome for iOS UA:
	  //   Mozilla/5.0 (iPhone; U; CPU iPhone OS 5_1_1 like Mac OS X; en)
	  //   AppleWebKit/534.46.0 (KHTML, like Gecko) CriOS/19.0.1084.60
	  //   Mobile/9B206 Safari/7534.48.3
	  // Firefox for iOS UA:
	  //   Mozilla/5.0 (iPhone; CPU iPhone OS 8_3 like Mac OS X) AppleWebKit/600.1.4
	  //   (KHTML, like Gecko) FxiOS/1.0 Mobile/12F69 Safari/600.1.4

	  // indexedDB is null on some UIWebViews and undefined in others
	  // see: https://bugs.webkit.org/show_bug.cgi?id=137034
	  if (typeof indexedDB === 'undefined' || indexedDB === null ||
	      !/iP(hone|od|ad)/.test(navigator.userAgent)) {
	    // definitely not WKWebView, avoid creating an unnecessary database
	    return true;
	  }
	  // Cache the result in LocalStorage. Reason we do this is because if we
	  // call openDatabase() too many times, Safari craps out in SauceLabs and
	  // starts throwing DOM Exception 14s.
	  var hasLS = pouchdbUtils.hasLocalStorage();
	  // Include user agent in the hash, so that if Safari is upgraded, we don't
	  // continually think it's broken.
	  var localStorageKey = '_pouch__websqldb_valid_' + navigator.userAgent;
	  if (hasLS && localStorage[localStorageKey]) {
	    return localStorage[localStorageKey] === '1';
	  }
	  var openedTestDB = canOpenTestDB();
	  if (hasLS) {
	    localStorage[localStorageKey] = openedTestDB ? '1' : '0';
	  }
	  return openedTestDB;
	}

	function valid() {
	  // SQLitePlugin leaks this global object, which we can use
	  // to detect if it's installed or not. The benefit is that it's
	  // declared immediately, before the 'deviceready' event has fired.
	  if (typeof SQLitePlugin !== 'undefined') {
	    return true;
	  }
	  if (typeof openDatabase === 'undefined') {
	    return false;
	  }
	  return isValidWebSQL();
	}

	function createOpenDBFunction(opts) {
	  return function (name, version, description, size) {
	    if (typeof sqlitePlugin !== 'undefined') {
	      // The SQLite Plugin started deviating pretty heavily from the
	      // standard openDatabase() function, as they started adding more features.
	      // It's better to just use their "new" format and pass in a big ol'
	      // options object. Also there are many options here that may come from
	      // the PouchDB constructor, so we have to grab those.
	      var sqlitePluginOpts = jsExtend.extend({}, opts, {
	        name: name,
	        version: version,
	        description: description,
	        size: size
	      });
	      return sqlitePlugin.openDatabase(sqlitePluginOpts);
	    }

	    // Traditional WebSQL API
	    return openDatabase(name, version, description, size);
	  };
	}

	function WebSQLPouch(opts, callback) {
	  var websql = createOpenDBFunction(opts);
	  var _opts = jsExtend.extend({
	    websql: websql
	  }, opts);

	  WebSqlPouchCore.call(this, _opts, callback);
	}

	WebSQLPouch.valid = valid;

	WebSQLPouch.use_prefix = true;

	function index (PouchDB) {
	  PouchDB.adapter('websql', WebSQLPouch, true);
	}

	module.exports = index;

/***/ },
/* 28 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var jsExtend = __webpack_require__(5);
	var pouchdbUtils = __webpack_require__(16);
	var pouchdbAdapterUtils = __webpack_require__(21);
	var pouchdbMerge = __webpack_require__(18);
	var pouchdbJson = __webpack_require__(25);
	var pouchdbBinaryUtils = __webpack_require__(22);
	var pouchdbCollections = __webpack_require__(13);
	var pouchdbErrors = __webpack_require__(17);

	//
	// Parsing hex strings. Yeah.
	//
	// So basically we need this because of a bug in WebSQL:
	// https://code.google.com/p/chromium/issues/detail?id=422690
	// https://bugs.webkit.org/show_bug.cgi?id=137637
	//
	// UTF-8 and UTF-16 are provided as separate functions
	// for meager performance improvements
	//

	function decodeUtf8(str) {
	  return decodeURIComponent(escape(str));
	}

	function hexToInt(charCode) {
	  // '0'-'9' is 48-57
	  // 'A'-'F' is 65-70
	  // SQLite will only give us uppercase hex
	  return charCode < 65 ? (charCode - 48) : (charCode - 55);
	}


	// Example:
	// pragma encoding=utf8;
	// select hex('A');
	// returns '41'
	function parseHexUtf8(str, start, end) {
	  var result = '';
	  while (start < end) {
	    result += String.fromCharCode(
	      (hexToInt(str.charCodeAt(start++)) << 4) |
	        hexToInt(str.charCodeAt(start++)));
	  }
	  return result;
	}

	// Example:
	// pragma encoding=utf16;
	// select hex('A');
	// returns '4100'
	// notice that the 00 comes after the 41 (i.e. it's swizzled)
	function parseHexUtf16(str, start, end) {
	  var result = '';
	  while (start < end) {
	    // UTF-16, so swizzle the bytes
	    result += String.fromCharCode(
	      (hexToInt(str.charCodeAt(start + 2)) << 12) |
	        (hexToInt(str.charCodeAt(start + 3)) << 8) |
	        (hexToInt(str.charCodeAt(start)) << 4) |
	        hexToInt(str.charCodeAt(start + 1)));
	    start += 4;
	  }
	  return result;
	}

	function parseHexString(str, encoding) {
	  if (encoding === 'UTF-8') {
	    return decodeUtf8(parseHexUtf8(str, 0, str.length));
	  } else {
	    return parseHexUtf16(str, 0, str.length);
	  }
	}

	function quote(str) {
	  return "'" + str + "'";
	}

	var ADAPTER_VERSION = 7; // used to manage migrations

	// The object stores created for each database
	// DOC_STORE stores the document meta data, its revision history and state
	var DOC_STORE = quote('document-store');
	// BY_SEQ_STORE stores a particular version of a document, keyed by its
	// sequence id
	var BY_SEQ_STORE = quote('by-sequence');
	// Where we store attachments
	var ATTACH_STORE = quote('attach-store');
	var LOCAL_STORE = quote('local-store');
	var META_STORE = quote('metadata-store');
	// where we store many-to-many relations between attachment
	// digests and seqs
	var ATTACH_AND_SEQ_STORE = quote('attach-seq-store');

	// escapeBlob and unescapeBlob are workarounds for a websql bug:
	// https://code.google.com/p/chromium/issues/detail?id=422690
	// https://bugs.webkit.org/show_bug.cgi?id=137637
	// The goal is to never actually insert the \u0000 character
	// in the database.
	function escapeBlob(str) {
	  return str
	    .replace(/\u0002/g, '\u0002\u0002')
	    .replace(/\u0001/g, '\u0001\u0002')
	    .replace(/\u0000/g, '\u0001\u0001');
	}

	function unescapeBlob(str) {
	  return str
	    .replace(/\u0001\u0001/g, '\u0000')
	    .replace(/\u0001\u0002/g, '\u0001')
	    .replace(/\u0002\u0002/g, '\u0002');
	}

	function stringifyDoc(doc) {
	  // don't bother storing the id/rev. it uses lots of space,
	  // in persistent map/reduce especially
	  delete doc._id;
	  delete doc._rev;
	  return JSON.stringify(doc);
	}

	function unstringifyDoc(doc, id, rev) {
	  doc = JSON.parse(doc);
	  doc._id = id;
	  doc._rev = rev;
	  return doc;
	}

	// question mark groups IN queries, e.g. 3 -> '(?,?,?)'
	function qMarks(num) {
	  var s = '(';
	  while (num--) {
	    s += '?';
	    if (num) {
	      s += ',';
	    }
	  }
	  return s + ')';
	}

	function select(selector, table, joiner, where, orderBy) {
	  return 'SELECT ' + selector + ' FROM ' +
	    (typeof table === 'string' ? table : table.join(' JOIN ')) +
	    (joiner ? (' ON ' + joiner) : '') +
	    (where ? (' WHERE ' +
	    (typeof where === 'string' ? where : where.join(' AND '))) : '') +
	    (orderBy ? (' ORDER BY ' + orderBy) : '');
	}

	function compactRevs(revs, docId, tx) {

	  if (!revs.length) {
	    return;
	  }

	  var numDone = 0;
	  var seqs = [];

	  function checkDone() {
	    if (++numDone === revs.length) { // done
	      deleteOrphans();
	    }
	  }

	  function deleteOrphans() {
	    // find orphaned attachment digests

	    if (!seqs.length) {
	      return;
	    }

	    var sql = 'SELECT DISTINCT digest AS digest FROM ' +
	      ATTACH_AND_SEQ_STORE + ' WHERE seq IN ' + qMarks(seqs.length);

	    tx.executeSql(sql, seqs, function (tx, res) {

	      var digestsToCheck = [];
	      for (var i = 0; i < res.rows.length; i++) {
	        digestsToCheck.push(res.rows.item(i).digest);
	      }
	      if (!digestsToCheck.length) {
	        return;
	      }

	      var sql = 'DELETE FROM ' + ATTACH_AND_SEQ_STORE +
	        ' WHERE seq IN (' +
	        seqs.map(function () { return '?'; }).join(',') +
	        ')';
	      tx.executeSql(sql, seqs, function (tx) {

	        var sql = 'SELECT digest FROM ' + ATTACH_AND_SEQ_STORE +
	          ' WHERE digest IN (' +
	          digestsToCheck.map(function () { return '?'; }).join(',') +
	          ')';
	        tx.executeSql(sql, digestsToCheck, function (tx, res) {
	          var nonOrphanedDigests = new pouchdbCollections.Set();
	          for (var i = 0; i < res.rows.length; i++) {
	            nonOrphanedDigests.add(res.rows.item(i).digest);
	          }
	          digestsToCheck.forEach(function (digest) {
	            if (nonOrphanedDigests.has(digest)) {
	              return;
	            }
	            tx.executeSql(
	              'DELETE FROM ' + ATTACH_AND_SEQ_STORE + ' WHERE digest=?',
	              [digest]);
	            tx.executeSql(
	              'DELETE FROM ' + ATTACH_STORE + ' WHERE digest=?', [digest]);
	          });
	        });
	      });
	    });
	  }

	  // update by-seq and attach stores in parallel
	  revs.forEach(function (rev) {
	    var sql = 'SELECT seq FROM ' + BY_SEQ_STORE +
	      ' WHERE doc_id=? AND rev=?';

	    tx.executeSql(sql, [docId, rev], function (tx, res) {
	      if (!res.rows.length) { // already deleted
	        return checkDone();
	      }
	      var seq = res.rows.item(0).seq;
	      seqs.push(seq);

	      tx.executeSql(
	        'DELETE FROM ' + BY_SEQ_STORE + ' WHERE seq=?', [seq], checkDone);
	    });
	  });
	}

	function websqlError(callback) {
	  return function (event) {
	    pouchdbUtils.guardedConsole('error', 'WebSQL threw an error', event);
	    // event may actually be a SQLError object, so report is as such
	    var errorNameMatch = event && event.constructor.toString()
	        .match(/function ([^\(]+)/);
	    var errorName = (errorNameMatch && errorNameMatch[1]) || event.type;
	    var errorReason = event.target || event.message;
	    callback(pouchdbErrors.createError(pouchdbErrors.WSQ_ERROR, errorReason, errorName));
	  };
	}

	function getSize(opts) {
	  if ('size' in opts) {
	    // triggers immediate popup in iOS, fixes #2347
	    // e.g. 5000001 asks for 5 MB, 10000001 asks for 10 MB,
	    return opts.size * 1000000;
	  }
	  // In iOS, doesn't matter as long as it's <= 5000000.
	  // Except that if you request too much, our tests fail
	  // because of the native "do you accept?" popup.
	  // In Android <=4.3, this value is actually used as an
	  // honest-to-god ceiling for data, so we need to
	  // set it to a decently high number.
	  var isAndroid = typeof navigator !== 'undefined' &&
	    /Android/.test(navigator.userAgent);
	  return isAndroid ? 5000000 : 1; // in PhantomJS, if you use 0 it will crash
	}

	function websqlBulkDocs(dbOpts, req, opts, api, db, websqlChanges, callback) {
	  var newEdits = opts.new_edits;
	  var userDocs = req.docs;

	  // Parse the docs, give them a sequence number for the result
	  var docInfos = userDocs.map(function (doc) {
	    if (doc._id && pouchdbAdapterUtils.isLocalId(doc._id)) {
	      return doc;
	    }
	    var newDoc = pouchdbAdapterUtils.parseDoc(doc, newEdits);
	    return newDoc;
	  });

	  var docInfoErrors = docInfos.filter(function (docInfo) {
	    return docInfo.error;
	  });
	  if (docInfoErrors.length) {
	    return callback(docInfoErrors[0]);
	  }

	  var tx;
	  var results = new Array(docInfos.length);
	  var fetchedDocs = new pouchdbCollections.Map();

	  var preconditionErrored;
	  function complete() {
	    if (preconditionErrored) {
	      return callback(preconditionErrored);
	    }
	    websqlChanges.notify(api._name);
	    api._docCount = -1; // invalidate
	    callback(null, results);
	  }

	  function verifyAttachment(digest, callback) {
	    var sql = 'SELECT count(*) as cnt FROM ' + ATTACH_STORE +
	      ' WHERE digest=?';
	    tx.executeSql(sql, [digest], function (tx, result) {
	      if (result.rows.item(0).cnt === 0) {
	        var err = pouchdbErrors.createError(pouchdbErrors.MISSING_STUB,
	          'unknown stub attachment with digest ' +
	          digest);
	        callback(err);
	      } else {
	        callback();
	      }
	    });
	  }

	  function verifyAttachments(finish) {
	    var digests = [];
	    docInfos.forEach(function (docInfo) {
	      if (docInfo.data && docInfo.data._attachments) {
	        Object.keys(docInfo.data._attachments).forEach(function (filename) {
	          var att = docInfo.data._attachments[filename];
	          if (att.stub) {
	            digests.push(att.digest);
	          }
	        });
	      }
	    });
	    if (!digests.length) {
	      return finish();
	    }
	    var numDone = 0;
	    var err;

	    function checkDone() {
	      if (++numDone === digests.length) {
	        finish(err);
	      }
	    }
	    digests.forEach(function (digest) {
	      verifyAttachment(digest, function (attErr) {
	        if (attErr && !err) {
	          err = attErr;
	        }
	        checkDone();
	      });
	    });
	  }

	  function writeDoc(docInfo, winningRev, winningRevIsDeleted, newRevIsDeleted,
	                    isUpdate, delta, resultsIdx, callback) {

	    function finish() {
	      var data = docInfo.data;
	      var deletedInt = newRevIsDeleted ? 1 : 0;

	      var id = data._id;
	      var rev = data._rev;
	      var json = stringifyDoc(data);
	      var sql = 'INSERT INTO ' + BY_SEQ_STORE +
	        ' (doc_id, rev, json, deleted) VALUES (?, ?, ?, ?);';
	      var sqlArgs = [id, rev, json, deletedInt];

	      // map seqs to attachment digests, which
	      // we will need later during compaction
	      function insertAttachmentMappings(seq, callback) {
	        var attsAdded = 0;
	        var attsToAdd = Object.keys(data._attachments || {});

	        if (!attsToAdd.length) {
	          return callback();
	        }
	        function checkDone() {
	          if (++attsAdded === attsToAdd.length) {
	            callback();
	          }
	          return false; // ack handling a constraint error
	        }
	        function add(att) {
	          var sql = 'INSERT INTO ' + ATTACH_AND_SEQ_STORE +
	            ' (digest, seq) VALUES (?,?)';
	          var sqlArgs = [data._attachments[att].digest, seq];
	          tx.executeSql(sql, sqlArgs, checkDone, checkDone);
	          // second callback is for a constaint error, which we ignore
	          // because this docid/rev has already been associated with
	          // the digest (e.g. when new_edits == false)
	        }
	        for (var i = 0; i < attsToAdd.length; i++) {
	          add(attsToAdd[i]); // do in parallel
	        }
	      }

	      tx.executeSql(sql, sqlArgs, function (tx, result) {
	        var seq = result.insertId;
	        insertAttachmentMappings(seq, function () {
	          dataWritten(tx, seq);
	        });
	      }, function () {
	        // constraint error, recover by updating instead (see #1638)
	        var fetchSql = select('seq', BY_SEQ_STORE, null,
	          'doc_id=? AND rev=?');
	        tx.executeSql(fetchSql, [id, rev], function (tx, res) {
	          var seq = res.rows.item(0).seq;
	          var sql = 'UPDATE ' + BY_SEQ_STORE +
	            ' SET json=?, deleted=? WHERE doc_id=? AND rev=?;';
	          var sqlArgs = [json, deletedInt, id, rev];
	          tx.executeSql(sql, sqlArgs, function (tx) {
	            insertAttachmentMappings(seq, function () {
	              dataWritten(tx, seq);
	            });
	          });
	        });
	        return false; // ack that we've handled the error
	      });
	    }

	    function collectResults(attachmentErr) {
	      if (!err) {
	        if (attachmentErr) {
	          err = attachmentErr;
	          callback(err);
	        } else if (recv === attachments.length) {
	          finish();
	        }
	      }
	    }

	    var err = null;
	    var recv = 0;

	    docInfo.data._id = docInfo.metadata.id;
	    docInfo.data._rev = docInfo.metadata.rev;
	    var attachments = Object.keys(docInfo.data._attachments || {});


	    if (newRevIsDeleted) {
	      docInfo.data._deleted = true;
	    }

	    function attachmentSaved(err) {
	      recv++;
	      collectResults(err);
	    }

	    attachments.forEach(function (key) {
	      var att = docInfo.data._attachments[key];
	      if (!att.stub) {
	        var data = att.data;
	        delete att.data;
	        att.revpos = parseInt(winningRev, 10);
	        var digest = att.digest;
	        saveAttachment(digest, data, attachmentSaved);
	      } else {
	        recv++;
	        collectResults();
	      }
	    });

	    if (!attachments.length) {
	      finish();
	    }

	    function dataWritten(tx, seq) {
	      var id = docInfo.metadata.id;

	      var revsToCompact = docInfo.stemmedRevs || [];
	      if (isUpdate && api.auto_compaction) {
	        revsToCompact = pouchdbMerge.compactTree(docInfo.metadata).concat(revsToCompact);
	      }
	      if (revsToCompact.length) {
	        compactRevs(revsToCompact, id, tx);
	      }

	      docInfo.metadata.seq = seq;
	      delete docInfo.metadata.rev;

	      var sql = isUpdate ?
	      'UPDATE ' + DOC_STORE +
	      ' SET json=?, max_seq=?, winningseq=' +
	      '(SELECT seq FROM ' + BY_SEQ_STORE +
	      ' WHERE doc_id=' + DOC_STORE + '.id AND rev=?) WHERE id=?'
	        : 'INSERT INTO ' + DOC_STORE +
	      ' (id, winningseq, max_seq, json) VALUES (?,?,?,?);';
	      var metadataStr = pouchdbJson.safeJsonStringify(docInfo.metadata);
	      var params = isUpdate ?
	        [metadataStr, seq, winningRev, id] :
	        [id, seq, seq, metadataStr];
	      tx.executeSql(sql, params, function () {
	        results[resultsIdx] = {
	          ok: true,
	          id: docInfo.metadata.id,
	          rev: winningRev
	        };
	        fetchedDocs.set(id, docInfo.metadata);
	        callback();
	      });
	    }
	  }

	  function websqlProcessDocs() {
	    pouchdbAdapterUtils.processDocs(dbOpts.revs_limit, docInfos, api, fetchedDocs, tx,
	                results, writeDoc, opts);
	  }

	  function fetchExistingDocs(callback) {
	    if (!docInfos.length) {
	      return callback();
	    }

	    var numFetched = 0;

	    function checkDone() {
	      if (++numFetched === docInfos.length) {
	        callback();
	      }
	    }

	    docInfos.forEach(function (docInfo) {
	      if (docInfo._id && pouchdbAdapterUtils.isLocalId(docInfo._id)) {
	        return checkDone(); // skip local docs
	      }
	      var id = docInfo.metadata.id;
	      tx.executeSql('SELECT json FROM ' + DOC_STORE +
	      ' WHERE id = ?', [id], function (tx, result) {
	        if (result.rows.length) {
	          var metadata = pouchdbJson.safeJsonParse(result.rows.item(0).json);
	          fetchedDocs.set(id, metadata);
	        }
	        checkDone();
	      });
	    });
	  }

	  function saveAttachment(digest, data, callback) {
	    var sql = 'SELECT digest FROM ' + ATTACH_STORE + ' WHERE digest=?';
	    tx.executeSql(sql, [digest], function (tx, result) {
	      if (result.rows.length) { // attachment already exists
	        return callback();
	      }
	      // we could just insert before selecting and catch the error,
	      // but my hunch is that it's cheaper not to serialize the blob
	      // from JS to C if we don't have to (TODO: confirm this)
	      sql = 'INSERT INTO ' + ATTACH_STORE +
	      ' (digest, body, escaped) VALUES (?,?,1)';
	      tx.executeSql(sql, [digest, escapeBlob(data)], function () {
	        callback();
	      }, function () {
	        // ignore constaint errors, means it already exists
	        callback();
	        return false; // ack we handled the error
	      });
	    });
	  }

	  pouchdbAdapterUtils.preprocessAttachments(docInfos, 'binary', function (err) {
	    if (err) {
	      return callback(err);
	    }
	    db.transaction(function (txn) {
	      tx = txn;
	      verifyAttachments(function (err) {
	        if (err) {
	          preconditionErrored = err;
	        } else {
	          fetchExistingDocs(websqlProcessDocs);
	        }
	      });
	    }, websqlError(callback), complete);
	  });
	}

	var cachedDatabases = new pouchdbCollections.Map();

	// openDatabase passed in through opts (e.g. for node-websql)
	function openDatabaseWithOpts(opts) {
	  return opts.websql(opts.name, opts.version, opts.description, opts.size);
	}

	function openDBSafely(opts) {
	  try {
	    return {
	      db: openDatabaseWithOpts(opts)
	    };
	  } catch (err) {
	    return {
	      error: err
	    };
	  }
	}

	function openDB(opts) {
	  var cachedResult = cachedDatabases.get(opts.name);
	  if (!cachedResult) {
	    cachedResult = openDBSafely(opts);
	    cachedDatabases.set(opts.name, cachedResult);
	    if (cachedResult.db) {
	      cachedResult.db._sqlitePlugin = typeof sqlitePlugin !== 'undefined';
	    }
	  }
	  return cachedResult;
	}

	var websqlChanges = new pouchdbUtils.changesHandler();

	function fetchAttachmentsIfNecessary(doc, opts, api, txn, cb) {
	  var attachments = Object.keys(doc._attachments || {});
	  if (!attachments.length) {
	    return cb && cb();
	  }
	  var numDone = 0;

	  function checkDone() {
	    if (++numDone === attachments.length && cb) {
	      cb();
	    }
	  }

	  function fetchAttachment(doc, att) {
	    var attObj = doc._attachments[att];
	    var attOpts = {binary: opts.binary, ctx: txn};
	    api._getAttachment(doc._id, att, attObj, attOpts, function (_, data) {
	      doc._attachments[att] = jsExtend.extend(
	        pouchdbUtils.pick(attObj, ['digest', 'content_type']),
	        { data: data }
	      );
	      checkDone();
	    });
	  }

	  attachments.forEach(function (att) {
	    if (opts.attachments && opts.include_docs) {
	      fetchAttachment(doc, att);
	    } else {
	      doc._attachments[att].stub = true;
	      checkDone();
	    }
	  });
	}

	var POUCH_VERSION = 1;

	// these indexes cover the ground for most allDocs queries
	var BY_SEQ_STORE_DELETED_INDEX_SQL =
	  'CREATE INDEX IF NOT EXISTS \'by-seq-deleted-idx\' ON ' +
	  BY_SEQ_STORE + ' (seq, deleted)';
	var BY_SEQ_STORE_DOC_ID_REV_INDEX_SQL =
	  'CREATE UNIQUE INDEX IF NOT EXISTS \'by-seq-doc-id-rev\' ON ' +
	    BY_SEQ_STORE + ' (doc_id, rev)';
	var DOC_STORE_WINNINGSEQ_INDEX_SQL =
	  'CREATE INDEX IF NOT EXISTS \'doc-winningseq-idx\' ON ' +
	  DOC_STORE + ' (winningseq)';
	var ATTACH_AND_SEQ_STORE_SEQ_INDEX_SQL =
	  'CREATE INDEX IF NOT EXISTS \'attach-seq-seq-idx\' ON ' +
	    ATTACH_AND_SEQ_STORE + ' (seq)';
	var ATTACH_AND_SEQ_STORE_ATTACH_INDEX_SQL =
	  'CREATE UNIQUE INDEX IF NOT EXISTS \'attach-seq-digest-idx\' ON ' +
	    ATTACH_AND_SEQ_STORE + ' (digest, seq)';

	var DOC_STORE_AND_BY_SEQ_JOINER = BY_SEQ_STORE +
	  '.seq = ' + DOC_STORE + '.winningseq';

	var SELECT_DOCS = BY_SEQ_STORE + '.seq AS seq, ' +
	  BY_SEQ_STORE + '.deleted AS deleted, ' +
	  BY_SEQ_STORE + '.json AS data, ' +
	  BY_SEQ_STORE + '.rev AS rev, ' +
	  DOC_STORE + '.json AS metadata';

	function WebSqlPouch(opts, callback) {
	  var api = this;
	  var instanceId = null;
	  var size = getSize(opts);
	  var idRequests = [];
	  var encoding;

	  api._docCount = -1; // cache sqlite count(*) for performance
	  api._name = opts.name;

	  // extend the options here, because sqlite plugin has a ton of options
	  // and they are constantly changing, so it's more prudent to allow anything
	  var websqlOpts = jsExtend.extend({}, opts, {
	    version: POUCH_VERSION,
	    description: opts.name,
	    size: size
	  });
	  var openDBResult = openDB(websqlOpts);
	  if (openDBResult.error) {
	    return websqlError(callback)(openDBResult.error);
	  }
	  var db = openDBResult.db;
	  if (typeof db.readTransaction !== 'function') {
	    // doesn't exist in sqlite plugin
	    db.readTransaction = db.transaction;
	  }

	  function dbCreated() {
	    // note the db name in case the browser upgrades to idb
	    if (pouchdbUtils.hasLocalStorage()) {
	      window.localStorage['_pouch__websqldb_' + api._name] = true;
	    }
	    callback(null, api);
	  }

	  // In this migration, we added the 'deleted' and 'local' columns to the
	  // by-seq and doc store tables.
	  // To preserve existing user data, we re-process all the existing JSON
	  // and add these values.
	  // Called migration2 because it corresponds to adapter version (db_version) #2
	  function runMigration2(tx, callback) {
	    // index used for the join in the allDocs query
	    tx.executeSql(DOC_STORE_WINNINGSEQ_INDEX_SQL);

	    tx.executeSql('ALTER TABLE ' + BY_SEQ_STORE +
	      ' ADD COLUMN deleted TINYINT(1) DEFAULT 0', [], function () {
	      tx.executeSql(BY_SEQ_STORE_DELETED_INDEX_SQL);
	      tx.executeSql('ALTER TABLE ' + DOC_STORE +
	        ' ADD COLUMN local TINYINT(1) DEFAULT 0', [], function () {
	        tx.executeSql('CREATE INDEX IF NOT EXISTS \'doc-store-local-idx\' ON ' +
	          DOC_STORE + ' (local, id)');

	        var sql = 'SELECT ' + DOC_STORE + '.winningseq AS seq, ' + DOC_STORE +
	          '.json AS metadata FROM ' + BY_SEQ_STORE + ' JOIN ' + DOC_STORE +
	          ' ON ' + BY_SEQ_STORE + '.seq = ' + DOC_STORE + '.winningseq';

	        tx.executeSql(sql, [], function (tx, result) {

	          var deleted = [];
	          var local = [];

	          for (var i = 0; i < result.rows.length; i++) {
	            var item = result.rows.item(i);
	            var seq = item.seq;
	            var metadata = JSON.parse(item.metadata);
	            if (pouchdbAdapterUtils.isDeleted(metadata)) {
	              deleted.push(seq);
	            }
	            if (pouchdbAdapterUtils.isLocalId(metadata.id)) {
	              local.push(metadata.id);
	            }
	          }
	          tx.executeSql('UPDATE ' + DOC_STORE + 'SET local = 1 WHERE id IN ' +
	            qMarks(local.length), local, function () {
	            tx.executeSql('UPDATE ' + BY_SEQ_STORE +
	              ' SET deleted = 1 WHERE seq IN ' +
	              qMarks(deleted.length), deleted, callback);
	          });
	        });
	      });
	    });
	  }

	  // in this migration, we make all the local docs unversioned
	  function runMigration3(tx, callback) {
	    var local = 'CREATE TABLE IF NOT EXISTS ' + LOCAL_STORE +
	      ' (id UNIQUE, rev, json)';
	    tx.executeSql(local, [], function () {
	      var sql = 'SELECT ' + DOC_STORE + '.id AS id, ' +
	        BY_SEQ_STORE + '.json AS data ' +
	        'FROM ' + BY_SEQ_STORE + ' JOIN ' +
	        DOC_STORE + ' ON ' + BY_SEQ_STORE + '.seq = ' +
	        DOC_STORE + '.winningseq WHERE local = 1';
	      tx.executeSql(sql, [], function (tx, res) {
	        var rows = [];
	        for (var i = 0; i < res.rows.length; i++) {
	          rows.push(res.rows.item(i));
	        }
	        function doNext() {
	          if (!rows.length) {
	            return callback(tx);
	          }
	          var row = rows.shift();
	          var rev = JSON.parse(row.data)._rev;
	          tx.executeSql('INSERT INTO ' + LOCAL_STORE +
	              ' (id, rev, json) VALUES (?,?,?)',
	              [row.id, rev, row.data], function (tx) {
	            tx.executeSql('DELETE FROM ' + DOC_STORE + ' WHERE id=?',
	                [row.id], function (tx) {
	              tx.executeSql('DELETE FROM ' + BY_SEQ_STORE + ' WHERE seq=?',
	                  [row.seq], function () {
	                doNext();
	              });
	            });
	          });
	        }
	        doNext();
	      });
	    });
	  }

	  // in this migration, we remove doc_id_rev and just use rev
	  function runMigration4(tx, callback) {

	    function updateRows(rows) {
	      function doNext() {
	        if (!rows.length) {
	          return callback(tx);
	        }
	        var row = rows.shift();
	        var doc_id_rev = parseHexString(row.hex, encoding);
	        var idx = doc_id_rev.lastIndexOf('::');
	        var doc_id = doc_id_rev.substring(0, idx);
	        var rev = doc_id_rev.substring(idx + 2);
	        var sql = 'UPDATE ' + BY_SEQ_STORE +
	          ' SET doc_id=?, rev=? WHERE doc_id_rev=?';
	        tx.executeSql(sql, [doc_id, rev, doc_id_rev], function () {
	          doNext();
	        });
	      }
	      doNext();
	    }

	    var sql = 'ALTER TABLE ' + BY_SEQ_STORE + ' ADD COLUMN doc_id';
	    tx.executeSql(sql, [], function (tx) {
	      var sql = 'ALTER TABLE ' + BY_SEQ_STORE + ' ADD COLUMN rev';
	      tx.executeSql(sql, [], function (tx) {
	        tx.executeSql(BY_SEQ_STORE_DOC_ID_REV_INDEX_SQL, [], function (tx) {
	          var sql = 'SELECT hex(doc_id_rev) as hex FROM ' + BY_SEQ_STORE;
	          tx.executeSql(sql, [], function (tx, res) {
	            var rows = [];
	            for (var i = 0; i < res.rows.length; i++) {
	              rows.push(res.rows.item(i));
	            }
	            updateRows(rows);
	          });
	        });
	      });
	    });
	  }

	  // in this migration, we add the attach_and_seq table
	  // for issue #2818
	  function runMigration5(tx, callback) {

	    function migrateAttsAndSeqs(tx) {
	      // need to actually populate the table. this is the expensive part,
	      // so as an optimization, check first that this database even
	      // contains attachments
	      var sql = 'SELECT COUNT(*) AS cnt FROM ' + ATTACH_STORE;
	      tx.executeSql(sql, [], function (tx, res) {
	        var count = res.rows.item(0).cnt;
	        if (!count) {
	          return callback(tx);
	        }

	        var offset = 0;
	        var pageSize = 10;
	        function nextPage() {
	          var sql = select(
	            SELECT_DOCS + ', ' + DOC_STORE + '.id AS id',
	            [DOC_STORE, BY_SEQ_STORE],
	            DOC_STORE_AND_BY_SEQ_JOINER,
	            null,
	            DOC_STORE + '.id '
	          );
	          sql += ' LIMIT ' + pageSize + ' OFFSET ' + offset;
	          offset += pageSize;
	          tx.executeSql(sql, [], function (tx, res) {
	            if (!res.rows.length) {
	              return callback(tx);
	            }
	            var digestSeqs = {};
	            function addDigestSeq(digest, seq) {
	              // uniq digest/seq pairs, just in case there are dups
	              var seqs = digestSeqs[digest] = (digestSeqs[digest] || []);
	              if (seqs.indexOf(seq) === -1) {
	                seqs.push(seq);
	              }
	            }
	            for (var i = 0; i < res.rows.length; i++) {
	              var row = res.rows.item(i);
	              var doc = unstringifyDoc(row.data, row.id, row.rev);
	              var atts = Object.keys(doc._attachments || {});
	              for (var j = 0; j < atts.length; j++) {
	                var att = doc._attachments[atts[j]];
	                addDigestSeq(att.digest, row.seq);
	              }
	            }
	            var digestSeqPairs = [];
	            Object.keys(digestSeqs).forEach(function (digest) {
	              var seqs = digestSeqs[digest];
	              seqs.forEach(function (seq) {
	                digestSeqPairs.push([digest, seq]);
	              });
	            });
	            if (!digestSeqPairs.length) {
	              return nextPage();
	            }
	            var numDone = 0;
	            digestSeqPairs.forEach(function (pair) {
	              var sql = 'INSERT INTO ' + ATTACH_AND_SEQ_STORE +
	                ' (digest, seq) VALUES (?,?)';
	              tx.executeSql(sql, pair, function () {
	                if (++numDone === digestSeqPairs.length) {
	                  nextPage();
	                }
	              });
	            });
	          });
	        }
	        nextPage();
	      });
	    }

	    var attachAndRev = 'CREATE TABLE IF NOT EXISTS ' +
	      ATTACH_AND_SEQ_STORE + ' (digest, seq INTEGER)';
	    tx.executeSql(attachAndRev, [], function (tx) {
	      tx.executeSql(
	        ATTACH_AND_SEQ_STORE_ATTACH_INDEX_SQL, [], function (tx) {
	          tx.executeSql(
	            ATTACH_AND_SEQ_STORE_SEQ_INDEX_SQL, [],
	            migrateAttsAndSeqs);
	        });
	    });
	  }

	  // in this migration, we use escapeBlob() and unescapeBlob()
	  // instead of reading out the binary as HEX, which is slow
	  function runMigration6(tx, callback) {
	    var sql = 'ALTER TABLE ' + ATTACH_STORE +
	      ' ADD COLUMN escaped TINYINT(1) DEFAULT 0';
	    tx.executeSql(sql, [], callback);
	  }

	  // issue #3136, in this migration we need a "latest seq" as well
	  // as the "winning seq" in the doc store
	  function runMigration7(tx, callback) {
	    var sql = 'ALTER TABLE ' + DOC_STORE +
	      ' ADD COLUMN max_seq INTEGER';
	    tx.executeSql(sql, [], function (tx) {
	      var sql = 'UPDATE ' + DOC_STORE + ' SET max_seq=(SELECT MAX(seq) FROM ' +
	        BY_SEQ_STORE + ' WHERE doc_id=id)';
	      tx.executeSql(sql, [], function (tx) {
	        // add unique index after filling, else we'll get a constraint
	        // error when we do the ALTER TABLE
	        var sql =
	          'CREATE UNIQUE INDEX IF NOT EXISTS \'doc-max-seq-idx\' ON ' +
	          DOC_STORE + ' (max_seq)';
	        tx.executeSql(sql, [], callback);
	      });
	    });
	  }

	  function checkEncoding(tx, cb) {
	    // UTF-8 on chrome/android, UTF-16 on safari < 7.1
	    tx.executeSql('SELECT HEX("a") AS hex', [], function (tx, res) {
	        var hex = res.rows.item(0).hex;
	        encoding = hex.length === 2 ? 'UTF-8' : 'UTF-16';
	        cb();
	      }
	    );
	  }

	  function onGetInstanceId() {
	    while (idRequests.length > 0) {
	      var idCallback = idRequests.pop();
	      idCallback(null, instanceId);
	    }
	  }

	  function onGetVersion(tx, dbVersion) {
	    if (dbVersion === 0) {
	      // initial schema

	      var meta = 'CREATE TABLE IF NOT EXISTS ' + META_STORE +
	        ' (dbid, db_version INTEGER)';
	      var attach = 'CREATE TABLE IF NOT EXISTS ' + ATTACH_STORE +
	        ' (digest UNIQUE, escaped TINYINT(1), body BLOB)';
	      var attachAndRev = 'CREATE TABLE IF NOT EXISTS ' +
	        ATTACH_AND_SEQ_STORE + ' (digest, seq INTEGER)';
	      // TODO: migrate winningseq to INTEGER
	      var doc = 'CREATE TABLE IF NOT EXISTS ' + DOC_STORE +
	        ' (id unique, json, winningseq, max_seq INTEGER UNIQUE)';
	      var seq = 'CREATE TABLE IF NOT EXISTS ' + BY_SEQ_STORE +
	        ' (seq INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, ' +
	        'json, deleted TINYINT(1), doc_id, rev)';
	      var local = 'CREATE TABLE IF NOT EXISTS ' + LOCAL_STORE +
	        ' (id UNIQUE, rev, json)';

	      // creates
	      tx.executeSql(attach);
	      tx.executeSql(local);
	      tx.executeSql(attachAndRev, [], function () {
	        tx.executeSql(ATTACH_AND_SEQ_STORE_SEQ_INDEX_SQL);
	        tx.executeSql(ATTACH_AND_SEQ_STORE_ATTACH_INDEX_SQL);
	      });
	      tx.executeSql(doc, [], function () {
	        tx.executeSql(DOC_STORE_WINNINGSEQ_INDEX_SQL);
	        tx.executeSql(seq, [], function () {
	          tx.executeSql(BY_SEQ_STORE_DELETED_INDEX_SQL);
	          tx.executeSql(BY_SEQ_STORE_DOC_ID_REV_INDEX_SQL);
	          tx.executeSql(meta, [], function () {
	            // mark the db version, and new dbid
	            var initSeq = 'INSERT INTO ' + META_STORE +
	              ' (db_version, dbid) VALUES (?,?)';
	            instanceId = pouchdbUtils.uuid();
	            var initSeqArgs = [ADAPTER_VERSION, instanceId];
	            tx.executeSql(initSeq, initSeqArgs, function () {
	              onGetInstanceId();
	            });
	          });
	        });
	      });
	    } else { // version > 0

	      var setupDone = function () {
	        var migrated = dbVersion < ADAPTER_VERSION;
	        if (migrated) {
	          // update the db version within this transaction
	          tx.executeSql('UPDATE ' + META_STORE + ' SET db_version = ' +
	            ADAPTER_VERSION);
	        }
	        // notify db.id() callers
	        var sql = 'SELECT dbid FROM ' + META_STORE;
	        tx.executeSql(sql, [], function (tx, result) {
	          instanceId = result.rows.item(0).dbid;
	          onGetInstanceId();
	        });
	      };

	      // would love to use promises here, but then websql
	      // ends the transaction early
	      var tasks = [
	        runMigration2,
	        runMigration3,
	        runMigration4,
	        runMigration5,
	        runMigration6,
	        runMigration7,
	        setupDone
	      ];

	      // run each migration sequentially
	      var i = dbVersion;
	      var nextMigration = function (tx) {
	        tasks[i - 1](tx, nextMigration);
	        i++;
	      };
	      nextMigration(tx);
	    }
	  }

	  function setup() {
	    db.transaction(function (tx) {
	      // first check the encoding
	      checkEncoding(tx, function () {
	        // then get the version
	        fetchVersion(tx);
	      });
	    }, websqlError(callback), dbCreated);
	  }

	  function fetchVersion(tx) {
	    var sql = 'SELECT sql FROM sqlite_master WHERE tbl_name = ' + META_STORE;
	    tx.executeSql(sql, [], function (tx, result) {
	      if (!result.rows.length) {
	        // database hasn't even been created yet (version 0)
	        onGetVersion(tx, 0);
	      } else if (!/db_version/.test(result.rows.item(0).sql)) {
	        // table was created, but without the new db_version column,
	        // so add it.
	        tx.executeSql('ALTER TABLE ' + META_STORE +
	          ' ADD COLUMN db_version INTEGER', [], function () {
	          // before version 2, this column didn't even exist
	          onGetVersion(tx, 1);
	        });
	      } else { // column exists, we can safely get it
	        tx.executeSql('SELECT db_version FROM ' + META_STORE,
	          [], function (tx, result) {
	          var dbVersion = result.rows.item(0).db_version;
	          onGetVersion(tx, dbVersion);
	        });
	      }
	    });
	  }

	  setup();

	  api.type = function () {
	    return 'websql';
	  };

	  api._id = pouchdbUtils.toPromise(function (callback) {
	    callback(null, instanceId);
	  });

	  api._info = function (callback) {
	    db.readTransaction(function (tx) {
	      countDocs(tx, function (docCount) {
	        var sql = 'SELECT MAX(seq) AS seq FROM ' + BY_SEQ_STORE;
	        tx.executeSql(sql, [], function (tx, res) {
	          var updateSeq = res.rows.item(0).seq || 0;
	          callback(null, {
	            doc_count: docCount,
	            update_seq: updateSeq,
	            // for debugging
	            sqlite_plugin: db._sqlitePlugin,
	            websql_encoding: encoding
	          });
	        });
	      });
	    }, websqlError(callback));
	  };

	  api._bulkDocs = function (req, reqOpts, callback) {
	    websqlBulkDocs(opts, req, reqOpts, api, db, websqlChanges, callback);
	  };

	  api._get = function (id, opts, callback) {
	    var doc;
	    var metadata;
	    var err;
	    var tx = opts.ctx;
	    if (!tx) {
	      return db.readTransaction(function (txn) {
	        api._get(id, jsExtend.extend({ctx: txn}, opts), callback);
	      });
	    }

	    function finish() {
	      callback(err, {doc: doc, metadata: metadata, ctx: tx});
	    }

	    var sql;
	    var sqlArgs;
	    if (opts.rev) {
	      sql = select(
	        SELECT_DOCS,
	        [DOC_STORE, BY_SEQ_STORE],
	        DOC_STORE + '.id=' + BY_SEQ_STORE + '.doc_id',
	        [BY_SEQ_STORE + '.doc_id=?', BY_SEQ_STORE + '.rev=?']);
	      sqlArgs = [id, opts.rev];
	    } else {
	      sql = select(
	        SELECT_DOCS,
	        [DOC_STORE, BY_SEQ_STORE],
	        DOC_STORE_AND_BY_SEQ_JOINER,
	        DOC_STORE + '.id=?');
	      sqlArgs = [id];
	    }
	    tx.executeSql(sql, sqlArgs, function (a, results) {
	      if (!results.rows.length) {
	        err = pouchdbErrors.createError(pouchdbErrors.MISSING_DOC, 'missing');
	        return finish();
	      }
	      var item = results.rows.item(0);
	      metadata = pouchdbJson.safeJsonParse(item.metadata);
	      if (item.deleted && !opts.rev) {
	        err = pouchdbErrors.createError(pouchdbErrors.MISSING_DOC, 'deleted');
	        return finish();
	      }
	      doc = unstringifyDoc(item.data, metadata.id, item.rev);
	      finish();
	    });
	  };

	  function countDocs(tx, callback) {

	    if (api._docCount !== -1) {
	      return callback(api._docCount);
	    }

	    // count the total rows
	    var sql = select(
	      'COUNT(' + DOC_STORE + '.id) AS \'num\'',
	      [DOC_STORE, BY_SEQ_STORE],
	      DOC_STORE_AND_BY_SEQ_JOINER,
	      BY_SEQ_STORE + '.deleted=0');

	    tx.executeSql(sql, [], function (tx, result) {
	      api._docCount = result.rows.item(0).num;
	      callback(api._docCount);
	    });
	  }

	  api._allDocs = function (opts, callback) {
	    var results = [];
	    var totalRows;

	    var start = 'startkey' in opts ? opts.startkey : false;
	    var end = 'endkey' in opts ? opts.endkey : false;
	    var key = 'key' in opts ? opts.key : false;
	    var descending = 'descending' in opts ? opts.descending : false;
	    var limit = 'limit' in opts ? opts.limit : -1;
	    var offset = 'skip' in opts ? opts.skip : 0;
	    var inclusiveEnd = opts.inclusive_end !== false;

	    var sqlArgs = [];
	    var criteria = [];

	    if (key !== false) {
	      criteria.push(DOC_STORE + '.id = ?');
	      sqlArgs.push(key);
	    } else if (start !== false || end !== false) {
	      if (start !== false) {
	        criteria.push(DOC_STORE + '.id ' + (descending ? '<=' : '>=') + ' ?');
	        sqlArgs.push(start);
	      }
	      if (end !== false) {
	        var comparator = descending ? '>' : '<';
	        if (inclusiveEnd) {
	          comparator += '=';
	        }
	        criteria.push(DOC_STORE + '.id ' + comparator + ' ?');
	        sqlArgs.push(end);
	      }
	      if (key !== false) {
	        criteria.push(DOC_STORE + '.id = ?');
	        sqlArgs.push(key);
	      }
	    }

	    if (opts.deleted !== 'ok') {
	      // report deleted if keys are specified
	      criteria.push(BY_SEQ_STORE + '.deleted = 0');
	    }

	    db.readTransaction(function (tx) {

	      // first count up the total rows
	      countDocs(tx, function (count) {
	        totalRows = count;

	        if (limit === 0) {
	          return;
	        }

	        // then actually fetch the documents
	        var sql = select(
	          SELECT_DOCS,
	          [DOC_STORE, BY_SEQ_STORE],
	          DOC_STORE_AND_BY_SEQ_JOINER,
	          criteria,
	          DOC_STORE + '.id ' + (descending ? 'DESC' : 'ASC')
	          );
	        sql += ' LIMIT ' + limit + ' OFFSET ' + offset;

	        tx.executeSql(sql, sqlArgs, function (tx, result) {
	          for (var i = 0, l = result.rows.length; i < l; i++) {
	            var item = result.rows.item(i);
	            var metadata = pouchdbJson.safeJsonParse(item.metadata);
	            var id = metadata.id;
	            var data = unstringifyDoc(item.data, id, item.rev);
	            var winningRev = data._rev;
	            var doc = {
	              id: id,
	              key: id,
	              value: {rev: winningRev}
	            };
	            if (opts.include_docs) {
	              doc.doc = data;
	              doc.doc._rev = winningRev;
	              if (opts.conflicts) {
	                doc.doc._conflicts = pouchdbMerge.collectConflicts(metadata);
	              }
	              fetchAttachmentsIfNecessary(doc.doc, opts, api, tx);
	            }
	            if (item.deleted) {
	              if (opts.deleted === 'ok') {
	                doc.value.deleted = true;
	                doc.doc = null;
	              } else {
	                continue;
	              }
	            }
	            results.push(doc);
	          }
	        });
	      });
	    }, websqlError(callback), function () {
	      callback(null, {
	        total_rows: totalRows,
	        offset: opts.skip,
	        rows: results
	      });
	    });
	  };

	  api._changes = function (opts) {
	    opts = pouchdbUtils.clone(opts);

	    if (opts.continuous) {
	      var id = api._name + ':' + pouchdbUtils.uuid();
	      websqlChanges.addListener(api._name, id, api, opts);
	      websqlChanges.notify(api._name);
	      return {
	        cancel: function () {
	          websqlChanges.removeListener(api._name, id);
	        }
	      };
	    }

	    var descending = opts.descending;

	    // Ignore the `since` parameter when `descending` is true
	    opts.since = opts.since && !descending ? opts.since : 0;

	    var limit = 'limit' in opts ? opts.limit : -1;
	    if (limit === 0) {
	      limit = 1; // per CouchDB _changes spec
	    }

	    var returnDocs;
	    if ('return_docs' in opts) {
	      returnDocs = opts.return_docs;
	    } else if ('returnDocs' in opts) {
	      // TODO: Remove 'returnDocs' in favor of 'return_docs' in a future release
	      returnDocs = opts.returnDocs;
	    } else {
	      returnDocs = true;
	    }
	    var results = [];
	    var numResults = 0;

	    function fetchChanges() {

	      var selectStmt =
	        DOC_STORE + '.json AS metadata, ' +
	        DOC_STORE + '.max_seq AS maxSeq, ' +
	        BY_SEQ_STORE + '.json AS winningDoc, ' +
	        BY_SEQ_STORE + '.rev AS winningRev ';

	      var from = DOC_STORE + ' JOIN ' + BY_SEQ_STORE;

	      var joiner = DOC_STORE + '.id=' + BY_SEQ_STORE + '.doc_id' +
	        ' AND ' + DOC_STORE + '.winningseq=' + BY_SEQ_STORE + '.seq';

	      var criteria = ['maxSeq > ?'];
	      var sqlArgs = [opts.since];

	      if (opts.doc_ids) {
	        criteria.push(DOC_STORE + '.id IN ' + qMarks(opts.doc_ids.length));
	        sqlArgs = sqlArgs.concat(opts.doc_ids);
	      }

	      var orderBy = 'maxSeq ' + (descending ? 'DESC' : 'ASC');

	      var sql = select(selectStmt, from, joiner, criteria, orderBy);

	      var filter = pouchdbUtils.filterChange(opts);
	      if (!opts.view && !opts.filter) {
	        // we can just limit in the query
	        sql += ' LIMIT ' + limit;
	      }

	      var lastSeq = opts.since || 0;
	      db.readTransaction(function (tx) {
	        tx.executeSql(sql, sqlArgs, function (tx, result) {
	          function reportChange(change) {
	            return function () {
	              opts.onChange(change);
	            };
	          }
	          for (var i = 0, l = result.rows.length; i < l; i++) {
	            var item = result.rows.item(i);
	            var metadata = pouchdbJson.safeJsonParse(item.metadata);
	            lastSeq = item.maxSeq;

	            var doc = unstringifyDoc(item.winningDoc, metadata.id,
	              item.winningRev);
	            var change = opts.processChange(doc, metadata, opts);
	            change.seq = item.maxSeq;

	            var filtered = filter(change);
	            if (typeof filtered === 'object') {
	              return opts.complete(filtered);
	            }

	            if (filtered) {
	              numResults++;
	              if (returnDocs) {
	                results.push(change);
	              }
	              // process the attachment immediately
	              // for the benefit of live listeners
	              if (opts.attachments && opts.include_docs) {
	                fetchAttachmentsIfNecessary(doc, opts, api, tx,
	                  reportChange(change));
	              } else {
	                reportChange(change)();
	              }
	            }
	            if (numResults === limit) {
	              break;
	            }
	          }
	        });
	      }, websqlError(opts.complete), function () {
	        if (!opts.continuous) {
	          opts.complete(null, {
	            results: results,
	            last_seq: lastSeq
	          });
	        }
	      });
	    }

	    fetchChanges();
	  };

	  api._close = function (callback) {
	    //WebSQL databases do not need to be closed
	    callback();
	  };

	  api._getAttachment = function (docId, attachId, attachment, opts, callback) {
	    var res;
	    var tx = opts.ctx;
	    var digest = attachment.digest;
	    var type = attachment.content_type;
	    var sql = 'SELECT escaped, ' +
	      'CASE WHEN escaped = 1 THEN body ELSE HEX(body) END AS body FROM ' +
	      ATTACH_STORE + ' WHERE digest=?';
	    tx.executeSql(sql, [digest], function (tx, result) {
	      // websql has a bug where \u0000 causes early truncation in strings
	      // and blobs. to work around this, we used to use the hex() function,
	      // but that's not performant. after migration 6, we remove \u0000
	      // and add it back in afterwards
	      var item = result.rows.item(0);
	      var data = item.escaped ? unescapeBlob(item.body) :
	        parseHexString(item.body, encoding);
	      if (opts.binary) {
	        res = pouchdbBinaryUtils.binaryStringToBlobOrBuffer(data, type);
	      } else {
	        res = pouchdbBinaryUtils.btoa(data);
	      }
	      callback(null, res);
	    });
	  };

	  api._getRevisionTree = function (docId, callback) {
	    db.readTransaction(function (tx) {
	      var sql = 'SELECT json AS metadata FROM ' + DOC_STORE + ' WHERE id = ?';
	      tx.executeSql(sql, [docId], function (tx, result) {
	        if (!result.rows.length) {
	          callback(pouchdbErrors.createError(pouchdbErrors.MISSING_DOC));
	        } else {
	          var data = pouchdbJson.safeJsonParse(result.rows.item(0).metadata);
	          callback(null, data.rev_tree);
	        }
	      });
	    });
	  };

	  api._doCompaction = function (docId, revs, callback) {
	    if (!revs.length) {
	      return callback();
	    }
	    db.transaction(function (tx) {

	      // update doc store
	      var sql = 'SELECT json AS metadata FROM ' + DOC_STORE + ' WHERE id = ?';
	      tx.executeSql(sql, [docId], function (tx, result) {
	        var metadata = pouchdbJson.safeJsonParse(result.rows.item(0).metadata);
	        pouchdbMerge.traverseRevTree(metadata.rev_tree, function (isLeaf, pos,
	                                                           revHash, ctx, opts) {
	          var rev = pos + '-' + revHash;
	          if (revs.indexOf(rev) !== -1) {
	            opts.status = 'missing';
	          }
	        });

	        var sql = 'UPDATE ' + DOC_STORE + ' SET json = ? WHERE id = ?';
	        tx.executeSql(sql, [pouchdbJson.safeJsonStringify(metadata), docId]);
	      });

	      compactRevs(revs, docId, tx);
	    }, websqlError(callback), function () {
	      callback();
	    });
	  };

	  api._getLocal = function (id, callback) {
	    db.readTransaction(function (tx) {
	      var sql = 'SELECT json, rev FROM ' + LOCAL_STORE + ' WHERE id=?';
	      tx.executeSql(sql, [id], function (tx, res) {
	        if (res.rows.length) {
	          var item = res.rows.item(0);
	          var doc = unstringifyDoc(item.json, id, item.rev);
	          callback(null, doc);
	        } else {
	          callback(pouchdbErrors.createError(pouchdbErrors.MISSING_DOC));
	        }
	      });
	    });
	  };

	  api._putLocal = function (doc, opts, callback) {
	    if (typeof opts === 'function') {
	      callback = opts;
	      opts = {};
	    }
	    delete doc._revisions; // ignore this, trust the rev
	    var oldRev = doc._rev;
	    var id = doc._id;
	    var newRev;
	    if (!oldRev) {
	      newRev = doc._rev = '0-1';
	    } else {
	      newRev = doc._rev = '0-' + (parseInt(oldRev.split('-')[1], 10) + 1);
	    }
	    var json = stringifyDoc(doc);

	    var ret;
	    function putLocal(tx) {
	      var sql;
	      var values;
	      if (oldRev) {
	        sql = 'UPDATE ' + LOCAL_STORE + ' SET rev=?, json=? ' +
	          'WHERE id=? AND rev=?';
	        values = [newRev, json, id, oldRev];
	      } else {
	        sql = 'INSERT INTO ' + LOCAL_STORE + ' (id, rev, json) VALUES (?,?,?)';
	        values = [id, newRev, json];
	      }
	      tx.executeSql(sql, values, function (tx, res) {
	        if (res.rowsAffected) {
	          ret = {ok: true, id: id, rev: newRev};
	          if (opts.ctx) { // return immediately
	            callback(null, ret);
	          }
	        } else {
	          callback(pouchdbErrors.createError(pouchdbErrors.REV_CONFLICT));
	        }
	      }, function () {
	        callback(pouchdbErrors.createError(pouchdbErrors.REV_CONFLICT));
	        return false; // ack that we handled the error
	      });
	    }

	    if (opts.ctx) {
	      putLocal(opts.ctx);
	    } else {
	      db.transaction(putLocal, websqlError(callback), function () {
	        if (ret) {
	          callback(null, ret);
	        }
	      });
	    }
	  };

	  api._removeLocal = function (doc, opts, callback) {
	    if (typeof opts === 'function') {
	      callback = opts;
	      opts = {};
	    }
	    var ret;

	    function removeLocal(tx) {
	      var sql = 'DELETE FROM ' + LOCAL_STORE + ' WHERE id=? AND rev=?';
	      var params = [doc._id, doc._rev];
	      tx.executeSql(sql, params, function (tx, res) {
	        if (!res.rowsAffected) {
	          return callback(pouchdbErrors.createError(pouchdbErrors.MISSING_DOC));
	        }
	        ret = {ok: true, id: doc._id, rev: '0-0'};
	        if (opts.ctx) { // return immediately
	          callback(null, ret);
	        }
	      });
	    }

	    if (opts.ctx) {
	      removeLocal(opts.ctx);
	    } else {
	      db.transaction(removeLocal, websqlError(callback), function () {
	        if (ret) {
	          callback(null, ret);
	        }
	      });
	    }
	  };

	  api._destroy = function (opts, callback) {
	    websqlChanges.removeAllListeners(api._name);
	    db.transaction(function (tx) {
	      var stores = [DOC_STORE, BY_SEQ_STORE, ATTACH_STORE, META_STORE,
	        LOCAL_STORE, ATTACH_AND_SEQ_STORE];
	      stores.forEach(function (store) {
	        tx.executeSql('DROP TABLE IF EXISTS ' + store, []);
	      });
	    }, websqlError(callback), function () {
	      if (pouchdbUtils.hasLocalStorage()) {
	        delete window.localStorage['_pouch__websqldb_' + api._name];
	        delete window.localStorage[api._name];
	      }
	      callback(null, {'ok': true});
	    });
	  };
	}

	module.exports = WebSqlPouch;

/***/ },
/* 29 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

	var jsExtend = __webpack_require__(5);
	var Promise = _interopDefault(__webpack_require__(10));
	var ajaxCore = _interopDefault(__webpack_require__(30));
	var getArguments = _interopDefault(__webpack_require__(14));
	var pouchdbUtils = __webpack_require__(16);
	var pouchdbBinaryUtils = __webpack_require__(22);
	var pouchdbErrors = __webpack_require__(17);
	var debug = _interopDefault(__webpack_require__(6));

	var CHANGES_BATCH_SIZE = 25;
	var MAX_SIMULTANEOUS_REVS = 50;

	var supportsBulkGetMap = {};

	// according to http://stackoverflow.com/a/417184/680742,
	// the de facto URL length limit is 2000 characters.
	// but since most of our measurements don't take the full
	// URL into account, we fudge it a bit.
	// TODO: we could measure the full URL to enforce exactly 2000 chars
	var MAX_URL_LENGTH = 1800;

	var log = debug('pouchdb:http');

	function readAttachmentsAsBlobOrBuffer(row) {
	  var atts = row.doc && row.doc._attachments;
	  if (!atts) {
	    return;
	  }
	  Object.keys(atts).forEach(function (filename) {
	    var att = atts[filename];
	    att.data = pouchdbBinaryUtils.base64StringToBlobOrBuffer(att.data, att.content_type);
	  });
	}

	function encodeDocId(id) {
	  if (/^_design/.test(id)) {
	    return '_design/' + encodeURIComponent(id.slice(8));
	  }
	  if (/^_local/.test(id)) {
	    return '_local/' + encodeURIComponent(id.slice(7));
	  }
	  return encodeURIComponent(id);
	}

	function preprocessAttachments(doc) {
	  if (!doc._attachments || !Object.keys(doc._attachments)) {
	    return Promise.resolve();
	  }

	  return Promise.all(Object.keys(doc._attachments).map(function (key) {
	    var attachment = doc._attachments[key];
	    if (attachment.data && typeof attachment.data !== 'string') {
	      return new Promise(function (resolve) {
	        pouchdbBinaryUtils.blobOrBufferToBase64(attachment.data, resolve);
	      }).then(function (b64) {
	        attachment.data = b64;
	      });
	    }
	  }));
	}

	// Get all the information you possibly can about the URI given by name and
	// return it as a suitable object.
	function getHost(name) {
	  // Prase the URI into all its little bits
	  var uri = pouchdbUtils.parseUri(name);

	  // Store the user and password as a separate auth object
	  if (uri.user || uri.password) {
	    uri.auth = {username: uri.user, password: uri.password};
	  }

	  // Split the path part of the URI into parts using '/' as the delimiter
	  // after removing any leading '/' and any trailing '/'
	  var parts = uri.path.replace(/(^\/|\/$)/g, '').split('/');

	  // Store the first part as the database name and remove it from the parts
	  // array
	  uri.db = parts.pop();
	  // Prevent double encoding of URI component
	  if (uri.db.indexOf('%') === -1) {
	    uri.db = encodeURIComponent(uri.db);
	  }

	  // Restore the path by joining all the remaining parts (all the parts
	  // except for the database name) with '/'s
	  uri.path = parts.join('/');

	  return uri;
	}

	// Generate a URL with the host data given by opts and the given path
	function genDBUrl(opts, path) {
	  return genUrl(opts, opts.db + '/' + path);
	}

	// Generate a URL with the host data given by opts and the given path
	function genUrl(opts, path) {
	  // If the host already has a path, then we need to have a path delimiter
	  // Otherwise, the path delimiter is the empty string
	  var pathDel = !opts.path ? '' : '/';

	  // If the host already has a path, then we need to have a path delimiter
	  // Otherwise, the path delimiter is the empty string
	  return opts.protocol + '://' + opts.host +
	         (opts.port ? (':' + opts.port) : '') +
	         '/' + opts.path + pathDel + path;
	}

	function paramsToStr(params) {
	  return '?' + Object.keys(params).map(function (k) {
	    return k + '=' + encodeURIComponent(params[k]);
	  }).join('&');
	}

	// Implements the PouchDB API for dealing with CouchDB instances over HTTP
	function HttpPouch(opts, callback) {
	  // The functions that will be publicly available for HttpPouch
	  var api = this;

	  // Parse the URI given by opts.name into an easy-to-use object
	  var getHostFun = getHost;

	  // TODO: this seems to only be used by yarong for the Thali project.
	  // Verify whether or not it's still needed.
	  /* istanbul ignore if */
	  if (opts.getHost) {
	    getHostFun = opts.getHost;
	  }

	  var host = getHostFun(opts.name, opts);
	  var dbUrl = genDBUrl(host, '');

	  opts = pouchdbUtils.clone(opts);
	  var ajaxOpts = opts.ajax || {};

	  api.getUrl = function () { return dbUrl; };
	  api.getHeaders = function () { return ajaxOpts.headers || {}; };

	  if (opts.auth || host.auth) {
	    var nAuth = opts.auth || host.auth;
	    var str = nAuth.username + ':' + nAuth.password;
	    var token = pouchdbBinaryUtils.btoa(unescape(encodeURIComponent(str)));
	    ajaxOpts.headers = ajaxOpts.headers || {};
	    ajaxOpts.headers.Authorization = 'Basic ' + token;
	  }

	  // Not strictly necessary, but we do this because numerous tests
	  // rely on swapping ajax in and out.
	  api._ajax = ajaxCore;

	  function ajax(userOpts, options, callback) {
	    var reqAjax = userOpts.ajax || {};
	    var reqOpts = jsExtend.extend(pouchdbUtils.clone(ajaxOpts), reqAjax, options);
	    log(reqOpts.method + ' ' + reqOpts.url);
	    return api._ajax(reqOpts, callback);
	  }

	  function ajaxPromise(userOpts, opts) {
	    return new Promise(function (resolve, reject) {
	      ajax(userOpts, opts, function (err, res) {
	        if (err) {
	          return reject(err);
	        }
	        resolve(res);
	      });
	    });
	  }

	  function adapterFun(name, fun) {
	    return pouchdbUtils.adapterFun(name, getArguments(function (args) {
	      setup().then(function () {
	        return fun.apply(this, args);
	      }).catch(function (e) {
	        var callback = args.pop();
	        callback(e);
	      });
	    }));
	  }

	  var setupPromise;

	  function setup() {
	    // TODO: Remove `skipSetup` in favor of `skip_setup` in a future release
	    if (opts.skipSetup || opts.skip_setup) {
	      return Promise.resolve();
	    }

	    // If there is a setup in process or previous successful setup
	    // done then we will use that
	    // If previous setups have been rejected we will try again
	    if (setupPromise) {
	      return setupPromise;
	    }

	    var checkExists = {method: 'GET', url: dbUrl};
	    setupPromise = ajaxPromise({}, checkExists).catch(function (err) {
	      if (err && err.status && err.status === 404) {
	        // Doesnt exist, create it
	        pouchdbUtils.explainError(404, 'PouchDB is just detecting if the remote exists.');
	        return ajaxPromise({}, {method: 'PUT', url: dbUrl});
	      } else {
	        return Promise.reject(err);
	      }
	    }).catch(function (err) {
	      // If we try to create a database that already exists, skipped in
	      // istanbul since its catching a race condition.
	      /* istanbul ignore if */
	      if (err && err.status && err.status === 412) {
	        return true;
	      }
	      return Promise.reject(err);
	    });

	    setupPromise.catch(function () {
	      setupPromise = null;
	    });

	    return setupPromise;
	  }

	  setTimeout(function () {
	    callback(null, api);
	  });

	  api.type = function () {
	    return 'http';
	  };

	  api.id = adapterFun('id', function (callback) {
	    ajax({}, {method: 'GET', url: genUrl(host, '')}, function (err, result) {
	      var uuid = (result && result.uuid) ?
	        (result.uuid + host.db) : genDBUrl(host, '');
	      callback(null, uuid);
	    });
	  });

	  api.request = adapterFun('request', function (options, callback) {
	    options.url = genDBUrl(host, options.url);
	    ajax({}, options, callback);
	  });

	  // Sends a POST request to the host calling the couchdb _compact function
	  //    version: The version of CouchDB it is running
	  api.compact = adapterFun('compact', function (opts, callback) {
	    if (typeof opts === 'function') {
	      callback = opts;
	      opts = {};
	    }
	    opts = pouchdbUtils.clone(opts);
	    ajax(opts, {
	      url: genDBUrl(host, '_compact'),
	      method: 'POST'
	    }, function () {
	      function ping() {
	        api.info(function (err, res) {
	          if (res && !res.compact_running) {
	            callback(null, {ok: true});
	          } else {
	            setTimeout(ping, opts.interval || 200);
	          }
	        });
	      }
	      // Ping the http if it's finished compaction
	      ping();
	    });
	  });

	  api.bulkGet = pouchdbUtils.adapterFun('bulkGet', function (opts, callback) {
	    var self = this;

	    function doBulkGet(cb) {
	      var params = {};
	      if (opts.revs) {
	        params.revs = true;
	      }
	      if (opts.attachments) {
	        /* istanbul ignore next */
	        params.attachments = true;
	      }
	      ajax({}, {
	        url: genDBUrl(host, '_bulk_get' + paramsToStr(params)),
	        method: 'POST',
	        body: { docs: opts.docs}
	      }, cb);
	    }

	    function doBulkGetShim() {
	      // avoid "url too long error" by splitting up into multiple requests
	      var batchSize = MAX_SIMULTANEOUS_REVS;
	      var numBatches = Math.ceil(opts.docs.length / batchSize);
	      var numDone = 0;
	      var results = new Array(numBatches);

	      function onResult(batchNum) {
	        return function (err, res) {
	          // err is impossible because shim returns a list of errs in that case
	          results[batchNum] = res.results;
	          if (++numDone === numBatches) {
	            callback(null, {results: pouchdbUtils.flatten(results)});
	          }
	        };
	      }

	      for (var i = 0; i < numBatches; i++) {
	        var subOpts = pouchdbUtils.pick(opts, ['revs', 'attachments']);
	        subOpts.ajax = ajaxOpts;
	        subOpts.docs = opts.docs.slice(i * batchSize,
	          Math.min(opts.docs.length, (i + 1) * batchSize));
	        pouchdbUtils.bulkGetShim(self, subOpts, onResult(i));
	      }
	    }

	    // mark the whole database as either supporting or not supporting _bulk_get
	    var dbUrl = genUrl(host, '');
	    var supportsBulkGet = supportsBulkGetMap[dbUrl];

	    if (typeof supportsBulkGet !== 'boolean') {
	      // check if this database supports _bulk_get
	      doBulkGet(function (err, res) {
	        /* istanbul ignore else */
	        if (err) {
	          var status = Math.floor(err.status / 100);
	          /* istanbul ignore else */
	          if (status === 4 || status === 5) { // 40x or 50x
	            supportsBulkGetMap[dbUrl] = false;
	            pouchdbUtils.explainError(
	              err.status,
	              'PouchDB is just detecting if the remote ' +
	              'supports the _bulk_get API.'
	            );
	            doBulkGetShim();
	          } else {
	            callback(err);
	          }
	        } else {
	          supportsBulkGetMap[dbUrl] = true;
	          callback(null, res);
	        }
	      });
	    } else if (supportsBulkGet) {
	      /* istanbul ignore next */
	      doBulkGet(callback);
	    } else {
	      doBulkGetShim();
	    }
	  });

	  // Calls GET on the host, which gets back a JSON string containing
	  //    couchdb: A welcome string
	  //    version: The version of CouchDB it is running
	  api._info = function (callback) {
	    setup().then(function () {
	      ajax({}, {
	        method: 'GET',
	        url: genDBUrl(host, '')
	      }, function (err, res) {
	        /* istanbul ignore next */
	        if (err) {
	        return callback(err);
	        }
	        res.host = genDBUrl(host, '');
	        callback(null, res);
	      });
	    }).catch(callback);
	  };

	  // Get the document with the given id from the database given by host.
	  // The id could be solely the _id in the database, or it may be a
	  // _design/ID or _local/ID path
	  api.get = adapterFun('get', function (id, opts, callback) {
	    // If no options were given, set the callback to the second parameter
	    if (typeof opts === 'function') {
	      callback = opts;
	      opts = {};
	    }
	    opts = pouchdbUtils.clone(opts);

	    // List of parameters to add to the GET request
	    var params = {};

	    if (opts.revs) {
	      params.revs = true;
	    }

	    if (opts.revs_info) {
	      params.revs_info = true;
	    }

	    if (opts.open_revs) {
	      if (opts.open_revs !== "all") {
	        opts.open_revs = JSON.stringify(opts.open_revs);
	      }
	      params.open_revs = opts.open_revs;
	    }

	    if (opts.rev) {
	      params.rev = opts.rev;
	    }

	    if (opts.conflicts) {
	      params.conflicts = opts.conflicts;
	    }

	    id = encodeDocId(id);

	    // Set the options for the ajax call
	    var options = {
	      method: 'GET',
	      url: genDBUrl(host, id + paramsToStr(params))
	    };

	    function fetchAttachments(doc) {
	      var atts = doc._attachments;
	      var filenames = atts && Object.keys(atts);
	      if (!atts || !filenames.length) {
	        return;
	      }
	      // we fetch these manually in separate XHRs, because
	      // Sync Gateway would normally send it back as multipart/mixed,
	      // which we cannot parse. Also, this is more efficient than
	      // receiving attachments as base64-encoded strings.
	      return Promise.all(filenames.map(function (filename) {
	        var att = atts[filename];
	        var path = encodeDocId(doc._id) + '/' + encodeAttachmentId(filename) +
	          '?rev=' + doc._rev;
	        return ajaxPromise(opts, {
	          method: 'GET',
	          url: genDBUrl(host, path),
	          binary: true
	        }).then(function (blob) {
	          if (opts.binary) {
	            return blob;
	          }
	          return new Promise(function (resolve) {
	            pouchdbBinaryUtils.blobOrBufferToBase64(blob, resolve);
	          });
	        }).then(function (data) {
	          delete att.stub;
	          delete att.length;
	          att.data = data;
	        });
	      }));
	    }

	    function fetchAllAttachments(docOrDocs) {
	      if (Array.isArray(docOrDocs)) {
	        return Promise.all(docOrDocs.map(function (doc) {
	          if (doc.ok) {
	            return fetchAttachments(doc.ok);
	          }
	        }));
	      }
	      return fetchAttachments(docOrDocs);
	    }

	    ajaxPromise(opts, options).then(function (res) {
	      return Promise.resolve().then(function () {
	        if (opts.attachments) {
	          return fetchAllAttachments(res);
	        }
	      }).then(function () {
	        callback(null, res);
	      });
	    }).catch(callback);
	  });

	  // Delete the document given by doc from the database given by host.
	  api.remove = adapterFun('remove',
	      function (docOrId, optsOrRev, opts, callback) {
	    var doc;
	    if (typeof optsOrRev === 'string') {
	      // id, rev, opts, callback style
	      doc = {
	        _id: docOrId,
	        _rev: optsOrRev
	      };
	      if (typeof opts === 'function') {
	        callback = opts;
	        opts = {};
	      }
	    } else {
	      // doc, opts, callback style
	      doc = docOrId;
	      if (typeof optsOrRev === 'function') {
	        callback = optsOrRev;
	        opts = {};
	      } else {
	        callback = opts;
	        opts = optsOrRev;
	      }
	    }

	    var rev = (doc._rev || opts.rev);

	    // Delete the document
	    ajax(opts, {
	      method: 'DELETE',
	      url: genDBUrl(host, encodeDocId(doc._id)) + '?rev=' + rev
	    }, callback);
	  });

	  function encodeAttachmentId(attachmentId) {
	    return attachmentId.split("/").map(encodeURIComponent).join("/");
	  }

	  // Get the attachment
	  api.getAttachment =
	    adapterFun('getAttachment', function (docId, attachmentId, opts,
	                                                callback) {
	    if (typeof opts === 'function') {
	      callback = opts;
	      opts = {};
	    }
	    var params = opts.rev ? ('?rev=' + opts.rev) : '';
	    var url = genDBUrl(host, encodeDocId(docId)) + '/' +
	      encodeAttachmentId(attachmentId) + params;
	    ajax(opts, {
	      method: 'GET',
	      url: url,
	      binary: true
	    }, callback);
	  });

	  // Remove the attachment given by the id and rev
	  api.removeAttachment =
	    adapterFun('removeAttachment', function (docId, attachmentId, rev,
	                                                   callback) {

	    var url = genDBUrl(host, encodeDocId(docId) + '/' +
	      encodeAttachmentId(attachmentId)) + '?rev=' + rev;

	    ajax({}, {
	      method: 'DELETE',
	      url: url
	    }, callback);
	  });

	  // Add the attachment given by blob and its contentType property
	  // to the document with the given id, the revision given by rev, and
	  // add it to the database given by host.
	  api.putAttachment =
	    adapterFun('putAttachment', function (docId, attachmentId, rev, blob,
	                                                type, callback) {
	    if (typeof type === 'function') {
	      callback = type;
	      type = blob;
	      blob = rev;
	      rev = null;
	    }
	    var id = encodeDocId(docId) + '/' + encodeAttachmentId(attachmentId);
	    var url = genDBUrl(host, id);
	    if (rev) {
	      url += '?rev=' + rev;
	    }

	    if (typeof blob === 'string') {
	      // input is assumed to be a base64 string
	      var binary;
	      try {
	        binary = pouchdbBinaryUtils.atob(blob);
	      } catch (err) {
	        return callback(pouchdbErrors.createError(pouchdbErrors.BAD_ARG,
	                        'Attachment is not a valid base64 string'));
	      }
	      blob = binary ? pouchdbBinaryUtils.binaryStringToBlobOrBuffer(binary, type) : '';
	    }

	    var opts = {
	      headers: {'Content-Type': type},
	      method: 'PUT',
	      url: url,
	      processData: false,
	      body: blob,
	      timeout: ajaxOpts.timeout || 60000
	    };
	    // Add the attachment
	    ajax({}, opts, callback);
	  });

	  // Update/create multiple documents given by req in the database
	  // given by host.
	  api._bulkDocs = function (req, opts, callback) {
	    // If new_edits=false then it prevents the database from creating
	    // new revision numbers for the documents. Instead it just uses
	    // the old ones. This is used in database replication.
	    req.new_edits = opts.new_edits;

	    setup().then(function () {
	      return Promise.all(req.docs.map(preprocessAttachments));
	    }).then(function () {
	      // Update/create the documents
	      ajax(opts, {
	        method: 'POST',
	        url: genDBUrl(host, '_bulk_docs'),
	        body: req
	      }, function (err, results) {
	        if (err) {
	          return callback(err);
	        }
	        results.forEach(function (result) {
	          result.ok = true; // smooths out cloudant not adding this
	        });
	        callback(null, results);
	      });
	    }).catch(callback);
	  };

	  // Get a listing of the documents in the database given
	  // by host and ordered by increasing id.
	  api.allDocs = adapterFun('allDocs', function (opts, callback) {
	    if (typeof opts === 'function') {
	      callback = opts;
	      opts = {};
	    }
	    opts = pouchdbUtils.clone(opts);

	    // List of parameters to add to the GET request
	    var params = {};
	    var body;
	    var method = 'GET';

	    if (opts.conflicts) {
	      params.conflicts = true;
	    }

	    if (opts.descending) {
	      params.descending = true;
	    }

	    if (opts.include_docs) {
	      params.include_docs = true;
	    }

	    // added in CouchDB 1.6.0
	    if (opts.attachments) {
	      params.attachments = true;
	    }

	    if (opts.key) {
	      params.key = JSON.stringify(opts.key);
	    }

	    if (opts.start_key) {
	      opts.startkey = opts.start_key;
	    }

	    if (opts.startkey) {
	      params.startkey = JSON.stringify(opts.startkey);
	    }

	    if (opts.end_key) {
	      opts.endkey = opts.end_key;
	    }

	    if (opts.endkey) {
	      params.endkey = JSON.stringify(opts.endkey);
	    }

	    if (typeof opts.inclusive_end !== 'undefined') {
	      params.inclusive_end = !!opts.inclusive_end;
	    }

	    if (typeof opts.limit !== 'undefined') {
	      params.limit = opts.limit;
	    }

	    if (typeof opts.skip !== 'undefined') {
	      params.skip = opts.skip;
	    }

	    var paramStr = paramsToStr(params);

	    if (typeof opts.keys !== 'undefined') {

	      var keysAsString =
	        'keys=' + encodeURIComponent(JSON.stringify(opts.keys));
	      if (keysAsString.length + paramStr.length + 1 <= MAX_URL_LENGTH) {
	        // If the keys are short enough, do a GET. we do this to work around
	        // Safari not understanding 304s on POSTs (see issue #1239)
	        paramStr += '&' + keysAsString;
	      } else {
	        // If keys are too long, issue a POST request to circumvent GET
	        // query string limits
	        // see http://wiki.apache.org/couchdb/HTTP_view_API#Querying_Options
	        method = 'POST';
	        body = {keys: opts.keys};
	      }
	    }

	    // Get the document listing
	    ajaxPromise(opts, {
	      method: method,
	      url: genDBUrl(host, '_all_docs' + paramStr),
	      body: body
	    }).then(function (res) {
	      if (opts.include_docs && opts.attachments && opts.binary) {
	        res.rows.forEach(readAttachmentsAsBlobOrBuffer);
	      }
	      callback(null, res);
	    }).catch(callback);
	  });

	  // Get a list of changes made to documents in the database given by host.
	  // TODO According to the README, there should be two other methods here,
	  // api.changes.addListener and api.changes.removeListener.
	  api._changes = function (opts) {

	    // We internally page the results of a changes request, this means
	    // if there is a large set of changes to be returned we can start
	    // processing them quicker instead of waiting on the entire
	    // set of changes to return and attempting to process them at once
	    var batchSize = 'batch_size' in opts ? opts.batch_size : CHANGES_BATCH_SIZE;

	    opts = pouchdbUtils.clone(opts);
	    opts.timeout = ('timeout' in opts) ? opts.timeout :
	      ('timeout' in ajaxOpts) ? ajaxOpts.timeout :
	      30 * 1000;

	    // We give a 5 second buffer for CouchDB changes to respond with
	    // an ok timeout (if a timeout it set)
	    var params = opts.timeout ? {timeout: opts.timeout - (5 * 1000)} : {};
	    var limit = (typeof opts.limit !== 'undefined') ? opts.limit : false;
	    var returnDocs;
	    if ('return_docs' in opts) {
	      returnDocs = opts.return_docs;
	    } else if ('returnDocs' in opts) {
	      // TODO: Remove 'returnDocs' in favor of 'return_docs' in a future release
	      returnDocs = opts.returnDocs;
	    } else {
	      returnDocs = true;
	    }
	    //
	    var leftToFetch = limit;

	    if (opts.style) {
	      params.style = opts.style;
	    }

	    if (opts.include_docs || opts.filter && typeof opts.filter === 'function') {
	      params.include_docs = true;
	    }

	    if (opts.attachments) {
	      params.attachments = true;
	    }

	    if (opts.continuous) {
	      params.feed = 'longpoll';
	    }

	    if (opts.conflicts) {
	      params.conflicts = true;
	    }

	    if (opts.descending) {
	      params.descending = true;
	    }

	    if ('heartbeat' in opts) {
	      // If the heartbeat value is false, it disables the default heartbeat
	      if (opts.heartbeat) {
	        params.heartbeat = opts.heartbeat;
	      }
	    } else {
	      // Default heartbeat to 10 seconds
	      params.heartbeat = 10000;
	    }

	    if (opts.filter && typeof opts.filter === 'string') {
	      params.filter = opts.filter;
	    }

	    if (opts.view && typeof opts.view === 'string') {
	      params.filter = '_view';
	      params.view = opts.view;
	    }

	    // If opts.query_params exists, pass it through to the changes request.
	    // These parameters may be used by the filter on the source database.
	    if (opts.query_params && typeof opts.query_params === 'object') {
	      for (var param_name in opts.query_params) {
	        /* istanbul ignore else */
	        if (opts.query_params.hasOwnProperty(param_name)) {
	          params[param_name] = opts.query_params[param_name];
	        }
	      }
	    }

	    var method = 'GET';
	    var body;

	    if (opts.doc_ids) {
	      // set this automagically for the user; it's annoying that couchdb
	      // requires both a "filter" and a "doc_ids" param.
	      params.filter = '_doc_ids';

	      var docIdsJson = JSON.stringify(opts.doc_ids);

	      if (docIdsJson.length < MAX_URL_LENGTH) {
	        params.doc_ids = docIdsJson;
	      } else {
	        // anything greater than ~2000 is unsafe for gets, so
	        // use POST instead
	        method = 'POST';
	        body = {doc_ids: opts.doc_ids };
	      }
	    }

	    var xhr;
	    var lastFetchedSeq;

	    // Get all the changes starting wtih the one immediately after the
	    // sequence number given by since.
	    var fetch = function (since, callback) {
	      if (opts.aborted) {
	        return;
	      }
	      params.since = since;
	      // "since" can be any kind of json object in Coudant/CouchDB 2.x
	      /* istanbul ignore next */
	      if (typeof params.since === "object") {
	        params.since = JSON.stringify(params.since);
	      }

	      if (opts.descending) {
	        if (limit) {
	          params.limit = leftToFetch;
	        }
	      } else {
	        params.limit = (!limit || leftToFetch > batchSize) ?
	          batchSize : leftToFetch;
	      }

	      // Set the options for the ajax call
	      var xhrOpts = {
	        method: method,
	        url: genDBUrl(host, '_changes' + paramsToStr(params)),
	        timeout: opts.timeout,
	        body: body
	      };
	      lastFetchedSeq = since;

	      /* istanbul ignore if */
	      if (opts.aborted) {
	        return;
	      }

	      // Get the changes
	      setup().then(function () {
	        xhr = ajax(opts, xhrOpts, callback);
	      }).catch(callback);
	    };

	    // If opts.since exists, get all the changes from the sequence
	    // number given by opts.since. Otherwise, get all the changes
	    // from the sequence number 0.
	    var results = {results: []};

	    var fetched = function (err, res) {
	      if (opts.aborted) {
	        return;
	      }
	      var raw_results_length = 0;
	      // If the result of the ajax call (res) contains changes (res.results)
	      if (res && res.results) {
	        raw_results_length = res.results.length;
	        results.last_seq = res.last_seq;
	        // For each change
	        var req = {};
	        req.query = opts.query_params;
	        res.results = res.results.filter(function (c) {
	          leftToFetch--;
	          var ret = pouchdbUtils.filterChange(opts)(c);
	          if (ret) {
	            if (opts.include_docs && opts.attachments && opts.binary) {
	              readAttachmentsAsBlobOrBuffer(c);
	            }
	            if (returnDocs) {
	              results.results.push(c);
	            }
	            opts.onChange(c);
	          }
	          return ret;
	        });
	      } else if (err) {
	        // In case of an error, stop listening for changes and call
	        // opts.complete
	        opts.aborted = true;
	        opts.complete(err);
	        return;
	      }

	      // The changes feed may have timed out with no results
	      // if so reuse last update sequence
	      if (res && res.last_seq) {
	        lastFetchedSeq = res.last_seq;
	      }

	      var finished = (limit && leftToFetch <= 0) ||
	        (res && raw_results_length < batchSize) ||
	        (opts.descending);

	      if ((opts.continuous && !(limit && leftToFetch <= 0)) || !finished) {
	        // Queue a call to fetch again with the newest sequence number
	        setTimeout(function () { fetch(lastFetchedSeq, fetched); }, 0);
	      } else {
	        // We're done, call the callback
	        opts.complete(null, results);
	      }
	    };

	    fetch(opts.since || 0, fetched);

	    // Return a method to cancel this method from processing any more
	    return {
	      cancel: function () {
	        opts.aborted = true;
	        if (xhr) {
	          xhr.abort();
	        }
	      }
	    };
	  };

	  // Given a set of document/revision IDs (given by req), tets the subset of
	  // those that do NOT correspond to revisions stored in the database.
	  // See http://wiki.apache.org/couchdb/HttpPostRevsDiff
	  api.revsDiff = adapterFun('revsDiff', function (req, opts, callback) {
	    // If no options were given, set the callback to be the second parameter
	    if (typeof opts === 'function') {
	      callback = opts;
	      opts = {};
	    }

	    // Get the missing document/revision IDs
	    ajax(opts, {
	      method: 'POST',
	      url: genDBUrl(host, '_revs_diff'),
	      body: req
	    }, callback);
	  });

	  api._close = function (callback) {
	    callback();
	  };

	  api._destroy = function (options, callback) {
	    ajax(options, {
	      url: genDBUrl(host, ''),
	      method: 'DELETE'
	    }, function (err, resp) {
	      if (err && err.status && err.status !== 404) {
	        return callback(err);
	      }
	      callback(null, resp);
	    });
	  };
	}

	// HttpPouch is a valid adapter.
	HttpPouch.valid = function () {
	  return true;
	};

	function index (PouchDB) {
	  PouchDB.adapter('http', HttpPouch, false);
	  PouchDB.adapter('https', HttpPouch, false);
	}

	module.exports = index;

/***/ },
/* 30 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

	var pouchdbBinaryUtils = __webpack_require__(22);
	var Promise = _interopDefault(__webpack_require__(10));
	var jsExtend = __webpack_require__(5);
	var pouchdbErrors = __webpack_require__(17);
	var pouchdbUtils = __webpack_require__(16);

	function wrappedFetch() {
	  var wrappedPromise = {};

	  var promise = new Promise(function (resolve, reject) {
	    wrappedPromise.resolve = resolve;
	    wrappedPromise.reject = reject;
	  });

	  var args = new Array(arguments.length);

	  for (var i = 0; i < args.length; i++) {
	    args[i] = arguments[i];
	  }

	  wrappedPromise.promise = promise;

	  Promise.resolve().then(function () {
	    return fetch.apply(null, args);
	  }).then(function (response) {
	    wrappedPromise.resolve(response);
	  }).catch(function (error) {
	    wrappedPromise.reject(error);
	  });

	  return wrappedPromise;
	}

	function fetchRequest(options, callback) {
	  var wrappedPromise, timer, response;

	  var headers = new Headers();

	  var fetchOptions = {
	    method: options.method,
	    credentials: 'include',
	    headers: headers
	  };

	  if (options.json) {
	    headers.set('Accept', 'application/json');
	    headers.set('Content-Type', options.headers['Content-Type'] ||
	      'application/json');
	  }

	  if (options.body && (options.body instanceof Blob)) {
	    pouchdbBinaryUtils.readAsArrayBuffer(options.body, function (arrayBuffer) {
	      fetchOptions.body = arrayBuffer;
	    });
	  } else if (options.body &&
	             options.processData &&
	             typeof options.body !== 'string') {
	    fetchOptions.body = JSON.stringify(options.body);
	  } else if ('body' in options) {
	    fetchOptions.body = options.body;
	  } else {
	    fetchOptions.body = null;
	  }

	  Object.keys(options.headers).forEach(function (key) {
	    if (options.headers.hasOwnProperty(key)) {
	      headers.set(key, options.headers[key]);
	    }
	  });

	  wrappedPromise = wrappedFetch(options.url, fetchOptions);

	  if (options.timeout > 0) {
	    timer = setTimeout(function () {
	      wrappedPromise.reject(new Error('Load timeout for resource: ' +
	        options.url));
	    }, options.timeout);
	  }

	  wrappedPromise.promise.then(function (fetchResponse) {
	    response = {
	      statusCode: fetchResponse.status
	    };

	    if (options.timeout > 0) {
	      clearTimeout(timer);
	    }

	    if (response.statusCode >= 200 && response.statusCode < 300) {
	      return options.binary ? fetchResponse.blob() : fetchResponse.text();
	    }

	    return fetchResponse.json();
	  }).then(function (result) {
	    if (response.statusCode >= 200 && response.statusCode < 300) {
	      callback(null, response, result);
	    } else {
	      callback(result, response);
	    }
	  }).catch(function (error) {
	    callback(error, response);
	  });

	  return {abort: wrappedPromise.reject};
	}

	function xhRequest(options, callback) {

	  var xhr, timer;
	  var timedout = false;

	  var abortReq = function () {
	    xhr.abort();
	  };

	  var timeoutReq = function () {
	    timedout = true;
	    xhr.abort();
	  };

	  if (options.xhr) {
	    xhr = new options.xhr();
	  } else {
	    xhr = new XMLHttpRequest();
	  }

	  try {
	    xhr.open(options.method, options.url);
	  } catch (exception) {
	   /* error code hardcoded to throw INVALID_URL */
	    callback(exception, {statusCode: 413});
	  }

	  xhr.withCredentials = ('withCredentials' in options) ?
	    options.withCredentials : true;

	  if (options.method === 'GET') {
	    delete options.headers['Content-Type'];
	  } else if (options.json) {
	    options.headers.Accept = 'application/json';
	    options.headers['Content-Type'] = options.headers['Content-Type'] ||
	      'application/json';
	    if (options.body &&
	        options.processData &&
	        typeof options.body !== "string") {
	      options.body = JSON.stringify(options.body);
	    }
	  }

	  if (options.binary) {
	    xhr.responseType = 'arraybuffer';
	  }

	  if (!('body' in options)) {
	    options.body = null;
	  }

	  for (var key in options.headers) {
	    if (options.headers.hasOwnProperty(key)) {
	      xhr.setRequestHeader(key, options.headers[key]);
	    }
	  }

	  if (options.timeout > 0) {
	    timer = setTimeout(timeoutReq, options.timeout);
	    xhr.onprogress = function () {
	      clearTimeout(timer);
	      if(xhr.readyState !== 4) {
	        timer = setTimeout(timeoutReq, options.timeout);
	      }
	    };
	    if (typeof xhr.upload !== 'undefined') { // does not exist in ie9
	      xhr.upload.onprogress = xhr.onprogress;
	    }
	  }

	  xhr.onreadystatechange = function () {
	    if (xhr.readyState !== 4) {
	      return;
	    }

	    var response = {
	      statusCode: xhr.status
	    };

	    if (xhr.status >= 200 && xhr.status < 300) {
	      var data;
	      if (options.binary) {
	        data = pouchdbBinaryUtils.blob([xhr.response || ''], {
	          type: xhr.getResponseHeader('Content-Type')
	        });
	      } else {
	        data = xhr.responseText;
	      }
	      callback(null, response, data);
	    } else {
	      var err = {};
	      if(timedout) {
	        err = new Error('ETIMEDOUT');
	        response.statusCode = 400;      // for consistency with node request
	      } else {
	        try {
	          err = JSON.parse(xhr.response);
	        } catch(e) {}
	      }
	      callback(err, response);
	    }
	  };

	  if (options.body && (options.body instanceof Blob)) {
	    pouchdbBinaryUtils.readAsArrayBuffer(options.body, function (arrayBuffer) {
	      xhr.send(arrayBuffer);
	    });
	  } else {
	    xhr.send(options.body);
	  }

	  return {abort: abortReq};
	}

	function testXhr() {
	  try {
	    new XMLHttpRequest();
	    return true;
	  } catch (err) {
	    return false;
	  }
	}

	var hasXhr = testXhr();

	function ajax$1(options, callback) {
	  if (hasXhr || options.xhr) {
	    return xhRequest(options, callback);
	  } else {
	    return fetchRequest(options, callback);
	  }
	}

	// the blob already has a type; do nothing
	var res = function () {};

	function defaultBody() {
	  return '';
	}

	function ajaxCore(options, callback) {

	  options = pouchdbUtils.clone(options);

	  var defaultOptions = {
	    method : "GET",
	    headers: {},
	    json: true,
	    processData: true,
	    timeout: 10000,
	    cache: false
	  };

	  options = jsExtend.extend(defaultOptions, options);

	  function onSuccess(obj, resp, cb) {
	    if (!options.binary && options.json && typeof obj === 'string') {
	      try {
	        obj = JSON.parse(obj);
	      } catch (e) {
	        // Probably a malformed JSON from server
	        return cb(e);
	      }
	    }
	    if (Array.isArray(obj)) {
	      obj = obj.map(function (v) {
	        if (v.error || v.missing) {
	          return pouchdbErrors.generateErrorFromResponse(v);
	        } else {
	          return v;
	        }
	      });
	    }
	    if (options.binary) {
	      res(obj, resp);
	    }
	    cb(null, obj, resp);
	  }

	  function onError(err, cb) {
	    var errParsed, errObj;
	    if (err.code && err.status) {
	      var err2 = new Error(err.message || err.code);
	      err2.status = err.status;
	      return cb(err2);
	    }
	    /* istanbul ignore if */
	    if (err.message && err.message === 'ETIMEDOUT') {
	      return cb(err);
	    }
	    // We always get code && status in node
	    /* istanbul ignore next */
	    try {
	      errParsed = JSON.parse(err.responseText);
	      //would prefer not to have a try/catch clause
	      errObj = pouchdbErrors.generateErrorFromResponse(errParsed);
	    } catch (e) {
	      errObj = pouchdbErrors.generateErrorFromResponse(err);
	    }
	    /* istanbul ignore next */
	    cb(errObj);
	  }


	  if (options.json) {
	    if (!options.binary) {
	      options.headers.Accept = 'application/json';
	    }
	    options.headers['Content-Type'] = options.headers['Content-Type'] ||
	      'application/json';
	  }

	  if (options.binary) {
	    options.encoding = null;
	    options.json = false;
	  }

	  if (!options.processData) {
	    options.json = false;
	  }

	  return ajax$1(options, function (err, response, body) {
	    if (err) {
	      err.status = response ? response.statusCode : 400;
	      return onError(err, callback);
	    }

	    var error;
	    var content_type = response.headers && response.headers['content-type'];
	    var data = body || defaultBody();

	    // CouchDB doesn't always return the right content-type for JSON data, so
	    // we check for ^{ and }$ (ignoring leading/trailing whitespace)
	    if (!options.binary && (options.json || !options.processData) &&
	        typeof data !== 'object' &&
	        (/json/.test(content_type) ||
	         (/^[\s]*\{/.test(data) && /\}[\s]*$/.test(data)))) {
	      try {
	        data = JSON.parse(data.toString());
	      } catch (e) {}
	    }

	    if (response.statusCode >= 200 && response.statusCode < 300) {
	      onSuccess(data, response, callback);
	    } else {
	      error = pouchdbErrors.generateErrorFromResponse(data);
	      error.status = response.statusCode;
	      callback(error);
	    }
	  });
	}

	function ajax(opts, callback) {

	  // cache-buster, specifically designed to work around IE's aggressive caching
	  // see http://www.dashbay.com/2011/05/internet-explorer-caches-ajax/
	  // Also Safari caches POSTs, so we need to cache-bust those too.
	  var ua = (navigator && navigator.userAgent) ?
	    navigator.userAgent.toLowerCase() : '';

	  var isSafari = ua.indexOf('safari') !== -1 && ua.indexOf('chrome') === -1;
	  var isIE = ua.indexOf('msie') !== -1;
	  var isEdge = ua.indexOf('edge') !== -1;

	  // it appears the new version of safari also caches GETs,
	  // see https://github.com/pouchdb/pouchdb/issues/5010
	  var shouldCacheBust = (isSafari ||
	    ((isIE || isEdge) && opts.method === 'GET'));

	  var cache = 'cache' in opts ? opts.cache : true;

	  var isBlobUrl = /^blob:/.test(opts.url); // don't append nonces for blob URLs

	  if (!isBlobUrl && (shouldCacheBust || !cache)) {
	    var hasArgs = opts.url.indexOf('?') !== -1;
	    opts.url += (hasArgs ? '&' : '?') + '_nonce=' + Date.now();
	  }

	  return ajaxCore(opts, callback);
	}

	module.exports = ajax;

/***/ },
/* 31 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {'use strict';

	function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

	var pouchdbUtils = __webpack_require__(16);
	var pouchdbBinaryUtils = __webpack_require__(22);
	var pouchdbCollate = __webpack_require__(32);
	var Promise = _interopDefault(__webpack_require__(10));
	var pouchdbMd5 = __webpack_require__(23);
	var scopedEval = _interopDefault(__webpack_require__(19));
	var pouchdbMapreduceUtils = __webpack_require__(34);
	var inherits = _interopDefault(__webpack_require__(9));

	function TaskQueue() {
	  this.promise = new Promise(function (fulfill) {fulfill(); });
	}
	TaskQueue.prototype.add = function (promiseFactory) {
	  this.promise = this.promise.catch(function () {
	    // just recover
	  }).then(function () {
	    return promiseFactory();
	  });
	  return this.promise;
	};
	TaskQueue.prototype.finish = function () {
	  return this.promise;
	};

	function createView(opts) {
	  var sourceDB = opts.db;
	  var viewName = opts.viewName;
	  var mapFun = opts.map;
	  var reduceFun = opts.reduce;
	  var temporary = opts.temporary;

	  // the "undefined" part is for backwards compatibility
	  var viewSignature = mapFun.toString() + (reduceFun && reduceFun.toString()) +
	    'undefined';

	  if (!temporary && sourceDB._cachedViews) {
	    var cachedView = sourceDB._cachedViews[viewSignature];
	    if (cachedView) {
	      return Promise.resolve(cachedView);
	    }
	  }

	  return sourceDB.info().then(function (info) {

	    var depDbName = info.db_name + '-mrview-' +
	      (temporary ? 'temp' : pouchdbMd5.stringMd5(viewSignature));

	    // save the view name in the source db so it can be cleaned up if necessary
	    // (e.g. when the _design doc is deleted, remove all associated view data)
	    function diffFunction(doc) {
	      doc.views = doc.views || {};
	      var fullViewName = viewName;
	      if (fullViewName.indexOf('/') === -1) {
	        fullViewName = viewName + '/' + viewName;
	      }
	      var depDbs = doc.views[fullViewName] = doc.views[fullViewName] || {};
	      /* istanbul ignore if */
	      if (depDbs[depDbName]) {
	        return; // no update necessary
	      }
	      depDbs[depDbName] = true;
	      return doc;
	    }
	    return pouchdbUtils.upsert(sourceDB, '_local/mrviews', diffFunction).then(function () {
	      return sourceDB.registerDependentDatabase(depDbName).then(function (res) {
	        var db = res.db;
	        db.auto_compaction = true;
	        var view = {
	          name: depDbName,
	          db: db,
	          sourceDB: sourceDB,
	          adapter: sourceDB.adapter,
	          mapFun: mapFun,
	          reduceFun: reduceFun
	        };
	        return view.db.get('_local/lastSeq').catch(function (err) {
	          /* istanbul ignore if */
	          if (err.status !== 404) {
	            throw err;
	          }
	        }).then(function (lastSeqDoc) {
	          view.seq = lastSeqDoc ? lastSeqDoc.seq : 0;
	          if (!temporary) {
	            sourceDB._cachedViews = sourceDB._cachedViews || {};
	            sourceDB._cachedViews[viewSignature] = view;
	            view.db.once('destroyed', function () {
	              delete sourceDB._cachedViews[viewSignature];
	            });
	          }
	          return view;
	        });
	      });
	    });
	  });
	}

	function evalfunc(func, emit, sum, log, isArray, toJSON) {
	  return scopedEval(
	    "return (" + func.replace(/;\s*$/, "") + ");",
	    {
	      emit: emit,
	      sum: sum,
	      log: log,
	      isArray: isArray,
	      toJSON: toJSON
	    }
	  );
	}

	var persistentQueues = {};
	var tempViewQueue = new TaskQueue();
	var CHANGES_BATCH_SIZE = 50;

	var log = pouchdbUtils.guardedConsole.bind(null, 'log');

	function parseViewName(name) {
	  // can be either 'ddocname/viewname' or just 'viewname'
	  // (where the ddoc name is the same)
	  return name.indexOf('/') === -1 ? [name, name] : name.split('/');
	}

	function isGenOne(changes) {
	  // only return true if the current change is 1-
	  // and there are no other leafs
	  return changes.length === 1 && /^1-/.test(changes[0].rev);
	}

	function emitError(db, e) {
	  try {
	    db.emit('error', e);
	  } catch (err) {
	    pouchdbUtils.guardedConsole('error',
	      'The user\'s map/reduce function threw an uncaught error.\n' +
	      'You can debug this error by doing:\n' +
	      'myDatabase.on(\'error\', function (err) { debugger; });\n' +
	      'Please double-check your map/reduce function.');
	    pouchdbUtils.guardedConsole('error', e);
	  }
	}

	function tryCode(db, fun, args) {
	  // emit an event if there was an error thrown by a map/reduce function.
	  // putting try/catches in a single function also avoids deoptimizations.
	  try {
	    return {
	      output : fun.apply(null, args)
	    };
	  } catch (e) {
	    emitError(db, e);
	    return {error: e};
	  }
	}

	function sortByKeyThenValue(x, y) {
	  var keyCompare = pouchdbCollate.collate(x.key, y.key);
	  return keyCompare !== 0 ? keyCompare : pouchdbCollate.collate(x.value, y.value);
	}

	function sliceResults(results, limit, skip) {
	  skip = skip || 0;
	  if (typeof limit === 'number') {
	    return results.slice(skip, limit + skip);
	  } else if (skip > 0) {
	    return results.slice(skip);
	  }
	  return results;
	}

	function rowToDocId(row) {
	  var val = row.value;
	  // Users can explicitly specify a joined doc _id, or it
	  // defaults to the doc _id that emitted the key/value.
	  var docId = (val && typeof val === 'object' && val._id) || row.id;
	  return docId;
	}

	function readAttachmentsAsBlobOrBuffer(res) {
	  res.rows.forEach(function (row) {
	    var atts = row.doc && row.doc._attachments;
	    if (!atts) {
	      return;
	    }
	    Object.keys(atts).forEach(function (filename) {
	      var att = atts[filename];
	      atts[filename].data = pouchdbBinaryUtils.base64StringToBlobOrBuffer(att.data, att.content_type);
	    });
	  });
	}

	function postprocessAttachments(opts) {
	  return function (res) {
	    if (opts.include_docs && opts.attachments && opts.binary) {
	      readAttachmentsAsBlobOrBuffer(res);
	    }
	    return res;
	  };
	}

	function createBuiltInError(name) {
	  var message = 'builtin ' + name +
	    ' function requires map values to be numbers' +
	    ' or number arrays';
	  return new BuiltInError(message);
	}

	function sum(values) {
	  var result = 0;
	  for (var i = 0, len = values.length; i < len; i++) {
	    var num = values[i];
	    if (typeof num !== 'number') {
	      if (Array.isArray(num)) {
	        // lists of numbers are also allowed, sum them separately
	        result = typeof result === 'number' ? [result] : result;
	        for (var j = 0, jLen = num.length; j < jLen; j++) {
	          var jNum = num[j];
	          if (typeof jNum !== 'number') {
	            throw createBuiltInError('_sum');
	          } else if (typeof result[j] === 'undefined') {
	            result.push(jNum);
	          } else {
	            result[j] += jNum;
	          }
	        }
	      } else { // not array/number
	        throw createBuiltInError('_sum');
	      }
	    } else if (typeof result === 'number') {
	      result += num;
	    } else { // add number to array
	      result[0] += num;
	    }
	  }
	  return result;
	}

	var builtInReduce = {
	  _sum: function (keys, values) {
	    return sum(values);
	  },

	  _count: function (keys, values) {
	    return values.length;
	  },

	  _stats: function (keys, values) {
	    // no need to implement rereduce=true, because Pouch
	    // will never call it
	    function sumsqr(values) {
	      var _sumsqr = 0;
	      for (var i = 0, len = values.length; i < len; i++) {
	        var num = values[i];
	        _sumsqr += (num * num);
	      }
	      return _sumsqr;
	    }
	    return {
	      sum     : sum(values),
	      min     : Math.min.apply(null, values),
	      max     : Math.max.apply(null, values),
	      count   : values.length,
	      sumsqr : sumsqr(values)
	    };
	  }
	};

	function addHttpParam(paramName, opts, params, asJson) {
	  // add an http param from opts to params, optionally json-encoded
	  var val = opts[paramName];
	  if (typeof val !== 'undefined') {
	    if (asJson) {
	      val = encodeURIComponent(JSON.stringify(val));
	    }
	    params.push(paramName + '=' + val);
	  }
	}

	function coerceInteger(integerCandidate) {
	  if (typeof integerCandidate !== 'undefined') {
	    var asNumber = Number(integerCandidate);
	    // prevents e.g. '1foo' or '1.1' being coerced to 1
	    if (!isNaN(asNumber) && asNumber === parseInt(integerCandidate, 10)) {
	      return asNumber;
	    } else {
	      return integerCandidate;
	    }
	  }
	}

	function coerceOptions(opts) {
	  opts.group_level = coerceInteger(opts.group_level);
	  opts.limit = coerceInteger(opts.limit);
	  opts.skip = coerceInteger(opts.skip);
	  return opts;
	}

	function checkPositiveInteger(number) {
	  if (number) {
	    if (typeof number !== 'number') {
	      return  new QueryParseError('Invalid value for integer: "' +
	      number + '"');
	    }
	    if (number < 0) {
	      return new QueryParseError('Invalid value for positive integer: ' +
	        '"' + number + '"');
	    }
	  }
	}

	function checkQueryParseError(options, fun) {
	  var startkeyName = options.descending ? 'endkey' : 'startkey';
	  var endkeyName = options.descending ? 'startkey' : 'endkey';

	  if (typeof options[startkeyName] !== 'undefined' &&
	    typeof options[endkeyName] !== 'undefined' &&
	    pouchdbCollate.collate(options[startkeyName], options[endkeyName]) > 0) {
	    throw new QueryParseError('No rows can match your key range, ' +
	    'reverse your start_key and end_key or set {descending : true}');
	  } else if (fun.reduce && options.reduce !== false) {
	    if (options.include_docs) {
	      throw new QueryParseError('{include_docs:true} is invalid for reduce');
	    } else if (options.keys && options.keys.length > 1 &&
	        !options.group && !options.group_level) {
	      throw new QueryParseError('Multi-key fetches for reduce views must use ' +
	      '{group: true}');
	    }
	  }
	  ['group_level', 'limit', 'skip'].forEach(function (optionName) {
	    var error = checkPositiveInteger(options[optionName]);
	    if (error) {
	      throw error;
	    }
	  });
	}

	function httpQuery(db, fun, opts) {
	  // List of parameters to add to the PUT request
	  var params = [];
	  var body;
	  var method = 'GET';

	  // If opts.reduce exists and is defined, then add it to the list
	  // of parameters.
	  // If reduce=false then the results are that of only the map function
	  // not the final result of map and reduce.
	  addHttpParam('reduce', opts, params);
	  addHttpParam('include_docs', opts, params);
	  addHttpParam('attachments', opts, params);
	  addHttpParam('limit', opts, params);
	  addHttpParam('descending', opts, params);
	  addHttpParam('group', opts, params);
	  addHttpParam('group_level', opts, params);
	  addHttpParam('skip', opts, params);
	  addHttpParam('stale', opts, params);
	  addHttpParam('conflicts', opts, params);
	  addHttpParam('startkey', opts, params, true);
	  addHttpParam('start_key', opts, params, true);
	  addHttpParam('endkey', opts, params, true);
	  addHttpParam('end_key', opts, params, true);
	  addHttpParam('inclusive_end', opts, params);
	  addHttpParam('key', opts, params, true);

	  // Format the list of parameters into a valid URI query string
	  params = params.join('&');
	  params = params === '' ? '' : '?' + params;

	  // If keys are supplied, issue a POST to circumvent GET query string limits
	  // see http://wiki.apache.org/couchdb/HTTP_view_API#Querying_Options
	  if (typeof opts.keys !== 'undefined') {
	    var MAX_URL_LENGTH = 2000;
	    // according to http://stackoverflow.com/a/417184/680742,
	    // the de facto URL length limit is 2000 characters

	    var keysAsString =
	      'keys=' + encodeURIComponent(JSON.stringify(opts.keys));
	    if (keysAsString.length + params.length + 1 <= MAX_URL_LENGTH) {
	      // If the keys are short enough, do a GET. we do this to work around
	      // Safari not understanding 304s on POSTs (see pouchdb/pouchdb#1239)
	      params += (params[0] === '?' ? '&' : '?') + keysAsString;
	    } else {
	      method = 'POST';
	      if (typeof fun === 'string') {
	        body = {keys: opts.keys};
	      } else { // fun is {map : mapfun}, so append to this
	        fun.keys = opts.keys;
	      }
	    }
	  }

	  // We are referencing a query defined in the design doc
	  if (typeof fun === 'string') {
	    var parts = parseViewName(fun);
	    return db.request({
	      method: method,
	      url: '_design/' + parts[0] + '/_view/' + parts[1] + params,
	      body: body
	    }).then(postprocessAttachments(opts));
	  }

	  // We are using a temporary view, terrible for performance, good for testing
	  body = body || {};
	  Object.keys(fun).forEach(function (key) {
	    if (Array.isArray(fun[key])) {
	      body[key] = fun[key];
	    } else {
	      body[key] = fun[key].toString();
	    }
	  });
	  return db.request({
	    method: 'POST',
	    url: '_temp_view' + params,
	    body: body
	  }).then(postprocessAttachments(opts));
	}

	// custom adapters can define their own api._query
	// and override the default behavior
	/* istanbul ignore next */
	function customQuery(db, fun, opts) {
	  return new Promise(function (resolve, reject) {
	    db._query(fun, opts, function (err, res) {
	      if (err) {
	        return reject(err);
	      }
	      resolve(res);
	    });
	  });
	}

	// custom adapters can define their own api._viewCleanup
	// and override the default behavior
	/* istanbul ignore next */
	function customViewCleanup(db) {
	  return new Promise(function (resolve, reject) {
	    db._viewCleanup(function (err, res) {
	      if (err) {
	        return reject(err);
	      }
	      resolve(res);
	    });
	  });
	}

	function defaultsTo(value) {
	  return function (reason) {
	    /* istanbul ignore else */
	    if (reason.status === 404) {
	      return value;
	    } else {
	      throw reason;
	    }
	  };
	}

	// returns a promise for a list of docs to update, based on the input docId.
	// the order doesn't matter, because post-3.2.0, bulkDocs
	// is an atomic operation in all three adapters.
	function getDocsToPersist(docId, view, docIdsToChangesAndEmits) {
	  var metaDocId = '_local/doc_' + docId;
	  var defaultMetaDoc = {_id: metaDocId, keys: []};
	  var docData = docIdsToChangesAndEmits[docId];
	  var indexableKeysToKeyValues = docData.indexableKeysToKeyValues;
	  var changes = docData.changes;

	  function getMetaDoc() {
	    if (isGenOne(changes)) {
	      // generation 1, so we can safely assume initial state
	      // for performance reasons (avoids unnecessary GETs)
	      return Promise.resolve(defaultMetaDoc);
	    }
	    return view.db.get(metaDocId).catch(defaultsTo(defaultMetaDoc));
	  }

	  function getKeyValueDocs(metaDoc) {
	    if (!metaDoc.keys.length) {
	      // no keys, no need for a lookup
	      return Promise.resolve({rows: []});
	    }
	    return view.db.allDocs({
	      keys: metaDoc.keys,
	      include_docs: true
	    });
	  }

	  function processKvDocs(metaDoc, kvDocsRes) {
	    var kvDocs = [];
	    var oldKeysMap = {};

	    for (var i = 0, len = kvDocsRes.rows.length; i < len; i++) {
	      var row = kvDocsRes.rows[i];
	      var doc = row.doc;
	      if (!doc) { // deleted
	        continue;
	      }
	      kvDocs.push(doc);
	      oldKeysMap[doc._id] = true;
	      doc._deleted = !indexableKeysToKeyValues[doc._id];
	      if (!doc._deleted) {
	        var keyValue = indexableKeysToKeyValues[doc._id];
	        if ('value' in keyValue) {
	          doc.value = keyValue.value;
	        }
	      }
	    }

	    var newKeys = Object.keys(indexableKeysToKeyValues);
	    newKeys.forEach(function (key) {
	      if (!oldKeysMap[key]) {
	        // new doc
	        var kvDoc = {
	          _id: key
	        };
	        var keyValue = indexableKeysToKeyValues[key];
	        if ('value' in keyValue) {
	          kvDoc.value = keyValue.value;
	        }
	        kvDocs.push(kvDoc);
	      }
	    });
	    metaDoc.keys = pouchdbMapreduceUtils.uniq(newKeys.concat(metaDoc.keys));
	    kvDocs.push(metaDoc);

	    return kvDocs;
	  }

	  return getMetaDoc().then(function (metaDoc) {
	    return getKeyValueDocs(metaDoc).then(function (kvDocsRes) {
	      return processKvDocs(metaDoc, kvDocsRes);
	    });
	  });
	}

	// updates all emitted key/value docs and metaDocs in the mrview database
	// for the given batch of documents from the source database
	function saveKeyValues(view, docIdsToChangesAndEmits, seq) {
	  var seqDocId = '_local/lastSeq';
	  return view.db.get(seqDocId)
	  .catch(defaultsTo({_id: seqDocId, seq: 0}))
	  .then(function (lastSeqDoc) {
	    var docIds = Object.keys(docIdsToChangesAndEmits);
	    return Promise.all(docIds.map(function (docId) {
	      return getDocsToPersist(docId, view, docIdsToChangesAndEmits);
	    })).then(function (listOfDocsToPersist) {
	      var docsToPersist = pouchdbUtils.flatten(listOfDocsToPersist);
	      lastSeqDoc.seq = seq;
	      docsToPersist.push(lastSeqDoc);
	      // write all docs in a single operation, update the seq once
	      return view.db.bulkDocs({docs : docsToPersist});
	    });
	  });
	}

	function getQueue(view) {
	  var viewName = typeof view === 'string' ? view : view.name;
	  var queue = persistentQueues[viewName];
	  if (!queue) {
	    queue = persistentQueues[viewName] = new TaskQueue();
	  }
	  return queue;
	}

	function updateView(view) {
	  return pouchdbMapreduceUtils.sequentialize(getQueue(view), function () {
	    return updateViewInQueue(view);
	  })();
	}

	function updateViewInQueue(view) {
	  // bind the emit function once
	  var mapResults;
	  var doc;

	  function emit(key, value) {
	    var output = {id: doc._id, key: pouchdbCollate.normalizeKey(key)};
	    // Don't explicitly store the value unless it's defined and non-null.
	    // This saves on storage space, because often people don't use it.
	    if (typeof value !== 'undefined' && value !== null) {
	      output.value = pouchdbCollate.normalizeKey(value);
	    }
	    mapResults.push(output);
	  }

	  var mapFun;
	  // for temp_views one can use emit(doc, emit), see #38
	  if (typeof view.mapFun === "function" && view.mapFun.length === 2) {
	    var origMap = view.mapFun;
	    mapFun = function (doc) {
	      return origMap(doc, emit);
	    };
	  } else {
	    mapFun = evalfunc(view.mapFun.toString(), emit, sum, log, Array.isArray,
	      JSON.parse);
	  }

	  var currentSeq = view.seq || 0;

	  function processChange(docIdsToChangesAndEmits, seq) {
	    return function () {
	      return saveKeyValues(view, docIdsToChangesAndEmits, seq);
	    };
	  }

	  var queue = new TaskQueue();
	  // TODO(neojski): https://github.com/daleharvey/pouchdb/issues/1521

	  return new Promise(function (resolve, reject) {

	    function complete() {
	      queue.finish().then(function () {
	        view.seq = currentSeq;
	        resolve();
	      });
	    }

	    function processNextBatch() {
	      view.sourceDB.changes({
	        conflicts: true,
	        include_docs: true,
	        style: 'all_docs',
	        since: currentSeq,
	        limit: CHANGES_BATCH_SIZE
	      }).on('complete', function (response) {
	        var results = response.results;
	        if (!results.length) {
	          return complete();
	        }
	        var docIdsToChangesAndEmits = {};
	        for (var i = 0, l = results.length; i < l; i++) {
	          var change = results[i];
	          if (change.doc._id[0] !== '_') {
	            mapResults = [];
	            doc = change.doc;

	            if (!doc._deleted) {
	              tryCode(view.sourceDB, mapFun, [doc]);
	            }
	            mapResults.sort(sortByKeyThenValue);

	            var indexableKeysToKeyValues = {};
	            var lastKey;
	            for (var j = 0, jl = mapResults.length; j < jl; j++) {
	              var obj = mapResults[j];
	              var complexKey = [obj.key, obj.id];
	              if (pouchdbCollate.collate(obj.key, lastKey) === 0) {
	                complexKey.push(j); // dup key+id, so make it unique
	              }
	              var indexableKey = pouchdbCollate.toIndexableString(complexKey);
	              indexableKeysToKeyValues[indexableKey] = obj;
	              lastKey = obj.key;
	            }
	            docIdsToChangesAndEmits[change.doc._id] = {
	              indexableKeysToKeyValues: indexableKeysToKeyValues,
	              changes: change.changes
	            };
	          }
	          currentSeq = change.seq;
	        }
	        queue.add(processChange(docIdsToChangesAndEmits, currentSeq));
	        if (results.length < CHANGES_BATCH_SIZE) {
	          return complete();
	        }
	        return processNextBatch();
	      }).on('error', onError);
	      /* istanbul ignore next */
	      function onError(err) {
	        reject(err);
	      }
	    }

	    processNextBatch();
	  });
	}

	function reduceView(view, results, options) {
	  if (options.group_level === 0) {
	    delete options.group_level;
	  }

	  var shouldGroup = options.group || options.group_level;

	  var reduceFun;
	  if (builtInReduce[view.reduceFun]) {
	    reduceFun = builtInReduce[view.reduceFun];
	  } else {
	    reduceFun = evalfunc(
	      view.reduceFun.toString(), null, sum, log, Array.isArray, JSON.parse);
	  }

	  var groups = [];
	  var lvl = isNaN(options.group_level) ? Number.POSITIVE_INFINITY :
	    options.group_level;
	  results.forEach(function (e) {
	    var last = groups[groups.length - 1];
	    var groupKey = shouldGroup ? e.key : null;

	    // only set group_level for array keys
	    if (shouldGroup && Array.isArray(groupKey)) {
	      groupKey = groupKey.slice(0, lvl);
	    }

	    if (last && pouchdbCollate.collate(last.groupKey, groupKey) === 0) {
	      last.keys.push([e.key, e.id]);
	      last.values.push(e.value);
	      return;
	    }
	    groups.push({
	      keys: [[e.key, e.id]],
	      values: [e.value],
	      groupKey: groupKey
	    });
	  });
	  results = [];
	  for (var i = 0, len = groups.length; i < len; i++) {
	    var e = groups[i];
	    var reduceTry = tryCode(view.sourceDB, reduceFun,
	      [e.keys, e.values, false]);
	    if (reduceTry.error && reduceTry.error instanceof BuiltInError) {
	      // CouchDB returns an error if a built-in errors out
	      throw reduceTry.error;
	    }
	    results.push({
	      // CouchDB just sets the value to null if a non-built-in errors out
	      value: reduceTry.error ? null : reduceTry.output,
	      key: e.groupKey
	    });
	  }
	  // no total_rows/offset when reducing
	  return {rows: sliceResults(results, options.limit, options.skip)};
	}

	function queryView(view, opts) {
	  return pouchdbMapreduceUtils.sequentialize(getQueue(view), function () {
	    return queryViewInQueue(view, opts);
	  })();
	}

	function queryViewInQueue(view, opts) {
	  var totalRows;
	  var shouldReduce = view.reduceFun && opts.reduce !== false;
	  var skip = opts.skip || 0;
	  if (typeof opts.keys !== 'undefined' && !opts.keys.length) {
	    // equivalent query
	    opts.limit = 0;
	    delete opts.keys;
	  }

	  function fetchFromView(viewOpts) {
	    viewOpts.include_docs = true;
	    return view.db.allDocs(viewOpts).then(function (res) {
	      totalRows = res.total_rows;
	      return res.rows.map(function (result) {

	        // implicit migration - in older versions of PouchDB,
	        // we explicitly stored the doc as {id: ..., key: ..., value: ...}
	        // this is tested in a migration test
	        /* istanbul ignore next */
	        if ('value' in result.doc && typeof result.doc.value === 'object' &&
	            result.doc.value !== null) {
	          var keys = Object.keys(result.doc.value).sort();
	          // this detection method is not perfect, but it's unlikely the user
	          // emitted a value which was an object with these 3 exact keys
	          var expectedKeys = ['id', 'key', 'value'];
	          if (!(keys < expectedKeys || keys > expectedKeys)) {
	            return result.doc.value;
	          }
	        }

	        var parsedKeyAndDocId = pouchdbCollate.parseIndexableString(result.doc._id);
	        return {
	          key: parsedKeyAndDocId[0],
	          id: parsedKeyAndDocId[1],
	          value: ('value' in result.doc ? result.doc.value : null)
	        };
	      });
	    });
	  }

	  function onMapResultsReady(rows) {
	    var finalResults;
	    if (shouldReduce) {
	      finalResults = reduceView(view, rows, opts);
	    } else {
	      finalResults = {
	        total_rows: totalRows,
	        offset: skip,
	        rows: rows
	      };
	    }
	    if (opts.include_docs) {
	      var docIds = pouchdbMapreduceUtils.uniq(rows.map(rowToDocId));

	      return view.sourceDB.allDocs({
	        keys: docIds,
	        include_docs: true,
	        conflicts: opts.conflicts,
	        attachments: opts.attachments,
	        binary: opts.binary
	      }).then(function (allDocsRes) {
	        var docIdsToDocs = {};
	        allDocsRes.rows.forEach(function (row) {
	          if (row.doc) {
	            docIdsToDocs['$' + row.id] = row.doc;
	          }
	        });
	        rows.forEach(function (row) {
	          var docId = rowToDocId(row);
	          var doc = docIdsToDocs['$' + docId];
	          if (doc) {
	            row.doc = doc;
	          }
	        });
	        return finalResults;
	      });
	    } else {
	      return finalResults;
	    }
	  }

	  if (typeof opts.keys !== 'undefined') {
	    var keys = opts.keys;
	    var fetchPromises = keys.map(function (key) {
	      var viewOpts = {
	        startkey : pouchdbCollate.toIndexableString([key]),
	        endkey   : pouchdbCollate.toIndexableString([key, {}])
	      };
	      return fetchFromView(viewOpts);
	    });
	    return Promise.all(fetchPromises).then(pouchdbUtils.flatten).then(onMapResultsReady);
	  } else { // normal query, no 'keys'
	    var viewOpts = {
	      descending : opts.descending
	    };
	    if (opts.start_key) {
	        opts.startkey = opts.start_key;
	    }
	    if (opts.end_key) {
	        opts.endkey = opts.end_key;
	    }
	    if (typeof opts.startkey !== 'undefined') {
	      viewOpts.startkey = opts.descending ?
	        pouchdbCollate.toIndexableString([opts.startkey, {}]) :
	        pouchdbCollate.toIndexableString([opts.startkey]);
	    }
	    if (typeof opts.endkey !== 'undefined') {
	      var inclusiveEnd = opts.inclusive_end !== false;
	      if (opts.descending) {
	        inclusiveEnd = !inclusiveEnd;
	      }

	      viewOpts.endkey = pouchdbCollate.toIndexableString(
	        inclusiveEnd ? [opts.endkey, {}] : [opts.endkey]);
	    }
	    if (typeof opts.key !== 'undefined') {
	      var keyStart = pouchdbCollate.toIndexableString([opts.key]);
	      var keyEnd = pouchdbCollate.toIndexableString([opts.key, {}]);
	      if (viewOpts.descending) {
	        viewOpts.endkey = keyStart;
	        viewOpts.startkey = keyEnd;
	      } else {
	        viewOpts.startkey = keyStart;
	        viewOpts.endkey = keyEnd;
	      }
	    }
	    if (!shouldReduce) {
	      if (typeof opts.limit === 'number') {
	        viewOpts.limit = opts.limit;
	      }
	      viewOpts.skip = skip;
	    }
	    return fetchFromView(viewOpts).then(onMapResultsReady);
	  }
	}

	function httpViewCleanup(db) {
	  return db.request({
	    method: 'POST',
	    url: '_view_cleanup'
	  });
	}

	function localViewCleanup(db) {
	  return db.get('_local/mrviews').then(function (metaDoc) {
	    var docsToViews = {};
	    Object.keys(metaDoc.views).forEach(function (fullViewName) {
	      var parts = parseViewName(fullViewName);
	      var designDocName = '_design/' + parts[0];
	      var viewName = parts[1];
	      docsToViews[designDocName] = docsToViews[designDocName] || {};
	      docsToViews[designDocName][viewName] = true;
	    });
	    var opts = {
	      keys : Object.keys(docsToViews),
	      include_docs : true
	    };
	    return db.allDocs(opts).then(function (res) {
	      var viewsToStatus = {};
	      res.rows.forEach(function (row) {
	        var ddocName = row.key.substring(8);
	        Object.keys(docsToViews[row.key]).forEach(function (viewName) {
	          var fullViewName = ddocName + '/' + viewName;
	          /* istanbul ignore if */
	          if (!metaDoc.views[fullViewName]) {
	            // new format, without slashes, to support PouchDB 2.2.0
	            // migration test in pouchdb's browser.migration.js verifies this
	            fullViewName = viewName;
	          }
	          var viewDBNames = Object.keys(metaDoc.views[fullViewName]);
	          // design doc deleted, or view function nonexistent
	          var statusIsGood = row.doc && row.doc.views &&
	            row.doc.views[viewName];
	          viewDBNames.forEach(function (viewDBName) {
	            viewsToStatus[viewDBName] =
	              viewsToStatus[viewDBName] || statusIsGood;
	          });
	        });
	      });
	      var dbsToDelete = Object.keys(viewsToStatus).filter(
	        function (viewDBName) { return !viewsToStatus[viewDBName]; });
	      var destroyPromises = dbsToDelete.map(function (viewDBName) {
	        return pouchdbMapreduceUtils.sequentialize(getQueue(viewDBName), function () {
	          return new db.constructor(viewDBName, db.__opts).destroy();
	        })();
	      });
	      return Promise.all(destroyPromises).then(function () {
	        return {ok: true};
	      });
	    });
	  }, defaultsTo({ok: true}));
	}

	var viewCleanup = pouchdbMapreduceUtils.callbackify(function () {
	  var db = this;
	  if (db.type() === 'http') {
	    return httpViewCleanup(db);
	  }
	  /* istanbul ignore next */
	  if (typeof db._viewCleanup === 'function') {
	    return customViewCleanup(db);
	  }
	  return localViewCleanup(db);
	});

	function queryPromised(db, fun, opts) {
	  if (db.type() === 'http') {
	    return httpQuery(db, fun, opts);
	  }

	  /* istanbul ignore next */
	  if (typeof db._query === 'function') {
	    return customQuery(db, fun, opts);
	  }

	  if (typeof fun !== 'string') {
	    // temp_view
	    checkQueryParseError(opts, fun);

	    var createViewOpts = {
	      db : db,
	      viewName : 'temp_view/temp_view',
	      map : fun.map,
	      reduce : fun.reduce,
	      temporary : true
	    };
	    tempViewQueue.add(function () {
	      return createView(createViewOpts).then(function (view) {
	        function cleanup() {
	          return view.db.destroy();
	        }
	        return pouchdbMapreduceUtils.fin(updateView(view).then(function () {
	          return queryView(view, opts);
	        }), cleanup);
	      });
	    });
	    return tempViewQueue.finish();
	  } else {
	    // persistent view
	    var fullViewName = fun;
	    var parts = parseViewName(fullViewName);
	    var designDocName = parts[0];
	    var viewName = parts[1];
	    return db.get('_design/' + designDocName).then(function (doc) {
	      var fun = doc.views && doc.views[viewName];

	      if (!fun || typeof fun.map !== 'string') {
	        throw new NotFoundError('ddoc ' + designDocName +
	        ' has no view named ' + viewName);
	      }
	      checkQueryParseError(opts, fun);

	      var createViewOpts = {
	        db : db,
	        viewName : fullViewName,
	        map : fun.map,
	        reduce : fun.reduce
	      };
	      return createView(createViewOpts).then(function (view) {
	        if (opts.stale === 'ok' || opts.stale === 'update_after') {
	          if (opts.stale === 'update_after') {
	            process.nextTick(function () {
	              updateView(view);
	            });
	          }
	          return queryView(view, opts);
	        } else { // stale not ok
	          return updateView(view).then(function () {
	            return queryView(view, opts);
	          });
	        }
	      });
	    });
	  }
	}

	var query = function (fun, opts, callback) {
	  if (typeof opts === 'function') {
	    callback = opts;
	    opts = {};
	  }
	  opts = opts ? coerceOptions(opts) : {};

	  if (typeof fun === 'function') {
	    fun = {map : fun};
	  }

	  var db = this;
	  var promise = Promise.resolve().then(function () {
	    return queryPromised(db, fun, opts);
	  });
	  pouchdbMapreduceUtils.promisedCallback(promise, callback);
	  return promise;
	};

	function QueryParseError(message) {
	  this.status = 400;
	  this.name = 'query_parse_error';
	  this.message = message;
	  this.error = true;
	  try {
	    Error.captureStackTrace(this, QueryParseError);
	  } catch (e) {}
	}

	inherits(QueryParseError, Error);

	function NotFoundError(message) {
	  this.status = 404;
	  this.name = 'not_found';
	  this.message = message;
	  this.error = true;
	  try {
	    Error.captureStackTrace(this, NotFoundError);
	  } catch (e) {}
	}

	inherits(NotFoundError, Error);

	function BuiltInError(message) {
	  this.status = 500;
	  this.name = 'invalid_value';
	  this.message = message;
	  this.error = true;
	  try {
	    Error.captureStackTrace(this, BuiltInError);
	  } catch (e) {}
	}

	inherits(BuiltInError, Error);

	var index = {
	  query: query,
	  viewCleanup: viewCleanup
	};

	module.exports = index;
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(4)))

/***/ },
/* 32 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var MIN_MAGNITUDE = -324; // verified by -Number.MIN_VALUE
	var MAGNITUDE_DIGITS = 3; // ditto
	var SEP = ''; // set to '_' for easier debugging 

	var utils = __webpack_require__(33);

	exports.collate = function (a, b) {

	  if (a === b) {
	    return 0;
	  }

	  a = exports.normalizeKey(a);
	  b = exports.normalizeKey(b);

	  var ai = collationIndex(a);
	  var bi = collationIndex(b);
	  if ((ai - bi) !== 0) {
	    return ai - bi;
	  }
	  if (a === null) {
	    return 0;
	  }
	  switch (typeof a) {
	    case 'number':
	      return a - b;
	    case 'boolean':
	      return a === b ? 0 : (a < b ? -1 : 1);
	    case 'string':
	      return stringCollate(a, b);
	  }
	  return Array.isArray(a) ? arrayCollate(a, b) : objectCollate(a, b);
	};

	// couch considers null/NaN/Infinity/-Infinity === undefined,
	// for the purposes of mapreduce indexes. also, dates get stringified.
	exports.normalizeKey = function (key) {
	  switch (typeof key) {
	    case 'undefined':
	      return null;
	    case 'number':
	      if (key === Infinity || key === -Infinity || isNaN(key)) {
	        return null;
	      }
	      return key;
	    case 'object':
	      var origKey = key;
	      if (Array.isArray(key)) {
	        var len = key.length;
	        key = new Array(len);
	        for (var i = 0; i < len; i++) {
	          key[i] = exports.normalizeKey(origKey[i]);
	        }
	      } else if (key instanceof Date) {
	        return key.toJSON();
	      } else if (key !== null) { // generic object
	        key = {};
	        for (var k in origKey) {
	          if (origKey.hasOwnProperty(k)) {
	            var val = origKey[k];
	            if (typeof val !== 'undefined') {
	              key[k] = exports.normalizeKey(val);
	            }
	          }
	        }
	      }
	  }
	  return key;
	};

	function indexify(key) {
	  if (key !== null) {
	    switch (typeof key) {
	      case 'boolean':
	        return key ? 1 : 0;
	      case 'number':
	        return numToIndexableString(key);
	      case 'string':
	        // We've to be sure that key does not contain \u0000
	        // Do order-preserving replacements:
	        // 0 -> 1, 1
	        // 1 -> 1, 2
	        // 2 -> 2, 2
	        return key
	          .replace(/\u0002/g, '\u0002\u0002')
	          .replace(/\u0001/g, '\u0001\u0002')
	          .replace(/\u0000/g, '\u0001\u0001');
	      case 'object':
	        var isArray = Array.isArray(key);
	        var arr = isArray ? key : Object.keys(key);
	        var i = -1;
	        var len = arr.length;
	        var result = '';
	        if (isArray) {
	          while (++i < len) {
	            result += exports.toIndexableString(arr[i]);
	          }
	        } else {
	          while (++i < len) {
	            var objKey = arr[i];
	            result += exports.toIndexableString(objKey) +
	                exports.toIndexableString(key[objKey]);
	          }
	        }
	        return result;
	    }
	  }
	  return '';
	}

	// convert the given key to a string that would be appropriate
	// for lexical sorting, e.g. within a database, where the
	// sorting is the same given by the collate() function.
	exports.toIndexableString = function (key) {
	  var zero = '\u0000';
	  key = exports.normalizeKey(key);
	  return collationIndex(key) + SEP + indexify(key) + zero;
	};

	function parseNumber(str, i) {
	  var originalIdx = i;
	  var num;
	  var zero = str[i] === '1';
	  if (zero) {
	    num = 0;
	    i++;
	  } else {
	    var neg = str[i] === '0';
	    i++;
	    var numAsString = '';
	    var magAsString = str.substring(i, i + MAGNITUDE_DIGITS);
	    var magnitude = parseInt(magAsString, 10) + MIN_MAGNITUDE;
	    if (neg) {
	      magnitude = -magnitude;
	    }
	    i += MAGNITUDE_DIGITS;
	    while (true) {
	      var ch = str[i];
	      if (ch === '\u0000') {
	        break;
	      } else {
	        numAsString += ch;
	      }
	      i++;
	    }
	    numAsString = numAsString.split('.');
	    if (numAsString.length === 1) {
	      num = parseInt(numAsString, 10);
	    } else {
	      num = parseFloat(numAsString[0] + '.' + numAsString[1]);
	    }
	    if (neg) {
	      num = num - 10;
	    }
	    if (magnitude !== 0) {
	      // parseFloat is more reliable than pow due to rounding errors
	      // e.g. Number.MAX_VALUE would return Infinity if we did
	      // num * Math.pow(10, magnitude);
	      num = parseFloat(num + 'e' + magnitude);
	    }
	  }
	  return {num: num, length : i - originalIdx};
	}

	// move up the stack while parsing
	// this function moved outside of parseIndexableString for performance
	function pop(stack, metaStack) {
	  var obj = stack.pop();

	  if (metaStack.length) {
	    var lastMetaElement = metaStack[metaStack.length - 1];
	    if (obj === lastMetaElement.element) {
	      // popping a meta-element, e.g. an object whose value is another object
	      metaStack.pop();
	      lastMetaElement = metaStack[metaStack.length - 1];
	    }
	    var element = lastMetaElement.element;
	    var lastElementIndex = lastMetaElement.index;
	    if (Array.isArray(element)) {
	      element.push(obj);
	    } else if (lastElementIndex === stack.length - 2) { // obj with key+value
	      var key = stack.pop();
	      element[key] = obj;
	    } else {
	      stack.push(obj); // obj with key only
	    }
	  }
	}

	exports.parseIndexableString = function (str) {
	  var stack = [];
	  var metaStack = []; // stack for arrays and objects
	  var i = 0;

	  while (true) {
	    var collationIndex = str[i++];
	    if (collationIndex === '\u0000') {
	      if (stack.length === 1) {
	        return stack.pop();
	      } else {
	        pop(stack, metaStack);
	        continue;
	      }
	    }
	    switch (collationIndex) {
	      case '1':
	        stack.push(null);
	        break;
	      case '2':
	        stack.push(str[i] === '1');
	        i++;
	        break;
	      case '3':
	        var parsedNum = parseNumber(str, i);
	        stack.push(parsedNum.num);
	        i += parsedNum.length;
	        break;
	      case '4':
	        var parsedStr = '';
	        while (true) {
	          var ch = str[i];
	          if (ch === '\u0000') {
	            break;
	          }
	          parsedStr += ch;
	          i++;
	        }
	        // perform the reverse of the order-preserving replacement
	        // algorithm (see above)
	        parsedStr = parsedStr.replace(/\u0001\u0001/g, '\u0000')
	          .replace(/\u0001\u0002/g, '\u0001')
	          .replace(/\u0002\u0002/g, '\u0002');
	        stack.push(parsedStr);
	        break;
	      case '5':
	        var arrayElement = { element: [], index: stack.length };
	        stack.push(arrayElement.element);
	        metaStack.push(arrayElement);
	        break;
	      case '6':
	        var objElement = { element: {}, index: stack.length };
	        stack.push(objElement.element);
	        metaStack.push(objElement);
	        break;
	      default:
	        throw new Error(
	          'bad collationIndex or unexpectedly reached end of input: ' + collationIndex);
	    }
	  }
	};

	function arrayCollate(a, b) {
	  var len = Math.min(a.length, b.length);
	  for (var i = 0; i < len; i++) {
	    var sort = exports.collate(a[i], b[i]);
	    if (sort !== 0) {
	      return sort;
	    }
	  }
	  return (a.length === b.length) ? 0 :
	    (a.length > b.length) ? 1 : -1;
	}
	function stringCollate(a, b) {
	  // See: https://github.com/daleharvey/pouchdb/issues/40
	  // This is incompatible with the CouchDB implementation, but its the
	  // best we can do for now
	  return (a === b) ? 0 : ((a > b) ? 1 : -1);
	}
	function objectCollate(a, b) {
	  var ak = Object.keys(a), bk = Object.keys(b);
	  var len = Math.min(ak.length, bk.length);
	  for (var i = 0; i < len; i++) {
	    // First sort the keys
	    var sort = exports.collate(ak[i], bk[i]);
	    if (sort !== 0) {
	      return sort;
	    }
	    // if the keys are equal sort the values
	    sort = exports.collate(a[ak[i]], b[bk[i]]);
	    if (sort !== 0) {
	      return sort;
	    }

	  }
	  return (ak.length === bk.length) ? 0 :
	    (ak.length > bk.length) ? 1 : -1;
	}
	// The collation is defined by erlangs ordered terms
	// the atoms null, true, false come first, then numbers, strings,
	// arrays, then objects
	// null/undefined/NaN/Infinity/-Infinity are all considered null
	function collationIndex(x) {
	  var id = ['boolean', 'number', 'string', 'object'];
	  var idx = id.indexOf(typeof x);
	  //false if -1 otherwise true, but fast!!!!1
	  if (~idx) {
	    if (x === null) {
	      return 1;
	    }
	    if (Array.isArray(x)) {
	      return 5;
	    }
	    return idx < 3 ? (idx + 2) : (idx + 3);
	  }
	  if (Array.isArray(x)) {
	    return 5;
	  }
	}

	// conversion:
	// x yyy zz...zz
	// x = 0 for negative, 1 for 0, 2 for positive
	// y = exponent (for negative numbers negated) moved so that it's >= 0
	// z = mantisse
	function numToIndexableString(num) {

	  if (num === 0) {
	    return '1';
	  }

	  // convert number to exponential format for easier and
	  // more succinct string sorting
	  var expFormat = num.toExponential().split(/e\+?/);
	  var magnitude = parseInt(expFormat[1], 10);

	  var neg = num < 0;

	  var result = neg ? '0' : '2';

	  // first sort by magnitude
	  // it's easier if all magnitudes are positive
	  var magForComparison = ((neg ? -magnitude : magnitude) - MIN_MAGNITUDE);
	  var magString = utils.padLeft((magForComparison).toString(), '0', MAGNITUDE_DIGITS);

	  result += SEP + magString;

	  // then sort by the factor
	  var factor = Math.abs(parseFloat(expFormat[0])); // [1..10)
	  if (neg) { // for negative reverse ordering
	    factor = 10 - factor;
	  }

	  var factorStr = factor.toFixed(20);

	  // strip zeros from the end
	  factorStr = factorStr.replace(/\.?0+$/, '');

	  result += SEP + factorStr;

	  return result;
	}


/***/ },
/* 33 */
/***/ function(module, exports) {

	'use strict';

	function pad(str, padWith, upToLength) {
	  var padding = '';
	  var targetLength = upToLength - str.length;
	  while (padding.length < targetLength) {
	    padding += padWith;
	  }
	  return padding;
	}

	exports.padLeft = function (str, padWith, upToLength) {
	  var padding = pad(str, padWith, upToLength);
	  return padding + str;
	};

	exports.padRight = function (str, padWith, upToLength) {
	  var padding = pad(str, padWith, upToLength);
	  return str + padding;
	};

	exports.stringLexCompare = function (a, b) {

	  var aLen = a.length;
	  var bLen = b.length;

	  var i;
	  for (i = 0; i < aLen; i++) {
	    if (i === bLen) {
	      // b is shorter substring of a
	      return 1;
	    }
	    var aChar = a.charAt(i);
	    var bChar = b.charAt(i);
	    if (aChar !== bChar) {
	      return aChar < bChar ? -1 : 1;
	    }
	  }

	  if (aLen < bLen) {
	    // a is shorter substring of b
	    return -1;
	  }

	  return 0;
	};

	/*
	 * returns the decimal form for the given integer, i.e. writes
	 * out all the digits (in base-10) instead of using scientific notation
	 */
	exports.intToDecimalForm = function (int) {

	  var isNeg = int < 0;
	  var result = '';

	  do {
	    var remainder = isNeg ? -Math.ceil(int % 10) : Math.floor(int % 10);

	    result = remainder + result;
	    int = isNeg ? Math.ceil(int / 10) : Math.floor(int / 10);
	  } while (int);


	  if (isNeg && result !== '0') {
	    result = '-' + result;
	  }

	  return result;
	};

/***/ },
/* 34 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {'use strict';

	Object.defineProperty(exports, '__esModule', { value: true });

	function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

	var argsarray = _interopDefault(__webpack_require__(14));

	var promisedCallback = function (promise, callback) {
	  if (callback) {
	    promise.then(function (res) {
	      process.nextTick(function () {
	        callback(null, res);
	      });
	    }, function (reason) {
	      process.nextTick(function () {
	        callback(reason);
	      });
	    });
	  }
	  return promise;
	};

	var callbackify = function (fun) {
	  return argsarray(function (args) {
	    var cb = args.pop();
	    var promise = fun.apply(this, args);
	    if (typeof cb === 'function') {
	      promisedCallback(promise, cb);
	    }
	    return promise;
	  });
	};

	// Promise finally util similar to Q.finally
	var fin = function (promise, finalPromiseFactory) {
	  return promise.then(function (res) {
	    return finalPromiseFactory().then(function () {
	      return res;
	    });
	  }, function (reason) {
	    return finalPromiseFactory().then(function () {
	      throw reason;
	    });
	  });
	};

	var sequentialize = function (queue, promiseFactory) {
	  return function () {
	    var args = arguments;
	    var that = this;
	    return queue.add(function () {
	      return promiseFactory.apply(that, args);
	    });
	  };
	};

	// uniq an array of strings, order not guaranteed
	// similar to underscore/lodash _.uniq
	var uniq = function (arr) {
	  var map = {};

	  for (var i = 0, len = arr.length; i < len; i++) {
	    map['$' + arr[i]] = true;
	  }

	  var keys = Object.keys(map);
	  var output = new Array(keys.length);

	  for (i = 0, len = keys.length; i < len; i++) {
	    output[i] = keys[i].substring(1);
	  }
	  return output;
	};

	exports.uniq = uniq;
	exports.sequentialize = sequentialize;
	exports.fin = fin;
	exports.callbackify = callbackify;
	exports.promisedCallback = promisedCallback;
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(4)))

/***/ },
/* 35 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

	var pouchdbUtils = __webpack_require__(16);
	var Promise = _interopDefault(__webpack_require__(10));
	var Checkpointer = _interopDefault(__webpack_require__(36));
	var generateReplicationId = _interopDefault(__webpack_require__(37));
	var events = __webpack_require__(15);
	var inherits = _interopDefault(__webpack_require__(9));
	var pouchdbErrors = __webpack_require__(17);
	var jsExtend = __webpack_require__(5);

	function isGenOne(rev) {
	  return /^1-/.test(rev);
	}

	function fileHasChanged(localDoc, remoteDoc, filename) {
	  return !localDoc._attachments ||
	         !localDoc._attachments[filename] ||
	         localDoc._attachments[filename].digest !== remoteDoc._attachments[filename].digest;
	}

	function getDocAttachments(db, doc) {
	  var filenames = Object.keys(doc._attachments);
	  return Promise.all(filenames.map(function (filename) {
	    return db.getAttachment(doc._id, filename, {rev: doc._rev});
	  }));
	}

	function getDocAttachmentsFromTargetOrSource(target, src, doc) {
	  var doCheckForLocalAttachments = src.type() === 'http' && target.type() !== 'http';
	  var filenames = Object.keys(doc._attachments);

	  if (!doCheckForLocalAttachments) {
	    return getDocAttachments(src, doc);
	  }

	  return target.get(doc._id).then(function (localDoc) {
	    return Promise.all(filenames.map(function (filename) {
	      if (fileHasChanged(localDoc, doc, filename)) {
	        return src.getAttachment(doc._id, filename);
	      }

	      return target.getAttachment(localDoc._id, filename);
	    }));
	  }).catch(function (error) {
	    /* istanbul ignore if */
	    if (error.status !== 404) {
	      throw error;
	    }

	    return getDocAttachments(src, doc);
	  });
	}

	function createBulkGetOpts(diffs) {
	  var requests = [];
	  Object.keys(diffs).forEach(function (id) {
	    var missingRevs = diffs[id].missing;
	    missingRevs.forEach(function (missingRev) {
	      requests.push({
	        id: id,
	        rev: missingRev
	      });
	    });
	  });

	  return {
	    docs: requests,
	    revs: true
	  };
	}

	//
	// Fetch all the documents from the src as described in the "diffs",
	// which is a mapping of docs IDs to revisions. If the state ever
	// changes to "cancelled", then the returned promise will be rejected.
	// Else it will be resolved with a list of fetched documents.
	//
	function getDocs(src, target, diffs, state) {
	  diffs = pouchdbUtils.clone(diffs); // we do not need to modify this

	  var resultDocs = [],
	      ok = true;

	  function getAllDocs() {

	    var bulkGetOpts = createBulkGetOpts(diffs);

	    if (!bulkGetOpts.docs.length) { // optimization: skip empty requests
	      return;
	    }

	    return src.bulkGet(bulkGetOpts).then(function (bulkGetResponse) {
	      /* istanbul ignore if */
	      if (state.cancelled) {
	        throw new Error('cancelled');
	      }
	      return Promise.all(bulkGetResponse.results.map(function (bulkGetInfo) {
	        return Promise.all(bulkGetInfo.docs.map(function (doc) {
	          var remoteDoc = doc.ok;

	          if (doc.error) {
	            // when AUTO_COMPACTION is set, docs can be returned which look
	            // like this: {"missing":"1-7c3ac256b693c462af8442f992b83696"}
	            ok = false;
	          }

	          if (!remoteDoc || !remoteDoc._attachments) {
	            return remoteDoc;
	          }

	          return getDocAttachmentsFromTargetOrSource(target, src, remoteDoc).then(function (attachments) {
	            var filenames = Object.keys(remoteDoc._attachments);
	            attachments.forEach(function (attachment, i) {
	              var att = remoteDoc._attachments[filenames[i]];
	              delete att.stub;
	              delete att.length;
	              att.data = attachment;
	            });

	            return remoteDoc;
	          });
	        }));
	      }))

	      .then(function (results) {
	        resultDocs = resultDocs.concat(pouchdbUtils.flatten(results).filter(Boolean));
	      });
	    });
	  }

	  function hasAttachments(doc) {
	    return doc._attachments && Object.keys(doc._attachments).length > 0;
	  }

	  function fetchRevisionOneDocs(ids) {
	    // Optimization: fetch gen-1 docs and attachments in
	    // a single request using _all_docs
	    return src.allDocs({
	      keys: ids,
	      include_docs: true
	    }).then(function (res) {
	      if (state.cancelled) {
	        throw new Error('cancelled');
	      }
	      res.rows.forEach(function (row) {
	        if (row.deleted || !row.doc || !isGenOne(row.value.rev) ||
	            hasAttachments(row.doc)) {
	          // if any of these conditions apply, we need to fetch using get()
	          return;
	        }

	        // the doc we got back from allDocs() is sufficient
	        resultDocs.push(row.doc);
	        delete diffs[row.id];
	      });
	    });
	  }

	  function getRevisionOneDocs() {
	    // filter out the generation 1 docs and get them
	    // leaving the non-generation one docs to be got otherwise
	    var ids = Object.keys(diffs).filter(function (id) {
	      var missing = diffs[id].missing;
	      return missing.length === 1 && isGenOne(missing[0]);
	    });
	    if (ids.length > 0) {
	      return fetchRevisionOneDocs(ids);
	    }
	  }

	  function returnResult() {
	    return { ok:ok, docs:resultDocs };
	  }

	  return Promise.resolve()
	    .then(getRevisionOneDocs)
	    .then(getAllDocs)
	    .then(returnResult);
	}

	var STARTING_BACK_OFF = 0;

	function backOff(opts, returnValue, error, callback) {
	  if (opts.retry === false) {
	    returnValue.emit('error', error);
	    returnValue.removeAllListeners();
	    return;
	  }
	  if (typeof opts.back_off_function !== 'function') {
	    opts.back_off_function = pouchdbUtils.defaultBackOff;
	  }
	  returnValue.emit('requestError', error);
	  if (returnValue.state === 'active' || returnValue.state === 'pending') {
	    returnValue.emit('paused', error);
	    returnValue.state = 'stopped';
	    returnValue.once('active', function () {
	      opts.current_back_off = STARTING_BACK_OFF;
	    });
	  }

	  opts.current_back_off = opts.current_back_off || STARTING_BACK_OFF;
	  opts.current_back_off = opts.back_off_function(opts.current_back_off);
	  setTimeout(callback, opts.current_back_off);
	}

	function replicate$1(src, target, opts, returnValue, result) {
	  var batches = [];               // list of batches to be processed
	  var currentBatch;               // the batch currently being processed
	  var pendingBatch = {
	    seq: 0,
	    changes: [],
	    docs: []
	  }; // next batch, not yet ready to be processed
	  var writingCheckpoint = false;  // true while checkpoint is being written
	  var changesCompleted = false;   // true when all changes received
	  var replicationCompleted = false; // true when replication has completed
	  var last_seq = 0;
	  var continuous = opts.continuous || opts.live || false;
	  var batch_size = opts.batch_size || 100;
	  var batches_limit = opts.batches_limit || 10;
	  var changesPending = false;     // true while src.changes is running
	  var doc_ids = opts.doc_ids;
	  var repId;
	  var checkpointer;
	  var allErrors = [];
	  var changedDocs = [];
	  // Like couchdb, every replication gets a unique session id
	  var session = pouchdbUtils.uuid();

	  result = result || {
	    ok: true,
	    start_time: new Date(),
	    docs_read: 0,
	    docs_written: 0,
	    doc_write_failures: 0,
	    errors: []
	  };

	  var changesOpts = {};
	  returnValue.ready(src, target);

	  function initCheckpointer() {
	    if (checkpointer) {
	      return Promise.resolve();
	    }
	    return generateReplicationId(src, target, opts).then(function (res) {
	      repId = res;
	      checkpointer = new Checkpointer(src, target, repId, returnValue);
	    });
	  }

	  function writeDocs() {
	    changedDocs = [];

	    if (currentBatch.docs.length === 0) {
	      return;
	    }
	    var docs = currentBatch.docs;
	    return target.bulkDocs({docs: docs, new_edits: false}).then(function (res) {
	      /* istanbul ignore if */
	      if (returnValue.cancelled) {
	        completeReplication();
	        throw new Error('cancelled');
	      }
	      var errors = [];
	      var errorsById = {};
	      res.forEach(function (res) {
	        if (res.error) {
	          result.doc_write_failures++;
	          errors.push(res);
	          errorsById[res.id] = res;
	        }
	      });
	      allErrors = allErrors.concat(errors);
	      result.docs_written += currentBatch.docs.length - errors.length;
	      var non403s = errors.filter(function (error) {
	        return error.name !== 'unauthorized' && error.name !== 'forbidden';
	      });

	      docs.forEach(function (doc) {
	        var error = errorsById[doc._id];
	        if (error) {
	          returnValue.emit('denied', pouchdbUtils.clone(error));
	        } else {
	          changedDocs.push(doc);
	        }
	      });

	      if (non403s.length > 0) {
	        var error = new Error('bulkDocs error');
	        error.other_errors = errors;
	        abortReplication('target.bulkDocs failed to write docs', error);
	        throw new Error('bulkWrite partial failure');
	      }
	    }, function (err) {
	      result.doc_write_failures += docs.length;
	      throw err;
	    });
	  }

	  function finishBatch() {
	    if (currentBatch.error) {
	      throw new Error('There was a problem getting docs.');
	    }
	    result.last_seq = last_seq = currentBatch.seq;
	    var outResult = pouchdbUtils.clone(result);
	    if (changedDocs.length) {
	      outResult.docs = changedDocs;
	      returnValue.emit('change', outResult);
	    }
	    writingCheckpoint = true;
	    return checkpointer.writeCheckpoint(currentBatch.seq,
	        session).then(function () {
	      writingCheckpoint = false;
	      /* istanbul ignore if */
	      if (returnValue.cancelled) {
	        completeReplication();
	        throw new Error('cancelled');
	      }
	      currentBatch = undefined;
	      getChanges();
	    }).catch(onCheckpointError);
	  }

	  function getDiffs() {
	    var diff = {};
	    currentBatch.changes.forEach(function (change) {
	      // Couchbase Sync Gateway emits these, but we can ignore them
	      /* istanbul ignore if */
	      if (change.id === "_user/") {
	        return;
	      }
	      diff[change.id] = change.changes.map(function (x) {
	        return x.rev;
	      });
	    });
	    return target.revsDiff(diff).then(function (diffs) {
	      /* istanbul ignore if */
	      if (returnValue.cancelled) {
	        completeReplication();
	        throw new Error('cancelled');
	      }
	      // currentBatch.diffs elements are deleted as the documents are written
	      currentBatch.diffs = diffs;
	    });
	  }

	  function getBatchDocs() {
	    return getDocs(src, target, currentBatch.diffs, returnValue).then(function (got) {
	      currentBatch.error = !got.ok;
	      got.docs.forEach(function (doc) {
	        delete currentBatch.diffs[doc._id];
	        result.docs_read++;
	        currentBatch.docs.push(doc);
	      });
	    });
	  }

	  function startNextBatch() {
	    if (returnValue.cancelled || currentBatch) {
	      return;
	    }
	    if (batches.length === 0) {
	      processPendingBatch(true);
	      return;
	    }
	    currentBatch = batches.shift();
	    getDiffs()
	      .then(getBatchDocs)
	      .then(writeDocs)
	      .then(finishBatch)
	      .then(startNextBatch)
	      .catch(function (err) {
	        abortReplication('batch processing terminated with error', err);
	      });
	  }


	  function processPendingBatch(immediate) {
	    if (pendingBatch.changes.length === 0) {
	      if (batches.length === 0 && !currentBatch) {
	        if ((continuous && changesOpts.live) || changesCompleted) {
	          returnValue.state = 'pending';
	          returnValue.emit('paused');
	        }
	        if (changesCompleted) {
	          completeReplication();
	        }
	      }
	      return;
	    }
	    if (
	      immediate ||
	      changesCompleted ||
	      pendingBatch.changes.length >= batch_size
	    ) {
	      batches.push(pendingBatch);
	      pendingBatch = {
	        seq: 0,
	        changes: [],
	        docs: []
	      };
	      if (returnValue.state === 'pending' || returnValue.state === 'stopped') {
	        returnValue.state = 'active';
	        returnValue.emit('active');
	      }
	      startNextBatch();
	    }
	  }


	  function abortReplication(reason, err) {
	    if (replicationCompleted) {
	      return;
	    }
	    if (!err.message) {
	      err.message = reason;
	    }
	    result.ok = false;
	    result.status = 'aborting';
	    result.errors.push(err);
	    allErrors = allErrors.concat(err);
	    batches = [];
	    pendingBatch = {
	      seq: 0,
	      changes: [],
	      docs: []
	    };
	    completeReplication();
	  }


	  function completeReplication() {
	    if (replicationCompleted) {
	      return;
	    }
	    /* istanbul ignore if */
	    if (returnValue.cancelled) {
	      result.status = 'cancelled';
	      if (writingCheckpoint) {
	        return;
	      }
	    }
	    result.status = result.status || 'complete';
	    result.end_time = new Date();
	    result.last_seq = last_seq;
	    replicationCompleted = true;
	    var non403s = allErrors.filter(function (error) {
	      return error.name !== 'unauthorized' && error.name !== 'forbidden';
	    });
	    if (non403s.length > 0) {
	      var error = allErrors.pop();
	      if (allErrors.length > 0) {
	        error.other_errors = allErrors;
	      }
	      error.result = result;
	      backOff(opts, returnValue, error, function () {
	        replicate$1(src, target, opts, returnValue);
	      });
	    } else {
	      result.errors = allErrors;
	      returnValue.emit('complete', result);
	      returnValue.removeAllListeners();
	    }
	  }


	  function onChange(change) {
	    /* istanbul ignore if */
	    if (returnValue.cancelled) {
	      return completeReplication();
	    }
	    var filter = pouchdbUtils.filterChange(opts)(change);
	    if (!filter) {
	      return;
	    }
	    pendingBatch.seq = change.seq;
	    pendingBatch.changes.push(change);
	    processPendingBatch(batches.length === 0 && changesOpts.live);
	  }


	  function onChangesComplete(changes) {
	    changesPending = false;
	    /* istanbul ignore if */
	    if (returnValue.cancelled) {
	      return completeReplication();
	    }

	    // if no results were returned then we're done,
	    // else fetch more
	    if (changes.results.length > 0) {
	      changesOpts.since = changes.last_seq;
	      getChanges();
	      processPendingBatch(true);
	    } else {

	      var complete = function () {
	        if (continuous) {
	          changesOpts.live = true;
	          getChanges();
	        } else {
	          changesCompleted = true;
	        }
	        processPendingBatch(true);
	      };

	      // update the checkpoint so we start from the right seq next time
	      if (!currentBatch && changes.results.length === 0) {
	        writingCheckpoint = true;
	        checkpointer.writeCheckpoint(changes.last_seq,
	            session).then(function () {
	          writingCheckpoint = false;
	          result.last_seq = last_seq = changes.last_seq;
	          complete();
	        })
	        .catch(onCheckpointError);
	      } else {
	        complete();
	      }
	    }
	  }


	  function onChangesError(err) {
	    changesPending = false;
	    /* istanbul ignore if */
	    if (returnValue.cancelled) {
	      return completeReplication();
	    }
	    abortReplication('changes rejected', err);
	  }


	  function getChanges() {
	    if (!(
	      !changesPending &&
	      !changesCompleted &&
	      batches.length < batches_limit
	      )) {
	      return;
	    }
	    changesPending = true;
	    function abortChanges() {
	      changes.cancel();
	    }
	    function removeListener() {
	      returnValue.removeListener('cancel', abortChanges);
	    }

	    if (returnValue._changes) { // remove old changes() and listeners
	      returnValue.removeListener('cancel', returnValue._abortChanges);
	      returnValue._changes.cancel();
	    }
	    returnValue.once('cancel', abortChanges);

	    var changes = src.changes(changesOpts)
	      .on('change', onChange);
	    changes.then(removeListener, removeListener);
	    changes.then(onChangesComplete)
	      .catch(onChangesError);

	    if (opts.retry) {
	      // save for later so we can cancel if necessary
	      returnValue._changes = changes;
	      returnValue._abortChanges = abortChanges;
	    }
	  }


	  function startChanges() {
	    initCheckpointer().then(function () {
	      /* istanbul ignore if */
	      if (returnValue.cancelled) {
	        completeReplication();
	        return;
	      }
	      return checkpointer.getCheckpoint().then(function (checkpoint) {
	        last_seq = checkpoint;
	        changesOpts = {
	          since: last_seq,
	          limit: batch_size,
	          batch_size: batch_size,
	          style: 'all_docs',
	          doc_ids: doc_ids,
	          return_docs: true // required so we know when we're done
	        };
	        if (opts.filter) {
	          if (typeof opts.filter !== 'string') {
	            // required for the client-side filter in onChange
	            changesOpts.include_docs = true;
	          } else { // ddoc filter
	            changesOpts.filter = opts.filter;
	          }
	        }
	        if ('heartbeat' in opts) {
	          changesOpts.heartbeat = opts.heartbeat;
	        }
	        if ('timeout' in opts) {
	          changesOpts.timeout = opts.timeout;
	        }
	        if (opts.query_params) {
	          changesOpts.query_params = opts.query_params;
	        }
	        if (opts.view) {
	          changesOpts.view = opts.view;
	        }
	        getChanges();
	      });
	    }).catch(function (err) {
	      abortReplication('getCheckpoint rejected with ', err);
	    });
	  }

	  /* istanbul ignore next */
	  function onCheckpointError(err) {
	    writingCheckpoint = false;
	    abortReplication('writeCheckpoint completed with error', err);
	    throw err;
	  }

	  /* istanbul ignore if */
	  if (returnValue.cancelled) { // cancelled immediately
	    completeReplication();
	    return;
	  }

	  if (!returnValue._addedListeners) {
	    returnValue.once('cancel', completeReplication);

	    if (typeof opts.complete === 'function') {
	      returnValue.once('error', opts.complete);
	      returnValue.once('complete', function (result) {
	        opts.complete(null, result);
	      });
	    }
	    returnValue._addedListeners = true;
	  }

	  if (typeof opts.since === 'undefined') {
	    startChanges();
	  } else {
	    initCheckpointer().then(function () {
	      writingCheckpoint = true;
	      return checkpointer.writeCheckpoint(opts.since, session);
	    }).then(function () {
	      writingCheckpoint = false;
	      /* istanbul ignore if */
	      if (returnValue.cancelled) {
	        completeReplication();
	        return;
	      }
	      last_seq = opts.since;
	      startChanges();
	    }).catch(onCheckpointError);
	  }
	}

	// We create a basic promise so the caller can cancel the replication possibly
	// before we have actually started listening to changes etc
	inherits(Replication, events.EventEmitter);
	function Replication() {
	  events.EventEmitter.call(this);
	  this.cancelled = false;
	  this.state = 'pending';
	  var self = this;
	  var promise = new Promise(function (fulfill, reject) {
	    self.once('complete', fulfill);
	    self.once('error', reject);
	  });
	  self.then = function (resolve, reject) {
	    return promise.then(resolve, reject);
	  };
	  self.catch = function (reject) {
	    return promise.catch(reject);
	  };
	  // As we allow error handling via "error" event as well,
	  // put a stub in here so that rejecting never throws UnhandledError.
	  self.catch(function () {});
	}

	Replication.prototype.cancel = function () {
	  this.cancelled = true;
	  this.state = 'cancelled';
	  this.emit('cancel');
	};

	Replication.prototype.ready = function (src, target) {
	  var self = this;
	  if (self._readyCalled) {
	    return;
	  }
	  self._readyCalled = true;

	  function onDestroy() {
	    self.cancel();
	  }
	  src.once('destroyed', onDestroy);
	  target.once('destroyed', onDestroy);
	  function cleanup() {
	    src.removeListener('destroyed', onDestroy);
	    target.removeListener('destroyed', onDestroy);
	  }
	  self.once('complete', cleanup);
	};

	function toPouch(db, opts) {
	  var PouchConstructor = opts.PouchConstructor;
	  if (typeof db === 'string') {
	    return new PouchConstructor(db, opts);
	  } else {
	    return db;
	  }
	}

	function replicate(src, target, opts, callback) {

	  if (typeof opts === 'function') {
	    callback = opts;
	    opts = {};
	  }
	  if (typeof opts === 'undefined') {
	    opts = {};
	  }

	  if (opts.doc_ids && !Array.isArray(opts.doc_ids)) {
	    throw pouchdbErrors.createError(pouchdbErrors.BAD_REQUEST,
	                       "`doc_ids` filter parameter is not a list.");
	  }

	  opts.complete = callback;
	  opts = pouchdbUtils.clone(opts);
	  opts.continuous = opts.continuous || opts.live;
	  opts.retry = ('retry' in opts) ? opts.retry : false;
	  /*jshint validthis:true */
	  opts.PouchConstructor = opts.PouchConstructor || this;
	  var replicateRet = new Replication(opts);
	  var srcPouch = toPouch(src, opts);
	  var targetPouch = toPouch(target, opts);
	  replicate$1(srcPouch, targetPouch, opts, replicateRet);
	  return replicateRet;
	}

	inherits(Sync, events.EventEmitter);
	function sync(src, target, opts, callback) {
	  if (typeof opts === 'function') {
	    callback = opts;
	    opts = {};
	  }
	  if (typeof opts === 'undefined') {
	    opts = {};
	  }
	  opts = pouchdbUtils.clone(opts);
	  /*jshint validthis:true */
	  opts.PouchConstructor = opts.PouchConstructor || this;
	  src = toPouch(src, opts);
	  target = toPouch(target, opts);
	  return new Sync(src, target, opts, callback);
	}

	function Sync(src, target, opts, callback) {
	  var self = this;
	  this.canceled = false;

	  var optsPush = opts.push ? jsExtend.extend({}, opts, opts.push) : opts;
	  var optsPull = opts.pull ? jsExtend.extend({}, opts, opts.pull) : opts;

	  this.push = replicate(src, target, optsPush);
	  this.pull = replicate(target, src, optsPull);

	  this.pushPaused = true;
	  this.pullPaused = true;

	  function pullChange(change) {
	    self.emit('change', {
	      direction: 'pull',
	      change: change
	    });
	  }
	  function pushChange(change) {
	    self.emit('change', {
	      direction: 'push',
	      change: change
	    });
	  }
	  function pushDenied(doc) {
	    self.emit('denied', {
	      direction: 'push',
	      doc: doc
	    });
	  }
	  function pullDenied(doc) {
	    self.emit('denied', {
	      direction: 'pull',
	      doc: doc
	    });
	  }
	  function pushPaused() {
	    self.pushPaused = true;
	    /* istanbul ignore if */
	    if (self.pullPaused) {
	      self.emit('paused');
	    }
	  }
	  function pullPaused() {
	    self.pullPaused = true;
	    /* istanbul ignore if */
	    if (self.pushPaused) {
	      self.emit('paused');
	    }
	  }
	  function pushActive() {
	    self.pushPaused = false;
	    /* istanbul ignore if */
	    if (self.pullPaused) {
	      self.emit('active', {
	        direction: 'push'
	      });
	    }
	  }
	  function pullActive() {
	    self.pullPaused = false;
	    /* istanbul ignore if */
	    if (self.pushPaused) {
	      self.emit('active', {
	        direction: 'pull'
	      });
	    }
	  }

	  var removed = {};

	  function removeAll(type) { // type is 'push' or 'pull'
	    return function (event, func) {
	      var isChange = event === 'change' &&
	        (func === pullChange || func === pushChange);
	      var isDenied = event === 'denied' &&
	        (func === pullDenied || func === pushDenied);
	      var isPaused = event === 'paused' &&
	        (func === pullPaused || func === pushPaused);
	      var isActive = event === 'active' &&
	        (func === pullActive || func === pushActive);

	      if (isChange || isDenied || isPaused || isActive) {
	        if (!(event in removed)) {
	          removed[event] = {};
	        }
	        removed[event][type] = true;
	        if (Object.keys(removed[event]).length === 2) {
	          // both push and pull have asked to be removed
	          self.removeAllListeners(event);
	        }
	      }
	    };
	  }

	  if (opts.live) {
	    this.push.on('complete', self.pull.cancel.bind(self.pull));
	    this.pull.on('complete', self.push.cancel.bind(self.push));
	  }

	  this.on('newListener', function (event) {
	    if (event === 'change') {
	      self.pull.on('change', pullChange);
	      self.push.on('change', pushChange);
	    } else if (event === 'denied') {
	      self.pull.on('denied', pullDenied);
	      self.push.on('denied', pushDenied);
	    } else if (event === 'active') {
	      self.pull.on('active', pullActive);
	      self.push.on('active', pushActive);
	    } else if (event === 'paused') {
	      self.pull.on('paused', pullPaused);
	      self.push.on('paused', pushPaused);
	    }
	  });

	  this.on('removeListener', function (event) {
	    if (event === 'change') {
	      self.pull.removeListener('change', pullChange);
	      self.push.removeListener('change', pushChange);
	    } else if (event === 'denied') {
	      self.pull.removeListener('denied', pullDenied);
	      self.push.removeListener('denied', pushDenied);
	    } else if (event === 'active') {
	      self.pull.removeListener('active', pullActive);
	      self.push.removeListener('active', pushActive);
	    } else if (event === 'paused') {
	      self.pull.removeListener('paused', pullPaused);
	      self.push.removeListener('paused', pushPaused);
	    }
	  });

	  this.pull.on('removeListener', removeAll('pull'));
	  this.push.on('removeListener', removeAll('push'));

	  var promise = Promise.all([
	    this.push,
	    this.pull
	  ]).then(function (resp) {
	    var out = {
	      push: resp[0],
	      pull: resp[1]
	    };
	    self.emit('complete', out);
	    if (callback) {
	      callback(null, out);
	    }
	    self.removeAllListeners();
	    return out;
	  }, function (err) {
	    self.cancel();
	    if (callback) {
	      // if there's a callback, then the callback can receive
	      // the error event
	      callback(err);
	    } else {
	      // if there's no callback, then we're safe to emit an error
	      // event, which would otherwise throw an unhandled error
	      // due to 'error' being a special event in EventEmitters
	      self.emit('error', err);
	    }
	    self.removeAllListeners();
	    if (callback) {
	      // no sense throwing if we're already emitting an 'error' event
	      throw err;
	    }
	  });

	  this.then = function (success, err) {
	    return promise.then(success, err);
	  };

	  this.catch = function (err) {
	    return promise.catch(err);
	  };
	}

	Sync.prototype.cancel = function () {
	  if (!this.canceled) {
	    this.canceled = true;
	    this.push.cancel();
	    this.pull.cancel();
	  }
	};

	function replication(PouchDB) {
	  PouchDB.replicate = replicate;
	  PouchDB.sync = sync;
	}

	module.exports = replication;

/***/ },
/* 36 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

	var Promise = _interopDefault(__webpack_require__(10));
	var pouchdbUtils = __webpack_require__(16);
	var pouchdbCollate = __webpack_require__(32);

	var CHECKPOINT_VERSION = 1;
	var REPLICATOR = "pouchdb";
	// This is an arbitrary number to limit the
	// amount of replication history we save in the checkpoint.
	// If we save too much, the checkpoing docs will become very big,
	// if we save fewer, we'll run a greater risk of having to
	// read all the changes from 0 when checkpoint PUTs fail
	// CouchDB 2.0 has a more involved history pruning,
	// but let's go for the simple version for now.
	var CHECKPOINT_HISTORY_SIZE = 5;
	var LOWEST_SEQ = 0;

	function updateCheckpoint(db, id, checkpoint, session, returnValue) {
	  return db.get(id).catch(function (err) {
	    if (err.status === 404) {
	      if (db.type() === 'http') {
	        pouchdbUtils.explainError(
	          404, 'PouchDB is just checking if a remote checkpoint exists.'
	        );
	      }
	      return {
	        session_id: session,
	        _id: id,
	        history: [],
	        replicator: REPLICATOR,
	        version: CHECKPOINT_VERSION
	      };
	    }
	    throw err;
	  }).then(function (doc) {
	    if (returnValue.cancelled) {
	      return;
	    }
	    // Filter out current entry for this replication
	    doc.history = (doc.history || []).filter(function (item) {
	      return item.session_id !== session;
	    });

	    // Add the latest checkpoint to history
	    doc.history.unshift({
	      last_seq: checkpoint,
	      session_id: session
	    });

	    // Just take the last pieces in history, to
	    // avoid really big checkpoint docs.
	    // see comment on history size above
	    doc.history = doc.history.slice(0, CHECKPOINT_HISTORY_SIZE);

	    doc.version = CHECKPOINT_VERSION;
	    doc.replicator = REPLICATOR;

	    doc.session_id = session;
	    doc.last_seq = checkpoint;

	    return db.put(doc).catch(function (err) {
	      if (err.status === 409) {
	        // retry; someone is trying to write a checkpoint simultaneously
	        return updateCheckpoint(db, id, checkpoint, session, returnValue);
	      }
	      throw err;
	    });
	  });
	}

	function Checkpointer(src, target, id, returnValue) {
	  this.src = src;
	  this.target = target;
	  this.id = id;
	  this.returnValue = returnValue;
	}

	Checkpointer.prototype.writeCheckpoint = function (checkpoint, session) {
	  var self = this;
	  return this.updateTarget(checkpoint, session).then(function () {
	    return self.updateSource(checkpoint, session);
	  });
	};

	Checkpointer.prototype.updateTarget = function (checkpoint, session) {
	  return updateCheckpoint(this.target, this.id, checkpoint,
	    session, this.returnValue);
	};

	Checkpointer.prototype.updateSource = function (checkpoint, session) {
	  var self = this;
	  if (this.readOnlySource) {
	    return Promise.resolve(true);
	  }
	  return updateCheckpoint(this.src, this.id, checkpoint,
	    session, this.returnValue)
	    .catch(function (err) {
	      if (isForbiddenError(err)) {
	        self.readOnlySource = true;
	        return true;
	      }
	      throw err;
	    });
	};

	var comparisons = {
	  "undefined": function (targetDoc, sourceDoc) {
	    // This is the previous comparison function
	    if (pouchdbCollate.collate(targetDoc.last_seq, sourceDoc.last_seq) === 0) {
	      return sourceDoc.last_seq;
	    }
	    /* istanbul ignore next */
	    return 0;
	  },
	  "1": function (targetDoc, sourceDoc) {
	    // This is the comparison function ported from CouchDB
	    return compareReplicationLogs(sourceDoc, targetDoc).last_seq;
	  }
	};

	Checkpointer.prototype.getCheckpoint = function () {
	  var self = this;
	  return self.target.get(self.id).then(function (targetDoc) {
	    if (self.readOnlySource) {
	      return Promise.resolve(targetDoc.last_seq);
	    }

	    return self.src.get(self.id).then(function (sourceDoc) {
	      // Since we can't migrate an old version doc to a new one
	      // (no session id), we just go with the lowest seq in this case
	      /* istanbul ignore if */
	      if (targetDoc.version !== sourceDoc.version) {
	        return LOWEST_SEQ;
	      }

	      var version;
	      if (targetDoc.version) {
	        version = targetDoc.version.toString();
	      } else {
	        version = "undefined";
	      }

	      if (version in comparisons) {
	        return comparisons[version](targetDoc, sourceDoc);
	      }
	      /* istanbul ignore next */
	      return LOWEST_SEQ;
	    }, function (err) {
	      if (err.status === 404 && targetDoc.last_seq) {
	        return self.src.put({
	          _id: self.id,
	          last_seq: LOWEST_SEQ
	        }).then(function () {
	          return LOWEST_SEQ;
	        }, function (err) {
	          if (isForbiddenError(err)) {
	            self.readOnlySource = true;
	            return targetDoc.last_seq;
	          }
	          /* istanbul ignore next */
	          return LOWEST_SEQ;
	        });
	      }
	      throw err;
	    });
	  }).catch(function (err) {
	    if (err.status !== 404) {
	      throw err;
	    }
	    return LOWEST_SEQ;
	  });
	};
	// This checkpoint comparison is ported from CouchDBs source
	// they come from here:
	// https://github.com/apache/couchdb-couch-replicator/blob/master/src/couch_replicator.erl#L863-L906

	function compareReplicationLogs(srcDoc, tgtDoc) {
	  if (srcDoc.session_id === tgtDoc.session_id) {
	    return {
	      last_seq: srcDoc.last_seq,
	      history: srcDoc.history
	    };
	  }

	  return compareReplicationHistory(srcDoc.history, tgtDoc.history);
	}

	function compareReplicationHistory(sourceHistory, targetHistory) {
	  // the erlang loop via function arguments is not so easy to repeat in JS
	  // therefore, doing this as recursion
	  var S = sourceHistory[0];
	  var sourceRest = sourceHistory.slice(1);
	  var T = targetHistory[0];
	  var targetRest = targetHistory.slice(1);

	  if (!S || targetHistory.length === 0) {
	    return {
	      last_seq: LOWEST_SEQ,
	      history: []
	    };
	  }

	  var sourceId = S.session_id;
	  /* istanbul ignore if */
	  if (hasSessionId(sourceId, targetHistory)) {
	    return {
	      last_seq: S.last_seq,
	      history: sourceHistory
	    };
	  }

	  var targetId = T.session_id;
	  if (hasSessionId(targetId, sourceRest)) {
	    return {
	      last_seq: T.last_seq,
	      history: targetRest
	    };
	  }

	  return compareReplicationHistory(sourceRest, targetRest);
	}

	function hasSessionId(sessionId, history) {
	  var props = history[0];
	  var rest = history.slice(1);

	  if (!sessionId || history.length === 0) {
	    return false;
	  }

	  if (sessionId === props.session_id) {
	    return true;
	  }

	  return hasSessionId(sessionId, rest);
	}

	function isForbiddenError(err) {
	  return typeof err.status === 'number' && Math.floor(err.status / 100) === 4;
	}

	module.exports = Checkpointer;

/***/ },
/* 37 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

	var Promise = _interopDefault(__webpack_require__(10));
	var pouchdbMd5 = __webpack_require__(23);
	var pouchdbCollate = __webpack_require__(32);

	function sortObjectPropertiesByKey(queryParams) {
	  return Object.keys(queryParams).sort(pouchdbCollate.collate).reduce(function (result, key) {
	    result[key] = queryParams[key];
	    return result;
	  }, {});
	}

	// Generate a unique id particular to this replication.
	// Not guaranteed to align perfectly with CouchDB's rep ids.
	function generateReplicationId(src, target, opts) {
	  var docIds = opts.doc_ids ? opts.doc_ids.sort(pouchdbCollate.collate) : '';
	  var filterFun = opts.filter ? opts.filter.toString() : '';
	  var queryParams = '';
	  var filterViewName =  '';

	  if (opts.filter && opts.query_params) {
	    queryParams = JSON.stringify(sortObjectPropertiesByKey(opts.query_params));
	  }

	  if (opts.filter && opts.filter === '_view') {
	    filterViewName = opts.view.toString();
	  }

	  return Promise.all([src.id(), target.id()]).then(function (res) {
	    var queryData = res[0] + res[1] + filterFun + filterViewName +
	      queryParams + docIds;
	    return new Promise(function (resolve) {
	      pouchdbMd5.binaryMd5(queryData, resolve);
	    });
	  }).then(function (md5sum) {
	    // can't use straight-up md5 alphabet, because
	    // the char '/' is interpreted as being for attachments,
	    // and + is also not url-safe
	    md5sum = md5sum.replace(/\//g, '.').replace(/\+/g, '_');
	    return '_local/' + md5sum;
	  });
	}

	module.exports = generateReplicationId;

/***/ },
/* 38 */
/***/ function(module, exports) {

	
	(function() {
	'use strict';

	function F2(fun)
	{
	  function wrapper(a) { return function(b) { return fun(a,b); }; }
	  wrapper.arity = 2;
	  wrapper.func = fun;
	  return wrapper;
	}

	function F3(fun)
	{
	  function wrapper(a) {
	    return function(b) { return function(c) { return fun(a, b, c); }; };
	  }
	  wrapper.arity = 3;
	  wrapper.func = fun;
	  return wrapper;
	}

	function F4(fun)
	{
	  function wrapper(a) { return function(b) { return function(c) {
	    return function(d) { return fun(a, b, c, d); }; }; };
	  }
	  wrapper.arity = 4;
	  wrapper.func = fun;
	  return wrapper;
	}

	function F5(fun)
	{
	  function wrapper(a) { return function(b) { return function(c) {
	    return function(d) { return function(e) { return fun(a, b, c, d, e); }; }; }; };
	  }
	  wrapper.arity = 5;
	  wrapper.func = fun;
	  return wrapper;
	}

	function F6(fun)
	{
	  function wrapper(a) { return function(b) { return function(c) {
	    return function(d) { return function(e) { return function(f) {
	    return fun(a, b, c, d, e, f); }; }; }; }; };
	  }
	  wrapper.arity = 6;
	  wrapper.func = fun;
	  return wrapper;
	}

	function F7(fun)
	{
	  function wrapper(a) { return function(b) { return function(c) {
	    return function(d) { return function(e) { return function(f) {
	    return function(g) { return fun(a, b, c, d, e, f, g); }; }; }; }; }; };
	  }
	  wrapper.arity = 7;
	  wrapper.func = fun;
	  return wrapper;
	}

	function F8(fun)
	{
	  function wrapper(a) { return function(b) { return function(c) {
	    return function(d) { return function(e) { return function(f) {
	    return function(g) { return function(h) {
	    return fun(a, b, c, d, e, f, g, h); }; }; }; }; }; }; };
	  }
	  wrapper.arity = 8;
	  wrapper.func = fun;
	  return wrapper;
	}

	function F9(fun)
	{
	  function wrapper(a) { return function(b) { return function(c) {
	    return function(d) { return function(e) { return function(f) {
	    return function(g) { return function(h) { return function(i) {
	    return fun(a, b, c, d, e, f, g, h, i); }; }; }; }; }; }; }; };
	  }
	  wrapper.arity = 9;
	  wrapper.func = fun;
	  return wrapper;
	}

	function A2(fun, a, b)
	{
	  return fun.arity === 2
	    ? fun.func(a, b)
	    : fun(a)(b);
	}
	function A3(fun, a, b, c)
	{
	  return fun.arity === 3
	    ? fun.func(a, b, c)
	    : fun(a)(b)(c);
	}
	function A4(fun, a, b, c, d)
	{
	  return fun.arity === 4
	    ? fun.func(a, b, c, d)
	    : fun(a)(b)(c)(d);
	}
	function A5(fun, a, b, c, d, e)
	{
	  return fun.arity === 5
	    ? fun.func(a, b, c, d, e)
	    : fun(a)(b)(c)(d)(e);
	}
	function A6(fun, a, b, c, d, e, f)
	{
	  return fun.arity === 6
	    ? fun.func(a, b, c, d, e, f)
	    : fun(a)(b)(c)(d)(e)(f);
	}
	function A7(fun, a, b, c, d, e, f, g)
	{
	  return fun.arity === 7
	    ? fun.func(a, b, c, d, e, f, g)
	    : fun(a)(b)(c)(d)(e)(f)(g);
	}
	function A8(fun, a, b, c, d, e, f, g, h)
	{
	  return fun.arity === 8
	    ? fun.func(a, b, c, d, e, f, g, h)
	    : fun(a)(b)(c)(d)(e)(f)(g)(h);
	}
	function A9(fun, a, b, c, d, e, f, g, h, i)
	{
	  return fun.arity === 9
	    ? fun.func(a, b, c, d, e, f, g, h, i)
	    : fun(a)(b)(c)(d)(e)(f)(g)(h)(i);
	}

	//import Native.Utils //

	var _elm_lang$core$Native_Basics = function() {

	function div(a, b)
	{
		return (a / b) | 0;
	}
	function rem(a, b)
	{
		return a % b;
	}
	function mod(a, b)
	{
		if (b === 0)
		{
			throw new Error('Cannot perform mod 0. Division by zero error.');
		}
		var r = a % b;
		var m = a === 0 ? 0 : (b > 0 ? (a >= 0 ? r : r + b) : -mod(-a, -b));

		return m === b ? 0 : m;
	}
	function logBase(base, n)
	{
		return Math.log(n) / Math.log(base);
	}
	function negate(n)
	{
		return -n;
	}
	function abs(n)
	{
		return n < 0 ? -n : n;
	}

	function min(a, b)
	{
		return _elm_lang$core$Native_Utils.cmp(a, b) < 0 ? a : b;
	}
	function max(a, b)
	{
		return _elm_lang$core$Native_Utils.cmp(a, b) > 0 ? a : b;
	}
	function clamp(lo, hi, n)
	{
		return _elm_lang$core$Native_Utils.cmp(n, lo) < 0
			? lo
			: _elm_lang$core$Native_Utils.cmp(n, hi) > 0
				? hi
				: n;
	}

	var ord = ['LT', 'EQ', 'GT'];

	function compare(x, y)
	{
		return { ctor: ord[_elm_lang$core$Native_Utils.cmp(x, y) + 1] };
	}

	function xor(a, b)
	{
		return a !== b;
	}
	function not(b)
	{
		return !b;
	}
	function isInfinite(n)
	{
		return n === Infinity || n === -Infinity;
	}

	function truncate(n)
	{
		return n | 0;
	}

	function degrees(d)
	{
		return d * Math.PI / 180;
	}
	function turns(t)
	{
		return 2 * Math.PI * t;
	}
	function fromPolar(point)
	{
		var r = point._0;
		var t = point._1;
		return _elm_lang$core$Native_Utils.Tuple2(r * Math.cos(t), r * Math.sin(t));
	}
	function toPolar(point)
	{
		var x = point._0;
		var y = point._1;
		return _elm_lang$core$Native_Utils.Tuple2(Math.sqrt(x * x + y * y), Math.atan2(y, x));
	}

	return {
		div: F2(div),
		rem: F2(rem),
		mod: F2(mod),

		pi: Math.PI,
		e: Math.E,
		cos: Math.cos,
		sin: Math.sin,
		tan: Math.tan,
		acos: Math.acos,
		asin: Math.asin,
		atan: Math.atan,
		atan2: F2(Math.atan2),

		degrees: degrees,
		turns: turns,
		fromPolar: fromPolar,
		toPolar: toPolar,

		sqrt: Math.sqrt,
		logBase: F2(logBase),
		negate: negate,
		abs: abs,
		min: F2(min),
		max: F2(max),
		clamp: F3(clamp),
		compare: F2(compare),

		xor: F2(xor),
		not: not,

		truncate: truncate,
		ceiling: Math.ceil,
		floor: Math.floor,
		round: Math.round,
		toFloat: function(x) { return x; },
		isNaN: isNaN,
		isInfinite: isInfinite
	};

	}();
	//import //

	var _elm_lang$core$Native_Utils = function() {

	// COMPARISONS

	function eq(rootX, rootY)
	{
		var stack = [{ x: rootX, y: rootY }];
		while (stack.length > 0)
		{
			var front = stack.pop();
			var x = front.x;
			var y = front.y;
			if (x === y)
			{
				continue;
			}
			if (typeof x === 'object')
			{
				var c = 0;
				for (var key in x)
				{
					++c;
					if (!(key in y))
					{
						return false;
					}
					if (key === 'ctor')
					{
						continue;
					}
					stack.push({ x: x[key], y: y[key] });
				}
				if ('ctor' in x)
				{
					stack.push({ x: x.ctor, y: y.ctor});
				}
				if (c !== Object.keys(y).length)
				{
					return false;
				}
			}
			else if (typeof x === 'function')
			{
				throw new Error('Equality error: general function equality is ' +
								'undecidable, and therefore, unsupported');
			}
			else
			{
				return false;
			}
		}
		return true;
	}

	// Code in Generate/JavaScript.hs, Basics.js, and List.js depends on
	// the particular integer values assigned to LT, EQ, and GT.

	var LT = -1, EQ = 0, GT = 1;

	function cmp(x, y)
	{
		var ord;
		if (typeof x !== 'object')
		{
			return x === y ? EQ : x < y ? LT : GT;
		}
		else if (x instanceof String)
		{
			var a = x.valueOf();
			var b = y.valueOf();
			return a === b
				? EQ
				: a < b
					? LT
					: GT;
		}
		else if (x.ctor === '::' || x.ctor === '[]')
		{
			while (true)
			{
				if (x.ctor === '[]' && y.ctor === '[]')
				{
					return EQ;
				}
				if (x.ctor !== y.ctor)
				{
					return x.ctor === '[]' ? LT : GT;
				}
				ord = cmp(x._0, y._0);
				if (ord !== EQ)
				{
					return ord;
				}
				x = x._1;
				y = y._1;
			}
		}
		else if (x.ctor.slice(0, 6) === '_Tuple')
		{
			var n = x.ctor.slice(6) - 0;
			var err = 'cannot compare tuples with more than 6 elements.';
			if (n === 0) return EQ;
			if (n >= 1) { ord = cmp(x._0, y._0); if (ord !== EQ) return ord;
			if (n >= 2) { ord = cmp(x._1, y._1); if (ord !== EQ) return ord;
			if (n >= 3) { ord = cmp(x._2, y._2); if (ord !== EQ) return ord;
			if (n >= 4) { ord = cmp(x._3, y._3); if (ord !== EQ) return ord;
			if (n >= 5) { ord = cmp(x._4, y._4); if (ord !== EQ) return ord;
			if (n >= 6) { ord = cmp(x._5, y._5); if (ord !== EQ) return ord;
			if (n >= 7) throw new Error('Comparison error: ' + err); } } } } } }
			return EQ;
		}
		else
		{
			throw new Error('Comparison error: comparison is only defined on ints, ' +
							'floats, times, chars, strings, lists of comparable values, ' +
							'and tuples of comparable values.');
		}
	}


	// COMMON VALUES

	var Tuple0 = {
		ctor: '_Tuple0'
	};

	function Tuple2(x, y)
	{
		return {
			ctor: '_Tuple2',
			_0: x,
			_1: y
		};
	}

	function chr(c)
	{
		return new String(c);
	}


	// GUID

	var count = 0;
	function guid(_)
	{
		return count++;
	}


	// RECORDS

	function update(oldRecord, updatedFields)
	{
		var newRecord = {};
		for (var key in oldRecord)
		{
			var value = (key in updatedFields) ? updatedFields[key] : oldRecord[key];
			newRecord[key] = value;
		}
		return newRecord;
	}


	//// LIST STUFF ////

	var Nil = { ctor: '[]' };

	function Cons(hd, tl)
	{
		return {
			ctor: '::',
			_0: hd,
			_1: tl
		};
	}

	function append(xs, ys)
	{
		// append Strings
		if (typeof xs === 'string')
		{
			return xs + ys;
		}

		// append Lists
		if (xs.ctor === '[]')
		{
			return ys;
		}
		var root = Cons(xs._0, Nil);
		var curr = root;
		xs = xs._1;
		while (xs.ctor !== '[]')
		{
			curr._1 = Cons(xs._0, Nil);
			xs = xs._1;
			curr = curr._1;
		}
		curr._1 = ys;
		return root;
	}


	// CRASHES

	function crash(moduleName, region)
	{
		return function(message) {
			throw new Error(
				'Ran into a `Debug.crash` in module `' + moduleName + '` ' + regionToString(region) + '\n'
				+ 'The message provided by the code author is:\n\n    '
				+ message
			);
		};
	}

	function crashCase(moduleName, region, value)
	{
		return function(message) {
			throw new Error(
				'Ran into a `Debug.crash` in module `' + moduleName + '`\n\n'
				+ 'This was caused by the `case` expression ' + regionToString(region) + '.\n'
				+ 'One of the branches ended with a crash and the following value got through:\n\n    ' + toString(value) + '\n\n'
				+ 'The message provided by the code author is:\n\n    '
				+ message
			);
		};
	}

	function regionToString(region)
	{
		if (region.start.line == region.end.line)
		{
			return 'on line ' + region.start.line;
		}
		return 'between lines ' + region.start.line + ' and ' + region.end.line;
	}


	// TO STRING

	function toString(v)
	{
		var type = typeof v;
		if (type === 'function')
		{
			var name = v.func ? v.func.name : v.name;
			return '<function' + (name === '' ? '' : ':') + name + '>';
		}

		if (type === 'boolean')
		{
			return v ? 'True' : 'False';
		}

		if (type === 'number')
		{
			return v + '';
		}

		if (v instanceof String)
		{
			return '\'' + addSlashes(v, true) + '\'';
		}

		if (type === 'string')
		{
			return '"' + addSlashes(v, false) + '"';
		}

		if (v === null)
		{
			return 'null';
		}

		if (type === 'object' && 'ctor' in v)
		{
			var ctorStarter = v.ctor.substring(0, 5);

			if (ctorStarter === '_Tupl')
			{
				var output = [];
				for (var k in v)
				{
					if (k === 'ctor') continue;
					output.push(toString(v[k]));
				}
				return '(' + output.join(',') + ')';
			}

			if (ctorStarter === '_Task')
			{
				return '<task>'
			}

			if (v.ctor === '_Array')
			{
				var list = _elm_lang$core$Array$toList(v);
				return 'Array.fromList ' + toString(list);
			}

			if (v.ctor === '<decoder>')
			{
				return '<decoder>';
			}

			if (v.ctor === '_Process')
			{
				return '<process:' + v.id + '>';
			}

			if (v.ctor === '::')
			{
				var output = '[' + toString(v._0);
				v = v._1;
				while (v.ctor === '::')
				{
					output += ',' + toString(v._0);
					v = v._1;
				}
				return output + ']';
			}

			if (v.ctor === '[]')
			{
				return '[]';
			}

			if (v.ctor === 'RBNode_elm_builtin' || v.ctor === 'RBEmpty_elm_builtin' || v.ctor === 'Set_elm_builtin')
			{
				var name, list;
				if (v.ctor === 'Set_elm_builtin')
				{
					name = 'Set';
					list = A2(
						_elm_lang$core$List$map,
						function(x) {return x._0; },
						_elm_lang$core$Dict$toList(v._0)
					);
				}
				else
				{
					name = 'Dict';
					list = _elm_lang$core$Dict$toList(v);
				}
				return name + '.fromList ' + toString(list);
			}

			var output = '';
			for (var i in v)
			{
				if (i === 'ctor') continue;
				var str = toString(v[i]);
				var c0 = str[0];
				var parenless = c0 === '{' || c0 === '(' || c0 === '<' || c0 === '"' || str.indexOf(' ') < 0;
				output += ' ' + (parenless ? str : '(' + str + ')');
			}
			return v.ctor + output;
		}

		if (type === 'object')
		{
			var output = [];
			for (var k in v)
			{
				output.push(k + ' = ' + toString(v[k]));
			}
			if (output.length === 0)
			{
				return '{}';
			}
			return '{ ' + output.join(', ') + ' }';
		}

		return '<internal structure>';
	}

	function addSlashes(str, isChar)
	{
		var s = str.replace(/\\/g, '\\\\')
				  .replace(/\n/g, '\\n')
				  .replace(/\t/g, '\\t')
				  .replace(/\r/g, '\\r')
				  .replace(/\v/g, '\\v')
				  .replace(/\0/g, '\\0');
		if (isChar)
		{
			return s.replace(/\'/g, '\\\'');
		}
		else
		{
			return s.replace(/\"/g, '\\"');
		}
	}


	return {
		eq: eq,
		cmp: cmp,
		Tuple0: Tuple0,
		Tuple2: Tuple2,
		chr: chr,
		update: update,
		guid: guid,

		append: F2(append),

		crash: crash,
		crashCase: crashCase,

		toString: toString
	};

	}();
	var _elm_lang$core$Basics$uncurry = F2(
		function (f, _p0) {
			var _p1 = _p0;
			return A2(f, _p1._0, _p1._1);
		});
	var _elm_lang$core$Basics$curry = F3(
		function (f, a, b) {
			return f(
				{ctor: '_Tuple2', _0: a, _1: b});
		});
	var _elm_lang$core$Basics$flip = F3(
		function (f, b, a) {
			return A2(f, a, b);
		});
	var _elm_lang$core$Basics$snd = function (_p2) {
		var _p3 = _p2;
		return _p3._1;
	};
	var _elm_lang$core$Basics$fst = function (_p4) {
		var _p5 = _p4;
		return _p5._0;
	};
	var _elm_lang$core$Basics$always = F2(
		function (a, _p6) {
			return a;
		});
	var _elm_lang$core$Basics$identity = function (x) {
		return x;
	};
	var _elm_lang$core$Basics_ops = _elm_lang$core$Basics_ops || {};
	_elm_lang$core$Basics_ops['<|'] = F2(
		function (f, x) {
			return f(x);
		});
	var _elm_lang$core$Basics_ops = _elm_lang$core$Basics_ops || {};
	_elm_lang$core$Basics_ops['|>'] = F2(
		function (x, f) {
			return f(x);
		});
	var _elm_lang$core$Basics_ops = _elm_lang$core$Basics_ops || {};
	_elm_lang$core$Basics_ops['>>'] = F3(
		function (f, g, x) {
			return g(
				f(x));
		});
	var _elm_lang$core$Basics_ops = _elm_lang$core$Basics_ops || {};
	_elm_lang$core$Basics_ops['<<'] = F3(
		function (g, f, x) {
			return g(
				f(x));
		});
	var _elm_lang$core$Basics_ops = _elm_lang$core$Basics_ops || {};
	_elm_lang$core$Basics_ops['++'] = _elm_lang$core$Native_Utils.append;
	var _elm_lang$core$Basics$toString = _elm_lang$core$Native_Utils.toString;
	var _elm_lang$core$Basics$isInfinite = _elm_lang$core$Native_Basics.isInfinite;
	var _elm_lang$core$Basics$isNaN = _elm_lang$core$Native_Basics.isNaN;
	var _elm_lang$core$Basics$toFloat = _elm_lang$core$Native_Basics.toFloat;
	var _elm_lang$core$Basics$ceiling = _elm_lang$core$Native_Basics.ceiling;
	var _elm_lang$core$Basics$floor = _elm_lang$core$Native_Basics.floor;
	var _elm_lang$core$Basics$truncate = _elm_lang$core$Native_Basics.truncate;
	var _elm_lang$core$Basics$round = _elm_lang$core$Native_Basics.round;
	var _elm_lang$core$Basics$not = _elm_lang$core$Native_Basics.not;
	var _elm_lang$core$Basics$xor = _elm_lang$core$Native_Basics.xor;
	var _elm_lang$core$Basics_ops = _elm_lang$core$Basics_ops || {};
	_elm_lang$core$Basics_ops['||'] = _elm_lang$core$Native_Basics.or;
	var _elm_lang$core$Basics_ops = _elm_lang$core$Basics_ops || {};
	_elm_lang$core$Basics_ops['&&'] = _elm_lang$core$Native_Basics.and;
	var _elm_lang$core$Basics$max = _elm_lang$core$Native_Basics.max;
	var _elm_lang$core$Basics$min = _elm_lang$core$Native_Basics.min;
	var _elm_lang$core$Basics$compare = _elm_lang$core$Native_Basics.compare;
	var _elm_lang$core$Basics_ops = _elm_lang$core$Basics_ops || {};
	_elm_lang$core$Basics_ops['>='] = _elm_lang$core$Native_Basics.ge;
	var _elm_lang$core$Basics_ops = _elm_lang$core$Basics_ops || {};
	_elm_lang$core$Basics_ops['<='] = _elm_lang$core$Native_Basics.le;
	var _elm_lang$core$Basics_ops = _elm_lang$core$Basics_ops || {};
	_elm_lang$core$Basics_ops['>'] = _elm_lang$core$Native_Basics.gt;
	var _elm_lang$core$Basics_ops = _elm_lang$core$Basics_ops || {};
	_elm_lang$core$Basics_ops['<'] = _elm_lang$core$Native_Basics.lt;
	var _elm_lang$core$Basics_ops = _elm_lang$core$Basics_ops || {};
	_elm_lang$core$Basics_ops['/='] = _elm_lang$core$Native_Basics.neq;
	var _elm_lang$core$Basics_ops = _elm_lang$core$Basics_ops || {};
	_elm_lang$core$Basics_ops['=='] = _elm_lang$core$Native_Basics.eq;
	var _elm_lang$core$Basics$e = _elm_lang$core$Native_Basics.e;
	var _elm_lang$core$Basics$pi = _elm_lang$core$Native_Basics.pi;
	var _elm_lang$core$Basics$clamp = _elm_lang$core$Native_Basics.clamp;
	var _elm_lang$core$Basics$logBase = _elm_lang$core$Native_Basics.logBase;
	var _elm_lang$core$Basics$abs = _elm_lang$core$Native_Basics.abs;
	var _elm_lang$core$Basics$negate = _elm_lang$core$Native_Basics.negate;
	var _elm_lang$core$Basics$sqrt = _elm_lang$core$Native_Basics.sqrt;
	var _elm_lang$core$Basics$atan2 = _elm_lang$core$Native_Basics.atan2;
	var _elm_lang$core$Basics$atan = _elm_lang$core$Native_Basics.atan;
	var _elm_lang$core$Basics$asin = _elm_lang$core$Native_Basics.asin;
	var _elm_lang$core$Basics$acos = _elm_lang$core$Native_Basics.acos;
	var _elm_lang$core$Basics$tan = _elm_lang$core$Native_Basics.tan;
	var _elm_lang$core$Basics$sin = _elm_lang$core$Native_Basics.sin;
	var _elm_lang$core$Basics$cos = _elm_lang$core$Native_Basics.cos;
	var _elm_lang$core$Basics_ops = _elm_lang$core$Basics_ops || {};
	_elm_lang$core$Basics_ops['^'] = _elm_lang$core$Native_Basics.exp;
	var _elm_lang$core$Basics_ops = _elm_lang$core$Basics_ops || {};
	_elm_lang$core$Basics_ops['%'] = _elm_lang$core$Native_Basics.mod;
	var _elm_lang$core$Basics$rem = _elm_lang$core$Native_Basics.rem;
	var _elm_lang$core$Basics_ops = _elm_lang$core$Basics_ops || {};
	_elm_lang$core$Basics_ops['//'] = _elm_lang$core$Native_Basics.div;
	var _elm_lang$core$Basics_ops = _elm_lang$core$Basics_ops || {};
	_elm_lang$core$Basics_ops['/'] = _elm_lang$core$Native_Basics.floatDiv;
	var _elm_lang$core$Basics_ops = _elm_lang$core$Basics_ops || {};
	_elm_lang$core$Basics_ops['*'] = _elm_lang$core$Native_Basics.mul;
	var _elm_lang$core$Basics_ops = _elm_lang$core$Basics_ops || {};
	_elm_lang$core$Basics_ops['-'] = _elm_lang$core$Native_Basics.sub;
	var _elm_lang$core$Basics_ops = _elm_lang$core$Basics_ops || {};
	_elm_lang$core$Basics_ops['+'] = _elm_lang$core$Native_Basics.add;
	var _elm_lang$core$Basics$toPolar = _elm_lang$core$Native_Basics.toPolar;
	var _elm_lang$core$Basics$fromPolar = _elm_lang$core$Native_Basics.fromPolar;
	var _elm_lang$core$Basics$turns = _elm_lang$core$Native_Basics.turns;
	var _elm_lang$core$Basics$degrees = _elm_lang$core$Native_Basics.degrees;
	var _elm_lang$core$Basics$radians = function (t) {
		return t;
	};
	var _elm_lang$core$Basics$GT = {ctor: 'GT'};
	var _elm_lang$core$Basics$EQ = {ctor: 'EQ'};
	var _elm_lang$core$Basics$LT = {ctor: 'LT'};
	var _elm_lang$core$Basics$Never = function (a) {
		return {ctor: 'Never', _0: a};
	};

	//import Native.Utils //

	var _elm_lang$core$Native_Debug = function() {

	function log(tag, value)
	{
		var msg = tag + ': ' + _elm_lang$core$Native_Utils.toString(value);
		var process = process || {};
		if (process.stdout)
		{
			process.stdout.write(msg);
		}
		else
		{
			console.log(msg);
		}
		return value;
	}

	function crash(message)
	{
		throw new Error(message);
	}

	return {
		crash: crash,
		log: F2(log)
	};

	}();
	var _elm_lang$core$Debug$crash = _elm_lang$core$Native_Debug.crash;
	var _elm_lang$core$Debug$log = _elm_lang$core$Native_Debug.log;

	var _elm_lang$core$Maybe$withDefault = F2(
		function ($default, maybe) {
			var _p0 = maybe;
			if (_p0.ctor === 'Just') {
				return _p0._0;
			} else {
				return $default;
			}
		});
	var _elm_lang$core$Maybe$Nothing = {ctor: 'Nothing'};
	var _elm_lang$core$Maybe$oneOf = function (maybes) {
		oneOf:
		while (true) {
			var _p1 = maybes;
			if (_p1.ctor === '[]') {
				return _elm_lang$core$Maybe$Nothing;
			} else {
				var _p3 = _p1._0;
				var _p2 = _p3;
				if (_p2.ctor === 'Nothing') {
					var _v3 = _p1._1;
					maybes = _v3;
					continue oneOf;
				} else {
					return _p3;
				}
			}
		}
	};
	var _elm_lang$core$Maybe$andThen = F2(
		function (maybeValue, callback) {
			var _p4 = maybeValue;
			if (_p4.ctor === 'Just') {
				return callback(_p4._0);
			} else {
				return _elm_lang$core$Maybe$Nothing;
			}
		});
	var _elm_lang$core$Maybe$Just = function (a) {
		return {ctor: 'Just', _0: a};
	};
	var _elm_lang$core$Maybe$map = F2(
		function (f, maybe) {
			var _p5 = maybe;
			if (_p5.ctor === 'Just') {
				return _elm_lang$core$Maybe$Just(
					f(_p5._0));
			} else {
				return _elm_lang$core$Maybe$Nothing;
			}
		});
	var _elm_lang$core$Maybe$map2 = F3(
		function (func, ma, mb) {
			var _p6 = {ctor: '_Tuple2', _0: ma, _1: mb};
			if (((_p6.ctor === '_Tuple2') && (_p6._0.ctor === 'Just')) && (_p6._1.ctor === 'Just')) {
				return _elm_lang$core$Maybe$Just(
					A2(func, _p6._0._0, _p6._1._0));
			} else {
				return _elm_lang$core$Maybe$Nothing;
			}
		});
	var _elm_lang$core$Maybe$map3 = F4(
		function (func, ma, mb, mc) {
			var _p7 = {ctor: '_Tuple3', _0: ma, _1: mb, _2: mc};
			if ((((_p7.ctor === '_Tuple3') && (_p7._0.ctor === 'Just')) && (_p7._1.ctor === 'Just')) && (_p7._2.ctor === 'Just')) {
				return _elm_lang$core$Maybe$Just(
					A3(func, _p7._0._0, _p7._1._0, _p7._2._0));
			} else {
				return _elm_lang$core$Maybe$Nothing;
			}
		});
	var _elm_lang$core$Maybe$map4 = F5(
		function (func, ma, mb, mc, md) {
			var _p8 = {ctor: '_Tuple4', _0: ma, _1: mb, _2: mc, _3: md};
			if (((((_p8.ctor === '_Tuple4') && (_p8._0.ctor === 'Just')) && (_p8._1.ctor === 'Just')) && (_p8._2.ctor === 'Just')) && (_p8._3.ctor === 'Just')) {
				return _elm_lang$core$Maybe$Just(
					A4(func, _p8._0._0, _p8._1._0, _p8._2._0, _p8._3._0));
			} else {
				return _elm_lang$core$Maybe$Nothing;
			}
		});
	var _elm_lang$core$Maybe$map5 = F6(
		function (func, ma, mb, mc, md, me) {
			var _p9 = {ctor: '_Tuple5', _0: ma, _1: mb, _2: mc, _3: md, _4: me};
			if ((((((_p9.ctor === '_Tuple5') && (_p9._0.ctor === 'Just')) && (_p9._1.ctor === 'Just')) && (_p9._2.ctor === 'Just')) && (_p9._3.ctor === 'Just')) && (_p9._4.ctor === 'Just')) {
				return _elm_lang$core$Maybe$Just(
					A5(func, _p9._0._0, _p9._1._0, _p9._2._0, _p9._3._0, _p9._4._0));
			} else {
				return _elm_lang$core$Maybe$Nothing;
			}
		});

	//import Native.Utils //

	var _elm_lang$core$Native_List = function() {

	var Nil = { ctor: '[]' };

	function Cons(hd, tl)
	{
		return { ctor: '::', _0: hd, _1: tl };
	}

	function fromArray(arr)
	{
		var out = Nil;
		for (var i = arr.length; i--; )
		{
			out = Cons(arr[i], out);
		}
		return out;
	}

	function toArray(xs)
	{
		var out = [];
		while (xs.ctor !== '[]')
		{
			out.push(xs._0);
			xs = xs._1;
		}
		return out;
	}


	function range(lo, hi)
	{
		var list = Nil;
		if (lo <= hi)
		{
			do
			{
				list = Cons(hi, list);
			}
			while (hi-- > lo);
		}
		return list;
	}

	function foldr(f, b, xs)
	{
		var arr = toArray(xs);
		var acc = b;
		for (var i = arr.length; i--; )
		{
			acc = A2(f, arr[i], acc);
		}
		return acc;
	}

	function map2(f, xs, ys)
	{
		var arr = [];
		while (xs.ctor !== '[]' && ys.ctor !== '[]')
		{
			arr.push(A2(f, xs._0, ys._0));
			xs = xs._1;
			ys = ys._1;
		}
		return fromArray(arr);
	}

	function map3(f, xs, ys, zs)
	{
		var arr = [];
		while (xs.ctor !== '[]' && ys.ctor !== '[]' && zs.ctor !== '[]')
		{
			arr.push(A3(f, xs._0, ys._0, zs._0));
			xs = xs._1;
			ys = ys._1;
			zs = zs._1;
		}
		return fromArray(arr);
	}

	function map4(f, ws, xs, ys, zs)
	{
		var arr = [];
		while (   ws.ctor !== '[]'
			   && xs.ctor !== '[]'
			   && ys.ctor !== '[]'
			   && zs.ctor !== '[]')
		{
			arr.push(A4(f, ws._0, xs._0, ys._0, zs._0));
			ws = ws._1;
			xs = xs._1;
			ys = ys._1;
			zs = zs._1;
		}
		return fromArray(arr);
	}

	function map5(f, vs, ws, xs, ys, zs)
	{
		var arr = [];
		while (   vs.ctor !== '[]'
			   && ws.ctor !== '[]'
			   && xs.ctor !== '[]'
			   && ys.ctor !== '[]'
			   && zs.ctor !== '[]')
		{
			arr.push(A5(f, vs._0, ws._0, xs._0, ys._0, zs._0));
			vs = vs._1;
			ws = ws._1;
			xs = xs._1;
			ys = ys._1;
			zs = zs._1;
		}
		return fromArray(arr);
	}

	function sortBy(f, xs)
	{
		return fromArray(toArray(xs).sort(function(a, b) {
			return _elm_lang$core$Native_Utils.cmp(f(a), f(b));
		}));
	}

	function sortWith(f, xs)
	{
		return fromArray(toArray(xs).sort(function(a, b) {
			var ord = f(a)(b).ctor;
			return ord === 'EQ' ? 0 : ord === 'LT' ? -1 : 1;
		}));
	}

	return {
		Nil: Nil,
		Cons: Cons,
		cons: F2(Cons),
		toArray: toArray,
		fromArray: fromArray,
		range: range,

		foldr: F3(foldr),

		map2: F3(map2),
		map3: F4(map3),
		map4: F5(map4),
		map5: F6(map5),
		sortBy: F2(sortBy),
		sortWith: F2(sortWith)
	};

	}();
	var _elm_lang$core$List$sortWith = _elm_lang$core$Native_List.sortWith;
	var _elm_lang$core$List$sortBy = _elm_lang$core$Native_List.sortBy;
	var _elm_lang$core$List$sort = function (xs) {
		return A2(_elm_lang$core$List$sortBy, _elm_lang$core$Basics$identity, xs);
	};
	var _elm_lang$core$List$drop = F2(
		function (n, list) {
			drop:
			while (true) {
				if (_elm_lang$core$Native_Utils.cmp(n, 0) < 1) {
					return list;
				} else {
					var _p0 = list;
					if (_p0.ctor === '[]') {
						return list;
					} else {
						var _v1 = n - 1,
							_v2 = _p0._1;
						n = _v1;
						list = _v2;
						continue drop;
					}
				}
			}
		});
	var _elm_lang$core$List$map5 = _elm_lang$core$Native_List.map5;
	var _elm_lang$core$List$map4 = _elm_lang$core$Native_List.map4;
	var _elm_lang$core$List$map3 = _elm_lang$core$Native_List.map3;
	var _elm_lang$core$List$map2 = _elm_lang$core$Native_List.map2;
	var _elm_lang$core$List$any = F2(
		function (isOkay, list) {
			any:
			while (true) {
				var _p1 = list;
				if (_p1.ctor === '[]') {
					return false;
				} else {
					if (isOkay(_p1._0)) {
						return true;
					} else {
						var _v4 = isOkay,
							_v5 = _p1._1;
						isOkay = _v4;
						list = _v5;
						continue any;
					}
				}
			}
		});
	var _elm_lang$core$List$all = F2(
		function (isOkay, list) {
			return _elm_lang$core$Basics$not(
				A2(
					_elm_lang$core$List$any,
					function (_p2) {
						return _elm_lang$core$Basics$not(
							isOkay(_p2));
					},
					list));
		});
	var _elm_lang$core$List$foldr = _elm_lang$core$Native_List.foldr;
	var _elm_lang$core$List$foldl = F3(
		function (func, acc, list) {
			foldl:
			while (true) {
				var _p3 = list;
				if (_p3.ctor === '[]') {
					return acc;
				} else {
					var _v7 = func,
						_v8 = A2(func, _p3._0, acc),
						_v9 = _p3._1;
					func = _v7;
					acc = _v8;
					list = _v9;
					continue foldl;
				}
			}
		});
	var _elm_lang$core$List$length = function (xs) {
		return A3(
			_elm_lang$core$List$foldl,
			F2(
				function (_p4, i) {
					return i + 1;
				}),
			0,
			xs);
	};
	var _elm_lang$core$List$sum = function (numbers) {
		return A3(
			_elm_lang$core$List$foldl,
			F2(
				function (x, y) {
					return x + y;
				}),
			0,
			numbers);
	};
	var _elm_lang$core$List$product = function (numbers) {
		return A3(
			_elm_lang$core$List$foldl,
			F2(
				function (x, y) {
					return x * y;
				}),
			1,
			numbers);
	};
	var _elm_lang$core$List$maximum = function (list) {
		var _p5 = list;
		if (_p5.ctor === '::') {
			return _elm_lang$core$Maybe$Just(
				A3(_elm_lang$core$List$foldl, _elm_lang$core$Basics$max, _p5._0, _p5._1));
		} else {
			return _elm_lang$core$Maybe$Nothing;
		}
	};
	var _elm_lang$core$List$minimum = function (list) {
		var _p6 = list;
		if (_p6.ctor === '::') {
			return _elm_lang$core$Maybe$Just(
				A3(_elm_lang$core$List$foldl, _elm_lang$core$Basics$min, _p6._0, _p6._1));
		} else {
			return _elm_lang$core$Maybe$Nothing;
		}
	};
	var _elm_lang$core$List$indexedMap = F2(
		function (f, xs) {
			return A3(
				_elm_lang$core$List$map2,
				f,
				_elm_lang$core$Native_List.range(
					0,
					_elm_lang$core$List$length(xs) - 1),
				xs);
		});
	var _elm_lang$core$List$member = F2(
		function (x, xs) {
			return A2(
				_elm_lang$core$List$any,
				function (a) {
					return _elm_lang$core$Native_Utils.eq(a, x);
				},
				xs);
		});
	var _elm_lang$core$List$isEmpty = function (xs) {
		var _p7 = xs;
		if (_p7.ctor === '[]') {
			return true;
		} else {
			return false;
		}
	};
	var _elm_lang$core$List$tail = function (list) {
		var _p8 = list;
		if (_p8.ctor === '::') {
			return _elm_lang$core$Maybe$Just(_p8._1);
		} else {
			return _elm_lang$core$Maybe$Nothing;
		}
	};
	var _elm_lang$core$List$head = function (list) {
		var _p9 = list;
		if (_p9.ctor === '::') {
			return _elm_lang$core$Maybe$Just(_p9._0);
		} else {
			return _elm_lang$core$Maybe$Nothing;
		}
	};
	var _elm_lang$core$List_ops = _elm_lang$core$List_ops || {};
	_elm_lang$core$List_ops['::'] = _elm_lang$core$Native_List.cons;
	var _elm_lang$core$List$map = F2(
		function (f, xs) {
			return A3(
				_elm_lang$core$List$foldr,
				F2(
					function (x, acc) {
						return A2(
							_elm_lang$core$List_ops['::'],
							f(x),
							acc);
					}),
				_elm_lang$core$Native_List.fromArray(
					[]),
				xs);
		});
	var _elm_lang$core$List$filter = F2(
		function (pred, xs) {
			var conditionalCons = F2(
				function (x, xs$) {
					return pred(x) ? A2(_elm_lang$core$List_ops['::'], x, xs$) : xs$;
				});
			return A3(
				_elm_lang$core$List$foldr,
				conditionalCons,
				_elm_lang$core$Native_List.fromArray(
					[]),
				xs);
		});
	var _elm_lang$core$List$maybeCons = F3(
		function (f, mx, xs) {
			var _p10 = f(mx);
			if (_p10.ctor === 'Just') {
				return A2(_elm_lang$core$List_ops['::'], _p10._0, xs);
			} else {
				return xs;
			}
		});
	var _elm_lang$core$List$filterMap = F2(
		function (f, xs) {
			return A3(
				_elm_lang$core$List$foldr,
				_elm_lang$core$List$maybeCons(f),
				_elm_lang$core$Native_List.fromArray(
					[]),
				xs);
		});
	var _elm_lang$core$List$reverse = function (list) {
		return A3(
			_elm_lang$core$List$foldl,
			F2(
				function (x, y) {
					return A2(_elm_lang$core$List_ops['::'], x, y);
				}),
			_elm_lang$core$Native_List.fromArray(
				[]),
			list);
	};
	var _elm_lang$core$List$scanl = F3(
		function (f, b, xs) {
			var scan1 = F2(
				function (x, accAcc) {
					var _p11 = accAcc;
					if (_p11.ctor === '::') {
						return A2(
							_elm_lang$core$List_ops['::'],
							A2(f, x, _p11._0),
							accAcc);
					} else {
						return _elm_lang$core$Native_List.fromArray(
							[]);
					}
				});
			return _elm_lang$core$List$reverse(
				A3(
					_elm_lang$core$List$foldl,
					scan1,
					_elm_lang$core$Native_List.fromArray(
						[b]),
					xs));
		});
	var _elm_lang$core$List$append = F2(
		function (xs, ys) {
			var _p12 = ys;
			if (_p12.ctor === '[]') {
				return xs;
			} else {
				return A3(
					_elm_lang$core$List$foldr,
					F2(
						function (x, y) {
							return A2(_elm_lang$core$List_ops['::'], x, y);
						}),
					ys,
					xs);
			}
		});
	var _elm_lang$core$List$concat = function (lists) {
		return A3(
			_elm_lang$core$List$foldr,
			_elm_lang$core$List$append,
			_elm_lang$core$Native_List.fromArray(
				[]),
			lists);
	};
	var _elm_lang$core$List$concatMap = F2(
		function (f, list) {
			return _elm_lang$core$List$concat(
				A2(_elm_lang$core$List$map, f, list));
		});
	var _elm_lang$core$List$partition = F2(
		function (pred, list) {
			var step = F2(
				function (x, _p13) {
					var _p14 = _p13;
					var _p16 = _p14._0;
					var _p15 = _p14._1;
					return pred(x) ? {
						ctor: '_Tuple2',
						_0: A2(_elm_lang$core$List_ops['::'], x, _p16),
						_1: _p15
					} : {
						ctor: '_Tuple2',
						_0: _p16,
						_1: A2(_elm_lang$core$List_ops['::'], x, _p15)
					};
				});
			return A3(
				_elm_lang$core$List$foldr,
				step,
				{
					ctor: '_Tuple2',
					_0: _elm_lang$core$Native_List.fromArray(
						[]),
					_1: _elm_lang$core$Native_List.fromArray(
						[])
				},
				list);
		});
	var _elm_lang$core$List$unzip = function (pairs) {
		var step = F2(
			function (_p18, _p17) {
				var _p19 = _p18;
				var _p20 = _p17;
				return {
					ctor: '_Tuple2',
					_0: A2(_elm_lang$core$List_ops['::'], _p19._0, _p20._0),
					_1: A2(_elm_lang$core$List_ops['::'], _p19._1, _p20._1)
				};
			});
		return A3(
			_elm_lang$core$List$foldr,
			step,
			{
				ctor: '_Tuple2',
				_0: _elm_lang$core$Native_List.fromArray(
					[]),
				_1: _elm_lang$core$Native_List.fromArray(
					[])
			},
			pairs);
	};
	var _elm_lang$core$List$intersperse = F2(
		function (sep, xs) {
			var _p21 = xs;
			if (_p21.ctor === '[]') {
				return _elm_lang$core$Native_List.fromArray(
					[]);
			} else {
				var step = F2(
					function (x, rest) {
						return A2(
							_elm_lang$core$List_ops['::'],
							sep,
							A2(_elm_lang$core$List_ops['::'], x, rest));
					});
				var spersed = A3(
					_elm_lang$core$List$foldr,
					step,
					_elm_lang$core$Native_List.fromArray(
						[]),
					_p21._1);
				return A2(_elm_lang$core$List_ops['::'], _p21._0, spersed);
			}
		});
	var _elm_lang$core$List$take = F2(
		function (n, list) {
			if (_elm_lang$core$Native_Utils.cmp(n, 0) < 1) {
				return _elm_lang$core$Native_List.fromArray(
					[]);
			} else {
				var _p22 = list;
				if (_p22.ctor === '[]') {
					return list;
				} else {
					return A2(
						_elm_lang$core$List_ops['::'],
						_p22._0,
						A2(_elm_lang$core$List$take, n - 1, _p22._1));
				}
			}
		});
	var _elm_lang$core$List$repeatHelp = F3(
		function (result, n, value) {
			repeatHelp:
			while (true) {
				if (_elm_lang$core$Native_Utils.cmp(n, 0) < 1) {
					return result;
				} else {
					var _v23 = A2(_elm_lang$core$List_ops['::'], value, result),
						_v24 = n - 1,
						_v25 = value;
					result = _v23;
					n = _v24;
					value = _v25;
					continue repeatHelp;
				}
			}
		});
	var _elm_lang$core$List$repeat = F2(
		function (n, value) {
			return A3(
				_elm_lang$core$List$repeatHelp,
				_elm_lang$core$Native_List.fromArray(
					[]),
				n,
				value);
		});

	var _elm_lang$core$Result$toMaybe = function (result) {
		var _p0 = result;
		if (_p0.ctor === 'Ok') {
			return _elm_lang$core$Maybe$Just(_p0._0);
		} else {
			return _elm_lang$core$Maybe$Nothing;
		}
	};
	var _elm_lang$core$Result$withDefault = F2(
		function (def, result) {
			var _p1 = result;
			if (_p1.ctor === 'Ok') {
				return _p1._0;
			} else {
				return def;
			}
		});
	var _elm_lang$core$Result$Err = function (a) {
		return {ctor: 'Err', _0: a};
	};
	var _elm_lang$core$Result$andThen = F2(
		function (result, callback) {
			var _p2 = result;
			if (_p2.ctor === 'Ok') {
				return callback(_p2._0);
			} else {
				return _elm_lang$core$Result$Err(_p2._0);
			}
		});
	var _elm_lang$core$Result$Ok = function (a) {
		return {ctor: 'Ok', _0: a};
	};
	var _elm_lang$core$Result$map = F2(
		function (func, ra) {
			var _p3 = ra;
			if (_p3.ctor === 'Ok') {
				return _elm_lang$core$Result$Ok(
					func(_p3._0));
			} else {
				return _elm_lang$core$Result$Err(_p3._0);
			}
		});
	var _elm_lang$core$Result$map2 = F3(
		function (func, ra, rb) {
			var _p4 = {ctor: '_Tuple2', _0: ra, _1: rb};
			if (_p4._0.ctor === 'Ok') {
				if (_p4._1.ctor === 'Ok') {
					return _elm_lang$core$Result$Ok(
						A2(func, _p4._0._0, _p4._1._0));
				} else {
					return _elm_lang$core$Result$Err(_p4._1._0);
				}
			} else {
				return _elm_lang$core$Result$Err(_p4._0._0);
			}
		});
	var _elm_lang$core$Result$map3 = F4(
		function (func, ra, rb, rc) {
			var _p5 = {ctor: '_Tuple3', _0: ra, _1: rb, _2: rc};
			if (_p5._0.ctor === 'Ok') {
				if (_p5._1.ctor === 'Ok') {
					if (_p5._2.ctor === 'Ok') {
						return _elm_lang$core$Result$Ok(
							A3(func, _p5._0._0, _p5._1._0, _p5._2._0));
					} else {
						return _elm_lang$core$Result$Err(_p5._2._0);
					}
				} else {
					return _elm_lang$core$Result$Err(_p5._1._0);
				}
			} else {
				return _elm_lang$core$Result$Err(_p5._0._0);
			}
		});
	var _elm_lang$core$Result$map4 = F5(
		function (func, ra, rb, rc, rd) {
			var _p6 = {ctor: '_Tuple4', _0: ra, _1: rb, _2: rc, _3: rd};
			if (_p6._0.ctor === 'Ok') {
				if (_p6._1.ctor === 'Ok') {
					if (_p6._2.ctor === 'Ok') {
						if (_p6._3.ctor === 'Ok') {
							return _elm_lang$core$Result$Ok(
								A4(func, _p6._0._0, _p6._1._0, _p6._2._0, _p6._3._0));
						} else {
							return _elm_lang$core$Result$Err(_p6._3._0);
						}
					} else {
						return _elm_lang$core$Result$Err(_p6._2._0);
					}
				} else {
					return _elm_lang$core$Result$Err(_p6._1._0);
				}
			} else {
				return _elm_lang$core$Result$Err(_p6._0._0);
			}
		});
	var _elm_lang$core$Result$map5 = F6(
		function (func, ra, rb, rc, rd, re) {
			var _p7 = {ctor: '_Tuple5', _0: ra, _1: rb, _2: rc, _3: rd, _4: re};
			if (_p7._0.ctor === 'Ok') {
				if (_p7._1.ctor === 'Ok') {
					if (_p7._2.ctor === 'Ok') {
						if (_p7._3.ctor === 'Ok') {
							if (_p7._4.ctor === 'Ok') {
								return _elm_lang$core$Result$Ok(
									A5(func, _p7._0._0, _p7._1._0, _p7._2._0, _p7._3._0, _p7._4._0));
							} else {
								return _elm_lang$core$Result$Err(_p7._4._0);
							}
						} else {
							return _elm_lang$core$Result$Err(_p7._3._0);
						}
					} else {
						return _elm_lang$core$Result$Err(_p7._2._0);
					}
				} else {
					return _elm_lang$core$Result$Err(_p7._1._0);
				}
			} else {
				return _elm_lang$core$Result$Err(_p7._0._0);
			}
		});
	var _elm_lang$core$Result$formatError = F2(
		function (f, result) {
			var _p8 = result;
			if (_p8.ctor === 'Ok') {
				return _elm_lang$core$Result$Ok(_p8._0);
			} else {
				return _elm_lang$core$Result$Err(
					f(_p8._0));
			}
		});
	var _elm_lang$core$Result$fromMaybe = F2(
		function (err, maybe) {
			var _p9 = maybe;
			if (_p9.ctor === 'Just') {
				return _elm_lang$core$Result$Ok(_p9._0);
			} else {
				return _elm_lang$core$Result$Err(err);
			}
		});

	//import //

	var _elm_lang$core$Native_Platform = function() {


	// PROGRAMS

	function addPublicModule(object, name, main)
	{
		var init = main ? makeEmbed(name, main) : mainIsUndefined(name);

		object['worker'] = function worker(flags)
		{
			return init(undefined, flags, false);
		}

		object['embed'] = function embed(domNode, flags)
		{
			return init(domNode, flags, true);
		}

		object['fullscreen'] = function fullscreen(flags)
		{
			return init(document.body, flags, true);
		};
	}


	// PROGRAM FAIL

	function mainIsUndefined(name)
	{
		return function(domNode)
		{
			var message = 'Cannot initialize module `' + name +
				'` because it has no `main` value!\nWhat should I show on screen?';
			domNode.innerHTML = errorHtml(message);
			throw new Error(message);
		};
	}

	function errorHtml(message)
	{
		return '<div style="padding-left:1em;">'
			+ '<h2 style="font-weight:normal;"><b>Oops!</b> Something went wrong when starting your Elm program.</h2>'
			+ '<pre style="padding-left:1em;">' + message + '</pre>'
			+ '</div>';
	}


	// PROGRAM SUCCESS

	function makeEmbed(moduleName, main)
	{
		return function embed(rootDomNode, flags, withRenderer)
		{
			try
			{
				var program = mainToProgram(moduleName, main);
				if (!withRenderer)
				{
					program.renderer = dummyRenderer;
				}
				return makeEmbedHelp(moduleName, program, rootDomNode, flags);
			}
			catch (e)
			{
				rootDomNode.innerHTML = errorHtml(e.message);
				throw e;
			}
		};
	}

	function dummyRenderer()
	{
		return { update: function() {} };
	}


	// MAIN TO PROGRAM

	function mainToProgram(moduleName, wrappedMain)
	{
		var main = wrappedMain.main;

		if (typeof main.init === 'undefined')
		{
			var emptyBag = batch(_elm_lang$core$Native_List.Nil);
			var noChange = _elm_lang$core$Native_Utils.Tuple2(
				_elm_lang$core$Native_Utils.Tuple0,
				emptyBag
			);

			return _elm_lang$virtual_dom$VirtualDom$programWithFlags({
				init: function() { return noChange; },
				view: function() { return main; },
				update: F2(function() { return noChange; }),
				subscriptions: function () { return emptyBag; }
			});
		}

		var flags = wrappedMain.flags;
		var init = flags
			? initWithFlags(moduleName, main.init, flags)
			: initWithoutFlags(moduleName, main.init);

		return _elm_lang$virtual_dom$VirtualDom$programWithFlags({
			init: init,
			view: main.view,
			update: main.update,
			subscriptions: main.subscriptions,
		});
	}

	function initWithoutFlags(moduleName, realInit)
	{
		return function init(flags)
		{
			if (typeof flags !== 'undefined')
			{
				throw new Error(
					'You are giving module `' + moduleName + '` an argument in JavaScript.\n'
					+ 'This module does not take arguments though! You probably need to change the\n'
					+ 'initialization code to something like `Elm.' + moduleName + '.fullscreen()`'
				);
			}
			return realInit();
		};
	}

	function initWithFlags(moduleName, realInit, flagDecoder)
	{
		return function init(flags)
		{
			var result = A2(_elm_lang$core$Native_Json.run, flagDecoder, flags);
			if (result.ctor === 'Err')
			{
				throw new Error(
					'You are trying to initialize module `' + moduleName + '` with an unexpected argument.\n'
					+ 'When trying to convert it to a usable Elm value, I run into this problem:\n\n'
					+ result._0
				);
			}
			return realInit(result._0);
		};
	}


	// SETUP RUNTIME SYSTEM

	function makeEmbedHelp(moduleName, program, rootDomNode, flags)
	{
		var init = program.init;
		var update = program.update;
		var subscriptions = program.subscriptions;
		var view = program.view;
		var makeRenderer = program.renderer;

		// ambient state
		var managers = {};
		var renderer;

		// init and update state in main process
		var initApp = _elm_lang$core$Native_Scheduler.nativeBinding(function(callback) {
			var results = init(flags);
			var model = results._0;
			renderer = makeRenderer(rootDomNode, enqueue, view(model));
			var cmds = results._1;
			var subs = subscriptions(model);
			dispatchEffects(managers, cmds, subs);
			callback(_elm_lang$core$Native_Scheduler.succeed(model));
		});

		function onMessage(msg, model)
		{
			return _elm_lang$core$Native_Scheduler.nativeBinding(function(callback) {
				var results = A2(update, msg, model);
				model = results._0;
				renderer.update(view(model));
				var cmds = results._1;
				var subs = subscriptions(model);
				dispatchEffects(managers, cmds, subs);
				callback(_elm_lang$core$Native_Scheduler.succeed(model));
			});
		}

		var mainProcess = spawnLoop(initApp, onMessage);

		function enqueue(msg)
		{
			_elm_lang$core$Native_Scheduler.rawSend(mainProcess, msg);
		}

		var ports = setupEffects(managers, enqueue);

		return ports ? { ports: ports } : {};
	}


	// EFFECT MANAGERS

	var effectManagers = {};

	function setupEffects(managers, callback)
	{
		var ports;

		// setup all necessary effect managers
		for (var key in effectManagers)
		{
			var manager = effectManagers[key];

			if (manager.isForeign)
			{
				ports = ports || {};
				ports[key] = manager.tag === 'cmd'
					? setupOutgoingPort(key)
					: setupIncomingPort(key, callback);
			}

			managers[key] = makeManager(manager, callback);
		}

		return ports;
	}

	function makeManager(info, callback)
	{
		var router = {
			main: callback,
			self: undefined
		};

		var tag = info.tag;
		var onEffects = info.onEffects;
		var onSelfMsg = info.onSelfMsg;

		function onMessage(msg, state)
		{
			if (msg.ctor === 'self')
			{
				return A3(onSelfMsg, router, msg._0, state);
			}

			var fx = msg._0;
			switch (tag)
			{
				case 'cmd':
					return A3(onEffects, router, fx.cmds, state);

				case 'sub':
					return A3(onEffects, router, fx.subs, state);

				case 'fx':
					return A4(onEffects, router, fx.cmds, fx.subs, state);
			}
		}

		var process = spawnLoop(info.init, onMessage);
		router.self = process;
		return process;
	}

	function sendToApp(router, msg)
	{
		return _elm_lang$core$Native_Scheduler.nativeBinding(function(callback)
		{
			router.main(msg);
			callback(_elm_lang$core$Native_Scheduler.succeed(_elm_lang$core$Native_Utils.Tuple0));
		});
	}

	function sendToSelf(router, msg)
	{
		return A2(_elm_lang$core$Native_Scheduler.send, router.self, {
			ctor: 'self',
			_0: msg
		});
	}


	// HELPER for STATEFUL LOOPS

	function spawnLoop(init, onMessage)
	{
		var andThen = _elm_lang$core$Native_Scheduler.andThen;

		function loop(state)
		{
			var handleMsg = _elm_lang$core$Native_Scheduler.receive(function(msg) {
				return onMessage(msg, state);
			});
			return A2(andThen, handleMsg, loop);
		}

		var task = A2(andThen, init, loop);

		return _elm_lang$core$Native_Scheduler.rawSpawn(task);
	}


	// BAGS

	function leaf(home)
	{
		return function(value)
		{
			return {
				type: 'leaf',
				home: home,
				value: value
			};
		};
	}

	function batch(list)
	{
		return {
			type: 'node',
			branches: list
		};
	}

	function map(tagger, bag)
	{
		return {
			type: 'map',
			tagger: tagger,
			tree: bag
		}
	}


	// PIPE BAGS INTO EFFECT MANAGERS

	function dispatchEffects(managers, cmdBag, subBag)
	{
		var effectsDict = {};
		gatherEffects(true, cmdBag, effectsDict, null);
		gatherEffects(false, subBag, effectsDict, null);

		for (var home in managers)
		{
			var fx = home in effectsDict
				? effectsDict[home]
				: {
					cmds: _elm_lang$core$Native_List.Nil,
					subs: _elm_lang$core$Native_List.Nil
				};

			_elm_lang$core$Native_Scheduler.rawSend(managers[home], { ctor: 'fx', _0: fx });
		}
	}

	function gatherEffects(isCmd, bag, effectsDict, taggers)
	{
		switch (bag.type)
		{
			case 'leaf':
				var home = bag.home;
				var effect = toEffect(isCmd, home, taggers, bag.value);
				effectsDict[home] = insert(isCmd, effect, effectsDict[home]);
				return;

			case 'node':
				var list = bag.branches;
				while (list.ctor !== '[]')
				{
					gatherEffects(isCmd, list._0, effectsDict, taggers);
					list = list._1;
				}
				return;

			case 'map':
				gatherEffects(isCmd, bag.tree, effectsDict, {
					tagger: bag.tagger,
					rest: taggers
				});
				return;
		}
	}

	function toEffect(isCmd, home, taggers, value)
	{
		function applyTaggers(x)
		{
			while (taggers)
			{
				x = taggers.tagger(x);
				taggers = taggers.rest;
			}
			return x;
		}

		var map = isCmd
			? effectManagers[home].cmdMap
			: effectManagers[home].subMap;

		return A2(map, applyTaggers, value)
	}

	function insert(isCmd, newEffect, effects)
	{
		effects = effects || {
			cmds: _elm_lang$core$Native_List.Nil,
			subs: _elm_lang$core$Native_List.Nil
		};
		if (isCmd)
		{
			effects.cmds = _elm_lang$core$Native_List.Cons(newEffect, effects.cmds);
			return effects;
		}
		effects.subs = _elm_lang$core$Native_List.Cons(newEffect, effects.subs);
		return effects;
	}


	// PORTS

	function checkPortName(name)
	{
		if (name in effectManagers)
		{
			throw new Error('There can only be one port named `' + name + '`, but your program has multiple.');
		}
	}


	// OUTGOING PORTS

	function outgoingPort(name, converter)
	{
		checkPortName(name);
		effectManagers[name] = {
			tag: 'cmd',
			cmdMap: outgoingPortMap,
			converter: converter,
			isForeign: true
		};
		return leaf(name);
	}

	var outgoingPortMap = F2(function cmdMap(tagger, value) {
		return value;
	});

	function setupOutgoingPort(name)
	{
		var subs = [];
		var converter = effectManagers[name].converter;

		// CREATE MANAGER

		var init = _elm_lang$core$Native_Scheduler.succeed(null);

		function onEffects(router, cmdList, state)
		{
			while (cmdList.ctor !== '[]')
			{
				var value = converter(cmdList._0);
				for (var i = 0; i < subs.length; i++)
				{
					subs[i](value);
				}
				cmdList = cmdList._1;
			}
			return init;
		}

		effectManagers[name].init = init;
		effectManagers[name].onEffects = F3(onEffects);

		// PUBLIC API

		function subscribe(callback)
		{
			subs.push(callback);
		}

		function unsubscribe(callback)
		{
			var index = subs.indexOf(callback);
			if (index >= 0)
			{
				subs.splice(index, 1);
			}
		}

		return {
			subscribe: subscribe,
			unsubscribe: unsubscribe
		};
	}


	// INCOMING PORTS

	function incomingPort(name, converter)
	{
		checkPortName(name);
		effectManagers[name] = {
			tag: 'sub',
			subMap: incomingPortMap,
			converter: converter,
			isForeign: true
		};
		return leaf(name);
	}

	var incomingPortMap = F2(function subMap(tagger, finalTagger)
	{
		return function(value)
		{
			return tagger(finalTagger(value));
		};
	});

	function setupIncomingPort(name, callback)
	{
		var subs = _elm_lang$core$Native_List.Nil;
		var converter = effectManagers[name].converter;

		// CREATE MANAGER

		var init = _elm_lang$core$Native_Scheduler.succeed(null);

		function onEffects(router, subList, state)
		{
			subs = subList;
			return init;
		}

		effectManagers[name].init = init;
		effectManagers[name].onEffects = F3(onEffects);

		// PUBLIC API

		function send(value)
		{
			var result = A2(_elm_lang$core$Json_Decode$decodeValue, converter, value);
			if (result.ctor === 'Err')
			{
				throw new Error('Trying to send an unexpected type of value through port `' + name + '`:\n' + result._0);
			}

			var value = result._0;
			var temp = subs;
			while (temp.ctor !== '[]')
			{
				callback(temp._0(value));
				temp = temp._1;
			}
		}

		return { send: send };
	}

	return {
		// routers
		sendToApp: F2(sendToApp),
		sendToSelf: F2(sendToSelf),

		// global setup
		mainToProgram: mainToProgram,
		effectManagers: effectManagers,
		outgoingPort: outgoingPort,
		incomingPort: incomingPort,
		addPublicModule: addPublicModule,

		// effect bags
		leaf: leaf,
		batch: batch,
		map: F2(map)
	};

	}();
	//import Native.Utils //

	var _elm_lang$core$Native_Scheduler = function() {

	var MAX_STEPS = 10000;


	// TASKS

	function succeed(value)
	{
		return {
			ctor: '_Task_succeed',
			value: value
		};
	}

	function fail(error)
	{
		return {
			ctor: '_Task_fail',
			value: error
		};
	}

	function nativeBinding(callback)
	{
		return {
			ctor: '_Task_nativeBinding',
			callback: callback,
			cancel: null
		};
	}

	function andThen(task, callback)
	{
		return {
			ctor: '_Task_andThen',
			task: task,
			callback: callback
		};
	}

	function onError(task, callback)
	{
		return {
			ctor: '_Task_onError',
			task: task,
			callback: callback
		};
	}

	function receive(callback)
	{
		return {
			ctor: '_Task_receive',
			callback: callback
		};
	}


	// PROCESSES

	function rawSpawn(task)
	{
		var process = {
			ctor: '_Process',
			id: _elm_lang$core$Native_Utils.guid(),
			root: task,
			stack: null,
			mailbox: []
		};

		enqueue(process);

		return process;
	}

	function spawn(task)
	{
		return nativeBinding(function(callback) {
			var process = rawSpawn(task);
			callback(succeed(process));
		});
	}

	function rawSend(process, msg)
	{
		process.mailbox.push(msg);
		enqueue(process);
	}

	function send(process, msg)
	{
		return nativeBinding(function(callback) {
			rawSend(process, msg);
			callback(succeed(_elm_lang$core$Native_Utils.Tuple0));
		});
	}

	function kill(process)
	{
		return nativeBinding(function(callback) {
			var root = process.root;
			if (root.ctor === '_Task_nativeBinding' && root.cancel)
			{
				root.cancel();
			}

			process.root = null;

			callback(succeed(_elm_lang$core$Native_Utils.Tuple0));
		});
	}

	function sleep(time)
	{
		return nativeBinding(function(callback) {
			var id = setTimeout(function() {
				callback(succeed(_elm_lang$core$Native_Utils.Tuple0));
			}, time);

			return function() { clearTimeout(id); };
		});
	}


	// STEP PROCESSES

	function step(numSteps, process)
	{
		while (numSteps < MAX_STEPS)
		{
			var ctor = process.root.ctor;

			if (ctor === '_Task_succeed')
			{
				while (process.stack && process.stack.ctor === '_Task_onError')
				{
					process.stack = process.stack.rest;
				}
				if (process.stack === null)
				{
					break;
				}
				process.root = process.stack.callback(process.root.value);
				process.stack = process.stack.rest;
				++numSteps;
				continue;
			}

			if (ctor === '_Task_fail')
			{
				while (process.stack && process.stack.ctor === '_Task_andThen')
				{
					process.stack = process.stack.rest;
				}
				if (process.stack === null)
				{
					break;
				}
				process.root = process.stack.callback(process.root.value);
				process.stack = process.stack.rest;
				++numSteps;
				continue;
			}

			if (ctor === '_Task_andThen')
			{
				process.stack = {
					ctor: '_Task_andThen',
					callback: process.root.callback,
					rest: process.stack
				};
				process.root = process.root.task;
				++numSteps;
				continue;
			}

			if (ctor === '_Task_onError')
			{
				process.stack = {
					ctor: '_Task_onError',
					callback: process.root.callback,
					rest: process.stack
				};
				process.root = process.root.task;
				++numSteps;
				continue;
			}

			if (ctor === '_Task_nativeBinding')
			{
				process.root.cancel = process.root.callback(function(newRoot) {
					process.root = newRoot;
					enqueue(process);
				});

				break;
			}

			if (ctor === '_Task_receive')
			{
				var mailbox = process.mailbox;
				if (mailbox.length === 0)
				{
					break;
				}

				process.root = process.root.callback(mailbox.shift());
				++numSteps;
				continue;
			}

			throw new Error(ctor);
		}

		if (numSteps < MAX_STEPS)
		{
			return numSteps + 1;
		}
		enqueue(process);

		return numSteps;
	}


	// WORK QUEUE

	var working = false;
	var workQueue = [];

	function enqueue(process)
	{
		workQueue.push(process);

		if (!working)
		{
			setTimeout(work, 0);
			working = true;
		}
	}

	function work()
	{
		var numSteps = 0;
		var process;
		while (numSteps < MAX_STEPS && (process = workQueue.shift()))
		{
			numSteps = step(numSteps, process);
		}
		if (!process)
		{
			working = false;
			return;
		}
		setTimeout(work, 0);
	}


	return {
		succeed: succeed,
		fail: fail,
		nativeBinding: nativeBinding,
		andThen: F2(andThen),
		onError: F2(onError),
		receive: receive,

		spawn: spawn,
		kill: kill,
		sleep: sleep,
		send: F2(send),

		rawSpawn: rawSpawn,
		rawSend: rawSend
	};

	}();
	var _elm_lang$core$Platform$hack = _elm_lang$core$Native_Scheduler.succeed;
	var _elm_lang$core$Platform$sendToSelf = _elm_lang$core$Native_Platform.sendToSelf;
	var _elm_lang$core$Platform$sendToApp = _elm_lang$core$Native_Platform.sendToApp;
	var _elm_lang$core$Platform$Program = {ctor: 'Program'};
	var _elm_lang$core$Platform$Task = {ctor: 'Task'};
	var _elm_lang$core$Platform$ProcessId = {ctor: 'ProcessId'};
	var _elm_lang$core$Platform$Router = {ctor: 'Router'};

	var _elm_lang$core$Platform_Cmd$batch = _elm_lang$core$Native_Platform.batch;
	var _elm_lang$core$Platform_Cmd$none = _elm_lang$core$Platform_Cmd$batch(
		_elm_lang$core$Native_List.fromArray(
			[]));
	var _elm_lang$core$Platform_Cmd_ops = _elm_lang$core$Platform_Cmd_ops || {};
	_elm_lang$core$Platform_Cmd_ops['!'] = F2(
		function (model, commands) {
			return {
				ctor: '_Tuple2',
				_0: model,
				_1: _elm_lang$core$Platform_Cmd$batch(commands)
			};
		});
	var _elm_lang$core$Platform_Cmd$map = _elm_lang$core$Native_Platform.map;
	var _elm_lang$core$Platform_Cmd$Cmd = {ctor: 'Cmd'};

	var _elm_lang$core$Platform_Sub$batch = _elm_lang$core$Native_Platform.batch;
	var _elm_lang$core$Platform_Sub$none = _elm_lang$core$Platform_Sub$batch(
		_elm_lang$core$Native_List.fromArray(
			[]));
	var _elm_lang$core$Platform_Sub$map = _elm_lang$core$Native_Platform.map;
	var _elm_lang$core$Platform_Sub$Sub = {ctor: 'Sub'};

	//import Native.List //

	var _elm_lang$core$Native_Array = function() {

	// A RRB-Tree has two distinct data types.
	// Leaf -> "height"  is always 0
	//         "table"   is an array of elements
	// Node -> "height"  is always greater than 0
	//         "table"   is an array of child nodes
	//         "lengths" is an array of accumulated lengths of the child nodes

	// M is the maximal table size. 32 seems fast. E is the allowed increase
	// of search steps when concatting to find an index. Lower values will
	// decrease balancing, but will increase search steps.
	var M = 32;
	var E = 2;

	// An empty array.
	var empty = {
		ctor: '_Array',
		height: 0,
		table: []
	};


	function get(i, array)
	{
		if (i < 0 || i >= length(array))
		{
			throw new Error(
				'Index ' + i + ' is out of range. Check the length of ' +
				'your array first or use getMaybe or getWithDefault.');
		}
		return unsafeGet(i, array);
	}


	function unsafeGet(i, array)
	{
		for (var x = array.height; x > 0; x--)
		{
			var slot = i >> (x * 5);
			while (array.lengths[slot] <= i)
			{
				slot++;
			}
			if (slot > 0)
			{
				i -= array.lengths[slot - 1];
			}
			array = array.table[slot];
		}
		return array.table[i];
	}


	// Sets the value at the index i. Only the nodes leading to i will get
	// copied and updated.
	function set(i, item, array)
	{
		if (i < 0 || length(array) <= i)
		{
			return array;
		}
		return unsafeSet(i, item, array);
	}


	function unsafeSet(i, item, array)
	{
		array = nodeCopy(array);

		if (array.height === 0)
		{
			array.table[i] = item;
		}
		else
		{
			var slot = getSlot(i, array);
			if (slot > 0)
			{
				i -= array.lengths[slot - 1];
			}
			array.table[slot] = unsafeSet(i, item, array.table[slot]);
		}
		return array;
	}


	function initialize(len, f)
	{
		if (len <= 0)
		{
			return empty;
		}
		var h = Math.floor( Math.log(len) / Math.log(M) );
		return initialize_(f, h, 0, len);
	}

	function initialize_(f, h, from, to)
	{
		if (h === 0)
		{
			var table = new Array((to - from) % (M + 1));
			for (var i = 0; i < table.length; i++)
			{
			  table[i] = f(from + i);
			}
			return {
				ctor: '_Array',
				height: 0,
				table: table
			};
		}

		var step = Math.pow(M, h);
		var table = new Array(Math.ceil((to - from) / step));
		var lengths = new Array(table.length);
		for (var i = 0; i < table.length; i++)
		{
			table[i] = initialize_(f, h - 1, from + (i * step), Math.min(from + ((i + 1) * step), to));
			lengths[i] = length(table[i]) + (i > 0 ? lengths[i-1] : 0);
		}
		return {
			ctor: '_Array',
			height: h,
			table: table,
			lengths: lengths
		};
	}

	function fromList(list)
	{
		if (list.ctor === '[]')
		{
			return empty;
		}

		// Allocate M sized blocks (table) and write list elements to it.
		var table = new Array(M);
		var nodes = [];
		var i = 0;

		while (list.ctor !== '[]')
		{
			table[i] = list._0;
			list = list._1;
			i++;

			// table is full, so we can push a leaf containing it into the
			// next node.
			if (i === M)
			{
				var leaf = {
					ctor: '_Array',
					height: 0,
					table: table
				};
				fromListPush(leaf, nodes);
				table = new Array(M);
				i = 0;
			}
		}

		// Maybe there is something left on the table.
		if (i > 0)
		{
			var leaf = {
				ctor: '_Array',
				height: 0,
				table: table.splice(0, i)
			};
			fromListPush(leaf, nodes);
		}

		// Go through all of the nodes and eventually push them into higher nodes.
		for (var h = 0; h < nodes.length - 1; h++)
		{
			if (nodes[h].table.length > 0)
			{
				fromListPush(nodes[h], nodes);
			}
		}

		var head = nodes[nodes.length - 1];
		if (head.height > 0 && head.table.length === 1)
		{
			return head.table[0];
		}
		else
		{
			return head;
		}
	}

	// Push a node into a higher node as a child.
	function fromListPush(toPush, nodes)
	{
		var h = toPush.height;

		// Maybe the node on this height does not exist.
		if (nodes.length === h)
		{
			var node = {
				ctor: '_Array',
				height: h + 1,
				table: [],
				lengths: []
			};
			nodes.push(node);
		}

		nodes[h].table.push(toPush);
		var len = length(toPush);
		if (nodes[h].lengths.length > 0)
		{
			len += nodes[h].lengths[nodes[h].lengths.length - 1];
		}
		nodes[h].lengths.push(len);

		if (nodes[h].table.length === M)
		{
			fromListPush(nodes[h], nodes);
			nodes[h] = {
				ctor: '_Array',
				height: h + 1,
				table: [],
				lengths: []
			};
		}
	}

	// Pushes an item via push_ to the bottom right of a tree.
	function push(item, a)
	{
		var pushed = push_(item, a);
		if (pushed !== null)
		{
			return pushed;
		}

		var newTree = create(item, a.height);
		return siblise(a, newTree);
	}

	// Recursively tries to push an item to the bottom-right most
	// tree possible. If there is no space left for the item,
	// null will be returned.
	function push_(item, a)
	{
		// Handle resursion stop at leaf level.
		if (a.height === 0)
		{
			if (a.table.length < M)
			{
				var newA = {
					ctor: '_Array',
					height: 0,
					table: a.table.slice()
				};
				newA.table.push(item);
				return newA;
			}
			else
			{
			  return null;
			}
		}

		// Recursively push
		var pushed = push_(item, botRight(a));

		// There was space in the bottom right tree, so the slot will
		// be updated.
		if (pushed !== null)
		{
			var newA = nodeCopy(a);
			newA.table[newA.table.length - 1] = pushed;
			newA.lengths[newA.lengths.length - 1]++;
			return newA;
		}

		// When there was no space left, check if there is space left
		// for a new slot with a tree which contains only the item
		// at the bottom.
		if (a.table.length < M)
		{
			var newSlot = create(item, a.height - 1);
			var newA = nodeCopy(a);
			newA.table.push(newSlot);
			newA.lengths.push(newA.lengths[newA.lengths.length - 1] + length(newSlot));
			return newA;
		}
		else
		{
			return null;
		}
	}

	// Converts an array into a list of elements.
	function toList(a)
	{
		return toList_(_elm_lang$core$Native_List.Nil, a);
	}

	function toList_(list, a)
	{
		for (var i = a.table.length - 1; i >= 0; i--)
		{
			list =
				a.height === 0
					? _elm_lang$core$Native_List.Cons(a.table[i], list)
					: toList_(list, a.table[i]);
		}
		return list;
	}

	// Maps a function over the elements of an array.
	function map(f, a)
	{
		var newA = {
			ctor: '_Array',
			height: a.height,
			table: new Array(a.table.length)
		};
		if (a.height > 0)
		{
			newA.lengths = a.lengths;
		}
		for (var i = 0; i < a.table.length; i++)
		{
			newA.table[i] =
				a.height === 0
					? f(a.table[i])
					: map(f, a.table[i]);
		}
		return newA;
	}

	// Maps a function over the elements with their index as first argument.
	function indexedMap(f, a)
	{
		return indexedMap_(f, a, 0);
	}

	function indexedMap_(f, a, from)
	{
		var newA = {
			ctor: '_Array',
			height: a.height,
			table: new Array(a.table.length)
		};
		if (a.height > 0)
		{
			newA.lengths = a.lengths;
		}
		for (var i = 0; i < a.table.length; i++)
		{
			newA.table[i] =
				a.height === 0
					? A2(f, from + i, a.table[i])
					: indexedMap_(f, a.table[i], i == 0 ? from : from + a.lengths[i - 1]);
		}
		return newA;
	}

	function foldl(f, b, a)
	{
		if (a.height === 0)
		{
			for (var i = 0; i < a.table.length; i++)
			{
				b = A2(f, a.table[i], b);
			}
		}
		else
		{
			for (var i = 0; i < a.table.length; i++)
			{
				b = foldl(f, b, a.table[i]);
			}
		}
		return b;
	}

	function foldr(f, b, a)
	{
		if (a.height === 0)
		{
			for (var i = a.table.length; i--; )
			{
				b = A2(f, a.table[i], b);
			}
		}
		else
		{
			for (var i = a.table.length; i--; )
			{
				b = foldr(f, b, a.table[i]);
			}
		}
		return b;
	}

	// TODO: currently, it slices the right, then the left. This can be
	// optimized.
	function slice(from, to, a)
	{
		if (from < 0)
		{
			from += length(a);
		}
		if (to < 0)
		{
			to += length(a);
		}
		return sliceLeft(from, sliceRight(to, a));
	}

	function sliceRight(to, a)
	{
		if (to === length(a))
		{
			return a;
		}

		// Handle leaf level.
		if (a.height === 0)
		{
			var newA = { ctor:'_Array', height:0 };
			newA.table = a.table.slice(0, to);
			return newA;
		}

		// Slice the right recursively.
		var right = getSlot(to, a);
		var sliced = sliceRight(to - (right > 0 ? a.lengths[right - 1] : 0), a.table[right]);

		// Maybe the a node is not even needed, as sliced contains the whole slice.
		if (right === 0)
		{
			return sliced;
		}

		// Create new node.
		var newA = {
			ctor: '_Array',
			height: a.height,
			table: a.table.slice(0, right),
			lengths: a.lengths.slice(0, right)
		};
		if (sliced.table.length > 0)
		{
			newA.table[right] = sliced;
			newA.lengths[right] = length(sliced) + (right > 0 ? newA.lengths[right - 1] : 0);
		}
		return newA;
	}

	function sliceLeft(from, a)
	{
		if (from === 0)
		{
			return a;
		}

		// Handle leaf level.
		if (a.height === 0)
		{
			var newA = { ctor:'_Array', height:0 };
			newA.table = a.table.slice(from, a.table.length + 1);
			return newA;
		}

		// Slice the left recursively.
		var left = getSlot(from, a);
		var sliced = sliceLeft(from - (left > 0 ? a.lengths[left - 1] : 0), a.table[left]);

		// Maybe the a node is not even needed, as sliced contains the whole slice.
		if (left === a.table.length - 1)
		{
			return sliced;
		}

		// Create new node.
		var newA = {
			ctor: '_Array',
			height: a.height,
			table: a.table.slice(left, a.table.length + 1),
			lengths: new Array(a.table.length - left)
		};
		newA.table[0] = sliced;
		var len = 0;
		for (var i = 0; i < newA.table.length; i++)
		{
			len += length(newA.table[i]);
			newA.lengths[i] = len;
		}

		return newA;
	}

	// Appends two trees.
	function append(a,b)
	{
		if (a.table.length === 0)
		{
			return b;
		}
		if (b.table.length === 0)
		{
			return a;
		}

		var c = append_(a, b);

		// Check if both nodes can be crunshed together.
		if (c[0].table.length + c[1].table.length <= M)
		{
			if (c[0].table.length === 0)
			{
				return c[1];
			}
			if (c[1].table.length === 0)
			{
				return c[0];
			}

			// Adjust .table and .lengths
			c[0].table = c[0].table.concat(c[1].table);
			if (c[0].height > 0)
			{
				var len = length(c[0]);
				for (var i = 0; i < c[1].lengths.length; i++)
				{
					c[1].lengths[i] += len;
				}
				c[0].lengths = c[0].lengths.concat(c[1].lengths);
			}

			return c[0];
		}

		if (c[0].height > 0)
		{
			var toRemove = calcToRemove(a, b);
			if (toRemove > E)
			{
				c = shuffle(c[0], c[1], toRemove);
			}
		}

		return siblise(c[0], c[1]);
	}

	// Returns an array of two nodes; right and left. One node _may_ be empty.
	function append_(a, b)
	{
		if (a.height === 0 && b.height === 0)
		{
			return [a, b];
		}

		if (a.height !== 1 || b.height !== 1)
		{
			if (a.height === b.height)
			{
				a = nodeCopy(a);
				b = nodeCopy(b);
				var appended = append_(botRight(a), botLeft(b));

				insertRight(a, appended[1]);
				insertLeft(b, appended[0]);
			}
			else if (a.height > b.height)
			{
				a = nodeCopy(a);
				var appended = append_(botRight(a), b);

				insertRight(a, appended[0]);
				b = parentise(appended[1], appended[1].height + 1);
			}
			else
			{
				b = nodeCopy(b);
				var appended = append_(a, botLeft(b));

				var left = appended[0].table.length === 0 ? 0 : 1;
				var right = left === 0 ? 1 : 0;
				insertLeft(b, appended[left]);
				a = parentise(appended[right], appended[right].height + 1);
			}
		}

		// Check if balancing is needed and return based on that.
		if (a.table.length === 0 || b.table.length === 0)
		{
			return [a, b];
		}

		var toRemove = calcToRemove(a, b);
		if (toRemove <= E)
		{
			return [a, b];
		}
		return shuffle(a, b, toRemove);
	}

	// Helperfunctions for append_. Replaces a child node at the side of the parent.
	function insertRight(parent, node)
	{
		var index = parent.table.length - 1;
		parent.table[index] = node;
		parent.lengths[index] = length(node);
		parent.lengths[index] += index > 0 ? parent.lengths[index - 1] : 0;
	}

	function insertLeft(parent, node)
	{
		if (node.table.length > 0)
		{
			parent.table[0] = node;
			parent.lengths[0] = length(node);

			var len = length(parent.table[0]);
			for (var i = 1; i < parent.lengths.length; i++)
			{
				len += length(parent.table[i]);
				parent.lengths[i] = len;
			}
		}
		else
		{
			parent.table.shift();
			for (var i = 1; i < parent.lengths.length; i++)
			{
				parent.lengths[i] = parent.lengths[i] - parent.lengths[0];
			}
			parent.lengths.shift();
		}
	}

	// Returns the extra search steps for E. Refer to the paper.
	function calcToRemove(a, b)
	{
		var subLengths = 0;
		for (var i = 0; i < a.table.length; i++)
		{
			subLengths += a.table[i].table.length;
		}
		for (var i = 0; i < b.table.length; i++)
		{
			subLengths += b.table[i].table.length;
		}

		var toRemove = a.table.length + b.table.length;
		return toRemove - (Math.floor((subLengths - 1) / M) + 1);
	}

	// get2, set2 and saveSlot are helpers for accessing elements over two arrays.
	function get2(a, b, index)
	{
		return index < a.length
			? a[index]
			: b[index - a.length];
	}

	function set2(a, b, index, value)
	{
		if (index < a.length)
		{
			a[index] = value;
		}
		else
		{
			b[index - a.length] = value;
		}
	}

	function saveSlot(a, b, index, slot)
	{
		set2(a.table, b.table, index, slot);

		var l = (index === 0 || index === a.lengths.length)
			? 0
			: get2(a.lengths, a.lengths, index - 1);

		set2(a.lengths, b.lengths, index, l + length(slot));
	}

	// Creates a node or leaf with a given length at their arrays for perfomance.
	// Is only used by shuffle.
	function createNode(h, length)
	{
		if (length < 0)
		{
			length = 0;
		}
		var a = {
			ctor: '_Array',
			height: h,
			table: new Array(length)
		};
		if (h > 0)
		{
			a.lengths = new Array(length);
		}
		return a;
	}

	// Returns an array of two balanced nodes.
	function shuffle(a, b, toRemove)
	{
		var newA = createNode(a.height, Math.min(M, a.table.length + b.table.length - toRemove));
		var newB = createNode(a.height, newA.table.length - (a.table.length + b.table.length - toRemove));

		// Skip the slots with size M. More precise: copy the slot references
		// to the new node
		var read = 0;
		while (get2(a.table, b.table, read).table.length % M === 0)
		{
			set2(newA.table, newB.table, read, get2(a.table, b.table, read));
			set2(newA.lengths, newB.lengths, read, get2(a.lengths, b.lengths, read));
			read++;
		}

		// Pulling items from left to right, caching in a slot before writing
		// it into the new nodes.
		var write = read;
		var slot = new createNode(a.height - 1, 0);
		var from = 0;

		// If the current slot is still containing data, then there will be at
		// least one more write, so we do not break this loop yet.
		while (read - write - (slot.table.length > 0 ? 1 : 0) < toRemove)
		{
			// Find out the max possible items for copying.
			var source = get2(a.table, b.table, read);
			var to = Math.min(M - slot.table.length, source.table.length);

			// Copy and adjust size table.
			slot.table = slot.table.concat(source.table.slice(from, to));
			if (slot.height > 0)
			{
				var len = slot.lengths.length;
				for (var i = len; i < len + to - from; i++)
				{
					slot.lengths[i] = length(slot.table[i]);
					slot.lengths[i] += (i > 0 ? slot.lengths[i - 1] : 0);
				}
			}

			from += to;

			// Only proceed to next slots[i] if the current one was
			// fully copied.
			if (source.table.length <= to)
			{
				read++; from = 0;
			}

			// Only create a new slot if the current one is filled up.
			if (slot.table.length === M)
			{
				saveSlot(newA, newB, write, slot);
				slot = createNode(a.height - 1, 0);
				write++;
			}
		}

		// Cleanup after the loop. Copy the last slot into the new nodes.
		if (slot.table.length > 0)
		{
			saveSlot(newA, newB, write, slot);
			write++;
		}

		// Shift the untouched slots to the left
		while (read < a.table.length + b.table.length )
		{
			saveSlot(newA, newB, write, get2(a.table, b.table, read));
			read++;
			write++;
		}

		return [newA, newB];
	}

	// Navigation functions
	function botRight(a)
	{
		return a.table[a.table.length - 1];
	}
	function botLeft(a)
	{
		return a.table[0];
	}

	// Copies a node for updating. Note that you should not use this if
	// only updating only one of "table" or "lengths" for performance reasons.
	function nodeCopy(a)
	{
		var newA = {
			ctor: '_Array',
			height: a.height,
			table: a.table.slice()
		};
		if (a.height > 0)
		{
			newA.lengths = a.lengths.slice();
		}
		return newA;
	}

	// Returns how many items are in the tree.
	function length(array)
	{
		if (array.height === 0)
		{
			return array.table.length;
		}
		else
		{
			return array.lengths[array.lengths.length - 1];
		}
	}

	// Calculates in which slot of "table" the item probably is, then
	// find the exact slot via forward searching in  "lengths". Returns the index.
	function getSlot(i, a)
	{
		var slot = i >> (5 * a.height);
		while (a.lengths[slot] <= i)
		{
			slot++;
		}
		return slot;
	}

	// Recursively creates a tree with a given height containing
	// only the given item.
	function create(item, h)
	{
		if (h === 0)
		{
			return {
				ctor: '_Array',
				height: 0,
				table: [item]
			};
		}
		return {
			ctor: '_Array',
			height: h,
			table: [create(item, h - 1)],
			lengths: [1]
		};
	}

	// Recursively creates a tree that contains the given tree.
	function parentise(tree, h)
	{
		if (h === tree.height)
		{
			return tree;
		}

		return {
			ctor: '_Array',
			height: h,
			table: [parentise(tree, h - 1)],
			lengths: [length(tree)]
		};
	}

	// Emphasizes blood brotherhood beneath two trees.
	function siblise(a, b)
	{
		return {
			ctor: '_Array',
			height: a.height + 1,
			table: [a, b],
			lengths: [length(a), length(a) + length(b)]
		};
	}

	function toJSArray(a)
	{
		var jsArray = new Array(length(a));
		toJSArray_(jsArray, 0, a);
		return jsArray;
	}

	function toJSArray_(jsArray, i, a)
	{
		for (var t = 0; t < a.table.length; t++)
		{
			if (a.height === 0)
			{
				jsArray[i + t] = a.table[t];
			}
			else
			{
				var inc = t === 0 ? 0 : a.lengths[t - 1];
				toJSArray_(jsArray, i + inc, a.table[t]);
			}
		}
	}

	function fromJSArray(jsArray)
	{
		if (jsArray.length === 0)
		{
			return empty;
		}
		var h = Math.floor(Math.log(jsArray.length) / Math.log(M));
		return fromJSArray_(jsArray, h, 0, jsArray.length);
	}

	function fromJSArray_(jsArray, h, from, to)
	{
		if (h === 0)
		{
			return {
				ctor: '_Array',
				height: 0,
				table: jsArray.slice(from, to)
			};
		}

		var step = Math.pow(M, h);
		var table = new Array(Math.ceil((to - from) / step));
		var lengths = new Array(table.length);
		for (var i = 0; i < table.length; i++)
		{
			table[i] = fromJSArray_(jsArray, h - 1, from + (i * step), Math.min(from + ((i + 1) * step), to));
			lengths[i] = length(table[i]) + (i > 0 ? lengths[i - 1] : 0);
		}
		return {
			ctor: '_Array',
			height: h,
			table: table,
			lengths: lengths
		};
	}

	return {
		empty: empty,
		fromList: fromList,
		toList: toList,
		initialize: F2(initialize),
		append: F2(append),
		push: F2(push),
		slice: F3(slice),
		get: F2(get),
		set: F3(set),
		map: F2(map),
		indexedMap: F2(indexedMap),
		foldl: F3(foldl),
		foldr: F3(foldr),
		length: length,

		toJSArray: toJSArray,
		fromJSArray: fromJSArray
	};

	}();
	var _elm_lang$core$Array$append = _elm_lang$core$Native_Array.append;
	var _elm_lang$core$Array$length = _elm_lang$core$Native_Array.length;
	var _elm_lang$core$Array$isEmpty = function (array) {
		return _elm_lang$core$Native_Utils.eq(
			_elm_lang$core$Array$length(array),
			0);
	};
	var _elm_lang$core$Array$slice = _elm_lang$core$Native_Array.slice;
	var _elm_lang$core$Array$set = _elm_lang$core$Native_Array.set;
	var _elm_lang$core$Array$get = F2(
		function (i, array) {
			return ((_elm_lang$core$Native_Utils.cmp(0, i) < 1) && (_elm_lang$core$Native_Utils.cmp(
				i,
				_elm_lang$core$Native_Array.length(array)) < 0)) ? _elm_lang$core$Maybe$Just(
				A2(_elm_lang$core$Native_Array.get, i, array)) : _elm_lang$core$Maybe$Nothing;
		});
	var _elm_lang$core$Array$push = _elm_lang$core$Native_Array.push;
	var _elm_lang$core$Array$empty = _elm_lang$core$Native_Array.empty;
	var _elm_lang$core$Array$filter = F2(
		function (isOkay, arr) {
			var update = F2(
				function (x, xs) {
					return isOkay(x) ? A2(_elm_lang$core$Native_Array.push, x, xs) : xs;
				});
			return A3(_elm_lang$core$Native_Array.foldl, update, _elm_lang$core$Native_Array.empty, arr);
		});
	var _elm_lang$core$Array$foldr = _elm_lang$core$Native_Array.foldr;
	var _elm_lang$core$Array$foldl = _elm_lang$core$Native_Array.foldl;
	var _elm_lang$core$Array$indexedMap = _elm_lang$core$Native_Array.indexedMap;
	var _elm_lang$core$Array$map = _elm_lang$core$Native_Array.map;
	var _elm_lang$core$Array$toIndexedList = function (array) {
		return A3(
			_elm_lang$core$List$map2,
			F2(
				function (v0, v1) {
					return {ctor: '_Tuple2', _0: v0, _1: v1};
				}),
			_elm_lang$core$Native_List.range(
				0,
				_elm_lang$core$Native_Array.length(array) - 1),
			_elm_lang$core$Native_Array.toList(array));
	};
	var _elm_lang$core$Array$toList = _elm_lang$core$Native_Array.toList;
	var _elm_lang$core$Array$fromList = _elm_lang$core$Native_Array.fromList;
	var _elm_lang$core$Array$initialize = _elm_lang$core$Native_Array.initialize;
	var _elm_lang$core$Array$repeat = F2(
		function (n, e) {
			return A2(
				_elm_lang$core$Array$initialize,
				n,
				_elm_lang$core$Basics$always(e));
		});
	var _elm_lang$core$Array$Array = {ctor: 'Array'};

	//import Maybe, Native.List, Native.Utils, Result //

	var _elm_lang$core$Native_String = function() {

	function isEmpty(str)
	{
		return str.length === 0;
	}
	function cons(chr, str)
	{
		return chr + str;
	}
	function uncons(str)
	{
		var hd = str[0];
		if (hd)
		{
			return _elm_lang$core$Maybe$Just(_elm_lang$core$Native_Utils.Tuple2(_elm_lang$core$Native_Utils.chr(hd), str.slice(1)));
		}
		return _elm_lang$core$Maybe$Nothing;
	}
	function append(a, b)
	{
		return a + b;
	}
	function concat(strs)
	{
		return _elm_lang$core$Native_List.toArray(strs).join('');
	}
	function length(str)
	{
		return str.length;
	}
	function map(f, str)
	{
		var out = str.split('');
		for (var i = out.length; i--; )
		{
			out[i] = f(_elm_lang$core$Native_Utils.chr(out[i]));
		}
		return out.join('');
	}
	function filter(pred, str)
	{
		return str.split('').map(_elm_lang$core$Native_Utils.chr).filter(pred).join('');
	}
	function reverse(str)
	{
		return str.split('').reverse().join('');
	}
	function foldl(f, b, str)
	{
		var len = str.length;
		for (var i = 0; i < len; ++i)
		{
			b = A2(f, _elm_lang$core$Native_Utils.chr(str[i]), b);
		}
		return b;
	}
	function foldr(f, b, str)
	{
		for (var i = str.length; i--; )
		{
			b = A2(f, _elm_lang$core$Native_Utils.chr(str[i]), b);
		}
		return b;
	}
	function split(sep, str)
	{
		return _elm_lang$core$Native_List.fromArray(str.split(sep));
	}
	function join(sep, strs)
	{
		return _elm_lang$core$Native_List.toArray(strs).join(sep);
	}
	function repeat(n, str)
	{
		var result = '';
		while (n > 0)
		{
			if (n & 1)
			{
				result += str;
			}
			n >>= 1, str += str;
		}
		return result;
	}
	function slice(start, end, str)
	{
		return str.slice(start, end);
	}
	function left(n, str)
	{
		return n < 1 ? '' : str.slice(0, n);
	}
	function right(n, str)
	{
		return n < 1 ? '' : str.slice(-n);
	}
	function dropLeft(n, str)
	{
		return n < 1 ? str : str.slice(n);
	}
	function dropRight(n, str)
	{
		return n < 1 ? str : str.slice(0, -n);
	}
	function pad(n, chr, str)
	{
		var half = (n - str.length) / 2;
		return repeat(Math.ceil(half), chr) + str + repeat(half | 0, chr);
	}
	function padRight(n, chr, str)
	{
		return str + repeat(n - str.length, chr);
	}
	function padLeft(n, chr, str)
	{
		return repeat(n - str.length, chr) + str;
	}

	function trim(str)
	{
		return str.trim();
	}
	function trimLeft(str)
	{
		return str.replace(/^\s+/, '');
	}
	function trimRight(str)
	{
		return str.replace(/\s+$/, '');
	}

	function words(str)
	{
		return _elm_lang$core$Native_List.fromArray(str.trim().split(/\s+/g));
	}
	function lines(str)
	{
		return _elm_lang$core$Native_List.fromArray(str.split(/\r\n|\r|\n/g));
	}

	function toUpper(str)
	{
		return str.toUpperCase();
	}
	function toLower(str)
	{
		return str.toLowerCase();
	}

	function any(pred, str)
	{
		for (var i = str.length; i--; )
		{
			if (pred(_elm_lang$core$Native_Utils.chr(str[i])))
			{
				return true;
			}
		}
		return false;
	}
	function all(pred, str)
	{
		for (var i = str.length; i--; )
		{
			if (!pred(_elm_lang$core$Native_Utils.chr(str[i])))
			{
				return false;
			}
		}
		return true;
	}

	function contains(sub, str)
	{
		return str.indexOf(sub) > -1;
	}
	function startsWith(sub, str)
	{
		return str.indexOf(sub) === 0;
	}
	function endsWith(sub, str)
	{
		return str.length >= sub.length &&
			str.lastIndexOf(sub) === str.length - sub.length;
	}
	function indexes(sub, str)
	{
		var subLen = sub.length;
		var i = 0;
		var is = [];
		while ((i = str.indexOf(sub, i)) > -1)
		{
			is.push(i);
			i = i + subLen;
		}
		return _elm_lang$core$Native_List.fromArray(is);
	}

	function toInt(s)
	{
		var len = s.length;
		if (len === 0)
		{
			return _elm_lang$core$Result$Err("could not convert string '" + s + "' to an Int" );
		}
		var start = 0;
		if (s[0] === '-')
		{
			if (len === 1)
			{
				return _elm_lang$core$Result$Err("could not convert string '" + s + "' to an Int" );
			}
			start = 1;
		}
		for (var i = start; i < len; ++i)
		{
			var c = s[i];
			if (c < '0' || '9' < c)
			{
				return _elm_lang$core$Result$Err("could not convert string '" + s + "' to an Int" );
			}
		}
		return _elm_lang$core$Result$Ok(parseInt(s, 10));
	}

	function toFloat(s)
	{
		var len = s.length;
		if (len === 0)
		{
			return _elm_lang$core$Result$Err("could not convert string '" + s + "' to a Float" );
		}
		var start = 0;
		if (s[0] === '-')
		{
			if (len === 1)
			{
				return _elm_lang$core$Result$Err("could not convert string '" + s + "' to a Float" );
			}
			start = 1;
		}
		var dotCount = 0;
		for (var i = start; i < len; ++i)
		{
			var c = s[i];
			if ('0' <= c && c <= '9')
			{
				continue;
			}
			if (c === '.')
			{
				dotCount += 1;
				if (dotCount <= 1)
				{
					continue;
				}
			}
			return _elm_lang$core$Result$Err("could not convert string '" + s + "' to a Float" );
		}
		return _elm_lang$core$Result$Ok(parseFloat(s));
	}

	function toList(str)
	{
		return _elm_lang$core$Native_List.fromArray(str.split('').map(_elm_lang$core$Native_Utils.chr));
	}
	function fromList(chars)
	{
		return _elm_lang$core$Native_List.toArray(chars).join('');
	}

	return {
		isEmpty: isEmpty,
		cons: F2(cons),
		uncons: uncons,
		append: F2(append),
		concat: concat,
		length: length,
		map: F2(map),
		filter: F2(filter),
		reverse: reverse,
		foldl: F3(foldl),
		foldr: F3(foldr),

		split: F2(split),
		join: F2(join),
		repeat: F2(repeat),

		slice: F3(slice),
		left: F2(left),
		right: F2(right),
		dropLeft: F2(dropLeft),
		dropRight: F2(dropRight),

		pad: F3(pad),
		padLeft: F3(padLeft),
		padRight: F3(padRight),

		trim: trim,
		trimLeft: trimLeft,
		trimRight: trimRight,

		words: words,
		lines: lines,

		toUpper: toUpper,
		toLower: toLower,

		any: F2(any),
		all: F2(all),

		contains: F2(contains),
		startsWith: F2(startsWith),
		endsWith: F2(endsWith),
		indexes: F2(indexes),

		toInt: toInt,
		toFloat: toFloat,
		toList: toList,
		fromList: fromList
	};

	}();
	//import Native.Utils //

	var _elm_lang$core$Native_Char = function() {

	return {
		fromCode: function(c) { return _elm_lang$core$Native_Utils.chr(String.fromCharCode(c)); },
		toCode: function(c) { return c.charCodeAt(0); },
		toUpper: function(c) { return _elm_lang$core$Native_Utils.chr(c.toUpperCase()); },
		toLower: function(c) { return _elm_lang$core$Native_Utils.chr(c.toLowerCase()); },
		toLocaleUpper: function(c) { return _elm_lang$core$Native_Utils.chr(c.toLocaleUpperCase()); },
		toLocaleLower: function(c) { return _elm_lang$core$Native_Utils.chr(c.toLocaleLowerCase()); }
	};

	}();
	var _elm_lang$core$Char$fromCode = _elm_lang$core$Native_Char.fromCode;
	var _elm_lang$core$Char$toCode = _elm_lang$core$Native_Char.toCode;
	var _elm_lang$core$Char$toLocaleLower = _elm_lang$core$Native_Char.toLocaleLower;
	var _elm_lang$core$Char$toLocaleUpper = _elm_lang$core$Native_Char.toLocaleUpper;
	var _elm_lang$core$Char$toLower = _elm_lang$core$Native_Char.toLower;
	var _elm_lang$core$Char$toUpper = _elm_lang$core$Native_Char.toUpper;
	var _elm_lang$core$Char$isBetween = F3(
		function (low, high, $char) {
			var code = _elm_lang$core$Char$toCode($char);
			return (_elm_lang$core$Native_Utils.cmp(
				code,
				_elm_lang$core$Char$toCode(low)) > -1) && (_elm_lang$core$Native_Utils.cmp(
				code,
				_elm_lang$core$Char$toCode(high)) < 1);
		});
	var _elm_lang$core$Char$isUpper = A2(
		_elm_lang$core$Char$isBetween,
		_elm_lang$core$Native_Utils.chr('A'),
		_elm_lang$core$Native_Utils.chr('Z'));
	var _elm_lang$core$Char$isLower = A2(
		_elm_lang$core$Char$isBetween,
		_elm_lang$core$Native_Utils.chr('a'),
		_elm_lang$core$Native_Utils.chr('z'));
	var _elm_lang$core$Char$isDigit = A2(
		_elm_lang$core$Char$isBetween,
		_elm_lang$core$Native_Utils.chr('0'),
		_elm_lang$core$Native_Utils.chr('9'));
	var _elm_lang$core$Char$isOctDigit = A2(
		_elm_lang$core$Char$isBetween,
		_elm_lang$core$Native_Utils.chr('0'),
		_elm_lang$core$Native_Utils.chr('7'));
	var _elm_lang$core$Char$isHexDigit = function ($char) {
		return _elm_lang$core$Char$isDigit($char) || (A3(
			_elm_lang$core$Char$isBetween,
			_elm_lang$core$Native_Utils.chr('a'),
			_elm_lang$core$Native_Utils.chr('f'),
			$char) || A3(
			_elm_lang$core$Char$isBetween,
			_elm_lang$core$Native_Utils.chr('A'),
			_elm_lang$core$Native_Utils.chr('F'),
			$char));
	};

	var _elm_lang$core$String$fromList = _elm_lang$core$Native_String.fromList;
	var _elm_lang$core$String$toList = _elm_lang$core$Native_String.toList;
	var _elm_lang$core$String$toFloat = _elm_lang$core$Native_String.toFloat;
	var _elm_lang$core$String$toInt = _elm_lang$core$Native_String.toInt;
	var _elm_lang$core$String$indices = _elm_lang$core$Native_String.indexes;
	var _elm_lang$core$String$indexes = _elm_lang$core$Native_String.indexes;
	var _elm_lang$core$String$endsWith = _elm_lang$core$Native_String.endsWith;
	var _elm_lang$core$String$startsWith = _elm_lang$core$Native_String.startsWith;
	var _elm_lang$core$String$contains = _elm_lang$core$Native_String.contains;
	var _elm_lang$core$String$all = _elm_lang$core$Native_String.all;
	var _elm_lang$core$String$any = _elm_lang$core$Native_String.any;
	var _elm_lang$core$String$toLower = _elm_lang$core$Native_String.toLower;
	var _elm_lang$core$String$toUpper = _elm_lang$core$Native_String.toUpper;
	var _elm_lang$core$String$lines = _elm_lang$core$Native_String.lines;
	var _elm_lang$core$String$words = _elm_lang$core$Native_String.words;
	var _elm_lang$core$String$trimRight = _elm_lang$core$Native_String.trimRight;
	var _elm_lang$core$String$trimLeft = _elm_lang$core$Native_String.trimLeft;
	var _elm_lang$core$String$trim = _elm_lang$core$Native_String.trim;
	var _elm_lang$core$String$padRight = _elm_lang$core$Native_String.padRight;
	var _elm_lang$core$String$padLeft = _elm_lang$core$Native_String.padLeft;
	var _elm_lang$core$String$pad = _elm_lang$core$Native_String.pad;
	var _elm_lang$core$String$dropRight = _elm_lang$core$Native_String.dropRight;
	var _elm_lang$core$String$dropLeft = _elm_lang$core$Native_String.dropLeft;
	var _elm_lang$core$String$right = _elm_lang$core$Native_String.right;
	var _elm_lang$core$String$left = _elm_lang$core$Native_String.left;
	var _elm_lang$core$String$slice = _elm_lang$core$Native_String.slice;
	var _elm_lang$core$String$repeat = _elm_lang$core$Native_String.repeat;
	var _elm_lang$core$String$join = _elm_lang$core$Native_String.join;
	var _elm_lang$core$String$split = _elm_lang$core$Native_String.split;
	var _elm_lang$core$String$foldr = _elm_lang$core$Native_String.foldr;
	var _elm_lang$core$String$foldl = _elm_lang$core$Native_String.foldl;
	var _elm_lang$core$String$reverse = _elm_lang$core$Native_String.reverse;
	var _elm_lang$core$String$filter = _elm_lang$core$Native_String.filter;
	var _elm_lang$core$String$map = _elm_lang$core$Native_String.map;
	var _elm_lang$core$String$length = _elm_lang$core$Native_String.length;
	var _elm_lang$core$String$concat = _elm_lang$core$Native_String.concat;
	var _elm_lang$core$String$append = _elm_lang$core$Native_String.append;
	var _elm_lang$core$String$uncons = _elm_lang$core$Native_String.uncons;
	var _elm_lang$core$String$cons = _elm_lang$core$Native_String.cons;
	var _elm_lang$core$String$fromChar = function ($char) {
		return A2(_elm_lang$core$String$cons, $char, '');
	};
	var _elm_lang$core$String$isEmpty = _elm_lang$core$Native_String.isEmpty;

	var _elm_lang$core$Dict$foldr = F3(
		function (f, acc, t) {
			foldr:
			while (true) {
				var _p0 = t;
				if (_p0.ctor === 'RBEmpty_elm_builtin') {
					return acc;
				} else {
					var _v1 = f,
						_v2 = A3(
						f,
						_p0._1,
						_p0._2,
						A3(_elm_lang$core$Dict$foldr, f, acc, _p0._4)),
						_v3 = _p0._3;
					f = _v1;
					acc = _v2;
					t = _v3;
					continue foldr;
				}
			}
		});
	var _elm_lang$core$Dict$keys = function (dict) {
		return A3(
			_elm_lang$core$Dict$foldr,
			F3(
				function (key, value, keyList) {
					return A2(_elm_lang$core$List_ops['::'], key, keyList);
				}),
			_elm_lang$core$Native_List.fromArray(
				[]),
			dict);
	};
	var _elm_lang$core$Dict$values = function (dict) {
		return A3(
			_elm_lang$core$Dict$foldr,
			F3(
				function (key, value, valueList) {
					return A2(_elm_lang$core$List_ops['::'], value, valueList);
				}),
			_elm_lang$core$Native_List.fromArray(
				[]),
			dict);
	};
	var _elm_lang$core$Dict$toList = function (dict) {
		return A3(
			_elm_lang$core$Dict$foldr,
			F3(
				function (key, value, list) {
					return A2(
						_elm_lang$core$List_ops['::'],
						{ctor: '_Tuple2', _0: key, _1: value},
						list);
				}),
			_elm_lang$core$Native_List.fromArray(
				[]),
			dict);
	};
	var _elm_lang$core$Dict$foldl = F3(
		function (f, acc, dict) {
			foldl:
			while (true) {
				var _p1 = dict;
				if (_p1.ctor === 'RBEmpty_elm_builtin') {
					return acc;
				} else {
					var _v5 = f,
						_v6 = A3(
						f,
						_p1._1,
						_p1._2,
						A3(_elm_lang$core$Dict$foldl, f, acc, _p1._3)),
						_v7 = _p1._4;
					f = _v5;
					acc = _v6;
					dict = _v7;
					continue foldl;
				}
			}
		});
	var _elm_lang$core$Dict$merge = F6(
		function (leftStep, bothStep, rightStep, leftDict, rightDict, initialResult) {
			var stepState = F3(
				function (rKey, rValue, _p2) {
					var _p3 = _p2;
					var _p9 = _p3._1;
					var _p8 = _p3._0;
					var _p4 = _p8;
					if (_p4.ctor === '[]') {
						return {
							ctor: '_Tuple2',
							_0: _p8,
							_1: A3(rightStep, rKey, rValue, _p9)
						};
					} else {
						var _p7 = _p4._1;
						var _p6 = _p4._0._1;
						var _p5 = _p4._0._0;
						return (_elm_lang$core$Native_Utils.cmp(_p5, rKey) < 0) ? {
							ctor: '_Tuple2',
							_0: _p7,
							_1: A3(leftStep, _p5, _p6, _p9)
						} : ((_elm_lang$core$Native_Utils.cmp(_p5, rKey) > 0) ? {
							ctor: '_Tuple2',
							_0: _p8,
							_1: A3(rightStep, rKey, rValue, _p9)
						} : {
							ctor: '_Tuple2',
							_0: _p7,
							_1: A4(bothStep, _p5, _p6, rValue, _p9)
						});
					}
				});
			var _p10 = A3(
				_elm_lang$core$Dict$foldl,
				stepState,
				{
					ctor: '_Tuple2',
					_0: _elm_lang$core$Dict$toList(leftDict),
					_1: initialResult
				},
				rightDict);
			var leftovers = _p10._0;
			var intermediateResult = _p10._1;
			return A3(
				_elm_lang$core$List$foldl,
				F2(
					function (_p11, result) {
						var _p12 = _p11;
						return A3(leftStep, _p12._0, _p12._1, result);
					}),
				intermediateResult,
				leftovers);
		});
	var _elm_lang$core$Dict$reportRemBug = F4(
		function (msg, c, lgot, rgot) {
			return _elm_lang$core$Native_Debug.crash(
				_elm_lang$core$String$concat(
					_elm_lang$core$Native_List.fromArray(
						[
							'Internal red-black tree invariant violated, expected ',
							msg,
							' and got ',
							_elm_lang$core$Basics$toString(c),
							'/',
							lgot,
							'/',
							rgot,
							'\nPlease report this bug to <https://github.com/elm-lang/core/issues>'
						])));
		});
	var _elm_lang$core$Dict$isBBlack = function (dict) {
		var _p13 = dict;
		_v11_2:
		do {
			if (_p13.ctor === 'RBNode_elm_builtin') {
				if (_p13._0.ctor === 'BBlack') {
					return true;
				} else {
					break _v11_2;
				}
			} else {
				if (_p13._0.ctor === 'LBBlack') {
					return true;
				} else {
					break _v11_2;
				}
			}
		} while(false);
		return false;
	};
	var _elm_lang$core$Dict$sizeHelp = F2(
		function (n, dict) {
			sizeHelp:
			while (true) {
				var _p14 = dict;
				if (_p14.ctor === 'RBEmpty_elm_builtin') {
					return n;
				} else {
					var _v13 = A2(_elm_lang$core$Dict$sizeHelp, n + 1, _p14._4),
						_v14 = _p14._3;
					n = _v13;
					dict = _v14;
					continue sizeHelp;
				}
			}
		});
	var _elm_lang$core$Dict$size = function (dict) {
		return A2(_elm_lang$core$Dict$sizeHelp, 0, dict);
	};
	var _elm_lang$core$Dict$get = F2(
		function (targetKey, dict) {
			get:
			while (true) {
				var _p15 = dict;
				if (_p15.ctor === 'RBEmpty_elm_builtin') {
					return _elm_lang$core$Maybe$Nothing;
				} else {
					var _p16 = A2(_elm_lang$core$Basics$compare, targetKey, _p15._1);
					switch (_p16.ctor) {
						case 'LT':
							var _v17 = targetKey,
								_v18 = _p15._3;
							targetKey = _v17;
							dict = _v18;
							continue get;
						case 'EQ':
							return _elm_lang$core$Maybe$Just(_p15._2);
						default:
							var _v19 = targetKey,
								_v20 = _p15._4;
							targetKey = _v19;
							dict = _v20;
							continue get;
					}
				}
			}
		});
	var _elm_lang$core$Dict$member = F2(
		function (key, dict) {
			var _p17 = A2(_elm_lang$core$Dict$get, key, dict);
			if (_p17.ctor === 'Just') {
				return true;
			} else {
				return false;
			}
		});
	var _elm_lang$core$Dict$maxWithDefault = F3(
		function (k, v, r) {
			maxWithDefault:
			while (true) {
				var _p18 = r;
				if (_p18.ctor === 'RBEmpty_elm_builtin') {
					return {ctor: '_Tuple2', _0: k, _1: v};
				} else {
					var _v23 = _p18._1,
						_v24 = _p18._2,
						_v25 = _p18._4;
					k = _v23;
					v = _v24;
					r = _v25;
					continue maxWithDefault;
				}
			}
		});
	var _elm_lang$core$Dict$NBlack = {ctor: 'NBlack'};
	var _elm_lang$core$Dict$BBlack = {ctor: 'BBlack'};
	var _elm_lang$core$Dict$Black = {ctor: 'Black'};
	var _elm_lang$core$Dict$blackish = function (t) {
		var _p19 = t;
		if (_p19.ctor === 'RBNode_elm_builtin') {
			var _p20 = _p19._0;
			return _elm_lang$core$Native_Utils.eq(_p20, _elm_lang$core$Dict$Black) || _elm_lang$core$Native_Utils.eq(_p20, _elm_lang$core$Dict$BBlack);
		} else {
			return true;
		}
	};
	var _elm_lang$core$Dict$Red = {ctor: 'Red'};
	var _elm_lang$core$Dict$moreBlack = function (color) {
		var _p21 = color;
		switch (_p21.ctor) {
			case 'Black':
				return _elm_lang$core$Dict$BBlack;
			case 'Red':
				return _elm_lang$core$Dict$Black;
			case 'NBlack':
				return _elm_lang$core$Dict$Red;
			default:
				return _elm_lang$core$Native_Debug.crash('Can\'t make a double black node more black!');
		}
	};
	var _elm_lang$core$Dict$lessBlack = function (color) {
		var _p22 = color;
		switch (_p22.ctor) {
			case 'BBlack':
				return _elm_lang$core$Dict$Black;
			case 'Black':
				return _elm_lang$core$Dict$Red;
			case 'Red':
				return _elm_lang$core$Dict$NBlack;
			default:
				return _elm_lang$core$Native_Debug.crash('Can\'t make a negative black node less black!');
		}
	};
	var _elm_lang$core$Dict$LBBlack = {ctor: 'LBBlack'};
	var _elm_lang$core$Dict$LBlack = {ctor: 'LBlack'};
	var _elm_lang$core$Dict$RBEmpty_elm_builtin = function (a) {
		return {ctor: 'RBEmpty_elm_builtin', _0: a};
	};
	var _elm_lang$core$Dict$empty = _elm_lang$core$Dict$RBEmpty_elm_builtin(_elm_lang$core$Dict$LBlack);
	var _elm_lang$core$Dict$isEmpty = function (dict) {
		return _elm_lang$core$Native_Utils.eq(dict, _elm_lang$core$Dict$empty);
	};
	var _elm_lang$core$Dict$RBNode_elm_builtin = F5(
		function (a, b, c, d, e) {
			return {ctor: 'RBNode_elm_builtin', _0: a, _1: b, _2: c, _3: d, _4: e};
		});
	var _elm_lang$core$Dict$ensureBlackRoot = function (dict) {
		var _p23 = dict;
		if ((_p23.ctor === 'RBNode_elm_builtin') && (_p23._0.ctor === 'Red')) {
			return A5(_elm_lang$core$Dict$RBNode_elm_builtin, _elm_lang$core$Dict$Black, _p23._1, _p23._2, _p23._3, _p23._4);
		} else {
			return dict;
		}
	};
	var _elm_lang$core$Dict$lessBlackTree = function (dict) {
		var _p24 = dict;
		if (_p24.ctor === 'RBNode_elm_builtin') {
			return A5(
				_elm_lang$core$Dict$RBNode_elm_builtin,
				_elm_lang$core$Dict$lessBlack(_p24._0),
				_p24._1,
				_p24._2,
				_p24._3,
				_p24._4);
		} else {
			return _elm_lang$core$Dict$RBEmpty_elm_builtin(_elm_lang$core$Dict$LBlack);
		}
	};
	var _elm_lang$core$Dict$balancedTree = function (col) {
		return function (xk) {
			return function (xv) {
				return function (yk) {
					return function (yv) {
						return function (zk) {
							return function (zv) {
								return function (a) {
									return function (b) {
										return function (c) {
											return function (d) {
												return A5(
													_elm_lang$core$Dict$RBNode_elm_builtin,
													_elm_lang$core$Dict$lessBlack(col),
													yk,
													yv,
													A5(_elm_lang$core$Dict$RBNode_elm_builtin, _elm_lang$core$Dict$Black, xk, xv, a, b),
													A5(_elm_lang$core$Dict$RBNode_elm_builtin, _elm_lang$core$Dict$Black, zk, zv, c, d));
											};
										};
									};
								};
							};
						};
					};
				};
			};
		};
	};
	var _elm_lang$core$Dict$blacken = function (t) {
		var _p25 = t;
		if (_p25.ctor === 'RBEmpty_elm_builtin') {
			return _elm_lang$core$Dict$RBEmpty_elm_builtin(_elm_lang$core$Dict$LBlack);
		} else {
			return A5(_elm_lang$core$Dict$RBNode_elm_builtin, _elm_lang$core$Dict$Black, _p25._1, _p25._2, _p25._3, _p25._4);
		}
	};
	var _elm_lang$core$Dict$redden = function (t) {
		var _p26 = t;
		if (_p26.ctor === 'RBEmpty_elm_builtin') {
			return _elm_lang$core$Native_Debug.crash('can\'t make a Leaf red');
		} else {
			return A5(_elm_lang$core$Dict$RBNode_elm_builtin, _elm_lang$core$Dict$Red, _p26._1, _p26._2, _p26._3, _p26._4);
		}
	};
	var _elm_lang$core$Dict$balanceHelp = function (tree) {
		var _p27 = tree;
		_v33_6:
		do {
			_v33_5:
			do {
				_v33_4:
				do {
					_v33_3:
					do {
						_v33_2:
						do {
							_v33_1:
							do {
								_v33_0:
								do {
									if (_p27.ctor === 'RBNode_elm_builtin') {
										if (_p27._3.ctor === 'RBNode_elm_builtin') {
											if (_p27._4.ctor === 'RBNode_elm_builtin') {
												switch (_p27._3._0.ctor) {
													case 'Red':
														switch (_p27._4._0.ctor) {
															case 'Red':
																if ((_p27._3._3.ctor === 'RBNode_elm_builtin') && (_p27._3._3._0.ctor === 'Red')) {
																	break _v33_0;
																} else {
																	if ((_p27._3._4.ctor === 'RBNode_elm_builtin') && (_p27._3._4._0.ctor === 'Red')) {
																		break _v33_1;
																	} else {
																		if ((_p27._4._3.ctor === 'RBNode_elm_builtin') && (_p27._4._3._0.ctor === 'Red')) {
																			break _v33_2;
																		} else {
																			if ((_p27._4._4.ctor === 'RBNode_elm_builtin') && (_p27._4._4._0.ctor === 'Red')) {
																				break _v33_3;
																			} else {
																				break _v33_6;
																			}
																		}
																	}
																}
															case 'NBlack':
																if ((_p27._3._3.ctor === 'RBNode_elm_builtin') && (_p27._3._3._0.ctor === 'Red')) {
																	break _v33_0;
																} else {
																	if ((_p27._3._4.ctor === 'RBNode_elm_builtin') && (_p27._3._4._0.ctor === 'Red')) {
																		break _v33_1;
																	} else {
																		if (((((_p27._0.ctor === 'BBlack') && (_p27._4._3.ctor === 'RBNode_elm_builtin')) && (_p27._4._3._0.ctor === 'Black')) && (_p27._4._4.ctor === 'RBNode_elm_builtin')) && (_p27._4._4._0.ctor === 'Black')) {
																			break _v33_4;
																		} else {
																			break _v33_6;
																		}
																	}
																}
															default:
																if ((_p27._3._3.ctor === 'RBNode_elm_builtin') && (_p27._3._3._0.ctor === 'Red')) {
																	break _v33_0;
																} else {
																	if ((_p27._3._4.ctor === 'RBNode_elm_builtin') && (_p27._3._4._0.ctor === 'Red')) {
																		break _v33_1;
																	} else {
																		break _v33_6;
																	}
																}
														}
													case 'NBlack':
														switch (_p27._4._0.ctor) {
															case 'Red':
																if ((_p27._4._3.ctor === 'RBNode_elm_builtin') && (_p27._4._3._0.ctor === 'Red')) {
																	break _v33_2;
																} else {
																	if ((_p27._4._4.ctor === 'RBNode_elm_builtin') && (_p27._4._4._0.ctor === 'Red')) {
																		break _v33_3;
																	} else {
																		if (((((_p27._0.ctor === 'BBlack') && (_p27._3._3.ctor === 'RBNode_elm_builtin')) && (_p27._3._3._0.ctor === 'Black')) && (_p27._3._4.ctor === 'RBNode_elm_builtin')) && (_p27._3._4._0.ctor === 'Black')) {
																			break _v33_5;
																		} else {
																			break _v33_6;
																		}
																	}
																}
															case 'NBlack':
																if (_p27._0.ctor === 'BBlack') {
																	if ((((_p27._4._3.ctor === 'RBNode_elm_builtin') && (_p27._4._3._0.ctor === 'Black')) && (_p27._4._4.ctor === 'RBNode_elm_builtin')) && (_p27._4._4._0.ctor === 'Black')) {
																		break _v33_4;
																	} else {
																		if ((((_p27._3._3.ctor === 'RBNode_elm_builtin') && (_p27._3._3._0.ctor === 'Black')) && (_p27._3._4.ctor === 'RBNode_elm_builtin')) && (_p27._3._4._0.ctor === 'Black')) {
																			break _v33_5;
																		} else {
																			break _v33_6;
																		}
																	}
																} else {
																	break _v33_6;
																}
															default:
																if (((((_p27._0.ctor === 'BBlack') && (_p27._3._3.ctor === 'RBNode_elm_builtin')) && (_p27._3._3._0.ctor === 'Black')) && (_p27._3._4.ctor === 'RBNode_elm_builtin')) && (_p27._3._4._0.ctor === 'Black')) {
																	break _v33_5;
																} else {
																	break _v33_6;
																}
														}
													default:
														switch (_p27._4._0.ctor) {
															case 'Red':
																if ((_p27._4._3.ctor === 'RBNode_elm_builtin') && (_p27._4._3._0.ctor === 'Red')) {
																	break _v33_2;
																} else {
																	if ((_p27._4._4.ctor === 'RBNode_elm_builtin') && (_p27._4._4._0.ctor === 'Red')) {
																		break _v33_3;
																	} else {
																		break _v33_6;
																	}
																}
															case 'NBlack':
																if (((((_p27._0.ctor === 'BBlack') && (_p27._4._3.ctor === 'RBNode_elm_builtin')) && (_p27._4._3._0.ctor === 'Black')) && (_p27._4._4.ctor === 'RBNode_elm_builtin')) && (_p27._4._4._0.ctor === 'Black')) {
																	break _v33_4;
																} else {
																	break _v33_6;
																}
															default:
																break _v33_6;
														}
												}
											} else {
												switch (_p27._3._0.ctor) {
													case 'Red':
														if ((_p27._3._3.ctor === 'RBNode_elm_builtin') && (_p27._3._3._0.ctor === 'Red')) {
															break _v33_0;
														} else {
															if ((_p27._3._4.ctor === 'RBNode_elm_builtin') && (_p27._3._4._0.ctor === 'Red')) {
																break _v33_1;
															} else {
																break _v33_6;
															}
														}
													case 'NBlack':
														if (((((_p27._0.ctor === 'BBlack') && (_p27._3._3.ctor === 'RBNode_elm_builtin')) && (_p27._3._3._0.ctor === 'Black')) && (_p27._3._4.ctor === 'RBNode_elm_builtin')) && (_p27._3._4._0.ctor === 'Black')) {
															break _v33_5;
														} else {
															break _v33_6;
														}
													default:
														break _v33_6;
												}
											}
										} else {
											if (_p27._4.ctor === 'RBNode_elm_builtin') {
												switch (_p27._4._0.ctor) {
													case 'Red':
														if ((_p27._4._3.ctor === 'RBNode_elm_builtin') && (_p27._4._3._0.ctor === 'Red')) {
															break _v33_2;
														} else {
															if ((_p27._4._4.ctor === 'RBNode_elm_builtin') && (_p27._4._4._0.ctor === 'Red')) {
																break _v33_3;
															} else {
																break _v33_6;
															}
														}
													case 'NBlack':
														if (((((_p27._0.ctor === 'BBlack') && (_p27._4._3.ctor === 'RBNode_elm_builtin')) && (_p27._4._3._0.ctor === 'Black')) && (_p27._4._4.ctor === 'RBNode_elm_builtin')) && (_p27._4._4._0.ctor === 'Black')) {
															break _v33_4;
														} else {
															break _v33_6;
														}
													default:
														break _v33_6;
												}
											} else {
												break _v33_6;
											}
										}
									} else {
										break _v33_6;
									}
								} while(false);
								return _elm_lang$core$Dict$balancedTree(_p27._0)(_p27._3._3._1)(_p27._3._3._2)(_p27._3._1)(_p27._3._2)(_p27._1)(_p27._2)(_p27._3._3._3)(_p27._3._3._4)(_p27._3._4)(_p27._4);
							} while(false);
							return _elm_lang$core$Dict$balancedTree(_p27._0)(_p27._3._1)(_p27._3._2)(_p27._3._4._1)(_p27._3._4._2)(_p27._1)(_p27._2)(_p27._3._3)(_p27._3._4._3)(_p27._3._4._4)(_p27._4);
						} while(false);
						return _elm_lang$core$Dict$balancedTree(_p27._0)(_p27._1)(_p27._2)(_p27._4._3._1)(_p27._4._3._2)(_p27._4._1)(_p27._4._2)(_p27._3)(_p27._4._3._3)(_p27._4._3._4)(_p27._4._4);
					} while(false);
					return _elm_lang$core$Dict$balancedTree(_p27._0)(_p27._1)(_p27._2)(_p27._4._1)(_p27._4._2)(_p27._4._4._1)(_p27._4._4._2)(_p27._3)(_p27._4._3)(_p27._4._4._3)(_p27._4._4._4);
				} while(false);
				return A5(
					_elm_lang$core$Dict$RBNode_elm_builtin,
					_elm_lang$core$Dict$Black,
					_p27._4._3._1,
					_p27._4._3._2,
					A5(_elm_lang$core$Dict$RBNode_elm_builtin, _elm_lang$core$Dict$Black, _p27._1, _p27._2, _p27._3, _p27._4._3._3),
					A5(
						_elm_lang$core$Dict$balance,
						_elm_lang$core$Dict$Black,
						_p27._4._1,
						_p27._4._2,
						_p27._4._3._4,
						_elm_lang$core$Dict$redden(_p27._4._4)));
			} while(false);
			return A5(
				_elm_lang$core$Dict$RBNode_elm_builtin,
				_elm_lang$core$Dict$Black,
				_p27._3._4._1,
				_p27._3._4._2,
				A5(
					_elm_lang$core$Dict$balance,
					_elm_lang$core$Dict$Black,
					_p27._3._1,
					_p27._3._2,
					_elm_lang$core$Dict$redden(_p27._3._3),
					_p27._3._4._3),
				A5(_elm_lang$core$Dict$RBNode_elm_builtin, _elm_lang$core$Dict$Black, _p27._1, _p27._2, _p27._3._4._4, _p27._4));
		} while(false);
		return tree;
	};
	var _elm_lang$core$Dict$balance = F5(
		function (c, k, v, l, r) {
			var tree = A5(_elm_lang$core$Dict$RBNode_elm_builtin, c, k, v, l, r);
			return _elm_lang$core$Dict$blackish(tree) ? _elm_lang$core$Dict$balanceHelp(tree) : tree;
		});
	var _elm_lang$core$Dict$bubble = F5(
		function (c, k, v, l, r) {
			return (_elm_lang$core$Dict$isBBlack(l) || _elm_lang$core$Dict$isBBlack(r)) ? A5(
				_elm_lang$core$Dict$balance,
				_elm_lang$core$Dict$moreBlack(c),
				k,
				v,
				_elm_lang$core$Dict$lessBlackTree(l),
				_elm_lang$core$Dict$lessBlackTree(r)) : A5(_elm_lang$core$Dict$RBNode_elm_builtin, c, k, v, l, r);
		});
	var _elm_lang$core$Dict$removeMax = F5(
		function (c, k, v, l, r) {
			var _p28 = r;
			if (_p28.ctor === 'RBEmpty_elm_builtin') {
				return A3(_elm_lang$core$Dict$rem, c, l, r);
			} else {
				return A5(
					_elm_lang$core$Dict$bubble,
					c,
					k,
					v,
					l,
					A5(_elm_lang$core$Dict$removeMax, _p28._0, _p28._1, _p28._2, _p28._3, _p28._4));
			}
		});
	var _elm_lang$core$Dict$rem = F3(
		function (c, l, r) {
			var _p29 = {ctor: '_Tuple2', _0: l, _1: r};
			if (_p29._0.ctor === 'RBEmpty_elm_builtin') {
				if (_p29._1.ctor === 'RBEmpty_elm_builtin') {
					var _p30 = c;
					switch (_p30.ctor) {
						case 'Red':
							return _elm_lang$core$Dict$RBEmpty_elm_builtin(_elm_lang$core$Dict$LBlack);
						case 'Black':
							return _elm_lang$core$Dict$RBEmpty_elm_builtin(_elm_lang$core$Dict$LBBlack);
						default:
							return _elm_lang$core$Native_Debug.crash('cannot have bblack or nblack nodes at this point');
					}
				} else {
					var _p33 = _p29._1._0;
					var _p32 = _p29._0._0;
					var _p31 = {ctor: '_Tuple3', _0: c, _1: _p32, _2: _p33};
					if ((((_p31.ctor === '_Tuple3') && (_p31._0.ctor === 'Black')) && (_p31._1.ctor === 'LBlack')) && (_p31._2.ctor === 'Red')) {
						return A5(_elm_lang$core$Dict$RBNode_elm_builtin, _elm_lang$core$Dict$Black, _p29._1._1, _p29._1._2, _p29._1._3, _p29._1._4);
					} else {
						return A4(
							_elm_lang$core$Dict$reportRemBug,
							'Black/LBlack/Red',
							c,
							_elm_lang$core$Basics$toString(_p32),
							_elm_lang$core$Basics$toString(_p33));
					}
				}
			} else {
				if (_p29._1.ctor === 'RBEmpty_elm_builtin') {
					var _p36 = _p29._1._0;
					var _p35 = _p29._0._0;
					var _p34 = {ctor: '_Tuple3', _0: c, _1: _p35, _2: _p36};
					if ((((_p34.ctor === '_Tuple3') && (_p34._0.ctor === 'Black')) && (_p34._1.ctor === 'Red')) && (_p34._2.ctor === 'LBlack')) {
						return A5(_elm_lang$core$Dict$RBNode_elm_builtin, _elm_lang$core$Dict$Black, _p29._0._1, _p29._0._2, _p29._0._3, _p29._0._4);
					} else {
						return A4(
							_elm_lang$core$Dict$reportRemBug,
							'Black/Red/LBlack',
							c,
							_elm_lang$core$Basics$toString(_p35),
							_elm_lang$core$Basics$toString(_p36));
					}
				} else {
					var _p40 = _p29._0._2;
					var _p39 = _p29._0._4;
					var _p38 = _p29._0._1;
					var l$ = A5(_elm_lang$core$Dict$removeMax, _p29._0._0, _p38, _p40, _p29._0._3, _p39);
					var _p37 = A3(_elm_lang$core$Dict$maxWithDefault, _p38, _p40, _p39);
					var k = _p37._0;
					var v = _p37._1;
					return A5(_elm_lang$core$Dict$bubble, c, k, v, l$, r);
				}
			}
		});
	var _elm_lang$core$Dict$map = F2(
		function (f, dict) {
			var _p41 = dict;
			if (_p41.ctor === 'RBEmpty_elm_builtin') {
				return _elm_lang$core$Dict$RBEmpty_elm_builtin(_elm_lang$core$Dict$LBlack);
			} else {
				var _p42 = _p41._1;
				return A5(
					_elm_lang$core$Dict$RBNode_elm_builtin,
					_p41._0,
					_p42,
					A2(f, _p42, _p41._2),
					A2(_elm_lang$core$Dict$map, f, _p41._3),
					A2(_elm_lang$core$Dict$map, f, _p41._4));
			}
		});
	var _elm_lang$core$Dict$Same = {ctor: 'Same'};
	var _elm_lang$core$Dict$Remove = {ctor: 'Remove'};
	var _elm_lang$core$Dict$Insert = {ctor: 'Insert'};
	var _elm_lang$core$Dict$update = F3(
		function (k, alter, dict) {
			var up = function (dict) {
				var _p43 = dict;
				if (_p43.ctor === 'RBEmpty_elm_builtin') {
					var _p44 = alter(_elm_lang$core$Maybe$Nothing);
					if (_p44.ctor === 'Nothing') {
						return {ctor: '_Tuple2', _0: _elm_lang$core$Dict$Same, _1: _elm_lang$core$Dict$empty};
					} else {
						return {
							ctor: '_Tuple2',
							_0: _elm_lang$core$Dict$Insert,
							_1: A5(_elm_lang$core$Dict$RBNode_elm_builtin, _elm_lang$core$Dict$Red, k, _p44._0, _elm_lang$core$Dict$empty, _elm_lang$core$Dict$empty)
						};
					}
				} else {
					var _p55 = _p43._2;
					var _p54 = _p43._4;
					var _p53 = _p43._3;
					var _p52 = _p43._1;
					var _p51 = _p43._0;
					var _p45 = A2(_elm_lang$core$Basics$compare, k, _p52);
					switch (_p45.ctor) {
						case 'EQ':
							var _p46 = alter(
								_elm_lang$core$Maybe$Just(_p55));
							if (_p46.ctor === 'Nothing') {
								return {
									ctor: '_Tuple2',
									_0: _elm_lang$core$Dict$Remove,
									_1: A3(_elm_lang$core$Dict$rem, _p51, _p53, _p54)
								};
							} else {
								return {
									ctor: '_Tuple2',
									_0: _elm_lang$core$Dict$Same,
									_1: A5(_elm_lang$core$Dict$RBNode_elm_builtin, _p51, _p52, _p46._0, _p53, _p54)
								};
							}
						case 'LT':
							var _p47 = up(_p53);
							var flag = _p47._0;
							var newLeft = _p47._1;
							var _p48 = flag;
							switch (_p48.ctor) {
								case 'Same':
									return {
										ctor: '_Tuple2',
										_0: _elm_lang$core$Dict$Same,
										_1: A5(_elm_lang$core$Dict$RBNode_elm_builtin, _p51, _p52, _p55, newLeft, _p54)
									};
								case 'Insert':
									return {
										ctor: '_Tuple2',
										_0: _elm_lang$core$Dict$Insert,
										_1: A5(_elm_lang$core$Dict$balance, _p51, _p52, _p55, newLeft, _p54)
									};
								default:
									return {
										ctor: '_Tuple2',
										_0: _elm_lang$core$Dict$Remove,
										_1: A5(_elm_lang$core$Dict$bubble, _p51, _p52, _p55, newLeft, _p54)
									};
							}
						default:
							var _p49 = up(_p54);
							var flag = _p49._0;
							var newRight = _p49._1;
							var _p50 = flag;
							switch (_p50.ctor) {
								case 'Same':
									return {
										ctor: '_Tuple2',
										_0: _elm_lang$core$Dict$Same,
										_1: A5(_elm_lang$core$Dict$RBNode_elm_builtin, _p51, _p52, _p55, _p53, newRight)
									};
								case 'Insert':
									return {
										ctor: '_Tuple2',
										_0: _elm_lang$core$Dict$Insert,
										_1: A5(_elm_lang$core$Dict$balance, _p51, _p52, _p55, _p53, newRight)
									};
								default:
									return {
										ctor: '_Tuple2',
										_0: _elm_lang$core$Dict$Remove,
										_1: A5(_elm_lang$core$Dict$bubble, _p51, _p52, _p55, _p53, newRight)
									};
							}
					}
				}
			};
			var _p56 = up(dict);
			var flag = _p56._0;
			var updatedDict = _p56._1;
			var _p57 = flag;
			switch (_p57.ctor) {
				case 'Same':
					return updatedDict;
				case 'Insert':
					return _elm_lang$core$Dict$ensureBlackRoot(updatedDict);
				default:
					return _elm_lang$core$Dict$blacken(updatedDict);
			}
		});
	var _elm_lang$core$Dict$insert = F3(
		function (key, value, dict) {
			return A3(
				_elm_lang$core$Dict$update,
				key,
				_elm_lang$core$Basics$always(
					_elm_lang$core$Maybe$Just(value)),
				dict);
		});
	var _elm_lang$core$Dict$singleton = F2(
		function (key, value) {
			return A3(_elm_lang$core$Dict$insert, key, value, _elm_lang$core$Dict$empty);
		});
	var _elm_lang$core$Dict$union = F2(
		function (t1, t2) {
			return A3(_elm_lang$core$Dict$foldl, _elm_lang$core$Dict$insert, t2, t1);
		});
	var _elm_lang$core$Dict$filter = F2(
		function (predicate, dictionary) {
			var add = F3(
				function (key, value, dict) {
					return A2(predicate, key, value) ? A3(_elm_lang$core$Dict$insert, key, value, dict) : dict;
				});
			return A3(_elm_lang$core$Dict$foldl, add, _elm_lang$core$Dict$empty, dictionary);
		});
	var _elm_lang$core$Dict$intersect = F2(
		function (t1, t2) {
			return A2(
				_elm_lang$core$Dict$filter,
				F2(
					function (k, _p58) {
						return A2(_elm_lang$core$Dict$member, k, t2);
					}),
				t1);
		});
	var _elm_lang$core$Dict$partition = F2(
		function (predicate, dict) {
			var add = F3(
				function (key, value, _p59) {
					var _p60 = _p59;
					var _p62 = _p60._1;
					var _p61 = _p60._0;
					return A2(predicate, key, value) ? {
						ctor: '_Tuple2',
						_0: A3(_elm_lang$core$Dict$insert, key, value, _p61),
						_1: _p62
					} : {
						ctor: '_Tuple2',
						_0: _p61,
						_1: A3(_elm_lang$core$Dict$insert, key, value, _p62)
					};
				});
			return A3(
				_elm_lang$core$Dict$foldl,
				add,
				{ctor: '_Tuple2', _0: _elm_lang$core$Dict$empty, _1: _elm_lang$core$Dict$empty},
				dict);
		});
	var _elm_lang$core$Dict$fromList = function (assocs) {
		return A3(
			_elm_lang$core$List$foldl,
			F2(
				function (_p63, dict) {
					var _p64 = _p63;
					return A3(_elm_lang$core$Dict$insert, _p64._0, _p64._1, dict);
				}),
			_elm_lang$core$Dict$empty,
			assocs);
	};
	var _elm_lang$core$Dict$remove = F2(
		function (key, dict) {
			return A3(
				_elm_lang$core$Dict$update,
				key,
				_elm_lang$core$Basics$always(_elm_lang$core$Maybe$Nothing),
				dict);
		});
	var _elm_lang$core$Dict$diff = F2(
		function (t1, t2) {
			return A3(
				_elm_lang$core$Dict$foldl,
				F3(
					function (k, v, t) {
						return A2(_elm_lang$core$Dict$remove, k, t);
					}),
				t1,
				t2);
		});

	//import Maybe, Native.Array, Native.List, Native.Utils, Result //

	var _elm_lang$core$Native_Json = function() {


	// CORE DECODERS

	function succeed(msg)
	{
		return {
			ctor: '<decoder>',
			tag: 'succeed',
			msg: msg
		};
	}

	function fail(msg)
	{
		return {
			ctor: '<decoder>',
			tag: 'fail',
			msg: msg
		};
	}

	function decodePrimitive(tag)
	{
		return {
			ctor: '<decoder>',
			tag: tag
		};
	}

	function decodeContainer(tag, decoder)
	{
		return {
			ctor: '<decoder>',
			tag: tag,
			decoder: decoder
		};
	}

	function decodeNull(value)
	{
		return {
			ctor: '<decoder>',
			tag: 'null',
			value: value
		};
	}

	function decodeField(field, decoder)
	{
		return {
			ctor: '<decoder>',
			tag: 'field',
			field: field,
			decoder: decoder
		};
	}

	function decodeKeyValuePairs(decoder)
	{
		return {
			ctor: '<decoder>',
			tag: 'key-value',
			decoder: decoder
		};
	}

	function decodeObject(f, decoders)
	{
		return {
			ctor: '<decoder>',
			tag: 'map-many',
			func: f,
			decoders: decoders
		};
	}

	function decodeTuple(f, decoders)
	{
		return {
			ctor: '<decoder>',
			tag: 'tuple',
			func: f,
			decoders: decoders
		};
	}

	function andThen(decoder, callback)
	{
		return {
			ctor: '<decoder>',
			tag: 'andThen',
			decoder: decoder,
			callback: callback
		};
	}

	function customAndThen(decoder, callback)
	{
		return {
			ctor: '<decoder>',
			tag: 'customAndThen',
			decoder: decoder,
			callback: callback
		};
	}

	function oneOf(decoders)
	{
		return {
			ctor: '<decoder>',
			tag: 'oneOf',
			decoders: decoders
		};
	}


	// DECODING OBJECTS

	function decodeObject1(f, d1)
	{
		return decodeObject(f, [d1]);
	}

	function decodeObject2(f, d1, d2)
	{
		return decodeObject(f, [d1, d2]);
	}

	function decodeObject3(f, d1, d2, d3)
	{
		return decodeObject(f, [d1, d2, d3]);
	}

	function decodeObject4(f, d1, d2, d3, d4)
	{
		return decodeObject(f, [d1, d2, d3, d4]);
	}

	function decodeObject5(f, d1, d2, d3, d4, d5)
	{
		return decodeObject(f, [d1, d2, d3, d4, d5]);
	}

	function decodeObject6(f, d1, d2, d3, d4, d5, d6)
	{
		return decodeObject(f, [d1, d2, d3, d4, d5, d6]);
	}

	function decodeObject7(f, d1, d2, d3, d4, d5, d6, d7)
	{
		return decodeObject(f, [d1, d2, d3, d4, d5, d6, d7]);
	}

	function decodeObject8(f, d1, d2, d3, d4, d5, d6, d7, d8)
	{
		return decodeObject(f, [d1, d2, d3, d4, d5, d6, d7, d8]);
	}


	// DECODING TUPLES

	function decodeTuple1(f, d1)
	{
		return decodeTuple(f, [d1]);
	}

	function decodeTuple2(f, d1, d2)
	{
		return decodeTuple(f, [d1, d2]);
	}

	function decodeTuple3(f, d1, d2, d3)
	{
		return decodeTuple(f, [d1, d2, d3]);
	}

	function decodeTuple4(f, d1, d2, d3, d4)
	{
		return decodeTuple(f, [d1, d2, d3, d4]);
	}

	function decodeTuple5(f, d1, d2, d3, d4, d5)
	{
		return decodeTuple(f, [d1, d2, d3, d4, d5]);
	}

	function decodeTuple6(f, d1, d2, d3, d4, d5, d6)
	{
		return decodeTuple(f, [d1, d2, d3, d4, d5, d6]);
	}

	function decodeTuple7(f, d1, d2, d3, d4, d5, d6, d7)
	{
		return decodeTuple(f, [d1, d2, d3, d4, d5, d6, d7]);
	}

	function decodeTuple8(f, d1, d2, d3, d4, d5, d6, d7, d8)
	{
		return decodeTuple(f, [d1, d2, d3, d4, d5, d6, d7, d8]);
	}


	// DECODE HELPERS

	function ok(value)
	{
		return { tag: 'ok', value: value };
	}

	function badPrimitive(type, value)
	{
		return { tag: 'primitive', type: type, value: value };
	}

	function badIndex(index, nestedProblems)
	{
		return { tag: 'index', index: index, rest: nestedProblems };
	}

	function badField(field, nestedProblems)
	{
		return { tag: 'field', field: field, rest: nestedProblems };
	}

	function badOneOf(problems)
	{
		return { tag: 'oneOf', problems: problems };
	}

	var bad = { tag: 'fail' };

	function badToString(problem)
	{
		var context = '_';
		while (problem)
		{
			switch (problem.tag)
			{
				case 'primitive':
					return 'Expecting ' + problem.type
						+ (context === '_' ? '' : ' at ' + context)
						+ ' but instead got: ' + jsToString(problem.value);

				case 'index':
					context += '[' + problem.index + ']';
					problem = problem.rest;
					break;

				case 'field':
					context += '.' + problem.field;
					problem = problem.rest;
					break;

				case 'oneOf':
					var problems = problem.problems;
					for (var i = 0; i < problems.length; i++)
					{
						problems[i] = badToString(problems[i]);
					}
					return 'I ran into the following problems'
						+ (context === '_' ? '' : ' at ' + context)
						+ ':\n\n' + problems.join('\n');

				case 'fail':
					return 'I ran into a `fail` decoder'
						+ (context === '_' ? '' : ' at ' + context);
			}
		}
	}

	function jsToString(value)
	{
		return value === undefined
			? 'undefined'
			: JSON.stringify(value);
	}


	// DECODE

	function runOnString(decoder, string)
	{
		var json;
		try
		{
			json = JSON.parse(string);
		}
		catch (e)
		{
			return _elm_lang$core$Result$Err('Given an invalid JSON: ' + e.message);
		}
		return run(decoder, json);
	}

	function run(decoder, value)
	{
		var result = runHelp(decoder, value);
		return (result.tag === 'ok')
			? _elm_lang$core$Result$Ok(result.value)
			: _elm_lang$core$Result$Err(badToString(result));
	}

	function runHelp(decoder, value)
	{
		switch (decoder.tag)
		{
			case 'bool':
				return (typeof value === 'boolean')
					? ok(value)
					: badPrimitive('a Bool', value);

			case 'int':
				var isNotInt =
					typeof value !== 'number'
					|| !(-2147483647 < value && value < 2147483647 && (value | 0) === value)
					|| !(isFinite(value) && !(value % 1));

				return isNotInt
					? badPrimitive('an Int', value)
					: ok(value);

			case 'float':
				return (typeof value === 'number')
					? ok(value)
					: badPrimitive('a Float', value);

			case 'string':
				return (typeof value === 'string')
					? ok(value)
					: (value instanceof String)
						? ok(value + '')
						: badPrimitive('a String', value);

			case 'null':
				return (value === null)
					? ok(decoder.value)
					: badPrimitive('null', value);

			case 'value':
				return ok(value);

			case 'list':
				if (!(value instanceof Array))
				{
					return badPrimitive('a List', value);
				}

				var list = _elm_lang$core$Native_List.Nil;
				for (var i = value.length; i--; )
				{
					var result = runHelp(decoder.decoder, value[i]);
					if (result.tag !== 'ok')
					{
						return badIndex(i, result)
					}
					list = _elm_lang$core$Native_List.Cons(result.value, list);
				}
				return ok(list);

			case 'array':
				if (!(value instanceof Array))
				{
					return badPrimitive('an Array', value);
				}

				var len = value.length;
				var array = new Array(len);
				for (var i = len; i--; )
				{
					var result = runHelp(decoder.decoder, value[i]);
					if (result.tag !== 'ok')
					{
						return badIndex(i, result);
					}
					array[i] = result.value;
				}
				return ok(_elm_lang$core$Native_Array.fromJSArray(array));

			case 'maybe':
				var result = runHelp(decoder.decoder, value);
				return (result.tag === 'ok')
					? ok(_elm_lang$core$Maybe$Just(result.value))
					: ok(_elm_lang$core$Maybe$Nothing);

			case 'field':
				var field = decoder.field;
				if (typeof value !== 'object' || value === null || !(field in value))
				{
					return badPrimitive('an object with a field named `' + field + '`', value);
				}

				var result = runHelp(decoder.decoder, value[field]);
				return (result.tag === 'ok')
					? result
					: badField(field, result);

			case 'key-value':
				if (typeof value !== 'object' || value === null || value instanceof Array)
				{
					return err('an object', value);
				}

				var keyValuePairs = _elm_lang$core$Native_List.Nil;
				for (var key in value)
				{
					var result = runHelp(decoder.decoder, value[key]);
					if (result.tag !== 'ok')
					{
						return badField(key, result);
					}
					var pair = _elm_lang$core$Native_Utils.Tuple2(key, result.value);
					keyValuePairs = _elm_lang$core$Native_List.Cons(pair, keyValuePairs);
				}
				return ok(keyValuePairs);

			case 'map-many':
				var answer = decoder.func;
				var decoders = decoder.decoders;
				for (var i = 0; i < decoders.length; i++)
				{
					var result = runHelp(decoders[i], value);
					if (result.tag !== 'ok')
					{
						return result;
					}
					answer = answer(result.value);
				}
				return ok(answer);

			case 'tuple':
				var decoders = decoder.decoders;
				var len = decoders.length;

				if ( !(value instanceof Array) || value.length !== len )
				{
					return badPrimitive('a Tuple with ' + len + ' entries', value);
				}

				var answer = decoder.func;
				for (var i = 0; i < len; i++)
				{
					var result = runHelp(decoders[i], value[i]);
					if (result.tag !== 'ok')
					{
						return badIndex(i, result);
					}
					answer = answer(result.value);
				}
				return ok(answer);

			case 'customAndThen':
				var result = runHelp(decoder.decoder, value);
				if (result.tag !== 'ok')
				{
					return result;
				}
				var realResult = decoder.callback(result.value);
				if (realResult.ctor === 'Err')
				{
					return badPrimitive('something custom', value);
				}
				return ok(realResult._0);

			case 'andThen':
				var result = runHelp(decoder.decoder, value);
				return (result.tag !== 'ok')
					? result
					: runHelp(decoder.callback(result.value), value);

			case 'oneOf':
				var errors = [];
				var temp = decoder.decoders;
				while (temp.ctor !== '[]')
				{
					var result = runHelp(temp._0, value);

					if (result.tag === 'ok')
					{
						return result;
					}

					errors.push(result);

					temp = temp._1;
				}
				return badOneOf(errors);

			case 'fail':
				return bad;

			case 'succeed':
				return ok(decoder.msg);
		}
	}


	// EQUALITY

	function equality(a, b)
	{
		if (a === b)
		{
			return true;
		}

		if (a.tag !== b.tag)
		{
			return false;
		}

		switch (a.tag)
		{
			case 'succeed':
			case 'fail':
				return a.msg === b.msg;

			case 'bool':
			case 'int':
			case 'float':
			case 'string':
			case 'value':
				return true;

			case 'null':
				return a.value === b.value;

			case 'list':
			case 'array':
			case 'maybe':
			case 'key-value':
				return equality(a.decoder, b.decoder);

			case 'field':
				return a.field === b.field && equality(a.decoder, b.decoder);

			case 'map-many':
			case 'tuple':
				if (a.func !== b.func)
				{
					return false;
				}
				return listEquality(a.decoders, b.decoders);

			case 'andThen':
			case 'customAndThen':
				return a.callback === b.callback && equality(a.decoder, b.decoder);

			case 'oneOf':
				return listEquality(a.decoders, b.decoders);
		}
	}

	function listEquality(aDecoders, bDecoders)
	{
		var len = aDecoders.length;
		if (len !== bDecoders.length)
		{
			return false;
		}
		for (var i = 0; i < len; i++)
		{
			if (!equality(aDecoders[i], bDecoders[i]))
			{
				return false;
			}
		}
		return true;
	}


	// ENCODE

	function encode(indentLevel, value)
	{
		return JSON.stringify(value, null, indentLevel);
	}

	function identity(value)
	{
		return value;
	}

	function encodeObject(keyValuePairs)
	{
		var obj = {};
		while (keyValuePairs.ctor !== '[]')
		{
			var pair = keyValuePairs._0;
			obj[pair._0] = pair._1;
			keyValuePairs = keyValuePairs._1;
		}
		return obj;
	}

	return {
		encode: F2(encode),
		runOnString: F2(runOnString),
		run: F2(run),

		decodeNull: decodeNull,
		decodePrimitive: decodePrimitive,
		decodeContainer: F2(decodeContainer),

		decodeField: F2(decodeField),

		decodeObject1: F2(decodeObject1),
		decodeObject2: F3(decodeObject2),
		decodeObject3: F4(decodeObject3),
		decodeObject4: F5(decodeObject4),
		decodeObject5: F6(decodeObject5),
		decodeObject6: F7(decodeObject6),
		decodeObject7: F8(decodeObject7),
		decodeObject8: F9(decodeObject8),
		decodeKeyValuePairs: decodeKeyValuePairs,

		decodeTuple1: F2(decodeTuple1),
		decodeTuple2: F3(decodeTuple2),
		decodeTuple3: F4(decodeTuple3),
		decodeTuple4: F5(decodeTuple4),
		decodeTuple5: F6(decodeTuple5),
		decodeTuple6: F7(decodeTuple6),
		decodeTuple7: F8(decodeTuple7),
		decodeTuple8: F9(decodeTuple8),

		andThen: F2(andThen),
		customAndThen: F2(customAndThen),
		fail: fail,
		succeed: succeed,
		oneOf: oneOf,

		identity: identity,
		encodeNull: null,
		encodeArray: _elm_lang$core$Native_Array.toJSArray,
		encodeList: _elm_lang$core$Native_List.toArray,
		encodeObject: encodeObject,

		equality: equality
	};

	}();

	var _elm_lang$core$Json_Encode$list = _elm_lang$core$Native_Json.encodeList;
	var _elm_lang$core$Json_Encode$array = _elm_lang$core$Native_Json.encodeArray;
	var _elm_lang$core$Json_Encode$object = _elm_lang$core$Native_Json.encodeObject;
	var _elm_lang$core$Json_Encode$null = _elm_lang$core$Native_Json.encodeNull;
	var _elm_lang$core$Json_Encode$bool = _elm_lang$core$Native_Json.identity;
	var _elm_lang$core$Json_Encode$float = _elm_lang$core$Native_Json.identity;
	var _elm_lang$core$Json_Encode$int = _elm_lang$core$Native_Json.identity;
	var _elm_lang$core$Json_Encode$string = _elm_lang$core$Native_Json.identity;
	var _elm_lang$core$Json_Encode$encode = _elm_lang$core$Native_Json.encode;
	var _elm_lang$core$Json_Encode$Value = {ctor: 'Value'};

	var _elm_lang$core$Json_Decode$tuple8 = _elm_lang$core$Native_Json.decodeTuple8;
	var _elm_lang$core$Json_Decode$tuple7 = _elm_lang$core$Native_Json.decodeTuple7;
	var _elm_lang$core$Json_Decode$tuple6 = _elm_lang$core$Native_Json.decodeTuple6;
	var _elm_lang$core$Json_Decode$tuple5 = _elm_lang$core$Native_Json.decodeTuple5;
	var _elm_lang$core$Json_Decode$tuple4 = _elm_lang$core$Native_Json.decodeTuple4;
	var _elm_lang$core$Json_Decode$tuple3 = _elm_lang$core$Native_Json.decodeTuple3;
	var _elm_lang$core$Json_Decode$tuple2 = _elm_lang$core$Native_Json.decodeTuple2;
	var _elm_lang$core$Json_Decode$tuple1 = _elm_lang$core$Native_Json.decodeTuple1;
	var _elm_lang$core$Json_Decode$succeed = _elm_lang$core$Native_Json.succeed;
	var _elm_lang$core$Json_Decode$fail = _elm_lang$core$Native_Json.fail;
	var _elm_lang$core$Json_Decode$andThen = _elm_lang$core$Native_Json.andThen;
	var _elm_lang$core$Json_Decode$customDecoder = _elm_lang$core$Native_Json.customAndThen;
	var _elm_lang$core$Json_Decode$decodeValue = _elm_lang$core$Native_Json.run;
	var _elm_lang$core$Json_Decode$value = _elm_lang$core$Native_Json.decodePrimitive('value');
	var _elm_lang$core$Json_Decode$maybe = function (decoder) {
		return A2(_elm_lang$core$Native_Json.decodeContainer, 'maybe', decoder);
	};
	var _elm_lang$core$Json_Decode$null = _elm_lang$core$Native_Json.decodeNull;
	var _elm_lang$core$Json_Decode$array = function (decoder) {
		return A2(_elm_lang$core$Native_Json.decodeContainer, 'array', decoder);
	};
	var _elm_lang$core$Json_Decode$list = function (decoder) {
		return A2(_elm_lang$core$Native_Json.decodeContainer, 'list', decoder);
	};
	var _elm_lang$core$Json_Decode$bool = _elm_lang$core$Native_Json.decodePrimitive('bool');
	var _elm_lang$core$Json_Decode$int = _elm_lang$core$Native_Json.decodePrimitive('int');
	var _elm_lang$core$Json_Decode$float = _elm_lang$core$Native_Json.decodePrimitive('float');
	var _elm_lang$core$Json_Decode$string = _elm_lang$core$Native_Json.decodePrimitive('string');
	var _elm_lang$core$Json_Decode$oneOf = _elm_lang$core$Native_Json.oneOf;
	var _elm_lang$core$Json_Decode$keyValuePairs = _elm_lang$core$Native_Json.decodeKeyValuePairs;
	var _elm_lang$core$Json_Decode$object8 = _elm_lang$core$Native_Json.decodeObject8;
	var _elm_lang$core$Json_Decode$object7 = _elm_lang$core$Native_Json.decodeObject7;
	var _elm_lang$core$Json_Decode$object6 = _elm_lang$core$Native_Json.decodeObject6;
	var _elm_lang$core$Json_Decode$object5 = _elm_lang$core$Native_Json.decodeObject5;
	var _elm_lang$core$Json_Decode$object4 = _elm_lang$core$Native_Json.decodeObject4;
	var _elm_lang$core$Json_Decode$object3 = _elm_lang$core$Native_Json.decodeObject3;
	var _elm_lang$core$Json_Decode$object2 = _elm_lang$core$Native_Json.decodeObject2;
	var _elm_lang$core$Json_Decode$object1 = _elm_lang$core$Native_Json.decodeObject1;
	var _elm_lang$core$Json_Decode_ops = _elm_lang$core$Json_Decode_ops || {};
	_elm_lang$core$Json_Decode_ops[':='] = _elm_lang$core$Native_Json.decodeField;
	var _elm_lang$core$Json_Decode$at = F2(
		function (fields, decoder) {
			return A3(
				_elm_lang$core$List$foldr,
				F2(
					function (x, y) {
						return A2(_elm_lang$core$Json_Decode_ops[':='], x, y);
					}),
				decoder,
				fields);
		});
	var _elm_lang$core$Json_Decode$decodeString = _elm_lang$core$Native_Json.runOnString;
	var _elm_lang$core$Json_Decode$map = _elm_lang$core$Native_Json.decodeObject1;
	var _elm_lang$core$Json_Decode$dict = function (decoder) {
		return A2(
			_elm_lang$core$Json_Decode$map,
			_elm_lang$core$Dict$fromList,
			_elm_lang$core$Json_Decode$keyValuePairs(decoder));
	};
	var _elm_lang$core$Json_Decode$Decoder = {ctor: 'Decoder'};

	var _NoRedInk$elm_decode_pipeline$Json_Decode_Pipeline$decode = _elm_lang$core$Json_Decode$succeed;
	var _NoRedInk$elm_decode_pipeline$Json_Decode_Pipeline$resolveResult = function (resultDecoder) {
		return A2(
			_elm_lang$core$Json_Decode$andThen,
			resultDecoder,
			function (result) {
				return A2(
					_elm_lang$core$Json_Decode$customDecoder,
					_elm_lang$core$Json_Decode$succeed(
						{ctor: '_Tuple0'}),
					function (_p0) {
						return result;
					});
			});
	};
	var _NoRedInk$elm_decode_pipeline$Json_Decode_Pipeline$custom = F2(
		function (delegated, decoder) {
			return A2(
				_elm_lang$core$Json_Decode$andThen,
				decoder,
				function (wrappedFn) {
					return A2(_elm_lang$core$Json_Decode$map, wrappedFn, delegated);
				});
		});
	var _NoRedInk$elm_decode_pipeline$Json_Decode_Pipeline$hardcoded = F2(
		function (val, decoder) {
			return A2(
				_elm_lang$core$Json_Decode$andThen,
				decoder,
				function (wrappedFn) {
					return A2(
						_elm_lang$core$Json_Decode$map,
						wrappedFn,
						_elm_lang$core$Json_Decode$succeed(val));
				});
		});
	var _NoRedInk$elm_decode_pipeline$Json_Decode_Pipeline$optionalDecoder = F3(
		function (pathDecoder, valDecoder, fallback) {
			var handleResult = function (input) {
				var _p1 = A2(_elm_lang$core$Json_Decode$decodeValue, pathDecoder, input);
				if (_p1.ctor === 'Ok') {
					return A2(_elm_lang$core$Json_Decode$decodeValue, valDecoder, _p1._0);
				} else {
					return _elm_lang$core$Result$Ok(fallback);
				}
			};
			return A2(_elm_lang$core$Json_Decode$customDecoder, _elm_lang$core$Json_Decode$value, handleResult);
		});
	var _NoRedInk$elm_decode_pipeline$Json_Decode_Pipeline$optionalAt = F4(
		function (path, valDecoder, fallback, decoder) {
			return A2(
				_NoRedInk$elm_decode_pipeline$Json_Decode_Pipeline$custom,
				A3(
					_NoRedInk$elm_decode_pipeline$Json_Decode_Pipeline$optionalDecoder,
					A2(_elm_lang$core$Json_Decode$at, path, _elm_lang$core$Json_Decode$value),
					valDecoder,
					fallback),
				decoder);
		});
	var _NoRedInk$elm_decode_pipeline$Json_Decode_Pipeline$optional = F4(
		function (key, valDecoder, fallback, decoder) {
			return A2(
				_NoRedInk$elm_decode_pipeline$Json_Decode_Pipeline$custom,
				A3(
					_NoRedInk$elm_decode_pipeline$Json_Decode_Pipeline$optionalDecoder,
					A2(_elm_lang$core$Json_Decode_ops[':='], key, _elm_lang$core$Json_Decode$value),
					valDecoder,
					fallback),
				decoder);
		});
	var _NoRedInk$elm_decode_pipeline$Json_Decode_Pipeline$requiredAt = F3(
		function (path, valDecoder, decoder) {
			return A2(
				_NoRedInk$elm_decode_pipeline$Json_Decode_Pipeline$custom,
				A2(_elm_lang$core$Json_Decode$at, path, valDecoder),
				decoder);
		});
	var _NoRedInk$elm_decode_pipeline$Json_Decode_Pipeline$required = F3(
		function (key, valDecoder, decoder) {
			return A2(
				_NoRedInk$elm_decode_pipeline$Json_Decode_Pipeline$custom,
				A2(_elm_lang$core$Json_Decode_ops[':='], key, valDecoder),
				decoder);
		});

	var _elm_lang$core$Set$foldr = F3(
		function (f, b, _p0) {
			var _p1 = _p0;
			return A3(
				_elm_lang$core$Dict$foldr,
				F3(
					function (k, _p2, b) {
						return A2(f, k, b);
					}),
				b,
				_p1._0);
		});
	var _elm_lang$core$Set$foldl = F3(
		function (f, b, _p3) {
			var _p4 = _p3;
			return A3(
				_elm_lang$core$Dict$foldl,
				F3(
					function (k, _p5, b) {
						return A2(f, k, b);
					}),
				b,
				_p4._0);
		});
	var _elm_lang$core$Set$toList = function (_p6) {
		var _p7 = _p6;
		return _elm_lang$core$Dict$keys(_p7._0);
	};
	var _elm_lang$core$Set$size = function (_p8) {
		var _p9 = _p8;
		return _elm_lang$core$Dict$size(_p9._0);
	};
	var _elm_lang$core$Set$member = F2(
		function (k, _p10) {
			var _p11 = _p10;
			return A2(_elm_lang$core$Dict$member, k, _p11._0);
		});
	var _elm_lang$core$Set$isEmpty = function (_p12) {
		var _p13 = _p12;
		return _elm_lang$core$Dict$isEmpty(_p13._0);
	};
	var _elm_lang$core$Set$Set_elm_builtin = function (a) {
		return {ctor: 'Set_elm_builtin', _0: a};
	};
	var _elm_lang$core$Set$empty = _elm_lang$core$Set$Set_elm_builtin(_elm_lang$core$Dict$empty);
	var _elm_lang$core$Set$singleton = function (k) {
		return _elm_lang$core$Set$Set_elm_builtin(
			A2(
				_elm_lang$core$Dict$singleton,
				k,
				{ctor: '_Tuple0'}));
	};
	var _elm_lang$core$Set$insert = F2(
		function (k, _p14) {
			var _p15 = _p14;
			return _elm_lang$core$Set$Set_elm_builtin(
				A3(
					_elm_lang$core$Dict$insert,
					k,
					{ctor: '_Tuple0'},
					_p15._0));
		});
	var _elm_lang$core$Set$fromList = function (xs) {
		return A3(_elm_lang$core$List$foldl, _elm_lang$core$Set$insert, _elm_lang$core$Set$empty, xs);
	};
	var _elm_lang$core$Set$map = F2(
		function (f, s) {
			return _elm_lang$core$Set$fromList(
				A2(
					_elm_lang$core$List$map,
					f,
					_elm_lang$core$Set$toList(s)));
		});
	var _elm_lang$core$Set$remove = F2(
		function (k, _p16) {
			var _p17 = _p16;
			return _elm_lang$core$Set$Set_elm_builtin(
				A2(_elm_lang$core$Dict$remove, k, _p17._0));
		});
	var _elm_lang$core$Set$union = F2(
		function (_p19, _p18) {
			var _p20 = _p19;
			var _p21 = _p18;
			return _elm_lang$core$Set$Set_elm_builtin(
				A2(_elm_lang$core$Dict$union, _p20._0, _p21._0));
		});
	var _elm_lang$core$Set$intersect = F2(
		function (_p23, _p22) {
			var _p24 = _p23;
			var _p25 = _p22;
			return _elm_lang$core$Set$Set_elm_builtin(
				A2(_elm_lang$core$Dict$intersect, _p24._0, _p25._0));
		});
	var _elm_lang$core$Set$diff = F2(
		function (_p27, _p26) {
			var _p28 = _p27;
			var _p29 = _p26;
			return _elm_lang$core$Set$Set_elm_builtin(
				A2(_elm_lang$core$Dict$diff, _p28._0, _p29._0));
		});
	var _elm_lang$core$Set$filter = F2(
		function (p, _p30) {
			var _p31 = _p30;
			return _elm_lang$core$Set$Set_elm_builtin(
				A2(
					_elm_lang$core$Dict$filter,
					F2(
						function (k, _p32) {
							return p(k);
						}),
					_p31._0));
		});
	var _elm_lang$core$Set$partition = F2(
		function (p, _p33) {
			var _p34 = _p33;
			var _p35 = A2(
				_elm_lang$core$Dict$partition,
				F2(
					function (k, _p36) {
						return p(k);
					}),
				_p34._0);
			var p1 = _p35._0;
			var p2 = _p35._1;
			return {
				ctor: '_Tuple2',
				_0: _elm_lang$core$Set$Set_elm_builtin(p1),
				_1: _elm_lang$core$Set$Set_elm_builtin(p2)
			};
		});

	var _elm_community$elm_list_extra$List_Extra$greedyGroupsOfWithStep = F3(
		function (size, step, xs) {
			var okayXs = _elm_lang$core$Native_Utils.cmp(
				_elm_lang$core$List$length(xs),
				0) > 0;
			var okayArgs = (_elm_lang$core$Native_Utils.cmp(size, 0) > 0) && (_elm_lang$core$Native_Utils.cmp(step, 0) > 0);
			var xs$ = A2(_elm_lang$core$List$drop, step, xs);
			var group = A2(_elm_lang$core$List$take, size, xs);
			return (okayArgs && okayXs) ? A2(
				_elm_lang$core$List_ops['::'],
				group,
				A3(_elm_community$elm_list_extra$List_Extra$greedyGroupsOfWithStep, size, step, xs$)) : _elm_lang$core$Native_List.fromArray(
				[]);
		});
	var _elm_community$elm_list_extra$List_Extra$greedyGroupsOf = F2(
		function (size, xs) {
			return A3(_elm_community$elm_list_extra$List_Extra$greedyGroupsOfWithStep, size, size, xs);
		});
	var _elm_community$elm_list_extra$List_Extra$groupsOfWithStep = F3(
		function (size, step, xs) {
			var okayArgs = (_elm_lang$core$Native_Utils.cmp(size, 0) > 0) && (_elm_lang$core$Native_Utils.cmp(step, 0) > 0);
			var xs$ = A2(_elm_lang$core$List$drop, step, xs);
			var group = A2(_elm_lang$core$List$take, size, xs);
			var okayLength = _elm_lang$core$Native_Utils.eq(
				size,
				_elm_lang$core$List$length(group));
			return (okayArgs && okayLength) ? A2(
				_elm_lang$core$List_ops['::'],
				group,
				A3(_elm_community$elm_list_extra$List_Extra$groupsOfWithStep, size, step, xs$)) : _elm_lang$core$Native_List.fromArray(
				[]);
		});
	var _elm_community$elm_list_extra$List_Extra$groupsOf = F2(
		function (size, xs) {
			return A3(_elm_community$elm_list_extra$List_Extra$groupsOfWithStep, size, size, xs);
		});
	var _elm_community$elm_list_extra$List_Extra$zip5 = _elm_lang$core$List$map5(
		F5(
			function (v0, v1, v2, v3, v4) {
				return {ctor: '_Tuple5', _0: v0, _1: v1, _2: v2, _3: v3, _4: v4};
			}));
	var _elm_community$elm_list_extra$List_Extra$zip4 = _elm_lang$core$List$map4(
		F4(
			function (v0, v1, v2, v3) {
				return {ctor: '_Tuple4', _0: v0, _1: v1, _2: v2, _3: v3};
			}));
	var _elm_community$elm_list_extra$List_Extra$zip3 = _elm_lang$core$List$map3(
		F3(
			function (v0, v1, v2) {
				return {ctor: '_Tuple3', _0: v0, _1: v1, _2: v2};
			}));
	var _elm_community$elm_list_extra$List_Extra$zip = _elm_lang$core$List$map2(
		F2(
			function (v0, v1) {
				return {ctor: '_Tuple2', _0: v0, _1: v1};
			}));
	var _elm_community$elm_list_extra$List_Extra$isPrefixOf = function (prefix) {
		return function (_p0) {
			return A2(
				_elm_lang$core$List$all,
				_elm_lang$core$Basics$identity,
				A3(
					_elm_lang$core$List$map2,
					F2(
						function (x, y) {
							return _elm_lang$core$Native_Utils.eq(x, y);
						}),
					prefix,
					_p0));
		};
	};
	var _elm_community$elm_list_extra$List_Extra$isSuffixOf = F2(
		function (suffix, xs) {
			return A2(
				_elm_community$elm_list_extra$List_Extra$isPrefixOf,
				_elm_lang$core$List$reverse(suffix),
				_elm_lang$core$List$reverse(xs));
		});
	var _elm_community$elm_list_extra$List_Extra$selectSplit = function (xs) {
		var _p1 = xs;
		if (_p1.ctor === '[]') {
			return _elm_lang$core$Native_List.fromArray(
				[]);
		} else {
			var _p5 = _p1._1;
			var _p4 = _p1._0;
			return A2(
				_elm_lang$core$List_ops['::'],
				{
					ctor: '_Tuple3',
					_0: _elm_lang$core$Native_List.fromArray(
						[]),
					_1: _p4,
					_2: _p5
				},
				A2(
					_elm_lang$core$List$map,
					function (_p2) {
						var _p3 = _p2;
						return {
							ctor: '_Tuple3',
							_0: A2(_elm_lang$core$List_ops['::'], _p4, _p3._0),
							_1: _p3._1,
							_2: _p3._2
						};
					},
					_elm_community$elm_list_extra$List_Extra$selectSplit(_p5)));
		}
	};
	var _elm_community$elm_list_extra$List_Extra$select = function (xs) {
		var _p6 = xs;
		if (_p6.ctor === '[]') {
			return _elm_lang$core$Native_List.fromArray(
				[]);
		} else {
			var _p10 = _p6._1;
			var _p9 = _p6._0;
			return A2(
				_elm_lang$core$List_ops['::'],
				{ctor: '_Tuple2', _0: _p9, _1: _p10},
				A2(
					_elm_lang$core$List$map,
					function (_p7) {
						var _p8 = _p7;
						return {
							ctor: '_Tuple2',
							_0: _p8._0,
							_1: A2(_elm_lang$core$List_ops['::'], _p9, _p8._1)
						};
					},
					_elm_community$elm_list_extra$List_Extra$select(_p10)));
		}
	};
	var _elm_community$elm_list_extra$List_Extra$tailsHelp = F2(
		function (e, list) {
			var _p11 = list;
			if (_p11.ctor === '::') {
				var _p12 = _p11._0;
				return A2(
					_elm_lang$core$List_ops['::'],
					A2(_elm_lang$core$List_ops['::'], e, _p12),
					A2(_elm_lang$core$List_ops['::'], _p12, _p11._1));
			} else {
				return _elm_lang$core$Native_List.fromArray(
					[]);
			}
		});
	var _elm_community$elm_list_extra$List_Extra$tails = A2(
		_elm_lang$core$List$foldr,
		_elm_community$elm_list_extra$List_Extra$tailsHelp,
		_elm_lang$core$Native_List.fromArray(
			[
				_elm_lang$core$Native_List.fromArray(
				[])
			]));
	var _elm_community$elm_list_extra$List_Extra$isInfixOf = F2(
		function (infix, xs) {
			return A2(
				_elm_lang$core$List$any,
				_elm_community$elm_list_extra$List_Extra$isPrefixOf(infix),
				_elm_community$elm_list_extra$List_Extra$tails(xs));
		});
	var _elm_community$elm_list_extra$List_Extra$inits = A2(
		_elm_lang$core$List$foldr,
		F2(
			function (e, acc) {
				return A2(
					_elm_lang$core$List_ops['::'],
					_elm_lang$core$Native_List.fromArray(
						[]),
					A2(
						_elm_lang$core$List$map,
						F2(
							function (x, y) {
								return A2(_elm_lang$core$List_ops['::'], x, y);
							})(e),
						acc));
			}),
		_elm_lang$core$Native_List.fromArray(
			[
				_elm_lang$core$Native_List.fromArray(
				[])
			]));
	var _elm_community$elm_list_extra$List_Extra$groupWhileTransitively = F2(
		function (cmp, xs$) {
			var _p13 = xs$;
			if (_p13.ctor === '[]') {
				return _elm_lang$core$Native_List.fromArray(
					[]);
			} else {
				if (_p13._1.ctor === '[]') {
					return _elm_lang$core$Native_List.fromArray(
						[
							_elm_lang$core$Native_List.fromArray(
							[_p13._0])
						]);
				} else {
					var _p15 = _p13._0;
					var _p14 = A2(_elm_community$elm_list_extra$List_Extra$groupWhileTransitively, cmp, _p13._1);
					if (_p14.ctor === '::') {
						return A2(cmp, _p15, _p13._1._0) ? A2(
							_elm_lang$core$List_ops['::'],
							A2(_elm_lang$core$List_ops['::'], _p15, _p14._0),
							_p14._1) : A2(
							_elm_lang$core$List_ops['::'],
							_elm_lang$core$Native_List.fromArray(
								[_p15]),
							_p14);
					} else {
						return _elm_lang$core$Native_List.fromArray(
							[]);
					}
				}
			}
		});
	var _elm_community$elm_list_extra$List_Extra$stripPrefix = F2(
		function (prefix, xs) {
			var step = F2(
				function (e, m) {
					var _p16 = m;
					if (_p16.ctor === 'Nothing') {
						return _elm_lang$core$Maybe$Nothing;
					} else {
						if (_p16._0.ctor === '[]') {
							return _elm_lang$core$Maybe$Nothing;
						} else {
							return _elm_lang$core$Native_Utils.eq(e, _p16._0._0) ? _elm_lang$core$Maybe$Just(_p16._0._1) : _elm_lang$core$Maybe$Nothing;
						}
					}
				});
			return A3(
				_elm_lang$core$List$foldl,
				step,
				_elm_lang$core$Maybe$Just(xs),
				prefix);
		});
	var _elm_community$elm_list_extra$List_Extra$dropWhileEnd = function (p) {
		return A2(
			_elm_lang$core$List$foldr,
			F2(
				function (x, xs) {
					return (p(x) && _elm_lang$core$List$isEmpty(xs)) ? _elm_lang$core$Native_List.fromArray(
						[]) : A2(_elm_lang$core$List_ops['::'], x, xs);
				}),
			_elm_lang$core$Native_List.fromArray(
				[]));
	};
	var _elm_community$elm_list_extra$List_Extra$takeWhileEnd = function (p) {
		var step = F2(
			function (x, _p17) {
				var _p18 = _p17;
				var _p19 = _p18._0;
				return (p(x) && _p18._1) ? {
					ctor: '_Tuple2',
					_0: A2(_elm_lang$core$List_ops['::'], x, _p19),
					_1: true
				} : {ctor: '_Tuple2', _0: _p19, _1: false};
			});
		return function (_p20) {
			return _elm_lang$core$Basics$fst(
				A3(
					_elm_lang$core$List$foldr,
					step,
					{
						ctor: '_Tuple2',
						_0: _elm_lang$core$Native_List.fromArray(
							[]),
						_1: true
					},
					_p20));
		};
	};
	var _elm_community$elm_list_extra$List_Extra$splitAt = F2(
		function (n, xs) {
			return {
				ctor: '_Tuple2',
				_0: A2(_elm_lang$core$List$take, n, xs),
				_1: A2(_elm_lang$core$List$drop, n, xs)
			};
		});
	var _elm_community$elm_list_extra$List_Extra$unfoldr = F2(
		function (f, seed) {
			var _p21 = f(seed);
			if (_p21.ctor === 'Nothing') {
				return _elm_lang$core$Native_List.fromArray(
					[]);
			} else {
				return A2(
					_elm_lang$core$List_ops['::'],
					_p21._0._0,
					A2(_elm_community$elm_list_extra$List_Extra$unfoldr, f, _p21._0._1));
			}
		});
	var _elm_community$elm_list_extra$List_Extra$scanr1 = F2(
		function (f, xs$) {
			var _p22 = xs$;
			if (_p22.ctor === '[]') {
				return _elm_lang$core$Native_List.fromArray(
					[]);
			} else {
				if (_p22._1.ctor === '[]') {
					return _elm_lang$core$Native_List.fromArray(
						[_p22._0]);
				} else {
					var _p23 = A2(_elm_community$elm_list_extra$List_Extra$scanr1, f, _p22._1);
					if (_p23.ctor === '::') {
						return A2(
							_elm_lang$core$List_ops['::'],
							A2(f, _p22._0, _p23._0),
							_p23);
					} else {
						return _elm_lang$core$Native_List.fromArray(
							[]);
					}
				}
			}
		});
	var _elm_community$elm_list_extra$List_Extra$scanr = F3(
		function (f, acc, xs$) {
			var _p24 = xs$;
			if (_p24.ctor === '[]') {
				return _elm_lang$core$Native_List.fromArray(
					[acc]);
			} else {
				var _p25 = A3(_elm_community$elm_list_extra$List_Extra$scanr, f, acc, _p24._1);
				if (_p25.ctor === '::') {
					return A2(
						_elm_lang$core$List_ops['::'],
						A2(f, _p24._0, _p25._0),
						_p25);
				} else {
					return _elm_lang$core$Native_List.fromArray(
						[]);
				}
			}
		});
	var _elm_community$elm_list_extra$List_Extra$scanl1 = F2(
		function (f, xs$) {
			var _p26 = xs$;
			if (_p26.ctor === '[]') {
				return _elm_lang$core$Native_List.fromArray(
					[]);
			} else {
				return A3(_elm_lang$core$List$scanl, f, _p26._0, _p26._1);
			}
		});
	var _elm_community$elm_list_extra$List_Extra$foldr1 = F2(
		function (f, xs) {
			var mf = F2(
				function (x, m) {
					return _elm_lang$core$Maybe$Just(
						function () {
							var _p27 = m;
							if (_p27.ctor === 'Nothing') {
								return x;
							} else {
								return A2(f, x, _p27._0);
							}
						}());
				});
			return A3(_elm_lang$core$List$foldr, mf, _elm_lang$core$Maybe$Nothing, xs);
		});
	var _elm_community$elm_list_extra$List_Extra$foldl1 = F2(
		function (f, xs) {
			var mf = F2(
				function (x, m) {
					return _elm_lang$core$Maybe$Just(
						function () {
							var _p28 = m;
							if (_p28.ctor === 'Nothing') {
								return x;
							} else {
								return A2(f, _p28._0, x);
							}
						}());
				});
			return A3(_elm_lang$core$List$foldl, mf, _elm_lang$core$Maybe$Nothing, xs);
		});
	var _elm_community$elm_list_extra$List_Extra$interweaveHelp = F3(
		function (l1, l2, acc) {
			interweaveHelp:
			while (true) {
				var _p29 = {ctor: '_Tuple2', _0: l1, _1: l2};
				_v17_1:
				do {
					if (_p29._0.ctor === '::') {
						if (_p29._1.ctor === '::') {
							var _v18 = _p29._0._1,
								_v19 = _p29._1._1,
								_v20 = A2(
								_elm_lang$core$Basics_ops['++'],
								acc,
								_elm_lang$core$Native_List.fromArray(
									[_p29._0._0, _p29._1._0]));
							l1 = _v18;
							l2 = _v19;
							acc = _v20;
							continue interweaveHelp;
						} else {
							break _v17_1;
						}
					} else {
						if (_p29._1.ctor === '[]') {
							break _v17_1;
						} else {
							return A2(_elm_lang$core$Basics_ops['++'], acc, _p29._1);
						}
					}
				} while(false);
				return A2(_elm_lang$core$Basics_ops['++'], acc, _p29._0);
			}
		});
	var _elm_community$elm_list_extra$List_Extra$interweave = F2(
		function (l1, l2) {
			return A3(
				_elm_community$elm_list_extra$List_Extra$interweaveHelp,
				l1,
				l2,
				_elm_lang$core$Native_List.fromArray(
					[]));
		});
	var _elm_community$elm_list_extra$List_Extra$permutations = function (xs$) {
		var _p30 = xs$;
		if (_p30.ctor === '[]') {
			return _elm_lang$core$Native_List.fromArray(
				[
					_elm_lang$core$Native_List.fromArray(
					[])
				]);
		} else {
			var f = function (_p31) {
				var _p32 = _p31;
				return A2(
					_elm_lang$core$List$map,
					F2(
						function (x, y) {
							return A2(_elm_lang$core$List_ops['::'], x, y);
						})(_p32._0),
					_elm_community$elm_list_extra$List_Extra$permutations(_p32._1));
			};
			return A2(
				_elm_lang$core$List$concatMap,
				f,
				_elm_community$elm_list_extra$List_Extra$select(_p30));
		}
	};
	var _elm_community$elm_list_extra$List_Extra$isPermutationOf = F2(
		function (permut, xs) {
			return A2(
				_elm_lang$core$List$member,
				permut,
				_elm_community$elm_list_extra$List_Extra$permutations(xs));
		});
	var _elm_community$elm_list_extra$List_Extra$subsequencesNonEmpty = function (xs) {
		var _p33 = xs;
		if (_p33.ctor === '[]') {
			return _elm_lang$core$Native_List.fromArray(
				[]);
		} else {
			var _p34 = _p33._0;
			var f = F2(
				function (ys, r) {
					return A2(
						_elm_lang$core$List_ops['::'],
						ys,
						A2(
							_elm_lang$core$List_ops['::'],
							A2(_elm_lang$core$List_ops['::'], _p34, ys),
							r));
				});
			return A2(
				_elm_lang$core$List_ops['::'],
				_elm_lang$core$Native_List.fromArray(
					[_p34]),
				A3(
					_elm_lang$core$List$foldr,
					f,
					_elm_lang$core$Native_List.fromArray(
						[]),
					_elm_community$elm_list_extra$List_Extra$subsequencesNonEmpty(_p33._1)));
		}
	};
	var _elm_community$elm_list_extra$List_Extra$subsequences = function (xs) {
		return A2(
			_elm_lang$core$List_ops['::'],
			_elm_lang$core$Native_List.fromArray(
				[]),
			_elm_community$elm_list_extra$List_Extra$subsequencesNonEmpty(xs));
	};
	var _elm_community$elm_list_extra$List_Extra$isSubsequenceOf = F2(
		function (subseq, xs) {
			return A2(
				_elm_lang$core$List$member,
				subseq,
				_elm_community$elm_list_extra$List_Extra$subsequences(xs));
		});
	var _elm_community$elm_list_extra$List_Extra$transpose = function (ll) {
		transpose:
		while (true) {
			var _p35 = ll;
			if (_p35.ctor === '[]') {
				return _elm_lang$core$Native_List.fromArray(
					[]);
			} else {
				if (_p35._0.ctor === '[]') {
					var _v25 = _p35._1;
					ll = _v25;
					continue transpose;
				} else {
					var _p36 = _p35._1;
					var tails = A2(_elm_lang$core$List$filterMap, _elm_lang$core$List$tail, _p36);
					var heads = A2(_elm_lang$core$List$filterMap, _elm_lang$core$List$head, _p36);
					return A2(
						_elm_lang$core$List_ops['::'],
						A2(_elm_lang$core$List_ops['::'], _p35._0._0, heads),
						_elm_community$elm_list_extra$List_Extra$transpose(
							A2(_elm_lang$core$List_ops['::'], _p35._0._1, tails)));
				}
			}
		}
	};
	var _elm_community$elm_list_extra$List_Extra$intercalate = function (xs) {
		return function (_p37) {
			return _elm_lang$core$List$concat(
				A2(_elm_lang$core$List$intersperse, xs, _p37));
		};
	};
	var _elm_community$elm_list_extra$List_Extra$removeWhen = F2(
		function (pred, list) {
			return A2(
				_elm_lang$core$List$filter,
				function (_p38) {
					return _elm_lang$core$Basics$not(
						pred(_p38));
				},
				list);
		});
	var _elm_community$elm_list_extra$List_Extra$removeAt = F2(
		function (index, l) {
			if (_elm_lang$core$Native_Utils.cmp(index, 0) < 0) {
				return l;
			} else {
				var tail = _elm_lang$core$List$tail(
					A2(_elm_lang$core$List$drop, index, l));
				var head = A2(_elm_lang$core$List$take, index, l);
				var _p39 = tail;
				if (_p39.ctor === 'Nothing') {
					return l;
				} else {
					return A2(_elm_lang$core$List$append, head, _p39._0);
				}
			}
		});
	var _elm_community$elm_list_extra$List_Extra$singleton = function (x) {
		return _elm_lang$core$Native_List.fromArray(
			[x]);
	};
	var _elm_community$elm_list_extra$List_Extra$setAt = F3(
		function (index, value, l) {
			if (_elm_lang$core$Native_Utils.cmp(index, 0) < 0) {
				return _elm_lang$core$Maybe$Nothing;
			} else {
				var tail = _elm_lang$core$List$tail(
					A2(_elm_lang$core$List$drop, index, l));
				var head = A2(_elm_lang$core$List$take, index, l);
				var _p40 = tail;
				if (_p40.ctor === 'Nothing') {
					return _elm_lang$core$Maybe$Nothing;
				} else {
					return _elm_lang$core$Maybe$Just(
						A2(
							_elm_lang$core$List$append,
							head,
							A2(_elm_lang$core$List_ops['::'], value, _p40._0)));
				}
			}
		});
	var _elm_community$elm_list_extra$List_Extra$deleteIf = F2(
		function (predicate, items) {
			return A2(
				_elm_lang$core$List$filter,
				function (_p41) {
					return _elm_lang$core$Basics$not(
						predicate(_p41));
				},
				items);
		});
	var _elm_community$elm_list_extra$List_Extra$updateIfIndex = F3(
		function (predicate, update, list) {
			return A2(
				_elm_lang$core$List$indexedMap,
				F2(
					function (i, x) {
						return predicate(i) ? update(x) : x;
					}),
				list);
		});
	var _elm_community$elm_list_extra$List_Extra$updateAt = F3(
		function (index, update, list) {
			return ((_elm_lang$core$Native_Utils.cmp(index, 0) < 0) || (_elm_lang$core$Native_Utils.cmp(
				index,
				_elm_lang$core$List$length(list)) > -1)) ? _elm_lang$core$Maybe$Nothing : _elm_lang$core$Maybe$Just(
				A3(
					_elm_community$elm_list_extra$List_Extra$updateIfIndex,
					F2(
						function (x, y) {
							return _elm_lang$core$Native_Utils.eq(x, y);
						})(index),
					update,
					list));
		});
	var _elm_community$elm_list_extra$List_Extra$updateIf = F3(
		function (predicate, update, list) {
			return A2(
				_elm_lang$core$List$map,
				function (item) {
					return predicate(item) ? update(item) : item;
				},
				list);
		});
	var _elm_community$elm_list_extra$List_Extra$replaceIf = F3(
		function (predicate, replacement, list) {
			return A3(
				_elm_community$elm_list_extra$List_Extra$updateIf,
				predicate,
				_elm_lang$core$Basics$always(replacement),
				list);
		});
	var _elm_community$elm_list_extra$List_Extra$findIndices = function (p) {
		return function (_p42) {
			return A2(
				_elm_lang$core$List$map,
				_elm_lang$core$Basics$fst,
				A2(
					_elm_lang$core$List$filter,
					function (_p43) {
						var _p44 = _p43;
						return p(_p44._1);
					},
					A2(
						_elm_lang$core$List$indexedMap,
						F2(
							function (v0, v1) {
								return {ctor: '_Tuple2', _0: v0, _1: v1};
							}),
						_p42)));
		};
	};
	var _elm_community$elm_list_extra$List_Extra$findIndex = function (p) {
		return function (_p45) {
			return _elm_lang$core$List$head(
				A2(_elm_community$elm_list_extra$List_Extra$findIndices, p, _p45));
		};
	};
	var _elm_community$elm_list_extra$List_Extra$elemIndices = function (x) {
		return _elm_community$elm_list_extra$List_Extra$findIndices(
			F2(
				function (x, y) {
					return _elm_lang$core$Native_Utils.eq(x, y);
				})(x));
	};
	var _elm_community$elm_list_extra$List_Extra$elemIndex = function (x) {
		return _elm_community$elm_list_extra$List_Extra$findIndex(
			F2(
				function (x, y) {
					return _elm_lang$core$Native_Utils.eq(x, y);
				})(x));
	};
	var _elm_community$elm_list_extra$List_Extra$find = F2(
		function (predicate, list) {
			find:
			while (true) {
				var _p46 = list;
				if (_p46.ctor === '[]') {
					return _elm_lang$core$Maybe$Nothing;
				} else {
					var _p47 = _p46._0;
					if (predicate(_p47)) {
						return _elm_lang$core$Maybe$Just(_p47);
					} else {
						var _v30 = predicate,
							_v31 = _p46._1;
						predicate = _v30;
						list = _v31;
						continue find;
					}
				}
			}
		});
	var _elm_community$elm_list_extra$List_Extra$notMember = function (x) {
		return function (_p48) {
			return _elm_lang$core$Basics$not(
				A2(_elm_lang$core$List$member, x, _p48));
		};
	};
	var _elm_community$elm_list_extra$List_Extra$andThen = _elm_lang$core$Basics$flip(_elm_lang$core$List$concatMap);
	var _elm_community$elm_list_extra$List_Extra$lift2 = F3(
		function (f, la, lb) {
			return A2(
				_elm_community$elm_list_extra$List_Extra$andThen,
				la,
				function (a) {
					return A2(
						_elm_community$elm_list_extra$List_Extra$andThen,
						lb,
						function (b) {
							return _elm_lang$core$Native_List.fromArray(
								[
									A2(f, a, b)
								]);
						});
				});
		});
	var _elm_community$elm_list_extra$List_Extra$lift3 = F4(
		function (f, la, lb, lc) {
			return A2(
				_elm_community$elm_list_extra$List_Extra$andThen,
				la,
				function (a) {
					return A2(
						_elm_community$elm_list_extra$List_Extra$andThen,
						lb,
						function (b) {
							return A2(
								_elm_community$elm_list_extra$List_Extra$andThen,
								lc,
								function (c) {
									return _elm_lang$core$Native_List.fromArray(
										[
											A3(f, a, b, c)
										]);
								});
						});
				});
		});
	var _elm_community$elm_list_extra$List_Extra$lift4 = F5(
		function (f, la, lb, lc, ld) {
			return A2(
				_elm_community$elm_list_extra$List_Extra$andThen,
				la,
				function (a) {
					return A2(
						_elm_community$elm_list_extra$List_Extra$andThen,
						lb,
						function (b) {
							return A2(
								_elm_community$elm_list_extra$List_Extra$andThen,
								lc,
								function (c) {
									return A2(
										_elm_community$elm_list_extra$List_Extra$andThen,
										ld,
										function (d) {
											return _elm_lang$core$Native_List.fromArray(
												[
													A4(f, a, b, c, d)
												]);
										});
								});
						});
				});
		});
	var _elm_community$elm_list_extra$List_Extra$andMap = F2(
		function (fl, l) {
			return A3(
				_elm_lang$core$List$map2,
				F2(
					function (x, y) {
						return x(y);
					}),
				fl,
				l);
		});
	var _elm_community$elm_list_extra$List_Extra$dropDuplicatesHelp = F2(
		function (existing, remaining) {
			dropDuplicatesHelp:
			while (true) {
				var _p49 = remaining;
				if (_p49.ctor === '[]') {
					return _elm_lang$core$Native_List.fromArray(
						[]);
				} else {
					var _p51 = _p49._1;
					var _p50 = _p49._0;
					if (A2(_elm_lang$core$Set$member, _p50, existing)) {
						var _v33 = existing,
							_v34 = _p51;
						existing = _v33;
						remaining = _v34;
						continue dropDuplicatesHelp;
					} else {
						return A2(
							_elm_lang$core$List_ops['::'],
							_p50,
							A2(
								_elm_community$elm_list_extra$List_Extra$dropDuplicatesHelp,
								A2(_elm_lang$core$Set$insert, _p50, existing),
								_p51));
					}
				}
			}
		});
	var _elm_community$elm_list_extra$List_Extra$dropDuplicates = function (list) {
		return A2(_elm_community$elm_list_extra$List_Extra$dropDuplicatesHelp, _elm_lang$core$Set$empty, list);
	};
	var _elm_community$elm_list_extra$List_Extra$dropWhile = F2(
		function (predicate, list) {
			dropWhile:
			while (true) {
				var _p52 = list;
				if (_p52.ctor === '[]') {
					return _elm_lang$core$Native_List.fromArray(
						[]);
				} else {
					if (predicate(_p52._0)) {
						var _v36 = predicate,
							_v37 = _p52._1;
						predicate = _v36;
						list = _v37;
						continue dropWhile;
					} else {
						return list;
					}
				}
			}
		});
	var _elm_community$elm_list_extra$List_Extra$takeWhile = F2(
		function (predicate, list) {
			var _p53 = list;
			if (_p53.ctor === '[]') {
				return _elm_lang$core$Native_List.fromArray(
					[]);
			} else {
				var _p54 = _p53._0;
				return predicate(_p54) ? A2(
					_elm_lang$core$List_ops['::'],
					_p54,
					A2(_elm_community$elm_list_extra$List_Extra$takeWhile, predicate, _p53._1)) : _elm_lang$core$Native_List.fromArray(
					[]);
			}
		});
	var _elm_community$elm_list_extra$List_Extra$span = F2(
		function (p, xs) {
			return {
				ctor: '_Tuple2',
				_0: A2(_elm_community$elm_list_extra$List_Extra$takeWhile, p, xs),
				_1: A2(_elm_community$elm_list_extra$List_Extra$dropWhile, p, xs)
			};
		});
	var _elm_community$elm_list_extra$List_Extra$break = function (p) {
		return _elm_community$elm_list_extra$List_Extra$span(
			function (_p55) {
				return _elm_lang$core$Basics$not(
					p(_p55));
			});
	};
	var _elm_community$elm_list_extra$List_Extra$groupWhile = F2(
		function (eq, xs$) {
			var _p56 = xs$;
			if (_p56.ctor === '[]') {
				return _elm_lang$core$Native_List.fromArray(
					[]);
			} else {
				var _p58 = _p56._0;
				var _p57 = A2(
					_elm_community$elm_list_extra$List_Extra$span,
					eq(_p58),
					_p56._1);
				var ys = _p57._0;
				var zs = _p57._1;
				return A2(
					_elm_lang$core$List_ops['::'],
					A2(_elm_lang$core$List_ops['::'], _p58, ys),
					A2(_elm_community$elm_list_extra$List_Extra$groupWhile, eq, zs));
			}
		});
	var _elm_community$elm_list_extra$List_Extra$group = _elm_community$elm_list_extra$List_Extra$groupWhile(
		F2(
			function (x, y) {
				return _elm_lang$core$Native_Utils.eq(x, y);
			}));
	var _elm_community$elm_list_extra$List_Extra$minimumBy = F2(
		function (f, ls) {
			var minBy = F2(
				function (x, _p59) {
					var _p60 = _p59;
					var _p61 = _p60._1;
					var fx = f(x);
					return (_elm_lang$core$Native_Utils.cmp(fx, _p61) < 0) ? {ctor: '_Tuple2', _0: x, _1: fx} : {ctor: '_Tuple2', _0: _p60._0, _1: _p61};
				});
			var _p62 = ls;
			if (_p62.ctor === '::') {
				if (_p62._1.ctor === '[]') {
					return _elm_lang$core$Maybe$Just(_p62._0);
				} else {
					var _p63 = _p62._0;
					return _elm_lang$core$Maybe$Just(
						_elm_lang$core$Basics$fst(
							A3(
								_elm_lang$core$List$foldl,
								minBy,
								{
									ctor: '_Tuple2',
									_0: _p63,
									_1: f(_p63)
								},
								_p62._1)));
				}
			} else {
				return _elm_lang$core$Maybe$Nothing;
			}
		});
	var _elm_community$elm_list_extra$List_Extra$maximumBy = F2(
		function (f, ls) {
			var maxBy = F2(
				function (x, _p64) {
					var _p65 = _p64;
					var _p66 = _p65._1;
					var fx = f(x);
					return (_elm_lang$core$Native_Utils.cmp(fx, _p66) > 0) ? {ctor: '_Tuple2', _0: x, _1: fx} : {ctor: '_Tuple2', _0: _p65._0, _1: _p66};
				});
			var _p67 = ls;
			if (_p67.ctor === '::') {
				if (_p67._1.ctor === '[]') {
					return _elm_lang$core$Maybe$Just(_p67._0);
				} else {
					var _p68 = _p67._0;
					return _elm_lang$core$Maybe$Just(
						_elm_lang$core$Basics$fst(
							A3(
								_elm_lang$core$List$foldl,
								maxBy,
								{
									ctor: '_Tuple2',
									_0: _p68,
									_1: f(_p68)
								},
								_p67._1)));
				}
			} else {
				return _elm_lang$core$Maybe$Nothing;
			}
		});
	var _elm_community$elm_list_extra$List_Extra$uncons = function (xs) {
		var _p69 = xs;
		if (_p69.ctor === '[]') {
			return _elm_lang$core$Maybe$Nothing;
		} else {
			return _elm_lang$core$Maybe$Just(
				{ctor: '_Tuple2', _0: _p69._0, _1: _p69._1});
		}
	};
	var _elm_community$elm_list_extra$List_Extra$iterate = F2(
		function (f, x) {
			var _p70 = f(x);
			if (_p70.ctor === 'Just') {
				return A2(
					_elm_lang$core$List_ops['::'],
					x,
					A2(_elm_community$elm_list_extra$List_Extra$iterate, f, _p70._0));
			} else {
				return _elm_lang$core$Native_List.fromArray(
					[x]);
			}
		});
	var _elm_community$elm_list_extra$List_Extra$getAt = F2(
		function (idx, xs) {
			return (_elm_lang$core$Native_Utils.cmp(idx, 0) < 0) ? _elm_lang$core$Maybe$Nothing : _elm_lang$core$List$head(
				A2(_elm_lang$core$List$drop, idx, xs));
		});
	var _elm_community$elm_list_extra$List_Extra_ops = _elm_community$elm_list_extra$List_Extra_ops || {};
	_elm_community$elm_list_extra$List_Extra_ops['!!'] = _elm_lang$core$Basics$flip(_elm_community$elm_list_extra$List_Extra$getAt);
	var _elm_community$elm_list_extra$List_Extra$init = function () {
		var maybe = F2(
			function (d, f) {
				return function (_p71) {
					return A2(
						_elm_lang$core$Maybe$withDefault,
						d,
						A2(_elm_lang$core$Maybe$map, f, _p71));
				};
			});
		return A2(
			_elm_lang$core$List$foldr,
			function (_p72) {
				return A2(
					F2(
						function (x, y) {
							return function (_p73) {
								return x(
									y(_p73));
							};
						}),
					_elm_lang$core$Maybe$Just,
					A2(
						maybe,
						_elm_lang$core$Native_List.fromArray(
							[]),
						F2(
							function (x, y) {
								return A2(_elm_lang$core$List_ops['::'], x, y);
							})(_p72)));
			},
			_elm_lang$core$Maybe$Nothing);
	}();
	var _elm_community$elm_list_extra$List_Extra$last = _elm_community$elm_list_extra$List_Extra$foldl1(
		_elm_lang$core$Basics$flip(_elm_lang$core$Basics$always));

	//import Result //

	var _elm_lang$core$Native_Date = function() {

	function fromString(str)
	{
		var date = new Date(str);
		return isNaN(date.getTime())
			? _elm_lang$core$Result$Err('unable to parse \'' + str + '\' as a date')
			: _elm_lang$core$Result$Ok(date);
	}

	var dayTable = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
	var monthTable =
		['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
		 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];


	return {
		fromString: fromString,
		year: function(d) { return d.getFullYear(); },
		month: function(d) { return { ctor: monthTable[d.getMonth()] }; },
		day: function(d) { return d.getDate(); },
		hour: function(d) { return d.getHours(); },
		minute: function(d) { return d.getMinutes(); },
		second: function(d) { return d.getSeconds(); },
		millisecond: function(d) { return d.getMilliseconds(); },
		toTime: function(d) { return d.getTime(); },
		fromTime: function(t) { return new Date(t); },
		dayOfWeek: function(d) { return { ctor: dayTable[d.getDay()] }; }
	};

	}();
	var _elm_lang$core$Task$onError = _elm_lang$core$Native_Scheduler.onError;
	var _elm_lang$core$Task$andThen = _elm_lang$core$Native_Scheduler.andThen;
	var _elm_lang$core$Task$spawnCmd = F2(
		function (router, _p0) {
			var _p1 = _p0;
			return _elm_lang$core$Native_Scheduler.spawn(
				A2(
					_elm_lang$core$Task$andThen,
					_p1._0,
					_elm_lang$core$Platform$sendToApp(router)));
		});
	var _elm_lang$core$Task$fail = _elm_lang$core$Native_Scheduler.fail;
	var _elm_lang$core$Task$mapError = F2(
		function (f, task) {
			return A2(
				_elm_lang$core$Task$onError,
				task,
				function (err) {
					return _elm_lang$core$Task$fail(
						f(err));
				});
		});
	var _elm_lang$core$Task$succeed = _elm_lang$core$Native_Scheduler.succeed;
	var _elm_lang$core$Task$map = F2(
		function (func, taskA) {
			return A2(
				_elm_lang$core$Task$andThen,
				taskA,
				function (a) {
					return _elm_lang$core$Task$succeed(
						func(a));
				});
		});
	var _elm_lang$core$Task$map2 = F3(
		function (func, taskA, taskB) {
			return A2(
				_elm_lang$core$Task$andThen,
				taskA,
				function (a) {
					return A2(
						_elm_lang$core$Task$andThen,
						taskB,
						function (b) {
							return _elm_lang$core$Task$succeed(
								A2(func, a, b));
						});
				});
		});
	var _elm_lang$core$Task$map3 = F4(
		function (func, taskA, taskB, taskC) {
			return A2(
				_elm_lang$core$Task$andThen,
				taskA,
				function (a) {
					return A2(
						_elm_lang$core$Task$andThen,
						taskB,
						function (b) {
							return A2(
								_elm_lang$core$Task$andThen,
								taskC,
								function (c) {
									return _elm_lang$core$Task$succeed(
										A3(func, a, b, c));
								});
						});
				});
		});
	var _elm_lang$core$Task$map4 = F5(
		function (func, taskA, taskB, taskC, taskD) {
			return A2(
				_elm_lang$core$Task$andThen,
				taskA,
				function (a) {
					return A2(
						_elm_lang$core$Task$andThen,
						taskB,
						function (b) {
							return A2(
								_elm_lang$core$Task$andThen,
								taskC,
								function (c) {
									return A2(
										_elm_lang$core$Task$andThen,
										taskD,
										function (d) {
											return _elm_lang$core$Task$succeed(
												A4(func, a, b, c, d));
										});
								});
						});
				});
		});
	var _elm_lang$core$Task$map5 = F6(
		function (func, taskA, taskB, taskC, taskD, taskE) {
			return A2(
				_elm_lang$core$Task$andThen,
				taskA,
				function (a) {
					return A2(
						_elm_lang$core$Task$andThen,
						taskB,
						function (b) {
							return A2(
								_elm_lang$core$Task$andThen,
								taskC,
								function (c) {
									return A2(
										_elm_lang$core$Task$andThen,
										taskD,
										function (d) {
											return A2(
												_elm_lang$core$Task$andThen,
												taskE,
												function (e) {
													return _elm_lang$core$Task$succeed(
														A5(func, a, b, c, d, e));
												});
										});
								});
						});
				});
		});
	var _elm_lang$core$Task$andMap = F2(
		function (taskFunc, taskValue) {
			return A2(
				_elm_lang$core$Task$andThen,
				taskFunc,
				function (func) {
					return A2(
						_elm_lang$core$Task$andThen,
						taskValue,
						function (value) {
							return _elm_lang$core$Task$succeed(
								func(value));
						});
				});
		});
	var _elm_lang$core$Task$sequence = function (tasks) {
		var _p2 = tasks;
		if (_p2.ctor === '[]') {
			return _elm_lang$core$Task$succeed(
				_elm_lang$core$Native_List.fromArray(
					[]));
		} else {
			return A3(
				_elm_lang$core$Task$map2,
				F2(
					function (x, y) {
						return A2(_elm_lang$core$List_ops['::'], x, y);
					}),
				_p2._0,
				_elm_lang$core$Task$sequence(_p2._1));
		}
	};
	var _elm_lang$core$Task$onEffects = F3(
		function (router, commands, state) {
			return A2(
				_elm_lang$core$Task$map,
				function (_p3) {
					return {ctor: '_Tuple0'};
				},
				_elm_lang$core$Task$sequence(
					A2(
						_elm_lang$core$List$map,
						_elm_lang$core$Task$spawnCmd(router),
						commands)));
		});
	var _elm_lang$core$Task$toMaybe = function (task) {
		return A2(
			_elm_lang$core$Task$onError,
			A2(_elm_lang$core$Task$map, _elm_lang$core$Maybe$Just, task),
			function (_p4) {
				return _elm_lang$core$Task$succeed(_elm_lang$core$Maybe$Nothing);
			});
	};
	var _elm_lang$core$Task$fromMaybe = F2(
		function ($default, maybe) {
			var _p5 = maybe;
			if (_p5.ctor === 'Just') {
				return _elm_lang$core$Task$succeed(_p5._0);
			} else {
				return _elm_lang$core$Task$fail($default);
			}
		});
	var _elm_lang$core$Task$toResult = function (task) {
		return A2(
			_elm_lang$core$Task$onError,
			A2(_elm_lang$core$Task$map, _elm_lang$core$Result$Ok, task),
			function (msg) {
				return _elm_lang$core$Task$succeed(
					_elm_lang$core$Result$Err(msg));
			});
	};
	var _elm_lang$core$Task$fromResult = function (result) {
		var _p6 = result;
		if (_p6.ctor === 'Ok') {
			return _elm_lang$core$Task$succeed(_p6._0);
		} else {
			return _elm_lang$core$Task$fail(_p6._0);
		}
	};
	var _elm_lang$core$Task$init = _elm_lang$core$Task$succeed(
		{ctor: '_Tuple0'});
	var _elm_lang$core$Task$onSelfMsg = F3(
		function (_p9, _p8, _p7) {
			return _elm_lang$core$Task$succeed(
				{ctor: '_Tuple0'});
		});
	var _elm_lang$core$Task$command = _elm_lang$core$Native_Platform.leaf('Task');
	var _elm_lang$core$Task$T = function (a) {
		return {ctor: 'T', _0: a};
	};
	var _elm_lang$core$Task$perform = F3(
		function (onFail, onSuccess, task) {
			return _elm_lang$core$Task$command(
				_elm_lang$core$Task$T(
					A2(
						_elm_lang$core$Task$onError,
						A2(_elm_lang$core$Task$map, onSuccess, task),
						function (x) {
							return _elm_lang$core$Task$succeed(
								onFail(x));
						})));
		});
	var _elm_lang$core$Task$cmdMap = F2(
		function (tagger, _p10) {
			var _p11 = _p10;
			return _elm_lang$core$Task$T(
				A2(_elm_lang$core$Task$map, tagger, _p11._0));
		});
	_elm_lang$core$Native_Platform.effectManagers['Task'] = {pkg: 'elm-lang/core', init: _elm_lang$core$Task$init, onEffects: _elm_lang$core$Task$onEffects, onSelfMsg: _elm_lang$core$Task$onSelfMsg, tag: 'cmd', cmdMap: _elm_lang$core$Task$cmdMap};

	//import Native.Scheduler //

	var _elm_lang$core$Native_Time = function() {

	var now = _elm_lang$core$Native_Scheduler.nativeBinding(function(callback)
	{
		callback(_elm_lang$core$Native_Scheduler.succeed(Date.now()));
	});

	function setInterval_(interval, task)
	{
		return _elm_lang$core$Native_Scheduler.nativeBinding(function(callback)
		{
			var id = setInterval(function() {
				_elm_lang$core$Native_Scheduler.rawSpawn(task);
			}, interval);

			return function() { clearInterval(id); };
		});
	}

	return {
		now: now,
		setInterval_: F2(setInterval_)
	};

	}();
	var _elm_lang$core$Time$setInterval = _elm_lang$core$Native_Time.setInterval_;
	var _elm_lang$core$Time$spawnHelp = F3(
		function (router, intervals, processes) {
			var _p0 = intervals;
			if (_p0.ctor === '[]') {
				return _elm_lang$core$Task$succeed(processes);
			} else {
				var _p1 = _p0._0;
				return A2(
					_elm_lang$core$Task$andThen,
					_elm_lang$core$Native_Scheduler.spawn(
						A2(
							_elm_lang$core$Time$setInterval,
							_p1,
							A2(_elm_lang$core$Platform$sendToSelf, router, _p1))),
					function (id) {
						return A3(
							_elm_lang$core$Time$spawnHelp,
							router,
							_p0._1,
							A3(_elm_lang$core$Dict$insert, _p1, id, processes));
					});
			}
		});
	var _elm_lang$core$Time$addMySub = F2(
		function (_p2, state) {
			var _p3 = _p2;
			var _p6 = _p3._1;
			var _p5 = _p3._0;
			var _p4 = A2(_elm_lang$core$Dict$get, _p5, state);
			if (_p4.ctor === 'Nothing') {
				return A3(
					_elm_lang$core$Dict$insert,
					_p5,
					_elm_lang$core$Native_List.fromArray(
						[_p6]),
					state);
			} else {
				return A3(
					_elm_lang$core$Dict$insert,
					_p5,
					A2(_elm_lang$core$List_ops['::'], _p6, _p4._0),
					state);
			}
		});
	var _elm_lang$core$Time$inMilliseconds = function (t) {
		return t;
	};
	var _elm_lang$core$Time$millisecond = 1;
	var _elm_lang$core$Time$second = 1000 * _elm_lang$core$Time$millisecond;
	var _elm_lang$core$Time$minute = 60 * _elm_lang$core$Time$second;
	var _elm_lang$core$Time$hour = 60 * _elm_lang$core$Time$minute;
	var _elm_lang$core$Time$inHours = function (t) {
		return t / _elm_lang$core$Time$hour;
	};
	var _elm_lang$core$Time$inMinutes = function (t) {
		return t / _elm_lang$core$Time$minute;
	};
	var _elm_lang$core$Time$inSeconds = function (t) {
		return t / _elm_lang$core$Time$second;
	};
	var _elm_lang$core$Time$now = _elm_lang$core$Native_Time.now;
	var _elm_lang$core$Time$onSelfMsg = F3(
		function (router, interval, state) {
			var _p7 = A2(_elm_lang$core$Dict$get, interval, state.taggers);
			if (_p7.ctor === 'Nothing') {
				return _elm_lang$core$Task$succeed(state);
			} else {
				return A2(
					_elm_lang$core$Task$andThen,
					_elm_lang$core$Time$now,
					function (time) {
						return A2(
							_elm_lang$core$Task$andThen,
							_elm_lang$core$Task$sequence(
								A2(
									_elm_lang$core$List$map,
									function (tagger) {
										return A2(
											_elm_lang$core$Platform$sendToApp,
											router,
											tagger(time));
									},
									_p7._0)),
							function (_p8) {
								return _elm_lang$core$Task$succeed(state);
							});
					});
			}
		});
	var _elm_lang$core$Time$subscription = _elm_lang$core$Native_Platform.leaf('Time');
	var _elm_lang$core$Time$State = F2(
		function (a, b) {
			return {taggers: a, processes: b};
		});
	var _elm_lang$core$Time$init = _elm_lang$core$Task$succeed(
		A2(_elm_lang$core$Time$State, _elm_lang$core$Dict$empty, _elm_lang$core$Dict$empty));
	var _elm_lang$core$Time$onEffects = F3(
		function (router, subs, _p9) {
			var _p10 = _p9;
			var rightStep = F3(
				function (_p12, id, _p11) {
					var _p13 = _p11;
					return {
						ctor: '_Tuple3',
						_0: _p13._0,
						_1: _p13._1,
						_2: A2(
							_elm_lang$core$Task$andThen,
							_elm_lang$core$Native_Scheduler.kill(id),
							function (_p14) {
								return _p13._2;
							})
					};
				});
			var bothStep = F4(
				function (interval, taggers, id, _p15) {
					var _p16 = _p15;
					return {
						ctor: '_Tuple3',
						_0: _p16._0,
						_1: A3(_elm_lang$core$Dict$insert, interval, id, _p16._1),
						_2: _p16._2
					};
				});
			var leftStep = F3(
				function (interval, taggers, _p17) {
					var _p18 = _p17;
					return {
						ctor: '_Tuple3',
						_0: A2(_elm_lang$core$List_ops['::'], interval, _p18._0),
						_1: _p18._1,
						_2: _p18._2
					};
				});
			var newTaggers = A3(_elm_lang$core$List$foldl, _elm_lang$core$Time$addMySub, _elm_lang$core$Dict$empty, subs);
			var _p19 = A6(
				_elm_lang$core$Dict$merge,
				leftStep,
				bothStep,
				rightStep,
				newTaggers,
				_p10.processes,
				{
					ctor: '_Tuple3',
					_0: _elm_lang$core$Native_List.fromArray(
						[]),
					_1: _elm_lang$core$Dict$empty,
					_2: _elm_lang$core$Task$succeed(
						{ctor: '_Tuple0'})
				});
			var spawnList = _p19._0;
			var existingDict = _p19._1;
			var killTask = _p19._2;
			return A2(
				_elm_lang$core$Task$andThen,
				killTask,
				function (_p20) {
					return A2(
						_elm_lang$core$Task$andThen,
						A3(_elm_lang$core$Time$spawnHelp, router, spawnList, existingDict),
						function (newProcesses) {
							return _elm_lang$core$Task$succeed(
								A2(_elm_lang$core$Time$State, newTaggers, newProcesses));
						});
				});
		});
	var _elm_lang$core$Time$Every = F2(
		function (a, b) {
			return {ctor: 'Every', _0: a, _1: b};
		});
	var _elm_lang$core$Time$every = F2(
		function (interval, tagger) {
			return _elm_lang$core$Time$subscription(
				A2(_elm_lang$core$Time$Every, interval, tagger));
		});
	var _elm_lang$core$Time$subMap = F2(
		function (f, _p21) {
			var _p22 = _p21;
			return A2(
				_elm_lang$core$Time$Every,
				_p22._0,
				function (_p23) {
					return f(
						_p22._1(_p23));
				});
		});
	_elm_lang$core$Native_Platform.effectManagers['Time'] = {pkg: 'elm-lang/core', init: _elm_lang$core$Time$init, onEffects: _elm_lang$core$Time$onEffects, onSelfMsg: _elm_lang$core$Time$onSelfMsg, tag: 'sub', subMap: _elm_lang$core$Time$subMap};

	var _elm_lang$core$Date$millisecond = _elm_lang$core$Native_Date.millisecond;
	var _elm_lang$core$Date$second = _elm_lang$core$Native_Date.second;
	var _elm_lang$core$Date$minute = _elm_lang$core$Native_Date.minute;
	var _elm_lang$core$Date$hour = _elm_lang$core$Native_Date.hour;
	var _elm_lang$core$Date$dayOfWeek = _elm_lang$core$Native_Date.dayOfWeek;
	var _elm_lang$core$Date$day = _elm_lang$core$Native_Date.day;
	var _elm_lang$core$Date$month = _elm_lang$core$Native_Date.month;
	var _elm_lang$core$Date$year = _elm_lang$core$Native_Date.year;
	var _elm_lang$core$Date$fromTime = _elm_lang$core$Native_Date.fromTime;
	var _elm_lang$core$Date$toTime = _elm_lang$core$Native_Date.toTime;
	var _elm_lang$core$Date$fromString = _elm_lang$core$Native_Date.fromString;
	var _elm_lang$core$Date$now = A2(_elm_lang$core$Task$map, _elm_lang$core$Date$fromTime, _elm_lang$core$Time$now);
	var _elm_lang$core$Date$Date = {ctor: 'Date'};
	var _elm_lang$core$Date$Sun = {ctor: 'Sun'};
	var _elm_lang$core$Date$Sat = {ctor: 'Sat'};
	var _elm_lang$core$Date$Fri = {ctor: 'Fri'};
	var _elm_lang$core$Date$Thu = {ctor: 'Thu'};
	var _elm_lang$core$Date$Wed = {ctor: 'Wed'};
	var _elm_lang$core$Date$Tue = {ctor: 'Tue'};
	var _elm_lang$core$Date$Mon = {ctor: 'Mon'};
	var _elm_lang$core$Date$Dec = {ctor: 'Dec'};
	var _elm_lang$core$Date$Nov = {ctor: 'Nov'};
	var _elm_lang$core$Date$Oct = {ctor: 'Oct'};
	var _elm_lang$core$Date$Sep = {ctor: 'Sep'};
	var _elm_lang$core$Date$Aug = {ctor: 'Aug'};
	var _elm_lang$core$Date$Jul = {ctor: 'Jul'};
	var _elm_lang$core$Date$Jun = {ctor: 'Jun'};
	var _elm_lang$core$Date$May = {ctor: 'May'};
	var _elm_lang$core$Date$Apr = {ctor: 'Apr'};
	var _elm_lang$core$Date$Mar = {ctor: 'Mar'};
	var _elm_lang$core$Date$Feb = {ctor: 'Feb'};
	var _elm_lang$core$Date$Jan = {ctor: 'Jan'};

	//import Maybe, Native.List //

	var _elm_lang$core$Native_Regex = function() {

	function escape(str)
	{
		return str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
	}
	function caseInsensitive(re)
	{
		return new RegExp(re.source, 'gi');
	}
	function regex(raw)
	{
		return new RegExp(raw, 'g');
	}

	function contains(re, string)
	{
		return string.match(re) !== null;
	}

	function find(n, re, str)
	{
		n = n.ctor === 'All' ? Infinity : n._0;
		var out = [];
		var number = 0;
		var string = str;
		var lastIndex = re.lastIndex;
		var prevLastIndex = -1;
		var result;
		while (number++ < n && (result = re.exec(string)))
		{
			if (prevLastIndex === re.lastIndex) break;
			var i = result.length - 1;
			var subs = new Array(i);
			while (i > 0)
			{
				var submatch = result[i];
				subs[--i] = submatch === undefined
					? _elm_lang$core$Maybe$Nothing
					: _elm_lang$core$Maybe$Just(submatch);
			}
			out.push({
				match: result[0],
				submatches: _elm_lang$core$Native_List.fromArray(subs),
				index: result.index,
				number: number
			});
			prevLastIndex = re.lastIndex;
		}
		re.lastIndex = lastIndex;
		return _elm_lang$core$Native_List.fromArray(out);
	}

	function replace(n, re, replacer, string)
	{
		n = n.ctor === 'All' ? Infinity : n._0;
		var count = 0;
		function jsReplacer(match)
		{
			if (count++ >= n)
			{
				return match;
			}
			var i = arguments.length - 3;
			var submatches = new Array(i);
			while (i > 0)
			{
				var submatch = arguments[i];
				submatches[--i] = submatch === undefined
					? _elm_lang$core$Maybe$Nothing
					: _elm_lang$core$Maybe$Just(submatch);
			}
			return replacer({
				match: match,
				submatches: _elm_lang$core$Native_List.fromArray(submatches),
				index: arguments[i - 1],
				number: count
			});
		}
		return string.replace(re, jsReplacer);
	}

	function split(n, re, str)
	{
		n = n.ctor === 'All' ? Infinity : n._0;
		if (n === Infinity)
		{
			return _elm_lang$core$Native_List.fromArray(str.split(re));
		}
		var string = str;
		var result;
		var out = [];
		var start = re.lastIndex;
		while (n--)
		{
			if (!(result = re.exec(string))) break;
			out.push(string.slice(start, result.index));
			start = re.lastIndex;
		}
		out.push(string.slice(start));
		return _elm_lang$core$Native_List.fromArray(out);
	}

	return {
		regex: regex,
		caseInsensitive: caseInsensitive,
		escape: escape,

		contains: F2(contains),
		find: F3(find),
		replace: F4(replace),
		split: F3(split)
	};

	}();

	var _elm_lang$core$Regex$split = _elm_lang$core$Native_Regex.split;
	var _elm_lang$core$Regex$replace = _elm_lang$core$Native_Regex.replace;
	var _elm_lang$core$Regex$find = _elm_lang$core$Native_Regex.find;
	var _elm_lang$core$Regex$contains = _elm_lang$core$Native_Regex.contains;
	var _elm_lang$core$Regex$caseInsensitive = _elm_lang$core$Native_Regex.caseInsensitive;
	var _elm_lang$core$Regex$regex = _elm_lang$core$Native_Regex.regex;
	var _elm_lang$core$Regex$escape = _elm_lang$core$Native_Regex.escape;
	var _elm_lang$core$Regex$Match = F4(
		function (a, b, c, d) {
			return {match: a, submatches: b, index: c, number: d};
		});
	var _elm_lang$core$Regex$Regex = {ctor: 'Regex'};
	var _elm_lang$core$Regex$AtMost = function (a) {
		return {ctor: 'AtMost', _0: a};
	};
	var _elm_lang$core$Regex$All = {ctor: 'All'};

	//import Native.Json //

	var _elm_lang$virtual_dom$Native_VirtualDom = function() {

	var STYLE_KEY = 'STYLE';
	var EVENT_KEY = 'EVENT';
	var ATTR_KEY = 'ATTR';
	var ATTR_NS_KEY = 'ATTR_NS';



	////////////  VIRTUAL DOM NODES  ////////////


	function text(string)
	{
		return {
			type: 'text',
			text: string
		};
	}


	function node(tag)
	{
		return F2(function(factList, kidList) {
			return nodeHelp(tag, factList, kidList);
		});
	}


	function nodeHelp(tag, factList, kidList)
	{
		var organized = organizeFacts(factList);
		var namespace = organized.namespace;
		var facts = organized.facts;

		var children = [];
		var descendantsCount = 0;
		while (kidList.ctor !== '[]')
		{
			var kid = kidList._0;
			descendantsCount += (kid.descendantsCount || 0);
			children.push(kid);
			kidList = kidList._1;
		}
		descendantsCount += children.length;

		return {
			type: 'node',
			tag: tag,
			facts: facts,
			children: children,
			namespace: namespace,
			descendantsCount: descendantsCount
		};
	}


	function custom(factList, model, impl)
	{
		var facts = organizeFacts(factList).facts;

		return {
			type: 'custom',
			facts: facts,
			model: model,
			impl: impl
		};
	}


	function map(tagger, node)
	{
		return {
			type: 'tagger',
			tagger: tagger,
			node: node,
			descendantsCount: 1 + (node.descendantsCount || 0)
		};
	}


	function thunk(func, args, thunk)
	{
		return {
			type: 'thunk',
			func: func,
			args: args,
			thunk: thunk,
			node: null
		};
	}

	function lazy(fn, a)
	{
		return thunk(fn, [a], function() {
			return fn(a);
		});
	}

	function lazy2(fn, a, b)
	{
		return thunk(fn, [a,b], function() {
			return A2(fn, a, b);
		});
	}

	function lazy3(fn, a, b, c)
	{
		return thunk(fn, [a,b,c], function() {
			return A3(fn, a, b, c);
		});
	}



	// FACTS


	function organizeFacts(factList)
	{
		var namespace, facts = {};

		while (factList.ctor !== '[]')
		{
			var entry = factList._0;
			var key = entry.key;

			if (key === ATTR_KEY || key === ATTR_NS_KEY || key === EVENT_KEY)
			{
				var subFacts = facts[key] || {};
				subFacts[entry.realKey] = entry.value;
				facts[key] = subFacts;
			}
			else if (key === STYLE_KEY)
			{
				var styles = facts[key] || {};
				var styleList = entry.value;
				while (styleList.ctor !== '[]')
				{
					var style = styleList._0;
					styles[style._0] = style._1;
					styleList = styleList._1;
				}
				facts[key] = styles;
			}
			else if (key === 'namespace')
			{
				namespace = entry.value;
			}
			else
			{
				facts[key] = entry.value;
			}
			factList = factList._1;
		}

		return {
			facts: facts,
			namespace: namespace
		};
	}



	////////////  PROPERTIES AND ATTRIBUTES  ////////////


	function style(value)
	{
		return {
			key: STYLE_KEY,
			value: value
		};
	}


	function property(key, value)
	{
		return {
			key: key,
			value: value
		};
	}


	function attribute(key, value)
	{
		return {
			key: ATTR_KEY,
			realKey: key,
			value: value
		};
	}


	function attributeNS(namespace, key, value)
	{
		return {
			key: ATTR_NS_KEY,
			realKey: key,
			value: {
				value: value,
				namespace: namespace
			}
		};
	}


	function on(name, options, decoder)
	{
		return {
			key: EVENT_KEY,
			realKey: name,
			value: {
				options: options,
				decoder: decoder
			}
		};
	}


	function equalEvents(a, b)
	{
		if (!a.options === b.options)
		{
			if (a.stopPropagation !== b.stopPropagation || a.preventDefault !== b.preventDefault)
			{
				return false;
			}
		}
		return _elm_lang$core$Native_Json.equality(a.decoder, b.decoder);
	}



	////////////  RENDERER  ////////////


	function renderer(parent, tagger, initialVirtualNode)
	{
		var eventNode = { tagger: tagger, parent: null };

		var domNode = render(initialVirtualNode, eventNode);
		parent.appendChild(domNode);

		var state = 'NO_REQUEST';
		var currentVirtualNode = initialVirtualNode;
		var nextVirtualNode = initialVirtualNode;

		function registerVirtualNode(vNode)
		{
			if (state === 'NO_REQUEST')
			{
				rAF(updateIfNeeded);
			}
			state = 'PENDING_REQUEST';
			nextVirtualNode = vNode;
		}

		function updateIfNeeded()
		{
			switch (state)
			{
				case 'NO_REQUEST':
					throw new Error(
						'Unexpected draw callback.\n' +
						'Please report this to <https://github.com/elm-lang/core/issues>.'
					);

				case 'PENDING_REQUEST':
					rAF(updateIfNeeded);
					state = 'EXTRA_REQUEST';

					var patches = diff(currentVirtualNode, nextVirtualNode);
					domNode = applyPatches(domNode, currentVirtualNode, patches, eventNode);
					currentVirtualNode = nextVirtualNode;

					return;

				case 'EXTRA_REQUEST':
					state = 'NO_REQUEST';
					return;
			}
		}

		return { update: registerVirtualNode };
	}


	var rAF =
		typeof requestAnimationFrame !== 'undefined'
			? requestAnimationFrame
			: function(cb) { setTimeout(cb, 1000 / 60); };



	////////////  RENDER  ////////////


	function render(vNode, eventNode)
	{
		switch (vNode.type)
		{
			case 'thunk':
				if (!vNode.node)
				{
					vNode.node = vNode.thunk();
				}
				return render(vNode.node, eventNode);

			case 'tagger':
				var subNode = vNode.node;
				var tagger = vNode.tagger;
			
				while (subNode.type === 'tagger')
				{
					typeof tagger !== 'object'
						? tagger = [tagger, subNode.tagger]
						: tagger.push(subNode.tagger);

					subNode = subNode.node;
				}
	            
				var subEventRoot = {
					tagger: tagger,
					parent: eventNode
				};
				
				var domNode = render(subNode, subEventRoot);
				domNode.elm_event_node_ref = subEventRoot;
				return domNode;

			case 'text':
				return document.createTextNode(vNode.text);

			case 'node':
				var domNode = vNode.namespace
					? document.createElementNS(vNode.namespace, vNode.tag)
					: document.createElement(vNode.tag);

				applyFacts(domNode, eventNode, vNode.facts);

				var children = vNode.children;

				for (var i = 0; i < children.length; i++)
				{
					domNode.appendChild(render(children[i], eventNode));
				}

				return domNode;

			case 'custom':
				var domNode = vNode.impl.render(vNode.model);
				applyFacts(domNode, eventNode, vNode.facts);
				return domNode;
		}
	}



	////////////  APPLY FACTS  ////////////


	function applyFacts(domNode, eventNode, facts)
	{
		for (var key in facts)
		{
			var value = facts[key];

			switch (key)
			{
				case STYLE_KEY:
					applyStyles(domNode, value);
					break;

				case EVENT_KEY:
					applyEvents(domNode, eventNode, value);
					break;

				case ATTR_KEY:
					applyAttrs(domNode, value);
					break;

				case ATTR_NS_KEY:
					applyAttrsNS(domNode, value);
					break;

				case 'value':
					if (domNode[key] !== value)
					{
						domNode[key] = value;
					}
					break;

				default:
					domNode[key] = value;
					break;
			}
		}
	}

	function applyStyles(domNode, styles)
	{
		var domNodeStyle = domNode.style;

		for (var key in styles)
		{
			domNodeStyle[key] = styles[key];
		}
	}

	function applyEvents(domNode, eventNode, events)
	{
		var allHandlers = domNode.elm_handlers || {};

		for (var key in events)
		{
			var handler = allHandlers[key];
			var value = events[key];

			if (typeof value === 'undefined')
			{
				domNode.removeEventListener(key, handler);
				allHandlers[key] = undefined;
			}
			else if (typeof handler === 'undefined')
			{
				var handler = makeEventHandler(eventNode, value);
				domNode.addEventListener(key, handler);
				allHandlers[key] = handler;
			}
			else
			{
				handler.info = value;
			}
		}

		domNode.elm_handlers = allHandlers;
	}

	function makeEventHandler(eventNode, info)
	{
		function eventHandler(event)
		{
			var info = eventHandler.info;

			var value = A2(_elm_lang$core$Native_Json.run, info.decoder, event);

			if (value.ctor === 'Ok')
			{
				var options = info.options;
				if (options.stopPropagation)
				{
					event.stopPropagation();
				}
				if (options.preventDefault)
				{
					event.preventDefault();
				}

				var message = value._0;

				var currentEventNode = eventNode;
				while (currentEventNode)
				{
					var tagger = currentEventNode.tagger;
					if (typeof tagger === 'function')
					{
						message = tagger(message);
					}
					else
					{
						for (var i = tagger.length; i--; )
						{
							message = tagger[i](message);
						}
					}
					currentEventNode = currentEventNode.parent;
				}
			}
		};

		eventHandler.info = info;

		return eventHandler;
	}

	function applyAttrs(domNode, attrs)
	{
		for (var key in attrs)
		{
			var value = attrs[key];
			if (typeof value === 'undefined')
			{
				domNode.removeAttribute(key);
			}
			else
			{
				domNode.setAttribute(key, value);
			}
		}
	}

	function applyAttrsNS(domNode, nsAttrs)
	{
		for (var key in nsAttrs)
		{
			var pair = nsAttrs[key];
			var namespace = pair.namespace;
			var value = pair.value;

			if (typeof value === 'undefined')
			{
				domNode.removeAttributeNS(namespace, key);
			}
			else
			{
				domNode.setAttributeNS(namespace, key, value);
			}
		}
	}



	////////////  DIFF  ////////////


	function diff(a, b)
	{
		var patches = [];
		diffHelp(a, b, patches, 0);
		return patches;
	}


	function makePatch(type, index, data)
	{
		return {
			index: index,
			type: type,
			data: data,
			domNode: null,
			eventNode: null
		};
	}


	function diffHelp(a, b, patches, index)
	{
		if (a === b)
		{
			return;
		}

		var aType = a.type;
		var bType = b.type;

		// Bail if you run into different types of nodes. Implies that the
		// structure has changed significantly and it's not worth a diff.
		if (aType !== bType)
		{
			patches.push(makePatch('p-redraw', index, b));
			return;
		}

		// Now we know that both nodes are the same type.
		switch (bType)
		{
			case 'thunk':
				var aArgs = a.args;
				var bArgs = b.args;
				var i = aArgs.length;
				var same = a.func === b.func && i === bArgs.length;
				while (same && i--)
				{
					same = aArgs[i] === bArgs[i];
				}
				if (same)
				{
					b.node = a.node;
					return;
				}
				b.node = b.thunk();
				var subPatches = [];
				diffHelp(a.node, b.node, subPatches, 0);
				if (subPatches.length > 0)
				{
					patches.push(makePatch('p-thunk', index, subPatches));
				}
				return;

			case 'tagger':
				// gather nested taggers
				var aTaggers = a.tagger;
				var bTaggers = b.tagger;
				var nesting = false;

				var aSubNode = a.node;
				while (aSubNode.type === 'tagger')
				{
					nesting = true;

					typeof aTaggers !== 'object'
						? aTaggers = [aTaggers, aSubNode.tagger]
						: aTaggers.push(aSubNode.tagger);

					aSubNode = aSubNode.node;
				}

				var bSubNode = b.node;
				while (bSubNode.type === 'tagger')
				{
					nesting = true;

					typeof bTaggers !== 'object'
						? bTaggers = [bTaggers, bSubNode.tagger]
						: bTaggers.push(bSubNode.tagger);

					bSubNode = bSubNode.node;
				}

				// Just bail if different numbers of taggers. This implies the
				// structure of the virtual DOM has changed.
				if (nesting && aTaggers.length !== bTaggers.length)
				{
					patches.push(makePatch('p-redraw', index, b));
					return;
				}

				// check if taggers are "the same"
				if (nesting ? !pairwiseRefEqual(aTaggers, bTaggers) : aTaggers !== bTaggers)
				{
					patches.push(makePatch('p-tagger', index, bTaggers));
				}

				// diff everything below the taggers
				diffHelp(aSubNode, bSubNode, patches, index + 1);
				return;

			case 'text':
				if (a.text !== b.text)
				{
					patches.push(makePatch('p-text', index, b.text));
					return;
				}

				return;

			case 'node':
				// Bail if obvious indicators have changed. Implies more serious
				// structural changes such that it's not worth it to diff.
				if (a.tag !== b.tag || a.namespace !== b.namespace)
				{
					patches.push(makePatch('p-redraw', index, b));
					return;
				}

				var factsDiff = diffFacts(a.facts, b.facts);

				if (typeof factsDiff !== 'undefined')
				{
					patches.push(makePatch('p-facts', index, factsDiff));
				}

				diffChildren(a, b, patches, index);
				return;

			case 'custom':
				if (a.impl !== b.impl)
				{
					patches.push(makePatch('p-redraw', index, b));
					return;
				}

				var factsDiff = diffFacts(a.facts, b.facts);
				if (typeof factsDiff !== 'undefined')
				{
					patches.push(makePatch('p-facts', index, factsDiff));
				}

				var patch = b.impl.diff(a,b);
				if (patch)
				{
					patches.push(makePatch('p-custom', index, patch));
					return;
				}

				return;
		}
	}


	// assumes the incoming arrays are the same length
	function pairwiseRefEqual(as, bs)
	{
		for (var i = 0; i < as.length; i++)
		{
			if (as[i] !== bs[i])
			{
				return false;
			}
		}

		return true;
	}


	// TODO Instead of creating a new diff object, it's possible to just test if
	// there *is* a diff. During the actual patch, do the diff again and make the
	// modifications directly. This way, there's no new allocations. Worth it?
	function diffFacts(a, b, category)
	{
		var diff;

		// look for changes and removals
		for (var aKey in a)
		{
			if (aKey === STYLE_KEY || aKey === EVENT_KEY || aKey === ATTR_KEY || aKey === ATTR_NS_KEY)
			{
				var subDiff = diffFacts(a[aKey], b[aKey] || {}, aKey);
				if (subDiff)
				{
					diff = diff || {};
					diff[aKey] = subDiff;
				}
				continue;
			}

			// remove if not in the new facts
			if (!(aKey in b))
			{
				diff = diff || {};
				diff[aKey] =
					(typeof category === 'undefined')
						? (typeof a[aKey] === 'string' ? '' : null)
						:
					(category === STYLE_KEY)
						? ''
						:
					(category === EVENT_KEY || category === ATTR_KEY)
						? undefined
						:
					{ namespace: a[aKey].namespace, value: undefined };

				continue;
			}

			var aValue = a[aKey];
			var bValue = b[aKey];

			// reference equal, so don't worry about it
			if (aValue === bValue && aKey !== 'value'
				|| category === EVENT_KEY && equalEvents(aValue, bValue))
			{
				continue;
			}

			diff = diff || {};
			diff[aKey] = bValue;
		}

		// add new stuff
		for (var bKey in b)
		{
			if (!(bKey in a))
			{
				diff = diff || {};
				diff[bKey] = b[bKey];
			}
		}

		return diff;
	}


	function diffChildren(aParent, bParent, patches, rootIndex)
	{
		var aChildren = aParent.children;
		var bChildren = bParent.children;

		var aLen = aChildren.length;
		var bLen = bChildren.length;

		// FIGURE OUT IF THERE ARE INSERTS OR REMOVALS

		if (aLen > bLen)
		{
			patches.push(makePatch('p-remove', rootIndex, aLen - bLen));
		}
		else if (aLen < bLen)
		{
			patches.push(makePatch('p-insert', rootIndex, bChildren.slice(aLen)));
		}

		// PAIRWISE DIFF EVERYTHING ELSE

		var index = rootIndex;
		var minLen = aLen < bLen ? aLen : bLen;
		for (var i = 0; i < minLen; i++)
		{
			index++;
			var aChild = aChildren[i];
			diffHelp(aChild, bChildren[i], patches, index);
			index += aChild.descendantsCount || 0;
		}
	}



	////////////  ADD DOM NODES  ////////////
	//
	// Each DOM node has an "index" assigned in order of traversal. It is important
	// to minimize our crawl over the actual DOM, so these indexes (along with the
	// descendantsCount of virtual nodes) let us skip touching entire subtrees of
	// the DOM if we know there are no patches there.


	function addDomNodes(domNode, vNode, patches, eventNode)
	{
		addDomNodesHelp(domNode, vNode, patches, 0, 0, vNode.descendantsCount, eventNode);
	}


	// assumes `patches` is non-empty and indexes increase monotonically.
	function addDomNodesHelp(domNode, vNode, patches, i, low, high, eventNode)
	{
		var patch = patches[i];
		var index = patch.index;

		while (index === low)
		{
			var patchType = patch.type;

			if (patchType === 'p-thunk')
			{
				addDomNodes(domNode, vNode.node, patch.data, eventNode);
			}
			else
			{
				patch.domNode = domNode;
				patch.eventNode = eventNode;
			}

			i++;

			if (!(patch = patches[i]) || (index = patch.index) > high)
			{
				return i;
			}
		}

		switch (vNode.type)
		{
			case 'tagger':
				var subNode = vNode.node;
	            
				while (subNode.type === "tagger")
				{
					subNode = subNode.node;
				}
	            
				return addDomNodesHelp(domNode, subNode, patches, i, low + 1, high, domNode.elm_event_node_ref);

			case 'node':
				var vChildren = vNode.children;
				var childNodes = domNode.childNodes;
				for (var j = 0; j < vChildren.length; j++)
				{
					low++;
					var vChild = vChildren[j];
					var nextLow = low + (vChild.descendantsCount || 0);
					if (low <= index && index <= nextLow)
					{
						i = addDomNodesHelp(childNodes[j], vChild, patches, i, low, nextLow, eventNode);
						if (!(patch = patches[i]) || (index = patch.index) > high)
						{
							return i;
						}
					}
					low = nextLow;
				}
				return i;

			case 'text':
			case 'thunk':
				throw new Error('should never traverse `text` or `thunk` nodes like this');
		}
	}



	////////////  APPLY PATCHES  ////////////


	function applyPatches(rootDomNode, oldVirtualNode, patches, eventNode)
	{
		if (patches.length === 0)
		{
			return rootDomNode;
		}

		addDomNodes(rootDomNode, oldVirtualNode, patches, eventNode);
		return applyPatchesHelp(rootDomNode, patches);
	}

	function applyPatchesHelp(rootDomNode, patches)
	{
		for (var i = 0; i < patches.length; i++)
		{
			var patch = patches[i];
			var localDomNode = patch.domNode
			var newNode = applyPatch(localDomNode, patch);
			if (localDomNode === rootDomNode)
			{
				rootDomNode = newNode;
			}
		}
		return rootDomNode;
	}

	function applyPatch(domNode, patch)
	{
		switch (patch.type)
		{
			case 'p-redraw':
				return redraw(domNode, patch.data, patch.eventNode);

			case 'p-facts':
				applyFacts(domNode, patch.eventNode, patch.data);
				return domNode;

			case 'p-text':
				domNode.replaceData(0, domNode.length, patch.data);
				return domNode;

			case 'p-thunk':
				return applyPatchesHelp(domNode, patch.data);

			case 'p-tagger':
				domNode.elm_event_node_ref.tagger = patch.data;
				return domNode;

			case 'p-remove':
				var i = patch.data;
				while (i--)
				{
					domNode.removeChild(domNode.lastChild);
				}
				return domNode;

			case 'p-insert':
				var newNodes = patch.data;
				for (var i = 0; i < newNodes.length; i++)
				{
					domNode.appendChild(render(newNodes[i], patch.eventNode));
				}
				return domNode;

			case 'p-custom':
				var impl = patch.data;
				return impl.applyPatch(domNode, impl.data);

			default:
				throw new Error('Ran into an unknown patch!');
		}
	}


	function redraw(domNode, vNode, eventNode)
	{
		var parentNode = domNode.parentNode;
		var newNode = render(vNode, eventNode);

		if (typeof newNode.elm_event_node_ref === 'undefined')
		{
			newNode.elm_event_node_ref = domNode.elm_event_node_ref;
		}

		if (parentNode && newNode !== domNode)
		{
			parentNode.replaceChild(newNode, domNode);
		}
		return newNode;
	}



	////////////  PROGRAMS  ////////////


	function programWithFlags(details)
	{
		return {
			init: details.init,
			update: details.update,
			subscriptions: details.subscriptions,
			view: details.view,
			renderer: renderer
		};
	}


	return {
		node: node,
		text: text,

		custom: custom,

		map: F2(map),

		on: F3(on),
		style: style,
		property: F2(property),
		attribute: F2(attribute),
		attributeNS: F3(attributeNS),

		lazy: F2(lazy),
		lazy2: F3(lazy2),
		lazy3: F4(lazy3),

		programWithFlags: programWithFlags
	};

	}();
	var _elm_lang$virtual_dom$VirtualDom$programWithFlags = _elm_lang$virtual_dom$Native_VirtualDom.programWithFlags;
	var _elm_lang$virtual_dom$VirtualDom$lazy3 = _elm_lang$virtual_dom$Native_VirtualDom.lazy3;
	var _elm_lang$virtual_dom$VirtualDom$lazy2 = _elm_lang$virtual_dom$Native_VirtualDom.lazy2;
	var _elm_lang$virtual_dom$VirtualDom$lazy = _elm_lang$virtual_dom$Native_VirtualDom.lazy;
	var _elm_lang$virtual_dom$VirtualDom$defaultOptions = {stopPropagation: false, preventDefault: false};
	var _elm_lang$virtual_dom$VirtualDom$onWithOptions = _elm_lang$virtual_dom$Native_VirtualDom.on;
	var _elm_lang$virtual_dom$VirtualDom$on = F2(
		function (eventName, decoder) {
			return A3(_elm_lang$virtual_dom$VirtualDom$onWithOptions, eventName, _elm_lang$virtual_dom$VirtualDom$defaultOptions, decoder);
		});
	var _elm_lang$virtual_dom$VirtualDom$style = _elm_lang$virtual_dom$Native_VirtualDom.style;
	var _elm_lang$virtual_dom$VirtualDom$attributeNS = _elm_lang$virtual_dom$Native_VirtualDom.attributeNS;
	var _elm_lang$virtual_dom$VirtualDom$attribute = _elm_lang$virtual_dom$Native_VirtualDom.attribute;
	var _elm_lang$virtual_dom$VirtualDom$property = _elm_lang$virtual_dom$Native_VirtualDom.property;
	var _elm_lang$virtual_dom$VirtualDom$map = _elm_lang$virtual_dom$Native_VirtualDom.map;
	var _elm_lang$virtual_dom$VirtualDom$text = _elm_lang$virtual_dom$Native_VirtualDom.text;
	var _elm_lang$virtual_dom$VirtualDom$node = _elm_lang$virtual_dom$Native_VirtualDom.node;
	var _elm_lang$virtual_dom$VirtualDom$Options = F2(
		function (a, b) {
			return {stopPropagation: a, preventDefault: b};
		});
	var _elm_lang$virtual_dom$VirtualDom$Node = {ctor: 'Node'};
	var _elm_lang$virtual_dom$VirtualDom$Property = {ctor: 'Property'};

	var _elm_lang$html$Html$text = _elm_lang$virtual_dom$VirtualDom$text;
	var _elm_lang$html$Html$node = _elm_lang$virtual_dom$VirtualDom$node;
	var _elm_lang$html$Html$body = _elm_lang$html$Html$node('body');
	var _elm_lang$html$Html$section = _elm_lang$html$Html$node('section');
	var _elm_lang$html$Html$nav = _elm_lang$html$Html$node('nav');
	var _elm_lang$html$Html$article = _elm_lang$html$Html$node('article');
	var _elm_lang$html$Html$aside = _elm_lang$html$Html$node('aside');
	var _elm_lang$html$Html$h1 = _elm_lang$html$Html$node('h1');
	var _elm_lang$html$Html$h2 = _elm_lang$html$Html$node('h2');
	var _elm_lang$html$Html$h3 = _elm_lang$html$Html$node('h3');
	var _elm_lang$html$Html$h4 = _elm_lang$html$Html$node('h4');
	var _elm_lang$html$Html$h5 = _elm_lang$html$Html$node('h5');
	var _elm_lang$html$Html$h6 = _elm_lang$html$Html$node('h6');
	var _elm_lang$html$Html$header = _elm_lang$html$Html$node('header');
	var _elm_lang$html$Html$footer = _elm_lang$html$Html$node('footer');
	var _elm_lang$html$Html$address = _elm_lang$html$Html$node('address');
	var _elm_lang$html$Html$main$ = _elm_lang$html$Html$node('main');
	var _elm_lang$html$Html$p = _elm_lang$html$Html$node('p');
	var _elm_lang$html$Html$hr = _elm_lang$html$Html$node('hr');
	var _elm_lang$html$Html$pre = _elm_lang$html$Html$node('pre');
	var _elm_lang$html$Html$blockquote = _elm_lang$html$Html$node('blockquote');
	var _elm_lang$html$Html$ol = _elm_lang$html$Html$node('ol');
	var _elm_lang$html$Html$ul = _elm_lang$html$Html$node('ul');
	var _elm_lang$html$Html$li = _elm_lang$html$Html$node('li');
	var _elm_lang$html$Html$dl = _elm_lang$html$Html$node('dl');
	var _elm_lang$html$Html$dt = _elm_lang$html$Html$node('dt');
	var _elm_lang$html$Html$dd = _elm_lang$html$Html$node('dd');
	var _elm_lang$html$Html$figure = _elm_lang$html$Html$node('figure');
	var _elm_lang$html$Html$figcaption = _elm_lang$html$Html$node('figcaption');
	var _elm_lang$html$Html$div = _elm_lang$html$Html$node('div');
	var _elm_lang$html$Html$a = _elm_lang$html$Html$node('a');
	var _elm_lang$html$Html$em = _elm_lang$html$Html$node('em');
	var _elm_lang$html$Html$strong = _elm_lang$html$Html$node('strong');
	var _elm_lang$html$Html$small = _elm_lang$html$Html$node('small');
	var _elm_lang$html$Html$s = _elm_lang$html$Html$node('s');
	var _elm_lang$html$Html$cite = _elm_lang$html$Html$node('cite');
	var _elm_lang$html$Html$q = _elm_lang$html$Html$node('q');
	var _elm_lang$html$Html$dfn = _elm_lang$html$Html$node('dfn');
	var _elm_lang$html$Html$abbr = _elm_lang$html$Html$node('abbr');
	var _elm_lang$html$Html$time = _elm_lang$html$Html$node('time');
	var _elm_lang$html$Html$code = _elm_lang$html$Html$node('code');
	var _elm_lang$html$Html$var = _elm_lang$html$Html$node('var');
	var _elm_lang$html$Html$samp = _elm_lang$html$Html$node('samp');
	var _elm_lang$html$Html$kbd = _elm_lang$html$Html$node('kbd');
	var _elm_lang$html$Html$sub = _elm_lang$html$Html$node('sub');
	var _elm_lang$html$Html$sup = _elm_lang$html$Html$node('sup');
	var _elm_lang$html$Html$i = _elm_lang$html$Html$node('i');
	var _elm_lang$html$Html$b = _elm_lang$html$Html$node('b');
	var _elm_lang$html$Html$u = _elm_lang$html$Html$node('u');
	var _elm_lang$html$Html$mark = _elm_lang$html$Html$node('mark');
	var _elm_lang$html$Html$ruby = _elm_lang$html$Html$node('ruby');
	var _elm_lang$html$Html$rt = _elm_lang$html$Html$node('rt');
	var _elm_lang$html$Html$rp = _elm_lang$html$Html$node('rp');
	var _elm_lang$html$Html$bdi = _elm_lang$html$Html$node('bdi');
	var _elm_lang$html$Html$bdo = _elm_lang$html$Html$node('bdo');
	var _elm_lang$html$Html$span = _elm_lang$html$Html$node('span');
	var _elm_lang$html$Html$br = _elm_lang$html$Html$node('br');
	var _elm_lang$html$Html$wbr = _elm_lang$html$Html$node('wbr');
	var _elm_lang$html$Html$ins = _elm_lang$html$Html$node('ins');
	var _elm_lang$html$Html$del = _elm_lang$html$Html$node('del');
	var _elm_lang$html$Html$img = _elm_lang$html$Html$node('img');
	var _elm_lang$html$Html$iframe = _elm_lang$html$Html$node('iframe');
	var _elm_lang$html$Html$embed = _elm_lang$html$Html$node('embed');
	var _elm_lang$html$Html$object = _elm_lang$html$Html$node('object');
	var _elm_lang$html$Html$param = _elm_lang$html$Html$node('param');
	var _elm_lang$html$Html$video = _elm_lang$html$Html$node('video');
	var _elm_lang$html$Html$audio = _elm_lang$html$Html$node('audio');
	var _elm_lang$html$Html$source = _elm_lang$html$Html$node('source');
	var _elm_lang$html$Html$track = _elm_lang$html$Html$node('track');
	var _elm_lang$html$Html$canvas = _elm_lang$html$Html$node('canvas');
	var _elm_lang$html$Html$svg = _elm_lang$html$Html$node('svg');
	var _elm_lang$html$Html$math = _elm_lang$html$Html$node('math');
	var _elm_lang$html$Html$table = _elm_lang$html$Html$node('table');
	var _elm_lang$html$Html$caption = _elm_lang$html$Html$node('caption');
	var _elm_lang$html$Html$colgroup = _elm_lang$html$Html$node('colgroup');
	var _elm_lang$html$Html$col = _elm_lang$html$Html$node('col');
	var _elm_lang$html$Html$tbody = _elm_lang$html$Html$node('tbody');
	var _elm_lang$html$Html$thead = _elm_lang$html$Html$node('thead');
	var _elm_lang$html$Html$tfoot = _elm_lang$html$Html$node('tfoot');
	var _elm_lang$html$Html$tr = _elm_lang$html$Html$node('tr');
	var _elm_lang$html$Html$td = _elm_lang$html$Html$node('td');
	var _elm_lang$html$Html$th = _elm_lang$html$Html$node('th');
	var _elm_lang$html$Html$form = _elm_lang$html$Html$node('form');
	var _elm_lang$html$Html$fieldset = _elm_lang$html$Html$node('fieldset');
	var _elm_lang$html$Html$legend = _elm_lang$html$Html$node('legend');
	var _elm_lang$html$Html$label = _elm_lang$html$Html$node('label');
	var _elm_lang$html$Html$input = _elm_lang$html$Html$node('input');
	var _elm_lang$html$Html$button = _elm_lang$html$Html$node('button');
	var _elm_lang$html$Html$select = _elm_lang$html$Html$node('select');
	var _elm_lang$html$Html$datalist = _elm_lang$html$Html$node('datalist');
	var _elm_lang$html$Html$optgroup = _elm_lang$html$Html$node('optgroup');
	var _elm_lang$html$Html$option = _elm_lang$html$Html$node('option');
	var _elm_lang$html$Html$textarea = _elm_lang$html$Html$node('textarea');
	var _elm_lang$html$Html$keygen = _elm_lang$html$Html$node('keygen');
	var _elm_lang$html$Html$output = _elm_lang$html$Html$node('output');
	var _elm_lang$html$Html$progress = _elm_lang$html$Html$node('progress');
	var _elm_lang$html$Html$meter = _elm_lang$html$Html$node('meter');
	var _elm_lang$html$Html$details = _elm_lang$html$Html$node('details');
	var _elm_lang$html$Html$summary = _elm_lang$html$Html$node('summary');
	var _elm_lang$html$Html$menuitem = _elm_lang$html$Html$node('menuitem');
	var _elm_lang$html$Html$menu = _elm_lang$html$Html$node('menu');

	var _elm_lang$html$Html_App$programWithFlags = _elm_lang$virtual_dom$VirtualDom$programWithFlags;
	var _elm_lang$html$Html_App$program = function (app) {
		return _elm_lang$html$Html_App$programWithFlags(
			_elm_lang$core$Native_Utils.update(
				app,
				{
					init: function (_p0) {
						return app.init;
					}
				}));
	};
	var _elm_lang$html$Html_App$beginnerProgram = function (_p1) {
		var _p2 = _p1;
		return _elm_lang$html$Html_App$programWithFlags(
			{
				init: function (_p3) {
					return A2(
						_elm_lang$core$Platform_Cmd_ops['!'],
						_p2.model,
						_elm_lang$core$Native_List.fromArray(
							[]));
				},
				update: F2(
					function (msg, model) {
						return A2(
							_elm_lang$core$Platform_Cmd_ops['!'],
							A2(_p2.update, msg, model),
							_elm_lang$core$Native_List.fromArray(
								[]));
					}),
				view: _p2.view,
				subscriptions: function (_p4) {
					return _elm_lang$core$Platform_Sub$none;
				}
			});
	};
	var _elm_lang$html$Html_App$map = _elm_lang$virtual_dom$VirtualDom$map;

	var _elm_lang$html$Html_Attributes$attribute = _elm_lang$virtual_dom$VirtualDom$attribute;
	var _elm_lang$html$Html_Attributes$contextmenu = function (value) {
		return A2(_elm_lang$html$Html_Attributes$attribute, 'contextmenu', value);
	};
	var _elm_lang$html$Html_Attributes$property = _elm_lang$virtual_dom$VirtualDom$property;
	var _elm_lang$html$Html_Attributes$stringProperty = F2(
		function (name, string) {
			return A2(
				_elm_lang$html$Html_Attributes$property,
				name,
				_elm_lang$core$Json_Encode$string(string));
		});
	var _elm_lang$html$Html_Attributes$class = function (name) {
		return A2(_elm_lang$html$Html_Attributes$stringProperty, 'className', name);
	};
	var _elm_lang$html$Html_Attributes$id = function (name) {
		return A2(_elm_lang$html$Html_Attributes$stringProperty, 'id', name);
	};
	var _elm_lang$html$Html_Attributes$title = function (name) {
		return A2(_elm_lang$html$Html_Attributes$stringProperty, 'title', name);
	};
	var _elm_lang$html$Html_Attributes$accesskey = function ($char) {
		return A2(
			_elm_lang$html$Html_Attributes$stringProperty,
			'accessKey',
			_elm_lang$core$String$fromChar($char));
	};
	var _elm_lang$html$Html_Attributes$dir = function (value) {
		return A2(_elm_lang$html$Html_Attributes$stringProperty, 'dir', value);
	};
	var _elm_lang$html$Html_Attributes$draggable = function (value) {
		return A2(_elm_lang$html$Html_Attributes$stringProperty, 'draggable', value);
	};
	var _elm_lang$html$Html_Attributes$dropzone = function (value) {
		return A2(_elm_lang$html$Html_Attributes$stringProperty, 'dropzone', value);
	};
	var _elm_lang$html$Html_Attributes$itemprop = function (value) {
		return A2(_elm_lang$html$Html_Attributes$stringProperty, 'itemprop', value);
	};
	var _elm_lang$html$Html_Attributes$lang = function (value) {
		return A2(_elm_lang$html$Html_Attributes$stringProperty, 'lang', value);
	};
	var _elm_lang$html$Html_Attributes$tabindex = function (n) {
		return A2(
			_elm_lang$html$Html_Attributes$stringProperty,
			'tabIndex',
			_elm_lang$core$Basics$toString(n));
	};
	var _elm_lang$html$Html_Attributes$charset = function (value) {
		return A2(_elm_lang$html$Html_Attributes$stringProperty, 'charset', value);
	};
	var _elm_lang$html$Html_Attributes$content = function (value) {
		return A2(_elm_lang$html$Html_Attributes$stringProperty, 'content', value);
	};
	var _elm_lang$html$Html_Attributes$httpEquiv = function (value) {
		return A2(_elm_lang$html$Html_Attributes$stringProperty, 'httpEquiv', value);
	};
	var _elm_lang$html$Html_Attributes$language = function (value) {
		return A2(_elm_lang$html$Html_Attributes$stringProperty, 'language', value);
	};
	var _elm_lang$html$Html_Attributes$src = function (value) {
		return A2(_elm_lang$html$Html_Attributes$stringProperty, 'src', value);
	};
	var _elm_lang$html$Html_Attributes$height = function (value) {
		return A2(
			_elm_lang$html$Html_Attributes$stringProperty,
			'height',
			_elm_lang$core$Basics$toString(value));
	};
	var _elm_lang$html$Html_Attributes$width = function (value) {
		return A2(
			_elm_lang$html$Html_Attributes$stringProperty,
			'width',
			_elm_lang$core$Basics$toString(value));
	};
	var _elm_lang$html$Html_Attributes$alt = function (value) {
		return A2(_elm_lang$html$Html_Attributes$stringProperty, 'alt', value);
	};
	var _elm_lang$html$Html_Attributes$preload = function (value) {
		return A2(_elm_lang$html$Html_Attributes$stringProperty, 'preload', value);
	};
	var _elm_lang$html$Html_Attributes$poster = function (value) {
		return A2(_elm_lang$html$Html_Attributes$stringProperty, 'poster', value);
	};
	var _elm_lang$html$Html_Attributes$kind = function (value) {
		return A2(_elm_lang$html$Html_Attributes$stringProperty, 'kind', value);
	};
	var _elm_lang$html$Html_Attributes$srclang = function (value) {
		return A2(_elm_lang$html$Html_Attributes$stringProperty, 'srclang', value);
	};
	var _elm_lang$html$Html_Attributes$sandbox = function (value) {
		return A2(_elm_lang$html$Html_Attributes$stringProperty, 'sandbox', value);
	};
	var _elm_lang$html$Html_Attributes$srcdoc = function (value) {
		return A2(_elm_lang$html$Html_Attributes$stringProperty, 'srcdoc', value);
	};
	var _elm_lang$html$Html_Attributes$type$ = function (value) {
		return A2(_elm_lang$html$Html_Attributes$stringProperty, 'type', value);
	};
	var _elm_lang$html$Html_Attributes$value = function (value) {
		return A2(_elm_lang$html$Html_Attributes$stringProperty, 'value', value);
	};
	var _elm_lang$html$Html_Attributes$defaultValue = function (value) {
		return A2(_elm_lang$html$Html_Attributes$stringProperty, 'defaultValue', value);
	};
	var _elm_lang$html$Html_Attributes$placeholder = function (value) {
		return A2(_elm_lang$html$Html_Attributes$stringProperty, 'placeholder', value);
	};
	var _elm_lang$html$Html_Attributes$accept = function (value) {
		return A2(_elm_lang$html$Html_Attributes$stringProperty, 'accept', value);
	};
	var _elm_lang$html$Html_Attributes$acceptCharset = function (value) {
		return A2(_elm_lang$html$Html_Attributes$stringProperty, 'acceptCharset', value);
	};
	var _elm_lang$html$Html_Attributes$action = function (value) {
		return A2(_elm_lang$html$Html_Attributes$stringProperty, 'action', value);
	};
	var _elm_lang$html$Html_Attributes$autocomplete = function (bool) {
		return A2(
			_elm_lang$html$Html_Attributes$stringProperty,
			'autocomplete',
			bool ? 'on' : 'off');
	};
	var _elm_lang$html$Html_Attributes$autosave = function (value) {
		return A2(_elm_lang$html$Html_Attributes$stringProperty, 'autosave', value);
	};
	var _elm_lang$html$Html_Attributes$enctype = function (value) {
		return A2(_elm_lang$html$Html_Attributes$stringProperty, 'enctype', value);
	};
	var _elm_lang$html$Html_Attributes$formaction = function (value) {
		return A2(_elm_lang$html$Html_Attributes$stringProperty, 'formAction', value);
	};
	var _elm_lang$html$Html_Attributes$list = function (value) {
		return A2(_elm_lang$html$Html_Attributes$stringProperty, 'list', value);
	};
	var _elm_lang$html$Html_Attributes$minlength = function (n) {
		return A2(
			_elm_lang$html$Html_Attributes$stringProperty,
			'minLength',
			_elm_lang$core$Basics$toString(n));
	};
	var _elm_lang$html$Html_Attributes$maxlength = function (n) {
		return A2(
			_elm_lang$html$Html_Attributes$stringProperty,
			'maxLength',
			_elm_lang$core$Basics$toString(n));
	};
	var _elm_lang$html$Html_Attributes$method = function (value) {
		return A2(_elm_lang$html$Html_Attributes$stringProperty, 'method', value);
	};
	var _elm_lang$html$Html_Attributes$name = function (value) {
		return A2(_elm_lang$html$Html_Attributes$stringProperty, 'name', value);
	};
	var _elm_lang$html$Html_Attributes$pattern = function (value) {
		return A2(_elm_lang$html$Html_Attributes$stringProperty, 'pattern', value);
	};
	var _elm_lang$html$Html_Attributes$size = function (n) {
		return A2(
			_elm_lang$html$Html_Attributes$stringProperty,
			'size',
			_elm_lang$core$Basics$toString(n));
	};
	var _elm_lang$html$Html_Attributes$for = function (value) {
		return A2(_elm_lang$html$Html_Attributes$stringProperty, 'htmlFor', value);
	};
	var _elm_lang$html$Html_Attributes$form = function (value) {
		return A2(_elm_lang$html$Html_Attributes$stringProperty, 'form', value);
	};
	var _elm_lang$html$Html_Attributes$max = function (value) {
		return A2(_elm_lang$html$Html_Attributes$stringProperty, 'max', value);
	};
	var _elm_lang$html$Html_Attributes$min = function (value) {
		return A2(_elm_lang$html$Html_Attributes$stringProperty, 'min', value);
	};
	var _elm_lang$html$Html_Attributes$step = function (n) {
		return A2(_elm_lang$html$Html_Attributes$stringProperty, 'step', n);
	};
	var _elm_lang$html$Html_Attributes$cols = function (n) {
		return A2(
			_elm_lang$html$Html_Attributes$stringProperty,
			'cols',
			_elm_lang$core$Basics$toString(n));
	};
	var _elm_lang$html$Html_Attributes$rows = function (n) {
		return A2(
			_elm_lang$html$Html_Attributes$stringProperty,
			'rows',
			_elm_lang$core$Basics$toString(n));
	};
	var _elm_lang$html$Html_Attributes$wrap = function (value) {
		return A2(_elm_lang$html$Html_Attributes$stringProperty, 'wrap', value);
	};
	var _elm_lang$html$Html_Attributes$usemap = function (value) {
		return A2(_elm_lang$html$Html_Attributes$stringProperty, 'useMap', value);
	};
	var _elm_lang$html$Html_Attributes$shape = function (value) {
		return A2(_elm_lang$html$Html_Attributes$stringProperty, 'shape', value);
	};
	var _elm_lang$html$Html_Attributes$coords = function (value) {
		return A2(_elm_lang$html$Html_Attributes$stringProperty, 'coords', value);
	};
	var _elm_lang$html$Html_Attributes$challenge = function (value) {
		return A2(_elm_lang$html$Html_Attributes$stringProperty, 'challenge', value);
	};
	var _elm_lang$html$Html_Attributes$keytype = function (value) {
		return A2(_elm_lang$html$Html_Attributes$stringProperty, 'keytype', value);
	};
	var _elm_lang$html$Html_Attributes$align = function (value) {
		return A2(_elm_lang$html$Html_Attributes$stringProperty, 'align', value);
	};
	var _elm_lang$html$Html_Attributes$cite = function (value) {
		return A2(_elm_lang$html$Html_Attributes$stringProperty, 'cite', value);
	};
	var _elm_lang$html$Html_Attributes$href = function (value) {
		return A2(_elm_lang$html$Html_Attributes$stringProperty, 'href', value);
	};
	var _elm_lang$html$Html_Attributes$target = function (value) {
		return A2(_elm_lang$html$Html_Attributes$stringProperty, 'target', value);
	};
	var _elm_lang$html$Html_Attributes$downloadAs = function (value) {
		return A2(_elm_lang$html$Html_Attributes$stringProperty, 'download', value);
	};
	var _elm_lang$html$Html_Attributes$hreflang = function (value) {
		return A2(_elm_lang$html$Html_Attributes$stringProperty, 'hreflang', value);
	};
	var _elm_lang$html$Html_Attributes$media = function (value) {
		return A2(_elm_lang$html$Html_Attributes$stringProperty, 'media', value);
	};
	var _elm_lang$html$Html_Attributes$ping = function (value) {
		return A2(_elm_lang$html$Html_Attributes$stringProperty, 'ping', value);
	};
	var _elm_lang$html$Html_Attributes$rel = function (value) {
		return A2(_elm_lang$html$Html_Attributes$stringProperty, 'rel', value);
	};
	var _elm_lang$html$Html_Attributes$datetime = function (value) {
		return A2(_elm_lang$html$Html_Attributes$stringProperty, 'datetime', value);
	};
	var _elm_lang$html$Html_Attributes$pubdate = function (value) {
		return A2(_elm_lang$html$Html_Attributes$stringProperty, 'pubdate', value);
	};
	var _elm_lang$html$Html_Attributes$start = function (n) {
		return A2(
			_elm_lang$html$Html_Attributes$stringProperty,
			'start',
			_elm_lang$core$Basics$toString(n));
	};
	var _elm_lang$html$Html_Attributes$colspan = function (n) {
		return A2(
			_elm_lang$html$Html_Attributes$stringProperty,
			'colSpan',
			_elm_lang$core$Basics$toString(n));
	};
	var _elm_lang$html$Html_Attributes$headers = function (value) {
		return A2(_elm_lang$html$Html_Attributes$stringProperty, 'headers', value);
	};
	var _elm_lang$html$Html_Attributes$rowspan = function (n) {
		return A2(
			_elm_lang$html$Html_Attributes$stringProperty,
			'rowSpan',
			_elm_lang$core$Basics$toString(n));
	};
	var _elm_lang$html$Html_Attributes$scope = function (value) {
		return A2(_elm_lang$html$Html_Attributes$stringProperty, 'scope', value);
	};
	var _elm_lang$html$Html_Attributes$manifest = function (value) {
		return A2(_elm_lang$html$Html_Attributes$stringProperty, 'manifest', value);
	};
	var _elm_lang$html$Html_Attributes$boolProperty = F2(
		function (name, bool) {
			return A2(
				_elm_lang$html$Html_Attributes$property,
				name,
				_elm_lang$core$Json_Encode$bool(bool));
		});
	var _elm_lang$html$Html_Attributes$hidden = function (bool) {
		return A2(_elm_lang$html$Html_Attributes$boolProperty, 'hidden', bool);
	};
	var _elm_lang$html$Html_Attributes$contenteditable = function (bool) {
		return A2(_elm_lang$html$Html_Attributes$boolProperty, 'contentEditable', bool);
	};
	var _elm_lang$html$Html_Attributes$spellcheck = function (bool) {
		return A2(_elm_lang$html$Html_Attributes$boolProperty, 'spellcheck', bool);
	};
	var _elm_lang$html$Html_Attributes$async = function (bool) {
		return A2(_elm_lang$html$Html_Attributes$boolProperty, 'async', bool);
	};
	var _elm_lang$html$Html_Attributes$defer = function (bool) {
		return A2(_elm_lang$html$Html_Attributes$boolProperty, 'defer', bool);
	};
	var _elm_lang$html$Html_Attributes$scoped = function (bool) {
		return A2(_elm_lang$html$Html_Attributes$boolProperty, 'scoped', bool);
	};
	var _elm_lang$html$Html_Attributes$autoplay = function (bool) {
		return A2(_elm_lang$html$Html_Attributes$boolProperty, 'autoplay', bool);
	};
	var _elm_lang$html$Html_Attributes$controls = function (bool) {
		return A2(_elm_lang$html$Html_Attributes$boolProperty, 'controls', bool);
	};
	var _elm_lang$html$Html_Attributes$loop = function (bool) {
		return A2(_elm_lang$html$Html_Attributes$boolProperty, 'loop', bool);
	};
	var _elm_lang$html$Html_Attributes$default = function (bool) {
		return A2(_elm_lang$html$Html_Attributes$boolProperty, 'default', bool);
	};
	var _elm_lang$html$Html_Attributes$seamless = function (bool) {
		return A2(_elm_lang$html$Html_Attributes$boolProperty, 'seamless', bool);
	};
	var _elm_lang$html$Html_Attributes$checked = function (bool) {
		return A2(_elm_lang$html$Html_Attributes$boolProperty, 'checked', bool);
	};
	var _elm_lang$html$Html_Attributes$selected = function (bool) {
		return A2(_elm_lang$html$Html_Attributes$boolProperty, 'selected', bool);
	};
	var _elm_lang$html$Html_Attributes$autofocus = function (bool) {
		return A2(_elm_lang$html$Html_Attributes$boolProperty, 'autofocus', bool);
	};
	var _elm_lang$html$Html_Attributes$disabled = function (bool) {
		return A2(_elm_lang$html$Html_Attributes$boolProperty, 'disabled', bool);
	};
	var _elm_lang$html$Html_Attributes$multiple = function (bool) {
		return A2(_elm_lang$html$Html_Attributes$boolProperty, 'multiple', bool);
	};
	var _elm_lang$html$Html_Attributes$novalidate = function (bool) {
		return A2(_elm_lang$html$Html_Attributes$boolProperty, 'noValidate', bool);
	};
	var _elm_lang$html$Html_Attributes$readonly = function (bool) {
		return A2(_elm_lang$html$Html_Attributes$boolProperty, 'readOnly', bool);
	};
	var _elm_lang$html$Html_Attributes$required = function (bool) {
		return A2(_elm_lang$html$Html_Attributes$boolProperty, 'required', bool);
	};
	var _elm_lang$html$Html_Attributes$ismap = function (value) {
		return A2(_elm_lang$html$Html_Attributes$boolProperty, 'isMap', value);
	};
	var _elm_lang$html$Html_Attributes$download = function (bool) {
		return A2(_elm_lang$html$Html_Attributes$boolProperty, 'download', bool);
	};
	var _elm_lang$html$Html_Attributes$reversed = function (bool) {
		return A2(_elm_lang$html$Html_Attributes$boolProperty, 'reversed', bool);
	};
	var _elm_lang$html$Html_Attributes$classList = function (list) {
		return _elm_lang$html$Html_Attributes$class(
			A2(
				_elm_lang$core$String$join,
				' ',
				A2(
					_elm_lang$core$List$map,
					_elm_lang$core$Basics$fst,
					A2(_elm_lang$core$List$filter, _elm_lang$core$Basics$snd, list))));
	};
	var _elm_lang$html$Html_Attributes$style = _elm_lang$virtual_dom$VirtualDom$style;

	var _elm_lang$html$Html_Events$keyCode = A2(_elm_lang$core$Json_Decode_ops[':='], 'keyCode', _elm_lang$core$Json_Decode$int);
	var _elm_lang$html$Html_Events$targetChecked = A2(
		_elm_lang$core$Json_Decode$at,
		_elm_lang$core$Native_List.fromArray(
			['target', 'checked']),
		_elm_lang$core$Json_Decode$bool);
	var _elm_lang$html$Html_Events$targetValue = A2(
		_elm_lang$core$Json_Decode$at,
		_elm_lang$core$Native_List.fromArray(
			['target', 'value']),
		_elm_lang$core$Json_Decode$string);
	var _elm_lang$html$Html_Events$defaultOptions = _elm_lang$virtual_dom$VirtualDom$defaultOptions;
	var _elm_lang$html$Html_Events$onWithOptions = _elm_lang$virtual_dom$VirtualDom$onWithOptions;
	var _elm_lang$html$Html_Events$on = _elm_lang$virtual_dom$VirtualDom$on;
	var _elm_lang$html$Html_Events$onFocus = function (msg) {
		return A2(
			_elm_lang$html$Html_Events$on,
			'focus',
			_elm_lang$core$Json_Decode$succeed(msg));
	};
	var _elm_lang$html$Html_Events$onBlur = function (msg) {
		return A2(
			_elm_lang$html$Html_Events$on,
			'blur',
			_elm_lang$core$Json_Decode$succeed(msg));
	};
	var _elm_lang$html$Html_Events$onSubmitOptions = _elm_lang$core$Native_Utils.update(
		_elm_lang$html$Html_Events$defaultOptions,
		{preventDefault: true});
	var _elm_lang$html$Html_Events$onSubmit = function (msg) {
		return A3(
			_elm_lang$html$Html_Events$onWithOptions,
			'submit',
			_elm_lang$html$Html_Events$onSubmitOptions,
			_elm_lang$core$Json_Decode$succeed(msg));
	};
	var _elm_lang$html$Html_Events$onCheck = function (tagger) {
		return A2(
			_elm_lang$html$Html_Events$on,
			'change',
			A2(_elm_lang$core$Json_Decode$map, tagger, _elm_lang$html$Html_Events$targetChecked));
	};
	var _elm_lang$html$Html_Events$onInput = function (tagger) {
		return A2(
			_elm_lang$html$Html_Events$on,
			'input',
			A2(_elm_lang$core$Json_Decode$map, tagger, _elm_lang$html$Html_Events$targetValue));
	};
	var _elm_lang$html$Html_Events$onMouseOut = function (msg) {
		return A2(
			_elm_lang$html$Html_Events$on,
			'mouseout',
			_elm_lang$core$Json_Decode$succeed(msg));
	};
	var _elm_lang$html$Html_Events$onMouseOver = function (msg) {
		return A2(
			_elm_lang$html$Html_Events$on,
			'mouseover',
			_elm_lang$core$Json_Decode$succeed(msg));
	};
	var _elm_lang$html$Html_Events$onMouseLeave = function (msg) {
		return A2(
			_elm_lang$html$Html_Events$on,
			'mouseleave',
			_elm_lang$core$Json_Decode$succeed(msg));
	};
	var _elm_lang$html$Html_Events$onMouseEnter = function (msg) {
		return A2(
			_elm_lang$html$Html_Events$on,
			'mouseenter',
			_elm_lang$core$Json_Decode$succeed(msg));
	};
	var _elm_lang$html$Html_Events$onMouseUp = function (msg) {
		return A2(
			_elm_lang$html$Html_Events$on,
			'mouseup',
			_elm_lang$core$Json_Decode$succeed(msg));
	};
	var _elm_lang$html$Html_Events$onMouseDown = function (msg) {
		return A2(
			_elm_lang$html$Html_Events$on,
			'mousedown',
			_elm_lang$core$Json_Decode$succeed(msg));
	};
	var _elm_lang$html$Html_Events$onDoubleClick = function (msg) {
		return A2(
			_elm_lang$html$Html_Events$on,
			'dblclick',
			_elm_lang$core$Json_Decode$succeed(msg));
	};
	var _elm_lang$html$Html_Events$onClick = function (msg) {
		return A2(
			_elm_lang$html$Html_Events$on,
			'click',
			_elm_lang$core$Json_Decode$succeed(msg));
	};
	var _elm_lang$html$Html_Events$Options = F2(
		function (a, b) {
			return {stopPropagation: a, preventDefault: b};
		});

	//import Dict, List, Maybe, Native.Scheduler //

	var _evancz$elm_http$Native_Http = function() {

	function send(settings, request)
	{
		return _elm_lang$core$Native_Scheduler.nativeBinding(function(callback) {
			var req = new XMLHttpRequest();

			// start
			if (settings.onStart.ctor === 'Just')
			{
				req.addEventListener('loadStart', function() {
					var task = settings.onStart._0;
					_elm_lang$core$Native_Scheduler.rawSpawn(task);
				});
			}

			// progress
			if (settings.onProgress.ctor === 'Just')
			{
				req.addEventListener('progress', function(event) {
					var progress = !event.lengthComputable
						? _elm_lang$core$Maybe$Nothing
						: _elm_lang$core$Maybe$Just({
							loaded: event.loaded,
							total: event.total
						});
					var task = settings.onProgress._0(progress);
					_elm_lang$core$Native_Scheduler.rawSpawn(task);
				});
			}

			// end
			req.addEventListener('error', function() {
				return callback(_elm_lang$core$Native_Scheduler.fail({ ctor: 'RawNetworkError' }));
			});

			req.addEventListener('timeout', function() {
				return callback(_elm_lang$core$Native_Scheduler.fail({ ctor: 'RawTimeout' }));
			});

			req.addEventListener('load', function() {
				return callback(_elm_lang$core$Native_Scheduler.succeed(toResponse(req)));
			});

			req.open(request.verb, request.url, true);

			// set all the headers
			function setHeader(pair) {
				req.setRequestHeader(pair._0, pair._1);
			}
			A2(_elm_lang$core$List$map, setHeader, request.headers);

			// set the timeout
			req.timeout = settings.timeout;

			// enable this withCredentials thing
			req.withCredentials = settings.withCredentials;

			// ask for a specific MIME type for the response
			if (settings.desiredResponseType.ctor === 'Just')
			{
				req.overrideMimeType(settings.desiredResponseType._0);
			}

			// actuall send the request
			if(request.body.ctor === "BodyFormData")
			{
				req.send(request.body.formData)
			}
			else
			{
				req.send(request.body._0);
			}

			return function() {
				req.abort();
			};
		});
	}


	// deal with responses

	function toResponse(req)
	{
		var tag = req.responseType === 'blob' ? 'Blob' : 'Text'
		var response = tag === 'Blob' ? req.response : req.responseText;
		return {
			status: req.status,
			statusText: req.statusText,
			headers: parseHeaders(req.getAllResponseHeaders()),
			url: req.responseURL,
			value: { ctor: tag, _0: response }
		};
	}


	function parseHeaders(rawHeaders)
	{
		var headers = _elm_lang$core$Dict$empty;

		if (!rawHeaders)
		{
			return headers;
		}

		var headerPairs = rawHeaders.split('\u000d\u000a');
		for (var i = headerPairs.length; i--; )
		{
			var headerPair = headerPairs[i];
			var index = headerPair.indexOf('\u003a\u0020');
			if (index > 0)
			{
				var key = headerPair.substring(0, index);
				var value = headerPair.substring(index + 2);

				headers = A3(_elm_lang$core$Dict$update, key, function(oldValue) {
					if (oldValue.ctor === 'Just')
					{
						return _elm_lang$core$Maybe$Just(value + ', ' + oldValue._0);
					}
					return _elm_lang$core$Maybe$Just(value);
				}, headers);
			}
		}

		return headers;
	}


	function multipart(dataList)
	{
		var formData = new FormData();

		while (dataList.ctor !== '[]')
		{
			var data = dataList._0;
			if (data.ctor === 'StringData')
			{
				formData.append(data._0, data._1);
			}
			else
			{
				var fileName = data._1.ctor === 'Nothing'
					? undefined
					: data._1._0;
				formData.append(data._0, data._2, fileName);
			}
			dataList = dataList._1;
		}

		return { ctor: 'BodyFormData', formData: formData };
	}


	function uriEncode(string)
	{
		return encodeURIComponent(string);
	}

	function uriDecode(string)
	{
		return decodeURIComponent(string);
	}

	return {
		send: F2(send),
		multipart: multipart,
		uriEncode: uriEncode,
		uriDecode: uriDecode
	};

	}();

	var _evancz$elm_http$Http$send = _evancz$elm_http$Native_Http.send;
	var _evancz$elm_http$Http$defaultSettings = {timeout: 0, onStart: _elm_lang$core$Maybe$Nothing, onProgress: _elm_lang$core$Maybe$Nothing, desiredResponseType: _elm_lang$core$Maybe$Nothing, withCredentials: false};
	var _evancz$elm_http$Http$multipart = _evancz$elm_http$Native_Http.multipart;
	var _evancz$elm_http$Http$uriDecode = _evancz$elm_http$Native_Http.uriDecode;
	var _evancz$elm_http$Http$uriEncode = _evancz$elm_http$Native_Http.uriEncode;
	var _evancz$elm_http$Http$queryEscape = function (string) {
		return A2(
			_elm_lang$core$String$join,
			'+',
			A2(
				_elm_lang$core$String$split,
				'%20',
				_evancz$elm_http$Http$uriEncode(string)));
	};
	var _evancz$elm_http$Http$queryPair = function (_p0) {
		var _p1 = _p0;
		return A2(
			_elm_lang$core$Basics_ops['++'],
			_evancz$elm_http$Http$queryEscape(_p1._0),
			A2(
				_elm_lang$core$Basics_ops['++'],
				'=',
				_evancz$elm_http$Http$queryEscape(_p1._1)));
	};
	var _evancz$elm_http$Http$url = F2(
		function (baseUrl, args) {
			var _p2 = args;
			if (_p2.ctor === '[]') {
				return baseUrl;
			} else {
				return A2(
					_elm_lang$core$Basics_ops['++'],
					baseUrl,
					A2(
						_elm_lang$core$Basics_ops['++'],
						'?',
						A2(
							_elm_lang$core$String$join,
							'&',
							A2(_elm_lang$core$List$map, _evancz$elm_http$Http$queryPair, args))));
			}
		});
	var _evancz$elm_http$Http$Request = F4(
		function (a, b, c, d) {
			return {verb: a, headers: b, url: c, body: d};
		});
	var _evancz$elm_http$Http$Settings = F5(
		function (a, b, c, d, e) {
			return {timeout: a, onStart: b, onProgress: c, desiredResponseType: d, withCredentials: e};
		});
	var _evancz$elm_http$Http$Response = F5(
		function (a, b, c, d, e) {
			return {status: a, statusText: b, headers: c, url: d, value: e};
		});
	var _evancz$elm_http$Http$TODO_implement_blob_in_another_library = {ctor: 'TODO_implement_blob_in_another_library'};
	var _evancz$elm_http$Http$TODO_implement_file_in_another_library = {ctor: 'TODO_implement_file_in_another_library'};
	var _evancz$elm_http$Http$BodyBlob = function (a) {
		return {ctor: 'BodyBlob', _0: a};
	};
	var _evancz$elm_http$Http$BodyFormData = {ctor: 'BodyFormData'};
	var _evancz$elm_http$Http$ArrayBuffer = {ctor: 'ArrayBuffer'};
	var _evancz$elm_http$Http$BodyString = function (a) {
		return {ctor: 'BodyString', _0: a};
	};
	var _evancz$elm_http$Http$string = _evancz$elm_http$Http$BodyString;
	var _evancz$elm_http$Http$Empty = {ctor: 'Empty'};
	var _evancz$elm_http$Http$empty = _evancz$elm_http$Http$Empty;
	var _evancz$elm_http$Http$FileData = F3(
		function (a, b, c) {
			return {ctor: 'FileData', _0: a, _1: b, _2: c};
		});
	var _evancz$elm_http$Http$BlobData = F3(
		function (a, b, c) {
			return {ctor: 'BlobData', _0: a, _1: b, _2: c};
		});
	var _evancz$elm_http$Http$blobData = _evancz$elm_http$Http$BlobData;
	var _evancz$elm_http$Http$StringData = F2(
		function (a, b) {
			return {ctor: 'StringData', _0: a, _1: b};
		});
	var _evancz$elm_http$Http$stringData = _evancz$elm_http$Http$StringData;
	var _evancz$elm_http$Http$Blob = function (a) {
		return {ctor: 'Blob', _0: a};
	};
	var _evancz$elm_http$Http$Text = function (a) {
		return {ctor: 'Text', _0: a};
	};
	var _evancz$elm_http$Http$RawNetworkError = {ctor: 'RawNetworkError'};
	var _evancz$elm_http$Http$RawTimeout = {ctor: 'RawTimeout'};
	var _evancz$elm_http$Http$BadResponse = F2(
		function (a, b) {
			return {ctor: 'BadResponse', _0: a, _1: b};
		});
	var _evancz$elm_http$Http$UnexpectedPayload = function (a) {
		return {ctor: 'UnexpectedPayload', _0: a};
	};
	var _evancz$elm_http$Http$handleResponse = F2(
		function (handle, response) {
			if ((_elm_lang$core$Native_Utils.cmp(200, response.status) < 1) && (_elm_lang$core$Native_Utils.cmp(response.status, 300) < 0)) {
				var _p3 = response.value;
				if (_p3.ctor === 'Text') {
					return handle(_p3._0);
				} else {
					return _elm_lang$core$Task$fail(
						_evancz$elm_http$Http$UnexpectedPayload('Response body is a blob, expecting a string.'));
				}
			} else {
				return _elm_lang$core$Task$fail(
					A2(_evancz$elm_http$Http$BadResponse, response.status, response.statusText));
			}
		});
	var _evancz$elm_http$Http$NetworkError = {ctor: 'NetworkError'};
	var _evancz$elm_http$Http$Timeout = {ctor: 'Timeout'};
	var _evancz$elm_http$Http$promoteError = function (rawError) {
		var _p4 = rawError;
		if (_p4.ctor === 'RawTimeout') {
			return _evancz$elm_http$Http$Timeout;
		} else {
			return _evancz$elm_http$Http$NetworkError;
		}
	};
	var _evancz$elm_http$Http$getString = function (url) {
		var request = {
			verb: 'GET',
			headers: _elm_lang$core$Native_List.fromArray(
				[]),
			url: url,
			body: _evancz$elm_http$Http$empty
		};
		return A2(
			_elm_lang$core$Task$andThen,
			A2(
				_elm_lang$core$Task$mapError,
				_evancz$elm_http$Http$promoteError,
				A2(_evancz$elm_http$Http$send, _evancz$elm_http$Http$defaultSettings, request)),
			_evancz$elm_http$Http$handleResponse(_elm_lang$core$Task$succeed));
	};
	var _evancz$elm_http$Http$fromJson = F2(
		function (decoder, response) {
			var decode = function (str) {
				var _p5 = A2(_elm_lang$core$Json_Decode$decodeString, decoder, str);
				if (_p5.ctor === 'Ok') {
					return _elm_lang$core$Task$succeed(_p5._0);
				} else {
					return _elm_lang$core$Task$fail(
						_evancz$elm_http$Http$UnexpectedPayload(_p5._0));
				}
			};
			return A2(
				_elm_lang$core$Task$andThen,
				A2(_elm_lang$core$Task$mapError, _evancz$elm_http$Http$promoteError, response),
				_evancz$elm_http$Http$handleResponse(decode));
		});
	var _evancz$elm_http$Http$get = F2(
		function (decoder, url) {
			var request = {
				verb: 'GET',
				headers: _elm_lang$core$Native_List.fromArray(
					[]),
				url: url,
				body: _evancz$elm_http$Http$empty
			};
			return A2(
				_evancz$elm_http$Http$fromJson,
				decoder,
				A2(_evancz$elm_http$Http$send, _evancz$elm_http$Http$defaultSettings, request));
		});
	var _evancz$elm_http$Http$post = F3(
		function (decoder, url, body) {
			var request = {
				verb: 'POST',
				headers: _elm_lang$core$Native_List.fromArray(
					[]),
				url: url,
				body: body
			};
			return A2(
				_evancz$elm_http$Http$fromJson,
				decoder,
				A2(_evancz$elm_http$Http$send, _evancz$elm_http$Http$defaultSettings, request));
		});

	var _evancz$elm_markdown$Native_Markdown = function() {


	// VIRTUAL-DOM WIDGETS

	function toHtml(options, factList, rawMarkdown)
	{
		var model = {
			options: options,
			markdown: rawMarkdown
		};
		return _elm_lang$virtual_dom$Native_VirtualDom.custom(factList, model, implementation);
	}


	// WIDGET IMPLEMENTATION

	var implementation = {
		render: render,
		diff: diff
	};

	function render(model)
	{
		var html = marked(model.markdown, formatOptions(model.options));
		var div = document.createElement('div');
		div.innerHTML = html;
		return div;
	}

	function diff(a, b)
	{
		
		if (a.model.markdown === b.model.markdown && a.model.options === b.model.options)
		{
			return null;
		}

		return {
			applyPatch: applyPatch,
			data: marked(b.model.markdown, formatOptions(b.model.options))
		};
	}

	function applyPatch(domNode, data)
	{
		domNode.innerHTML = data;
		return domNode;
	}


	// ACTUAL MARKDOWN PARSER

	var marked = function() {
		// catch the `marked` object regardless of the outer environment.
		// (ex. a CommonJS module compatible environment.)
		// note that this depends on marked's implementation of environment detection.
		var module = {};
		var exports = module.exports = {};

		/**
		 * marked - a markdown parser
		 * Copyright (c) 2011-2014, Christopher Jeffrey. (MIT Licensed)
		 * https://github.com/chjj/marked
		 */
		(function(){var block={newline:/^\n+/,code:/^( {4}[^\n]+\n*)+/,fences:noop,hr:/^( *[-*_]){3,} *(?:\n+|$)/,heading:/^ *(#{1,6}) *([^\n]+?) *#* *(?:\n+|$)/,nptable:noop,lheading:/^([^\n]+)\n *(=|-){2,} *(?:\n+|$)/,blockquote:/^( *>[^\n]+(\n(?!def)[^\n]+)*\n*)+/,list:/^( *)(bull) [\s\S]+?(?:hr|def|\n{2,}(?! )(?!\1bull )\n*|\s*$)/,html:/^ *(?:comment|closed|closing) *(?:\n{2,}|\s*$)/,def:/^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +["(]([^\n]+)[")])? *(?:\n+|$)/,table:noop,paragraph:/^((?:[^\n]+\n?(?!hr|heading|lheading|blockquote|tag|def))+)\n*/,text:/^[^\n]+/};block.bullet=/(?:[*+-]|\d+\.)/;block.item=/^( *)(bull) [^\n]*(?:\n(?!\1bull )[^\n]*)*/;block.item=replace(block.item,"gm")(/bull/g,block.bullet)();block.list=replace(block.list)(/bull/g,block.bullet)("hr","\\n+(?=\\1?(?:[-*_] *){3,}(?:\\n+|$))")("def","\\n+(?="+block.def.source+")")();block.blockquote=replace(block.blockquote)("def",block.def)();block._tag="(?!(?:"+"a|em|strong|small|s|cite|q|dfn|abbr|data|time|code"+"|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo"+"|span|br|wbr|ins|del|img)\\b)\\w+(?!:/|[^\\w\\s@]*@)\\b";block.html=replace(block.html)("comment",/<!--[\s\S]*?-->/)("closed",/<(tag)[\s\S]+?<\/\1>/)("closing",/<tag(?:"[^"]*"|'[^']*'|[^'">])*?>/)(/tag/g,block._tag)();block.paragraph=replace(block.paragraph)("hr",block.hr)("heading",block.heading)("lheading",block.lheading)("blockquote",block.blockquote)("tag","<"+block._tag)("def",block.def)();block.normal=merge({},block);block.gfm=merge({},block.normal,{fences:/^ *(`{3,}|~{3,}) *(\S+)? *\n([\s\S]+?)\s*\1 *(?:\n+|$)/,paragraph:/^/});block.gfm.paragraph=replace(block.paragraph)("(?!","(?!"+block.gfm.fences.source.replace("\\1","\\2")+"|"+block.list.source.replace("\\1","\\3")+"|")();block.tables=merge({},block.gfm,{nptable:/^ *(\S.*\|.*)\n *([-:]+ *\|[-| :]*)\n((?:.*\|.*(?:\n|$))*)\n*/,table:/^ *\|(.+)\n *\|( *[-:]+[-| :]*)\n((?: *\|.*(?:\n|$))*)\n*/});function Lexer(options){this.tokens=[];this.tokens.links={};this.options=options||marked.defaults;this.rules=block.normal;if(this.options.gfm){if(this.options.tables){this.rules=block.tables}else{this.rules=block.gfm}}}Lexer.rules=block;Lexer.lex=function(src,options){var lexer=new Lexer(options);return lexer.lex(src)};Lexer.prototype.lex=function(src){src=src.replace(/\r\n|\r/g,"\n").replace(/\t/g,"    ").replace(/\u00a0/g," ").replace(/\u2424/g,"\n");return this.token(src,true)};Lexer.prototype.token=function(src,top,bq){var src=src.replace(/^ +$/gm,""),next,loose,cap,bull,b,item,space,i,l;while(src){if(cap=this.rules.newline.exec(src)){src=src.substring(cap[0].length);if(cap[0].length>1){this.tokens.push({type:"space"})}}if(cap=this.rules.code.exec(src)){src=src.substring(cap[0].length);cap=cap[0].replace(/^ {4}/gm,"");this.tokens.push({type:"code",text:!this.options.pedantic?cap.replace(/\n+$/,""):cap});continue}if(cap=this.rules.fences.exec(src)){src=src.substring(cap[0].length);this.tokens.push({type:"code",lang:cap[2],text:cap[3]});continue}if(cap=this.rules.heading.exec(src)){src=src.substring(cap[0].length);this.tokens.push({type:"heading",depth:cap[1].length,text:cap[2]});continue}if(top&&(cap=this.rules.nptable.exec(src))){src=src.substring(cap[0].length);item={type:"table",header:cap[1].replace(/^ *| *\| *$/g,"").split(/ *\| */),align:cap[2].replace(/^ *|\| *$/g,"").split(/ *\| */),cells:cap[3].replace(/\n$/,"").split("\n")};for(i=0;i<item.align.length;i++){if(/^ *-+: *$/.test(item.align[i])){item.align[i]="right"}else if(/^ *:-+: *$/.test(item.align[i])){item.align[i]="center"}else if(/^ *:-+ *$/.test(item.align[i])){item.align[i]="left"}else{item.align[i]=null}}for(i=0;i<item.cells.length;i++){item.cells[i]=item.cells[i].split(/ *\| */)}this.tokens.push(item);continue}if(cap=this.rules.lheading.exec(src)){src=src.substring(cap[0].length);this.tokens.push({type:"heading",depth:cap[2]==="="?1:2,text:cap[1]});continue}if(cap=this.rules.hr.exec(src)){src=src.substring(cap[0].length);this.tokens.push({type:"hr"});continue}if(cap=this.rules.blockquote.exec(src)){src=src.substring(cap[0].length);this.tokens.push({type:"blockquote_start"});cap=cap[0].replace(/^ *> ?/gm,"");this.token(cap,top,true);this.tokens.push({type:"blockquote_end"});continue}if(cap=this.rules.list.exec(src)){src=src.substring(cap[0].length);bull=cap[2];this.tokens.push({type:"list_start",ordered:bull.length>1});cap=cap[0].match(this.rules.item);next=false;l=cap.length;i=0;for(;i<l;i++){item=cap[i];space=item.length;item=item.replace(/^ *([*+-]|\d+\.) +/,"");if(~item.indexOf("\n ")){space-=item.length;item=!this.options.pedantic?item.replace(new RegExp("^ {1,"+space+"}","gm"),""):item.replace(/^ {1,4}/gm,"")}if(this.options.smartLists&&i!==l-1){b=block.bullet.exec(cap[i+1])[0];if(bull!==b&&!(bull.length>1&&b.length>1)){src=cap.slice(i+1).join("\n")+src;i=l-1}}loose=next||/\n\n(?!\s*$)/.test(item);if(i!==l-1){next=item.charAt(item.length-1)==="\n";if(!loose)loose=next}this.tokens.push({type:loose?"loose_item_start":"list_item_start"});this.token(item,false,bq);this.tokens.push({type:"list_item_end"})}this.tokens.push({type:"list_end"});continue}if(cap=this.rules.html.exec(src)){src=src.substring(cap[0].length);this.tokens.push({type:this.options.sanitize?"paragraph":"html",pre:cap[1]==="pre"||cap[1]==="script"||cap[1]==="style",text:cap[0]});continue}if(!bq&&top&&(cap=this.rules.def.exec(src))){src=src.substring(cap[0].length);this.tokens.links[cap[1].toLowerCase()]={href:cap[2],title:cap[3]};continue}if(top&&(cap=this.rules.table.exec(src))){src=src.substring(cap[0].length);item={type:"table",header:cap[1].replace(/^ *| *\| *$/g,"").split(/ *\| */),align:cap[2].replace(/^ *|\| *$/g,"").split(/ *\| */),cells:cap[3].replace(/(?: *\| *)?\n$/,"").split("\n")};for(i=0;i<item.align.length;i++){if(/^ *-+: *$/.test(item.align[i])){item.align[i]="right"}else if(/^ *:-+: *$/.test(item.align[i])){item.align[i]="center"}else if(/^ *:-+ *$/.test(item.align[i])){item.align[i]="left"}else{item.align[i]=null}}for(i=0;i<item.cells.length;i++){item.cells[i]=item.cells[i].replace(/^ *\| *| *\| *$/g,"").split(/ *\| */)}this.tokens.push(item);continue}if(top&&(cap=this.rules.paragraph.exec(src))){src=src.substring(cap[0].length);this.tokens.push({type:"paragraph",text:cap[1].charAt(cap[1].length-1)==="\n"?cap[1].slice(0,-1):cap[1]});continue}if(cap=this.rules.text.exec(src)){src=src.substring(cap[0].length);this.tokens.push({type:"text",text:cap[0]});continue}if(src){throw new Error("Infinite loop on byte: "+src.charCodeAt(0))}}return this.tokens};var inline={escape:/^\\([\\`*{}\[\]()#+\-.!_>])/,autolink:/^<([^ >]+(@|:\/)[^ >]+)>/,url:noop,tag:/^<!--[\s\S]*?-->|^<\/?\w+(?:"[^"]*"|'[^']*'|[^'">])*?>/,link:/^!?\[(inside)\]\(href\)/,reflink:/^!?\[(inside)\]\s*\[([^\]]*)\]/,nolink:/^!?\[((?:\[[^\]]*\]|[^\[\]])*)\]/,strong:/^__([\s\S]+?)__(?!_)|^\*\*([\s\S]+?)\*\*(?!\*)/,em:/^\b_((?:__|[\s\S])+?)_\b|^\*((?:\*\*|[\s\S])+?)\*(?!\*)/,code:/^(`+)\s*([\s\S]*?[^`])\s*\1(?!`)/,br:/^ {2,}\n(?!\s*$)/,del:noop,text:/^[\s\S]+?(?=[\\<!\[_*`]| {2,}\n|$)/};inline._inside=/(?:\[[^\]]*\]|[^\[\]]|\](?=[^\[]*\]))*/;inline._href=/\s*<?([\s\S]*?)>?(?:\s+['"]([\s\S]*?)['"])?\s*/;inline.link=replace(inline.link)("inside",inline._inside)("href",inline._href)();inline.reflink=replace(inline.reflink)("inside",inline._inside)();inline.normal=merge({},inline);inline.pedantic=merge({},inline.normal,{strong:/^__(?=\S)([\s\S]*?\S)__(?!_)|^\*\*(?=\S)([\s\S]*?\S)\*\*(?!\*)/,em:/^_(?=\S)([\s\S]*?\S)_(?!_)|^\*(?=\S)([\s\S]*?\S)\*(?!\*)/});inline.gfm=merge({},inline.normal,{escape:replace(inline.escape)("])","~|])")(),url:/^(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/,del:/^~~(?=\S)([\s\S]*?\S)~~/,text:replace(inline.text)("]|","~]|")("|","|https?://|")()});inline.breaks=merge({},inline.gfm,{br:replace(inline.br)("{2,}","*")(),text:replace(inline.gfm.text)("{2,}","*")()});function InlineLexer(links,options){this.options=options||marked.defaults;this.links=links;this.rules=inline.normal;this.renderer=this.options.renderer||new Renderer;this.renderer.options=this.options;if(!this.links){throw new Error("Tokens array requires a `links` property.")}if(this.options.gfm){if(this.options.breaks){this.rules=inline.breaks}else{this.rules=inline.gfm}}else if(this.options.pedantic){this.rules=inline.pedantic}}InlineLexer.rules=inline;InlineLexer.output=function(src,links,options){var inline=new InlineLexer(links,options);return inline.output(src)};InlineLexer.prototype.output=function(src){var out="",link,text,href,cap;while(src){if(cap=this.rules.escape.exec(src)){src=src.substring(cap[0].length);out+=cap[1];continue}if(cap=this.rules.autolink.exec(src)){src=src.substring(cap[0].length);if(cap[2]==="@"){text=cap[1].charAt(6)===":"?this.mangle(cap[1].substring(7)):this.mangle(cap[1]);href=this.mangle("mailto:")+text}else{text=escape(cap[1]);href=text}out+=this.renderer.link(href,null,text);continue}if(!this.inLink&&(cap=this.rules.url.exec(src))){src=src.substring(cap[0].length);text=escape(cap[1]);href=text;out+=this.renderer.link(href,null,text);continue}if(cap=this.rules.tag.exec(src)){if(!this.inLink&&/^<a /i.test(cap[0])){this.inLink=true}else if(this.inLink&&/^<\/a>/i.test(cap[0])){this.inLink=false}src=src.substring(cap[0].length);out+=this.options.sanitize?escape(cap[0]):cap[0];continue}if(cap=this.rules.link.exec(src)){src=src.substring(cap[0].length);this.inLink=true;out+=this.outputLink(cap,{href:cap[2],title:cap[3]});this.inLink=false;continue}if((cap=this.rules.reflink.exec(src))||(cap=this.rules.nolink.exec(src))){src=src.substring(cap[0].length);link=(cap[2]||cap[1]).replace(/\s+/g," ");link=this.links[link.toLowerCase()];if(!link||!link.href){out+=cap[0].charAt(0);src=cap[0].substring(1)+src;continue}this.inLink=true;out+=this.outputLink(cap,link);this.inLink=false;continue}if(cap=this.rules.strong.exec(src)){src=src.substring(cap[0].length);out+=this.renderer.strong(this.output(cap[2]||cap[1]));continue}if(cap=this.rules.em.exec(src)){src=src.substring(cap[0].length);out+=this.renderer.em(this.output(cap[2]||cap[1]));continue}if(cap=this.rules.code.exec(src)){src=src.substring(cap[0].length);out+=this.renderer.codespan(escape(cap[2],true));continue}if(cap=this.rules.br.exec(src)){src=src.substring(cap[0].length);out+=this.renderer.br();continue}if(cap=this.rules.del.exec(src)){src=src.substring(cap[0].length);out+=this.renderer.del(this.output(cap[1]));continue}if(cap=this.rules.text.exec(src)){src=src.substring(cap[0].length);out+=escape(this.smartypants(cap[0]));continue}if(src){throw new Error("Infinite loop on byte: "+src.charCodeAt(0))}}return out};InlineLexer.prototype.outputLink=function(cap,link){var href=escape(link.href),title=link.title?escape(link.title):null;return cap[0].charAt(0)!=="!"?this.renderer.link(href,title,this.output(cap[1])):this.renderer.image(href,title,escape(cap[1]))};InlineLexer.prototype.smartypants=function(text){if(!this.options.smartypants)return text;return text.replace(/--/g,"—").replace(/(^|[-\u2014/(\[{"\s])'/g,"$1‘").replace(/'/g,"’").replace(/(^|[-\u2014/(\[{\u2018\s])"/g,"$1“").replace(/"/g,"”").replace(/\.{3}/g,"…")};InlineLexer.prototype.mangle=function(text){var out="",l=text.length,i=0,ch;for(;i<l;i++){ch=text.charCodeAt(i);if(Math.random()>.5){ch="x"+ch.toString(16)}out+="&#"+ch+";"}return out};function Renderer(options){this.options=options||{}}Renderer.prototype.code=function(code,lang,escaped){if(this.options.highlight){var out=this.options.highlight(code,lang);if(out!=null&&out!==code){escaped=true;code=out}}if(!lang){return"<pre><code>"+(escaped?code:escape(code,true))+"\n</code></pre>"}return'<pre><code class="'+this.options.langPrefix+escape(lang,true)+'">'+(escaped?code:escape(code,true))+"\n</code></pre>\n"};Renderer.prototype.blockquote=function(quote){return"<blockquote>\n"+quote+"</blockquote>\n"};Renderer.prototype.html=function(html){return html};Renderer.prototype.heading=function(text,level,raw){return"<h"+level+' id="'+this.options.headerPrefix+raw.toLowerCase().replace(/[^\w]+/g,"-")+'">'+text+"</h"+level+">\n"};Renderer.prototype.hr=function(){return this.options.xhtml?"<hr/>\n":"<hr>\n"};Renderer.prototype.list=function(body,ordered){var type=ordered?"ol":"ul";return"<"+type+">\n"+body+"</"+type+">\n"};Renderer.prototype.listitem=function(text){return"<li>"+text+"</li>\n"};Renderer.prototype.paragraph=function(text){return"<p>"+text+"</p>\n"};Renderer.prototype.table=function(header,body){return"<table>\n"+"<thead>\n"+header+"</thead>\n"+"<tbody>\n"+body+"</tbody>\n"+"</table>\n"};Renderer.prototype.tablerow=function(content){return"<tr>\n"+content+"</tr>\n"};Renderer.prototype.tablecell=function(content,flags){var type=flags.header?"th":"td";var tag=flags.align?"<"+type+' style="text-align:'+flags.align+'">':"<"+type+">";return tag+content+"</"+type+">\n"};Renderer.prototype.strong=function(text){return"<strong>"+text+"</strong>"};Renderer.prototype.em=function(text){return"<em>"+text+"</em>"};Renderer.prototype.codespan=function(text){return"<code>"+text+"</code>"};Renderer.prototype.br=function(){return this.options.xhtml?"<br/>":"<br>"};Renderer.prototype.del=function(text){return"<del>"+text+"</del>"};Renderer.prototype.link=function(href,title,text){if(this.options.sanitize){try{var prot=decodeURIComponent(unescape(href)).replace(/[^\w:]/g,"").toLowerCase()}catch(e){return""}if(prot.indexOf("javascript:")===0){return""}}var out='<a href="'+href+'"';if(title){out+=' title="'+title+'"'}out+=">"+text+"</a>";return out};Renderer.prototype.image=function(href,title,text){var out='<img src="'+href+'" alt="'+text+'"';if(title){out+=' title="'+title+'"'}out+=this.options.xhtml?"/>":">";return out};function Parser(options){this.tokens=[];this.token=null;this.options=options||marked.defaults;this.options.renderer=this.options.renderer||new Renderer;this.renderer=this.options.renderer;this.renderer.options=this.options}Parser.parse=function(src,options,renderer){var parser=new Parser(options,renderer);return parser.parse(src)};Parser.prototype.parse=function(src){this.inline=new InlineLexer(src.links,this.options,this.renderer);this.tokens=src.reverse();var out="";while(this.next()){out+=this.tok()}return out};Parser.prototype.next=function(){return this.token=this.tokens.pop()};Parser.prototype.peek=function(){return this.tokens[this.tokens.length-1]||0};Parser.prototype.parseText=function(){var body=this.token.text;while(this.peek().type==="text"){body+="\n"+this.next().text}return this.inline.output(body)};Parser.prototype.tok=function(){switch(this.token.type){case"space":{return""}case"hr":{return this.renderer.hr()}case"heading":{return this.renderer.heading(this.inline.output(this.token.text),this.token.depth,this.token.text)}case"code":{return this.renderer.code(this.token.text,this.token.lang,this.token.escaped)}case"table":{var header="",body="",i,row,cell,flags,j;cell="";for(i=0;i<this.token.header.length;i++){flags={header:true,align:this.token.align[i]};cell+=this.renderer.tablecell(this.inline.output(this.token.header[i]),{header:true,align:this.token.align[i]})}header+=this.renderer.tablerow(cell);for(i=0;i<this.token.cells.length;i++){row=this.token.cells[i];cell="";for(j=0;j<row.length;j++){cell+=this.renderer.tablecell(this.inline.output(row[j]),{header:false,align:this.token.align[j]})}body+=this.renderer.tablerow(cell)}return this.renderer.table(header,body)}case"blockquote_start":{var body="";while(this.next().type!=="blockquote_end"){body+=this.tok()}return this.renderer.blockquote(body)}case"list_start":{var body="",ordered=this.token.ordered;while(this.next().type!=="list_end"){body+=this.tok()}return this.renderer.list(body,ordered)}case"list_item_start":{var body="";while(this.next().type!=="list_item_end"){body+=this.token.type==="text"?this.parseText():this.tok()}return this.renderer.listitem(body)}case"loose_item_start":{var body="";while(this.next().type!=="list_item_end"){body+=this.tok()}return this.renderer.listitem(body)}case"html":{var html=!this.token.pre&&!this.options.pedantic?this.inline.output(this.token.text):this.token.text;return this.renderer.html(html)}case"paragraph":{return this.renderer.paragraph(this.inline.output(this.token.text))}case"text":{return this.renderer.paragraph(this.parseText())}}};function escape(html,encode){return html.replace(!encode?/&(?!#?\w+;)/g:/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function unescape(html){return html.replace(/&([#\w]+);/g,function(_,n){n=n.toLowerCase();if(n==="colon")return":";if(n.charAt(0)==="#"){return n.charAt(1)==="x"?String.fromCharCode(parseInt(n.substring(2),16)):String.fromCharCode(+n.substring(1))}return""})}function replace(regex,opt){regex=regex.source;opt=opt||"";return function self(name,val){if(!name)return new RegExp(regex,opt);val=val.source||val;val=val.replace(/(^|[^\[])\^/g,"$1");regex=regex.replace(name,val);return self}}function noop(){}noop.exec=noop;function merge(obj){var i=1,target,key;for(;i<arguments.length;i++){target=arguments[i];for(key in target){if(Object.prototype.hasOwnProperty.call(target,key)){obj[key]=target[key]}}}return obj}function marked(src,opt,callback){if(callback||typeof opt==="function"){if(!callback){callback=opt;opt=null}opt=merge({},marked.defaults,opt||{});var highlight=opt.highlight,tokens,pending,i=0;try{tokens=Lexer.lex(src,opt)}catch(e){return callback(e)}pending=tokens.length;var done=function(err){if(err){opt.highlight=highlight;return callback(err)}var out;try{out=Parser.parse(tokens,opt)}catch(e){err=e}opt.highlight=highlight;return err?callback(err):callback(null,out)};if(!highlight||highlight.length<3){return done()}delete opt.highlight;if(!pending)return done();for(;i<tokens.length;i++){(function(token){if(token.type!=="code"){return--pending||done()}return highlight(token.text,token.lang,function(err,code){if(err)return done(err);if(code==null||code===token.text){return--pending||done()}token.text=code;token.escaped=true;--pending||done()})})(tokens[i])}return}try{if(opt)opt=merge({},marked.defaults,opt);return Parser.parse(Lexer.lex(src,opt),opt)}catch(e){e.message+="\nPlease report this to https://github.com/chjj/marked.";if((opt||marked.defaults).silent){return"<p>An error occured:</p><pre>"+escape(e.message+"",true)+"</pre>"}throw e}}marked.options=marked.setOptions=function(opt){merge(marked.defaults,opt);return marked};marked.defaults={gfm:true,tables:true,breaks:false,pedantic:false,sanitize:false,smartLists:false,silent:false,highlight:null,langPrefix:"lang-",smartypants:false,headerPrefix:"",renderer:new Renderer,xhtml:false};marked.Parser=Parser;marked.parser=Parser.parse;marked.Renderer=Renderer;marked.Lexer=Lexer;marked.lexer=Lexer.lex;marked.InlineLexer=InlineLexer;marked.inlineLexer=InlineLexer.output;marked.parse=marked;if(typeof module!=="undefined"&&typeof exports==="object"){module.exports=marked}else if(typeof define==="function"&&define.amd){define(function(){return marked})}else{this.marked=marked}}).call(function(){return this||(typeof window!=="undefined"?window:global)}());

		return module.exports;
	}();


	// FORMAT OPTIONS FOR MARKED IMPLEMENTATION

	function formatOptions(options)
	{
		function toHighlight(code, lang)
		{
			if (!lang && options.defaultHighlighting.ctor === 'Just')
			{
				lang = options.defaultHighlighting._0;
			}

			if (typeof hljs !== 'undefined' && lang && hljs.listLanguages().indexOf(lang) >= 0)
			{
				return hljs.highlight(lang, code, true).value;
			}

			return code;
		}

		var gfm = options.githubFlavored;
		if (gfm.ctor === 'Just')
		{
			return {
				highlight: toHighlight,
				gfm: true,
				tables: gfm._0.tables,
				breaks: gfm._0.breaks,
				sanitize: options.sanitize,
				smartypants: options.smartypants
			};
		}

		return {
			highlight: toHighlight,
			gfm: false,
			tables: false,
			breaks: false,
			sanitize: options.sanitize,
			smartypants: options.smartypants
		};
	}


	// EXPORTS

	return {
		toHtml: F3(toHtml)
	};

	}();

	var _evancz$elm_markdown$Markdown$toHtmlWith = _evancz$elm_markdown$Native_Markdown.toHtml;
	var _evancz$elm_markdown$Markdown$defaultOptions = {
		githubFlavored: _elm_lang$core$Maybe$Just(
			{tables: false, breaks: false}),
		defaultHighlighting: _elm_lang$core$Maybe$Nothing,
		sanitize: false,
		smartypants: false
	};
	var _evancz$elm_markdown$Markdown$toHtml = F2(
		function (attrs, string) {
			return A3(_evancz$elm_markdown$Native_Markdown.toHtml, _evancz$elm_markdown$Markdown$defaultOptions, attrs, string);
		});
	var _evancz$elm_markdown$Markdown$Options = F4(
		function (a, b, c, d) {
			return {githubFlavored: a, defaultHighlighting: b, sanitize: c, smartypants: d};
		});

	var _rluiten$elm_date_extra$Date_Extra_Core$prevMonth = function (month) {
		var _p0 = month;
		switch (_p0.ctor) {
			case 'Jan':
				return _elm_lang$core$Date$Dec;
			case 'Feb':
				return _elm_lang$core$Date$Jan;
			case 'Mar':
				return _elm_lang$core$Date$Feb;
			case 'Apr':
				return _elm_lang$core$Date$Mar;
			case 'May':
				return _elm_lang$core$Date$Apr;
			case 'Jun':
				return _elm_lang$core$Date$May;
			case 'Jul':
				return _elm_lang$core$Date$Jun;
			case 'Aug':
				return _elm_lang$core$Date$Jul;
			case 'Sep':
				return _elm_lang$core$Date$Aug;
			case 'Oct':
				return _elm_lang$core$Date$Sep;
			case 'Nov':
				return _elm_lang$core$Date$Oct;
			default:
				return _elm_lang$core$Date$Nov;
		}
	};
	var _rluiten$elm_date_extra$Date_Extra_Core$nextMonth = function (month) {
		var _p1 = month;
		switch (_p1.ctor) {
			case 'Jan':
				return _elm_lang$core$Date$Feb;
			case 'Feb':
				return _elm_lang$core$Date$Mar;
			case 'Mar':
				return _elm_lang$core$Date$Apr;
			case 'Apr':
				return _elm_lang$core$Date$May;
			case 'May':
				return _elm_lang$core$Date$Jun;
			case 'Jun':
				return _elm_lang$core$Date$Jul;
			case 'Jul':
				return _elm_lang$core$Date$Aug;
			case 'Aug':
				return _elm_lang$core$Date$Sep;
			case 'Sep':
				return _elm_lang$core$Date$Oct;
			case 'Oct':
				return _elm_lang$core$Date$Nov;
			case 'Nov':
				return _elm_lang$core$Date$Dec;
			default:
				return _elm_lang$core$Date$Jan;
		}
	};
	var _rluiten$elm_date_extra$Date_Extra_Core$intToMonth = function (month) {
		return (_elm_lang$core$Native_Utils.cmp(month, 1) < 1) ? _elm_lang$core$Date$Jan : (_elm_lang$core$Native_Utils.eq(month, 2) ? _elm_lang$core$Date$Feb : (_elm_lang$core$Native_Utils.eq(month, 3) ? _elm_lang$core$Date$Mar : (_elm_lang$core$Native_Utils.eq(month, 4) ? _elm_lang$core$Date$Apr : (_elm_lang$core$Native_Utils.eq(month, 5) ? _elm_lang$core$Date$May : (_elm_lang$core$Native_Utils.eq(month, 6) ? _elm_lang$core$Date$Jun : (_elm_lang$core$Native_Utils.eq(month, 7) ? _elm_lang$core$Date$Jul : (_elm_lang$core$Native_Utils.eq(month, 8) ? _elm_lang$core$Date$Aug : (_elm_lang$core$Native_Utils.eq(month, 9) ? _elm_lang$core$Date$Sep : (_elm_lang$core$Native_Utils.eq(month, 10) ? _elm_lang$core$Date$Oct : (_elm_lang$core$Native_Utils.eq(month, 11) ? _elm_lang$core$Date$Nov : _elm_lang$core$Date$Dec))))))))));
	};
	var _rluiten$elm_date_extra$Date_Extra_Core$monthToInt = function (month) {
		var _p2 = month;
		switch (_p2.ctor) {
			case 'Jan':
				return 1;
			case 'Feb':
				return 2;
			case 'Mar':
				return 3;
			case 'Apr':
				return 4;
			case 'May':
				return 5;
			case 'Jun':
				return 6;
			case 'Jul':
				return 7;
			case 'Aug':
				return 8;
			case 'Sep':
				return 9;
			case 'Oct':
				return 10;
			case 'Nov':
				return 11;
			default:
				return 12;
		}
	};
	var _rluiten$elm_date_extra$Date_Extra_Core$isLeapYear = function (year) {
		return (_elm_lang$core$Native_Utils.eq(
			A2(_elm_lang$core$Basics_ops['%'], year, 4),
			0) && (!_elm_lang$core$Native_Utils.eq(
			A2(_elm_lang$core$Basics_ops['%'], year, 100),
			0))) || _elm_lang$core$Native_Utils.eq(
			A2(_elm_lang$core$Basics_ops['%'], year, 400),
			0);
	};
	var _rluiten$elm_date_extra$Date_Extra_Core$isLeapYearDate = function (date) {
		return _rluiten$elm_date_extra$Date_Extra_Core$isLeapYear(
			_elm_lang$core$Date$year(date));
	};
	var _rluiten$elm_date_extra$Date_Extra_Core$yearToDayLength = function (year) {
		return _rluiten$elm_date_extra$Date_Extra_Core$isLeapYear(year) ? 366 : 365;
	};
	var _rluiten$elm_date_extra$Date_Extra_Core$daysInMonth = F2(
		function (year, month) {
			var _p3 = month;
			switch (_p3.ctor) {
				case 'Jan':
					return 31;
				case 'Feb':
					return _rluiten$elm_date_extra$Date_Extra_Core$isLeapYear(year) ? 29 : 28;
				case 'Mar':
					return 31;
				case 'Apr':
					return 30;
				case 'May':
					return 31;
				case 'Jun':
					return 30;
				case 'Jul':
					return 31;
				case 'Aug':
					return 31;
				case 'Sep':
					return 30;
				case 'Oct':
					return 31;
				case 'Nov':
					return 30;
				default:
					return 31;
			}
		});
	var _rluiten$elm_date_extra$Date_Extra_Core$daysInMonthDate = function (date) {
		return A2(
			_rluiten$elm_date_extra$Date_Extra_Core$daysInMonth,
			_elm_lang$core$Date$year(date),
			_elm_lang$core$Date$month(date));
	};
	var _rluiten$elm_date_extra$Date_Extra_Core$monthList = _elm_lang$core$Native_List.fromArray(
		[_elm_lang$core$Date$Jan, _elm_lang$core$Date$Feb, _elm_lang$core$Date$Mar, _elm_lang$core$Date$Apr, _elm_lang$core$Date$May, _elm_lang$core$Date$Jun, _elm_lang$core$Date$Jul, _elm_lang$core$Date$Aug, _elm_lang$core$Date$Sep, _elm_lang$core$Date$Oct, _elm_lang$core$Date$Nov, _elm_lang$core$Date$Dec]);
	var _rluiten$elm_date_extra$Date_Extra_Core$toTime = function (_p4) {
		return _elm_lang$core$Basics$floor(
			_elm_lang$core$Date$toTime(_p4));
	};
	var _rluiten$elm_date_extra$Date_Extra_Core$fromTime = function (_p5) {
		return _elm_lang$core$Date$fromTime(
			_elm_lang$core$Basics$toFloat(_p5));
	};
	var _rluiten$elm_date_extra$Date_Extra_Core$prevDay = function (day) {
		var _p6 = day;
		switch (_p6.ctor) {
			case 'Mon':
				return _elm_lang$core$Date$Sun;
			case 'Tue':
				return _elm_lang$core$Date$Mon;
			case 'Wed':
				return _elm_lang$core$Date$Tue;
			case 'Thu':
				return _elm_lang$core$Date$Wed;
			case 'Fri':
				return _elm_lang$core$Date$Thu;
			case 'Sat':
				return _elm_lang$core$Date$Fri;
			default:
				return _elm_lang$core$Date$Sat;
		}
	};
	var _rluiten$elm_date_extra$Date_Extra_Core$nextDay = function (day) {
		var _p7 = day;
		switch (_p7.ctor) {
			case 'Mon':
				return _elm_lang$core$Date$Tue;
			case 'Tue':
				return _elm_lang$core$Date$Wed;
			case 'Wed':
				return _elm_lang$core$Date$Thu;
			case 'Thu':
				return _elm_lang$core$Date$Fri;
			case 'Fri':
				return _elm_lang$core$Date$Sat;
			case 'Sat':
				return _elm_lang$core$Date$Sun;
			default:
				return _elm_lang$core$Date$Mon;
		}
	};
	var _rluiten$elm_date_extra$Date_Extra_Core$isoDayOfWeek = function (day) {
		var _p8 = day;
		switch (_p8.ctor) {
			case 'Mon':
				return 1;
			case 'Tue':
				return 2;
			case 'Wed':
				return 3;
			case 'Thu':
				return 4;
			case 'Fri':
				return 5;
			case 'Sat':
				return 6;
			default:
				return 7;
		}
	};
	var _rluiten$elm_date_extra$Date_Extra_Core$daysBackToStartOfWeek = F2(
		function (dateDay, startOfWeekDay) {
			var startOfWeekDayIndex = _rluiten$elm_date_extra$Date_Extra_Core$isoDayOfWeek(startOfWeekDay);
			var dateDayIndex = _rluiten$elm_date_extra$Date_Extra_Core$isoDayOfWeek(dateDay);
			return (_elm_lang$core$Native_Utils.cmp(dateDayIndex, startOfWeekDayIndex) < 0) ? ((7 + dateDayIndex) - startOfWeekDayIndex) : (dateDayIndex - startOfWeekDayIndex);
		});
	var _rluiten$elm_date_extra$Date_Extra_Core$ticksAMillisecond = _elm_lang$core$Basics$floor(_elm_lang$core$Time$millisecond);
	var _rluiten$elm_date_extra$Date_Extra_Core$ticksASecond = _rluiten$elm_date_extra$Date_Extra_Core$ticksAMillisecond * 1000;
	var _rluiten$elm_date_extra$Date_Extra_Core$ticksAMinute = _rluiten$elm_date_extra$Date_Extra_Core$ticksASecond * 60;
	var _rluiten$elm_date_extra$Date_Extra_Core$ticksAnHour = _rluiten$elm_date_extra$Date_Extra_Core$ticksAMinute * 60;
	var _rluiten$elm_date_extra$Date_Extra_Core$ticksADay = _rluiten$elm_date_extra$Date_Extra_Core$ticksAnHour * 24;
	var _rluiten$elm_date_extra$Date_Extra_Core$ticksAWeek = _rluiten$elm_date_extra$Date_Extra_Core$ticksADay * 7;
	var _rluiten$elm_date_extra$Date_Extra_Core$firstOfMonthTicks = function (date) {
		var dateTicks = _rluiten$elm_date_extra$Date_Extra_Core$toTime(date);
		var day = _elm_lang$core$Date$day(date);
		return dateTicks + ((1 - day) * _rluiten$elm_date_extra$Date_Extra_Core$ticksADay);
	};
	var _rluiten$elm_date_extra$Date_Extra_Core$lastOfPrevMonthDate = function (date) {
		return _rluiten$elm_date_extra$Date_Extra_Core$fromTime(
			_rluiten$elm_date_extra$Date_Extra_Core$firstOfMonthTicks(date) - _rluiten$elm_date_extra$Date_Extra_Core$ticksADay);
	};
	var _rluiten$elm_date_extra$Date_Extra_Core$daysInPrevMonth = function (date) {
		return _rluiten$elm_date_extra$Date_Extra_Core$daysInMonthDate(
			_rluiten$elm_date_extra$Date_Extra_Core$lastOfPrevMonthDate(date));
	};
	var _rluiten$elm_date_extra$Date_Extra_Core$toFirstOfMonth = function (date) {
		return _rluiten$elm_date_extra$Date_Extra_Core$fromTime(
			_rluiten$elm_date_extra$Date_Extra_Core$firstOfMonthTicks(date));
	};
	var _rluiten$elm_date_extra$Date_Extra_Core$lastOfMonthTicks = function (date) {
		var dateTicks = _rluiten$elm_date_extra$Date_Extra_Core$toTime(date);
		var day = _elm_lang$core$Date$day(date);
		var month = _elm_lang$core$Date$month(date);
		var year = _elm_lang$core$Date$year(date);
		var daysInMonthVal = A2(_rluiten$elm_date_extra$Date_Extra_Core$daysInMonth, year, month);
		var addDays = daysInMonthVal - day;
		return dateTicks + (addDays * _rluiten$elm_date_extra$Date_Extra_Core$ticksADay);
	};
	var _rluiten$elm_date_extra$Date_Extra_Core$firstOfNextMonthDate = function (date) {
		return _rluiten$elm_date_extra$Date_Extra_Core$fromTime(
			_rluiten$elm_date_extra$Date_Extra_Core$lastOfMonthTicks(date) + _rluiten$elm_date_extra$Date_Extra_Core$ticksADay);
	};
	var _rluiten$elm_date_extra$Date_Extra_Core$daysInNextMonth = function (date) {
		return _rluiten$elm_date_extra$Date_Extra_Core$daysInMonthDate(
			_rluiten$elm_date_extra$Date_Extra_Core$firstOfNextMonthDate(date));
	};
	var _rluiten$elm_date_extra$Date_Extra_Core$lastOfMonthDate = function (date) {
		return _rluiten$elm_date_extra$Date_Extra_Core$fromTime(
			_rluiten$elm_date_extra$Date_Extra_Core$lastOfMonthTicks(date));
	};
	var _rluiten$elm_date_extra$Date_Extra_Core$epochDateStr = '1970-01-01T00:00:00Z';

	var _rluiten$elm_date_extra$Date_Extra_Compare$is3 = F4(
		function (comp, date1, date2, date3) {
			var time3 = _rluiten$elm_date_extra$Date_Extra_Core$toTime(date3);
			var time2 = _rluiten$elm_date_extra$Date_Extra_Core$toTime(date2);
			var highBound = A2(_elm_lang$core$Basics$max, time2, time3);
			var lowBound = A2(_elm_lang$core$Basics$min, time2, time3);
			var time1 = _rluiten$elm_date_extra$Date_Extra_Core$toTime(date1);
			var _p0 = comp;
			switch (_p0.ctor) {
				case 'Between':
					return (_elm_lang$core$Native_Utils.cmp(time1, lowBound) > 0) && (_elm_lang$core$Native_Utils.cmp(time1, highBound) < 0);
				case 'BetweenOpenStart':
					return (_elm_lang$core$Native_Utils.cmp(time1, lowBound) > -1) && (_elm_lang$core$Native_Utils.cmp(time1, highBound) < 0);
				case 'BetweenOpenEnd':
					return (_elm_lang$core$Native_Utils.cmp(time1, lowBound) > 0) && (_elm_lang$core$Native_Utils.cmp(time1, highBound) < 1);
				default:
					return (_elm_lang$core$Native_Utils.cmp(time1, lowBound) > -1) && (_elm_lang$core$Native_Utils.cmp(time1, highBound) < 1);
			}
		});
	var _rluiten$elm_date_extra$Date_Extra_Compare$is = F3(
		function (comp, date1, date2) {
			var time2 = _rluiten$elm_date_extra$Date_Extra_Core$toTime(date2);
			var time1 = _rluiten$elm_date_extra$Date_Extra_Core$toTime(date1);
			var _p1 = comp;
			switch (_p1.ctor) {
				case 'Before':
					return _elm_lang$core$Native_Utils.cmp(time1, time2) < 0;
				case 'After':
					return _elm_lang$core$Native_Utils.cmp(time1, time2) > 0;
				case 'Same':
					return _elm_lang$core$Native_Utils.eq(time1, time2);
				case 'SameOrBefore':
					return _elm_lang$core$Native_Utils.cmp(time1, time2) < 1;
				default:
					return _elm_lang$core$Native_Utils.cmp(time1, time2) > -1;
			}
		});
	var _rluiten$elm_date_extra$Date_Extra_Compare$SameOrBefore = {ctor: 'SameOrBefore'};
	var _rluiten$elm_date_extra$Date_Extra_Compare$SameOrAfter = {ctor: 'SameOrAfter'};
	var _rluiten$elm_date_extra$Date_Extra_Compare$Same = {ctor: 'Same'};
	var _rluiten$elm_date_extra$Date_Extra_Compare$Before = {ctor: 'Before'};
	var _rluiten$elm_date_extra$Date_Extra_Compare$After = {ctor: 'After'};
	var _rluiten$elm_date_extra$Date_Extra_Compare$BetweenOpen = {ctor: 'BetweenOpen'};
	var _rluiten$elm_date_extra$Date_Extra_Compare$BetweenOpenEnd = {ctor: 'BetweenOpenEnd'};
	var _rluiten$elm_date_extra$Date_Extra_Compare$BetweenOpenStart = {ctor: 'BetweenOpenStart'};
	var _rluiten$elm_date_extra$Date_Extra_Compare$Between = {ctor: 'Between'};

	var _rluiten$elm_date_extra$Date_Extra_Config$Config = F2(
		function (a, b) {
			return {i18n: a, format: b};
		});

	var _rluiten$elm_date_extra$Date_Extra_I18n_I_en_us$monthName = function (month) {
		var _p0 = month;
		switch (_p0.ctor) {
			case 'Jan':
				return 'January';
			case 'Feb':
				return 'February';
			case 'Mar':
				return 'March';
			case 'Apr':
				return 'April';
			case 'May':
				return 'May';
			case 'Jun':
				return 'June';
			case 'Jul':
				return 'July';
			case 'Aug':
				return 'August';
			case 'Sep':
				return 'September';
			case 'Oct':
				return 'October';
			case 'Nov':
				return 'November';
			default:
				return 'December';
		}
	};
	var _rluiten$elm_date_extra$Date_Extra_I18n_I_en_us$monthShort = function (month) {
		var _p1 = month;
		switch (_p1.ctor) {
			case 'Jan':
				return 'Jan';
			case 'Feb':
				return 'Feb';
			case 'Mar':
				return 'Mar';
			case 'Apr':
				return 'Apr';
			case 'May':
				return 'May';
			case 'Jun':
				return 'Jun';
			case 'Jul':
				return 'Jul';
			case 'Aug':
				return 'Aug';
			case 'Sep':
				return 'Sep';
			case 'Oct':
				return 'Oct';
			case 'Nov':
				return 'Nov';
			default:
				return 'Dec';
		}
	};
	var _rluiten$elm_date_extra$Date_Extra_I18n_I_en_us$dayName = function (day) {
		var _p2 = day;
		switch (_p2.ctor) {
			case 'Mon':
				return 'Monday';
			case 'Tue':
				return 'Tuesday';
			case 'Wed':
				return 'Wednesday';
			case 'Thu':
				return 'Thursday';
			case 'Fri':
				return 'Friday';
			case 'Sat':
				return 'Saturday';
			default:
				return 'Sunday';
		}
	};
	var _rluiten$elm_date_extra$Date_Extra_I18n_I_en_us$dayShort = function (day) {
		var _p3 = day;
		switch (_p3.ctor) {
			case 'Mon':
				return 'Mon';
			case 'Tue':
				return 'Tue';
			case 'Wed':
				return 'Wed';
			case 'Thu':
				return 'Thu';
			case 'Fri':
				return 'Fri';
			case 'Sat':
				return 'Sat';
			default:
				return 'Sun';
		}
	};

	var _rluiten$elm_date_extra$Date_Extra_Config_Config_en_au$config = {
		i18n: {dayShort: _rluiten$elm_date_extra$Date_Extra_I18n_I_en_us$dayShort, dayName: _rluiten$elm_date_extra$Date_Extra_I18n_I_en_us$dayName, monthShort: _rluiten$elm_date_extra$Date_Extra_I18n_I_en_us$monthShort, monthName: _rluiten$elm_date_extra$Date_Extra_I18n_I_en_us$monthName},
		format: {date: '%-d/%m/%Y', longDate: '%A, %-d %B %Y', time: '%-I:%M %p', longTime: '%-I:%M:%S %p', dateTime: '%-d/%m/%Y %-I:%M %p', firstDayOfWeek: _elm_lang$core$Date$Mon}
	};

	var _rluiten$elm_date_extra$Date_Extra_Config_Config_en_us$config = {
		i18n: {dayShort: _rluiten$elm_date_extra$Date_Extra_I18n_I_en_us$dayShort, dayName: _rluiten$elm_date_extra$Date_Extra_I18n_I_en_us$dayName, monthShort: _rluiten$elm_date_extra$Date_Extra_I18n_I_en_us$monthShort, monthName: _rluiten$elm_date_extra$Date_Extra_I18n_I_en_us$monthName},
		format: {date: '%-m/%-d/%Y', longDate: '%A, %B %d, %Y', time: '%-H:%M %p', longTime: '%-H:%M:%S %p', dateTime: '%-m/%-d/%Y %-I:%M %p', firstDayOfWeek: _elm_lang$core$Date$Sun}
	};

	var _rluiten$elm_date_extra$Date_Extra_Period$diff = F2(
		function (date1, date2) {
			var millisecondDiff = _elm_lang$core$Date$millisecond(date1) - _elm_lang$core$Date$millisecond(date2);
			var secondDiff = _elm_lang$core$Date$second(date1) - _elm_lang$core$Date$second(date2);
			var minuteDiff = _elm_lang$core$Date$minute(date1) - _elm_lang$core$Date$minute(date2);
			var hourDiff = _elm_lang$core$Date$hour(date1) - _elm_lang$core$Date$hour(date2);
			var ticksDiff = _rluiten$elm_date_extra$Date_Extra_Core$toTime(date1) - _rluiten$elm_date_extra$Date_Extra_Core$toTime(date2);
			var ticksDayDiff = (((ticksDiff - (hourDiff * _rluiten$elm_date_extra$Date_Extra_Core$ticksAnHour)) - (minuteDiff * _rluiten$elm_date_extra$Date_Extra_Core$ticksAMinute)) - (secondDiff * _rluiten$elm_date_extra$Date_Extra_Core$ticksASecond)) - (millisecondDiff * _rluiten$elm_date_extra$Date_Extra_Core$ticksAMillisecond);
			var onlylDaysDiff = (ticksDayDiff / _rluiten$elm_date_extra$Date_Extra_Core$ticksADay) | 0;
			var _p0 = function () {
				if (_elm_lang$core$Native_Utils.cmp(onlylDaysDiff, 0) < 0) {
					var absDayDiff = _elm_lang$core$Basics$abs(onlylDaysDiff);
					return {
						ctor: '_Tuple2',
						_0: _elm_lang$core$Basics$negate((absDayDiff / 7) | 0),
						_1: _elm_lang$core$Basics$negate(
							A2(_elm_lang$core$Basics_ops['%'], absDayDiff, 7))
					};
				} else {
					return {
						ctor: '_Tuple2',
						_0: (onlylDaysDiff / 7) | 0,
						_1: A2(_elm_lang$core$Basics_ops['%'], onlylDaysDiff, 7)
					};
				}
			}();
			var weekDiff = _p0._0;
			var dayDiff = _p0._1;
			return {week: weekDiff, day: dayDiff, hour: hourDiff, minute: minuteDiff, second: secondDiff, millisecond: millisecondDiff};
		});
	var _rluiten$elm_date_extra$Date_Extra_Period$addTimeUnit = F3(
		function (unit, addend, date) {
			return _rluiten$elm_date_extra$Date_Extra_Core$fromTime(
				A2(
					F2(
						function (x, y) {
							return x + y;
						}),
					addend * unit,
					_rluiten$elm_date_extra$Date_Extra_Core$toTime(date)));
		});
	var _rluiten$elm_date_extra$Date_Extra_Period$toTicks = function (period) {
		var _p1 = period;
		switch (_p1.ctor) {
			case 'Millisecond':
				return _rluiten$elm_date_extra$Date_Extra_Core$ticksAMillisecond;
			case 'Second':
				return _rluiten$elm_date_extra$Date_Extra_Core$ticksASecond;
			case 'Minute':
				return _rluiten$elm_date_extra$Date_Extra_Core$ticksAMinute;
			case 'Hour':
				return _rluiten$elm_date_extra$Date_Extra_Core$ticksAnHour;
			case 'Day':
				return _rluiten$elm_date_extra$Date_Extra_Core$ticksADay;
			case 'Week':
				return _rluiten$elm_date_extra$Date_Extra_Core$ticksAWeek;
			default:
				var _p2 = _p1._0;
				return (((((_rluiten$elm_date_extra$Date_Extra_Core$ticksAMillisecond * _p2.millisecond) + (_rluiten$elm_date_extra$Date_Extra_Core$ticksASecond * _p2.second)) + (_rluiten$elm_date_extra$Date_Extra_Core$ticksAMinute * _p2.minute)) + (_rluiten$elm_date_extra$Date_Extra_Core$ticksAnHour * _p2.hour)) + (_rluiten$elm_date_extra$Date_Extra_Core$ticksADay * _p2.day)) + (_rluiten$elm_date_extra$Date_Extra_Core$ticksAWeek * _p2.week);
		}
	};
	var _rluiten$elm_date_extra$Date_Extra_Period$add = function (period) {
		return _rluiten$elm_date_extra$Date_Extra_Period$addTimeUnit(
			_rluiten$elm_date_extra$Date_Extra_Period$toTicks(period));
	};
	var _rluiten$elm_date_extra$Date_Extra_Period$zeroDelta = {week: 0, day: 0, hour: 0, minute: 0, second: 0, millisecond: 0};
	var _rluiten$elm_date_extra$Date_Extra_Period$DeltaRecord = F6(
		function (a, b, c, d, e, f) {
			return {week: a, day: b, hour: c, minute: d, second: e, millisecond: f};
		});
	var _rluiten$elm_date_extra$Date_Extra_Period$Delta = function (a) {
		return {ctor: 'Delta', _0: a};
	};
	var _rluiten$elm_date_extra$Date_Extra_Period$Week = {ctor: 'Week'};
	var _rluiten$elm_date_extra$Date_Extra_Period$Day = {ctor: 'Day'};
	var _rluiten$elm_date_extra$Date_Extra_Period$Hour = {ctor: 'Hour'};
	var _rluiten$elm_date_extra$Date_Extra_Period$Minute = {ctor: 'Minute'};
	var _rluiten$elm_date_extra$Date_Extra_Period$Second = {ctor: 'Second'};
	var _rluiten$elm_date_extra$Date_Extra_Period$Millisecond = {ctor: 'Millisecond'};

	var _rluiten$elm_date_extra$Date_Extra_Internal$daysFromCivil = F3(
		function (year, month, day) {
			var doy = (((((153 * (month + ((_elm_lang$core$Native_Utils.cmp(month, 2) > 0) ? -3 : 9))) + 2) / 5) | 0) + day) - 1;
			var y = year - ((_elm_lang$core$Native_Utils.cmp(month, 2) < 1) ? 1 : 0);
			var era = (((_elm_lang$core$Native_Utils.cmp(y, 0) > -1) ? y : (y - 399)) / 400) | 0;
			var yoe = y - (era * 400);
			var doe = (((yoe * 365) + ((yoe / 4) | 0)) - ((yoe / 100) | 0)) + doy;
			return ((era * 146097) + doe) - 719468;
		});
	var _rluiten$elm_date_extra$Date_Extra_Internal$ticksFromFields = F7(
		function (year, month, day, hour, minute, second, millisecond) {
			var monthInt = _rluiten$elm_date_extra$Date_Extra_Core$monthToInt(month);
			var c_year = (_elm_lang$core$Native_Utils.cmp(year, 0) < 0) ? 0 : year;
			var c_day = A3(
				_elm_lang$core$Basics$clamp,
				1,
				A2(_rluiten$elm_date_extra$Date_Extra_Core$daysInMonth, c_year, month),
				day);
			var dayCount = A3(_rluiten$elm_date_extra$Date_Extra_Internal$daysFromCivil, c_year, monthInt, c_day);
			return _rluiten$elm_date_extra$Date_Extra_Period$toTicks(
				_rluiten$elm_date_extra$Date_Extra_Period$Delta(
					{
						millisecond: A3(_elm_lang$core$Basics$clamp, 0, 999, millisecond),
						second: A3(_elm_lang$core$Basics$clamp, 0, 59, second),
						minute: A3(_elm_lang$core$Basics$clamp, 0, 59, minute),
						hour: A3(_elm_lang$core$Basics$clamp, 0, 23, hour),
						day: dayCount,
						week: 0
					}));
		});
	var _rluiten$elm_date_extra$Date_Extra_Internal$ticksFromDateFields = function (date) {
		return A7(
			_rluiten$elm_date_extra$Date_Extra_Internal$ticksFromFields,
			_elm_lang$core$Date$year(date),
			_elm_lang$core$Date$month(date),
			_elm_lang$core$Date$day(date),
			_elm_lang$core$Date$hour(date),
			_elm_lang$core$Date$minute(date),
			_elm_lang$core$Date$second(date),
			_elm_lang$core$Date$millisecond(date));
	};
	var _rluiten$elm_date_extra$Date_Extra_Internal$getTimezoneOffset = function (date) {
		var v1Ticks = _rluiten$elm_date_extra$Date_Extra_Internal$ticksFromDateFields(date);
		var dateTicks = _elm_lang$core$Basics$floor(
			_elm_lang$core$Date$toTime(date));
		return ((dateTicks - v1Ticks) / _rluiten$elm_date_extra$Date_Extra_Core$ticksAMinute) | 0;
	};
	var _rluiten$elm_date_extra$Date_Extra_Internal$hackDateAsOffset = F2(
		function (offsetMinutes, date) {
			return _rluiten$elm_date_extra$Date_Extra_Core$fromTime(
				A2(
					F2(
						function (x, y) {
							return x + y;
						}),
					offsetMinutes * _rluiten$elm_date_extra$Date_Extra_Core$ticksAMinute,
					_rluiten$elm_date_extra$Date_Extra_Core$toTime(date)));
		});
	var _rluiten$elm_date_extra$Date_Extra_Internal$hackDateAsUtc = function (date) {
		var offset = _rluiten$elm_date_extra$Date_Extra_Internal$getTimezoneOffset(date);
		var oHours = (offset / _rluiten$elm_date_extra$Date_Extra_Core$ticksAnHour) | 0;
		var oMinutes = ((offset - (oHours * _rluiten$elm_date_extra$Date_Extra_Core$ticksAnHour)) / _rluiten$elm_date_extra$Date_Extra_Core$ticksAMinute) | 0;
		var _p0 = A2(
			_elm_lang$core$Debug$log,
			'hackDateAsUtc',
			{ctor: '_Tuple3', _0: offset, _1: oHours, _2: oMinutes});
		var _p1 = A2(
			_elm_lang$core$Debug$log,
			'(local  date) fields',
			{
				ctor: '_Tuple7',
				_0: _elm_lang$core$Date$year(date),
				_1: _elm_lang$core$Date$month(date),
				_2: _elm_lang$core$Date$day(date),
				_3: _elm_lang$core$Date$hour(date),
				_4: _elm_lang$core$Date$minute(date),
				_5: _elm_lang$core$Date$second(date),
				_6: _elm_lang$core$Date$millisecond(date)
			});
		return A2(_rluiten$elm_date_extra$Date_Extra_Internal$hackDateAsOffset, offset, date);
	};

	var _rluiten$elm_date_extra$Date_Extra_Create$epochDate = _elm_lang$core$Date$fromTime(0);
	var _rluiten$elm_date_extra$Date_Extra_Create$epochTimezoneOffset = function () {
		var inMinutes = (_elm_lang$core$Date$hour(_rluiten$elm_date_extra$Date_Extra_Create$epochDate) * 60) + _elm_lang$core$Date$minute(_rluiten$elm_date_extra$Date_Extra_Create$epochDate);
		return _elm_lang$core$Native_Utils.eq(
			_elm_lang$core$Date$year(_rluiten$elm_date_extra$Date_Extra_Create$epochDate),
			1969) ? (inMinutes - (24 * 60)) : inMinutes;
	}();
	var _rluiten$elm_date_extra$Date_Extra_Create$adjustedTicksToDate = function (ticks) {
		return A3(_rluiten$elm_date_extra$Date_Extra_Period$add, _rluiten$elm_date_extra$Date_Extra_Period$Millisecond, ticks - (_rluiten$elm_date_extra$Date_Extra_Create$epochTimezoneOffset * _rluiten$elm_date_extra$Date_Extra_Core$ticksAMinute), _rluiten$elm_date_extra$Date_Extra_Create$epochDate);
	};
	var _rluiten$elm_date_extra$Date_Extra_Create$dateFromFields = F7(
		function (year, month, day, hour, minute, second, millisecond) {
			return _rluiten$elm_date_extra$Date_Extra_Create$adjustedTicksToDate(
				A7(_rluiten$elm_date_extra$Date_Extra_Internal$ticksFromFields, year, month, day, hour, minute, second, millisecond));
		});
	var _rluiten$elm_date_extra$Date_Extra_Create$timeFromFields = A3(_rluiten$elm_date_extra$Date_Extra_Create$dateFromFields, 1970, _elm_lang$core$Date$Jan, 1);
	var _rluiten$elm_date_extra$Date_Extra_Create$getTimezoneOffset = _rluiten$elm_date_extra$Date_Extra_Internal$getTimezoneOffset;

	var _rluiten$elm_date_extra$Date_Extra_Format$toHourMin = function (offsetMinutes) {
		return {
			ctor: '_Tuple2',
			_0: (offsetMinutes / 60) | 0,
			_1: A2(_elm_lang$core$Basics_ops['%'], offsetMinutes, 60)
		};
	};
	var _rluiten$elm_date_extra$Date_Extra_Format$padWithN = F2(
		function (n, c) {
			return function (_p0) {
				return A3(
					_elm_lang$core$String$padLeft,
					n,
					c,
					_elm_lang$core$Basics$toString(_p0));
			};
		});
	var _rluiten$elm_date_extra$Date_Extra_Format$padWith = function (c) {
		return function (_p1) {
			return A3(
				_elm_lang$core$String$padLeft,
				2,
				c,
				_elm_lang$core$Basics$toString(_p1));
		};
	};
	var _rluiten$elm_date_extra$Date_Extra_Format$hourMod12 = function (h) {
		return _elm_lang$core$Native_Utils.eq(
			A2(_elm_lang$core$Basics_ops['%'], h, 12),
			0) ? 12 : A2(_elm_lang$core$Basics_ops['%'], h, 12);
	};
	var _rluiten$elm_date_extra$Date_Extra_Format$formatOffsetStr = F2(
		function (betweenHoursMinutes, offset) {
			var _p2 = _rluiten$elm_date_extra$Date_Extra_Format$toHourMin(
				_elm_lang$core$Basics$abs(offset));
			var hour = _p2._0;
			var minute = _p2._1;
			return A2(
				_elm_lang$core$Basics_ops['++'],
				(_elm_lang$core$Native_Utils.cmp(offset, 0) < 1) ? '+' : '-',
				A2(
					_elm_lang$core$Basics_ops['++'],
					A2(
						_rluiten$elm_date_extra$Date_Extra_Format$padWith,
						_elm_lang$core$Native_Utils.chr('0'),
						hour),
					A2(
						_elm_lang$core$Basics_ops['++'],
						betweenHoursMinutes,
						A2(
							_rluiten$elm_date_extra$Date_Extra_Format$padWith,
							_elm_lang$core$Native_Utils.chr('0'),
							minute))));
		});
	var _rluiten$elm_date_extra$Date_Extra_Format$collapse = function (m) {
		return A2(_elm_lang$core$Maybe$andThen, m, _elm_lang$core$Basics$identity);
	};
	var _rluiten$elm_date_extra$Date_Extra_Format$formatToken = F4(
		function (config, offset, d, m) {
			var symbol = A2(
				_elm_lang$core$Maybe$withDefault,
				' ',
				_rluiten$elm_date_extra$Date_Extra_Format$collapse(
					_elm_lang$core$List$head(m.submatches)));
			var _p3 = symbol;
			switch (_p3) {
				case 'Y':
					return A3(
						_rluiten$elm_date_extra$Date_Extra_Format$padWithN,
						4,
						_elm_lang$core$Native_Utils.chr('0'),
						_elm_lang$core$Date$year(d));
				case 'm':
					return A2(
						_rluiten$elm_date_extra$Date_Extra_Format$padWith,
						_elm_lang$core$Native_Utils.chr('0'),
						_rluiten$elm_date_extra$Date_Extra_Core$monthToInt(
							_elm_lang$core$Date$month(d)));
				case '_m':
					return A2(
						_rluiten$elm_date_extra$Date_Extra_Format$padWith,
						_elm_lang$core$Native_Utils.chr(' '),
						_rluiten$elm_date_extra$Date_Extra_Core$monthToInt(
							_elm_lang$core$Date$month(d)));
				case '-m':
					return _elm_lang$core$Basics$toString(
						_rluiten$elm_date_extra$Date_Extra_Core$monthToInt(
							_elm_lang$core$Date$month(d)));
				case 'B':
					return config.i18n.monthName(
						_elm_lang$core$Date$month(d));
				case '^B':
					return _elm_lang$core$String$toUpper(
						config.i18n.monthName(
							_elm_lang$core$Date$month(d)));
				case 'b':
					return config.i18n.monthShort(
						_elm_lang$core$Date$month(d));
				case '^b':
					return _elm_lang$core$String$toUpper(
						config.i18n.monthShort(
							_elm_lang$core$Date$month(d)));
				case 'd':
					return A2(
						_rluiten$elm_date_extra$Date_Extra_Format$padWith,
						_elm_lang$core$Native_Utils.chr('0'),
						_elm_lang$core$Date$day(d));
				case '-d':
					return _elm_lang$core$Basics$toString(
						_elm_lang$core$Date$day(d));
				case 'e':
					return A2(
						_rluiten$elm_date_extra$Date_Extra_Format$padWith,
						_elm_lang$core$Native_Utils.chr(' '),
						_elm_lang$core$Date$day(d));
				case 'A':
					return config.i18n.dayName(
						_elm_lang$core$Date$dayOfWeek(d));
				case '^A':
					return _elm_lang$core$String$toUpper(
						config.i18n.dayName(
							_elm_lang$core$Date$dayOfWeek(d)));
				case 'a':
					return config.i18n.dayShort(
						_elm_lang$core$Date$dayOfWeek(d));
				case '^a':
					return _elm_lang$core$String$toUpper(
						config.i18n.dayShort(
							_elm_lang$core$Date$dayOfWeek(d)));
				case 'H':
					return A2(
						_rluiten$elm_date_extra$Date_Extra_Format$padWith,
						_elm_lang$core$Native_Utils.chr('0'),
						_elm_lang$core$Date$hour(d));
				case '-H':
					return _elm_lang$core$Basics$toString(
						_elm_lang$core$Date$hour(d));
				case 'k':
					return A2(
						_rluiten$elm_date_extra$Date_Extra_Format$padWith,
						_elm_lang$core$Native_Utils.chr(' '),
						_elm_lang$core$Date$hour(d));
				case 'I':
					return A2(
						_rluiten$elm_date_extra$Date_Extra_Format$padWith,
						_elm_lang$core$Native_Utils.chr('0'),
						_rluiten$elm_date_extra$Date_Extra_Format$hourMod12(
							_elm_lang$core$Date$hour(d)));
				case '-I':
					return _elm_lang$core$Basics$toString(
						_rluiten$elm_date_extra$Date_Extra_Format$hourMod12(
							_elm_lang$core$Date$hour(d)));
				case 'l':
					return A2(
						_rluiten$elm_date_extra$Date_Extra_Format$padWith,
						_elm_lang$core$Native_Utils.chr(' '),
						_rluiten$elm_date_extra$Date_Extra_Format$hourMod12(
							_elm_lang$core$Date$hour(d)));
				case 'p':
					return (_elm_lang$core$Native_Utils.cmp(
						_elm_lang$core$Date$hour(d),
						12) < 0) ? 'AM' : 'PM';
				case 'P':
					return (_elm_lang$core$Native_Utils.cmp(
						_elm_lang$core$Date$hour(d),
						12) < 0) ? 'am' : 'pm';
				case 'M':
					return A2(
						_rluiten$elm_date_extra$Date_Extra_Format$padWith,
						_elm_lang$core$Native_Utils.chr('0'),
						_elm_lang$core$Date$minute(d));
				case 'S':
					return A2(
						_rluiten$elm_date_extra$Date_Extra_Format$padWith,
						_elm_lang$core$Native_Utils.chr('0'),
						_elm_lang$core$Date$second(d));
				case 'L':
					return A3(
						_rluiten$elm_date_extra$Date_Extra_Format$padWithN,
						3,
						_elm_lang$core$Native_Utils.chr('0'),
						_elm_lang$core$Date$millisecond(d));
				case '%':
					return symbol;
				case 'z':
					return A2(_rluiten$elm_date_extra$Date_Extra_Format$formatOffsetStr, '', offset);
				case ':z':
					return A2(_rluiten$elm_date_extra$Date_Extra_Format$formatOffsetStr, ':', offset);
				default:
					return '';
			}
		});
	var _rluiten$elm_date_extra$Date_Extra_Format$formatRegex = _elm_lang$core$Regex$regex('%(Y|m|_m|-m|B|^B|b|^b|d|-d|e|A|^A|a|^a|H|-H|k|I|-I|l|p|P|M|S|%|L|z|:z)');
	var _rluiten$elm_date_extra$Date_Extra_Format$formatOffset = F4(
		function (config, targetOffset, formatStr, date) {
			var dateOffset = _rluiten$elm_date_extra$Date_Extra_Create$getTimezoneOffset(date);
			var hackOffset = dateOffset - targetOffset;
			return A4(
				_elm_lang$core$Regex$replace,
				_elm_lang$core$Regex$All,
				_rluiten$elm_date_extra$Date_Extra_Format$formatRegex,
				A3(
					_rluiten$elm_date_extra$Date_Extra_Format$formatToken,
					config,
					targetOffset,
					A2(_rluiten$elm_date_extra$Date_Extra_Internal$hackDateAsOffset, hackOffset, date)),
				formatStr);
		});
	var _rluiten$elm_date_extra$Date_Extra_Format$format = F3(
		function (config, formatStr, date) {
			return A4(
				_rluiten$elm_date_extra$Date_Extra_Format$formatOffset,
				config,
				_rluiten$elm_date_extra$Date_Extra_Create$getTimezoneOffset(date),
				formatStr,
				date);
		});
	var _rluiten$elm_date_extra$Date_Extra_Format$formatUtc = F3(
		function (config, formatStr, date) {
			return A4(_rluiten$elm_date_extra$Date_Extra_Format$formatOffset, config, 0, formatStr, date);
		});
	var _rluiten$elm_date_extra$Date_Extra_Format$isoDateString = function (date) {
		var day = _elm_lang$core$Date$day(date);
		var month = _elm_lang$core$Date$month(date);
		var year = _elm_lang$core$Date$year(date);
		return A2(
			_elm_lang$core$Basics_ops['++'],
			A3(
				_elm_lang$core$String$padLeft,
				4,
				_elm_lang$core$Native_Utils.chr('0'),
				_elm_lang$core$Basics$toString(year)),
			A2(
				_elm_lang$core$Basics_ops['++'],
				'-',
				A2(
					_elm_lang$core$Basics_ops['++'],
					A3(
						_elm_lang$core$String$padLeft,
						2,
						_elm_lang$core$Native_Utils.chr('0'),
						_elm_lang$core$Basics$toString(
							_rluiten$elm_date_extra$Date_Extra_Core$monthToInt(month))),
					A2(
						_elm_lang$core$Basics_ops['++'],
						'-',
						A3(
							_elm_lang$core$String$padLeft,
							2,
							_elm_lang$core$Native_Utils.chr('0'),
							_elm_lang$core$Basics$toString(day))))));
	};
	var _rluiten$elm_date_extra$Date_Extra_Format$utcIsoDateString = function (date) {
		return _rluiten$elm_date_extra$Date_Extra_Format$isoDateString(
			_rluiten$elm_date_extra$Date_Extra_Internal$hackDateAsUtc(date));
	};
	var _rluiten$elm_date_extra$Date_Extra_Format$yearInt = function (year) {
		return A3(
			_elm_lang$core$String$padLeft,
			4,
			_elm_lang$core$Native_Utils.chr('0'),
			_elm_lang$core$Basics$toString(year));
	};
	var _rluiten$elm_date_extra$Date_Extra_Format$year = function (date) {
		return A3(
			_elm_lang$core$String$padLeft,
			4,
			_elm_lang$core$Native_Utils.chr('0'),
			_elm_lang$core$Basics$toString(
				_elm_lang$core$Date$year(date)));
	};
	var _rluiten$elm_date_extra$Date_Extra_Format$monthMonth = function (month) {
		return A3(
			_elm_lang$core$String$padLeft,
			2,
			_elm_lang$core$Native_Utils.chr('0'),
			_elm_lang$core$Basics$toString(
				_rluiten$elm_date_extra$Date_Extra_Core$monthToInt(month)));
	};
	var _rluiten$elm_date_extra$Date_Extra_Format$month = function (date) {
		return A3(
			_elm_lang$core$String$padLeft,
			2,
			_elm_lang$core$Native_Utils.chr('0'),
			_elm_lang$core$Basics$toString(
				_rluiten$elm_date_extra$Date_Extra_Core$monthToInt(
					_elm_lang$core$Date$month(date))));
	};
	var _rluiten$elm_date_extra$Date_Extra_Format$isoTimeFormat = '%H:%M:%S';
	var _rluiten$elm_date_extra$Date_Extra_Format$isoDateFormat = '%Y-%m-%d';
	var _rluiten$elm_date_extra$Date_Extra_Format$isoMsecOffsetFormat = '%Y-%m-%dT%H:%M:%S.%L%z';
	var _rluiten$elm_date_extra$Date_Extra_Format$isoString = A2(_rluiten$elm_date_extra$Date_Extra_Format$format, _rluiten$elm_date_extra$Date_Extra_Config_Config_en_us$config, _rluiten$elm_date_extra$Date_Extra_Format$isoMsecOffsetFormat);
	var _rluiten$elm_date_extra$Date_Extra_Format$isoOffsetFormat = '%Y-%m-%dT%H:%M:%S%z';
	var _rluiten$elm_date_extra$Date_Extra_Format$isoMsecFormat = '%Y-%m-%dT%H:%M:%S.%L';
	var _rluiten$elm_date_extra$Date_Extra_Format$isoStringNoOffset = A2(_rluiten$elm_date_extra$Date_Extra_Format$format, _rluiten$elm_date_extra$Date_Extra_Config_Config_en_us$config, _rluiten$elm_date_extra$Date_Extra_Format$isoMsecFormat);
	var _rluiten$elm_date_extra$Date_Extra_Format$utcIsoString = function (date) {
		return A2(
			_elm_lang$core$Basics_ops['++'],
			A3(_rluiten$elm_date_extra$Date_Extra_Format$formatUtc, _rluiten$elm_date_extra$Date_Extra_Config_Config_en_us$config, _rluiten$elm_date_extra$Date_Extra_Format$isoMsecFormat, date),
			'Z');
	};
	var _rluiten$elm_date_extra$Date_Extra_Format$isoFormat = '%Y-%m-%dT%H:%M:%S';

	var _rtfeldman$elm_css_util$Css_Helpers$toCssIdentifier = function (identifier) {
		return A4(
			_elm_lang$core$Regex$replace,
			_elm_lang$core$Regex$All,
			_elm_lang$core$Regex$regex('[^a-zA-Z0-9_-]'),
			function (_p0) {
				return '';
			},
			A4(
				_elm_lang$core$Regex$replace,
				_elm_lang$core$Regex$All,
				_elm_lang$core$Regex$regex('\\s+'),
				function (_p1) {
					return '-';
				},
				_elm_lang$core$String$trim(
					_elm_lang$core$Basics$toString(identifier))));
	};
	var _rtfeldman$elm_css_util$Css_Helpers$identifierToString = F2(
		function (name, identifier) {
			return A2(
				_elm_lang$core$Basics_ops['++'],
				_rtfeldman$elm_css_util$Css_Helpers$toCssIdentifier(name),
				_rtfeldman$elm_css_util$Css_Helpers$toCssIdentifier(identifier));
		});

	var _rtfeldman$elm_css$Css_Structure$dropEmptyDeclarations = function (declarations) {
		dropEmptyDeclarations:
		while (true) {
			var _p0 = declarations;
			if (_p0.ctor === '[]') {
				return _elm_lang$core$Native_List.fromArray(
					[]);
			} else {
				switch (_p0._0.ctor) {
					case 'StyleBlockDeclaration':
						var _p1 = _p0._1;
						if (_elm_lang$core$List$isEmpty(_p0._0._0._2)) {
							var _v1 = _p1;
							declarations = _v1;
							continue dropEmptyDeclarations;
						} else {
							return A2(
								_elm_lang$core$List_ops['::'],
								_p0._0,
								_rtfeldman$elm_css$Css_Structure$dropEmptyDeclarations(_p1));
						}
					case 'MediaRule':
						var _p4 = _p0._1;
						if (A2(
							_elm_lang$core$List$all,
							function (_p2) {
								var _p3 = _p2;
								return _elm_lang$core$List$isEmpty(_p3._2);
							},
							_p0._0._1)) {
							var _v3 = _p4;
							declarations = _v3;
							continue dropEmptyDeclarations;
						} else {
							return A2(
								_elm_lang$core$List_ops['::'],
								_p0._0,
								_rtfeldman$elm_css$Css_Structure$dropEmptyDeclarations(_p4));
						}
					case 'SupportsRule':
						var _p5 = _p0._1;
						if (_elm_lang$core$List$isEmpty(_p0._0._1)) {
							var _v4 = _p5;
							declarations = _v4;
							continue dropEmptyDeclarations;
						} else {
							return A2(
								_elm_lang$core$List_ops['::'],
								_p0._0,
								_rtfeldman$elm_css$Css_Structure$dropEmptyDeclarations(_p5));
						}
					case 'DocumentRule':
						return A2(
							_elm_lang$core$List_ops['::'],
							_p0._0,
							_rtfeldman$elm_css$Css_Structure$dropEmptyDeclarations(_p0._1));
					case 'PageRule':
						var _p6 = _p0._1;
						if (_elm_lang$core$List$isEmpty(_p0._0._1)) {
							var _v5 = _p6;
							declarations = _v5;
							continue dropEmptyDeclarations;
						} else {
							return A2(
								_elm_lang$core$List_ops['::'],
								_p0._0,
								_rtfeldman$elm_css$Css_Structure$dropEmptyDeclarations(_p6));
						}
					case 'FontFace':
						var _p7 = _p0._1;
						if (_elm_lang$core$List$isEmpty(_p0._0._0)) {
							var _v6 = _p7;
							declarations = _v6;
							continue dropEmptyDeclarations;
						} else {
							return A2(
								_elm_lang$core$List_ops['::'],
								_p0._0,
								_rtfeldman$elm_css$Css_Structure$dropEmptyDeclarations(_p7));
						}
					case 'Keyframes':
						var _p8 = _p0._1;
						if (_elm_lang$core$List$isEmpty(_p0._0._1)) {
							var _v7 = _p8;
							declarations = _v7;
							continue dropEmptyDeclarations;
						} else {
							return A2(
								_elm_lang$core$List_ops['::'],
								_p0._0,
								_rtfeldman$elm_css$Css_Structure$dropEmptyDeclarations(_p8));
						}
					case 'Viewport':
						var _p9 = _p0._1;
						if (_elm_lang$core$List$isEmpty(_p0._0._0)) {
							var _v8 = _p9;
							declarations = _v8;
							continue dropEmptyDeclarations;
						} else {
							return A2(
								_elm_lang$core$List_ops['::'],
								_p0._0,
								_rtfeldman$elm_css$Css_Structure$dropEmptyDeclarations(_p9));
						}
					case 'CounterStyle':
						var _p10 = _p0._1;
						if (_elm_lang$core$List$isEmpty(_p0._0._0)) {
							var _v9 = _p10;
							declarations = _v9;
							continue dropEmptyDeclarations;
						} else {
							return A2(
								_elm_lang$core$List_ops['::'],
								_p0._0,
								_rtfeldman$elm_css$Css_Structure$dropEmptyDeclarations(_p10));
						}
					default:
						var _p13 = _p0._1;
						if (A2(
							_elm_lang$core$List$all,
							function (_p11) {
								var _p12 = _p11;
								return _elm_lang$core$List$isEmpty(_p12._1);
							},
							_p0._0._0)) {
							var _v11 = _p13;
							declarations = _v11;
							continue dropEmptyDeclarations;
						} else {
							return A2(
								_elm_lang$core$List_ops['::'],
								_p0._0,
								_rtfeldman$elm_css$Css_Structure$dropEmptyDeclarations(_p13));
						}
				}
			}
		}
	};
	var _rtfeldman$elm_css$Css_Structure$dropEmpty = function (_p14) {
		var _p15 = _p14;
		return {
			charset: _p15.charset,
			imports: _p15.imports,
			namespaces: _p15.namespaces,
			declarations: _rtfeldman$elm_css$Css_Structure$dropEmptyDeclarations(_p15.declarations)
		};
	};
	var _rtfeldman$elm_css$Css_Structure$concatMapLast = F2(
		function (update, list) {
			var _p16 = list;
			if (_p16.ctor === '[]') {
				return list;
			} else {
				if (_p16._1.ctor === '[]') {
					return update(_p16._0);
				} else {
					return A2(
						_elm_lang$core$List_ops['::'],
						_p16._0,
						A2(_rtfeldman$elm_css$Css_Structure$concatMapLast, update, _p16._1));
				}
			}
		});
	var _rtfeldman$elm_css$Css_Structure$mapLast = F2(
		function (update, list) {
			var _p17 = list;
			if (_p17.ctor === '[]') {
				return list;
			} else {
				if (_p17._1.ctor === '[]') {
					return _elm_lang$core$Native_List.fromArray(
						[
							update(_p17._0)
						]);
				} else {
					return A2(
						_elm_lang$core$List_ops['::'],
						_p17._0,
						A2(_rtfeldman$elm_css$Css_Structure$mapLast, update, _p17._1));
				}
			}
		});
	var _rtfeldman$elm_css$Css_Structure$Property = F3(
		function (a, b, c) {
			return {important: a, key: b, value: c};
		});
	var _rtfeldman$elm_css$Css_Structure$Stylesheet = F4(
		function (a, b, c, d) {
			return {charset: a, imports: b, namespaces: c, declarations: d};
		});
	var _rtfeldman$elm_css$Css_Structure$FontFeatureValues = function (a) {
		return {ctor: 'FontFeatureValues', _0: a};
	};
	var _rtfeldman$elm_css$Css_Structure$CounterStyle = function (a) {
		return {ctor: 'CounterStyle', _0: a};
	};
	var _rtfeldman$elm_css$Css_Structure$Viewport = function (a) {
		return {ctor: 'Viewport', _0: a};
	};
	var _rtfeldman$elm_css$Css_Structure$Keyframes = F2(
		function (a, b) {
			return {ctor: 'Keyframes', _0: a, _1: b};
		});
	var _rtfeldman$elm_css$Css_Structure$FontFace = function (a) {
		return {ctor: 'FontFace', _0: a};
	};
	var _rtfeldman$elm_css$Css_Structure$PageRule = F2(
		function (a, b) {
			return {ctor: 'PageRule', _0: a, _1: b};
		});
	var _rtfeldman$elm_css$Css_Structure$DocumentRule = F5(
		function (a, b, c, d, e) {
			return {ctor: 'DocumentRule', _0: a, _1: b, _2: c, _3: d, _4: e};
		});
	var _rtfeldman$elm_css$Css_Structure$SupportsRule = F2(
		function (a, b) {
			return {ctor: 'SupportsRule', _0: a, _1: b};
		});
	var _rtfeldman$elm_css$Css_Structure$MediaRule = F2(
		function (a, b) {
			return {ctor: 'MediaRule', _0: a, _1: b};
		});
	var _rtfeldman$elm_css$Css_Structure$StyleBlockDeclaration = function (a) {
		return {ctor: 'StyleBlockDeclaration', _0: a};
	};
	var _rtfeldman$elm_css$Css_Structure$concatMapLastStyleBlock = F2(
		function (update, declarations) {
			var _p18 = declarations;
			_v15_12:
			do {
				if (_p18.ctor === '[]') {
					return declarations;
				} else {
					if (_p18._1.ctor === '[]') {
						switch (_p18._0.ctor) {
							case 'StyleBlockDeclaration':
								return A2(
									_elm_lang$core$List$map,
									_rtfeldman$elm_css$Css_Structure$StyleBlockDeclaration,
									update(_p18._0._0));
							case 'MediaRule':
								if (_p18._0._1.ctor === '::') {
									if (_p18._0._1._1.ctor === '[]') {
										return _elm_lang$core$Native_List.fromArray(
											[
												A2(
												_rtfeldman$elm_css$Css_Structure$MediaRule,
												_p18._0._0,
												update(_p18._0._1._0))
											]);
									} else {
										var _p19 = A2(
											_rtfeldman$elm_css$Css_Structure$concatMapLastStyleBlock,
											update,
											_elm_lang$core$Native_List.fromArray(
												[
													A2(_rtfeldman$elm_css$Css_Structure$MediaRule, _p18._0._0, _p18._0._1._1)
												]));
										if (((_p19.ctor === '::') && (_p19._0.ctor === 'MediaRule')) && (_p19._1.ctor === '[]')) {
											return _elm_lang$core$Native_List.fromArray(
												[
													A2(
													_rtfeldman$elm_css$Css_Structure$MediaRule,
													_p19._0._0,
													A2(_elm_lang$core$List_ops['::'], _p18._0._1._0, _p19._0._1))
												]);
										} else {
											return _p19;
										}
									}
								} else {
									break _v15_12;
								}
							case 'SupportsRule':
								return _elm_lang$core$Native_List.fromArray(
									[
										A2(
										_rtfeldman$elm_css$Css_Structure$SupportsRule,
										_p18._0._0,
										A2(_rtfeldman$elm_css$Css_Structure$concatMapLastStyleBlock, update, _p18._0._1))
									]);
							case 'DocumentRule':
								return A2(
									_elm_lang$core$List$map,
									A4(_rtfeldman$elm_css$Css_Structure$DocumentRule, _p18._0._0, _p18._0._1, _p18._0._2, _p18._0._3),
									update(_p18._0._4));
							case 'PageRule':
								return declarations;
							case 'FontFace':
								return declarations;
							case 'Keyframes':
								return declarations;
							case 'Viewport':
								return declarations;
							case 'CounterStyle':
								return declarations;
							default:
								return declarations;
						}
					} else {
						break _v15_12;
					}
				}
			} while(false);
			return A2(
				_elm_lang$core$List_ops['::'],
				_p18._0,
				A2(_rtfeldman$elm_css$Css_Structure$concatMapLastStyleBlock, update, _p18._1));
		});
	var _rtfeldman$elm_css$Css_Structure$StyleBlock = F3(
		function (a, b, c) {
			return {ctor: 'StyleBlock', _0: a, _1: b, _2: c};
		});
	var _rtfeldman$elm_css$Css_Structure$withPropertyAppended = F2(
		function (property, _p20) {
			var _p21 = _p20;
			return A3(
				_rtfeldman$elm_css$Css_Structure$StyleBlock,
				_p21._0,
				_p21._1,
				A2(
					_elm_lang$core$Basics_ops['++'],
					_p21._2,
					_elm_lang$core$Native_List.fromArray(
						[property])));
		});
	var _rtfeldman$elm_css$Css_Structure$appendProperty = F2(
		function (property, declarations) {
			var _p22 = declarations;
			if (_p22.ctor === '[]') {
				return declarations;
			} else {
				if (_p22._1.ctor === '[]') {
					switch (_p22._0.ctor) {
						case 'StyleBlockDeclaration':
							return _elm_lang$core$Native_List.fromArray(
								[
									_rtfeldman$elm_css$Css_Structure$StyleBlockDeclaration(
									A2(_rtfeldman$elm_css$Css_Structure$withPropertyAppended, property, _p22._0._0))
								]);
						case 'MediaRule':
							return _elm_lang$core$Native_List.fromArray(
								[
									A2(
									_rtfeldman$elm_css$Css_Structure$MediaRule,
									_p22._0._0,
									A2(
										_rtfeldman$elm_css$Css_Structure$mapLast,
										_rtfeldman$elm_css$Css_Structure$withPropertyAppended(property),
										_p22._0._1))
								]);
						default:
							return declarations;
					}
				} else {
					return A2(
						_elm_lang$core$List_ops['::'],
						_p22._0,
						A2(_rtfeldman$elm_css$Css_Structure$appendProperty, property, _p22._1));
				}
			}
		});
	var _rtfeldman$elm_css$Css_Structure$MediaQuery = function (a) {
		return {ctor: 'MediaQuery', _0: a};
	};
	var _rtfeldman$elm_css$Css_Structure$Selector = F3(
		function (a, b, c) {
			return {ctor: 'Selector', _0: a, _1: b, _2: c};
		});
	var _rtfeldman$elm_css$Css_Structure$CustomSelector = F2(
		function (a, b) {
			return {ctor: 'CustomSelector', _0: a, _1: b};
		});
	var _rtfeldman$elm_css$Css_Structure$UniversalSelectorSequence = function (a) {
		return {ctor: 'UniversalSelectorSequence', _0: a};
	};
	var _rtfeldman$elm_css$Css_Structure$TypeSelectorSequence = F2(
		function (a, b) {
			return {ctor: 'TypeSelectorSequence', _0: a, _1: b};
		});
	var _rtfeldman$elm_css$Css_Structure$appendRepeatable = F2(
		function (selector, sequence) {
			var _p23 = sequence;
			switch (_p23.ctor) {
				case 'TypeSelectorSequence':
					return A2(
						_rtfeldman$elm_css$Css_Structure$TypeSelectorSequence,
						_p23._0,
						A2(
							_elm_lang$core$Basics_ops['++'],
							_p23._1,
							_elm_lang$core$Native_List.fromArray(
								[selector])));
				case 'UniversalSelectorSequence':
					return _rtfeldman$elm_css$Css_Structure$UniversalSelectorSequence(
						A2(
							_elm_lang$core$Basics_ops['++'],
							_p23._0,
							_elm_lang$core$Native_List.fromArray(
								[selector])));
				default:
					return A2(
						_rtfeldman$elm_css$Css_Structure$CustomSelector,
						_p23._0,
						A2(
							_elm_lang$core$Basics_ops['++'],
							_p23._1,
							_elm_lang$core$Native_List.fromArray(
								[selector])));
			}
		});
	var _rtfeldman$elm_css$Css_Structure$appendRepeatableWithCombinator = F2(
		function (selector, list) {
			var _p24 = list;
			if (_p24.ctor === '[]') {
				return _elm_lang$core$Native_List.fromArray(
					[]);
			} else {
				if ((_p24._0.ctor === '_Tuple2') && (_p24._1.ctor === '[]')) {
					return _elm_lang$core$Native_List.fromArray(
						[
							{
							ctor: '_Tuple2',
							_0: _p24._0._0,
							_1: A2(_rtfeldman$elm_css$Css_Structure$appendRepeatable, selector, _p24._0._1)
						}
						]);
				} else {
					return A2(
						_elm_lang$core$List_ops['::'],
						_p24._0,
						A2(_rtfeldman$elm_css$Css_Structure$appendRepeatableWithCombinator, selector, _p24._1));
				}
			}
		});
	var _rtfeldman$elm_css$Css_Structure$appendRepeatableSelector = F2(
		function (repeatableSimpleSelector, selector) {
			var _p25 = selector;
			if (_p25._1.ctor === '[]') {
				return A3(
					_rtfeldman$elm_css$Css_Structure$Selector,
					A2(_rtfeldman$elm_css$Css_Structure$appendRepeatable, repeatableSimpleSelector, _p25._0),
					_elm_lang$core$Native_List.fromArray(
						[]),
					_p25._2);
			} else {
				return A3(
					_rtfeldman$elm_css$Css_Structure$Selector,
					_p25._0,
					A2(_rtfeldman$elm_css$Css_Structure$appendRepeatableWithCombinator, repeatableSimpleSelector, _p25._1),
					_p25._2);
			}
		});
	var _rtfeldman$elm_css$Css_Structure$extendLastSelector = F2(
		function (selector, declarations) {
			var _p26 = declarations;
			_v22_15:
			do {
				if (_p26.ctor === '[]') {
					return declarations;
				} else {
					if (_p26._1.ctor === '[]') {
						switch (_p26._0.ctor) {
							case 'StyleBlockDeclaration':
								if (_p26._0._0._1.ctor === '[]') {
									return _elm_lang$core$Native_List.fromArray(
										[
											_rtfeldman$elm_css$Css_Structure$StyleBlockDeclaration(
											A3(
												_rtfeldman$elm_css$Css_Structure$StyleBlock,
												A2(_rtfeldman$elm_css$Css_Structure$appendRepeatableSelector, selector, _p26._0._0._0),
												_elm_lang$core$Native_List.fromArray(
													[]),
												_p26._0._0._2))
										]);
								} else {
									var newRest = A2(
										_rtfeldman$elm_css$Css_Structure$mapLast,
										_rtfeldman$elm_css$Css_Structure$appendRepeatableSelector(selector),
										_p26._0._0._1);
									return _elm_lang$core$Native_List.fromArray(
										[
											_rtfeldman$elm_css$Css_Structure$StyleBlockDeclaration(
											A3(_rtfeldman$elm_css$Css_Structure$StyleBlock, _p26._0._0._0, newRest, _p26._0._0._2))
										]);
								}
							case 'MediaRule':
								if (_p26._0._1.ctor === '::') {
									if (_p26._0._1._1.ctor === '[]') {
										if (_p26._0._1._0._1.ctor === '[]') {
											var newStyleBlock = A3(
												_rtfeldman$elm_css$Css_Structure$StyleBlock,
												A2(_rtfeldman$elm_css$Css_Structure$appendRepeatableSelector, selector, _p26._0._1._0._0),
												_elm_lang$core$Native_List.fromArray(
													[]),
												_p26._0._1._0._2);
											return _elm_lang$core$Native_List.fromArray(
												[
													A2(
													_rtfeldman$elm_css$Css_Structure$MediaRule,
													_p26._0._0,
													_elm_lang$core$Native_List.fromArray(
														[newStyleBlock]))
												]);
										} else {
											var newRest = A2(
												_rtfeldman$elm_css$Css_Structure$mapLast,
												_rtfeldman$elm_css$Css_Structure$appendRepeatableSelector(selector),
												_p26._0._1._0._1);
											var newStyleBlock = A3(_rtfeldman$elm_css$Css_Structure$StyleBlock, _p26._0._1._0._0, newRest, _p26._0._1._0._2);
											return _elm_lang$core$Native_List.fromArray(
												[
													A2(
													_rtfeldman$elm_css$Css_Structure$MediaRule,
													_p26._0._0,
													_elm_lang$core$Native_List.fromArray(
														[newStyleBlock]))
												]);
										}
									} else {
										var _p27 = A2(
											_rtfeldman$elm_css$Css_Structure$extendLastSelector,
											selector,
											_elm_lang$core$Native_List.fromArray(
												[
													A2(_rtfeldman$elm_css$Css_Structure$MediaRule, _p26._0._0, _p26._0._1._1)
												]));
										if (((_p27.ctor === '::') && (_p27._0.ctor === 'MediaRule')) && (_p27._1.ctor === '[]')) {
											return _elm_lang$core$Native_List.fromArray(
												[
													A2(
													_rtfeldman$elm_css$Css_Structure$MediaRule,
													_p27._0._0,
													A2(_elm_lang$core$List_ops['::'], _p26._0._1._0, _p27._0._1))
												]);
										} else {
											return _p27;
										}
									}
								} else {
									break _v22_15;
								}
							case 'SupportsRule':
								return _elm_lang$core$Native_List.fromArray(
									[
										A2(
										_rtfeldman$elm_css$Css_Structure$SupportsRule,
										_p26._0._0,
										A2(_rtfeldman$elm_css$Css_Structure$extendLastSelector, selector, _p26._0._1))
									]);
							case 'DocumentRule':
								if (_p26._0._4._1.ctor === '[]') {
									var newStyleBlock = A3(
										_rtfeldman$elm_css$Css_Structure$StyleBlock,
										A2(_rtfeldman$elm_css$Css_Structure$appendRepeatableSelector, selector, _p26._0._4._0),
										_elm_lang$core$Native_List.fromArray(
											[]),
										_p26._0._4._2);
									return _elm_lang$core$Native_List.fromArray(
										[
											A5(_rtfeldman$elm_css$Css_Structure$DocumentRule, _p26._0._0, _p26._0._1, _p26._0._2, _p26._0._3, newStyleBlock)
										]);
								} else {
									var newRest = A2(
										_rtfeldman$elm_css$Css_Structure$mapLast,
										_rtfeldman$elm_css$Css_Structure$appendRepeatableSelector(selector),
										_p26._0._4._1);
									var newStyleBlock = A3(_rtfeldman$elm_css$Css_Structure$StyleBlock, _p26._0._4._0, newRest, _p26._0._4._2);
									return _elm_lang$core$Native_List.fromArray(
										[
											A5(_rtfeldman$elm_css$Css_Structure$DocumentRule, _p26._0._0, _p26._0._1, _p26._0._2, _p26._0._3, newStyleBlock)
										]);
								}
							case 'PageRule':
								return declarations;
							case 'FontFace':
								return declarations;
							case 'Keyframes':
								return declarations;
							case 'Viewport':
								return declarations;
							case 'CounterStyle':
								return declarations;
							default:
								return declarations;
						}
					} else {
						break _v22_15;
					}
				}
			} while(false);
			return A2(
				_elm_lang$core$List_ops['::'],
				_p26._0,
				A2(_rtfeldman$elm_css$Css_Structure$extendLastSelector, selector, _p26._1));
		});
	var _rtfeldman$elm_css$Css_Structure$appendToLastSelector = F2(
		function (selector, styleBlock) {
			var _p28 = styleBlock;
			if (_p28._1.ctor === '[]') {
				var _p29 = _p28._0;
				return _elm_lang$core$Native_List.fromArray(
					[
						A3(
						_rtfeldman$elm_css$Css_Structure$StyleBlock,
						_p29,
						_elm_lang$core$Native_List.fromArray(
							[]),
						_p28._2),
						A3(
						_rtfeldman$elm_css$Css_Structure$StyleBlock,
						A2(_rtfeldman$elm_css$Css_Structure$appendRepeatableSelector, selector, _p29),
						_elm_lang$core$Native_List.fromArray(
							[]),
						_elm_lang$core$Native_List.fromArray(
							[]))
					]);
			} else {
				var _p31 = _p28._1;
				var _p30 = _p28._0;
				var newRest = A2(
					_rtfeldman$elm_css$Css_Structure$mapLast,
					_rtfeldman$elm_css$Css_Structure$appendRepeatableSelector(selector),
					_p31);
				return _elm_lang$core$Native_List.fromArray(
					[
						A3(_rtfeldman$elm_css$Css_Structure$StyleBlock, _p30, _p31, _p28._2),
						A3(
						_rtfeldman$elm_css$Css_Structure$StyleBlock,
						_p30,
						newRest,
						_elm_lang$core$Native_List.fromArray(
							[]))
					]);
			}
		});
	var _rtfeldman$elm_css$Css_Structure$PseudoClassSelector = function (a) {
		return {ctor: 'PseudoClassSelector', _0: a};
	};
	var _rtfeldman$elm_css$Css_Structure$IdSelector = function (a) {
		return {ctor: 'IdSelector', _0: a};
	};
	var _rtfeldman$elm_css$Css_Structure$ClassSelector = function (a) {
		return {ctor: 'ClassSelector', _0: a};
	};
	var _rtfeldman$elm_css$Css_Structure$TypeSelector = function (a) {
		return {ctor: 'TypeSelector', _0: a};
	};
	var _rtfeldman$elm_css$Css_Structure$PseudoElement = function (a) {
		return {ctor: 'PseudoElement', _0: a};
	};
	var _rtfeldman$elm_css$Css_Structure$Descendant = {ctor: 'Descendant'};
	var _rtfeldman$elm_css$Css_Structure$Child = {ctor: 'Child'};
	var _rtfeldman$elm_css$Css_Structure$GeneralSibling = {ctor: 'GeneralSibling'};
	var _rtfeldman$elm_css$Css_Structure$AdjacentSibling = {ctor: 'AdjacentSibling'};

	var _rtfeldman$elm_css$Css_Preprocess$propertyToPair = function (property) {
		var value = property.important ? A2(_elm_lang$core$Basics_ops['++'], property.value, ' !important') : property.value;
		return {ctor: '_Tuple2', _0: property.key, _1: value};
	};
	var _rtfeldman$elm_css$Css_Preprocess$toPropertyPairs = function (mixins) {
		toPropertyPairs:
		while (true) {
			var _p0 = mixins;
			if (_p0.ctor === '[]') {
				return _elm_lang$core$Native_List.fromArray(
					[]);
			} else {
				switch (_p0._0.ctor) {
					case 'AppendProperty':
						return A2(
							_elm_lang$core$List_ops['::'],
							_rtfeldman$elm_css$Css_Preprocess$propertyToPair(_p0._0._0),
							_rtfeldman$elm_css$Css_Preprocess$toPropertyPairs(_p0._1));
					case 'ApplyMixins':
						return A2(
							_elm_lang$core$Basics_ops['++'],
							_rtfeldman$elm_css$Css_Preprocess$toPropertyPairs(_p0._0._0),
							_rtfeldman$elm_css$Css_Preprocess$toPropertyPairs(_p0._1));
					default:
						var _v1 = _p0._1;
						mixins = _v1;
						continue toPropertyPairs;
				}
			}
		}
	};
	var _rtfeldman$elm_css$Css_Preprocess$unwrapSnippet = function (_p1) {
		var _p2 = _p1;
		return _p2._0;
	};
	var _rtfeldman$elm_css$Css_Preprocess$toMediaRule = F2(
		function (mediaQueries, declaration) {
			var _p3 = declaration;
			switch (_p3.ctor) {
				case 'StyleBlockDeclaration':
					return A2(
						_rtfeldman$elm_css$Css_Structure$MediaRule,
						mediaQueries,
						_elm_lang$core$Native_List.fromArray(
							[_p3._0]));
				case 'MediaRule':
					return A2(
						_rtfeldman$elm_css$Css_Structure$MediaRule,
						A2(_elm_lang$core$Basics_ops['++'], mediaQueries, _p3._0),
						_p3._1);
				case 'SupportsRule':
					return A2(
						_rtfeldman$elm_css$Css_Structure$SupportsRule,
						_p3._0,
						A2(
							_elm_lang$core$List$map,
							_rtfeldman$elm_css$Css_Preprocess$toMediaRule(mediaQueries),
							_p3._1));
				case 'DocumentRule':
					return A5(_rtfeldman$elm_css$Css_Structure$DocumentRule, _p3._0, _p3._1, _p3._2, _p3._3, _p3._4);
				case 'PageRule':
					return declaration;
				case 'FontFace':
					return declaration;
				case 'Keyframes':
					return declaration;
				case 'Viewport':
					return declaration;
				case 'CounterStyle':
					return declaration;
				default:
					return declaration;
			}
		});
	var _rtfeldman$elm_css$Css_Preprocess$stylesheet = function (snippets) {
		return {
			charset: _elm_lang$core$Maybe$Nothing,
			imports: _elm_lang$core$Native_List.fromArray(
				[]),
			namespaces: _elm_lang$core$Native_List.fromArray(
				[]),
			snippets: snippets
		};
	};
	var _rtfeldman$elm_css$Css_Preprocess$Property = F4(
		function (a, b, c, d) {
			return {key: a, value: b, important: c, warnings: d};
		});
	var _rtfeldman$elm_css$Css_Preprocess$Stylesheet = F4(
		function (a, b, c, d) {
			return {charset: a, imports: b, namespaces: c, snippets: d};
		});
	var _rtfeldman$elm_css$Css_Preprocess$ApplyMixins = function (a) {
		return {ctor: 'ApplyMixins', _0: a};
	};
	var _rtfeldman$elm_css$Css_Preprocess$WithMedia = F2(
		function (a, b) {
			return {ctor: 'WithMedia', _0: a, _1: b};
		});
	var _rtfeldman$elm_css$Css_Preprocess$WithPseudoElement = F2(
		function (a, b) {
			return {ctor: 'WithPseudoElement', _0: a, _1: b};
		});
	var _rtfeldman$elm_css$Css_Preprocess$NestSnippet = F2(
		function (a, b) {
			return {ctor: 'NestSnippet', _0: a, _1: b};
		});
	var _rtfeldman$elm_css$Css_Preprocess$ExtendSelector = F2(
		function (a, b) {
			return {ctor: 'ExtendSelector', _0: a, _1: b};
		});
	var _rtfeldman$elm_css$Css_Preprocess$AppendProperty = function (a) {
		return {ctor: 'AppendProperty', _0: a};
	};
	var _rtfeldman$elm_css$Css_Preprocess$mapLastProperty = F2(
		function (update, mixin) {
			var _p4 = mixin;
			switch (_p4.ctor) {
				case 'AppendProperty':
					return _rtfeldman$elm_css$Css_Preprocess$AppendProperty(
						update(_p4._0));
				case 'ExtendSelector':
					return A2(
						_rtfeldman$elm_css$Css_Preprocess$ExtendSelector,
						_p4._0,
						A2(_rtfeldman$elm_css$Css_Preprocess$mapAllLastProperty, update, _p4._1));
				case 'NestSnippet':
					return mixin;
				case 'WithPseudoElement':
					return mixin;
				case 'WithMedia':
					return mixin;
				default:
					return _rtfeldman$elm_css$Css_Preprocess$ApplyMixins(
						A2(
							_rtfeldman$elm_css$Css_Structure$mapLast,
							_rtfeldman$elm_css$Css_Preprocess$mapLastProperty(update),
							_p4._0));
			}
		});
	var _rtfeldman$elm_css$Css_Preprocess$mapAllLastProperty = F2(
		function (update, mixins) {
			var _p5 = mixins;
			if (_p5.ctor === '[]') {
				return mixins;
			} else {
				if (_p5._1.ctor === '[]') {
					return _elm_lang$core$Native_List.fromArray(
						[
							A2(_rtfeldman$elm_css$Css_Preprocess$mapLastProperty, update, _p5._0)
						]);
				} else {
					return A2(
						_elm_lang$core$List_ops['::'],
						_p5._0,
						A2(_rtfeldman$elm_css$Css_Preprocess$mapAllLastProperty, update, _p5._1));
				}
			}
		});
	var _rtfeldman$elm_css$Css_Preprocess$Snippet = function (a) {
		return {ctor: 'Snippet', _0: a};
	};
	var _rtfeldman$elm_css$Css_Preprocess$FontFeatureValues = function (a) {
		return {ctor: 'FontFeatureValues', _0: a};
	};
	var _rtfeldman$elm_css$Css_Preprocess$CounterStyle = function (a) {
		return {ctor: 'CounterStyle', _0: a};
	};
	var _rtfeldman$elm_css$Css_Preprocess$Viewport = function (a) {
		return {ctor: 'Viewport', _0: a};
	};
	var _rtfeldman$elm_css$Css_Preprocess$Keyframes = F2(
		function (a, b) {
			return {ctor: 'Keyframes', _0: a, _1: b};
		});
	var _rtfeldman$elm_css$Css_Preprocess$FontFace = function (a) {
		return {ctor: 'FontFace', _0: a};
	};
	var _rtfeldman$elm_css$Css_Preprocess$PageRule = F2(
		function (a, b) {
			return {ctor: 'PageRule', _0: a, _1: b};
		});
	var _rtfeldman$elm_css$Css_Preprocess$DocumentRule = F5(
		function (a, b, c, d, e) {
			return {ctor: 'DocumentRule', _0: a, _1: b, _2: c, _3: d, _4: e};
		});
	var _rtfeldman$elm_css$Css_Preprocess$SupportsRule = F2(
		function (a, b) {
			return {ctor: 'SupportsRule', _0: a, _1: b};
		});
	var _rtfeldman$elm_css$Css_Preprocess$MediaRule = F2(
		function (a, b) {
			return {ctor: 'MediaRule', _0: a, _1: b};
		});
	var _rtfeldman$elm_css$Css_Preprocess$StyleBlockDeclaration = function (a) {
		return {ctor: 'StyleBlockDeclaration', _0: a};
	};
	var _rtfeldman$elm_css$Css_Preprocess$StyleBlock = F3(
		function (a, b, c) {
			return {ctor: 'StyleBlock', _0: a, _1: b, _2: c};
		});

	var _rtfeldman$elm_css$Css_Structure_Output$indent = function (str) {
		return A2(_elm_lang$core$Basics_ops['++'], '    ', str);
	};
	var _rtfeldman$elm_css$Css_Structure_Output$prettyPrintProperty = function (_p0) {
		var _p1 = _p0;
		var suffix = _p1.important ? ' !important;' : ';';
		return A2(
			_elm_lang$core$Basics_ops['++'],
			_p1.key,
			A2(
				_elm_lang$core$Basics_ops['++'],
				': ',
				A2(_elm_lang$core$Basics_ops['++'], _p1.value, suffix)));
	};
	var _rtfeldman$elm_css$Css_Structure_Output$prettyPrintProperties = function (properties) {
		return A2(
			_elm_lang$core$String$join,
			'\n',
			A2(
				_elm_lang$core$List$map,
				function (_p2) {
					return _rtfeldman$elm_css$Css_Structure_Output$indent(
						_rtfeldman$elm_css$Css_Structure_Output$prettyPrintProperty(_p2));
				},
				properties));
	};
	var _rtfeldman$elm_css$Css_Structure_Output$combinatorToString = function (combinator) {
		var _p3 = combinator;
		switch (_p3.ctor) {
			case 'AdjacentSibling':
				return '+';
			case 'GeneralSibling':
				return '~';
			case 'Child':
				return '>';
			default:
				return '';
		}
	};
	var _rtfeldman$elm_css$Css_Structure_Output$pseudoElementToString = function (_p4) {
		var _p5 = _p4;
		return A2(_elm_lang$core$Basics_ops['++'], '::', _p5._0);
	};
	var _rtfeldman$elm_css$Css_Structure_Output$repeatableSimpleSelectorToString = function (repeatableSimpleSelector) {
		var _p6 = repeatableSimpleSelector;
		switch (_p6.ctor) {
			case 'ClassSelector':
				return A2(_elm_lang$core$Basics_ops['++'], '.', _p6._0);
			case 'IdSelector':
				return A2(_elm_lang$core$Basics_ops['++'], '#', _p6._0);
			default:
				return A2(_elm_lang$core$Basics_ops['++'], ':', _p6._0);
		}
	};
	var _rtfeldman$elm_css$Css_Structure_Output$simpleSelectorSequenceToString = function (simpleSelectorSequence) {
		var _p7 = simpleSelectorSequence;
		switch (_p7.ctor) {
			case 'TypeSelectorSequence':
				return A2(
					_elm_lang$core$String$join,
					'',
					A2(
						_elm_lang$core$List_ops['::'],
						_p7._0._0,
						A2(_elm_lang$core$List$map, _rtfeldman$elm_css$Css_Structure_Output$repeatableSimpleSelectorToString, _p7._1)));
			case 'UniversalSelectorSequence':
				var _p8 = _p7._0;
				return _elm_lang$core$List$isEmpty(_p8) ? '*' : A2(
					_elm_lang$core$String$join,
					'',
					A2(_elm_lang$core$List$map, _rtfeldman$elm_css$Css_Structure_Output$repeatableSimpleSelectorToString, _p8));
			default:
				return A2(
					_elm_lang$core$String$join,
					'',
					A2(
						_elm_lang$core$List_ops['::'],
						_p7._0,
						A2(_elm_lang$core$List$map, _rtfeldman$elm_css$Css_Structure_Output$repeatableSimpleSelectorToString, _p7._1)));
		}
	};
	var _rtfeldman$elm_css$Css_Structure_Output$selectorChainToString = function (_p9) {
		var _p10 = _p9;
		return A2(
			_elm_lang$core$String$join,
			' ',
			_elm_lang$core$Native_List.fromArray(
				[
					_rtfeldman$elm_css$Css_Structure_Output$combinatorToString(_p10._0),
					_rtfeldman$elm_css$Css_Structure_Output$simpleSelectorSequenceToString(_p10._1)
				]));
	};
	var _rtfeldman$elm_css$Css_Structure_Output$selectorToString = function (_p11) {
		var _p12 = _p11;
		var segments = A2(
			_elm_lang$core$Basics_ops['++'],
			_elm_lang$core$Native_List.fromArray(
				[
					_rtfeldman$elm_css$Css_Structure_Output$simpleSelectorSequenceToString(_p12._0)
				]),
			A2(
				_elm_lang$core$Basics_ops['++'],
				A2(_elm_lang$core$List$map, _rtfeldman$elm_css$Css_Structure_Output$selectorChainToString, _p12._1),
				_elm_lang$core$Native_List.fromArray(
					[
						A2(
						_elm_lang$core$Maybe$withDefault,
						'',
						A2(_elm_lang$core$Maybe$map, _rtfeldman$elm_css$Css_Structure_Output$pseudoElementToString, _p12._2))
					])));
		return A2(
			_elm_lang$core$String$join,
			' ',
			A2(
				_elm_lang$core$List$filter,
				function (_p13) {
					return _elm_lang$core$Basics$not(
						_elm_lang$core$String$isEmpty(_p13));
				},
				segments));
	};
	var _rtfeldman$elm_css$Css_Structure_Output$prettyPrintStyleBlock = function (_p14) {
		var _p15 = _p14;
		var selectorStr = A2(
			_elm_lang$core$String$join,
			', ',
			A2(
				_elm_lang$core$List$map,
				_rtfeldman$elm_css$Css_Structure_Output$selectorToString,
				A2(_elm_lang$core$List_ops['::'], _p15._0, _p15._1)));
		return A2(
			_elm_lang$core$Basics_ops['++'],
			selectorStr,
			A2(
				_elm_lang$core$Basics_ops['++'],
				' {\n',
				A2(
					_elm_lang$core$Basics_ops['++'],
					_rtfeldman$elm_css$Css_Structure_Output$prettyPrintProperties(_p15._2),
					'\n}')));
	};
	var _rtfeldman$elm_css$Css_Structure_Output$prettyPrintDeclaration = function (declaration) {
		var _p16 = declaration;
		switch (_p16.ctor) {
			case 'StyleBlockDeclaration':
				return _rtfeldman$elm_css$Css_Structure_Output$prettyPrintStyleBlock(_p16._0);
			case 'MediaRule':
				var query = A2(
					_elm_lang$core$String$join,
					' ',
					A2(
						_elm_lang$core$List$map,
						function (_p17) {
							var _p18 = _p17;
							return _p18._0;
						},
						_p16._0));
				var blocks = A2(
					_elm_lang$core$String$join,
					'\n\n',
					A2(
						_elm_lang$core$List$map,
						function (_p19) {
							return _rtfeldman$elm_css$Css_Structure_Output$indent(
								_rtfeldman$elm_css$Css_Structure_Output$prettyPrintStyleBlock(_p19));
						},
						_p16._1));
				return A2(
					_elm_lang$core$Basics_ops['++'],
					'@media ',
					A2(
						_elm_lang$core$Basics_ops['++'],
						query,
						A2(
							_elm_lang$core$Basics_ops['++'],
							' {\n',
							A2(
								_elm_lang$core$Basics_ops['++'],
								_rtfeldman$elm_css$Css_Structure_Output$indent(blocks),
								'\n}'))));
			default:
				return _elm_lang$core$Native_Utils.crashCase(
					'Css.Structure.Output',
					{
						start: {line: 56, column: 5},
						end: {line: 73, column: 49}
					},
					_p16)('not yet implemented :x');
		}
	};
	var _rtfeldman$elm_css$Css_Structure_Output$namespaceToString = function (_p21) {
		var _p22 = _p21;
		return A2(
			_elm_lang$core$Basics_ops['++'],
			'@namespace ',
			A2(
				_elm_lang$core$Basics_ops['++'],
				_p22._0,
				A2(
					_elm_lang$core$Basics_ops['++'],
					'\"',
					A2(_elm_lang$core$Basics_ops['++'], _p22._1, '\"'))));
	};
	var _rtfeldman$elm_css$Css_Structure_Output$importToString = function (_p23) {
		var _p24 = _p23;
		return A2(
			_elm_lang$core$Basics_ops['++'],
			'@import \"',
			A2(
				_elm_lang$core$Basics_ops['++'],
				_p24._0,
				A2(
					_elm_lang$core$Basics_ops['++'],
					_elm_lang$core$Basics$toString(_p24._1),
					'\"')));
	};
	var _rtfeldman$elm_css$Css_Structure_Output$charsetToString = function (charset) {
		return A2(
			_elm_lang$core$Maybe$withDefault,
			'',
			A2(
				_elm_lang$core$Maybe$map,
				function (str) {
					return A2(
						_elm_lang$core$Basics_ops['++'],
						'@charset \"',
						A2(_elm_lang$core$Basics_ops['++'], str, '\"'));
				},
				charset));
	};
	var _rtfeldman$elm_css$Css_Structure_Output$prettyPrint = function (_p25) {
		var _p26 = _p25;
		return A2(
			_elm_lang$core$String$join,
			'\n\n',
			A2(
				_elm_lang$core$List$filter,
				function (_p27) {
					return _elm_lang$core$Basics$not(
						_elm_lang$core$String$isEmpty(_p27));
				},
				_elm_lang$core$Native_List.fromArray(
					[
						_rtfeldman$elm_css$Css_Structure_Output$charsetToString(_p26.charset),
						A2(
						_elm_lang$core$String$join,
						'\n',
						A2(_elm_lang$core$List$map, _rtfeldman$elm_css$Css_Structure_Output$importToString, _p26.imports)),
						A2(
						_elm_lang$core$String$join,
						'\n',
						A2(_elm_lang$core$List$map, _rtfeldman$elm_css$Css_Structure_Output$namespaceToString, _p26.namespaces)),
						A2(
						_elm_lang$core$String$join,
						'\n\n',
						A2(_elm_lang$core$List$map, _rtfeldman$elm_css$Css_Structure_Output$prettyPrintDeclaration, _p26.declarations))
					])));
	};

	var _rtfeldman$elm_css$Css_Preprocess_Resolve$collectSelectors = function (declarations) {
		collectSelectors:
		while (true) {
			var _p0 = declarations;
			if (_p0.ctor === '[]') {
				return _elm_lang$core$Native_List.fromArray(
					[]);
			} else {
				if (_p0._0.ctor === 'StyleBlockDeclaration') {
					return A2(
						_elm_lang$core$Basics_ops['++'],
						A2(_elm_lang$core$List_ops['::'], _p0._0._0._0, _p0._0._0._1),
						_rtfeldman$elm_css$Css_Preprocess_Resolve$collectSelectors(_p0._1));
				} else {
					var _v1 = _p0._1;
					declarations = _v1;
					continue collectSelectors;
				}
			}
		}
	};
	var _rtfeldman$elm_css$Css_Preprocess_Resolve$extractWarning = function (_p1) {
		var _p2 = _p1;
		return {
			ctor: '_Tuple2',
			_0: _p2.warnings,
			_1: {key: _p2.key, value: _p2.value, important: _p2.important}
		};
	};
	var _rtfeldman$elm_css$Css_Preprocess_Resolve$extractWarnings = function (properties) {
		return {
			ctor: '_Tuple2',
			_0: A2(
				_elm_lang$core$List$concatMap,
				function (_) {
					return _.warnings;
				},
				properties),
			_1: A2(
				_elm_lang$core$List$map,
				function (prop) {
					return _elm_lang$core$Basics$snd(
						_rtfeldman$elm_css$Css_Preprocess_Resolve$extractWarning(prop));
				},
				properties)
		};
	};
	var _rtfeldman$elm_css$Css_Preprocess_Resolve$toDocumentRule = F5(
		function (str1, str2, str3, str4, declaration) {
			var _p3 = declaration;
			if (_p3.ctor === 'StyleBlockDeclaration') {
				return A5(_rtfeldman$elm_css$Css_Structure$DocumentRule, str1, str2, str3, str4, _p3._0);
			} else {
				return declaration;
			}
		});
	var _rtfeldman$elm_css$Css_Preprocess_Resolve$concatDeclarationsAndWarnings = function (declarationsAndWarnings) {
		var _p4 = declarationsAndWarnings;
		if (_p4.ctor === '[]') {
			return {
				declarations: _elm_lang$core$Native_List.fromArray(
					[]),
				warnings: _elm_lang$core$Native_List.fromArray(
					[])
			};
		} else {
			var result = _rtfeldman$elm_css$Css_Preprocess_Resolve$concatDeclarationsAndWarnings(_p4._1);
			return {
				declarations: A2(_elm_lang$core$Basics_ops['++'], _p4._0.declarations, result.declarations),
				warnings: A2(_elm_lang$core$Basics_ops['++'], _p4._0.warnings, result.warnings)
			};
		}
	};
	var _rtfeldman$elm_css$Css_Preprocess_Resolve$resolveFontFeatureValues = function (tuples) {
		var expandTuples = function (tuplesToExpand) {
			var _p5 = tuplesToExpand;
			if (_p5.ctor === '[]') {
				return {
					ctor: '_Tuple2',
					_0: _elm_lang$core$Native_List.fromArray(
						[]),
					_1: _elm_lang$core$Native_List.fromArray(
						[])
				};
			} else {
				var _p6 = expandTuples(_p5._1);
				var nextWarnings = _p6._0;
				var nextTuples = _p6._1;
				var _p7 = _rtfeldman$elm_css$Css_Preprocess_Resolve$extractWarnings(_p5._0._1);
				var warnings = _p7._0;
				var properties = _p7._1;
				return {
					ctor: '_Tuple2',
					_0: A2(_elm_lang$core$Basics_ops['++'], warnings, nextWarnings),
					_1: A2(
						_elm_lang$core$List_ops['::'],
						{ctor: '_Tuple2', _0: _p5._0._0, _1: properties},
						nextTuples)
				};
			}
		};
		var _p8 = expandTuples(tuples);
		var warnings = _p8._0;
		var newTuples = _p8._1;
		return {
			declarations: _elm_lang$core$Native_List.fromArray(
				[
					_rtfeldman$elm_css$Css_Structure$FontFeatureValues(newTuples)
				]),
			warnings: warnings
		};
	};
	var _rtfeldman$elm_css$Css_Preprocess_Resolve$resolveCounterStyle = function (counterStyleProperties) {
		var _p9 = _rtfeldman$elm_css$Css_Preprocess_Resolve$extractWarnings(counterStyleProperties);
		var warnings = _p9._0;
		var properties = _p9._1;
		return {
			declarations: _elm_lang$core$Native_List.fromArray(
				[
					_rtfeldman$elm_css$Css_Structure$Viewport(properties)
				]),
			warnings: warnings
		};
	};
	var _rtfeldman$elm_css$Css_Preprocess_Resolve$resolveViewport = function (viewportProperties) {
		var _p10 = _rtfeldman$elm_css$Css_Preprocess_Resolve$extractWarnings(viewportProperties);
		var warnings = _p10._0;
		var properties = _p10._1;
		return {
			declarations: _elm_lang$core$Native_List.fromArray(
				[
					_rtfeldman$elm_css$Css_Structure$Viewport(properties)
				]),
			warnings: warnings
		};
	};
	var _rtfeldman$elm_css$Css_Preprocess_Resolve$resolveKeyframes = F2(
		function (str, properties) {
			return {
				declarations: _elm_lang$core$Native_List.fromArray(
					[
						A2(_rtfeldman$elm_css$Css_Structure$Keyframes, str, properties)
					]),
				warnings: _elm_lang$core$Native_List.fromArray(
					[])
			};
		});
	var _rtfeldman$elm_css$Css_Preprocess_Resolve$resolveFontFace = function (fontFaceProperties) {
		var _p11 = _rtfeldman$elm_css$Css_Preprocess_Resolve$extractWarnings(fontFaceProperties);
		var warnings = _p11._0;
		var properties = _p11._1;
		return {
			declarations: _elm_lang$core$Native_List.fromArray(
				[
					_rtfeldman$elm_css$Css_Structure$FontFace(properties)
				]),
			warnings: warnings
		};
	};
	var _rtfeldman$elm_css$Css_Preprocess_Resolve$resolvePageRule = F2(
		function (str, pageRuleProperties) {
			var _p12 = _rtfeldman$elm_css$Css_Preprocess_Resolve$extractWarnings(pageRuleProperties);
			var warnings = _p12._0;
			var properties = _p12._1;
			return {
				declarations: _elm_lang$core$Native_List.fromArray(
					[
						A2(_rtfeldman$elm_css$Css_Structure$PageRule, str, properties)
					]),
				warnings: warnings
			};
		});
	var _rtfeldman$elm_css$Css_Preprocess_Resolve$toMediaRule = F2(
		function (mediaQueries, declaration) {
			var _p13 = declaration;
			switch (_p13.ctor) {
				case 'StyleBlockDeclaration':
					return A2(
						_rtfeldman$elm_css$Css_Structure$MediaRule,
						mediaQueries,
						_elm_lang$core$Native_List.fromArray(
							[_p13._0]));
				case 'MediaRule':
					return A2(
						_rtfeldman$elm_css$Css_Structure$MediaRule,
						A2(_elm_lang$core$Basics_ops['++'], mediaQueries, _p13._0),
						_p13._1);
				case 'SupportsRule':
					return A2(
						_rtfeldman$elm_css$Css_Structure$SupportsRule,
						_p13._0,
						A2(
							_elm_lang$core$List$map,
							_rtfeldman$elm_css$Css_Preprocess_Resolve$toMediaRule(mediaQueries),
							_p13._1));
				case 'DocumentRule':
					return A5(_rtfeldman$elm_css$Css_Structure$DocumentRule, _p13._0, _p13._1, _p13._2, _p13._3, _p13._4);
				case 'PageRule':
					return declaration;
				case 'FontFace':
					return declaration;
				case 'Keyframes':
					return declaration;
				case 'Viewport':
					return declaration;
				case 'CounterStyle':
					return declaration;
				default:
					return declaration;
			}
		});
	var _rtfeldman$elm_css$Css_Preprocess_Resolve$resolveMediaRule = F2(
		function (mediaQueries, styleBlocks) {
			var handleStyleBlock = function (styleBlock) {
				var _p14 = _rtfeldman$elm_css$Css_Preprocess_Resolve$expandStyleBlock(styleBlock);
				var declarations = _p14.declarations;
				var warnings = _p14.warnings;
				return {
					declarations: A2(
						_elm_lang$core$List$map,
						_rtfeldman$elm_css$Css_Preprocess_Resolve$toMediaRule(mediaQueries),
						declarations),
					warnings: warnings
				};
			};
			var results = A2(_elm_lang$core$List$map, handleStyleBlock, styleBlocks);
			return {
				warnings: A2(
					_elm_lang$core$List$concatMap,
					function (_) {
						return _.warnings;
					},
					results),
				declarations: A2(
					_elm_lang$core$List$concatMap,
					function (_) {
						return _.declarations;
					},
					results)
			};
		});
	var _rtfeldman$elm_css$Css_Preprocess_Resolve$expandStyleBlock = function (_p15) {
		var _p16 = _p15;
		return A2(
			_rtfeldman$elm_css$Css_Preprocess_Resolve$applyMixins,
			_p16._2,
			_elm_lang$core$Native_List.fromArray(
				[
					_rtfeldman$elm_css$Css_Structure$StyleBlockDeclaration(
					A3(
						_rtfeldman$elm_css$Css_Structure$StyleBlock,
						_p16._0,
						_p16._1,
						_elm_lang$core$Native_List.fromArray(
							[])))
				]));
	};
	var _rtfeldman$elm_css$Css_Preprocess_Resolve$applyMixins = F2(
		function (mixins, declarations) {
			applyMixins:
			while (true) {
				var _p17 = mixins;
				if (_p17.ctor === '[]') {
					return {
						declarations: declarations,
						warnings: _elm_lang$core$Native_List.fromArray(
							[])
					};
				} else {
					switch (_p17._0.ctor) {
						case 'AppendProperty':
							var _p18 = _rtfeldman$elm_css$Css_Preprocess_Resolve$extractWarning(_p17._0._0);
							var warnings = _p18._0;
							var property = _p18._1;
							var result = A2(
								_rtfeldman$elm_css$Css_Preprocess_Resolve$applyMixins,
								_p17._1,
								A2(_rtfeldman$elm_css$Css_Structure$appendProperty, property, declarations));
							return {
								declarations: result.declarations,
								warnings: A2(_elm_lang$core$Basics_ops['++'], warnings, result.warnings)
							};
						case 'ExtendSelector':
							var handleInitial = function (declarationsAndWarnings) {
								var result = A2(_rtfeldman$elm_css$Css_Preprocess_Resolve$applyMixins, _p17._0._1, declarationsAndWarnings.declarations);
								return {
									warnings: A2(_elm_lang$core$Basics_ops['++'], declarationsAndWarnings.warnings, result.warnings),
									declarations: result.declarations
								};
							};
							var initialResult = _rtfeldman$elm_css$Css_Preprocess_Resolve$concatDeclarationsAndWarnings(
								A2(
									_rtfeldman$elm_css$Css_Structure$mapLast,
									handleInitial,
									A2(
										_elm_lang$core$List$map,
										function (declaration) {
											return {
												declarations: _elm_lang$core$Native_List.fromArray(
													[declaration]),
												warnings: _elm_lang$core$Native_List.fromArray(
													[])
											};
										},
										A2(
											_rtfeldman$elm_css$Css_Structure$concatMapLastStyleBlock,
											_rtfeldman$elm_css$Css_Structure$appendToLastSelector(_p17._0._0),
											declarations))));
							var nextResult = A2(_rtfeldman$elm_css$Css_Preprocess_Resolve$applyMixins, _p17._1, initialResult.declarations);
							return {
								warnings: A2(_elm_lang$core$Basics_ops['++'], initialResult.warnings, nextResult.warnings),
								declarations: nextResult.declarations
							};
						case 'NestSnippet':
							var chain = F2(
								function (_p20, _p19) {
									var _p21 = _p20;
									var _p22 = _p19;
									return A3(
										_rtfeldman$elm_css$Css_Structure$Selector,
										_p21._0,
										A2(
											_elm_lang$core$Basics_ops['++'],
											_p21._1,
											A2(
												_elm_lang$core$List_ops['::'],
												{ctor: '_Tuple2', _0: _p17._0._0, _1: _p22._0},
												_p22._1)),
										_elm_lang$core$Maybe$oneOf(
											_elm_lang$core$Native_List.fromArray(
												[_p22._2, _p21._2])));
								});
							var expandDeclaration = function (declaration) {
								var _p23 = declaration;
								switch (_p23.ctor) {
									case 'StyleBlockDeclaration':
										var newSelectors = A2(
											_elm_lang$core$List$concatMap,
											function (originalSelector) {
												return A2(
													_elm_lang$core$List$map,
													chain(originalSelector),
													A2(_elm_lang$core$List_ops['::'], _p23._0._0, _p23._0._1));
											},
											_rtfeldman$elm_css$Css_Preprocess_Resolve$collectSelectors(declarations));
										var newDeclarations = function () {
											var _p24 = newSelectors;
											if (_p24.ctor === '[]') {
												return _elm_lang$core$Native_List.fromArray(
													[]);
											} else {
												return _elm_lang$core$Native_List.fromArray(
													[
														_rtfeldman$elm_css$Css_Structure$StyleBlockDeclaration(
														A3(
															_rtfeldman$elm_css$Css_Structure$StyleBlock,
															_p24._0,
															_p24._1,
															_elm_lang$core$Native_List.fromArray(
																[])))
													]);
											}
										}();
										return _rtfeldman$elm_css$Css_Preprocess_Resolve$concatDeclarationsAndWarnings(
											_elm_lang$core$Native_List.fromArray(
												[
													A2(_rtfeldman$elm_css$Css_Preprocess_Resolve$applyMixins, _p23._0._2, newDeclarations)
												]));
									case 'MediaRule':
										return A2(_rtfeldman$elm_css$Css_Preprocess_Resolve$resolveMediaRule, _p23._0, _p23._1);
									case 'SupportsRule':
										return A2(_rtfeldman$elm_css$Css_Preprocess_Resolve$resolveSupportsRule, _p23._0, _p23._1);
									case 'DocumentRule':
										return A5(_rtfeldman$elm_css$Css_Preprocess_Resolve$resolveDocumentRule, _p23._0, _p23._1, _p23._2, _p23._3, _p23._4);
									case 'PageRule':
										return A2(_rtfeldman$elm_css$Css_Preprocess_Resolve$resolvePageRule, _p23._0, _p23._1);
									case 'FontFace':
										return _rtfeldman$elm_css$Css_Preprocess_Resolve$resolveFontFace(_p23._0);
									case 'Keyframes':
										return A2(_rtfeldman$elm_css$Css_Preprocess_Resolve$resolveKeyframes, _p23._0, _p23._1);
									case 'Viewport':
										return _rtfeldman$elm_css$Css_Preprocess_Resolve$resolveViewport(_p23._0);
									case 'CounterStyle':
										return _rtfeldman$elm_css$Css_Preprocess_Resolve$resolveCounterStyle(_p23._0);
									default:
										return _rtfeldman$elm_css$Css_Preprocess_Resolve$resolveFontFeatureValues(_p23._0);
								}
							};
							return _rtfeldman$elm_css$Css_Preprocess_Resolve$concatDeclarationsAndWarnings(
								A2(
									F2(
										function (x, y) {
											return A2(_elm_lang$core$Basics_ops['++'], x, y);
										}),
									_elm_lang$core$Native_List.fromArray(
										[
											A2(_rtfeldman$elm_css$Css_Preprocess_Resolve$applyMixins, _p17._1, declarations)
										]),
									A2(
										_elm_lang$core$List$map,
										expandDeclaration,
										A2(_elm_lang$core$List$concatMap, _rtfeldman$elm_css$Css_Preprocess$unwrapSnippet, _p17._0._1))));
						case 'WithPseudoElement':
							var _v13 = _p17._1,
								_v14 = declarations;
							mixins = _v13;
							declarations = _v14;
							continue applyMixins;
						case 'WithMedia':
							var newDeclarations = function () {
								var _p25 = _rtfeldman$elm_css$Css_Preprocess_Resolve$collectSelectors(declarations);
								if (_p25.ctor === '[]') {
									return _elm_lang$core$Native_List.fromArray(
										[]);
								} else {
									return _elm_lang$core$Native_List.fromArray(
										[
											A2(
											_rtfeldman$elm_css$Css_Structure$MediaRule,
											_p17._0._0,
											_elm_lang$core$Native_List.fromArray(
												[
													A3(
													_rtfeldman$elm_css$Css_Structure$StyleBlock,
													_p25._0,
													_p25._1,
													_elm_lang$core$Native_List.fromArray(
														[]))
												]))
										]);
								}
							}();
							return _rtfeldman$elm_css$Css_Preprocess_Resolve$concatDeclarationsAndWarnings(
								_elm_lang$core$Native_List.fromArray(
									[
										A2(_rtfeldman$elm_css$Css_Preprocess_Resolve$applyMixins, _p17._1, declarations),
										A2(_rtfeldman$elm_css$Css_Preprocess_Resolve$applyMixins, _p17._0._1, newDeclarations)
									]));
						default:
							var _v16 = A2(_elm_lang$core$Basics_ops['++'], _p17._0._0, _p17._1),
								_v17 = declarations;
							mixins = _v16;
							declarations = _v17;
							continue applyMixins;
					}
				}
			}
		});
	var _rtfeldman$elm_css$Css_Preprocess_Resolve$resolveDocumentRule = F5(
		function (str1, str2, str3, str4, styleBlock) {
			var _p26 = _rtfeldman$elm_css$Css_Preprocess_Resolve$expandStyleBlock(styleBlock);
			var declarations = _p26.declarations;
			var warnings = _p26.warnings;
			return {
				declarations: A2(
					_elm_lang$core$List$map,
					A4(_rtfeldman$elm_css$Css_Preprocess_Resolve$toDocumentRule, str1, str2, str3, str4),
					declarations),
				warnings: warnings
			};
		});
	var _rtfeldman$elm_css$Css_Preprocess_Resolve$resolveSupportsRule = F2(
		function (str, snippets) {
			var _p27 = _rtfeldman$elm_css$Css_Preprocess_Resolve$extract(
				A2(_elm_lang$core$List$concatMap, _rtfeldman$elm_css$Css_Preprocess$unwrapSnippet, snippets));
			var declarations = _p27.declarations;
			var warnings = _p27.warnings;
			return {
				declarations: _elm_lang$core$Native_List.fromArray(
					[
						A2(_rtfeldman$elm_css$Css_Structure$SupportsRule, str, declarations)
					]),
				warnings: warnings
			};
		});
	var _rtfeldman$elm_css$Css_Preprocess_Resolve$extract = function (snippetDeclarations) {
		var _p28 = snippetDeclarations;
		if (_p28.ctor === '[]') {
			return {
				declarations: _elm_lang$core$Native_List.fromArray(
					[]),
				warnings: _elm_lang$core$Native_List.fromArray(
					[])
			};
		} else {
			var _p29 = _rtfeldman$elm_css$Css_Preprocess_Resolve$toDeclarations(_p28._0);
			var declarations = _p29.declarations;
			var warnings = _p29.warnings;
			var nextResult = _rtfeldman$elm_css$Css_Preprocess_Resolve$extract(_p28._1);
			return {
				declarations: A2(_elm_lang$core$Basics_ops['++'], declarations, nextResult.declarations),
				warnings: A2(_elm_lang$core$Basics_ops['++'], warnings, nextResult.warnings)
			};
		}
	};
	var _rtfeldman$elm_css$Css_Preprocess_Resolve$toDeclarations = function (snippetDeclaration) {
		var _p30 = snippetDeclaration;
		switch (_p30.ctor) {
			case 'StyleBlockDeclaration':
				return _rtfeldman$elm_css$Css_Preprocess_Resolve$expandStyleBlock(_p30._0);
			case 'MediaRule':
				return A2(_rtfeldman$elm_css$Css_Preprocess_Resolve$resolveMediaRule, _p30._0, _p30._1);
			case 'SupportsRule':
				return A2(_rtfeldman$elm_css$Css_Preprocess_Resolve$resolveSupportsRule, _p30._0, _p30._1);
			case 'DocumentRule':
				return A5(_rtfeldman$elm_css$Css_Preprocess_Resolve$resolveDocumentRule, _p30._0, _p30._1, _p30._2, _p30._3, _p30._4);
			case 'PageRule':
				return A2(_rtfeldman$elm_css$Css_Preprocess_Resolve$resolvePageRule, _p30._0, _p30._1);
			case 'FontFace':
				return _rtfeldman$elm_css$Css_Preprocess_Resolve$resolveFontFace(_p30._0);
			case 'Keyframes':
				return A2(_rtfeldman$elm_css$Css_Preprocess_Resolve$resolveKeyframes, _p30._0, _p30._1);
			case 'Viewport':
				return _rtfeldman$elm_css$Css_Preprocess_Resolve$resolveViewport(_p30._0);
			case 'CounterStyle':
				return _rtfeldman$elm_css$Css_Preprocess_Resolve$resolveCounterStyle(_p30._0);
			default:
				return _rtfeldman$elm_css$Css_Preprocess_Resolve$resolveFontFeatureValues(_p30._0);
		}
	};
	var _rtfeldman$elm_css$Css_Preprocess_Resolve$toStructure = function (_p31) {
		var _p32 = _p31;
		var _p33 = _rtfeldman$elm_css$Css_Preprocess_Resolve$extract(
			A2(_elm_lang$core$List$concatMap, _rtfeldman$elm_css$Css_Preprocess$unwrapSnippet, _p32.snippets));
		var warnings = _p33.warnings;
		var declarations = _p33.declarations;
		return {
			ctor: '_Tuple2',
			_0: {charset: _p32.charset, imports: _p32.imports, namespaces: _p32.namespaces, declarations: declarations},
			_1: warnings
		};
	};
	var _rtfeldman$elm_css$Css_Preprocess_Resolve$compile = function (sheet) {
		var _p34 = _rtfeldman$elm_css$Css_Preprocess_Resolve$toStructure(sheet);
		var structureStylesheet = _p34._0;
		var warnings = _p34._1;
		return {
			warnings: warnings,
			css: _rtfeldman$elm_css$Css_Structure_Output$prettyPrint(
				_rtfeldman$elm_css$Css_Structure$dropEmpty(structureStylesheet))
		};
	};
	var _rtfeldman$elm_css$Css_Preprocess_Resolve$DeclarationsAndWarnings = F2(
		function (a, b) {
			return {declarations: a, warnings: b};
		});

	var _rtfeldman$elm_css$Css$asPairs = _rtfeldman$elm_css$Css_Preprocess$toPropertyPairs;
	var _rtfeldman$elm_css$Css$collectSelectors = function (declarations) {
		collectSelectors:
		while (true) {
			var _p0 = declarations;
			if (_p0.ctor === '[]') {
				return _elm_lang$core$Native_List.fromArray(
					[]);
			} else {
				if (_p0._0.ctor === 'StyleBlockDeclaration') {
					return A2(
						_elm_lang$core$Basics_ops['++'],
						A2(_elm_lang$core$List_ops['::'], _p0._0._0._0, _p0._0._0._1),
						_rtfeldman$elm_css$Css$collectSelectors(_p0._1));
				} else {
					var _v1 = _p0._1;
					declarations = _v1;
					continue collectSelectors;
				}
			}
		}
	};
	var _rtfeldman$elm_css$Css$compile = _rtfeldman$elm_css$Css_Preprocess_Resolve$compile;
	var _rtfeldman$elm_css$Css$stringsToValue = function (list) {
		return _elm_lang$core$List$isEmpty(list) ? {value: 'none'} : {
			value: A2(
				_elm_lang$core$String$join,
				', ',
				A2(
					_elm_lang$core$List$map,
					function (s) {
						return s;
					},
					list))
		};
	};
	var _rtfeldman$elm_css$Css$valuesOrNone = function (list) {
		return _elm_lang$core$List$isEmpty(list) ? {value: 'none'} : {
			value: A2(
				_elm_lang$core$String$join,
				' ',
				A2(
					_elm_lang$core$List$map,
					function (_) {
						return _.value;
					},
					list))
		};
	};
	var _rtfeldman$elm_css$Css$stringToInt = function (str) {
		return A2(
			_elm_lang$core$Result$withDefault,
			0,
			_elm_lang$core$String$toInt(str));
	};
	var _rtfeldman$elm_css$Css$numberToString = function (num) {
		return _elm_lang$core$Basics$toString(num + 0);
	};
	var _rtfeldman$elm_css$Css$numericalPercentageToString = function (value) {
		return A3(
			_elm_lang$core$Basics$flip,
			F2(
				function (x, y) {
					return A2(_elm_lang$core$Basics_ops['++'], x, y);
				}),
			'%',
			_rtfeldman$elm_css$Css$numberToString(
				A2(
					F2(
						function (x, y) {
							return x * y;
						}),
					100,
					value)));
	};
	var _rtfeldman$elm_css$Css$each = F2(
		function (snippetCreators, mixins) {
			var selectorsToSnippet = function (selectors) {
				var _p1 = selectors;
				if (_p1.ctor === '[]') {
					return _rtfeldman$elm_css$Css_Preprocess$Snippet(
						_elm_lang$core$Native_List.fromArray(
							[]));
				} else {
					return _rtfeldman$elm_css$Css_Preprocess$Snippet(
						_elm_lang$core$Native_List.fromArray(
							[
								_rtfeldman$elm_css$Css_Preprocess$StyleBlockDeclaration(
								A3(_rtfeldman$elm_css$Css_Preprocess$StyleBlock, _p1._0, _p1._1, mixins))
							]));
				}
			};
			return selectorsToSnippet(
				_rtfeldman$elm_css$Css$collectSelectors(
					A2(
						_elm_lang$core$List$concatMap,
						_rtfeldman$elm_css$Css_Preprocess$unwrapSnippet,
						A2(
							_elm_lang$core$List$map,
							F2(
								function (x, y) {
									return y(x);
								})(
								_elm_lang$core$Native_List.fromArray(
									[])),
							snippetCreators))));
		});
	var _rtfeldman$elm_css$Css$generalSiblings = _rtfeldman$elm_css$Css_Preprocess$NestSnippet(_rtfeldman$elm_css$Css_Structure$GeneralSibling);
	var _rtfeldman$elm_css$Css$adjacentSiblings = _rtfeldman$elm_css$Css_Preprocess$NestSnippet(_rtfeldman$elm_css$Css_Structure$AdjacentSibling);
	var _rtfeldman$elm_css$Css$descendants = _rtfeldman$elm_css$Css_Preprocess$NestSnippet(_rtfeldman$elm_css$Css_Structure$Descendant);
	var _rtfeldman$elm_css$Css$withClass = function ($class) {
		return _rtfeldman$elm_css$Css_Preprocess$ExtendSelector(
			_rtfeldman$elm_css$Css_Structure$ClassSelector(
				A2(_rtfeldman$elm_css_util$Css_Helpers$identifierToString, '', $class)));
	};
	var _rtfeldman$elm_css$Css$children = _rtfeldman$elm_css$Css_Preprocess$NestSnippet(_rtfeldman$elm_css$Css_Structure$Child);
	var _rtfeldman$elm_css$Css$selection = _rtfeldman$elm_css$Css_Preprocess$WithPseudoElement(
		_rtfeldman$elm_css$Css_Structure$PseudoElement('selection'));
	var _rtfeldman$elm_css$Css$firstLine = _rtfeldman$elm_css$Css_Preprocess$WithPseudoElement(
		_rtfeldman$elm_css$Css_Structure$PseudoElement('first-line'));
	var _rtfeldman$elm_css$Css$firstLetter = _rtfeldman$elm_css$Css_Preprocess$WithPseudoElement(
		_rtfeldman$elm_css$Css_Structure$PseudoElement('first-letter'));
	var _rtfeldman$elm_css$Css$before = _rtfeldman$elm_css$Css_Preprocess$WithPseudoElement(
		_rtfeldman$elm_css$Css_Structure$PseudoElement('before'));
	var _rtfeldman$elm_css$Css$after = _rtfeldman$elm_css$Css_Preprocess$WithPseudoElement(
		_rtfeldman$elm_css$Css_Structure$PseudoElement('after'));
	var _rtfeldman$elm_css$Css$valid = _rtfeldman$elm_css$Css_Preprocess$ExtendSelector(
		_rtfeldman$elm_css$Css_Structure$PseudoClassSelector('valid'));
	var _rtfeldman$elm_css$Css$target = _rtfeldman$elm_css$Css_Preprocess$ExtendSelector(
		_rtfeldman$elm_css$Css_Structure$PseudoClassSelector('target'));
	var _rtfeldman$elm_css$Css$scope = _rtfeldman$elm_css$Css_Preprocess$ExtendSelector(
		_rtfeldman$elm_css$Css_Structure$PseudoClassSelector('scope'));
	var _rtfeldman$elm_css$Css$root = _rtfeldman$elm_css$Css_Preprocess$ExtendSelector(
		_rtfeldman$elm_css$Css_Structure$PseudoClassSelector('root'));
	var _rtfeldman$elm_css$Css$required = _rtfeldman$elm_css$Css_Preprocess$ExtendSelector(
		_rtfeldman$elm_css$Css_Structure$PseudoClassSelector('required'));
	var _rtfeldman$elm_css$Css$readWrite = _rtfeldman$elm_css$Css_Preprocess$ExtendSelector(
		_rtfeldman$elm_css$Css_Structure$PseudoClassSelector('read-write'));
	var _rtfeldman$elm_css$Css$outOfRange = _rtfeldman$elm_css$Css_Preprocess$ExtendSelector(
		_rtfeldman$elm_css$Css_Structure$PseudoClassSelector('out-of-range'));
	var _rtfeldman$elm_css$Css$optional = _rtfeldman$elm_css$Css_Preprocess$ExtendSelector(
		_rtfeldman$elm_css$Css_Structure$PseudoClassSelector('optional'));
	var _rtfeldman$elm_css$Css$onlyOfType = _rtfeldman$elm_css$Css_Preprocess$ExtendSelector(
		_rtfeldman$elm_css$Css_Structure$PseudoClassSelector('only-of-type'));
	var _rtfeldman$elm_css$Css$onlyChild = _rtfeldman$elm_css$Css_Preprocess$ExtendSelector(
		_rtfeldman$elm_css$Css_Structure$PseudoClassSelector('only-child'));
	var _rtfeldman$elm_css$Css$nthOfType = function (str) {
		return _rtfeldman$elm_css$Css_Preprocess$ExtendSelector(
			_rtfeldman$elm_css$Css_Structure$PseudoClassSelector(
				A2(
					_elm_lang$core$Basics_ops['++'],
					'nth-of-type(',
					A2(_elm_lang$core$Basics_ops['++'], str, ')'))));
	};
	var _rtfeldman$elm_css$Css$nthLastOfType = function (str) {
		return _rtfeldman$elm_css$Css_Preprocess$ExtendSelector(
			_rtfeldman$elm_css$Css_Structure$PseudoClassSelector(
				A2(
					_elm_lang$core$Basics_ops['++'],
					'nth-last-of-type(',
					A2(_elm_lang$core$Basics_ops['++'], str, ')'))));
	};
	var _rtfeldman$elm_css$Css$nthLastChild = function (str) {
		return _rtfeldman$elm_css$Css_Preprocess$ExtendSelector(
			_rtfeldman$elm_css$Css_Structure$PseudoClassSelector(
				A2(
					_elm_lang$core$Basics_ops['++'],
					'nth-last-child(',
					A2(_elm_lang$core$Basics_ops['++'], str, ')'))));
	};
	var _rtfeldman$elm_css$Css$nthChild = function (str) {
		return _rtfeldman$elm_css$Css_Preprocess$ExtendSelector(
			_rtfeldman$elm_css$Css_Structure$PseudoClassSelector(
				A2(
					_elm_lang$core$Basics_ops['++'],
					'nth-child(',
					A2(_elm_lang$core$Basics_ops['++'], str, ')'))));
	};
	var _rtfeldman$elm_css$Css$link = _rtfeldman$elm_css$Css_Preprocess$ExtendSelector(
		_rtfeldman$elm_css$Css_Structure$PseudoClassSelector('link'));
	var _rtfeldman$elm_css$Css$lastOfType = _rtfeldman$elm_css$Css_Preprocess$ExtendSelector(
		_rtfeldman$elm_css$Css_Structure$PseudoClassSelector('last-of-type'));
	var _rtfeldman$elm_css$Css$lastChild = _rtfeldman$elm_css$Css_Preprocess$ExtendSelector(
		_rtfeldman$elm_css$Css_Structure$PseudoClassSelector('last-child'));
	var _rtfeldman$elm_css$Css$lang = function (str) {
		return _rtfeldman$elm_css$Css_Preprocess$ExtendSelector(
			_rtfeldman$elm_css$Css_Structure$PseudoClassSelector(
				A2(
					_elm_lang$core$Basics_ops['++'],
					'lang(',
					A2(_elm_lang$core$Basics_ops['++'], str, ')'))));
	};
	var _rtfeldman$elm_css$Css$invalid = _rtfeldman$elm_css$Css_Preprocess$ExtendSelector(
		_rtfeldman$elm_css$Css_Structure$PseudoClassSelector('invalid'));
	var _rtfeldman$elm_css$Css$indeterminate = _rtfeldman$elm_css$Css_Preprocess$ExtendSelector(
		_rtfeldman$elm_css$Css_Structure$PseudoClassSelector('indeterminate'));
	var _rtfeldman$elm_css$Css$hover = _rtfeldman$elm_css$Css_Preprocess$ExtendSelector(
		_rtfeldman$elm_css$Css_Structure$PseudoClassSelector('hover'));
	var _rtfeldman$elm_css$Css$focus = _rtfeldman$elm_css$Css_Preprocess$ExtendSelector(
		_rtfeldman$elm_css$Css_Structure$PseudoClassSelector('focus'));
	var _rtfeldman$elm_css$Css$fullscreen = _rtfeldman$elm_css$Css_Preprocess$ExtendSelector(
		_rtfeldman$elm_css$Css_Structure$PseudoClassSelector('fullscreen'));
	var _rtfeldman$elm_css$Css$firstOfType = _rtfeldman$elm_css$Css_Preprocess$ExtendSelector(
		_rtfeldman$elm_css$Css_Structure$PseudoClassSelector('first-of-type'));
	var _rtfeldman$elm_css$Css$firstChild = _rtfeldman$elm_css$Css_Preprocess$ExtendSelector(
		_rtfeldman$elm_css$Css_Structure$PseudoClassSelector('first-child'));
	var _rtfeldman$elm_css$Css$first = _rtfeldman$elm_css$Css_Preprocess$ExtendSelector(
		_rtfeldman$elm_css$Css_Structure$PseudoClassSelector('first'));
	var _rtfeldman$elm_css$Css$enabled = _rtfeldman$elm_css$Css_Preprocess$ExtendSelector(
		_rtfeldman$elm_css$Css_Structure$PseudoClassSelector('enabled'));
	var _rtfeldman$elm_css$Css$empty = _rtfeldman$elm_css$Css_Preprocess$ExtendSelector(
		_rtfeldman$elm_css$Css_Structure$PseudoClassSelector('empty'));
	var _rtfeldman$elm_css$Css$disabled = _rtfeldman$elm_css$Css_Preprocess$ExtendSelector(
		_rtfeldman$elm_css$Css_Structure$PseudoClassSelector('disabled'));
	var _rtfeldman$elm_css$Css$checked = _rtfeldman$elm_css$Css_Preprocess$ExtendSelector(
		_rtfeldman$elm_css$Css_Structure$PseudoClassSelector('checked'));
	var _rtfeldman$elm_css$Css$any = function (str) {
		return _rtfeldman$elm_css$Css_Preprocess$ExtendSelector(
			_rtfeldman$elm_css$Css_Structure$PseudoClassSelector(
				A2(
					_elm_lang$core$Basics_ops['++'],
					'any(',
					A2(_elm_lang$core$Basics_ops['++'], str, ')'))));
	};
	var _rtfeldman$elm_css$Css$active = _rtfeldman$elm_css$Css_Preprocess$ExtendSelector(
		_rtfeldman$elm_css$Css_Structure$PseudoClassSelector('active'));
	var _rtfeldman$elm_css$Css$directionalityToString = function (directionality) {
		var _p2 = directionality;
		if (_p2.ctor === 'Ltr') {
			return 'ltr';
		} else {
			return 'rtl';
		}
	};
	var _rtfeldman$elm_css$Css$dir = function (directionality) {
		return _rtfeldman$elm_css$Css_Preprocess$ExtendSelector(
			_rtfeldman$elm_css$Css_Structure$PseudoClassSelector(
				A2(
					_elm_lang$core$Basics_ops['++'],
					'dir(',
					A2(
						_elm_lang$core$Basics_ops['++'],
						_rtfeldman$elm_css$Css$directionalityToString(directionality),
						')'))));
	};
	var _rtfeldman$elm_css$Css$propertyWithWarnings = F3(
		function (warnings, key, value) {
			return _rtfeldman$elm_css$Css_Preprocess$AppendProperty(
				{key: key, value: value, important: false, warnings: warnings});
		});
	var _rtfeldman$elm_css$Css$property = _rtfeldman$elm_css$Css$propertyWithWarnings(
		_elm_lang$core$Native_List.fromArray(
			[]));
	var _rtfeldman$elm_css$Css$makeSnippet = F2(
		function (mixins, sequence) {
			var selector = A3(
				_rtfeldman$elm_css$Css_Structure$Selector,
				sequence,
				_elm_lang$core$Native_List.fromArray(
					[]),
				_elm_lang$core$Maybe$Nothing);
			return _rtfeldman$elm_css$Css_Preprocess$Snippet(
				_elm_lang$core$Native_List.fromArray(
					[
						_rtfeldman$elm_css$Css_Preprocess$StyleBlockDeclaration(
						A3(
							_rtfeldman$elm_css$Css_Preprocess$StyleBlock,
							selector,
							_elm_lang$core$Native_List.fromArray(
								[]),
							mixins))
					]));
		});
	var _rtfeldman$elm_css$Css_ops = _rtfeldman$elm_css$Css_ops || {};
	_rtfeldman$elm_css$Css_ops['.'] = F2(
		function ($class, mixins) {
			return A2(
				_rtfeldman$elm_css$Css$makeSnippet,
				mixins,
				_rtfeldman$elm_css$Css_Structure$UniversalSelectorSequence(
					_elm_lang$core$Native_List.fromArray(
						[
							_rtfeldman$elm_css$Css_Structure$ClassSelector(
							A2(_rtfeldman$elm_css_util$Css_Helpers$identifierToString, '', $class))
						])));
		});
	var _rtfeldman$elm_css$Css$selector = F2(
		function (selectorStr, mixins) {
			return A2(
				_rtfeldman$elm_css$Css$makeSnippet,
				mixins,
				A2(
					_rtfeldman$elm_css$Css_Structure$CustomSelector,
					selectorStr,
					_elm_lang$core$Native_List.fromArray(
						[])));
		});
	var _rtfeldman$elm_css$Css$everything = function (mixins) {
		return A2(
			_rtfeldman$elm_css$Css$makeSnippet,
			mixins,
			_rtfeldman$elm_css$Css_Structure$UniversalSelectorSequence(
				_elm_lang$core$Native_List.fromArray(
					[])));
	};
	var _rtfeldman$elm_css$Css_ops = _rtfeldman$elm_css$Css_ops || {};
	_rtfeldman$elm_css$Css_ops['#'] = F2(
		function (id, mixins) {
			return A2(
				_rtfeldman$elm_css$Css$makeSnippet,
				mixins,
				_rtfeldman$elm_css$Css_Structure$UniversalSelectorSequence(
					_elm_lang$core$Native_List.fromArray(
						[
							_rtfeldman$elm_css$Css_Structure$IdSelector(
							A2(_rtfeldman$elm_css_util$Css_Helpers$identifierToString, '', id))
						])));
		});
	var _rtfeldman$elm_css$Css$mixin = _rtfeldman$elm_css$Css_Preprocess$ApplyMixins;
	var _rtfeldman$elm_css$Css$stylesheet = _rtfeldman$elm_css$Css_Preprocess$stylesheet;
	var _rtfeldman$elm_css$Css$animationNames = function (identifiers) {
		var value = A2(
			_elm_lang$core$String$join,
			', ',
			A2(
				_elm_lang$core$List$map,
				_rtfeldman$elm_css_util$Css_Helpers$identifierToString(''),
				identifiers));
		return A2(_rtfeldman$elm_css$Css$property, 'animation-name', value);
	};
	var _rtfeldman$elm_css$Css$animationName = function (identifier) {
		return _rtfeldman$elm_css$Css$animationNames(
			_elm_lang$core$Native_List.fromArray(
				[identifier]));
	};
	var _rtfeldman$elm_css$Css$fontWeight = function (_p3) {
		var _p4 = _p3;
		var _p5 = _p4.value;
		var validWeight = function (weight) {
			return (!_elm_lang$core$Native_Utils.eq(
				_p5,
				_elm_lang$core$Basics$toString(weight))) ? true : A2(
				_elm_lang$core$List$member,
				weight,
				A2(
					_elm_lang$core$List$map,
					F2(
						function (x, y) {
							return x * y;
						})(100),
					_elm_lang$core$Native_List.range(1, 9)));
		};
		var warnings = validWeight(
			_rtfeldman$elm_css$Css$stringToInt(_p5)) ? _elm_lang$core$Native_List.fromArray(
			[]) : _elm_lang$core$Native_List.fromArray(
			[
				A2(
				_elm_lang$core$Basics_ops['++'],
				'fontWeight ',
				A2(_elm_lang$core$Basics_ops['++'], _p5, ' is invalid. Valid weights are: 100, 200, 300, 400, 500, 600, 700, 800, 900. Please see https://developer.mozilla.org/en-US/docs/Web/CSS/font-weight#Values'))
			]);
		return A3(_rtfeldman$elm_css$Css$propertyWithWarnings, warnings, 'font-weight', _p5);
	};
	var _rtfeldman$elm_css$Css$fontFeatureSettingsList = function (featureTagValues) {
		var warnings = _elm_lang$core$List$concat(
			A2(
				_elm_lang$core$List$map,
				function (_) {
					return _.warnings;
				},
				featureTagValues));
		var value = A2(
			_elm_lang$core$String$join,
			', ',
			A2(
				_elm_lang$core$List$map,
				function (_) {
					return _.value;
				},
				featureTagValues));
		return A3(_rtfeldman$elm_css$Css$propertyWithWarnings, warnings, 'font-feature-settings', value);
	};
	var _rtfeldman$elm_css$Css$fontFeatureSettings = function (_p6) {
		var _p7 = _p6;
		return A3(_rtfeldman$elm_css$Css$propertyWithWarnings, _p7.warnings, 'font-feature-settings', _p7.value);
	};
	var _rtfeldman$elm_css$Css$qt = function (str) {
		return _elm_lang$core$Basics$toString(str);
	};
	var _rtfeldman$elm_css$Css$fontFace = function (value) {
		return A2(_elm_lang$core$Basics_ops['++'], 'font-face ', value);
	};
	var _rtfeldman$elm_css$Css$src = function (value) {
		return _elm_lang$core$Basics$toString(value.value);
	};
	var _rtfeldman$elm_css$Css$withMedia = _rtfeldman$elm_css$Css_Preprocess$WithMedia;
	var _rtfeldman$elm_css$Css$media = F2(
		function (mediaQueries, snippets) {
			var nestedMediaRules = function (declarations) {
				nestedMediaRules:
				while (true) {
					var _p8 = declarations;
					if (_p8.ctor === '[]') {
						return _elm_lang$core$Native_List.fromArray(
							[]);
					} else {
						switch (_p8._0.ctor) {
							case 'StyleBlockDeclaration':
								var _v7 = _p8._1;
								declarations = _v7;
								continue nestedMediaRules;
							case 'MediaRule':
								return A2(
									_elm_lang$core$List_ops['::'],
									A2(
										_rtfeldman$elm_css$Css_Preprocess$MediaRule,
										A2(_elm_lang$core$Basics_ops['++'], mediaQueries, _p8._0._0),
										_p8._0._1),
									nestedMediaRules(_p8._1));
							default:
								return A2(
									_elm_lang$core$List_ops['::'],
									_p8._0,
									nestedMediaRules(_p8._1));
						}
					}
				}
			};
			var extractStyleBlocks = function (declarations) {
				extractStyleBlocks:
				while (true) {
					var _p9 = declarations;
					if (_p9.ctor === '[]') {
						return _elm_lang$core$Native_List.fromArray(
							[]);
					} else {
						if (_p9._0.ctor === 'StyleBlockDeclaration') {
							return A2(
								_elm_lang$core$List_ops['::'],
								_p9._0._0,
								extractStyleBlocks(_p9._1));
						} else {
							var _v9 = _p9._1;
							declarations = _v9;
							continue extractStyleBlocks;
						}
					}
				}
			};
			var snippetDeclarations = A2(_elm_lang$core$List$concatMap, _rtfeldman$elm_css$Css_Preprocess$unwrapSnippet, snippets);
			var mediaRuleFromStyleBlocks = A2(
				_rtfeldman$elm_css$Css_Preprocess$MediaRule,
				mediaQueries,
				extractStyleBlocks(snippetDeclarations));
			return _rtfeldman$elm_css$Css_Preprocess$Snippet(
				A2(
					_elm_lang$core$List_ops['::'],
					mediaRuleFromStyleBlocks,
					nestedMediaRules(snippetDeclarations)));
		});
	var _rtfeldman$elm_css$Css$mediaQuery = F2(
		function (queryString, snippets) {
			return A2(
				_rtfeldman$elm_css$Css$media,
				_elm_lang$core$Native_List.fromArray(
					[
						_rtfeldman$elm_css$Css_Structure$MediaQuery(queryString)
					]),
				snippets);
		});
	var _rtfeldman$elm_css$Css$color = function (c) {
		return A3(_rtfeldman$elm_css$Css$propertyWithWarnings, c.warnings, 'color', c.value);
	};
	var _rtfeldman$elm_css$Css$backgroundColor = function (c) {
		return A3(_rtfeldman$elm_css$Css$propertyWithWarnings, c.warnings, 'background-color', c.value);
	};
	var _rtfeldman$elm_css$Css$borderColor4 = F4(
		function (c1, c2, c3, c4) {
			var value = A2(
				_elm_lang$core$String$join,
				' ',
				_elm_lang$core$Native_List.fromArray(
					[c1.value, c2.value, c3.value, c4.value]));
			var warnings = A2(
				_elm_lang$core$Basics_ops['++'],
				c1.warnings,
				A2(
					_elm_lang$core$Basics_ops['++'],
					c2.warnings,
					A2(_elm_lang$core$Basics_ops['++'], c3.warnings, c4.warnings)));
			return A3(_rtfeldman$elm_css$Css$propertyWithWarnings, warnings, 'border-color', value);
		});
	var _rtfeldman$elm_css$Css$borderColor3 = F3(
		function (c1, c2, c3) {
			var value = A2(
				_elm_lang$core$String$join,
				' ',
				_elm_lang$core$Native_List.fromArray(
					[c1.value, c2.value, c3.value]));
			var warnings = A2(
				_elm_lang$core$Basics_ops['++'],
				c1.warnings,
				A2(_elm_lang$core$Basics_ops['++'], c2.warnings, c3.warnings));
			return A3(_rtfeldman$elm_css$Css$propertyWithWarnings, warnings, 'border-color', value);
		});
	var _rtfeldman$elm_css$Css$borderColor2 = F2(
		function (c1, c2) {
			var value = A2(
				_elm_lang$core$String$join,
				' ',
				_elm_lang$core$Native_List.fromArray(
					[c1.value, c2.value]));
			var warnings = A2(_elm_lang$core$Basics_ops['++'], c1.warnings, c2.warnings);
			return A3(_rtfeldman$elm_css$Css$propertyWithWarnings, warnings, 'border-color', value);
		});
	var _rtfeldman$elm_css$Css$borderColor = function (c) {
		return A3(_rtfeldman$elm_css$Css$propertyWithWarnings, c.warnings, 'border-color', c.value);
	};
	var _rtfeldman$elm_css$Css$borderBlockEndColor = function (c) {
		return A3(_rtfeldman$elm_css$Css$propertyWithWarnings, c.warnings, 'border-block-end-color', c.value);
	};
	var _rtfeldman$elm_css$Css$borderTopColor = function (c) {
		return A3(_rtfeldman$elm_css$Css$propertyWithWarnings, c.warnings, 'border-top-color', c.value);
	};
	var _rtfeldman$elm_css$Css$borderRightColor = function (c) {
		return A3(_rtfeldman$elm_css$Css$propertyWithWarnings, c.warnings, 'border-right-color', c.value);
	};
	var _rtfeldman$elm_css$Css$borderLeftColor = function (c) {
		return A3(_rtfeldman$elm_css$Css$propertyWithWarnings, c.warnings, 'border-left-color', c.value);
	};
	var _rtfeldman$elm_css$Css$borderInlineEndColor = function (c) {
		return A3(_rtfeldman$elm_css$Css$propertyWithWarnings, c.warnings, 'border-inline-end-color', c.value);
	};
	var _rtfeldman$elm_css$Css$borderInlineStartColor = function (c) {
		return A3(_rtfeldman$elm_css$Css$propertyWithWarnings, c.warnings, 'border-inline-start-color', c.value);
	};
	var _rtfeldman$elm_css$Css$borderBottomColor = function (c) {
		return A3(_rtfeldman$elm_css$Css$propertyWithWarnings, c.warnings, 'border-bottom-color', c.value);
	};
	var _rtfeldman$elm_css$Css$borderBlockStartColor = function (c) {
		return A3(_rtfeldman$elm_css$Css$propertyWithWarnings, c.warnings, 'border-block-start-color', c.value);
	};
	var _rtfeldman$elm_css$Css$featureOff = 0;
	var _rtfeldman$elm_css$Css$featureOn = 1;
	var _rtfeldman$elm_css$Css$displayFlex = A2(_rtfeldman$elm_css$Css$property, 'display', 'flex');
	var _rtfeldman$elm_css$Css$textDecorationColor = function (c) {
		return A3(_rtfeldman$elm_css$Css$propertyWithWarnings, c.warnings, 'text-decoration-color', c.value);
	};
	var _rtfeldman$elm_css$Css$prop4 = F5(
		function (key, argA, argB, argC, argD) {
			return A2(
				_rtfeldman$elm_css$Css$property,
				key,
				A2(
					_elm_lang$core$String$join,
					' ',
					_elm_lang$core$Native_List.fromArray(
						[argA.value, argB.value, argC.value, argD.value])));
		});
	var _rtfeldman$elm_css$Css$textShadow4 = _rtfeldman$elm_css$Css$prop4('text-shadow');
	var _rtfeldman$elm_css$Css$padding4 = _rtfeldman$elm_css$Css$prop4('padding');
	var _rtfeldman$elm_css$Css$margin4 = _rtfeldman$elm_css$Css$prop4('margin');
	var _rtfeldman$elm_css$Css$borderImageOutset4 = _rtfeldman$elm_css$Css$prop4('border-image-outset');
	var _rtfeldman$elm_css$Css$borderImageWidth4 = _rtfeldman$elm_css$Css$prop4('border-image-width');
	var _rtfeldman$elm_css$Css$borderRadius4 = _rtfeldman$elm_css$Css$prop4('border-radius');
	var _rtfeldman$elm_css$Css$prop3 = F4(
		function (key, argA, argB, argC) {
			return A2(
				_rtfeldman$elm_css$Css$property,
				key,
				A2(
					_elm_lang$core$String$join,
					' ',
					_elm_lang$core$Native_List.fromArray(
						[argA.value, argB.value, argC.value])));
		});
	var _rtfeldman$elm_css$Css$textShadow3 = _rtfeldman$elm_css$Css$prop3('text-shadow');
	var _rtfeldman$elm_css$Css$textIndent3 = _rtfeldman$elm_css$Css$prop3('text-indent');
	var _rtfeldman$elm_css$Css$padding3 = _rtfeldman$elm_css$Css$prop3('padding');
	var _rtfeldman$elm_css$Css$margin3 = _rtfeldman$elm_css$Css$prop3('margin');
	var _rtfeldman$elm_css$Css$border3 = _rtfeldman$elm_css$Css$prop3('border');
	var _rtfeldman$elm_css$Css$borderTop3 = _rtfeldman$elm_css$Css$prop3('border-top');
	var _rtfeldman$elm_css$Css$borderBottom3 = _rtfeldman$elm_css$Css$prop3('border-bottom');
	var _rtfeldman$elm_css$Css$borderLeft3 = _rtfeldman$elm_css$Css$prop3('border-left');
	var _rtfeldman$elm_css$Css$borderRight3 = _rtfeldman$elm_css$Css$prop3('border-right');
	var _rtfeldman$elm_css$Css$borderBlockStart3 = _rtfeldman$elm_css$Css$prop3('border-block-start');
	var _rtfeldman$elm_css$Css$borderBlockEnd3 = _rtfeldman$elm_css$Css$prop3('border-block-end');
	var _rtfeldman$elm_css$Css$borderInlineStart3 = _rtfeldman$elm_css$Css$prop3('border-block-start');
	var _rtfeldman$elm_css$Css$borderInlineEnd3 = _rtfeldman$elm_css$Css$prop3('border-block-end');
	var _rtfeldman$elm_css$Css$borderImageOutset3 = _rtfeldman$elm_css$Css$prop3('border-image-outset');
	var _rtfeldman$elm_css$Css$borderImageWidth3 = _rtfeldman$elm_css$Css$prop3('border-image-width');
	var _rtfeldman$elm_css$Css$borderRadius3 = _rtfeldman$elm_css$Css$prop3('border-radius');
	var _rtfeldman$elm_css$Css$fontVariant3 = _rtfeldman$elm_css$Css$prop3('font-variant');
	var _rtfeldman$elm_css$Css$fontVariantNumeric3 = _rtfeldman$elm_css$Css$prop3('font-variant-numeric');
	var _rtfeldman$elm_css$Css$textDecoration3 = _rtfeldman$elm_css$Css$prop3('text-decoration');
	var _rtfeldman$elm_css$Css$textDecorations3 = function (_p10) {
		return A2(
			_rtfeldman$elm_css$Css$prop3,
			'text-decoration',
			_rtfeldman$elm_css$Css$valuesOrNone(_p10));
	};
	var _rtfeldman$elm_css$Css$prop2 = F3(
		function (key, argA, argB) {
			return A2(
				_rtfeldman$elm_css$Css$property,
				key,
				A2(
					_elm_lang$core$String$join,
					' ',
					_elm_lang$core$Native_List.fromArray(
						[argA.value, argB.value])));
		});
	var _rtfeldman$elm_css$Css$textShadow2 = _rtfeldman$elm_css$Css$prop2('text-shadow');
	var _rtfeldman$elm_css$Css$textIndent2 = _rtfeldman$elm_css$Css$prop2('text-indent');
	var _rtfeldman$elm_css$Css$padding2 = _rtfeldman$elm_css$Css$prop2('padding');
	var _rtfeldman$elm_css$Css$margin2 = _rtfeldman$elm_css$Css$prop2('margin');
	var _rtfeldman$elm_css$Css$border2 = _rtfeldman$elm_css$Css$prop2('border');
	var _rtfeldman$elm_css$Css$borderTop2 = _rtfeldman$elm_css$Css$prop2('border-top');
	var _rtfeldman$elm_css$Css$borderBottom2 = _rtfeldman$elm_css$Css$prop2('border-bottom');
	var _rtfeldman$elm_css$Css$borderLeft2 = _rtfeldman$elm_css$Css$prop2('border-left');
	var _rtfeldman$elm_css$Css$borderRight2 = _rtfeldman$elm_css$Css$prop2('border-right');
	var _rtfeldman$elm_css$Css$borderBlockStart2 = _rtfeldman$elm_css$Css$prop2('border-block-start');
	var _rtfeldman$elm_css$Css$borderBlockEnd2 = _rtfeldman$elm_css$Css$prop2('border-block-end');
	var _rtfeldman$elm_css$Css$borderInlineStart2 = _rtfeldman$elm_css$Css$prop2('border-block-start');
	var _rtfeldman$elm_css$Css$borderInlineEnd2 = _rtfeldman$elm_css$Css$prop2('border-block-end');
	var _rtfeldman$elm_css$Css$borderImageOutset2 = _rtfeldman$elm_css$Css$prop2('border-image-outset');
	var _rtfeldman$elm_css$Css$borderImageWidth2 = _rtfeldman$elm_css$Css$prop2('border-image-width');
	var _rtfeldman$elm_css$Css$borderTopWidth2 = _rtfeldman$elm_css$Css$prop2('border-top-width');
	var _rtfeldman$elm_css$Css$borderBottomLeftRadius2 = _rtfeldman$elm_css$Css$prop2('border-bottom-left-radius');
	var _rtfeldman$elm_css$Css$borderBottomRightRadius2 = _rtfeldman$elm_css$Css$prop2('border-bottom-right-radius');
	var _rtfeldman$elm_css$Css$borderTopLeftRadius2 = _rtfeldman$elm_css$Css$prop2('border-top-left-radius');
	var _rtfeldman$elm_css$Css$borderTopRightRadius2 = _rtfeldman$elm_css$Css$prop2('border-top-right-radius');
	var _rtfeldman$elm_css$Css$borderRadius2 = _rtfeldman$elm_css$Css$prop2('border-radius');
	var _rtfeldman$elm_css$Css$borderSpacing2 = _rtfeldman$elm_css$Css$prop2('border-spacing');
	var _rtfeldman$elm_css$Css$fontVariant2 = _rtfeldman$elm_css$Css$prop2('font-variant');
	var _rtfeldman$elm_css$Css$fontVariantNumeric2 = _rtfeldman$elm_css$Css$prop2('font-variant-numeric');
	var _rtfeldman$elm_css$Css$textDecoration2 = _rtfeldman$elm_css$Css$prop2('text-decoration');
	var _rtfeldman$elm_css$Css$textDecorations2 = function (_p11) {
		return A2(
			_rtfeldman$elm_css$Css$prop2,
			'text-decoration',
			_rtfeldman$elm_css$Css$valuesOrNone(_p11));
	};
	var _rtfeldman$elm_css$Css$prop1 = F2(
		function (key, arg) {
			return A2(_rtfeldman$elm_css$Css$property, key, arg.value);
		});
	var _rtfeldman$elm_css$Css$textRendering = _rtfeldman$elm_css$Css$prop1('text-rendering');
	var _rtfeldman$elm_css$Css$textOverflow = _rtfeldman$elm_css$Css$prop1('text-overflow');
	var _rtfeldman$elm_css$Css$textShadow = _rtfeldman$elm_css$Css$prop1('text-shadow');
	var _rtfeldman$elm_css$Css$textIndent = _rtfeldman$elm_css$Css$prop1('text-indent');
	var _rtfeldman$elm_css$Css$textTransform = _rtfeldman$elm_css$Css$prop1('text-transform');
	var _rtfeldman$elm_css$Css$display = _rtfeldman$elm_css$Css$prop1('display');
	var _rtfeldman$elm_css$Css$opacity = _rtfeldman$elm_css$Css$prop1('opacity');
	var _rtfeldman$elm_css$Css$width = _rtfeldman$elm_css$Css$prop1('width');
	var _rtfeldman$elm_css$Css$maxWidth = _rtfeldman$elm_css$Css$prop1('max-width');
	var _rtfeldman$elm_css$Css$minWidth = _rtfeldman$elm_css$Css$prop1('min-width');
	var _rtfeldman$elm_css$Css$height = _rtfeldman$elm_css$Css$prop1('height');
	var _rtfeldman$elm_css$Css$minHeight = _rtfeldman$elm_css$Css$prop1('min-height');
	var _rtfeldman$elm_css$Css$maxHeight = _rtfeldman$elm_css$Css$prop1('max-height');
	var _rtfeldman$elm_css$Css$padding = _rtfeldman$elm_css$Css$prop1('padding');
	var _rtfeldman$elm_css$Css$paddingBlockStart = _rtfeldman$elm_css$Css$prop1('padding-block-start');
	var _rtfeldman$elm_css$Css$paddingBlockEnd = _rtfeldman$elm_css$Css$prop1('padding-block-end');
	var _rtfeldman$elm_css$Css$paddingInlineStart = _rtfeldman$elm_css$Css$prop1('padding-inline-start');
	var _rtfeldman$elm_css$Css$paddingInlineEnd = _rtfeldman$elm_css$Css$prop1('padding-inline-end');
	var _rtfeldman$elm_css$Css$paddingTop = _rtfeldman$elm_css$Css$prop1('padding-top');
	var _rtfeldman$elm_css$Css$paddingBottom = _rtfeldman$elm_css$Css$prop1('padding-bottom');
	var _rtfeldman$elm_css$Css$paddingRight = _rtfeldman$elm_css$Css$prop1('padding-right');
	var _rtfeldman$elm_css$Css$paddingLeft = _rtfeldman$elm_css$Css$prop1('padding-left');
	var _rtfeldman$elm_css$Css$margin = _rtfeldman$elm_css$Css$prop1('margin');
	var _rtfeldman$elm_css$Css$marginTop = _rtfeldman$elm_css$Css$prop1('margin-top');
	var _rtfeldman$elm_css$Css$marginBottom = _rtfeldman$elm_css$Css$prop1('margin-bottom');
	var _rtfeldman$elm_css$Css$marginRight = _rtfeldman$elm_css$Css$prop1('margin-right');
	var _rtfeldman$elm_css$Css$marginLeft = _rtfeldman$elm_css$Css$prop1('margin-left');
	var _rtfeldman$elm_css$Css$marginBlockStart = _rtfeldman$elm_css$Css$prop1('margin-block-start');
	var _rtfeldman$elm_css$Css$marginBlockEnd = _rtfeldman$elm_css$Css$prop1('margin-block-end');
	var _rtfeldman$elm_css$Css$marginInlineStart = _rtfeldman$elm_css$Css$prop1('margin-inline-start');
	var _rtfeldman$elm_css$Css$marginInlineEnd = _rtfeldman$elm_css$Css$prop1('margin-inline-end');
	var _rtfeldman$elm_css$Css$top = _rtfeldman$elm_css$Css$prop1('top');
	var _rtfeldman$elm_css$Css$bottom = _rtfeldman$elm_css$Css$prop1('bottom');
	var _rtfeldman$elm_css$Css$left = _rtfeldman$elm_css$Css$prop1('left');
	var _rtfeldman$elm_css$Css$right = _rtfeldman$elm_css$Css$prop1('right');
	var _rtfeldman$elm_css$Css$border = _rtfeldman$elm_css$Css$prop1('border');
	var _rtfeldman$elm_css$Css$borderTop = _rtfeldman$elm_css$Css$prop1('border-top');
	var _rtfeldman$elm_css$Css$borderBottom = _rtfeldman$elm_css$Css$prop1('border-bottom');
	var _rtfeldman$elm_css$Css$borderLeft = _rtfeldman$elm_css$Css$prop1('border-left');
	var _rtfeldman$elm_css$Css$borderRight = _rtfeldman$elm_css$Css$prop1('border-right');
	var _rtfeldman$elm_css$Css$borderBlockStart = _rtfeldman$elm_css$Css$prop1('border-block-start');
	var _rtfeldman$elm_css$Css$borderBlockEnd = _rtfeldman$elm_css$Css$prop1('border-block-end');
	var _rtfeldman$elm_css$Css$borderInlineStart = _rtfeldman$elm_css$Css$prop1('border-block-start');
	var _rtfeldman$elm_css$Css$borderInlineEnd = _rtfeldman$elm_css$Css$prop1('border-block-end');
	var _rtfeldman$elm_css$Css$borderImageOutset = _rtfeldman$elm_css$Css$prop1('border-image-outset');
	var _rtfeldman$elm_css$Css$borderImageWidth = _rtfeldman$elm_css$Css$prop1('border-image-width');
	var _rtfeldman$elm_css$Css$borderBlockEndStyle = _rtfeldman$elm_css$Css$prop1('border-block-end-style');
	var _rtfeldman$elm_css$Css$borderBlockStartStyle = _rtfeldman$elm_css$Css$prop1('border-block-start-style');
	var _rtfeldman$elm_css$Css$borderInlineEndStyle = _rtfeldman$elm_css$Css$prop1('border-inline-end-style');
	var _rtfeldman$elm_css$Css$borderBottomStyle = _rtfeldman$elm_css$Css$prop1('border-bottom-style');
	var _rtfeldman$elm_css$Css$borderInlineStartStyle = _rtfeldman$elm_css$Css$prop1('border-inline-start-style');
	var _rtfeldman$elm_css$Css$borderLeftStyle = _rtfeldman$elm_css$Css$prop1('border-left-style');
	var _rtfeldman$elm_css$Css$borderRightStyle = _rtfeldman$elm_css$Css$prop1('border-right-style');
	var _rtfeldman$elm_css$Css$borderTopStyle = _rtfeldman$elm_css$Css$prop1('border-top-style');
	var _rtfeldman$elm_css$Css$borderStyle = _rtfeldman$elm_css$Css$prop1('border-style');
	var _rtfeldman$elm_css$Css$borderBottomWidth = _rtfeldman$elm_css$Css$prop1('border-bottom-width');
	var _rtfeldman$elm_css$Css$borderInlineEndWidth = _rtfeldman$elm_css$Css$prop1('border-inline-end-width');
	var _rtfeldman$elm_css$Css$borderLeftWidth = _rtfeldman$elm_css$Css$prop1('border-left-width');
	var _rtfeldman$elm_css$Css$borderRightWidth = _rtfeldman$elm_css$Css$prop1('border-right-width');
	var _rtfeldman$elm_css$Css$borderTopWidth = _rtfeldman$elm_css$Css$prop1('border-top-width');
	var _rtfeldman$elm_css$Css$borderBottomLeftRadius = _rtfeldman$elm_css$Css$prop1('border-bottom-left-radius');
	var _rtfeldman$elm_css$Css$borderBottomRightRadius = _rtfeldman$elm_css$Css$prop1('border-bottom-right-radius');
	var _rtfeldman$elm_css$Css$borderTopLeftRadius = _rtfeldman$elm_css$Css$prop1('border-top-left-radius');
	var _rtfeldman$elm_css$Css$borderTopRightRadius = _rtfeldman$elm_css$Css$prop1('border-top-right-radius');
	var _rtfeldman$elm_css$Css$borderRadius = _rtfeldman$elm_css$Css$prop1('border-radius');
	var _rtfeldman$elm_css$Css$borderSpacing = _rtfeldman$elm_css$Css$prop1('border-spacing');
	var _rtfeldman$elm_css$Css$overflow = _rtfeldman$elm_css$Css$prop1('overflow');
	var _rtfeldman$elm_css$Css$overflowX = _rtfeldman$elm_css$Css$prop1('overflow-x');
	var _rtfeldman$elm_css$Css$overflowY = _rtfeldman$elm_css$Css$prop1('overflow-y');
	var _rtfeldman$elm_css$Css$whiteSpace = _rtfeldman$elm_css$Css$prop1('white-space');
	var _rtfeldman$elm_css$Css$lineHeight = _rtfeldman$elm_css$Css$prop1('line-height');
	var _rtfeldman$elm_css$Css$letterSpacing = _rtfeldman$elm_css$Css$prop1('letter-spacing');
	var _rtfeldman$elm_css$Css$fontFamily = _rtfeldman$elm_css$Css$prop1('font-family');
	var _rtfeldman$elm_css$Css$fontFamilies = function (_p12) {
		return A2(
			_rtfeldman$elm_css$Css$prop1,
			'font-family',
			_rtfeldman$elm_css$Css$stringsToValue(_p12));
	};
	var _rtfeldman$elm_css$Css$fontSize = _rtfeldman$elm_css$Css$prop1('font-size');
	var _rtfeldman$elm_css$Css$fontStyle = _rtfeldman$elm_css$Css$prop1('font-style');
	var _rtfeldman$elm_css$Css$fontVariant = _rtfeldman$elm_css$Css$prop1('font-variant');
	var _rtfeldman$elm_css$Css$fontVariantLigatures = _rtfeldman$elm_css$Css$prop1('font-variant-ligatures');
	var _rtfeldman$elm_css$Css$fontVariantCaps = _rtfeldman$elm_css$Css$prop1('font-variant-caps');
	var _rtfeldman$elm_css$Css$fontVariantNumeric = _rtfeldman$elm_css$Css$prop1('font-variant-numeric');
	var _rtfeldman$elm_css$Css$fontVariantNumerics = function (_p13) {
		return A2(
			_rtfeldman$elm_css$Css$prop1,
			'font-variant-numeric',
			_rtfeldman$elm_css$Css$valuesOrNone(_p13));
	};
	var _rtfeldman$elm_css$Css$textDecoration = _rtfeldman$elm_css$Css$prop1('text-decoration');
	var _rtfeldman$elm_css$Css$textDecorations = function (_p14) {
		return A2(
			_rtfeldman$elm_css$Css$prop1,
			'text-decoration',
			_rtfeldman$elm_css$Css$valuesOrNone(_p14));
	};
	var _rtfeldman$elm_css$Css$textDecorationLine = _rtfeldman$elm_css$Css$prop1('text-decoration-line');
	var _rtfeldman$elm_css$Css$textDecorationLines = function (_p15) {
		return A2(
			_rtfeldman$elm_css$Css$prop1,
			'text-decoration-line',
			_rtfeldman$elm_css$Css$valuesOrNone(_p15));
	};
	var _rtfeldman$elm_css$Css$textDecorationStyle = _rtfeldman$elm_css$Css$prop1('text-decoration-style');
	var _rtfeldman$elm_css$Css$position = _rtfeldman$elm_css$Css$prop1('position');
	var _rtfeldman$elm_css$Css$textBottom = _rtfeldman$elm_css$Css$prop1('text-bottom');
	var _rtfeldman$elm_css$Css$textTop = _rtfeldman$elm_css$Css$prop1('text-top');
	var _rtfeldman$elm_css$Css$super = _rtfeldman$elm_css$Css$prop1('super');
	var _rtfeldman$elm_css$Css$sub = _rtfeldman$elm_css$Css$prop1('sub');
	var _rtfeldman$elm_css$Css$baseline = _rtfeldman$elm_css$Css$prop1('baseline');
	var _rtfeldman$elm_css$Css$middle = _rtfeldman$elm_css$Css$prop1('middle');
	var _rtfeldman$elm_css$Css$stretch = _rtfeldman$elm_css$Css$prop1('stretch');
	var _rtfeldman$elm_css$Css$flexEnd = _rtfeldman$elm_css$Css$prop1('flex-end');
	var _rtfeldman$elm_css$Css$flexStart = _rtfeldman$elm_css$Css$prop1('flex-start');
	var _rtfeldman$elm_css$Css$order = _rtfeldman$elm_css$Css$prop1('order');
	var _rtfeldman$elm_css$Css$flexFlow2 = _rtfeldman$elm_css$Css$prop2('flex-flow');
	var _rtfeldman$elm_css$Css$flexFlow1 = _rtfeldman$elm_css$Css$prop1('flex-flow');
	var _rtfeldman$elm_css$Css$flexDirection = _rtfeldman$elm_css$Css$prop1('flex-direction');
	var _rtfeldman$elm_css$Css$flexWrap = _rtfeldman$elm_css$Css$prop1('flex-wrap');
	var _rtfeldman$elm_css$Css$flexShrink = _rtfeldman$elm_css$Css$prop1('flex-shrink');
	var _rtfeldman$elm_css$Css$flexGrow = _rtfeldman$elm_css$Css$prop1('flex-grow');
	var _rtfeldman$elm_css$Css$flexBasis = _rtfeldman$elm_css$Css$prop1('flex-basis');
	var _rtfeldman$elm_css$Css$flex3 = _rtfeldman$elm_css$Css$prop3('flex');
	var _rtfeldman$elm_css$Css$flex2 = _rtfeldman$elm_css$Css$prop2('flex');
	var _rtfeldman$elm_css$Css$flex = _rtfeldman$elm_css$Css$prop1('flex');
	var _rtfeldman$elm_css$Css$transformStyle = _rtfeldman$elm_css$Css$prop1('transform-style');
	var _rtfeldman$elm_css$Css$boxSizing = _rtfeldman$elm_css$Css$prop1('box-sizing');
	var _rtfeldman$elm_css$Css$transformBox = _rtfeldman$elm_css$Css$prop1('transform-box');
	var _rtfeldman$elm_css$Css$transforms = function (_p16) {
		return A2(
			_rtfeldman$elm_css$Css$prop1,
			'transform',
			_rtfeldman$elm_css$Css$valuesOrNone(_p16));
	};
	var _rtfeldman$elm_css$Css$transform = function (only) {
		return _rtfeldman$elm_css$Css$transforms(
			_elm_lang$core$Native_List.fromArray(
				[only]));
	};
	var _rtfeldman$elm_css$Css$true = _rtfeldman$elm_css$Css$prop1('true');
	var _rtfeldman$elm_css$Css$matchParent = _rtfeldman$elm_css$Css$prop1('match-parent');
	var _rtfeldman$elm_css$Css$end = _rtfeldman$elm_css$Css$prop1('end');
	var _rtfeldman$elm_css$Css$start = _rtfeldman$elm_css$Css$prop1('start');
	var _rtfeldman$elm_css$Css$justifyAll = _rtfeldman$elm_css$Css$prop1('justify-all');
	var _rtfeldman$elm_css$Css$textJustify = _rtfeldman$elm_css$Css$prop1('text-justify');
	var _rtfeldman$elm_css$Css$center = _rtfeldman$elm_css$Css$prop1('center');
	var _rtfeldman$elm_css$Css$important = _rtfeldman$elm_css$Css_Preprocess$mapLastProperty(
		function (property) {
			return _elm_lang$core$Native_Utils.update(
				property,
				{important: true});
		});
	var _rtfeldman$elm_css$Css$all = _rtfeldman$elm_css$Css$prop1('all');
	var _rtfeldman$elm_css$Css$combineLengths = F3(
		function (operation, first, second) {
			var value = A2(
				_elm_lang$core$String$join,
				' ',
				A2(
					_elm_lang$core$List$filter,
					function (_p17) {
						return _elm_lang$core$Basics$not(
							_elm_lang$core$String$isEmpty(_p17));
					},
					_elm_lang$core$Native_List.fromArray(
						[
							_elm_lang$core$Basics$toString(
							A2(operation, first.numericValue, second.numericValue)),
							first.unitLabel
						])));
			return _elm_lang$core$Native_Utils.update(
				first,
				{value: value});
		});
	var _rtfeldman$elm_css$Css_ops = _rtfeldman$elm_css$Css_ops || {};
	_rtfeldman$elm_css$Css_ops['|*|'] = _rtfeldman$elm_css$Css$combineLengths(
		F2(
			function (x, y) {
				return x * y;
			}));
	var _rtfeldman$elm_css$Css_ops = _rtfeldman$elm_css$Css_ops || {};
	_rtfeldman$elm_css$Css_ops['|/|'] = _rtfeldman$elm_css$Css$combineLengths(
		F2(
			function (x, y) {
				return x / y;
			}));
	var _rtfeldman$elm_css$Css_ops = _rtfeldman$elm_css$Css_ops || {};
	_rtfeldman$elm_css$Css_ops['|-|'] = _rtfeldman$elm_css$Css$combineLengths(
		F2(
			function (x, y) {
				return x - y;
			}));
	var _rtfeldman$elm_css$Css_ops = _rtfeldman$elm_css$Css_ops || {};
	_rtfeldman$elm_css$Css_ops['|+|'] = _rtfeldman$elm_css$Css$combineLengths(
		F2(
			function (x, y) {
				return x + y;
			}));
	var _rtfeldman$elm_css$Css$getOverloadedProperty = F3(
		function (functionName, desiredKey, mixin) {
			getOverloadedProperty:
			while (true) {
				var _p18 = mixin;
				switch (_p18.ctor) {
					case 'AppendProperty':
						return A2(_rtfeldman$elm_css$Css$property, desiredKey, _p18._0.key);
					case 'ExtendSelector':
						return A3(
							_rtfeldman$elm_css$Css$propertyWithWarnings,
							_elm_lang$core$Native_List.fromArray(
								[
									A2(
									_elm_lang$core$Basics_ops['++'],
									'Cannot apply ',
									A2(
										_elm_lang$core$Basics_ops['++'],
										functionName,
										A2(
											_elm_lang$core$Basics_ops['++'],
											' with inapplicable mixin for selector ',
											_elm_lang$core$Basics$toString(_p18._0))))
								]),
							desiredKey,
							'');
					case 'NestSnippet':
						return A3(
							_rtfeldman$elm_css$Css$propertyWithWarnings,
							_elm_lang$core$Native_List.fromArray(
								[
									A2(
									_elm_lang$core$Basics_ops['++'],
									'Cannot apply ',
									A2(
										_elm_lang$core$Basics_ops['++'],
										functionName,
										A2(
											_elm_lang$core$Basics_ops['++'],
											' with inapplicable mixin for combinator ',
											_elm_lang$core$Basics$toString(_p18._0))))
								]),
							desiredKey,
							'');
					case 'WithPseudoElement':
						return A3(
							_rtfeldman$elm_css$Css$propertyWithWarnings,
							_elm_lang$core$Native_List.fromArray(
								[
									A2(
									_elm_lang$core$Basics_ops['++'],
									'Cannot apply ',
									A2(
										_elm_lang$core$Basics_ops['++'],
										functionName,
										A2(
											_elm_lang$core$Basics_ops['++'],
											' with inapplicable mixin for pseudo-element setter ',
											_elm_lang$core$Basics$toString(_p18._0))))
								]),
							desiredKey,
							'');
					case 'WithMedia':
						return A3(
							_rtfeldman$elm_css$Css$propertyWithWarnings,
							_elm_lang$core$Native_List.fromArray(
								[
									A2(
									_elm_lang$core$Basics_ops['++'],
									'Cannot apply ',
									A2(
										_elm_lang$core$Basics_ops['++'],
										functionName,
										A2(
											_elm_lang$core$Basics_ops['++'],
											' with inapplicable mixin for media query ',
											_elm_lang$core$Basics$toString(_p18._0))))
								]),
							desiredKey,
							'');
					default:
						if (_p18._0.ctor === '[]') {
							return A3(
								_rtfeldman$elm_css$Css$propertyWithWarnings,
								_elm_lang$core$Native_List.fromArray(
									[
										A2(
										_elm_lang$core$Basics_ops['++'],
										'Cannot apply ',
										A2(_elm_lang$core$Basics_ops['++'], functionName, ' with empty mixin. '))
									]),
								desiredKey,
								'');
						} else {
							if (_p18._0._1.ctor === '[]') {
								var _v11 = functionName,
									_v12 = desiredKey,
									_v13 = _p18._0._0;
								functionName = _v11;
								desiredKey = _v12;
								mixin = _v13;
								continue getOverloadedProperty;
							} else {
								var _v14 = functionName,
									_v15 = desiredKey,
									_v16 = _rtfeldman$elm_css$Css_Preprocess$ApplyMixins(_p18._0._1);
								functionName = _v14;
								desiredKey = _v15;
								mixin = _v16;
								continue getOverloadedProperty;
							}
						}
				}
			}
		});
	var _rtfeldman$elm_css$Css$cssFunction = F2(
		function (funcName, args) {
			return A2(
				_elm_lang$core$Basics_ops['++'],
				funcName,
				A2(
					_elm_lang$core$Basics_ops['++'],
					'(',
					A2(
						_elm_lang$core$Basics_ops['++'],
						A2(_elm_lang$core$String$join, ', ', args),
						')')));
		});
	var _rtfeldman$elm_css$Css$tv = _rtfeldman$elm_css$Css_Structure$MediaQuery('tv');
	var _rtfeldman$elm_css$Css$projection = _rtfeldman$elm_css$Css_Structure$MediaQuery('projection');
	var _rtfeldman$elm_css$Css$print = _rtfeldman$elm_css$Css_Structure$MediaQuery('print');
	var _rtfeldman$elm_css$Css$screen = _rtfeldman$elm_css$Css_Structure$MediaQuery('screen');
	var _rtfeldman$elm_css$Css$NumberedWeight = F2(
		function (a, b) {
			return {value: a, fontWeight: b};
		});
	var _rtfeldman$elm_css$Css$ExplicitLength = function (a) {
		return function (b) {
			return function (c) {
				return function (d) {
					return function (e) {
						return function (f) {
							return function (g) {
								return function (h) {
									return function (i) {
										return function (j) {
											return function (k) {
												return function (l) {
													return function (m) {
														return function (n) {
															return {value: a, numericValue: b, units: c, unitLabel: d, length: e, lengthOrAuto: f, lengthOrNumber: g, lengthOrNone: h, lengthOrMinMaxDimension: i, lengthOrNoneOrMinMaxDimension: j, textIndent: k, flexBasis: l, lengthOrNumberOrAutoOrNoneOrContent: m, fontSize: n};
														};
													};
												};
											};
										};
									};
								};
							};
						};
					};
				};
			};
		};
	};
	var _rtfeldman$elm_css$Css$NonMixable = {};
	var _rtfeldman$elm_css$Css$BasicProperty = function (a) {
		return function (b) {
			return function (c) {
				return function (d) {
					return function (e) {
						return function (f) {
							return function (g) {
								return function (h) {
									return function (i) {
										return function (j) {
											return function (k) {
												return function (l) {
													return function (m) {
														return function (n) {
															return function (o) {
																return function (p) {
																	return function (q) {
																		return function (r) {
																			return function (s) {
																				return function (t) {
																					return function (u) {
																						return function (v) {
																							return function (w) {
																								return function (x) {
																									return function (y) {
																										return function (z) {
																											return function (_1) {
																												return function (_2) {
																													return function (_3) {
																														return function (_4) {
																															return function (_5) {
																																return {value: a, all: b, alignItems: c, boxSizing: d, display: e, flexBasis: f, flexWrap: g, flexDirection: h, flexDirectionOrWrap: i, none: j, number: k, overflow: l, textDecorationLine: m, textRendering: n, textIndent: o, textDecorationStyle: p, length: q, lengthOrAuto: r, lengthOrNone: s, lengthOrNumber: t, lengthOrMinMaxDimension: u, lengthOrNoneOrMinMaxDimension: v, lengthOrNumberOrAutoOrNoneOrContent: w, fontFamily: x, fontSize: y, fontStyle: z, fontWeight: _1, fontVariant: _2, units: _3, numericValue: _4, unitLabel: _5};
																															};
																														};
																													};
																												};
																											};
																										};
																									};
																								};
																							};
																						};
																					};
																				};
																			};
																		};
																	};
																};
															};
														};
													};
												};
											};
										};
									};
								};
							};
						};
					};
				};
			};
		};
	};
	var _rtfeldman$elm_css$Css$Compatible = {ctor: 'Compatible'};
	var _rtfeldman$elm_css$Css$transparent = {
		value: 'transparent',
		color: _rtfeldman$elm_css$Css$Compatible,
		warnings: _elm_lang$core$Native_List.fromArray(
			[])
	};
	var _rtfeldman$elm_css$Css$currentColor = {
		value: 'currentColor',
		color: _rtfeldman$elm_css$Css$Compatible,
		warnings: _elm_lang$core$Native_List.fromArray(
			[])
	};
	var _rtfeldman$elm_css$Css$visible = {value: 'visible', overflow: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$scroll = {value: 'scroll', overflow: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$hidden = {value: 'hidden', overflow: _rtfeldman$elm_css$Css$Compatible, borderStyle: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$rgb = F3(
		function (red, green, blue) {
			var warnings = ((_elm_lang$core$Native_Utils.cmp(red, 0) < 0) || ((_elm_lang$core$Native_Utils.cmp(red, 255) > 0) || ((_elm_lang$core$Native_Utils.cmp(green, 0) < 0) || ((_elm_lang$core$Native_Utils.cmp(green, 255) > 0) || ((_elm_lang$core$Native_Utils.cmp(blue, 0) < 0) || (_elm_lang$core$Native_Utils.cmp(blue, 255) > 0)))))) ? _elm_lang$core$Native_List.fromArray(
				[
					A2(
					_elm_lang$core$Basics_ops['++'],
					'RGB color values must be between 0 and 255. rgb(',
					A2(
						_elm_lang$core$Basics_ops['++'],
						_elm_lang$core$Basics$toString(red),
						A2(
							_elm_lang$core$Basics_ops['++'],
							', ',
							A2(
								_elm_lang$core$Basics_ops['++'],
								_elm_lang$core$Basics$toString(green),
								A2(
									_elm_lang$core$Basics_ops['++'],
									', ',
									A2(
										_elm_lang$core$Basics_ops['++'],
										_elm_lang$core$Basics$toString(blue),
										') is not valid.'))))))
				]) : _elm_lang$core$Native_List.fromArray(
				[]);
			return {
				value: A2(
					_rtfeldman$elm_css$Css$cssFunction,
					'rgb',
					A2(
						_elm_lang$core$List$map,
						_rtfeldman$elm_css$Css$numberToString,
						_elm_lang$core$Native_List.fromArray(
							[red, green, blue]))),
				color: _rtfeldman$elm_css$Css$Compatible,
				warnings: warnings,
				red: red,
				green: green,
				blue: blue,
				alpha: 1
			};
		});
	var _rtfeldman$elm_css$Css$rgba = F4(
		function (red, green, blue, alpha) {
			var warnings = ((_elm_lang$core$Native_Utils.cmp(red, 0) < 0) || ((_elm_lang$core$Native_Utils.cmp(red, 255) > 0) || ((_elm_lang$core$Native_Utils.cmp(green, 0) < 0) || ((_elm_lang$core$Native_Utils.cmp(green, 255) > 0) || ((_elm_lang$core$Native_Utils.cmp(blue, 0) < 0) || ((_elm_lang$core$Native_Utils.cmp(blue, 255) > 0) || ((_elm_lang$core$Native_Utils.cmp(alpha, 0) < 0) || (_elm_lang$core$Native_Utils.cmp(alpha, 1) > 0)))))))) ? _elm_lang$core$Native_List.fromArray(
				[
					A2(
					_elm_lang$core$Basics_ops['++'],
					'RGB color values must be between 0 and 255, and the alpha in RGBA must be between 0 and 1. rgba(',
					A2(
						_elm_lang$core$Basics_ops['++'],
						_elm_lang$core$Basics$toString(red),
						A2(
							_elm_lang$core$Basics_ops['++'],
							', ',
							A2(
								_elm_lang$core$Basics_ops['++'],
								_elm_lang$core$Basics$toString(green),
								A2(
									_elm_lang$core$Basics_ops['++'],
									', ',
									A2(
										_elm_lang$core$Basics_ops['++'],
										_elm_lang$core$Basics$toString(blue),
										A2(
											_elm_lang$core$Basics_ops['++'],
											', ',
											A2(
												_elm_lang$core$Basics_ops['++'],
												_elm_lang$core$Basics$toString(alpha),
												') is not valid.'))))))))
				]) : _elm_lang$core$Native_List.fromArray(
				[]);
			return {
				value: A2(
					_rtfeldman$elm_css$Css$cssFunction,
					'rgba',
					A2(
						_elm_lang$core$List$map,
						_rtfeldman$elm_css$Css$numberToString,
						_elm_lang$core$Native_List.fromArray(
							[red, green, blue, alpha]))),
				color: _rtfeldman$elm_css$Css$Compatible,
				warnings: warnings,
				red: red,
				green: green,
				blue: blue,
				alpha: 1
			};
		});
	var _rtfeldman$elm_css$Css$hex = function (str) {
		var value = _elm_lang$core$Native_Utils.eq(
			A3(_elm_lang$core$String$slice, 0, 1, str),
			'#') ? str : A2(_elm_lang$core$Basics_ops['++'], '#', str);
		var warnings = A2(
			_elm_lang$core$Regex$contains,
			_elm_lang$core$Regex$regex('^#([a-fA-F0-9]{8}|[a-fA-F0-9]{6}|[a-fA-F0-9]{4}|[a-fA-F0-9]{3})$'),
			value) ? _elm_lang$core$Native_List.fromArray(
			[]) : _elm_lang$core$Native_List.fromArray(
			[
				A2(
				_elm_lang$core$String$join,
				' ',
				_elm_lang$core$Native_List.fromArray(
					['The syntax of a hex-color is a token whose value consists of 3, 4, 6, or 8 hexadecimal digits.', value, 'is not valid.', 'Please see: https://drafts.csswg.org/css-color/#hex-notation']))
			]);
		return {value: value, color: _rtfeldman$elm_css$Css$Compatible, red: 0, green: 0, blue: 0, alpha: 1, warnings: warnings};
	};
	var _rtfeldman$elm_css$Css$hslaToRgba = F6(
		function (value, warnings, hue, saturation, lightness, alpha) {
			var blue = 0;
			var green = 0;
			var red = 0;
			return {value: value, color: _rtfeldman$elm_css$Css$Compatible, red: red, green: green, blue: blue, alpha: alpha, warnings: warnings};
		});
	var _rtfeldman$elm_css$Css$hsl = F3(
		function (hue, saturation, lightness) {
			var valuesList = _elm_lang$core$Native_List.fromArray(
				[
					_rtfeldman$elm_css$Css$numberToString(hue),
					_rtfeldman$elm_css$Css$numericalPercentageToString(saturation),
					_rtfeldman$elm_css$Css$numericalPercentageToString(lightness)
				]);
			var value = A2(_rtfeldman$elm_css$Css$cssFunction, 'hsl', valuesList);
			var warnings = ((_elm_lang$core$Native_Utils.cmp(hue, 360) > 0) || ((_elm_lang$core$Native_Utils.cmp(hue, 0) < 0) || ((_elm_lang$core$Native_Utils.cmp(saturation, 1) > 0) || ((_elm_lang$core$Native_Utils.cmp(saturation, 0) < 0) || ((_elm_lang$core$Native_Utils.cmp(lightness, 1) > 0) || (_elm_lang$core$Native_Utils.cmp(lightness, 0) < 0)))))) ? _elm_lang$core$Native_List.fromArray(
				[
					A2(
					_elm_lang$core$Basics_ops['++'],
					'HSL color values must have an H value between 0 and 360 (as in degrees) and S and L values between 0 and 1. ',
					A2(_elm_lang$core$Basics_ops['++'], value, ' is not valid.'))
				]) : _elm_lang$core$Native_List.fromArray(
				[]);
			return A6(_rtfeldman$elm_css$Css$hslaToRgba, value, warnings, hue, saturation, lightness, 1);
		});
	var _rtfeldman$elm_css$Css$hsla = F4(
		function (hue, saturation, lightness, alpha) {
			var valuesList = _elm_lang$core$Native_List.fromArray(
				[
					_rtfeldman$elm_css$Css$numberToString(hue),
					_rtfeldman$elm_css$Css$numericalPercentageToString(saturation),
					_rtfeldman$elm_css$Css$numericalPercentageToString(lightness),
					_rtfeldman$elm_css$Css$numberToString(alpha)
				]);
			var value = A2(_rtfeldman$elm_css$Css$cssFunction, 'hsla', valuesList);
			var warnings = ((_elm_lang$core$Native_Utils.cmp(hue, 360) > 0) || ((_elm_lang$core$Native_Utils.cmp(hue, 0) < 0) || ((_elm_lang$core$Native_Utils.cmp(saturation, 1) > 0) || ((_elm_lang$core$Native_Utils.cmp(saturation, 0) < 0) || ((_elm_lang$core$Native_Utils.cmp(lightness, 1) > 0) || ((_elm_lang$core$Native_Utils.cmp(lightness, 0) < 0) || ((_elm_lang$core$Native_Utils.cmp(alpha, 1) > 0) || (_elm_lang$core$Native_Utils.cmp(alpha, 0) < 0)))))))) ? _elm_lang$core$Native_List.fromArray(
				[
					A2(
					_elm_lang$core$Basics_ops['++'],
					'HSLA color values must have an H value between 0 and 360 (as in degrees) and S, L, and A values between 0 and 1. ',
					A2(_elm_lang$core$Basics_ops['++'], value, ' is not valid.'))
				]) : _elm_lang$core$Native_List.fromArray(
				[]);
			return A6(_rtfeldman$elm_css$Css$hslaToRgba, value, warnings, hue, saturation, lightness, alpha);
		});
	var _rtfeldman$elm_css$Css$optimizeSpeed = {value: 'optimizeSpeed', textRendering: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$optimizeLegibility = {value: 'optimizeLegibility', textRendering: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$geometricPrecision = {value: 'geometricPrecision', textRendering: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$hanging = {value: 'hanging', textIndent: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$eachLine = {value: 'each-line', textIndent: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$capitalize = {value: 'capitalize', textTransform: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$uppercase = {value: 'uppercase', textTransform: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$lowercase = {value: 'lowercase', textTransform: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$fullWidth = {value: 'full-width', textTransform: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$ellipsis = {value: 'ellipsis', textOverflow: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$clip = {value: 'clip', textOverflow: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$wavy = {value: 'wavy', textDecorationStyle: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$dotted = {value: 'dotted', borderStyle: _rtfeldman$elm_css$Css$Compatible, textDecorationStyle: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$dashed = {value: 'dashed', borderStyle: _rtfeldman$elm_css$Css$Compatible, textDecorationStyle: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$solid = {value: 'solid', borderStyle: _rtfeldman$elm_css$Css$Compatible, textDecorationStyle: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$double = {value: 'double', borderStyle: _rtfeldman$elm_css$Css$Compatible, textDecorationStyle: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$groove = {value: 'groove', borderStyle: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$ridge = {value: 'ridge', borderStyle: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$inset = {value: 'inset', borderStyle: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$outset = {value: 'outset', borderStyle: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$lengthConverter = F3(
		function (units, unitLabel, num) {
			return {
				value: A2(
					_elm_lang$core$Basics_ops['++'],
					_rtfeldman$elm_css$Css$numberToString(num),
					unitLabel),
				numericValue: num,
				units: units,
				unitLabel: unitLabel,
				length: _rtfeldman$elm_css$Css$Compatible,
				lengthOrAuto: _rtfeldman$elm_css$Css$Compatible,
				lengthOrNumber: _rtfeldman$elm_css$Css$Compatible,
				lengthOrNone: _rtfeldman$elm_css$Css$Compatible,
				lengthOrMinMaxDimension: _rtfeldman$elm_css$Css$Compatible,
				lengthOrNoneOrMinMaxDimension: _rtfeldman$elm_css$Css$Compatible,
				textIndent: _rtfeldman$elm_css$Css$Compatible,
				flexBasis: _rtfeldman$elm_css$Css$Compatible,
				lengthOrNumberOrAutoOrNoneOrContent: _rtfeldman$elm_css$Css$Compatible,
				fontSize: _rtfeldman$elm_css$Css$Compatible
			};
		});
	var _rtfeldman$elm_css$Css$angleConverter = F2(
		function (suffix, num) {
			return {
				value: A2(
					_elm_lang$core$Basics_ops['++'],
					_rtfeldman$elm_css$Css$numberToString(num),
					suffix),
				angle: _rtfeldman$elm_css$Css$Compatible
			};
		});
	var _rtfeldman$elm_css$Css$deg = _rtfeldman$elm_css$Css$angleConverter('deg');
	var _rtfeldman$elm_css$Css$grad = _rtfeldman$elm_css$Css$angleConverter('grad');
	var _rtfeldman$elm_css$Css$rad = _rtfeldman$elm_css$Css$angleConverter('rad');
	var _rtfeldman$elm_css$Css$turn = _rtfeldman$elm_css$Css$angleConverter('turn');
	var _rtfeldman$elm_css$Css$matrix = F6(
		function (a, b, c, d, tx, ty) {
			return {
				value: A2(
					_rtfeldman$elm_css$Css$cssFunction,
					'matrix',
					A2(
						_elm_lang$core$List$map,
						_rtfeldman$elm_css$Css$numberToString,
						_elm_lang$core$Native_List.fromArray(
							[a, b, c, d, tx, ty]))),
				transform: _rtfeldman$elm_css$Css$Compatible
			};
		});
	var _rtfeldman$elm_css$Css$matrix3d = function (a1) {
		return function (a2) {
			return function (a3) {
				return function (a4) {
					return function (b1) {
						return function (b2) {
							return function (b3) {
								return function (b4) {
									return function (c1) {
										return function (c2) {
											return function (c3) {
												return function (c4) {
													return function (d1) {
														return function (d2) {
															return function (d3) {
																return function (d4) {
																	return {
																		value: A2(
																			_rtfeldman$elm_css$Css$cssFunction,
																			'matrix3d',
																			A2(
																				_elm_lang$core$List$map,
																				_rtfeldman$elm_css$Css$numberToString,
																				_elm_lang$core$Native_List.fromArray(
																					[a1, a2, a3, a4, b1, b2, b3, b4, c1, c2, c3, c4, d1, d2, d3, d4]))),
																		transform: _rtfeldman$elm_css$Css$Compatible
																	};
																};
															};
														};
													};
												};
											};
										};
									};
								};
							};
						};
					};
				};
			};
		};
	};
	var _rtfeldman$elm_css$Css$perspective = function (l) {
		return {
			value: A2(
				_rtfeldman$elm_css$Css$cssFunction,
				'perspective',
				_elm_lang$core$Native_List.fromArray(
					[
						_rtfeldman$elm_css$Css$numberToString(l)
					])),
			transform: _rtfeldman$elm_css$Css$Compatible
		};
	};
	var _rtfeldman$elm_css$Css$rotate = function (_p19) {
		var _p20 = _p19;
		return {
			value: A2(
				_rtfeldman$elm_css$Css$cssFunction,
				'rotate',
				_elm_lang$core$Native_List.fromArray(
					[_p20.value])),
			transform: _rtfeldman$elm_css$Css$Compatible
		};
	};
	var _rtfeldman$elm_css$Css$rotateX = function (_p21) {
		var _p22 = _p21;
		return {
			value: A2(
				_rtfeldman$elm_css$Css$cssFunction,
				'rotateX',
				_elm_lang$core$Native_List.fromArray(
					[_p22.value])),
			transform: _rtfeldman$elm_css$Css$Compatible
		};
	};
	var _rtfeldman$elm_css$Css$rotateY = function (_p23) {
		var _p24 = _p23;
		return {
			value: A2(
				_rtfeldman$elm_css$Css$cssFunction,
				'rotateY',
				_elm_lang$core$Native_List.fromArray(
					[_p24.value])),
			transform: _rtfeldman$elm_css$Css$Compatible
		};
	};
	var _rtfeldman$elm_css$Css$rotateZ = function (_p25) {
		var _p26 = _p25;
		return {
			value: A2(
				_rtfeldman$elm_css$Css$cssFunction,
				'rotateZ',
				_elm_lang$core$Native_List.fromArray(
					[_p26.value])),
			transform: _rtfeldman$elm_css$Css$Compatible
		};
	};
	var _rtfeldman$elm_css$Css$rotate3d = F4(
		function (x, y, z, _p27) {
			var _p28 = _p27;
			var coordsAsStrings = A2(
				_elm_lang$core$List$map,
				_rtfeldman$elm_css$Css$numberToString,
				_elm_lang$core$Native_List.fromArray(
					[x, y, z]));
			return {
				value: A2(
					_rtfeldman$elm_css$Css$cssFunction,
					'rotate3d',
					A2(
						_elm_lang$core$Basics_ops['++'],
						coordsAsStrings,
						_elm_lang$core$Native_List.fromArray(
							[_p28.value]))),
				transform: _rtfeldman$elm_css$Css$Compatible
			};
		});
	var _rtfeldman$elm_css$Css$scale = function (x) {
		return {
			value: A2(
				_rtfeldman$elm_css$Css$cssFunction,
				'scale',
				_elm_lang$core$Native_List.fromArray(
					[
						_rtfeldman$elm_css$Css$numberToString(x)
					])),
			transform: _rtfeldman$elm_css$Css$Compatible
		};
	};
	var _rtfeldman$elm_css$Css$scale2 = F2(
		function (x, y) {
			return {
				value: A2(
					_rtfeldman$elm_css$Css$cssFunction,
					'scale',
					A2(
						_elm_lang$core$List$map,
						_rtfeldman$elm_css$Css$numberToString,
						_elm_lang$core$Native_List.fromArray(
							[x, y]))),
				transform: _rtfeldman$elm_css$Css$Compatible
			};
		});
	var _rtfeldman$elm_css$Css$scaleX = function (x) {
		return {
			value: A2(
				_rtfeldman$elm_css$Css$cssFunction,
				'scaleX',
				_elm_lang$core$Native_List.fromArray(
					[
						_rtfeldman$elm_css$Css$numberToString(x)
					])),
			transform: _rtfeldman$elm_css$Css$Compatible
		};
	};
	var _rtfeldman$elm_css$Css$scaleY = function (y) {
		return {
			value: A2(
				_rtfeldman$elm_css$Css$cssFunction,
				'scaleY',
				_elm_lang$core$Native_List.fromArray(
					[
						_rtfeldman$elm_css$Css$numberToString(y)
					])),
			transform: _rtfeldman$elm_css$Css$Compatible
		};
	};
	var _rtfeldman$elm_css$Css$scale3d = F3(
		function (x, y, z) {
			return {
				value: A2(
					_rtfeldman$elm_css$Css$cssFunction,
					'scale3d',
					A2(
						_elm_lang$core$List$map,
						_rtfeldman$elm_css$Css$numberToString,
						_elm_lang$core$Native_List.fromArray(
							[x, y, z]))),
				transform: _rtfeldman$elm_css$Css$Compatible
			};
		});
	var _rtfeldman$elm_css$Css$skew = function (_p29) {
		var _p30 = _p29;
		return {
			value: A2(
				_rtfeldman$elm_css$Css$cssFunction,
				'skew',
				_elm_lang$core$Native_List.fromArray(
					[_p30.value])),
			transform: _rtfeldman$elm_css$Css$Compatible
		};
	};
	var _rtfeldman$elm_css$Css$skew2 = F2(
		function (ax, ay) {
			return {
				value: A2(
					_rtfeldman$elm_css$Css$cssFunction,
					'skew',
					_elm_lang$core$Native_List.fromArray(
						[ax.value, ay.value])),
				transform: _rtfeldman$elm_css$Css$Compatible
			};
		});
	var _rtfeldman$elm_css$Css$skewX = function (_p31) {
		var _p32 = _p31;
		return {
			value: A2(
				_rtfeldman$elm_css$Css$cssFunction,
				'skewX',
				_elm_lang$core$Native_List.fromArray(
					[_p32.value])),
			transform: _rtfeldman$elm_css$Css$Compatible
		};
	};
	var _rtfeldman$elm_css$Css$skewY = function (_p33) {
		var _p34 = _p33;
		return {
			value: A2(
				_rtfeldman$elm_css$Css$cssFunction,
				'skewY',
				_elm_lang$core$Native_List.fromArray(
					[_p34.value])),
			transform: _rtfeldman$elm_css$Css$Compatible
		};
	};
	var _rtfeldman$elm_css$Css$translate = function (_p35) {
		var _p36 = _p35;
		return {
			value: A2(
				_rtfeldman$elm_css$Css$cssFunction,
				'translate',
				_elm_lang$core$Native_List.fromArray(
					[_p36.value])),
			transform: _rtfeldman$elm_css$Css$Compatible
		};
	};
	var _rtfeldman$elm_css$Css$translate2 = F2(
		function (tx, ty) {
			return {
				value: A2(
					_rtfeldman$elm_css$Css$cssFunction,
					'translate',
					_elm_lang$core$Native_List.fromArray(
						[tx.value, ty.value])),
				transform: _rtfeldman$elm_css$Css$Compatible
			};
		});
	var _rtfeldman$elm_css$Css$translateX = function (_p37) {
		var _p38 = _p37;
		return {
			value: A2(
				_rtfeldman$elm_css$Css$cssFunction,
				'translateX',
				_elm_lang$core$Native_List.fromArray(
					[_p38.value])),
			transform: _rtfeldman$elm_css$Css$Compatible
		};
	};
	var _rtfeldman$elm_css$Css$translateY = function (_p39) {
		var _p40 = _p39;
		return {
			value: A2(
				_rtfeldman$elm_css$Css$cssFunction,
				'translateY',
				_elm_lang$core$Native_List.fromArray(
					[_p40.value])),
			transform: _rtfeldman$elm_css$Css$Compatible
		};
	};
	var _rtfeldman$elm_css$Css$translateZ = function (_p41) {
		var _p42 = _p41;
		return {
			value: A2(
				_rtfeldman$elm_css$Css$cssFunction,
				'translateZ',
				_elm_lang$core$Native_List.fromArray(
					[_p42.value])),
			transform: _rtfeldman$elm_css$Css$Compatible
		};
	};
	var _rtfeldman$elm_css$Css$translate3d = F3(
		function (tx, ty, tz) {
			return {
				value: A2(
					_rtfeldman$elm_css$Css$cssFunction,
					'translate3d',
					_elm_lang$core$Native_List.fromArray(
						[tx.value, ty.value, tz.value])),
				transform: _rtfeldman$elm_css$Css$Compatible
			};
		});
	var _rtfeldman$elm_css$Css$fillBox = {value: 'fill-box', transformBox: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$contentBox = {value: 'content-box', boxSizing: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$borderBox = {value: 'border-box', boxSizing: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$viewBox = {value: 'view-box', transformBox: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$preserve3d = {value: 'preserve-3d', transformStyle: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$flat = {value: 'flat', transformStyle: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$content = {value: 'content', flexBasis: _rtfeldman$elm_css$Css$Compatible, lengthOrNumberOrAutoOrNoneOrContent: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$wrap = {value: 'wrap', flexWrap: _rtfeldman$elm_css$Css$Compatible, flexDirectionOrWrap: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$wrapReverse = _elm_lang$core$Native_Utils.update(
		_rtfeldman$elm_css$Css$wrap,
		{value: 'wrap-reverse'});
	var _rtfeldman$elm_css$Css$row = {value: 'row', flexDirection: _rtfeldman$elm_css$Css$Compatible, flexDirectionOrWrap: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$rowReverse = _elm_lang$core$Native_Utils.update(
		_rtfeldman$elm_css$Css$row,
		{value: 'row-reverse'});
	var _rtfeldman$elm_css$Css$column = _elm_lang$core$Native_Utils.update(
		_rtfeldman$elm_css$Css$row,
		{value: 'column'});
	var _rtfeldman$elm_css$Css$columnReverse = _elm_lang$core$Native_Utils.update(
		_rtfeldman$elm_css$Css$row,
		{value: 'column-reverse'});
	var _rtfeldman$elm_css$Css$underline = {value: 'underline', textDecorationLine: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$overline = {value: 'overline', textDecorationLine: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$lineThrough = {value: 'line-through', textDecorationLine: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$block = {value: 'block', display: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$inlineBlock = {value: 'inline-block', display: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$inline = {value: 'inline', display: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$none = {value: 'none', none: _rtfeldman$elm_css$Css$Compatible, lengthOrNone: _rtfeldman$elm_css$Css$Compatible, lengthOrNoneOrMinMaxDimension: _rtfeldman$elm_css$Css$Compatible, lengthOrNumberOrAutoOrNoneOrContent: _rtfeldman$elm_css$Css$Compatible, textDecorationLine: _rtfeldman$elm_css$Css$Compatible, display: _rtfeldman$elm_css$Css$Compatible, transform: _rtfeldman$elm_css$Css$Compatible, borderStyle: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$auto = {value: 'auto', flexBasis: _rtfeldman$elm_css$Css$Compatible, overflow: _rtfeldman$elm_css$Css$Compatible, textRendering: _rtfeldman$elm_css$Css$Compatible, lengthOrAuto: _rtfeldman$elm_css$Css$Compatible, lengthOrNumberOrAutoOrNoneOrContent: _rtfeldman$elm_css$Css$Compatible, alignItemsOrAuto: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$noWrap = {value: 'nowrap', whiteSpace: _rtfeldman$elm_css$Css$Compatible, flexWrap: _rtfeldman$elm_css$Css$Compatible, flexDirectionOrWrap: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$fillAvailable = {value: 'fill-available', minMaxDimension: _rtfeldman$elm_css$Css$Compatible, lengthOrMinMaxDimension: _rtfeldman$elm_css$Css$Compatible, lengthOrNoneOrMinMaxDimension: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$maxContent = _elm_lang$core$Native_Utils.update(
		_rtfeldman$elm_css$Css$fillAvailable,
		{value: 'max-content'});
	var _rtfeldman$elm_css$Css$minContent = _elm_lang$core$Native_Utils.update(
		_rtfeldman$elm_css$Css$fillAvailable,
		{value: 'min-content'});
	var _rtfeldman$elm_css$Css$fitContent = _elm_lang$core$Native_Utils.update(
		_rtfeldman$elm_css$Css$fillAvailable,
		{value: 'fit-content'});
	var _rtfeldman$elm_css$Css$static = {value: 'static', position: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$fixed = {value: 'fixed', position: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$sticky = {value: 'sticky', position: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$relative = {value: 'relative', position: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$absolute = {value: 'absolute', position: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$serif = {value: 'serif', fontFamily: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$sansSerif = {value: 'sans-serif', fontFamily: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$monospace = {value: 'monospace', fontFamily: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$cursive = {value: 'cursive', fontFamily: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$fantasy = {value: 'fantasy', fontFamily: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$xxSmall = {value: 'xx-small', fontSize: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$xSmall = {value: 'x-small', fontSize: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$small = {value: 'small', fontSize: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$medium = {value: 'medium', fontSize: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$large = {value: 'large', fontSize: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$xLarge = {value: 'x-large', fontSize: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$xxLarge = {value: 'xx-large', fontSize: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$smaller = {value: 'smaller', fontSize: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$larger = {value: 'larger', fontSize: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$normal = {
		value: 'normal',
		warnings: _elm_lang$core$Native_List.fromArray(
			[]),
		fontStyle: _rtfeldman$elm_css$Css$Compatible,
		featureTagValue: _rtfeldman$elm_css$Css$Compatible
	};
	var _rtfeldman$elm_css$Css$italic = {value: 'italic', fontStyle: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$oblique = {value: 'oblique', fontStyle: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$bold = {value: 'bold', lengthOrNumberOrAutoOrNoneOrContent: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$lighter = {value: 'lighter', lengthOrNumberOrAutoOrNoneOrContent: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$bolder = {value: 'bolder', lengthOrNumberOrAutoOrNoneOrContent: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$smallCaps = {value: 'small-caps', fontVariant: _rtfeldman$elm_css$Css$Compatible, fontVariantCaps: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$allSmallCaps = {value: 'all-small-caps', fontVariant: _rtfeldman$elm_css$Css$Compatible, fontVariantCaps: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$petiteCaps = {value: 'petite-caps', fontVariant: _rtfeldman$elm_css$Css$Compatible, fontVariantCaps: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$allPetiteCaps = {value: 'all-petite-caps', fontVariant: _rtfeldman$elm_css$Css$Compatible, fontVariantCaps: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$unicase = {value: 'unicase', fontVariant: _rtfeldman$elm_css$Css$Compatible, fontVariantCaps: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$titlingCaps = {value: 'titling-caps', fontVariant: _rtfeldman$elm_css$Css$Compatible, fontVariantCaps: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$commonLigatures = {value: 'common-ligatures', fontVariant: _rtfeldman$elm_css$Css$Compatible, fontVariantLigatures: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$noCommonLigatures = {value: 'no-common-ligatures', fontVariant: _rtfeldman$elm_css$Css$Compatible, fontVariantLigatures: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$discretionaryLigatures = {value: 'discretionary-ligatures', fontVariant: _rtfeldman$elm_css$Css$Compatible, fontVariantLigatures: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$noDiscretionaryLigatures = {value: 'no-discretionary-ligatures', fontVariant: _rtfeldman$elm_css$Css$Compatible, fontVariantLigatures: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$historicalLigatures = {value: 'historical-ligatures', fontVariant: _rtfeldman$elm_css$Css$Compatible, fontVariantLigatures: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$noHistoricalLigatures = {value: 'no-historical-ligatures', fontVariant: _rtfeldman$elm_css$Css$Compatible, fontVariantLigatures: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$contextual = {value: 'context', fontVariant: _rtfeldman$elm_css$Css$Compatible, fontVariantLigatures: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$noContextual = {value: 'no-contextual', fontVariant: _rtfeldman$elm_css$Css$Compatible, fontVariantLigatures: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$liningNums = {value: 'lining-nums', fontVariant: _rtfeldman$elm_css$Css$Compatible, fontVariantNumeric: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$oldstyleNums = {value: 'oldstyle-nums', fontVariant: _rtfeldman$elm_css$Css$Compatible, fontVariantNumeric: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$proportionalNums = {value: 'proportional-nums', fontVariant: _rtfeldman$elm_css$Css$Compatible, fontVariantNumeric: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$tabularNums = {value: 'tabular-nums', fontVariant: _rtfeldman$elm_css$Css$Compatible, fontVariantNumeric: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$diagonalFractions = {value: 'diagonal-fractions', fontVariant: _rtfeldman$elm_css$Css$Compatible, fontVariantNumeric: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$stackedFractions = {value: 'stacked-fractions', fontVariant: _rtfeldman$elm_css$Css$Compatible, fontVariantNumeric: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$ordinal = {value: 'ordinal', fontVariant: _rtfeldman$elm_css$Css$Compatible, fontVariantNumeric: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$slashedZero = {value: 'slashed-zero', fontVariant: _rtfeldman$elm_css$Css$Compatible, fontVariantNumeric: _rtfeldman$elm_css$Css$Compatible};
	var _rtfeldman$elm_css$Css$featureTag2 = F2(
		function (tag, value) {
			var potentialWarnings = _elm_lang$core$Native_List.fromArray(
				[
					{
					ctor: '_Tuple2',
					_0: !_elm_lang$core$Native_Utils.eq(
						_elm_lang$core$String$length(tag),
						4),
					_1: A2(
						_elm_lang$core$Basics_ops['++'],
						'Feature tags must be exactly 4 characters long. ',
						A2(_elm_lang$core$Basics_ops['++'], tag, ' is invalid.'))
				},
					{
					ctor: '_Tuple2',
					_0: _elm_lang$core$Native_Utils.cmp(value, 0) < 0,
					_1: A2(
						_elm_lang$core$Basics_ops['++'],
						'Feature values cannot be negative. ',
						A2(
							_elm_lang$core$Basics_ops['++'],
							_elm_lang$core$Basics$toString(value),
							' is invalid.'))
				}
				]);
			var warnings = A2(
				_elm_lang$core$List$map,
				_elm_lang$core$Basics$snd,
				A2(_elm_lang$core$List$filter, _elm_lang$core$Basics$fst, potentialWarnings));
			return {
				value: A2(
					_elm_lang$core$Basics_ops['++'],
					_elm_lang$core$Basics$toString(tag),
					A2(
						_elm_lang$core$Basics_ops['++'],
						' ',
						_elm_lang$core$Basics$toString(value))),
				featureTagValue: _rtfeldman$elm_css$Css$Compatible,
				warnings: warnings
			};
		});
	var _rtfeldman$elm_css$Css$featureTag = function (tag) {
		return A2(_rtfeldman$elm_css$Css$featureTag2, tag, 1);
	};
	var _rtfeldman$elm_css$Css$PseudoClass = F2(
		function (a, b) {
			return {ctor: 'PseudoClass', _0: a, _1: b};
		});
	var _rtfeldman$elm_css$Css$PseudoElement = F2(
		function (a, b) {
			return {ctor: 'PseudoElement', _0: a, _1: b};
		});
	var _rtfeldman$elm_css$Css$PercentageUnits = {ctor: 'PercentageUnits'};
	var _rtfeldman$elm_css$Css$pct = A2(_rtfeldman$elm_css$Css$lengthConverter, _rtfeldman$elm_css$Css$PercentageUnits, '%');
	var _rtfeldman$elm_css$Css$EmUnits = {ctor: 'EmUnits'};
	var _rtfeldman$elm_css$Css$em = A2(_rtfeldman$elm_css$Css$lengthConverter, _rtfeldman$elm_css$Css$EmUnits, 'em');
	var _rtfeldman$elm_css$Css$ExUnits = {ctor: 'ExUnits'};
	var _rtfeldman$elm_css$Css$ex = A2(_rtfeldman$elm_css$Css$lengthConverter, _rtfeldman$elm_css$Css$ExUnits, 'ex');
	var _rtfeldman$elm_css$Css$ChUnits = {ctor: 'ChUnits'};
	var _rtfeldman$elm_css$Css$ch = A2(_rtfeldman$elm_css$Css$lengthConverter, _rtfeldman$elm_css$Css$ChUnits, 'ch');
	var _rtfeldman$elm_css$Css$RemUnits = {ctor: 'RemUnits'};
	var _rtfeldman$elm_css$Css$rem = A2(_rtfeldman$elm_css$Css$lengthConverter, _rtfeldman$elm_css$Css$RemUnits, 'rem');
	var _rtfeldman$elm_css$Css$VhUnits = {ctor: 'VhUnits'};
	var _rtfeldman$elm_css$Css$vh = A2(_rtfeldman$elm_css$Css$lengthConverter, _rtfeldman$elm_css$Css$VhUnits, 'vh');
	var _rtfeldman$elm_css$Css$VwUnits = {ctor: 'VwUnits'};
	var _rtfeldman$elm_css$Css$vw = A2(_rtfeldman$elm_css$Css$lengthConverter, _rtfeldman$elm_css$Css$VwUnits, 'vw');
	var _rtfeldman$elm_css$Css$VMinUnits = {ctor: 'VMinUnits'};
	var _rtfeldman$elm_css$Css$vmin = A2(_rtfeldman$elm_css$Css$lengthConverter, _rtfeldman$elm_css$Css$VMinUnits, 'vmin');
	var _rtfeldman$elm_css$Css$VMaxUnits = {ctor: 'VMaxUnits'};
	var _rtfeldman$elm_css$Css$vmax = A2(_rtfeldman$elm_css$Css$lengthConverter, _rtfeldman$elm_css$Css$VMaxUnits, 'vmax');
	var _rtfeldman$elm_css$Css$PxUnits = {ctor: 'PxUnits'};
	var _rtfeldman$elm_css$Css$px = A2(_rtfeldman$elm_css$Css$lengthConverter, _rtfeldman$elm_css$Css$PxUnits, 'px');
	var _rtfeldman$elm_css$Css$MMUnits = {ctor: 'MMUnits'};
	var _rtfeldman$elm_css$Css$mm = A2(_rtfeldman$elm_css$Css$lengthConverter, _rtfeldman$elm_css$Css$MMUnits, 'mm');
	var _rtfeldman$elm_css$Css$CMUnits = {ctor: 'CMUnits'};
	var _rtfeldman$elm_css$Css$cm = A2(_rtfeldman$elm_css$Css$lengthConverter, _rtfeldman$elm_css$Css$CMUnits, 'cm');
	var _rtfeldman$elm_css$Css$InchUnits = {ctor: 'InchUnits'};
	var _rtfeldman$elm_css$Css$inches = A2(_rtfeldman$elm_css$Css$lengthConverter, _rtfeldman$elm_css$Css$InchUnits, 'in');
	var _rtfeldman$elm_css$Css$PtUnits = {ctor: 'PtUnits'};
	var _rtfeldman$elm_css$Css$pt = A2(_rtfeldman$elm_css$Css$lengthConverter, _rtfeldman$elm_css$Css$PtUnits, 'pt');
	var _rtfeldman$elm_css$Css$PcUnits = {ctor: 'PcUnits'};
	var _rtfeldman$elm_css$Css$pc = A2(_rtfeldman$elm_css$Css$lengthConverter, _rtfeldman$elm_css$Css$PcUnits, 'pc');
	var _rtfeldman$elm_css$Css$UnitlessInteger = {ctor: 'UnitlessInteger'};
	var _rtfeldman$elm_css$Css$zero = {value: '0', length: _rtfeldman$elm_css$Css$Compatible, lengthOrNumber: _rtfeldman$elm_css$Css$Compatible, lengthOrNone: _rtfeldman$elm_css$Css$Compatible, lengthOrAuto: _rtfeldman$elm_css$Css$Compatible, lengthOrMinMaxDimension: _rtfeldman$elm_css$Css$Compatible, lengthOrNoneOrMinMaxDimension: _rtfeldman$elm_css$Css$Compatible, number: _rtfeldman$elm_css$Css$Compatible, units: _rtfeldman$elm_css$Css$UnitlessInteger, unitLabel: '', numericValue: 0};
	var _rtfeldman$elm_css$Css$int = function (val) {
		return {
			value: _rtfeldman$elm_css$Css$numberToString(val),
			lengthOrNumber: _rtfeldman$elm_css$Css$Compatible,
			number: _rtfeldman$elm_css$Css$Compatible,
			lengthOrNumberOrAutoOrNoneOrContent: _rtfeldman$elm_css$Css$Compatible,
			numericValue: _elm_lang$core$Basics$toFloat(val),
			unitLabel: '',
			units: _rtfeldman$elm_css$Css$UnitlessInteger
		};
	};
	var _rtfeldman$elm_css$Css$UnitlessFloat = {ctor: 'UnitlessFloat'};
	var _rtfeldman$elm_css$Css$float = function (val) {
		return {
			value: _rtfeldman$elm_css$Css$numberToString(val),
			lengthOrNumber: _rtfeldman$elm_css$Css$Compatible,
			number: _rtfeldman$elm_css$Css$Compatible,
			lengthOrNumberOrAutoOrNoneOrContent: _rtfeldman$elm_css$Css$Compatible,
			numericValue: val,
			unitLabel: '',
			units: _rtfeldman$elm_css$Css$UnitlessFloat
		};
	};
	var _rtfeldman$elm_css$Css$IncompatibleUnits = {ctor: 'IncompatibleUnits'};
	var _rtfeldman$elm_css$Css$initial = {value: 'initial', overflow: _rtfeldman$elm_css$Css$Compatible, none: _rtfeldman$elm_css$Css$Compatible, number: _rtfeldman$elm_css$Css$Compatible, textDecorationLine: _rtfeldman$elm_css$Css$Compatible, textRendering: _rtfeldman$elm_css$Css$Compatible, textIndent: _rtfeldman$elm_css$Css$Compatible, textDecorationStyle: _rtfeldman$elm_css$Css$Compatible, boxSizing: _rtfeldman$elm_css$Css$Compatible, display: _rtfeldman$elm_css$Css$Compatible, all: _rtfeldman$elm_css$Css$Compatible, alignItems: _rtfeldman$elm_css$Css$Compatible, length: _rtfeldman$elm_css$Css$Compatible, lengthOrAuto: _rtfeldman$elm_css$Css$Compatible, lengthOrNone: _rtfeldman$elm_css$Css$Compatible, lengthOrNumber: _rtfeldman$elm_css$Css$Compatible, lengthOrMinMaxDimension: _rtfeldman$elm_css$Css$Compatible, lengthOrNoneOrMinMaxDimension: _rtfeldman$elm_css$Css$Compatible, flexBasis: _rtfeldman$elm_css$Css$Compatible, flexWrap: _rtfeldman$elm_css$Css$Compatible, flexDirection: _rtfeldman$elm_css$Css$Compatible, flexDirectionOrWrap: _rtfeldman$elm_css$Css$Compatible, lengthOrNumberOrAutoOrNoneOrContent: _rtfeldman$elm_css$Css$Compatible, fontFamily: _rtfeldman$elm_css$Css$Compatible, fontSize: _rtfeldman$elm_css$Css$Compatible, fontStyle: _rtfeldman$elm_css$Css$Compatible, fontWeight: _rtfeldman$elm_css$Css$Compatible, fontVariant: _rtfeldman$elm_css$Css$Compatible, units: _rtfeldman$elm_css$Css$IncompatibleUnits, numericValue: 0, unitLabel: ''};
	var _rtfeldman$elm_css$Css$unset = _elm_lang$core$Native_Utils.update(
		_rtfeldman$elm_css$Css$initial,
		{value: 'unset'});
	var _rtfeldman$elm_css$Css$inherit = _elm_lang$core$Native_Utils.update(
		_rtfeldman$elm_css$Css$initial,
		{value: 'inherit'});
	var _rtfeldman$elm_css$Css$lengthForOverloadedProperty = A3(_rtfeldman$elm_css$Css$lengthConverter, _rtfeldman$elm_css$Css$IncompatibleUnits, '', 0);
	var _rtfeldman$elm_css$Css$alignItems = function (fn) {
		return A3(
			_rtfeldman$elm_css$Css$getOverloadedProperty,
			'alignItems',
			'align-items',
			fn(_rtfeldman$elm_css$Css$lengthForOverloadedProperty));
	};
	var _rtfeldman$elm_css$Css$alignSelf = function (fn) {
		return A3(
			_rtfeldman$elm_css$Css$getOverloadedProperty,
			'alignSelf',
			'align-self',
			fn(_rtfeldman$elm_css$Css$lengthForOverloadedProperty));
	};
	var _rtfeldman$elm_css$Css$textAlignLast = function (fn) {
		return A3(
			_rtfeldman$elm_css$Css$getOverloadedProperty,
			'textAlignLast',
			'text-align-last',
			fn(_rtfeldman$elm_css$Css$lengthForOverloadedProperty));
	};
	var _rtfeldman$elm_css$Css$textAlign = function (fn) {
		return A3(
			_rtfeldman$elm_css$Css$getOverloadedProperty,
			'textAlign',
			'text-align',
			fn(_rtfeldman$elm_css$Css$lengthForOverloadedProperty));
	};
	var _rtfeldman$elm_css$Css$verticalAlign = function (fn) {
		return A3(
			_rtfeldman$elm_css$Css$getOverloadedProperty,
			'verticalAlign',
			'vertical-align',
			fn(_rtfeldman$elm_css$Css$lengthForOverloadedProperty));
	};
	var _rtfeldman$elm_css$Css$Rtl = {ctor: 'Rtl'};
	var _rtfeldman$elm_css$Css$Ltr = {ctor: 'Ltr'};
	var _rtfeldman$elm_css$Css$IntentionallyUnsupportedPleaseSeeDocs = {ctor: 'IntentionallyUnsupportedPleaseSeeDocs'};
	var _rtfeldman$elm_css$Css$thin = _rtfeldman$elm_css$Css$IntentionallyUnsupportedPleaseSeeDocs;
	var _rtfeldman$elm_css$Css$thick = _rtfeldman$elm_css$Css$IntentionallyUnsupportedPleaseSeeDocs;
	var _rtfeldman$elm_css$Css$blink = _rtfeldman$elm_css$Css$IntentionallyUnsupportedPleaseSeeDocs;

	var _rtfeldman$elm_css$Css_Elements$typeSelector = F2(
		function (selectorStr, mixins) {
			var sequence = A2(
				_rtfeldman$elm_css$Css_Structure$TypeSelectorSequence,
				_rtfeldman$elm_css$Css_Structure$TypeSelector(selectorStr),
				_elm_lang$core$Native_List.fromArray(
					[]));
			var selector = A3(
				_rtfeldman$elm_css$Css_Structure$Selector,
				sequence,
				_elm_lang$core$Native_List.fromArray(
					[]),
				_elm_lang$core$Maybe$Nothing);
			return _rtfeldman$elm_css$Css_Preprocess$Snippet(
				_elm_lang$core$Native_List.fromArray(
					[
						_rtfeldman$elm_css$Css_Preprocess$StyleBlockDeclaration(
						A3(
							_rtfeldman$elm_css$Css_Preprocess$StyleBlock,
							selector,
							_elm_lang$core$Native_List.fromArray(
								[]),
							mixins))
					]));
		});
	var _rtfeldman$elm_css$Css_Elements$html = _rtfeldman$elm_css$Css_Elements$typeSelector('html');
	var _rtfeldman$elm_css$Css_Elements$body = _rtfeldman$elm_css$Css_Elements$typeSelector('body');
	var _rtfeldman$elm_css$Css_Elements$article = _rtfeldman$elm_css$Css_Elements$typeSelector('article');
	var _rtfeldman$elm_css$Css_Elements$header = _rtfeldman$elm_css$Css_Elements$typeSelector('header');
	var _rtfeldman$elm_css$Css_Elements$footer = _rtfeldman$elm_css$Css_Elements$typeSelector('footer');
	var _rtfeldman$elm_css$Css_Elements$h1 = _rtfeldman$elm_css$Css_Elements$typeSelector('h1');
	var _rtfeldman$elm_css$Css_Elements$h2 = _rtfeldman$elm_css$Css_Elements$typeSelector('h2');
	var _rtfeldman$elm_css$Css_Elements$h3 = _rtfeldman$elm_css$Css_Elements$typeSelector('h3');
	var _rtfeldman$elm_css$Css_Elements$h4 = _rtfeldman$elm_css$Css_Elements$typeSelector('h4');
	var _rtfeldman$elm_css$Css_Elements$h5 = _rtfeldman$elm_css$Css_Elements$typeSelector('h5');
	var _rtfeldman$elm_css$Css_Elements$h6 = _rtfeldman$elm_css$Css_Elements$typeSelector('h6');
	var _rtfeldman$elm_css$Css_Elements$nav = _rtfeldman$elm_css$Css_Elements$typeSelector('nav');
	var _rtfeldman$elm_css$Css_Elements$section = _rtfeldman$elm_css$Css_Elements$typeSelector('section');
	var _rtfeldman$elm_css$Css_Elements$div = _rtfeldman$elm_css$Css_Elements$typeSelector('div');
	var _rtfeldman$elm_css$Css_Elements$hr = _rtfeldman$elm_css$Css_Elements$typeSelector('hr');
	var _rtfeldman$elm_css$Css_Elements$li = _rtfeldman$elm_css$Css_Elements$typeSelector('li');
	var _rtfeldman$elm_css$Css_Elements$main$ = _rtfeldman$elm_css$Css_Elements$typeSelector('main');
	var _rtfeldman$elm_css$Css_Elements$ol = _rtfeldman$elm_css$Css_Elements$typeSelector('ol');
	var _rtfeldman$elm_css$Css_Elements$p = _rtfeldman$elm_css$Css_Elements$typeSelector('p');
	var _rtfeldman$elm_css$Css_Elements$ul = _rtfeldman$elm_css$Css_Elements$typeSelector('ul');
	var _rtfeldman$elm_css$Css_Elements$pre = _rtfeldman$elm_css$Css_Elements$typeSelector('pre');
	var _rtfeldman$elm_css$Css_Elements$a = _rtfeldman$elm_css$Css_Elements$typeSelector('a');
	var _rtfeldman$elm_css$Css_Elements$code = _rtfeldman$elm_css$Css_Elements$typeSelector('code');
	var _rtfeldman$elm_css$Css_Elements$small = _rtfeldman$elm_css$Css_Elements$typeSelector('small');
	var _rtfeldman$elm_css$Css_Elements$span = _rtfeldman$elm_css$Css_Elements$typeSelector('span');
	var _rtfeldman$elm_css$Css_Elements$strong = _rtfeldman$elm_css$Css_Elements$typeSelector('strong');
	var _rtfeldman$elm_css$Css_Elements$img = _rtfeldman$elm_css$Css_Elements$typeSelector('img');
	var _rtfeldman$elm_css$Css_Elements$audio = _rtfeldman$elm_css$Css_Elements$typeSelector('audio');
	var _rtfeldman$elm_css$Css_Elements$video = _rtfeldman$elm_css$Css_Elements$typeSelector('video');
	var _rtfeldman$elm_css$Css_Elements$canvas = _rtfeldman$elm_css$Css_Elements$typeSelector('canvas');
	var _rtfeldman$elm_css$Css_Elements$caption = _rtfeldman$elm_css$Css_Elements$typeSelector('caption');
	var _rtfeldman$elm_css$Css_Elements$col = _rtfeldman$elm_css$Css_Elements$typeSelector('col');
	var _rtfeldman$elm_css$Css_Elements$colgroup = _rtfeldman$elm_css$Css_Elements$typeSelector('colgroup');
	var _rtfeldman$elm_css$Css_Elements$table = _rtfeldman$elm_css$Css_Elements$typeSelector('table');
	var _rtfeldman$elm_css$Css_Elements$tbody = _rtfeldman$elm_css$Css_Elements$typeSelector('tbody');
	var _rtfeldman$elm_css$Css_Elements$td = _rtfeldman$elm_css$Css_Elements$typeSelector('td');
	var _rtfeldman$elm_css$Css_Elements$tfoot = _rtfeldman$elm_css$Css_Elements$typeSelector('tfoot');
	var _rtfeldman$elm_css$Css_Elements$th = _rtfeldman$elm_css$Css_Elements$typeSelector('th');
	var _rtfeldman$elm_css$Css_Elements$thead = _rtfeldman$elm_css$Css_Elements$typeSelector('thead');
	var _rtfeldman$elm_css$Css_Elements$tr = _rtfeldman$elm_css$Css_Elements$typeSelector('tr');
	var _rtfeldman$elm_css$Css_Elements$button = _rtfeldman$elm_css$Css_Elements$typeSelector('button');
	var _rtfeldman$elm_css$Css_Elements$fieldset = _rtfeldman$elm_css$Css_Elements$typeSelector('fieldset');
	var _rtfeldman$elm_css$Css_Elements$form = _rtfeldman$elm_css$Css_Elements$typeSelector('form');
	var _rtfeldman$elm_css$Css_Elements$input = _rtfeldman$elm_css$Css_Elements$typeSelector('input');
	var _rtfeldman$elm_css$Css_Elements$label = _rtfeldman$elm_css$Css_Elements$typeSelector('label');
	var _rtfeldman$elm_css$Css_Elements$legend = _rtfeldman$elm_css$Css_Elements$typeSelector('legend');
	var _rtfeldman$elm_css$Css_Elements$optgroup = _rtfeldman$elm_css$Css_Elements$typeSelector('optgroup');
	var _rtfeldman$elm_css$Css_Elements$option = _rtfeldman$elm_css$Css_Elements$typeSelector('option');
	var _rtfeldman$elm_css$Css_Elements$progress = _rtfeldman$elm_css$Css_Elements$typeSelector('progress');
	var _rtfeldman$elm_css$Css_Elements$select = _rtfeldman$elm_css$Css_Elements$typeSelector('select');

	var _rtfeldman$elm_css$Css_Namespace$applyNamespaceToProperty = F2(
		function (name, property) {
			var _p0 = property.key;
			if (_p0 === 'animation-name') {
				return _elm_lang$core$Native_Utils.update(
					property,
					{
						value: A2(_elm_lang$core$Basics_ops['++'], name, property.value)
					});
			} else {
				return property;
			}
		});
	var _rtfeldman$elm_css$Css_Namespace$applyNamespaceToRepeatable = F2(
		function (name, selector) {
			var _p1 = selector;
			switch (_p1.ctor) {
				case 'ClassSelector':
					return _rtfeldman$elm_css$Css_Structure$ClassSelector(
						A2(_elm_lang$core$Basics_ops['++'], name, _p1._0));
				case 'IdSelector':
					return _rtfeldman$elm_css$Css_Structure$IdSelector(_p1._0);
				default:
					return _rtfeldman$elm_css$Css_Structure$PseudoClassSelector(_p1._0);
			}
		});
	var _rtfeldman$elm_css$Css_Namespace$applyNamespaceToSequence = F2(
		function (name, sequence) {
			var _p2 = sequence;
			switch (_p2.ctor) {
				case 'TypeSelectorSequence':
					return A2(
						_rtfeldman$elm_css$Css_Structure$TypeSelectorSequence,
						_p2._0,
						A2(
							_elm_lang$core$List$map,
							_rtfeldman$elm_css$Css_Namespace$applyNamespaceToRepeatable(name),
							_p2._1));
				case 'UniversalSelectorSequence':
					return _rtfeldman$elm_css$Css_Structure$UniversalSelectorSequence(
						A2(
							_elm_lang$core$List$map,
							_rtfeldman$elm_css$Css_Namespace$applyNamespaceToRepeatable(name),
							_p2._0));
				default:
					return A2(
						_rtfeldman$elm_css$Css_Structure$CustomSelector,
						_p2._0,
						A2(
							_elm_lang$core$List$map,
							_rtfeldman$elm_css$Css_Namespace$applyNamespaceToRepeatable(name),
							_p2._1));
			}
		});
	var _rtfeldman$elm_css$Css_Namespace$applyNamespaceToSelector = F2(
		function (name, _p3) {
			var _p4 = _p3;
			var apply = _rtfeldman$elm_css$Css_Namespace$applyNamespaceToSequence(name);
			return A3(
				_rtfeldman$elm_css$Css_Structure$Selector,
				apply(_p4._0),
				A2(
					_elm_lang$core$List$map,
					function (_p5) {
						var _p6 = _p5;
						return {
							ctor: '_Tuple2',
							_0: _p6._0,
							_1: apply(_p6._1)
						};
					},
					_p4._1),
				_p4._2);
		});
	var _rtfeldman$elm_css$Css_Namespace$applyNamespaceToMixin = F2(
		function (name, mixin) {
			var _p7 = mixin;
			switch (_p7.ctor) {
				case 'AppendProperty':
					return _rtfeldman$elm_css$Css_Preprocess$AppendProperty(
						A2(_rtfeldman$elm_css$Css_Namespace$applyNamespaceToProperty, name, _p7._0));
				case 'ExtendSelector':
					return A2(
						_rtfeldman$elm_css$Css_Preprocess$ExtendSelector,
						A2(_rtfeldman$elm_css$Css_Namespace$applyNamespaceToRepeatable, name, _p7._0),
						A2(
							_elm_lang$core$List$map,
							_rtfeldman$elm_css$Css_Namespace$applyNamespaceToMixin(name),
							_p7._1));
				case 'NestSnippet':
					return A2(
						_rtfeldman$elm_css$Css_Preprocess$NestSnippet,
						_p7._0,
						A2(
							_elm_lang$core$List$map,
							_rtfeldman$elm_css$Css_Namespace$applyNamespaceToSnippet(name),
							_p7._1));
				case 'WithPseudoElement':
					return A2(
						_rtfeldman$elm_css$Css_Preprocess$WithPseudoElement,
						_p7._0,
						A2(
							_elm_lang$core$List$map,
							_rtfeldman$elm_css$Css_Namespace$applyNamespaceToMixin(name),
							_p7._1));
				case 'WithMedia':
					return A2(
						_rtfeldman$elm_css$Css_Preprocess$WithMedia,
						_p7._0,
						A2(
							_elm_lang$core$List$map,
							_rtfeldman$elm_css$Css_Namespace$applyNamespaceToMixin(name),
							_p7._1));
				default:
					return _rtfeldman$elm_css$Css_Preprocess$ApplyMixins(
						A2(
							_elm_lang$core$List$map,
							_rtfeldman$elm_css$Css_Namespace$applyNamespaceToMixin(name),
							_p7._0));
			}
		});
	var _rtfeldman$elm_css$Css_Namespace$applyNamespaceToSnippet = F2(
		function (name, _p8) {
			var _p9 = _p8;
			return _rtfeldman$elm_css$Css_Preprocess$Snippet(
				A2(
					_elm_lang$core$List$map,
					_rtfeldman$elm_css$Css_Namespace$applyNamespaceToDeclaration(name),
					_p9._0));
		});
	var _rtfeldman$elm_css$Css_Namespace$applyNamespaceToDeclaration = F2(
		function (name, declaration) {
			var _p10 = declaration;
			switch (_p10.ctor) {
				case 'StyleBlockDeclaration':
					return _rtfeldman$elm_css$Css_Preprocess$StyleBlockDeclaration(
						A2(_rtfeldman$elm_css$Css_Namespace$applyNamespaceToStyleBlock, name, _p10._0));
				case 'MediaRule':
					return A2(
						_rtfeldman$elm_css$Css_Preprocess$MediaRule,
						_p10._0,
						A2(
							_elm_lang$core$List$map,
							_rtfeldman$elm_css$Css_Namespace$applyNamespaceToStyleBlock(name),
							_p10._1));
				case 'SupportsRule':
					return A2(
						_rtfeldman$elm_css$Css_Preprocess$SupportsRule,
						_p10._0,
						function (declarations) {
							return _elm_lang$core$Native_List.fromArray(
								[
									_rtfeldman$elm_css$Css_Preprocess$Snippet(declarations)
								]);
						}(
							A2(
								_elm_lang$core$List$map,
								_rtfeldman$elm_css$Css_Namespace$applyNamespaceToDeclaration(name),
								A2(_elm_lang$core$List$concatMap, _rtfeldman$elm_css$Css_Preprocess$unwrapSnippet, _p10._1))));
				case 'DocumentRule':
					return A5(
						_rtfeldman$elm_css$Css_Preprocess$DocumentRule,
						_p10._0,
						_p10._1,
						_p10._2,
						_p10._3,
						A2(_rtfeldman$elm_css$Css_Namespace$applyNamespaceToStyleBlock, name, _p10._4));
				case 'PageRule':
					return declaration;
				case 'FontFace':
					return declaration;
				case 'Keyframes':
					return A2(
						_rtfeldman$elm_css$Css_Preprocess$Keyframes,
						A2(_elm_lang$core$Basics_ops['++'], name, _p10._0),
						_p10._1);
				case 'Viewport':
					return declaration;
				case 'CounterStyle':
					return declaration;
				default:
					return declaration;
			}
		});
	var _rtfeldman$elm_css$Css_Namespace$applyNamespaceToStyleBlock = F2(
		function (name, _p11) {
			var _p12 = _p11;
			return A3(
				_rtfeldman$elm_css$Css_Preprocess$StyleBlock,
				A2(_rtfeldman$elm_css$Css_Namespace$applyNamespaceToSelector, name, _p12._0),
				A2(
					_elm_lang$core$List$map,
					_rtfeldman$elm_css$Css_Namespace$applyNamespaceToSelector(name),
					_p12._1),
				A2(
					_elm_lang$core$List$map,
					_rtfeldman$elm_css$Css_Namespace$applyNamespaceToMixin(name),
					_p12._2));
		});
	var _rtfeldman$elm_css$Css_Namespace$namespace = F2(
		function (rawIdentifier, snippets) {
			return A2(
				_elm_lang$core$List$map,
				_rtfeldman$elm_css$Css_Namespace$applyNamespaceToSnippet(
					_rtfeldman$elm_css_util$Css_Helpers$toCssIdentifier(rawIdentifier)),
				snippets);
		});

	var _rtfeldman$elm_css_helpers$Html_CssHelpers$stylesheetLink = function (url) {
		return A3(
			_elm_lang$html$Html$node,
			'link',
			_elm_lang$core$Native_List.fromArray(
				[
					A2(
					_elm_lang$html$Html_Attributes$property,
					'rel',
					_elm_lang$core$Json_Encode$string('stylesheet')),
					A2(
					_elm_lang$html$Html_Attributes$property,
					'type',
					_elm_lang$core$Json_Encode$string('text/css')),
					A2(
					_elm_lang$html$Html_Attributes$property,
					'href',
					_elm_lang$core$Json_Encode$string(url))
				]),
			_elm_lang$core$Native_List.fromArray(
				[]));
	};
	var _rtfeldman$elm_css_helpers$Html_CssHelpers$style = function (text) {
		return A3(
			_elm_lang$html$Html$node,
			'style',
			_elm_lang$core$Native_List.fromArray(
				[
					A2(
					_elm_lang$html$Html_Attributes$property,
					'textContent',
					_elm_lang$core$Json_Encode$string(text)),
					A2(
					_elm_lang$html$Html_Attributes$property,
					'type',
					_elm_lang$core$Json_Encode$string('text/css'))
				]),
			_elm_lang$core$Native_List.fromArray(
				[]));
	};
	var _rtfeldman$elm_css_helpers$Html_CssHelpers$namespacedClass = F2(
		function (name, list) {
			return _elm_lang$html$Html_Attributes$class(
				A2(
					_elm_lang$core$String$join,
					' ',
					A2(
						_elm_lang$core$List$map,
						_rtfeldman$elm_css_util$Css_Helpers$identifierToString(name),
						list)));
		});
	var _rtfeldman$elm_css_helpers$Html_CssHelpers$class = _rtfeldman$elm_css_helpers$Html_CssHelpers$namespacedClass('');
	var _rtfeldman$elm_css_helpers$Html_CssHelpers$classList = function (list) {
		return _rtfeldman$elm_css_helpers$Html_CssHelpers$class(
			A2(
				_elm_lang$core$List$map,
				_elm_lang$core$Basics$fst,
				A2(_elm_lang$core$List$filter, _elm_lang$core$Basics$snd, list)));
	};
	var _rtfeldman$elm_css_helpers$Html_CssHelpers$namespacedClassList = F2(
		function (name, list) {
			return A2(
				_rtfeldman$elm_css_helpers$Html_CssHelpers$namespacedClass,
				name,
				A2(
					_elm_lang$core$List$map,
					_elm_lang$core$Basics$fst,
					A2(_elm_lang$core$List$filter, _elm_lang$core$Basics$snd, list)));
		});
	var _rtfeldman$elm_css_helpers$Html_CssHelpers$helpers = {
		$class: _rtfeldman$elm_css_helpers$Html_CssHelpers$class,
		classList: _rtfeldman$elm_css_helpers$Html_CssHelpers$classList,
		id: function (_p0) {
			return _elm_lang$html$Html_Attributes$id(
				_rtfeldman$elm_css_util$Css_Helpers$toCssIdentifier(_p0));
		}
	};
	var _rtfeldman$elm_css_helpers$Html_CssHelpers$withNamespace = function (name) {
		return {
			$class: _rtfeldman$elm_css_helpers$Html_CssHelpers$namespacedClass(name),
			classList: _rtfeldman$elm_css_helpers$Html_CssHelpers$namespacedClassList(name),
			id: function (_p1) {
				return _elm_lang$html$Html_Attributes$id(
					_rtfeldman$elm_css_util$Css_Helpers$toCssIdentifier(_p1));
			},
			name: name
		};
	};
	var _rtfeldman$elm_css_helpers$Html_CssHelpers$Helpers = F3(
		function (a, b, c) {
			return {$class: a, classList: b, id: c};
		});
	var _rtfeldman$elm_css_helpers$Html_CssHelpers$Namespace = F4(
		function (a, b, c, d) {
			return {$class: a, classList: b, id: c, name: d};
		});

	var _user$project$Api_Types$encodeTVShowEpisode = function (record) {
		return _elm_lang$core$Json_Encode$object(
			_elm_lang$core$Native_List.fromArray(
				[
					{
					ctor: '_Tuple2',
					_0: 'id',
					_1: _elm_lang$core$Json_Encode$int(record.id)
				},
					{
					ctor: '_Tuple2',
					_0: 'url',
					_1: _elm_lang$core$Json_Encode$string(record.url)
				},
					{
					ctor: '_Tuple2',
					_0: 'name',
					_1: _elm_lang$core$Json_Encode$string(record.name)
				},
					{
					ctor: '_Tuple2',
					_0: 'season',
					_1: _elm_lang$core$Json_Encode$int(record.season)
				},
					{
					ctor: '_Tuple2',
					_0: 'number',
					_1: _elm_lang$core$Json_Encode$int(record.number)
				},
					{
					ctor: '_Tuple2',
					_0: 'airdate',
					_1: _elm_lang$core$Json_Encode$string(record.airdate)
				},
					{
					ctor: '_Tuple2',
					_0: 'airtime',
					_1: _elm_lang$core$Json_Encode$string(record.airtime)
				},
					{
					ctor: '_Tuple2',
					_0: 'airstamp',
					_1: _elm_lang$core$Json_Encode$string(record.airstamp)
				},
					{
					ctor: '_Tuple2',
					_0: 'runtime',
					_1: _elm_lang$core$Json_Encode$int(record.runtime)
				},
					{
					ctor: '_Tuple2',
					_0: 'summary',
					_1: _elm_lang$core$Json_Encode$string(record.summary)
				}
				]));
	};
	var _user$project$Api_Types$TVShowEpisode = function (a) {
		return function (b) {
			return function (c) {
				return function (d) {
					return function (e) {
						return function (f) {
							return function (g) {
								return function (h) {
									return function (i) {
										return function (j) {
											return {id: a, url: b, name: c, season: d, number: e, airdate: f, airtime: g, airstamp: h, runtime: i, summary: j};
										};
									};
								};
							};
						};
					};
				};
			};
		};
	};
	var _user$project$Api_Types$decodeTVShowEpisode = A3(
		_NoRedInk$elm_decode_pipeline$Json_Decode_Pipeline$required,
		'summary',
		_elm_lang$core$Json_Decode$string,
		A3(
			_NoRedInk$elm_decode_pipeline$Json_Decode_Pipeline$required,
			'runtime',
			_elm_lang$core$Json_Decode$int,
			A3(
				_NoRedInk$elm_decode_pipeline$Json_Decode_Pipeline$required,
				'airstamp',
				_elm_lang$core$Json_Decode$string,
				A3(
					_NoRedInk$elm_decode_pipeline$Json_Decode_Pipeline$required,
					'airtime',
					_elm_lang$core$Json_Decode$string,
					A3(
						_NoRedInk$elm_decode_pipeline$Json_Decode_Pipeline$required,
						'airdate',
						_elm_lang$core$Json_Decode$string,
						A3(
							_NoRedInk$elm_decode_pipeline$Json_Decode_Pipeline$required,
							'number',
							_elm_lang$core$Json_Decode$int,
							A3(
								_NoRedInk$elm_decode_pipeline$Json_Decode_Pipeline$required,
								'season',
								_elm_lang$core$Json_Decode$int,
								A3(
									_NoRedInk$elm_decode_pipeline$Json_Decode_Pipeline$required,
									'name',
									_elm_lang$core$Json_Decode$string,
									A3(
										_NoRedInk$elm_decode_pipeline$Json_Decode_Pipeline$required,
										'url',
										_elm_lang$core$Json_Decode$string,
										A3(
											_NoRedInk$elm_decode_pipeline$Json_Decode_Pipeline$required,
											'id',
											_elm_lang$core$Json_Decode$int,
											_NoRedInk$elm_decode_pipeline$Json_Decode_Pipeline$decode(_user$project$Api_Types$TVShowEpisode)))))))))));
	var _user$project$Api_Types$TVShowEpisodeImage = F2(
		function (a, b) {
			return {medium: a, original: b};
		});
	var _user$project$Api_Types$TVShowEpisode_linksSelf = function (a) {
		return {href: a};
	};
	var _user$project$Api_Types$TVShowEpisode_links = function (a) {
		return {self: a};
	};
	var _user$project$Api_Types$TVShowResult = F2(
		function (a, b) {
			return {score: a, show: b};
		});
	var _user$project$Api_Types$TVShowResultShowSchedule = F2(
		function (a, b) {
			return {time: a, days: b};
		});
	var _user$project$Api_Types$decodeTVShowResultShowSchedule = A3(
		_NoRedInk$elm_decode_pipeline$Json_Decode_Pipeline$required,
		'days',
		_elm_lang$core$Json_Decode$list(_elm_lang$core$Json_Decode$string),
		A3(
			_NoRedInk$elm_decode_pipeline$Json_Decode_Pipeline$required,
			'time',
			_elm_lang$core$Json_Decode$string,
			_NoRedInk$elm_decode_pipeline$Json_Decode_Pipeline$decode(_user$project$Api_Types$TVShowResultShowSchedule)));
	var _user$project$Api_Types$TVShowResultShowRating = function (a) {
		return {average: a};
	};
	var _user$project$Api_Types$decodeTVShowResultShowRating = A3(
		_NoRedInk$elm_decode_pipeline$Json_Decode_Pipeline$required,
		'average',
		_elm_lang$core$Json_Decode$maybe(_elm_lang$core$Json_Decode$float),
		_NoRedInk$elm_decode_pipeline$Json_Decode_Pipeline$decode(_user$project$Api_Types$TVShowResultShowRating));
	var _user$project$Api_Types$TVShowResultShowNetworkCountry = F3(
		function (a, b, c) {
			return {name: a, code: b, timezone: c};
		});
	var _user$project$Api_Types$decodeTVShowResultShowNetworkCountry = A3(
		_NoRedInk$elm_decode_pipeline$Json_Decode_Pipeline$required,
		'timezone',
		_elm_lang$core$Json_Decode$string,
		A3(
			_NoRedInk$elm_decode_pipeline$Json_Decode_Pipeline$required,
			'code',
			_elm_lang$core$Json_Decode$string,
			A3(
				_NoRedInk$elm_decode_pipeline$Json_Decode_Pipeline$required,
				'name',
				_elm_lang$core$Json_Decode$string,
				_NoRedInk$elm_decode_pipeline$Json_Decode_Pipeline$decode(_user$project$Api_Types$TVShowResultShowNetworkCountry))));
	var _user$project$Api_Types$TVShowResultShowNetwork = F3(
		function (a, b, c) {
			return {id: a, name: b, country: c};
		});
	var _user$project$Api_Types$decodeTVShowResultShowNetwork = A3(
		_NoRedInk$elm_decode_pipeline$Json_Decode_Pipeline$required,
		'country',
		_user$project$Api_Types$decodeTVShowResultShowNetworkCountry,
		A3(
			_NoRedInk$elm_decode_pipeline$Json_Decode_Pipeline$required,
			'name',
			_elm_lang$core$Json_Decode$string,
			A3(
				_NoRedInk$elm_decode_pipeline$Json_Decode_Pipeline$required,
				'id',
				_elm_lang$core$Json_Decode$int,
				_NoRedInk$elm_decode_pipeline$Json_Decode_Pipeline$decode(_user$project$Api_Types$TVShowResultShowNetwork))));
	var _user$project$Api_Types$TVShowResultShowExternals = F3(
		function (a, b, c) {
			return {tvrage: a, thetvdb: b, imdb: c};
		});
	var _user$project$Api_Types$decodeTVShowResultShowExternals = A3(
		_NoRedInk$elm_decode_pipeline$Json_Decode_Pipeline$required,
		'imdb',
		_elm_lang$core$Json_Decode$maybe(_elm_lang$core$Json_Decode$string),
		A3(
			_NoRedInk$elm_decode_pipeline$Json_Decode_Pipeline$required,
			'thetvdb',
			_elm_lang$core$Json_Decode$maybe(_elm_lang$core$Json_Decode$int),
			A3(
				_NoRedInk$elm_decode_pipeline$Json_Decode_Pipeline$required,
				'tvrage',
				_elm_lang$core$Json_Decode$maybe(_elm_lang$core$Json_Decode$int),
				_NoRedInk$elm_decode_pipeline$Json_Decode_Pipeline$decode(_user$project$Api_Types$TVShowResultShowExternals))));
	var _user$project$Api_Types$TVShowResultShowImage = F2(
		function (a, b) {
			return {medium: a, original: b};
		});
	var _user$project$Api_Types$decodeTVShowResultShowImage = A3(
		_NoRedInk$elm_decode_pipeline$Json_Decode_Pipeline$required,
		'original',
		_elm_lang$core$Json_Decode$string,
		A3(
			_NoRedInk$elm_decode_pipeline$Json_Decode_Pipeline$required,
			'medium',
			_elm_lang$core$Json_Decode$string,
			_NoRedInk$elm_decode_pipeline$Json_Decode_Pipeline$decode(_user$project$Api_Types$TVShowResultShowImage)));
	var _user$project$Api_Types$TVShowResultShow_linksSelf = function (a) {
		return {href: a};
	};
	var _user$project$Api_Types$TVShowResultShow_linksPreviousepisode = function (a) {
		return {href: a};
	};
	var _user$project$Api_Types$TVShowResultShow_links = F2(
		function (a, b) {
			return {self: a, previousepisode: b};
		});
	var _user$project$Api_Types$TVShowResultShow = function (a) {
		return function (b) {
			return function (c) {
				return function (d) {
					return function (e) {
						return function (f) {
							return function (g) {
								return function (h) {
									return function (i) {
										return function (j) {
											return function (k) {
												return function (l) {
													return function (m) {
														return function (n) {
															return function (o) {
																return function (p) {
																	return function (q) {
																		return {id: a, url: b, name: c, type$: d, language: e, genres: f, status: g, runtime: h, premiered: i, schedule: j, rating: k, weight: l, network: m, externals: n, image: o, summary: p, updated: q};
																	};
																};
															};
														};
													};
												};
											};
										};
									};
								};
							};
						};
					};
				};
			};
		};
	};
	var _user$project$Api_Types$decodeTVShowResultShow = A3(
		_NoRedInk$elm_decode_pipeline$Json_Decode_Pipeline$required,
		'updated',
		_elm_lang$core$Json_Decode$int,
		A3(
			_NoRedInk$elm_decode_pipeline$Json_Decode_Pipeline$required,
			'summary',
			_elm_lang$core$Json_Decode$string,
			A3(
				_NoRedInk$elm_decode_pipeline$Json_Decode_Pipeline$required,
				'image',
				_elm_lang$core$Json_Decode$maybe(_user$project$Api_Types$decodeTVShowResultShowImage),
				A3(
					_NoRedInk$elm_decode_pipeline$Json_Decode_Pipeline$required,
					'externals',
					_user$project$Api_Types$decodeTVShowResultShowExternals,
					A3(
						_NoRedInk$elm_decode_pipeline$Json_Decode_Pipeline$required,
						'network',
						_elm_lang$core$Json_Decode$maybe(_user$project$Api_Types$decodeTVShowResultShowNetwork),
						A3(
							_NoRedInk$elm_decode_pipeline$Json_Decode_Pipeline$required,
							'weight',
							_elm_lang$core$Json_Decode$int,
							A3(
								_NoRedInk$elm_decode_pipeline$Json_Decode_Pipeline$required,
								'rating',
								_user$project$Api_Types$decodeTVShowResultShowRating,
								A3(
									_NoRedInk$elm_decode_pipeline$Json_Decode_Pipeline$required,
									'schedule',
									_user$project$Api_Types$decodeTVShowResultShowSchedule,
									A3(
										_NoRedInk$elm_decode_pipeline$Json_Decode_Pipeline$required,
										'premiered',
										_elm_lang$core$Json_Decode$maybe(_elm_lang$core$Json_Decode$string),
										A3(
											_NoRedInk$elm_decode_pipeline$Json_Decode_Pipeline$required,
											'runtime',
											_elm_lang$core$Json_Decode$maybe(_elm_lang$core$Json_Decode$int),
											A3(
												_NoRedInk$elm_decode_pipeline$Json_Decode_Pipeline$required,
												'status',
												_elm_lang$core$Json_Decode$string,
												A3(
													_NoRedInk$elm_decode_pipeline$Json_Decode_Pipeline$required,
													'genres',
													_elm_lang$core$Json_Decode$list(_elm_lang$core$Json_Decode$string),
													A3(
														_NoRedInk$elm_decode_pipeline$Json_Decode_Pipeline$required,
														'language',
														_elm_lang$core$Json_Decode$string,
														A3(
															_NoRedInk$elm_decode_pipeline$Json_Decode_Pipeline$required,
															'type',
															_elm_lang$core$Json_Decode$string,
															A3(
																_NoRedInk$elm_decode_pipeline$Json_Decode_Pipeline$required,
																'name',
																_elm_lang$core$Json_Decode$string,
																A3(
																	_NoRedInk$elm_decode_pipeline$Json_Decode_Pipeline$required,
																	'url',
																	_elm_lang$core$Json_Decode$string,
																	A3(
																		_NoRedInk$elm_decode_pipeline$Json_Decode_Pipeline$required,
																		'id',
																		_elm_lang$core$Json_Decode$int,
																		_NoRedInk$elm_decode_pipeline$Json_Decode_Pipeline$decode(_user$project$Api_Types$TVShowResultShow))))))))))))))))));
	var _user$project$Api_Types$decodeTVShowResult = A3(
		_NoRedInk$elm_decode_pipeline$Json_Decode_Pipeline$required,
		'show',
		_user$project$Api_Types$decodeTVShowResultShow,
		A3(
			_NoRedInk$elm_decode_pipeline$Json_Decode_Pipeline$required,
			'score',
			_elm_lang$core$Json_Decode$float,
			_NoRedInk$elm_decode_pipeline$Json_Decode_Pipeline$decode(_user$project$Api_Types$TVShowResult)));

	var _user$project$Api$decodeEpisodes = _elm_lang$core$Json_Decode$list(_user$project$Api_Types$decodeTVShowEpisode);
	var _user$project$Api$decodeShows = _elm_lang$core$Json_Decode$list(_user$project$Api_Types$decodeTVShowResult);
	var _user$project$Api$baseUrl = 'http://api.tvmaze.com';
	var _user$project$Api$searchShows = function (query) {
		return A2(
			_evancz$elm_http$Http$get,
			_user$project$Api$decodeShows,
			A2(
				_elm_lang$core$Basics_ops['++'],
				_user$project$Api$baseUrl,
				A2(
					_elm_lang$core$Basics_ops['++'],
					'/search/shows?q=',
					_evancz$elm_http$Http$uriEncode(query))));
	};
	var _user$project$Api$getEpisodes = function (showId) {
		return A2(
			_evancz$elm_http$Http$get,
			_user$project$Api$decodeEpisodes,
			A2(
				_elm_lang$core$Basics_ops['++'],
				_user$project$Api$baseUrl,
				A2(
					_elm_lang$core$Basics_ops['++'],
					'/shows/',
					A2(
						_elm_lang$core$Basics_ops['++'],
						_elm_lang$core$Basics$toString(showId),
						'/episodes'))));
	};

	var _user$project$App_Styles$appNamespace = 'app-';
	var _user$project$App_Styles$AppContainer = {ctor: 'AppContainer'};
	var _user$project$App_Styles$css = A2(
		_rtfeldman$elm_css$Css_Namespace$namespace,
		_user$project$App_Styles$appNamespace,
		_elm_lang$core$Native_List.fromArray(
			[
				_rtfeldman$elm_css$Css_Elements$body(
				_elm_lang$core$Native_List.fromArray(
					[
						_rtfeldman$elm_css$Css$fontFamilies(
						_elm_lang$core$Native_List.fromArray(
							[
								'Roboto',
								_rtfeldman$elm_css$Css$qt('Helvetica Neue'),
								'Helvetica',
								'Arial'
							])),
						_rtfeldman$elm_css$Css$backgroundColor(
						_rtfeldman$elm_css$Css$hex('f4f4f4'))
					])),
				A2(
				F2(
					function (x, y) {
						return A2(_rtfeldman$elm_css$Css_ops['.'], x, y);
					}),
				_user$project$App_Styles$AppContainer,
				_elm_lang$core$Native_List.fromArray(
					[
						_rtfeldman$elm_css$Css$paddingBottom(
						_rtfeldman$elm_css$Css$px(80))
					]))
			]));
	var _user$project$App_Styles$ShowImage = {ctor: 'ShowImage'};

	var _user$project$AppLayout$namespace = _rtfeldman$elm_css_helpers$Html_CssHelpers$withNamespace(_user$project$App_Styles$appNamespace);
	var _user$project$AppLayout$localClass = _user$project$AppLayout$namespace.$class;
	var _user$project$AppLayout$view = F2(
		function (title, content) {
			return A2(
				_elm_lang$html$Html$div,
				_elm_lang$core$Native_List.fromArray(
					[
						_user$project$AppLayout$localClass(
						_elm_lang$core$Native_List.fromArray(
							[_user$project$App_Styles$AppContainer]))
					]),
				_elm_lang$core$Native_List.fromArray(
					[
						A2(
						_elm_lang$html$Html$div,
						_elm_lang$core$Native_List.fromArray(
							[
								_elm_lang$html$Html_Attributes$class('mui-appbar')
							]),
						_elm_lang$core$Native_List.fromArray(
							[
								A2(
								_elm_lang$html$Html$div,
								_elm_lang$core$Native_List.fromArray(
									[
										_elm_lang$html$Html_Attributes$class('mui-container mui--appbar-height mui--appbar-line-height')
									]),
								_elm_lang$core$Native_List.fromArray(
									[
										A2(
										_elm_lang$html$Html$span,
										_elm_lang$core$Native_List.fromArray(
											[
												_elm_lang$html$Html_Attributes$class('mui--text-headline')
											]),
										_elm_lang$core$Native_List.fromArray(
											[
												_elm_lang$html$Html$text(title)
											]))
									]))
							])),
						A2(
						_elm_lang$html$Html$div,
						_elm_lang$core$Native_List.fromArray(
							[
								_elm_lang$html$Html_Attributes$class('mui-container')
							]),
						_elm_lang$core$Native_List.fromArray(
							[content]))
					]));
		});

	var _user$project$Search_Styles$componentNamespace = 'c-search-';
	var _user$project$Search_Styles$SearchCollapsed = {ctor: 'SearchCollapsed'};
	var _user$project$Search_Styles$css = A2(
		_rtfeldman$elm_css$Css_Namespace$namespace,
		_user$project$Search_Styles$componentNamespace,
		_elm_lang$core$Native_List.fromArray(
			[
				A2(
				F2(
					function (x, y) {
						return A2(_rtfeldman$elm_css$Css_ops['.'], x, y);
					}),
				_user$project$Search_Styles$SearchCollapsed,
				_elm_lang$core$Native_List.fromArray(
					[
						_rtfeldman$elm_css$Css$paddingBottom(
						_rtfeldman$elm_css$Css$px(60)),
						_rtfeldman$elm_css$Css$marginTop(
						_rtfeldman$elm_css$Css$px(-32))
					])),
				A2(
				_rtfeldman$elm_css$Css$mediaQuery,
				'screen and ( max-width: 450px )',
				_elm_lang$core$Native_List.fromArray(
					[
						A2(
						F2(
							function (x, y) {
								return A2(_rtfeldman$elm_css$Css_ops['.'], x, y);
							}),
						_user$project$Search_Styles$SearchCollapsed,
						_elm_lang$core$Native_List.fromArray(
							[
								_rtfeldman$elm_css$Css$paddingBottom(
								_rtfeldman$elm_css$Css$px(0)),
								_rtfeldman$elm_css$Css$marginTop(
								_rtfeldman$elm_css$Css$px(0)),
								_rtfeldman$elm_css$Css$position(_rtfeldman$elm_css$Css$fixed),
								_rtfeldman$elm_css$Css$bottom(
								_rtfeldman$elm_css$Css$px(15)),
								_rtfeldman$elm_css$Css$right(
								_rtfeldman$elm_css$Css$px(15))
							]))
					]))
			]));

	var _user$project$Search$viewError = function (error) {
		return A2(
			_elm_lang$html$Html$div,
			_elm_lang$core$Native_List.fromArray(
				[
					_elm_lang$html$Html_Attributes$class('mui-panel')
				]),
			_elm_lang$core$Native_List.fromArray(
				[
					_elm_lang$html$Html$text(
					A2(_elm_lang$core$Maybe$withDefault, '', error))
				]));
	};
	var _user$project$Search$getImage = function (image) {
		var placeholder = {medium: 'http://lorempixel.com/72/100/abstract'};
		var _p0 = image;
		if (_p0.ctor === 'Nothing') {
			return placeholder.medium;
		} else {
			return _p0._0.medium;
		}
	};
	var _user$project$Search$model = {
		term: '',
		visible: false,
		results: _elm_lang$core$Native_List.fromArray(
			[]),
		error: _elm_lang$core$Maybe$Nothing
	};
	var _user$project$Search$namespace = _rtfeldman$elm_css_helpers$Html_CssHelpers$withNamespace(_user$project$Search_Styles$componentNamespace);
	var _user$project$Search$localClass = _user$project$Search$namespace.$class;
	var _user$project$Search$Model = F4(
		function (a, b, c, d) {
			return {visible: a, term: b, results: c, error: d};
		});
	var _user$project$Search$AddShow = function (a) {
		return {ctor: 'AddShow', _0: a};
	};
	var _user$project$Search$viewTVShowResult = F2(
		function (shows, result) {
			return A2(
				_elm_lang$html$Html$div,
				_elm_lang$core$Native_List.fromArray(
					[]),
				_elm_lang$core$Native_List.fromArray(
					[
						A2(
						_elm_lang$html$Html$div,
						_elm_lang$core$Native_List.fromArray(
							[
								_elm_lang$html$Html_Attributes$style(
								_elm_lang$core$Native_List.fromArray(
									[
										{ctor: '_Tuple2', _0: 'display', _1: 'flex'},
										{ctor: '_Tuple2', _0: 'overflow', _1: 'auto'},
										{ctor: '_Tuple2', _0: 'min-height', _1: '100px'},
										{ctor: '_Tuple2', _0: 'margin-bottom', _1: '15px'}
									]))
							]),
						_elm_lang$core$Native_List.fromArray(
							[
								A2(
								_elm_lang$html$Html$img,
								_elm_lang$core$Native_List.fromArray(
									[
										_elm_lang$html$Html_Attributes$style(
										_elm_lang$core$Native_List.fromArray(
											[
												{ctor: '_Tuple2', _0: 'height', _1: '100px'}
											])),
										_elm_lang$html$Html_Attributes$src(
										_user$project$Search$getImage(result.show.image))
									]),
								_elm_lang$core$Native_List.fromArray(
									[])),
								A2(
								_elm_lang$html$Html$div,
								_elm_lang$core$Native_List.fromArray(
									[
										_elm_lang$html$Html_Attributes$style(
										_elm_lang$core$Native_List.fromArray(
											[
												{ctor: '_Tuple2', _0: 'padding-left', _1: '15px'},
												{ctor: '_Tuple2', _0: 'flex', _1: '1'}
											]))
									]),
								_elm_lang$core$Native_List.fromArray(
									[
										A2(
										_elm_lang$html$Html$div,
										_elm_lang$core$Native_List.fromArray(
											[
												_elm_lang$html$Html_Attributes$class('mui--text-title')
											]),
										_elm_lang$core$Native_List.fromArray(
											[
												_elm_lang$html$Html$text(result.show.name)
											])),
										A2(
										_elm_lang$html$Html$div,
										_elm_lang$core$Native_List.fromArray(
											[
												_elm_lang$html$Html_Attributes$class('mui--text-subhead')
											]),
										_elm_lang$core$Native_List.fromArray(
											[
												_elm_lang$html$Html$text(
												function () {
													var _p1 = result.show.network;
													if (_p1.ctor === 'Nothing') {
														return '';
													} else {
														return _p1._0.name;
													}
												}())
											])),
										A2(
										_elm_lang$html$Html$div,
										_elm_lang$core$Native_List.fromArray(
											[]),
										_elm_lang$core$Native_List.fromArray(
											[
												A2(
												_evancz$elm_markdown$Markdown$toHtml,
												_elm_lang$core$Native_List.fromArray(
													[]),
												result.show.summary)
											]))
									]))
							])),
						A2(
						_elm_lang$html$Html$div,
						_elm_lang$core$Native_List.fromArray(
							[]),
						_elm_lang$core$Native_List.fromArray(
							[
								function () {
								var _p2 = A2(_elm_lang$core$Set$member, result.show.id, shows);
								if (_p2 === false) {
									return A2(
										_elm_lang$html$Html$button,
										_elm_lang$core$Native_List.fromArray(
											[
												_elm_lang$html$Html_Events$onClick(
												_user$project$Search$AddShow(result)),
												_elm_lang$html$Html_Attributes$class('mui-btn mui-btn--primary')
											]),
										_elm_lang$core$Native_List.fromArray(
											[
												_elm_lang$html$Html$text('Add')
											]));
								} else {
									return A2(
										_elm_lang$html$Html$button,
										_elm_lang$core$Native_List.fromArray(
											[
												_elm_lang$html$Html_Attributes$class('mui-btn mui-btn--primary'),
												_elm_lang$html$Html_Attributes$disabled(true)
											]),
										_elm_lang$core$Native_List.fromArray(
											[
												_elm_lang$html$Html$text('Already added')
											]));
								}
							}()
							]))
					]));
		});
	var _user$project$Search$viewResults = F2(
		function (results, shows) {
			return A2(
				_elm_lang$html$Html$div,
				_elm_lang$core$Native_List.fromArray(
					[
						_elm_lang$html$Html_Attributes$class('mui-panel')
					]),
				A2(
					_elm_lang$core$List$intersperse,
					A2(
						_elm_lang$html$Html$hr,
						_elm_lang$core$Native_List.fromArray(
							[]),
						_elm_lang$core$Native_List.fromArray(
							[])),
					A2(
						_elm_lang$core$List$map,
						_user$project$Search$viewTVShowResult(shows),
						results)));
		});
	var _user$project$Search$HideSearch = {ctor: 'HideSearch'};
	var _user$project$Search$ShowSearch = {ctor: 'ShowSearch'};
	var _user$project$Search$collapsedView = function (model) {
		return A2(
			_elm_lang$html$Html$div,
			_elm_lang$core$Native_List.fromArray(
				[
					_user$project$Search$localClass(
					_elm_lang$core$Native_List.fromArray(
						[_user$project$Search_Styles$SearchCollapsed]))
				]),
			_elm_lang$core$Native_List.fromArray(
				[
					A2(
					_elm_lang$html$Html$button,
					_elm_lang$core$Native_List.fromArray(
						[
							_elm_lang$html$Html_Events$onClick(_user$project$Search$ShowSearch),
							_elm_lang$html$Html_Attributes$class('mui-btn mui-btn--fab mui-btn--accent'),
							_elm_lang$html$Html_Attributes$style(
							_elm_lang$core$Native_List.fromArray(
								[
									{ctor: '_Tuple2', _0: 'float', _1: 'right'}
								]))
						]),
					_elm_lang$core$Native_List.fromArray(
						[
							_elm_lang$html$Html$text('+')
						]))
				]));
	};
	var _user$project$Search$ShowError = function (a) {
		return {ctor: 'ShowError', _0: a};
	};
	var _user$project$Search$ShowResults = function (a) {
		return {ctor: 'ShowResults', _0: a};
	};
	var _user$project$Search$update = F2(
		function (msg, model) {
			var _p3 = msg;
			switch (_p3.ctor) {
				case 'UpdateTerm':
					return {
						ctor: '_Tuple2',
						_0: _elm_lang$core$Native_Utils.update(
							model,
							{term: _p3._0}),
						_1: _elm_lang$core$Platform_Cmd$none
					};
				case 'Search':
					return {
						ctor: '_Tuple2',
						_0: model,
						_1: A3(
							_elm_lang$core$Task$perform,
							_user$project$Search$ShowError,
							_user$project$Search$ShowResults,
							_user$project$Api$searchShows(model.term))
					};
				case 'ShowResults':
					return {
						ctor: '_Tuple2',
						_0: _elm_lang$core$Native_Utils.update(
							model,
							{results: _p3._0}),
						_1: _elm_lang$core$Platform_Cmd$none
					};
				case 'ShowError':
					var _p4 = _p3._0;
					if (_p4.ctor === 'UnexpectedPayload') {
						return {
							ctor: '_Tuple2',
							_0: _elm_lang$core$Native_Utils.update(
								model,
								{
									error: _elm_lang$core$Maybe$Just(_p4._0)
								}),
							_1: _elm_lang$core$Platform_Cmd$none
						};
					} else {
						return {
							ctor: '_Tuple2',
							_0: _elm_lang$core$Native_Utils.update(
								model,
								{
									error: _elm_lang$core$Maybe$Just('Something terrible has happened')
								}),
							_1: _elm_lang$core$Platform_Cmd$none
						};
					}
				case 'ShowSearch':
					return {
						ctor: '_Tuple2',
						_0: _elm_lang$core$Native_Utils.update(
							model,
							{visible: true}),
						_1: _elm_lang$core$Platform_Cmd$none
					};
				case 'HideSearch':
					return {
						ctor: '_Tuple2',
						_0: _elm_lang$core$Native_Utils.update(
							model,
							{visible: false}),
						_1: _elm_lang$core$Platform_Cmd$none
					};
				default:
					return {
						ctor: '_Tuple2',
						_0: _elm_lang$core$Native_Utils.update(
							model,
							{visible: false}),
						_1: _elm_lang$core$Platform_Cmd$none
					};
			}
		});
	var _user$project$Search$Search = {ctor: 'Search'};
	var _user$project$Search$UpdateTerm = function (a) {
		return {ctor: 'UpdateTerm', _0: a};
	};
	var _user$project$Search$expandedView = F2(
		function (model, shows) {
			return A2(
				_elm_lang$html$Html$form,
				_elm_lang$core$Native_List.fromArray(
					[
						_elm_lang$html$Html_Events$onSubmit(_user$project$Search$Search)
					]),
				_elm_lang$core$Native_List.fromArray(
					[
						A2(
						_elm_lang$html$Html$div,
						_elm_lang$core$Native_List.fromArray(
							[
								_elm_lang$html$Html_Attributes$style(
								_elm_lang$core$Native_List.fromArray(
									[
										{ctor: '_Tuple2', _0: 'padding-top', _1: '15px'},
										{ctor: '_Tuple2', _0: 'padding-bottom', _1: '15px'}
									]))
							]),
						_elm_lang$core$Native_List.fromArray(
							[
								A2(
								_elm_lang$html$Html$div,
								_elm_lang$core$Native_List.fromArray(
									[
										_elm_lang$html$Html_Attributes$class('mui-textfield mui-textfield--float-label')
									]),
								_elm_lang$core$Native_List.fromArray(
									[
										A2(
										_elm_lang$html$Html$input,
										_elm_lang$core$Native_List.fromArray(
											[
												_elm_lang$html$Html_Attributes$type$('text'),
												_elm_lang$html$Html_Events$onInput(_user$project$Search$UpdateTerm)
											]),
										_elm_lang$core$Native_List.fromArray(
											[])),
										A2(
										_elm_lang$html$Html$label,
										_elm_lang$core$Native_List.fromArray(
											[]),
										_elm_lang$core$Native_List.fromArray(
											[
												_elm_lang$html$Html$text('Search for shows')
											]))
									])),
								A2(
								_elm_lang$html$Html$button,
								_elm_lang$core$Native_List.fromArray(
									[
										_elm_lang$html$Html_Events$onClick(_user$project$Search$Search),
										_elm_lang$html$Html_Attributes$class('mui-btn mui-btn--primary'),
										_elm_lang$html$Html_Attributes$style(
										_elm_lang$core$Native_List.fromArray(
											[
												{ctor: '_Tuple2', _0: 'text-align', _1: 'right'}
											]))
									]),
								_elm_lang$core$Native_List.fromArray(
									[
										_elm_lang$html$Html$text('Search')
									])),
								A2(
								_elm_lang$html$Html$button,
								_elm_lang$core$Native_List.fromArray(
									[
										_elm_lang$html$Html_Events$onClick(_user$project$Search$HideSearch),
										_elm_lang$html$Html_Attributes$class('mui-btn mui-btn--danger')
									]),
								_elm_lang$core$Native_List.fromArray(
									[
										_elm_lang$html$Html$text('Cancel')
									]))
							])),
						(_elm_lang$core$Native_Utils.cmp(
						_elm_lang$core$List$length(model.results),
						0) > 0) ? A2(_user$project$Search$viewResults, model.results, shows) : ((!_elm_lang$core$Native_Utils.eq(model.error, _elm_lang$core$Maybe$Nothing)) ? _user$project$Search$viewError(model.error) : A2(
						_elm_lang$html$Html$div,
						_elm_lang$core$Native_List.fromArray(
							[]),
						_elm_lang$core$Native_List.fromArray(
							[])))
					]));
		});
	var _user$project$Search$view = F2(
		function (model, shows) {
			return model.visible ? A2(_user$project$Search$expandedView, model, shows) : _user$project$Search$collapsedView(model);
		});

	var _user$project$Show_Styles$componentNamespace = 'c-show-';
	var _user$project$Show_Styles$Button = {ctor: 'Button'};
	var _user$project$Show_Styles$ShowImage = {ctor: 'ShowImage'};
	var _user$project$Show_Styles$css = A2(
		_rtfeldman$elm_css$Css_Namespace$namespace,
		_user$project$Show_Styles$componentNamespace,
		_elm_lang$core$Native_List.fromArray(
			[
				A2(
				F2(
					function (x, y) {
						return A2(_rtfeldman$elm_css$Css_ops['.'], x, y);
					}),
				_user$project$Show_Styles$ShowImage,
				_elm_lang$core$Native_List.fromArray(
					[
						_rtfeldman$elm_css$Css$height(
						_rtfeldman$elm_css$Css$px(200))
					])),
				A2(
				F2(
					function (x, y) {
						return A2(_rtfeldman$elm_css$Css_ops['.'], x, y);
					}),
				_user$project$Show_Styles$Button,
				_elm_lang$core$Native_List.fromArray(
					[
						_rtfeldman$elm_css$Css$width(
						_rtfeldman$elm_css$Css$px(136))
					])),
				A2(
				_rtfeldman$elm_css$Css$mediaQuery,
				'screen and ( max-width: 600px )',
				_elm_lang$core$Native_List.fromArray(
					[
						A2(
						F2(
							function (x, y) {
								return A2(_rtfeldman$elm_css$Css_ops['.'], x, y);
							}),
						_user$project$Show_Styles$ShowImage,
						_elm_lang$core$Native_List.fromArray(
							[
								_rtfeldman$elm_css$Css$height(
								_rtfeldman$elm_css$Css$px(100))
							]))
					])),
				A2(
				_rtfeldman$elm_css$Css$mediaQuery,
				'screen and ( max-width: 342px )',
				_elm_lang$core$Native_List.fromArray(
					[
						A2(
						F2(
							function (x, y) {
								return A2(_rtfeldman$elm_css$Css_ops['.'], x, y);
							}),
						_user$project$Show_Styles$Button,
						_elm_lang$core$Native_List.fromArray(
							[
								_rtfeldman$elm_css$Css$marginRight(
								_rtfeldman$elm_css$Css$px(8))
							]))
					]))
			]));

	var _user$project$Show$episodeAired = F2(
		function (today, episode) {
			var _p0 = _elm_lang$core$Result$toMaybe(
				_elm_lang$core$Date$fromString(episode.airstamp));
			if (_p0.ctor === 'Nothing') {
				return true;
			} else {
				return A3(_rluiten$elm_date_extra$Date_Extra_Compare$is, _rluiten$elm_date_extra$Date_Extra_Compare$After, today, _p0._0);
			}
		});
	var _user$project$Show$airedSeasons = F2(
		function (today, seasons) {
			return A2(
				_elm_lang$core$List$filter,
				function (season) {
					return !_elm_lang$core$Native_Utils.eq(
						season.episodes,
						_elm_lang$core$Native_List.fromArray(
							[]));
				},
				A2(
					_elm_lang$core$List$map,
					function (season) {
						return _elm_lang$core$Native_Utils.update(
							season,
							{
								episodes: A2(
									_elm_lang$core$List$filter,
									_user$project$Show$episodeAired(today),
									season.episodes)
							});
					},
					seasons));
		});
	var _user$project$Show$hasSeasonBeenWatched = F2(
		function (lastWatchedEpisode, season) {
			var _p1 = season.episodes;
			if (_p1.ctor === '[]') {
				return false;
			} else {
				return _elm_lang$core$Native_Utils.cmp(lastWatchedEpisode, _p1._0.id) > -1;
			}
		});
	var _user$project$Show$getSeason = function (episodes) {
		var _p2 = episodes;
		if (_p2.ctor === '[]') {
			return 0;
		} else {
			return _p2._0.season;
		}
	};
	var _user$project$Show$addEpisodesToShows = F2(
		function (shows, episodesForShows) {
			var showEpisodes = _elm_lang$core$Dict$fromList(episodesForShows);
			return A2(
				_elm_lang$core$List$map,
				function (show) {
					return _elm_lang$core$Native_Utils.update(
						show,
						{
							episodes: A2(
								_elm_lang$core$Maybe$withDefault,
								_elm_lang$core$Native_List.fromArray(
									[]),
								A2(_elm_lang$core$Dict$get, show.id, showEpisodes))
						});
				},
				shows);
		});
	var _user$project$Show$fetchShow = function (show) {
		return _user$project$Api$getEpisodes(show.id);
	};
	var _user$project$Show$namespace = _rtfeldman$elm_css_helpers$Html_CssHelpers$withNamespace(_user$project$Show_Styles$componentNamespace);
	var _user$project$Show$localClass = _user$project$Show$namespace.$class;
	var _user$project$Show$persistShow = _elm_lang$core$Native_Platform.outgoingPort(
		'persistShow',
		function (v) {
			return {
				id: v.id,
				lastEpisodeWatched: v.lastEpisodeWatched,
				name: v.name,
				image: (v.image.ctor === 'Nothing') ? null : v.image._0,
				seasons: _elm_lang$core$Native_List.toArray(v.seasons).map(
					function (v) {
						return {
							number: v.number,
							episodes: _elm_lang$core$Native_List.toArray(v.episodes).map(
								function (v) {
									return {id: v.id, name: v.name, summary: v.summary, season: v.season, number: v.number, airstamp: v.airstamp};
								}),
							visible: v.visible
						};
					}),
				seasonsVisible: v.seasonsVisible,
				rev: v.rev
			};
		});
	var _user$project$Show$Episode = F6(
		function (a, b, c, d, e, f) {
			return {id: a, name: b, summary: c, season: d, number: e, airstamp: f};
		});
	var _user$project$Show$Season = F3(
		function (a, b, c) {
			return {number: a, episodes: b, visible: c};
		});
	var _user$project$Show$Show = F7(
		function (a, b, c, d, e, f, g) {
			return {id: a, lastEpisodeWatched: b, name: c, image: d, seasons: e, seasonsVisible: f, rev: g};
		});
	var _user$project$Show$Model = F2(
		function (a, b) {
			return {today: a, show: b};
		});
	var _user$project$Show$SetRev = function (a) {
		return {ctor: 'SetRev', _0: a};
	};
	var _user$project$Show$SetTodaysDate = function (a) {
		return {ctor: 'SetTodaysDate', _0: a};
	};
	var _user$project$Show$ShowTimeError = function (a) {
		return {ctor: 'ShowTimeError', _0: a};
	};
	var _user$project$Show$model = {
		ctor: '_Tuple2',
		_0: {
			today: _elm_lang$core$Date$fromTime(0),
			show: {
				id: 0,
				name: '',
				lastEpisodeWatched: 0,
				image: _elm_lang$core$Maybe$Nothing,
				seasons: _elm_lang$core$Native_List.fromArray(
					[]),
				seasonsVisible: false,
				rev: ''
			}
		},
		_1: A3(_elm_lang$core$Task$perform, _user$project$Show$ShowTimeError, _user$project$Show$SetTodaysDate, _elm_lang$core$Date$now)
	};
	var _user$project$Show$ShowError = function (a) {
		return {ctor: 'ShowError', _0: a};
	};
	var _user$project$Show$UpdateEpisodes = function (a) {
		return {ctor: 'UpdateEpisodes', _0: a};
	};
	var _user$project$Show$updateShow = F2(
		function (msg, model) {
			var _p3 = msg;
			switch (_p3.ctor) {
				case 'MarkEpisodeWatched':
					var updatedShow = _elm_lang$core$Native_Utils.update(
						model,
						{lastEpisodeWatched: _p3._0});
					return {
						ctor: '_Tuple2',
						_0: updatedShow,
						_1: _user$project$Show$persistShow(updatedShow)
					};
				case 'MarkSeasonWatched':
					var chosenSeason = A2(
						_elm_community$elm_list_extra$List_Extra$find,
						function (season) {
							return _elm_lang$core$Native_Utils.eq(season.number, _p3._0);
						},
						model.seasons);
					var _p4 = chosenSeason;
					if (_p4.ctor === 'Nothing') {
						return {ctor: '_Tuple2', _0: model, _1: _elm_lang$core$Platform_Cmd$none};
					} else {
						var _p5 = _p4._0.episodes;
						if (_p5.ctor === '[]') {
							return {ctor: '_Tuple2', _0: model, _1: _elm_lang$core$Platform_Cmd$none};
						} else {
							var updatedShow = _elm_lang$core$Native_Utils.update(
								model,
								{lastEpisodeWatched: _p5._0.id});
							return {
								ctor: '_Tuple2',
								_0: updatedShow,
								_1: _user$project$Show$persistShow(updatedShow)
							};
						}
					}
				case 'MarkAllEpisodesWatched':
					var latestEpisode = function () {
						var _p6 = model.seasons;
						if (_p6.ctor === '[]') {
							return 0;
						} else {
							var _p7 = _p6._0.episodes;
							if (_p7.ctor === '[]') {
								return 0;
							} else {
								return _p7._0.id;
							}
						}
					}();
					var updatedShow = _elm_lang$core$Native_Utils.update(
						model,
						{lastEpisodeWatched: latestEpisode});
					return {
						ctor: '_Tuple2',
						_0: updatedShow,
						_1: _user$project$Show$persistShow(updatedShow)
					};
				case 'UpdateEpisodes':
					var seasons = A2(
						_elm_lang$core$List$map,
						function (episodes) {
							return {
								visible: false,
								episodes: episodes,
								number: _user$project$Show$getSeason(episodes)
							};
						},
						A2(
							_elm_community$elm_list_extra$List_Extra$groupWhile,
							F2(
								function (cur, next) {
									return _elm_lang$core$Native_Utils.eq(cur.season, next.season);
								}),
							A2(
								_elm_lang$core$List$map,
								function (episode) {
									return {id: episode.id, name: episode.name, summary: episode.summary, season: episode.season, number: episode.number, airstamp: episode.airstamp};
								},
								_elm_lang$core$List$reverse(_p3._0))));
					var updatedShow = _elm_lang$core$Native_Utils.update(
						model,
						{seasons: seasons});
					return {
						ctor: '_Tuple2',
						_0: updatedShow,
						_1: (!_elm_lang$core$Native_Utils.eq(updatedShow, model)) ? _user$project$Show$persistShow(updatedShow) : _elm_lang$core$Platform_Cmd$none
					};
				case 'UpdateShow':
					return {
						ctor: '_Tuple2',
						_0: model,
						_1: A3(
							_elm_lang$core$Task$perform,
							_user$project$Show$ShowError,
							_user$project$Show$UpdateEpisodes,
							_user$project$Show$fetchShow(model))
					};
				case 'ToggleSeasons':
					return {
						ctor: '_Tuple2',
						_0: _elm_lang$core$Native_Utils.update(
							model,
							{seasonsVisible: _p3._0}),
						_1: _elm_lang$core$Platform_Cmd$none
					};
				case 'ToggleSeason':
					var newSeasons = A2(
						_elm_lang$core$List$map,
						function (season) {
							return _elm_lang$core$Native_Utils.eq(season.number, _p3._0) ? _elm_lang$core$Native_Utils.update(
								season,
								{visible: _p3._1}) : season;
						},
						model.seasons);
					return {
						ctor: '_Tuple2',
						_0: _elm_lang$core$Native_Utils.update(
							model,
							{seasons: newSeasons}),
						_1: _elm_lang$core$Platform_Cmd$none
					};
				case 'SetRev':
					return {
						ctor: '_Tuple2',
						_0: _elm_lang$core$Native_Utils.update(
							model,
							{rev: _p3._0}),
						_1: _elm_lang$core$Platform_Cmd$none
					};
				default:
					return {ctor: '_Tuple2', _0: model, _1: _elm_lang$core$Platform_Cmd$none};
			}
		});
	var _user$project$Show$update = F2(
		function (msg, model) {
			var _p8 = msg;
			if (_p8.ctor === 'SetTodaysDate') {
				return {
					ctor: '_Tuple2',
					_0: _elm_lang$core$Native_Utils.update(
						model,
						{today: _p8._0}),
					_1: _elm_lang$core$Platform_Cmd$none
				};
			} else {
				var _p9 = A2(_user$project$Show$updateShow, msg, model.show);
				var show = _p9._0;
				var cmd = _p9._1;
				return {
					ctor: '_Tuple2',
					_0: _elm_lang$core$Native_Utils.update(
						model,
						{show: show}),
					_1: cmd
				};
			}
		});
	var _user$project$Show$UpdateShow = {ctor: 'UpdateShow'};
	var _user$project$Show$ToggleSeasons = function (a) {
		return {ctor: 'ToggleSeasons', _0: a};
	};
	var _user$project$Show$MarkEpisodeWatched = function (a) {
		return {ctor: 'MarkEpisodeWatched', _0: a};
	};
	var _user$project$Show$viewEpisode = F2(
		function (lastEpisodeWatched, episode) {
			return A2(
				_elm_lang$html$Html$div,
				_elm_lang$core$Native_List.fromArray(
					[]),
				_elm_lang$core$Native_List.fromArray(
					[
						A2(
						_elm_lang$html$Html$div,
						_elm_lang$core$Native_List.fromArray(
							[
								_elm_lang$html$Html_Attributes$class('mui--text-subhead')
							]),
						_elm_lang$core$Native_List.fromArray(
							[
								_elm_lang$html$Html$text(
								A2(
									_elm_lang$core$Basics_ops['++'],
									'Episode ',
									A2(
										_elm_lang$core$Basics_ops['++'],
										_elm_lang$core$Basics$toString(episode.number),
										A2(_elm_lang$core$Basics_ops['++'], ' - ', episode.name))))
							])),
						A2(
						_elm_lang$html$Html$div,
						_elm_lang$core$Native_List.fromArray(
							[]),
						_elm_lang$core$Native_List.fromArray(
							[
								A2(
								_evancz$elm_markdown$Markdown$toHtml,
								_elm_lang$core$Native_List.fromArray(
									[]),
								episode.summary)
							])),
						(_elm_lang$core$Native_Utils.cmp(episode.id, lastEpisodeWatched) > 0) ? A2(
						_elm_lang$html$Html$div,
						_elm_lang$core$Native_List.fromArray(
							[
								_elm_lang$html$Html_Attributes$style(
								_elm_lang$core$Native_List.fromArray(
									[
										{ctor: '_Tuple2', _0: 'display', _1: 'flex'},
										{ctor: '_Tuple2', _0: 'justify-content', _1: 'flex-end'}
									]))
							]),
						_elm_lang$core$Native_List.fromArray(
							[
								A2(
								_elm_lang$html$Html$button,
								_elm_lang$core$Native_List.fromArray(
									[
										_elm_lang$html$Html_Events$onClick(
										_user$project$Show$MarkEpisodeWatched(episode.id)),
										_elm_lang$html$Html_Attributes$class('mui-btn mui-btn--primary mui-btn--small c-show-Button')
									]),
								_elm_lang$core$Native_List.fromArray(
									[
										_elm_lang$html$Html$text('I watched this')
									]))
							])) : A2(
						_elm_lang$html$Html$div,
						_elm_lang$core$Native_List.fromArray(
							[]),
						_elm_lang$core$Native_List.fromArray(
							[]))
					]));
		});
	var _user$project$Show$viewEpisodes = F2(
		function (lastEpisodeWatched, season) {
			var _p10 = season.visible;
			if (_p10 === true) {
				return A2(
					_elm_lang$html$Html$div,
					_elm_lang$core$Native_List.fromArray(
						[]),
					A2(
						_elm_lang$core$Basics_ops['++'],
						A2(
							_elm_lang$core$List$intersperse,
							A2(
								_elm_lang$html$Html$hr,
								_elm_lang$core$Native_List.fromArray(
									[]),
								_elm_lang$core$Native_List.fromArray(
									[])),
							A2(
								_elm_lang$core$List$map,
								_user$project$Show$viewEpisode(lastEpisodeWatched),
								season.episodes)),
						_elm_lang$core$Native_List.fromArray(
							[
								A2(
								_elm_lang$html$Html$hr,
								_elm_lang$core$Native_List.fromArray(
									[]),
								_elm_lang$core$Native_List.fromArray(
									[]))
							])));
			} else {
				return A2(
					_elm_lang$html$Html$div,
					_elm_lang$core$Native_List.fromArray(
						[]),
					_elm_lang$core$Native_List.fromArray(
						[]));
			}
		});
	var _user$project$Show$MarkSeasonWatched = function (a) {
		return {ctor: 'MarkSeasonWatched', _0: a};
	};
	var _user$project$Show$MarkAllEpisodesWatched = {ctor: 'MarkAllEpisodesWatched'};
	var _user$project$Show$ToggleSeason = F2(
		function (a, b) {
			return {ctor: 'ToggleSeason', _0: a, _1: b};
		});
	var _user$project$Show$viewSeasons = F2(
		function (lastEpisodeWatched, seasons) {
			return A2(
				_elm_lang$html$Html$div,
				_elm_lang$core$Native_List.fromArray(
					[]),
				A2(
					_elm_lang$core$List_ops['::'],
					A2(
						_elm_lang$html$Html$hr,
						_elm_lang$core$Native_List.fromArray(
							[]),
						_elm_lang$core$Native_List.fromArray(
							[])),
					A2(
						_elm_lang$core$List$map,
						function (season) {
							return A2(
								_elm_lang$html$Html$div,
								_elm_lang$core$Native_List.fromArray(
									[]),
								_elm_lang$core$Native_List.fromArray(
									[
										A2(
										_elm_lang$html$Html$div,
										_elm_lang$core$Native_List.fromArray(
											[
												_elm_lang$html$Html_Attributes$style(
												_elm_lang$core$Native_List.fromArray(
													[
														{ctor: '_Tuple2', _0: 'display', _1: 'flex'},
														{ctor: '_Tuple2', _0: 'justify-content', _1: 'space-between'},
														{ctor: '_Tuple2', _0: 'flex-wrap', _1: 'wrap'}
													]))
											]),
										_elm_lang$core$Native_List.fromArray(
											[
												A2(
												_elm_lang$html$Html$div,
												_elm_lang$core$Native_List.fromArray(
													[
														_elm_lang$html$Html_Attributes$class('mui--text-title'),
														_elm_lang$html$Html_Attributes$style(
														_elm_lang$core$Native_List.fromArray(
															[
																{ctor: '_Tuple2', _0: 'line-height', _1: '43px'},
																{ctor: '_Tuple2', _0: 'width', _1: '50%'}
															]))
													]),
												_elm_lang$core$Native_List.fromArray(
													[
														_elm_lang$html$Html$text(
														A2(
															_elm_lang$core$Basics_ops['++'],
															'Season ',
															_elm_lang$core$Basics$toString(season.number)))
													])),
												A2(
												_elm_lang$html$Html$div,
												_elm_lang$core$Native_List.fromArray(
													[]),
												_elm_lang$core$Native_List.fromArray(
													[
														A2(
														_elm_lang$html$Html$div,
														_elm_lang$core$Native_List.fromArray(
															[]),
														_elm_lang$core$Native_List.fromArray(
															[
																_elm_lang$core$Native_Utils.eq(
																A2(_user$project$Show$hasSeasonBeenWatched, lastEpisodeWatched, season),
																true) ? A2(
																_elm_lang$html$Html$div,
																_elm_lang$core$Native_List.fromArray(
																	[]),
																_elm_lang$core$Native_List.fromArray(
																	[])) : A2(
																_elm_lang$html$Html$button,
																_elm_lang$core$Native_List.fromArray(
																	[
																		_elm_lang$html$Html_Events$onClick(
																		_user$project$Show$MarkSeasonWatched(season.number)),
																		_elm_lang$html$Html_Attributes$class('mui-btn mui-btn--primary mui-btn--small c-show-Button')
																	]),
																_elm_lang$core$Native_List.fromArray(
																	[
																		_elm_lang$html$Html$text('I watched this')
																	]))
															])),
														A2(
														_elm_lang$html$Html$div,
														_elm_lang$core$Native_List.fromArray(
															[
																_elm_lang$html$Html_Attributes$style(
																_elm_lang$core$Native_List.fromArray(
																	[
																		{ctor: '_Tuple2', _0: 'text-align', _1: 'right'}
																	]))
															]),
														_elm_lang$core$Native_List.fromArray(
															[
																A2(
																_elm_lang$html$Html$button,
																_elm_lang$core$Native_List.fromArray(
																	[
																		_elm_lang$html$Html_Events$onClick(
																		A2(
																			_user$project$Show$ToggleSeason,
																			season.number,
																			_elm_lang$core$Basics$not(season.visible))),
																		_elm_lang$html$Html_Attributes$class('mui-btn mui-btn--accent mui-btn--small c-show-Button')
																	]),
																_elm_lang$core$Native_List.fromArray(
																	[
																		_elm_lang$html$Html$text(
																		season.visible ? 'Hide episodes' : 'Show episodes')
																	]))
															]))
													]))
											])),
										A2(
										_elm_lang$html$Html$hr,
										_elm_lang$core$Native_List.fromArray(
											[]),
										_elm_lang$core$Native_List.fromArray(
											[])),
										A2(_user$project$Show$viewEpisodes, lastEpisodeWatched, season)
									]));
						},
						seasons)));
		});
	var _user$project$Show$viewShow = F2(
		function (today, show) {
			var seasons = A2(_user$project$Show$airedSeasons, today, show.seasons);
			var episodes = _elm_lang$core$List$concat(
				A2(
					_elm_lang$core$List$map,
					function (season) {
						return season.episodes;
					},
					seasons));
			var numEpisodes = _elm_lang$core$List$length(episodes);
			var unwatchedEpisodes = function () {
				var _p11 = show.lastEpisodeWatched;
				if (_p11 === 0) {
					return numEpisodes;
				} else {
					return _elm_lang$core$List$length(
						A2(
							_elm_lang$core$List$filter,
							function (episode) {
								return _elm_lang$core$Native_Utils.cmp(episode.id, show.lastEpisodeWatched) > 0;
							},
							episodes));
				}
			}();
			var unwatchedEpisodesDesc = function () {
				var _p12 = unwatchedEpisodes;
				switch (_p12) {
					case 0:
						return 'All caught up';
					case 1:
						return A2(
							_elm_lang$core$Basics_ops['++'],
							_elm_lang$core$Basics$toString(unwatchedEpisodes),
							' episode to watch');
					default:
						return A2(
							_elm_lang$core$Basics_ops['++'],
							_elm_lang$core$Basics$toString(unwatchedEpisodes),
							' episodes to watch');
				}
			}();
			return A2(
				_elm_lang$html$Html$div,
				_elm_lang$core$Native_List.fromArray(
					[]),
				_elm_lang$core$Native_List.fromArray(
					[
						A2(
						_elm_lang$html$Html$div,
						_elm_lang$core$Native_List.fromArray(
							[
								_elm_lang$html$Html_Attributes$style(
								_elm_lang$core$Native_List.fromArray(
									[
										{ctor: '_Tuple2', _0: 'display', _1: 'flex'},
										{ctor: '_Tuple2', _0: 'overflow', _1: 'auto'},
										{ctor: '_Tuple2', _0: 'min-height', _1: '100px'},
										{ctor: '_Tuple2', _0: 'margin-bottom', _1: '15px'}
									]))
							]),
						_elm_lang$core$Native_List.fromArray(
							[
								A2(
								_elm_lang$html$Html$img,
								_elm_lang$core$Native_List.fromArray(
									[
										_user$project$Show$localClass(
										_elm_lang$core$Native_List.fromArray(
											[_user$project$Show_Styles$ShowImage])),
										_elm_lang$html$Html_Attributes$src(
										A2(_elm_lang$core$Maybe$withDefault, 'http://lorempixel.com/72/100/abstract', show.image))
									]),
								_elm_lang$core$Native_List.fromArray(
									[])),
								A2(
								_elm_lang$html$Html$div,
								_elm_lang$core$Native_List.fromArray(
									[
										_elm_lang$html$Html_Attributes$style(
										_elm_lang$core$Native_List.fromArray(
											[
												{ctor: '_Tuple2', _0: 'padding-left', _1: '15px'},
												{ctor: '_Tuple2', _0: 'flex', _1: '1'}
											]))
									]),
								_elm_lang$core$Native_List.fromArray(
									[
										A2(
										_elm_lang$html$Html$div,
										_elm_lang$core$Native_List.fromArray(
											[
												_elm_lang$html$Html_Attributes$class('mui--text-title')
											]),
										_elm_lang$core$Native_List.fromArray(
											[
												_elm_lang$html$Html$text(show.name)
											])),
										A2(
										_elm_lang$html$Html$div,
										_elm_lang$core$Native_List.fromArray(
											[
												_elm_lang$html$Html_Attributes$class('mui--text-subhead')
											]),
										_elm_lang$core$Native_List.fromArray(
											[
												_elm_lang$html$Html$text(
												(_elm_lang$core$Native_Utils.cmp(numEpisodes, 0) > 0) ? unwatchedEpisodesDesc : '')
											]))
									]))
							])),
						A2(
						_elm_lang$html$Html$button,
						_elm_lang$core$Native_List.fromArray(
							[
								_elm_lang$html$Html_Events$onClick(
								_user$project$Show$ToggleSeasons(
									_elm_lang$core$Basics$not(show.seasonsVisible))),
								_elm_lang$html$Html_Attributes$class('mui-btn mui-btn--accent mui-btn--small c-show-Button')
							]),
						_elm_lang$core$Native_List.fromArray(
							[
								_elm_lang$html$Html$text(
								show.seasonsVisible ? 'Hide seasons' : 'Show seasons')
							])),
						(!_elm_lang$core$Native_Utils.eq(unwatchedEpisodes, 0)) ? A2(
						_elm_lang$html$Html$button,
						_elm_lang$core$Native_List.fromArray(
							[
								_elm_lang$html$Html_Attributes$class('mui-btn mui-btn--primary mui-btn--small c-show-Button'),
								_elm_lang$html$Html_Events$onClick(_user$project$Show$MarkAllEpisodesWatched)
							]),
						_elm_lang$core$Native_List.fromArray(
							[
								_elm_lang$html$Html$text('I\'m caught up')
							])) : A2(
						_elm_lang$html$Html$div,
						_elm_lang$core$Native_List.fromArray(
							[]),
						_elm_lang$core$Native_List.fromArray(
							[])),
						_elm_lang$core$Native_Utils.eq(show.seasonsVisible, true) ? A2(_user$project$Show$viewSeasons, show.lastEpisodeWatched, seasons) : A2(
						_elm_lang$html$Html$div,
						_elm_lang$core$Native_List.fromArray(
							[]),
						_elm_lang$core$Native_List.fromArray(
							[]))
					]));
		});
	var _user$project$Show$view = function (model) {
		return A2(_user$project$Show$viewShow, model.today, model.show);
	};

	var _user$project$Shows$model = {
		list: _elm_lang$core$Native_List.fromArray(
			[]),
		error: _elm_lang$core$Maybe$Nothing
	};
	var _user$project$Shows$loadShows = _elm_lang$core$Native_Platform.incomingPort(
		'loadShows',
		_elm_lang$core$Json_Decode$list(
			A2(
				_elm_lang$core$Json_Decode$andThen,
				A2(_elm_lang$core$Json_Decode_ops[':='], 'id', _elm_lang$core$Json_Decode$int),
				function (id) {
					return A2(
						_elm_lang$core$Json_Decode$andThen,
						A2(_elm_lang$core$Json_Decode_ops[':='], 'lastEpisodeWatched', _elm_lang$core$Json_Decode$int),
						function (lastEpisodeWatched) {
							return A2(
								_elm_lang$core$Json_Decode$andThen,
								A2(_elm_lang$core$Json_Decode_ops[':='], 'name', _elm_lang$core$Json_Decode$string),
								function (name) {
									return A2(
										_elm_lang$core$Json_Decode$andThen,
										A2(
											_elm_lang$core$Json_Decode_ops[':='],
											'image',
											_elm_lang$core$Json_Decode$oneOf(
												_elm_lang$core$Native_List.fromArray(
													[
														_elm_lang$core$Json_Decode$null(_elm_lang$core$Maybe$Nothing),
														A2(_elm_lang$core$Json_Decode$map, _elm_lang$core$Maybe$Just, _elm_lang$core$Json_Decode$string)
													]))),
										function (image) {
											return A2(
												_elm_lang$core$Json_Decode$andThen,
												A2(
													_elm_lang$core$Json_Decode_ops[':='],
													'seasons',
													_elm_lang$core$Json_Decode$list(
														A2(
															_elm_lang$core$Json_Decode$andThen,
															A2(_elm_lang$core$Json_Decode_ops[':='], 'number', _elm_lang$core$Json_Decode$int),
															function (number) {
																return A2(
																	_elm_lang$core$Json_Decode$andThen,
																	A2(
																		_elm_lang$core$Json_Decode_ops[':='],
																		'episodes',
																		_elm_lang$core$Json_Decode$list(
																			A2(
																				_elm_lang$core$Json_Decode$andThen,
																				A2(_elm_lang$core$Json_Decode_ops[':='], 'id', _elm_lang$core$Json_Decode$int),
																				function (id) {
																					return A2(
																						_elm_lang$core$Json_Decode$andThen,
																						A2(_elm_lang$core$Json_Decode_ops[':='], 'name', _elm_lang$core$Json_Decode$string),
																						function (name) {
																							return A2(
																								_elm_lang$core$Json_Decode$andThen,
																								A2(_elm_lang$core$Json_Decode_ops[':='], 'summary', _elm_lang$core$Json_Decode$string),
																								function (summary) {
																									return A2(
																										_elm_lang$core$Json_Decode$andThen,
																										A2(_elm_lang$core$Json_Decode_ops[':='], 'season', _elm_lang$core$Json_Decode$int),
																										function (season) {
																											return A2(
																												_elm_lang$core$Json_Decode$andThen,
																												A2(_elm_lang$core$Json_Decode_ops[':='], 'number', _elm_lang$core$Json_Decode$int),
																												function (number) {
																													return A2(
																														_elm_lang$core$Json_Decode$andThen,
																														A2(_elm_lang$core$Json_Decode_ops[':='], 'airstamp', _elm_lang$core$Json_Decode$string),
																														function (airstamp) {
																															return _elm_lang$core$Json_Decode$succeed(
																																{id: id, name: name, summary: summary, season: season, number: number, airstamp: airstamp});
																														});
																												});
																										});
																								});
																						});
																				}))),
																	function (episodes) {
																		return A2(
																			_elm_lang$core$Json_Decode$andThen,
																			A2(_elm_lang$core$Json_Decode_ops[':='], 'visible', _elm_lang$core$Json_Decode$bool),
																			function (visible) {
																				return _elm_lang$core$Json_Decode$succeed(
																					{number: number, episodes: episodes, visible: visible});
																			});
																	});
															}))),
												function (seasons) {
													return A2(
														_elm_lang$core$Json_Decode$andThen,
														A2(_elm_lang$core$Json_Decode_ops[':='], 'seasonsVisible', _elm_lang$core$Json_Decode$bool),
														function (seasonsVisible) {
															return A2(
																_elm_lang$core$Json_Decode$andThen,
																A2(_elm_lang$core$Json_Decode_ops[':='], 'rev', _elm_lang$core$Json_Decode$string),
																function (rev) {
																	return _elm_lang$core$Json_Decode$succeed(
																		{id: id, lastEpisodeWatched: lastEpisodeWatched, name: name, image: image, seasons: seasons, seasonsVisible: seasonsVisible, rev: rev});
																});
														});
												});
										});
								});
						});
				})));
	var _user$project$Shows$loadRev = _elm_lang$core$Native_Platform.incomingPort(
		'loadRev',
		A2(
			_elm_lang$core$Json_Decode$andThen,
			A2(_elm_lang$core$Json_Decode_ops[':='], 'id', _elm_lang$core$Json_Decode$int),
			function (id) {
				return A2(
					_elm_lang$core$Json_Decode$andThen,
					A2(_elm_lang$core$Json_Decode_ops[':='], 'rev', _elm_lang$core$Json_Decode$string),
					function (rev) {
						return _elm_lang$core$Json_Decode$succeed(
							{id: id, rev: rev});
					});
			}));
	var _user$project$Shows$Model = F2(
		function (a, b) {
			return {list: a, error: b};
		});
	var _user$project$Shows$ShowRev = F2(
		function (a, b) {
			return {id: a, rev: b};
		});
	var _user$project$Shows$LoadRev = function (a) {
		return {ctor: 'LoadRev', _0: a};
	};
	var _user$project$Shows$ShowMsg = F2(
		function (a, b) {
			return {ctor: 'ShowMsg', _0: a, _1: b};
		});
	var _user$project$Shows$updateHelp = F3(
		function (id, msg, show) {
			if (!_elm_lang$core$Native_Utils.eq(show.show.id, id)) {
				return {ctor: '_Tuple2', _0: show, _1: _elm_lang$core$Platform_Cmd$none};
			} else {
				var _p0 = A2(_user$project$Show$update, msg, show);
				var newShow = _p0._0;
				var cmds = _p0._1;
				return {
					ctor: '_Tuple2',
					_0: newShow,
					_1: A2(
						_elm_lang$core$Platform_Cmd$map,
						_user$project$Shows$ShowMsg(id),
						cmds)
				};
			}
		});
	var _user$project$Shows$updateAll = function (show) {
		var _p1 = _user$project$Show$model;
		var defaultShowModel = _p1._0;
		var initCmd = _p1._1;
		var _p2 = A2(
			_user$project$Show$update,
			_user$project$Show$UpdateShow,
			_elm_lang$core$Native_Utils.update(
				defaultShowModel,
				{show: show}));
		var newShow = _p2._0;
		var cmd = _p2._1;
		return {
			ctor: '_Tuple2',
			_0: newShow,
			_1: _elm_lang$core$Platform_Cmd$batch(
				_elm_lang$core$Native_List.fromArray(
					[
						A2(
						_elm_lang$core$Platform_Cmd$map,
						_user$project$Shows$ShowMsg(show.id),
						initCmd),
						A2(
						_elm_lang$core$Platform_Cmd$map,
						_user$project$Shows$ShowMsg(show.id),
						cmd)
					]))
		};
	};
	var _user$project$Shows$update = F2(
		function (msg, model) {
			var _p3 = msg;
			switch (_p3.ctor) {
				case 'ShowMsg':
					var _p7 = _p3._1;
					var _p4 = _p7;
					if (_p4.ctor === 'ShowError') {
						var _p5 = _p4._0;
						if (_p5.ctor === 'UnexpectedPayload') {
							return {
								ctor: '_Tuple2',
								_0: _elm_lang$core$Native_Utils.update(
									model,
									{
										error: _elm_lang$core$Maybe$Just(_p5._0)
									}),
								_1: _elm_lang$core$Platform_Cmd$none
							};
						} else {
							return {
								ctor: '_Tuple2',
								_0: _elm_lang$core$Native_Utils.update(
									model,
									{
										error: _elm_lang$core$Maybe$Just('Something terrible has happened')
									}),
								_1: _elm_lang$core$Platform_Cmd$none
							};
						}
					} else {
						var _p6 = _elm_lang$core$List$unzip(
							A2(
								_elm_lang$core$List$map,
								A2(_user$project$Shows$updateHelp, _p3._0, _p7),
								model.list));
						var newShows = _p6._0;
						var cmds = _p6._1;
						return {
							ctor: '_Tuple2',
							_0: _elm_lang$core$Native_Utils.update(
								model,
								{list: newShows}),
							_1: _elm_lang$core$Platform_Cmd$batch(cmds)
						};
					}
				case 'AddToList':
					var _p11 = _p3._0;
					var _p8 = _user$project$Show$model;
					var defaultShowModel = _p8._0;
					var initialCmd = _p8._1;
					var defaultShow = defaultShowModel.show;
					var getImage = function (show) {
						var _p9 = show.image;
						if (_p9.ctor === 'Nothing') {
							return _elm_lang$core$Maybe$Nothing;
						} else {
							return _elm_lang$core$Maybe$Just(_p9._0.medium);
						}
					};
					var updatedShow = _elm_lang$core$Native_Utils.update(
						defaultShow,
						{
							id: _p11.show.id,
							name: _p11.show.name,
							image: getImage(_p11.show)
						});
					var _p10 = A2(
						_user$project$Show$update,
						_user$project$Show$UpdateShow,
						_elm_lang$core$Native_Utils.update(
							defaultShowModel,
							{show: updatedShow}));
					var newShow = _p10._0;
					var cmds = _p10._1;
					var newList = A2(_elm_lang$core$List_ops['::'], newShow, model.list);
					return {
						ctor: '_Tuple2',
						_0: _elm_lang$core$Native_Utils.update(
							model,
							{list: newList}),
						_1: _elm_lang$core$Platform_Cmd$batch(
							_elm_lang$core$Native_List.fromArray(
								[
									A2(
									_elm_lang$core$Platform_Cmd$map,
									_user$project$Shows$ShowMsg(newShow.show.id),
									initialCmd),
									A2(
									_elm_lang$core$Platform_Cmd$map,
									_user$project$Shows$ShowMsg(newShow.show.id),
									cmds)
								]))
					};
				case 'LoadShows':
					var _p12 = _elm_lang$core$List$unzip(
						A2(_elm_lang$core$List$map, _user$project$Shows$updateAll, _p3._0));
					var updatedShows = _p12._0;
					var cmds = _p12._1;
					return {
						ctor: '_Tuple2',
						_0: _elm_lang$core$Native_Utils.update(
							model,
							{list: updatedShows}),
						_1: _elm_lang$core$Platform_Cmd$batch(cmds)
					};
				default:
					var _p14 = _p3._0;
					var _p13 = _elm_lang$core$List$unzip(
						A2(
							_elm_lang$core$List$map,
							A2(
								_user$project$Shows$updateHelp,
								_p14.id,
								_user$project$Show$SetRev(_p14.rev)),
							model.list));
					var newShows = _p13._0;
					var cmds = _p13._1;
					return {
						ctor: '_Tuple2',
						_0: _elm_lang$core$Native_Utils.update(
							model,
							{list: newShows}),
						_1: _elm_lang$core$Platform_Cmd$batch(cmds)
					};
			}
		});
	var _user$project$Shows$view = function (model) {
		var _p15 = model.list;
		if (_p15.ctor === '[]') {
			return A2(
				_elm_lang$html$Html$div,
				_elm_lang$core$Native_List.fromArray(
					[]),
				_elm_lang$core$Native_List.fromArray(
					[]));
		} else {
			var _p16 = model.error;
			if (_p16.ctor === 'Just') {
				return A2(
					_elm_lang$html$Html$div,
					_elm_lang$core$Native_List.fromArray(
						[]),
					_elm_lang$core$Native_List.fromArray(
						[
							_elm_lang$html$Html$text(_p16._0)
						]));
			} else {
				return A2(
					_elm_lang$html$Html$div,
					_elm_lang$core$Native_List.fromArray(
						[
							_elm_lang$html$Html_Attributes$class('mui-panel'),
							_elm_lang$html$Html_Attributes$style(
							_elm_lang$core$Native_List.fromArray(
								[
									{ctor: '_Tuple2', _0: 'margin-top', _1: '15px'},
									{ctor: '_Tuple2', _0: 'margin-bottom', _1: '15px'}
								]))
						]),
					A2(
						_elm_lang$core$List$intersperse,
						A2(
							_elm_lang$html$Html$hr,
							_elm_lang$core$Native_List.fromArray(
								[]),
							_elm_lang$core$Native_List.fromArray(
								[])),
						A2(
							_elm_lang$core$List$map,
							function (show) {
								return A2(
									_elm_lang$html$Html_App$map,
									_user$project$Shows$ShowMsg(show.show.id),
									_user$project$Show$view(show));
							},
							_p15)));
			}
		}
	};
	var _user$project$Shows$LoadShows = function (a) {
		return {ctor: 'LoadShows', _0: a};
	};
	var _user$project$Shows$subscriptions = function (model) {
		return _elm_lang$core$Platform_Sub$batch(
			_elm_lang$core$Native_List.fromArray(
				[
					_user$project$Shows$loadShows(_user$project$Shows$LoadShows),
					_user$project$Shows$loadRev(_user$project$Shows$LoadRev)
				]));
	};
	var _user$project$Shows$AddToList = function (a) {
		return {ctor: 'AddToList', _0: a};
	};

	var _user$project$Main$showDict = function (shows) {
		return A3(
			_elm_lang$core$List$foldr,
			F2(
				function (show, showSet) {
					return A2(_elm_lang$core$Set$insert, show.show.id, showSet);
				}),
			_elm_lang$core$Set$empty,
			shows.list);
	};
	var _user$project$Main$model = {search: _user$project$Search$model, shows: _user$project$Shows$model};
	var _user$project$Main$Model = F2(
		function (a, b) {
			return {search: a, shows: b};
		});
	var _user$project$Main$ShowsMsg = function (a) {
		return {ctor: 'ShowsMsg', _0: a};
	};
	var _user$project$Main$subscriptions = function (model) {
		return A2(
			_elm_lang$core$Platform_Sub$map,
			_user$project$Main$ShowsMsg,
			_user$project$Shows$subscriptions(model.shows));
	};
	var _user$project$Main$SearchMsg = function (a) {
		return {ctor: 'SearchMsg', _0: a};
	};
	var _user$project$Main$update = F2(
		function (msg, model) {
			var _p0 = msg;
			if (_p0.ctor === 'SearchMsg') {
				var _p5 = _p0._0;
				var _p1 = _p5;
				if (_p1.ctor === 'AddShow') {
					var _p2 = A2(_user$project$Search$update, _p5, model.search);
					var searchModel = _p2._0;
					var searchCmd = _p2._1;
					var _p3 = A2(
						_user$project$Shows$update,
						_user$project$Shows$AddToList(_p1._0),
						model.shows);
					var showsModel = _p3._0;
					var showsCmd = _p3._1;
					return {
						ctor: '_Tuple2',
						_0: _elm_lang$core$Native_Utils.update(
							model,
							{shows: showsModel, search: searchModel}),
						_1: _elm_lang$core$Platform_Cmd$batch(
							_elm_lang$core$Native_List.fromArray(
								[
									A2(_elm_lang$core$Platform_Cmd$map, _user$project$Main$ShowsMsg, showsCmd),
									A2(_elm_lang$core$Platform_Cmd$map, _user$project$Main$SearchMsg, searchCmd)
								]))
					};
				} else {
					var _p4 = A2(_user$project$Search$update, _p5, model.search);
					var searchModel = _p4._0;
					var cmd = _p4._1;
					return {
						ctor: '_Tuple2',
						_0: _elm_lang$core$Native_Utils.update(
							model,
							{search: searchModel}),
						_1: A2(_elm_lang$core$Platform_Cmd$map, _user$project$Main$SearchMsg, cmd)
					};
				}
			} else {
				var _p6 = A2(_user$project$Shows$update, _p0._0, model.shows);
				var showsModel = _p6._0;
				var cmd = _p6._1;
				return {
					ctor: '_Tuple2',
					_0: _elm_lang$core$Native_Utils.update(
						model,
						{shows: showsModel}),
					_1: A2(_elm_lang$core$Platform_Cmd$map, _user$project$Main$ShowsMsg, cmd)
				};
			}
		});
	var _user$project$Main$view = function (model) {
		return A2(
			_user$project$AppLayout$view,
			'Elm TV',
			A2(
				_elm_lang$html$Html$div,
				_elm_lang$core$Native_List.fromArray(
					[]),
				_elm_lang$core$Native_List.fromArray(
					[
						A2(
						_elm_lang$html$Html_App$map,
						_user$project$Main$SearchMsg,
						A2(
							_user$project$Search$view,
							model.search,
							_user$project$Main$showDict(model.shows))),
						A2(
						_elm_lang$html$Html_App$map,
						_user$project$Main$ShowsMsg,
						_user$project$Shows$view(model.shows))
					])));
	};
	var _user$project$Main$main = {
		main: _elm_lang$html$Html_App$program(
			{
				init: {ctor: '_Tuple2', _0: _user$project$Main$model, _1: _elm_lang$core$Platform_Cmd$none},
				view: _user$project$Main$view,
				update: _user$project$Main$update,
				subscriptions: _user$project$Main$subscriptions
			})
	};

	var Elm = {};
	Elm['Main'] = Elm['Main'] || {};
	_elm_lang$core$Native_Platform.addPublicModule(Elm['Main'], 'Main', typeof _user$project$Main$main === 'undefined' ? null : _user$project$Main$main);

	if (typeof define === "function" && define['amd'])
	{
	  define([], function() { return Elm; });
	  return;
	}

	if (typeof module === "object")
	{
	  module['exports'] = Elm;
	  return;
	}

	var globalElm = this['Elm'];
	if (typeof globalElm === "undefined")
	{
	  this['Elm'] = Elm;
	  return;
	}

	for (var publicModule in Elm)
	{
	  if (publicModule in globalElm)
	  {
	    throw new Error('There are two Elm modules called `' + publicModule + '` on this page! Rename one of them.');
	  }
	  globalElm[publicModule] = Elm[publicModule];
	}

	}).call(this);



/***/ }
/******/ ]);