import "../wpt-env.js";
import "./resources/support-promises.js";
import "./resources/support.js";
import "./resources/request-event-ordering-common.js";
globalThis.title = "IndexedDB: request result events are delivered in order";
let cursor,db,result,store,value;

// META: title=IndexedDB: request result events are delivered in order
// META: global=window,worker
// META: script=resources/support-promises.js
// META: script=resources/support.js
// META: script=resources/request-event-ordering-common.js
// META: timeout=long

// Spec: https://w3c.github.io/IndexedDB/#abort-transaction

'use strict';

eventsTest('large values', [
  ['open', 1],
  ['get', 1],
  ['getall', 4],
  ['get', 3],
  ['continue', 3],
  ['open', 3],
]);
