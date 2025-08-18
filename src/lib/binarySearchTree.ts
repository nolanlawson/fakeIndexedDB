import { Record } from "./types.js";
import cmp from "./cmp.js";
import FDBKeyRange from "../FDBKeyRange.js";

interface Node {
    record: Record;
    left: Node | undefined;
    right: Node | undefined;
    parent: Node | undefined;
    // actual number of records in the tree
    size: number;
    // total number of records including deleted tombstones
    maxSize: number;
    // deleted marker (tombstone)
    deleted: boolean;
}

type Comparator = (record: Record) => number;

// we can pick any value between 0.5 and 1, 2/3 seems common
const alpha = 2 / 3;

const everythingKeyRange = new FDBKeyRange(undefined, undefined, false, false);

// rebuild the whole tree from scratch, used by scapegoat trees for rebalancing instead of rotation
const rebuild = (
    records: Record[],
    parent: Node | undefined,
): Node | undefined => {
    const { length } = records;
    if (!length) {
        return undefined;
    }
    const mid = length >>> 1; // like Math.floor(records.length / 2) but fast

    const node: Node = {
        record: records[mid],
        left: undefined,
        right: undefined,
        parent,
        size: 0,
        maxSize: 0,
        deleted: false,
    };

    const left = rebuild(records.slice(0, mid), node);
    const right = rebuild(records.slice(mid + 1), node);
    const size = (left ? left.size : 0) + (right ? right.size : 0) + 1;

    node.left = left;
    node.right = right;
    node.size = node.maxSize = size;

    return node;
};

/**
 * Simple scapegoat binary tree, based on https://en.wikipedia.org/wiki/Scapegoat_tree
 */
export default class BinarySearchTree {
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
        return this._root ? this._root.size : 0;
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

    private _getByComparator(
        node: Node | undefined,
        comparator: Comparator,
    ): Record | undefined {
        let current = node;
        while (current) {
            const comparison = comparator(current.record);
            if (comparison < 0) {
                current = current.left;
            } else if (comparison > 0) {
                current = current.right;
            } else {
                return current.record;
            }
        }
    }

    put(record: Record): void {
        if (!this._root) {
            this._root = {
                record,
                left: undefined,
                right: undefined,
                parent: undefined,
                size: 1,
                maxSize: 1,
                deleted: false,
            };
            return;
        }
        const newNode = this._put(this._root, record);
        if (newNode) {
            this._incrementSizesAndRebuildIfNecessary(newNode);
        }
    }

    private _put(node: Node, record: Record): Node | undefined {
        const comparison = this._compare(record, node.record);
        if (comparison < 0) {
            if (node.left) {
                return this._put(node.left, record);
            } else {
                return (node.left = {
                    record,
                    left: undefined,
                    right: undefined,
                    parent: node,
                    size: 1,
                    maxSize: 1,
                    deleted: false,
                });
            }
        } else if (comparison > 0) {
            if (node.right) {
                return this._put(node.right, record);
            } else {
                return (node.right = {
                    record,
                    left: undefined,
                    right: undefined,
                    parent: node,
                    size: 1,
                    maxSize: 1,
                    deleted: false,
                });
            }
        } else if (node.deleted) {
            // undelete
            node.deleted = false;
            node.record = record;
            node.size++;
            node.maxSize++;
            return node;
        } else {
            // replace, don't add, so no need to increment. return undefined
            node.record = record;
        }
    }

    delete(record: Record): void {
        if (!this._root) {
            return;
        }
        this._delete(this._root, record);
        if (this._root.maxSize > 2 * this._root.size) {
            // if maxSize > (2 * size) then we have too many deletion tombstones and need to rebuild the entire tree
            this._root = rebuild(this.getAllRecords(), undefined);
        }
    }

    _delete(node: Node, record: Record): boolean {
        const comparison = this._compare(record, node.record);
        if (comparison < 0) {
            if (node.left && this._delete(node.left, record)) {
                node.size--;
                return true;
            }
        } else if (comparison > 0) {
            if (node.right && this._delete(node.right, record)) {
                node.size--;
                return true;
            }
        } else if (!node.deleted) {
            node.deleted = true;
            node.size--;
            return true;
        }
        return false;
    }

    getAllRecords(): Record[] {
        return this.getRecords(everythingKeyRange);
    }

    getRecords(keyRange: FDBKeyRange): Record[] {
        return this._getRecordsForNode(this._root, keyRange);
    }

    private _getRecordsForNode(node: Node | undefined, keyRange: FDBKeyRange) {
        if (!node) {
            return [];
        }
        const result: Record[] = [];
        this._findRecords(node, keyRange, result);
        return result;
    }

    private _findRecords(node: Node, keyRange: FDBKeyRange, result: Record[]) {
        const { lower, upper, lowerOpen, upperOpen } = keyRange;
        const {
            record: { key },
        } = node;

        const lowerComparison = lower === undefined ? -1 : cmp(lower, key);
        const upperComparison = upper === undefined ? 1 : cmp(upper, key);

        // if keys are non-unique then we need to go left/right even for equality
        const goLeft = this._keysAreUnique
            ? lowerComparison < 0
            : lowerComparison <= 0;
        const goRight = this._keysAreUnique
            ? upperComparison > 0
            : upperComparison >= 0;
        const lowerMatches = lowerOpen
            ? lowerComparison < 0
            : lowerComparison <= 0;
        const upperMatches = upperOpen
            ? upperComparison > 0
            : upperComparison >= 0;

        if (goLeft && node.left) {
            this._findRecords(node.left, keyRange, result);
        }

        if (lowerMatches && upperMatches && !node.deleted) {
            result.push(node.record);
        }

        if (goRight && node.right) {
            this._findRecords(node.right, keyRange, result);
        }
    }

    // when adding a new node, bump the sizes for the node and all ancestors
    _incrementSizesAndRebuildIfNecessary(newNode: Node): void {
        // depth is the number of _edges_ from the new node to the root
        let depth = 0;

        // increment all sizes and maxSizes
        let current: Node | undefined = newNode.parent;
        while (current) {
            depth++;
            current.size++;
            current.maxSize++;
            current = current.parent;
        }

        // this is the case where we need to find the scapegoat and rebuild the tree
        // we do so if the following height-balancing property does not hold:
        // > height(scapegoat tree) <= floor(log1/alpha(maxSize(tree))) + 1.
        if (depth > 1 + Math.floor(Math.log(1 / alpha) * this._root!.maxSize)) {
            let current: Node | undefined = newNode;
            let scapegoat: Node | undefined;
            while (current) {
                if (current.maxSize / current.parent!.maxSize > alpha) {
                    // mathematically there must be a scapegoat somewhere in the ancestor chain
                    scapegoat = current.parent!;
                    break;
                }
                current = current.parent;
            }

            const rebuiltNode = rebuild(
                this._getRecordsForNode(scapegoat, everythingKeyRange),
                scapegoat!.parent,
            );
            if (scapegoat === this._root) {
                this._root = rebuiltNode;
            } else if (scapegoat === scapegoat!.parent!.left) {
                scapegoat!.parent!.left = rebuiltNode;
            } else {
                // scapegoat === scapegoat.parent.right
                scapegoat!.parent!.right = rebuiltNode;
            }
        }
    }
}
