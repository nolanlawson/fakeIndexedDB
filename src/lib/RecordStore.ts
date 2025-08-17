import FDBKeyRange from "../FDBKeyRange.js";
import cmp from "./cmp.js";
import { FDBCursorDirection, Key, Record } from "./types.js";
import RedBlackTree from "./redBlackTree.js";

class RecordStore {
    private records: RedBlackTree;

    constructor(keysAreUnique: boolean) {
        this.records = new RedBlackTree(keysAreUnique);
    }

    public get(key: Key | FDBKeyRange) {
        const range = key instanceof FDBKeyRange ? key : FDBKeyRange.only(key);
        return this.records.getRecords(range)[0];
    }

    public add(newRecord: Record) {
        this.records.put(newRecord);
    }

    public delete(key: Key | FDBKeyRange) {
        const range = key instanceof FDBKeyRange ? key : FDBKeyRange.only(key);

        const deletedRecords = this.records.getRecords(range);

        for (const record of deletedRecords) {
            this.records.delete(record);
        }

        return deletedRecords;
    }

    public deleteByValue(key: Key | FDBKeyRange) {
        const range = key instanceof FDBKeyRange ? key : FDBKeyRange.only(key);

        const deletedRecords: Record[] = this.records
            .getAllRecords()
            .filter((record) => {
                return range.includes(record.value);
            });

        for (const record of deletedRecords) {
            this.records.delete(record);
        }

        return deletedRecords;
    }

    public clear() {
        const deletedRecords = this.records.getAllRecords();
        this.records = new RedBlackTree();
        return deletedRecords;
    }

    public values(range?: FDBKeyRange, direction: FDBCursorDirection = "next") {
        const records = range
            ? this.records.getRecords(range)
            : this.records.getAllRecords();

        if (direction === "prev" || direction === "prevunique") {
            records.reverse();
        }

        return {
            [Symbol.iterator]: () => {
                let i = 0;

                const next = () => {
                    const done = i >= records.length;
                    const value = done ? undefined : records[i];

                    i++;

                    // The weird "as IteratorResult<Record>" is needed because of
                    // https://github.com/Microsoft/TypeScript/issues/11375 and
                    // https://github.com/Microsoft/TypeScript/issues/2983
                    return {
                        done,
                        value,
                    } as IteratorResult<Record>;
                };

                if (direction === "next" || direction === "prev") {
                    return { next };
                }

                // peek at the next value without incrementing the iterator
                const peek = () => {
                    const iOriginal = i;
                    const result = next();
                    i = iOriginal;
                    return result;
                };

                // For nextunique/prevunique, return an iterator that skips seen values
                // Note that we must resturn the _lowest_ value regardless of direction:
                // > Iterating with "prevunique" visits the same records that "nextunique"
                // > visits, but in reverse order.
                // https://w3c.github.io/IndexedDB/#dom-idbcursordirection-prevunique
                let prevValue: Record | undefined = undefined;
                return {
                    next: (): IteratorResult<Record> => {
                        let current: IteratorResult<Record>;
                        while (!(current = next()).done) {
                            const { done, value } = current;
                            if (direction === "nextunique") {
                                // for nextunique, continue if we already emitted the lowest unique value
                                if (
                                    prevValue !== undefined &&
                                    cmp(prevValue.key, value.key) === 0
                                ) {
                                    continue;
                                }
                            } else {
                                // for prevunique, we need to peek to see if the next value will be different,
                                // since we're trying to return the lowest unique value
                                const { value: nextValue, done: nextDone } =
                                    peek();
                                if (
                                    !nextDone &&
                                    cmp(nextValue.key, value.key) === 0
                                ) {
                                    continue;
                                }
                            }
                            prevValue = value;
                            return {
                                value,
                                done,
                            };
                        }
                        return {
                            value: undefined,
                            done: true,
                        };
                    },
                };
            },
        };
    }
}

export default RecordStore;
