import "../wpt-env.js";

let cursor,db,result,store,value;

import "./resources/support.js";



function load_iframe() {
    return new Promise(resolve => {
        const iframe = document.createElement('iframe');
        iframe.onload = () => { resolve(iframe); };
        document.documentElement.appendChild(iframe);
    });
}

promise_test(async t => {
    const iframe = await load_iframe();
    const dbname = location + '-' + t.name;
    const openRequest = iframe.contentWindow.indexedDB.open(dbname);
    assert_equals(openRequest.readyState, 'pending');
    iframe.remove();
    assert_equals(typeof openRequest.readyState, 'string');
}, 'readyState accessor is valid after execution context is destroyed');

