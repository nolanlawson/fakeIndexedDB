import "../wpt-env.js";

let cursor,db,result,store,value;

globalThis.title = "IndexedDB: Interleaved iteration of multiple cursors";

import "./resources/support-promises.js";

import "./resources/interleaved-cursors-common.js";

// META: title=IndexedDB: Interleaved iteration of multiple cursors
// META: global=window,worker
// META: script=resources/support-promises.js
// META: script=resources/interleaved-cursors-common.js
// META: timeout=long

'use strict';

cursorTest(250);
