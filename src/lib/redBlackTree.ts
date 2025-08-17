import { Record } from "./types.js";
import cmp from "./cmp.js";
import FDBKeyRange from "../FDBKeyRange.js";

interface Node {
    record: Record;
    size: number;
    left: Node | undefined;
    right: Node | undefined;
}

type Comparator = (record: Record) => number;

/**
 * Simple scapegoat binary tree, based on https://en.wikipedia.org/wiki/Scapegoat_tree
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

    size(node: Node | undefined): number {}

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
    ): Record | undefined {}

    put(record: Record): void {}

    private _put(h: Node | undefined, record: Record): Node {}

    delete(record: Record): void {}

    _delete(h: Node, record: Record): Node | undefined {}

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

    private _getRecords(
        x: Node | undefined,
        queue: Record[],
        keyRange: FDBKeyRange,
    ) {}
}
