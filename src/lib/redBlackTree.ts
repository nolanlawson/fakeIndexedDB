import { Record } from "./types.js";
import cmp from "./cmp.js";
import FDBKeyRange from "../FDBKeyRange.js";

const RED = true;
const BLACK = false;

interface Node {
    record: Record;
    color: boolean;
    size: number;
    left: Node | undefined;
    right: Node | undefined;
}

type RedNode = Node & { color: typeof RED };
type NodeWithLeft = Node & { left: Node };
type NodeWithRight = Node & { right: Node };
type NodeWithBoth = NodeWithLeft & NodeWithRight;
type Comparator = (record: Record) => number;

const isRed = (x: Node | undefined): x is RedNode => {
    return x ? x.color === RED : false;
};

const size = (x: Node | undefined): number => {
    return x ? x.size : 0;
};

const hasRedLeft = (x: Node): x is NodeWithLeft => {
    return isRed(x.left);
};

const hasRedRight = (x: Node): x is NodeWithRight => {
    return isRed(x.right);
};

// make a left-leaning link lean to the right
const rotateRight = (h: NodeWithLeft): NodeWithRight => {
    const x = h.left;
    (h as Node).left = x.right;
    x.right = h;
    x.color = h.color;
    h.color = RED;
    x.size = h.size;
    h.size = size(h.left) + size(h.right) + 1;
    return x as NodeWithRight;
};

// make a right-leaning link lean to the left
const rotateLeft = (h: NodeWithRight): NodeWithLeft => {
    const x = h.right;
    (h as Node).right = x.left;
    x.left = h;
    x.color = h.color;
    h.color = RED;
    x.size = h.size;
    h.size = size(h.left) + size(h.right) + 1;
    return x as NodeWithLeft;
};

// flip the colors of a node and its two children
const flipColors = (h: NodeWithBoth): void => {
    // h must have opposite color of its two children
    h.color = !h.color;
    h.left.color = !h.left.color;
    h.right.color = !h.right.color;
};

// Assuming that h is red and both h.left and h.left.left
// are black, make h.left or one of its children red.
const moveRedLeft = (h: NodeWithBoth): NodeWithLeft => {
    flipColors(h);
    if (hasRedLeft(h.right)) {
        h.right = rotateRight(h.right);
        const x = rotateLeft(h);
        flipColors(x as NodeWithBoth);
        return x;
    }
    return h;
};

// Assuming that h is red and both h.right and h.right.left
// are black, make h.right or one of its children red.
const moveRedRight = (h: NodeWithBoth): NodeWithRight => {
    flipColors(h);
    if (hasRedLeft(h.left)) {
        const x = rotateRight(h);
        flipColors(x as NodeWithBoth);
        return x;
    }
    return h;
};

// restore red-black tree invariant
const balance = (h: Node): Node => {
    if (hasRedRight(h) && !hasRedLeft(h)) {
        h = rotateLeft(h);
    }
    if (hasRedLeft(h) && hasRedLeft(h.left)) {
        h = rotateRight(h);
    }
    if (hasRedLeft(h) && hasRedRight(h)) {
        flipColors(h);
    }

    h.size = size(h.left) + size(h.right) + 1;
    return h;
};

/**
 * Left-leaning red-black binary search tree. The goals here are:
 *
 *   1. simplicity of implementation
 *   2. O(log(n)) complexity for search/add/delete
 *
 * Based on Robert Sedgewick's and Kevin Wayne's Java implementation:
 *   - https://sedgewick.io/wp-content/themes/sedgewick/papers/2008LLRB.pdf
 *   - https://algs4.cs.princeton.edu/33balanced/RedBlackBST.java.html
 */
export default class RedBlackTree {
    private _root: Node | undefined;
    private readonly _keysAreUnique: boolean;

    /**
     *
     * @param keysAreUnique - whether keys can be unique, and thus whether we cn skip checking `record.value` when
     * comparing. This is basically used to distinguish ObjectStores (where the value is the entire object, not used
     * as a key) from non-unique Indexes (where both the key and the value are meaningful keys used for sorting)
     */
    constructor(keysAreUnique?: boolean) {
        this._keysAreUnique = !!keysAreUnique;
    }

    size(): number {
        return size(this._root);
    }

    get(record: Record): Record | undefined {
        return this._getByComparator(this._root, (otherRecord) =>
            this._compare(record, otherRecord),
        );
    }

    contains(record: Record): boolean {
        return !!this.get(record);
    }

    private _compare(a: Record, b: Record): number {
        const keyComparison = cmp(a.key, b.key);
        if (keyComparison !== 0) {
            return keyComparison;
        }
        // if keys are unique, then we can (and must) avoid comparing the values, since they may be non-comparable
        // (e.g. in the case of an ObjectStore)
        return this._keysAreUnique ? 0 : cmp(a.value, b.value);
    }

