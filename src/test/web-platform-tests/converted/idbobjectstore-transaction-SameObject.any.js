import "../wpt-env.js";
import "./resources/support.js";
globalThis.title = "IndexedDB: Verify [SameObject] behavior of IDBObjectStore's transaction attribute";
let cursor,db,result,store,value;

// META: global=window,worker
// META: title=IndexedDB: Verify [SameObject] behavior of IDBObjectStore's transaction attribute
// META: script=resources/support.js

// Spec: https://w3c.github.io/IndexedDB/#dom-idbobjectstore-transaction

'use strict';

indexeddb_test(
    (t, db) => {
      const store = db.createObjectStore('store');
      assert_equals(
          store.transaction, store.transaction,
          'Attribute should yield the same object each time');
    },
    (t, db) => {
      const tx = db.transaction('store', 'readonly');
      const store = tx.objectStore('store');
      assert_equals(
          store.transaction, store.transaction,
          'Attribute should yield the same object each time');
      t.done();
    },
    'IDBObjectStore.transaction [SameObject]');
