import "../wpt-env.js";

let cursor,db,result,store,value;

import "./resources/support.js";

import "./resources/support-promises.js";



var host_info = get_host_info();

promise_test(async testCase => {
  await deleteAllDatabases(testCase);

  // Create an iframe to open and hold a database on a different origin.
  var iframe = document.createElement('iframe');
  var newLocation = window.location.href.replace('www', 'www2');

  const keepalive_watcher = new EventWatcher(testCase, window, 'message');
  iframe.src = host_info.HTTP_REMOTE_ORIGIN +
      '/IndexedDB/resources/idbfactory-origin-isolation-iframe.html';
  document.body.appendChild(iframe);

  // Wait until the iframe starts its transaction.
  var event = await keepalive_watcher.wait_for('message');
  assert_equals("keep_alive_started", event.data);

  // Create our own database with the same name, and perform a simple get.
  const db = await createNamedDatabase(
      testCase, 'db-isolation-test', database => {
        database.createObjectStore('s');
      });
  const tx = db.transaction('s', 'readonly');
  var request = tx.objectStore('s').get(0);
  request.onsuccess = testCase.step_func_done();
  request.onerror = testCase.unreached_func("There should be no errors.");
}, "Test to make sure that origins have separate locking schemes");

