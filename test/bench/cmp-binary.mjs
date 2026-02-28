import { bench, do_not_optimize, run, summary } from "mitata";
import * as mod from "../../build/esm/lib/cmp.js";
const { default: cmp, cmpBaseline } = mod;

const BYTE_LENGTH = 256;
const PAIR_COUNT = 256;

const buildBuffer = (seed) => {
    const bytes = new Uint8Array(BYTE_LENGTH);
    let x = seed | 0;

    for (let i = 0; i < BYTE_LENGTH; i++) {
        x = (x * 1664525 + 1013904223) | 0;
        bytes[i] = x & 255;
    }

    return bytes;
};

const pairs = Array.from({ length: PAIR_COUNT }, (_, i) => {
    const left = buildBuffer(i + 1);
    const right = buildBuffer(i + 100_000);
    if ((i & 3) === 0) {
        right.set(left);
    } else {
        right[(i * 37) % BYTE_LENGTH] ^= (i & 31) + 1;
    }
    return [left.buffer, right.buffer];
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
    bench("cmp baseline (binary)", () => {
        compareBatch(cmpBaseline);
    });

    bench("cmp optimized (binary)", () => {
        compareBatch(cmp);
    });
});

await run({ format: process.argv.includes("--json") ? "json" : "mitata" });
