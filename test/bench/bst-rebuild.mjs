import { bench, do_not_optimize, run, summary } from "mitata";

const RECORD_COUNT = 16384;

const records = Array.from({ length: RECORD_COUNT }, (_, i) => ({
    key: i,
    value: i,
}));

const rebuildBaseline = (input, parent, red) => {
    const { length } = input;
    if (!length) {
        return undefined;
    }

    const mid = length >>> 1;
    const node = {
        record: input[mid],
        left: undefined,
        right: undefined,
        parent,
        deleted: false,
        red,
    };

    node.left = rebuildBaseline(input.slice(0, mid), node, !red);
    node.right = rebuildBaseline(input.slice(mid + 1), node, !red);

    return node;
};

const rebuildOptimized = (
    input,
    parent,
    red,
    startIndex = 0,
    endIndex = input.length,
) => {
    const length = endIndex - startIndex;
    if (length <= 0) {
        return undefined;
    }

    const mid = startIndex + (length >>> 1);
    const node = {
        record: input[mid],
        left: undefined,
        right: undefined,
        parent,
        deleted: false,
        red,
    };

    node.left = rebuildOptimized(input, node, !red, startIndex, mid);
    node.right = rebuildOptimized(input, node, !red, mid + 1, endIndex);

    return node;
};

const countNodes = (root) => {
    if (!root) {
        return 0;
    }

    let count = 0;
    const stack = [root];
    while (stack.length > 0) {
        const current = stack.pop();
        count++;
        if (current.left) {
            stack.push(current.left);
        }
        if (current.right) {
            stack.push(current.right);
        }
    }
    return count;
};

const rebuildAndCount = (fn) => {
    const root = fn(records, undefined, false);
    do_not_optimize(countNodes(root));
};

summary(() => {
    bench("bst rebuild baseline (slice)", () => {
        rebuildAndCount(rebuildBaseline);
    });

    bench("bst rebuild optimized (index)", () => {
        rebuildAndCount(rebuildOptimized);
    });
});

await run({ format: process.argv.includes("--json") ? "json" : "mitata" });
