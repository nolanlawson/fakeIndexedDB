import { bench, do_not_optimize, run, summary } from "mitata";
import cmp from "../../build/esm/lib/cmp.js";
import { DataError } from "../../build/esm/lib/errors.js";
import valueToKey from "../../build/esm/lib/valueToKey.js";

const getTypeBaseline = (x) => {
    if (typeof x === "number") {
        return "Number";
    }
    if (Object.prototype.toString.call(x) === "[object Date]") {
        return "Date";
    }
    if (Array.isArray(x)) {
        return "Array";
    }
    if (typeof x === "string") {
        return "String";
    }
    if (x instanceof ArrayBuffer) {
        return "Binary";
    }
    throw new DataError();
};

// Baseline comparator matching cmp.ts before the recursive array fast path optimization.
const cmpBaseline = (first, second) => {
    if (second === undefined) {
        throw new TypeError();
    }

    first = valueToKey(first);
    second = valueToKey(second);

    const t1 = getTypeBaseline(first);
    const t2 = getTypeBaseline(second);

    if (t1 !== t2) {
        if (t1 === "Array") {
            return 1;
        }
        if (
            t1 === "Binary" &&
            (t2 === "String" || t2 === "Date" || t2 === "Number")
        ) {
            return 1;
        }
        if (t1 === "String" && (t2 === "Date" || t2 === "Number")) {
            return 1;
        }
        if (t1 === "Date" && t2 === "Number") {
            return 1;
        }
        return -1;
    }

    if (t1 === "Binary") {
        const firstBytes = new Uint8Array(first);
        const secondBytes = new Uint8Array(second);
        const length = Math.min(firstBytes.length, secondBytes.length);
        for (let i = 0; i < length; i++) {
            if (firstBytes[i] > secondBytes[i]) {
                return 1;
            }
            if (firstBytes[i] < secondBytes[i]) {
                return -1;
            }
        }

        if (firstBytes.length > secondBytes.length) {
            return 1;
        }
        if (firstBytes.length < secondBytes.length) {
            return -1;
        }
        return 0;
    }

    if (t1 === "Array") {
        const length = Math.min(first.length, second.length);
        for (let i = 0; i < length; i++) {
            const result = cmpBaseline(first[i], second[i]);
            if (result !== 0) {
                return result;
            }
        }

        if (first.length > second.length) {
            return 1;
        }
        if (first.length < second.length) {
            return -1;
        }
        return 0;
    }

    if (t1 === "Date") {
        if (first.getTime() === second.getTime()) {
            return 0;
        }
    } else if (first === second) {
        return 0;
    }

    return first > second ? 1 : -1;
};

const PAIR_COUNT = 128;
const WIDTH = 6;
const DEPTH = 4;

const buildNested = (seed, depth) => {
    if (depth === 0) {
        return seed & 0xffff;
    }

    const result = new Array(WIDTH);
    let x = seed | 0;
    for (let i = 0; i < WIDTH; i++) {
        x = (x * 1103515245 + 12345 + i) | 0;
        result[i] = buildNested(x, depth - 1);
    }

    return result;
};

const mutateLastLeaf = (input, delta) => {
    let current = input;
    for (let i = 0; i < DEPTH - 1; i++) {
        current = current[WIDTH - 1];
    }
    current[WIDTH - 1] += delta;
};

const pairs = Array.from({ length: PAIR_COUNT }, (_, i) => {
    const left = buildNested(i + 1, DEPTH);
    const right = structuredClone(left);

    if ((i & 1) === 1) {
        mutateLastLeaf(right, (i % 7) + 1);
    }

    return [left, right];
});

const compareBatch = (comparator) => {
    let total = 0;
    for (let i = 0; i < pairs.length; i++) {
        const [left, right] = pairs[i];
        total += comparator(left, right);
    }
    do_not_optimize(total);
};

summary(() => {
    bench("cmp baseline (nested array)", () => {
        compareBatch(cmpBaseline);
    });

    bench("cmp optimized (nested array)", () => {
        compareBatch(cmp);
    });
});

await run({ format: process.argv.includes("--json") ? "json" : "mitata" });
