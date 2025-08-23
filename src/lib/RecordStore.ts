import FDBKeyRange from "../FDBKeyRange.js";
import cmp from "./cmp.js";
import { FDBCursorDirection, Key, Record } from "./types.js";
import BinarySearchTree from "./binarySearchTree.js";

class RecordStore {
    private records: BinarySearchTree;

    constructor(keysAreUnique: boolean) {
        this.records = new BinarySearchTree(keysAreUnique);
    }

    public get(key: Key | FDBKeyRange) {
        const range = key instanceof FDBKeyRange ? key : FDBKeyRange.only(key);
        return [...this.records.getRecords(range)][0];
    }

    public add(newRecord: Record) {
        this.records.put(newRecord);
    }

    public delete(key: Key | FDBKeyRange) {
        const range = key instanceof FDBKeyRange ? key : FDBKeyRange.only(key);

        const deletedRecords = [...this.records.getRecords(range)];

        for (const record of deletedRecords) {
            this.records.delete(record);
        }

        return deletedRecords;
    }

    public deleteByValue(key: Key | FDBKeyRange) {
        const range = key instanceof FDBKeyRange ? key : FDBKeyRange.only(key);

        const deletedRecords: Record[] = [
            ...this.records.getAllRecords(),
        ].filter((record) => {
            return range.includes(record.value);
        });

        for (const record of deletedRecords) {
            this.records.delete(record);
        }

        return deletedRecords;
    }

    public clear() {
        const deletedRecords = [...this.records.getAllRecords()];
        this.records = new BinarySearchTree();
        return deletedRecords;
    }

    public values(range?: FDBKeyRange, direction: FDBCursorDirection = "next") {
        const descending = direction === "prev" || direction === "prevunique";
        const records = range
            ? this.records.getRecords(range, descending)
            : this.records.getAllRecords(descending);

        return {
            [Symbol.iterator]: () => {
                const next = () => {
                    return records.next();
                };

                if (direction === "next" || direction === "prev") {
                    return { next };
                }

                // For nextunique/prevunique, return an iterator that skips seen values
                // Note that we must return the _lowest_ value regardless of direction:
                // > Iterating with "prevunique" visits the same records that "nextunique"
                // > visits, but in reverse order.
                // https://w3c.github.io/IndexedDB/#dom-idbcursordirection-prevunique
                if (direction === "nextunique") {
                    let previousValue: Record | undefined = undefined;
                    return {
                        next: (): IteratorResult<Record> => {
                            let current: IteratorResult<Record> | undefined;
                            while (!(current = next()).done) {
                                // for nextunique, continue if we already emitted the lowest unique value
                                if (
                                    previousValue !== undefined &&
                                    cmp(
                                        previousValue.key,
                                        current.value.key,
                                    ) === 0
                                ) {
                                    continue;
                                }
                                previousValue = current.value;
                                return current;
                            }
                            return current;
                        },
                    };
                }

                // prevunique is a bit more complex due to needing to check the next value, which
                // invokes the iterable, so we need to keep a buffer of one "lookahead" result
                let current = next();
                let nextResult = next();

                return {
                    next: (): IteratorResult<Record> => {
                        // for prevunique, we need to check if the next value will be different,
                        // since we're trying to return the lowest unique value
                        while (
                            !nextResult.done &&
                            cmp(current.value.key, nextResult.value.key) === 0
                        ) {
                            current = nextResult;
                            nextResult = next();
                        }
                        const result = current;
                        current = nextResult;
                        nextResult = next();
                        return result;
                    },
                };
            },
        };
    }
}

export default RecordStore;
