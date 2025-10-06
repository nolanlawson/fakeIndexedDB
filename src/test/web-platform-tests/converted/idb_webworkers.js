import "../wpt-env.js";

import "./resources/support.js";

let cursor,db,result,store,value;


    var db, count = 0,
      t = async_test();
      t.add_cleanup(function() { indexedDB.deleteDatabase('webworker101'); });

    t.step(function() {
        var worker = new Worker("resources/idbworker.js");
        worker.onmessage = t.step_func(function (e) {
            switch(count) {
                case 0:
                    assert_equals(e.data, true, 'worker has idb object')
                    break

                case 1:
                    assert_equals(e.data, "test", "get(1) in worker")
                    t.done()
            }

            count++
        });

        worker.postMessage(1);
    })
