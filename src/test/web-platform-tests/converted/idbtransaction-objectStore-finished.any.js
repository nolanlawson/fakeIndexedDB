import "../wpt-env.js";
import "./resources/support.js";
globalThis.title = "IndexedDB: IDBTransaction objectStore() when transaction is finished";
let cursor,db,result,store,value;

// META: global=window,worker
// META: title=IndexedDB: IDBTransaction objectStore() when transaction is finished
// META: script=resources/support.js

// Spec: https://w3c.github.io/IndexedDB/#dom-idbtransaction-objectstore

'use strict';

indexeddb_test(
  (t, db) => {
    db.createObjectStore('store');
  },
  (t, db) => {
    const tx = db.transaction('store', 'readonly');
    tx.abort();
    assert_throws_dom('InvalidStateError', () => tx.objectStore('store'),
                      'objectStore() should throw if transaction is finished');
    t.done();
  },
  'IDBTransaction objectStore() behavior when transaction is finished'
);