    // value associated with the given key in subtree rooted at x; null if no such key
    private _getByComparator(
        x: Node | undefined,
        comparator: Comparator,
    ): Record | undefined {
        while (x) {
            const comparison = comparator(x.record);
            if (comparison < 0) {
                x = x.left;
            } else if (comparison > 0) {
                x = x.right;
            } else {
                return x.record;
            }
        }
        return undefined;
    }

    put(record: Record): void {
        this._root = this._put(this._root, record);
        this._root.color = BLACK;
    }

    private _put(h: Node | undefined, record: Record): Node {
        if (!h) {
            return {
                record,
                color: RED,
                size: 1,
                left: undefined,
                right: undefined,
            };
        }

        const comparison = this._compare(record, h.record);
        if (comparison < 0) {
            h.left = this._put(h.left, record);
        } else if (comparison > 0) {
            h.right = this._put(h.right, record);
        } else {
            h.record = record;
        }

        // fix-up any right-leaning links
        return balance(h);
    }

    // delete the key-value pair with the minimum key rooted at h
    private _deleteMin(h: Node): Node | undefined {
        if (!h.left) {
            return undefined;
        }

        if (!hasRedLeft(h) && !hasRedLeft(h.left)) {
            h = moveRedLeft(h as NodeWithBoth);
        }

        h.left = this._deleteMin((h as NodeWithLeft).left);
        return balance(h);
    }

    delete(record: Record): void {
        if (!this._root || !this.contains(record)) {
            return;
        }

        // if both children of root are black, set root to red
        if (!hasRedLeft(this._root) && !hasRedRight(this._root)) {
            this._root.color = RED;
        }

        this._root = this._delete(this._root, record);
        if (this._root) {
            this._root.color = BLACK;
        }
    }

    // delete the key-value pair with the given key rooted at h
    _delete(h: Node, record: Record): Node | undefined {
        if (this._compare(record, h.record) < 0) {
            if (!hasRedLeft(h) && !hasRedLeft((h as NodeWithLeft).left)) {
                h = moveRedLeft(h as NodeWithBoth);
            }
            h.left = this._delete((h as NodeWithLeft).left, record);
        } else {
            if (hasRedLeft(h)) {
                h = rotateRight(h);
            }
            if (this._compare(record, h.record) == 0 && !h.right) {
                return undefined;
            }
            if (!hasRedRight(h) && !hasRedLeft((h as NodeWithRight).right)) {
                h = moveRedRight(h as NodeWithBoth);
            }
            if (this._compare(record, h.record) == 0) {
                const x = this._min((h as NodeWithRight).right);
                h.record = x.record;
                h.right = this._deleteMin((h as NodeWithRight).right);
            } else {
                h.right = this._delete((h as NodeWithRight).right, record);
            }
        }
        return balance(h);
    }

    // the smallest key in subtree rooted at x; null if no such key
    private _min(x: Node): Node {
        if (!x.left) {
            return x;
        } else {
            return this._min(x.left);
        }
    }

    getAllRecords(): Record[] {
        return this.getRecords(
            new FDBKeyRange(undefined, undefined, false, false),
        );
    }

    getRecords(keyRange: FDBKeyRange): Record[] {
        const queue: Record[] = [];
        this._getRecords(this._root, queue, keyRange);
        return queue;
    }

    // add the keys between lo and hi in the subtree rooted at x
    // to the queue
    private _getRecords(
        x: Node | undefined,
        queue: Record[],
        keyRange: FDBKeyRange,
    ) {
        if (!x) {
            return;
        }
        const { lower, upper, lowerOpen, upperOpen } = keyRange;

        const cmpLo = lower === undefined ? -1 : cmp(lower, x.record.key);
        const cmpHi = upper === undefined ? 1 : cmp(upper, x.record.key);

        // If the keys are non-unique then we could have duplicate keys so need to go left even on equality
        const goLeft = this._keysAreUnique ? cmpLo < 0 : cmpLo <= 0;
        if (goLeft) {
            this._getRecords(x.left, queue, keyRange);
        }

        const shouldPush =
            (lowerOpen ? cmpLo < 0 : cmpLo <= 0) &&
            (upperOpen ? cmpHi > 0 : cmpHi >= 0);
        if (shouldPush) {
            // don't add records if it's an exact match and lowerOpen/upperOpen tells us to skip exact matches
            queue.push(x.record);
        }

        // If the keys are non-unique then we could have duplicate keys so need to go right even on equality
        const goRight = this._keysAreUnique ? cmpHi > 0 : cmpHi >= 0;
        if (goRight) {
            this._getRecords(x.right, queue, keyRange);
        }
    }
}
