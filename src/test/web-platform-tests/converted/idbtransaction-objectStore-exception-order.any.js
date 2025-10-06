import "../wpt-env.js";

import "./resources/support.js";

globalThis.title = "IndexedDB: IDBTransaction objectStore() Exception Ordering";

let cursor,db,result,store,value;

// META: global=window,worker
// META: title=IndexedDB: IDBTransaction objectStore() Exception Ordering
// META: script=resources/support.js

// Spec: https://w3c.github.io/IndexedDB/#dom-idbtransaction-objectstore

'use strict';

indexeddb_test(
    (t, db) => {
        const store = db.createObjectStore('s');
    },
    (t, db) => {
        const tx = db.transaction('s', 'readonly');
        tx.oncomplete = t.step_func(() => {
            assert_throws_dom('InvalidStateError', () => { tx.objectStore('nope'); },
                '"finished" check (InvalidStateError) should precede ' +
                '"name in scope" check (NotFoundError)');
            t.done();
        });
    },
    'IDBTransaction.objectStore exception order: InvalidStateError vs. NotFoundError'
);