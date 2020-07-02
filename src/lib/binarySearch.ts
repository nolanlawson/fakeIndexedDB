import cmp from "./cmp";
import { Key, Record } from "./types";

// Classic binary search implementation. Returns the index where the key
// should be inserted, assuming the records list is ordered.
function binarySearch(records: Record[], key: Key) {
    let low = 0;
    let high = records.length;
    let mid;
    while (low < high) {
        // tslint:disable-next-line:no-bitwise
        mid = (low + high) >>> 1; // like Math.floor((low + high) / 2) but fast
        if (cmp(records[mid].key, key) < 0) {
            low = mid + 1;
        } else {
            high = mid;
        }
    }
    return low;
}

// Assuming the array is properly ordered by key/value, do the equivalent
// of `this.records.find(record => cmp(record.key, key) === 0)`
// but using a fast binary search.
export function binarySearchByKey(records: Record[], key: Key) {
    const idx = binarySearch(records, key);
    const record = records[idx];
    if (record && cmp(record.key, key) === 0) {
        return record;
    }
}
