import { Record } from "./types.js";
import cmp from "./cmp.js";
import FDBKeyRange from "../FDBKeyRange.js";

interface Node {
    record: Record;
    left: Node | undefined;
    right: Node | undefined;
    parent: Node | undefined;
    // deleted marker (tombstone)
    deleted: boolean;
    // black (false) or red (true)
    red: boolean;
}

type Comparator = (record: Record) => number;

const everythingKeyRange = new FDBKeyRange(undefined, undefined, false, false);

const isRightChild = (node: Node) => node === node.parent!.right;

/**
 * Simple scapegoat binary tree, based on https://en.wikipedia.org/wiki/Scapegoat_tree
 */
export default class BinarySearchTree {
    private _root: Node | undefined;
    private readonly _keysAreUnique: boolean;
    private _size = 0;

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
        return this._size;
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
                deleted: false,
                // the root is always black in a red-black tree
                red: false,
            };
            this._size++;
            return;
        }
        const newNode = this._put(this._root, record);
        if (newNode) {
            this._size++;

            // if newNode === this._root then we merely undeleted the root, and no rebalancing is needed
            if (newNode !== this._root) {
                this._rebalanceTree(newNode);
            }
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
                    deleted: false,
                    red: true,
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
                    deleted: false,
                    red: true,
                });
            }
        } else if (node.deleted) {
            // undelete
            node.deleted = false;
            node.record = record;
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
        if (this._delete(this._root, record)) {
            this._size--;
        }
    }

    _delete(node: Node, record: Record): boolean {
        const comparison = this._compare(record, node.record);
        if (comparison < 0) {
            if (node.left && this._delete(node.left, record)) {
                return true;
            }
        } else if (comparison > 0) {
            if (node.right && this._delete(node.right, record)) {
                return true;
            }
        } else if (!node.deleted) {
            node.deleted = true;
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

    _rebalanceTree(node: Node) {
        let parent = node.parent!;
        do {
            // case 1 -  no red/black violation
            if (!parent.red) {
                return;
            }
            const grandparent = parent.parent;

            if (!grandparent) {
                // case #4 - parent is the red root, n is also red, so parent goes black
                parent.red = false;
                return;
            }

            const parentIsRightChild = isRightChild(parent);
            const uncle = parentIsRightChild
                ? grandparent.left
                : grandparent.right;
            if (!uncle || !uncle.red) {
                if (
                    node === (parentIsRightChild ? parent.left : parent.right)
                ) {
                    // case #5 - parent is red but uncle is black
                    this._rotateSubtree(parent, parentIsRightChild);
                    node = parent;
                    parent = parentIsRightChild
                        ? grandparent.right!
                        : grandparent.left!;
                }

                // case #6 - node is "outer" grandchild of grandparent
                this._rotateSubtree(grandparent, !parentIsRightChild);
                parent.red = false;
                grandparent.red = true;
                return;
            }

            // case #2 - parent and uncle are both red, so both of them go black and grandparent goes red
            parent.red = false;
            uncle.red = false;
            grandparent.red = true;
            node = grandparent;
        } while (node.parent ? (parent = node.parent) : false);

        // case #3 - current node is the root, all constraints satisfied
    }

    // based on https://en.wikipedia.org/wiki/Red%E2%80%93black_tree#Implementation
    _rotateSubtree(node: Node, right: boolean) {
        const parent = node.parent!;
        const newRoot = right ? node.left! : node.right!; // opposite direction
        const newChild = right ? newRoot.right : newRoot.left;

        node[right ? "left" : "right"] = newChild;

        if (newChild) {
            newChild.parent = node;
        }

        newRoot[right ? "right" : "left"] = node;

        newRoot.parent = parent;
        node.parent = newRoot;
        if (parent) {
            parent[node === parent.right ? "right" : "left"] = newRoot;
        } else {
            this._root = newRoot;
        }
        return newRoot;
    }
}
