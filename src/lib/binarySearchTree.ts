import { Record } from "./types.js";
import cmp from "./cmp.js";
import FDBKeyRange from "../FDBKeyRange.js";

interface Node {
    record: Record;
    // actual number of records in the tree
    size: number;
    // total number of records including deleted tombstones
    maxSize: number;
    left: Node | undefined;
    right: Node | undefined;
    deleted: boolean;
}

type Comparator = (record: Record) => number;

const rebuild = (records: Record[]): Node | undefined => {
    const { length } = records;
    if (!length) {
        return undefined;
    }
    const mid = length >>> 1; // like Math.floor(records.length / 2) but fast
    const left = rebuild(records.slice(0, mid));
    const right = rebuild(records.slice(mid + 1));
    const size = (left ? left.size : 0) + (right ? right.size : 0) + 1;

    return {
        record: records[mid],
        size,
        maxSize: size,
        left,
        right,
        deleted: false,
    };
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
                size: 1,
                maxSize: 1,
                deleted: false,
                left: undefined,
                right: undefined,
            };
            return;
        }
        this._put(this._root, record);
    }

    private _put(node: Node, record: Record): boolean {
        const comparison = this._compare(record, node.record);
        if (comparison < 0) {
            if (node.left) {
                if (this._put(node.left, record)) {
                    node.size++;
                    node.maxSize++;
                    return true;
                }
            } else {
                node.left = {
                    record,
                    size: 1,
                    maxSize: 1,
                    deleted: false,
                    left: undefined,
                    right: undefined,
                };
                node.size++;
                node.maxSize++;
                return true;
            }
        } else if (comparison > 0) {
            if (node.right) {
                if (this._put(node.right, record)) {
                    node.size++;
                    node.maxSize++;
                    return true;
                }
            } else {
                node.right = {
                    record,
                    size: 1,
                    maxSize: 1,
                    deleted: false,
                    left: undefined,
                    right: undefined,
                };
                node.size++;
                node.maxSize++;
                return true;
            }
        } else if (node.deleted) {
            // undelete
            node.deleted = false;
            node.record = record;
            node.size++;
            node.maxSize++;
            return true;
        } else {
            // replace, don't add, so no increment
            node.record = record;
        }
        return false;
    }

    delete(record: Record): void {
        if (!this._root) {
            return;
        }
        this._delete(this._root, record);
        if (this._root.maxSize > 2 * this._root.size) {
            // if maxSize > (2 * size) then we have too many deletion tombstones and need to rebuild the entire tree
            this._root = rebuild(this.getAllRecords());
        }
    }

    _delete(node: Node, record: Record): boolean {
        const comparison = this._compare(record, node.record);
        if (comparison < 0) {
            if (node.left) {
                if (this._delete(node.left, record)) {
                    node.size--;
                    return true;
                }
            }
        } else if (comparison > 0) {
            if (node.right) {
                if (this._delete(node.right, record)) {
                    node.size--;
                    return true;
                }
            }
        } else if (!node.deleted) {
            node.deleted = true;
            node.size--;
            return true;
        }
        return false;
    }

    getAllRecords(): Record[] {
        return this.getRecords(
            new FDBKeyRange(undefined, undefined, false, false),
        );
    }

    getRecords(keyRange: FDBKeyRange): Record[] {
        if (!this._root) {
            return [];
        }
        const result: Record[] = [];
        this._getRecords(this._root, keyRange, result);
        return result;
    }

    private _getRecords(node: Node, keyRange: FDBKeyRange, result: Record[]) {
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
            this._getRecords(node.left, keyRange, result);
        }

        if (lowerMatches && upperMatches && !node.deleted) {
            result.push(node.record);
        }

        if (goRight && node.right) {
            this._getRecords(node.right, keyRange, result);
        }
    }
}
