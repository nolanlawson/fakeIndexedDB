import { Record } from "./types.js";
import cmp from "./cmp.js";
import FDBKeyRange from "../FDBKeyRange.js";

interface Node {
    record: Record;
    size: number;
    left: Node | undefined;
    right: Node | undefined;
    deleted: boolean;
}

type Comparator = (record: Record) => number;

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
                    return true;
                }
            } else {
                node.left = {
                    record,
                    size: 1,
                    deleted: false,
                    left: undefined,
                    right: undefined,
                };
                node.size++;
                return true;
            }
        } else if (comparison > 0) {
            if (node.right) {
                if (this._put(node.right, record)) {
                    node.size++;
                    return true;
                }
            } else {
                node.right = {
                    record,
                    size: 1,
                    deleted: false,
                    left: undefined,
                    right: undefined,
                };
                node.size++;
                return true;
            }
        } else if (node.deleted) {
            // undelete
            node.deleted = false;
            node.record = record;
            node.size++;
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
        this._getRecords(this._root, result, keyRange);
        return result;
    }

    private _getRecords(node: Node, result: Record[], keyRange: FDBKeyRange) {
        const goLeft =
            keyRange.lower === undefined ||
            cmp(keyRange.lower, node.record.key) <= 0;
        const goRight =
            keyRange.upper === undefined ||
            cmp(keyRange.upper, node.record.key) >= 0;

        if (goLeft && node.left) {
            this._getRecords(node.left, result, keyRange);
        }

        const lowerMatches =
            keyRange.lower === undefined ||
            (keyRange.lowerOpen
                ? cmp(keyRange.lower, node.record.key) < 0
                : cmp(keyRange.lower, node.record.key) <= 0);
        const upperMatches =
            keyRange.upper === undefined ||
            (keyRange.upperOpen
                ? cmp(keyRange.upper, node.record.key) > 0
                : cmp(keyRange.upper, node.record.key) >= 0);

        if (lowerMatches && upperMatches && !node.deleted) {
            result.push(node.record);
        }

        if (goRight && node.right) {
            this._getRecords(node.right, result, keyRange);
        }
    }
}
