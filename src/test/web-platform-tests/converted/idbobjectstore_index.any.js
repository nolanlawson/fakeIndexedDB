import "../wpt-env.js";

let cursor,db,result,store,value;

globalThis.title = "IDBObjectStore.index() - returns an index";

import "./resources/support.js";

// META: global=window,worker
// META: title=IDBObjectStore.index() - returns an index
// META: script=resources/support.js

'use strict';

async_test(t => {
  let db;

  let open_rq = createdb(t);
  open_rq.onupgradeneeded = t.step_func(e => {
    db = e.target.result;

    db.createObjectStore('store').createIndex('index', 'indexedProperty');
  });

  open_rq.onsuccess = t.step_func(e => {
    let index =
        db.transaction('store', 'readonly').objectStore('store').index('index');

    assert_true(index instanceof IDBIndex, 'instanceof IDBIndex');
    t.done();
  });
});
