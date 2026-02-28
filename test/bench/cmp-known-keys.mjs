import { bench, do_not_optimize, run, summary } from "mitata";
import cmp, { cmpKeys } from "../../build/esm/lib/cmp.js";
import FDBKeyRange from "../../build/esm/FDBKeyRange.js";
import valueToKey from "../../build/esm/lib/valueToKey.js";

const BYTE_LENGTH = 256;
const KEY_COUNT = 512;

const makeBinaryKey = (seed) => {
    const bytes = new Uint8Array(BYTE_LENGTH);
    let x = seed | 0;
    for (let i = 0; i < BYTE_LENGTH; i++) {
        x = (x * 1664525 + 1013904223) | 0;
        bytes[i] = x & 255;
    }
    return bytes.buffer;
};

const inputKeys = Array.from({ length: KEY_COUNT }, (_, i) =>
    makeBinaryKey(i + 1),
);
const normalizedKeys = inputKeys.map((key) => valueToKey(key));
const sortedKeys = [...normalizedKeys].sort((a, b) => cmpKeys(a, b));
const range = FDBKeyRange.bound(sortedKeys[120], sortedKeys[390]);

const includesBaseline = (keyRange, key) => {
    key = valueToKey(key);

    if (keyRange.lower !== undefined) {
        const cmpResult = cmp(keyRange.lower, key);
        if (cmpResult === 1 || (cmpResult === 0 && keyRange.lowerOpen)) {
            return false;
        }
    }
    if (keyRange.upper !== undefined) {
        const cmpResult = cmp(keyRange.upper, key);
        if (cmpResult === -1 || (cmpResult === 0 && keyRange.upperOpen)) {
            return false;
        }
    }

    return true;
};

const compareBatchBaseline = () => {
    let total = 0;
    for (let i = 0; i < sortedKeys.length - 1; i++) {
        total += cmp(sortedKeys[i], sortedKeys[i + 1]);
    }
    do_not_optimize(total);
};

const compareBatchOptimized = () => {
    let total = 0;
    for (let i = 0; i < sortedKeys.length - 1; i++) {
        total += cmpKeys(sortedKeys[i], sortedKeys[i + 1]);
    }
    do_not_optimize(total);
};

const includesBatchBaseline = () => {
    let count = 0;
    for (let i = 0; i < sortedKeys.length; i++) {
        if (includesBaseline(range, sortedKeys[i])) {
            count++;
        }
    }
    do_not_optimize(count);
};

const includesBatchOptimized = () => {
    let count = 0;
    for (let i = 0; i < sortedKeys.length; i++) {
        if (range.includes(sortedKeys[i])) {
            count++;
        }
    }
    do_not_optimize(count);
};

summary(() => {
    bench("cmp baseline (known binary keys)", compareBatchBaseline);
    bench("cmp optimized (known binary keys)", compareBatchOptimized);
});

summary(() => {
    bench("keyrange.includes baseline (binary)", includesBatchBaseline);
    bench("keyrange.includes optimized (binary)", includesBatchOptimized);
});

await run({ format: process.argv.includes("--json") ? "json" : "mitata" });
