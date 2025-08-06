These tests come from [web-platform-tests](https://github.com/w3c/web-platform-tests/tree/master/IndexedDB), last copied in March 2024 from commit [`7b41322d9e9a323bb9c890747d28f93258cca889`](https://github.com/web-platform-tests/wpt/commit/7b41322d9e9a323bb9c890747d28f93258cca889).

To update the tests, copy over the `IndexedDB` folder and remove `converted`:

```sh
rm -fr path/to/fakeIndexedDB/src/test/web-platform-tests/IndexedDB
cp -R path/to/wpt/IndexedDB path/to/fakeIndexedDB/src/test/web-platform-tests/IndexedDB
rm -fr path/to/fakeIndexedDB/src/test/web-platform-tests/converted
```

Then run the `convert.js` script:

```sh
node src/test/web-platform-tests/convert.js
```

Assuming nothing substantial has changed in the structure of the tests, that should be all you have to do.

Tests can be ignored by modifying the list in `run-all.js`. Files can be skipped during conversion by modifying `convert.js`.