import * as assert from "assert";
import RedBlackTree from "../../lib/redBlackTree.js";
import FDBKeyRange from "../../FDBKeyRange.js";

describe("redBlackTree", () => {
    it("works for basic insertion and retrieval", () => {
        const tree = new RedBlackTree();
        assert.equal(tree.size(), 0);
        tree.put({ key: "b", value: "b" });
        assert.equal(tree.size(), 1);
        tree.put({ key: "a", value: "a" });
        assert.equal(tree.size(), 2);
        tree.put({ key: "c", value: "c" });
        assert.equal(tree.size(), 3);
        assert.deepStrictEqual(tree.getAllRecords(), [
            { key: "a", value: "a" },
            { key: "b", value: "b" },
            { key: "c", value: "c" },
        ]);
    });

    it("overwrites duplicate key/value pairs", () => {
        const tree = new RedBlackTree();
        tree.put({ key: "a", value: "a" });
        tree.put({ key: "a", value: "a" });
        tree.put({ key: "b", value: "x" });
        tree.put({ key: "b", value: "y" });
        tree.put({ key: "c", value: "c" });
        tree.put({ key: "a", value: "a" });
        assert.equal(tree.size(), 4);
        assert.deepStrictEqual(tree.getAllRecords(), [
            { key: "a", value: "a" },
            { key: "b", value: "x" },
            { key: "b", value: "y" },
            { key: "c", value: "c" },
        ]);
    });

    it("works for deletions", () => {
        const tree = new RedBlackTree();
        tree.put({ key: "a", value: "a" });
        tree.put({ key: "b", value: "b" });
        tree.put({ key: "c", value: "c" });

        tree.delete({ key: "b", value: "b" });

        assert.equal(tree.size(), 2);
        assert.deepStrictEqual(tree.getAllRecords(), [
            { key: "a", value: "a" },
            { key: "c", value: "c" },
        ]);
    });

    it("works for deletions on nonexistent records", () => {
        const tree = new RedBlackTree();
        tree.put({ key: "a", value: "a" });
        tree.put({ key: "b", value: "b" });
        tree.put({ key: "c", value: "c" });

        tree.delete({ key: "x", value: "x" });

        assert.equal(tree.size(), 3);
        assert.deepStrictEqual(tree.getAllRecords(), [
            { key: "a", value: "a" },
            { key: "b", value: "b" },
            { key: "c", value: "c" },
        ]);
    });

    it("works for get and getByKey", () => {
        const tree = new RedBlackTree();
        tree.put({ key: "a", value: "a" });
        tree.put({ key: "b", value: "b" });
        tree.put({ key: "c", value: "c" });

        tree.delete({ key: "a", value: "a" });

        assert.deepStrictEqual(tree.get({ key: "b", value: "b" }), {
            key: "b",
            value: "b",
        });
        assert.deepStrictEqual(tree.getByKey("b"), {
            key: "b",
            value: "b",
        });

        assert.equal(tree.get({ key: "x", value: "x" }), undefined);
        assert.equal(tree.getByKey("x"), undefined);
    });

    it("can do range searches", () => {
        const tree = new RedBlackTree();
        tree.put({ key: "c", value: "c" });
        tree.put({ key: "e", value: "e" });
        tree.put({ key: "a", value: "a" });
        tree.put({ key: "b", value: "b" });
        tree.put({ key: "d", value: "d" });

        // get all
        assert.equal(tree.size(), 5);
        assert.deepStrictEqual(tree.getAllRecords(), [
            { key: "a", value: "a" },
            { key: "b", value: "b" },
            { key: "c", value: "c" },
            { key: "d", value: "d" },
            { key: "e", value: "e" },
        ]);

        // in bounds
        assert.deepStrictEqual(
            tree.getRecords(new FDBKeyRange("b", "d", false, false)),
            [
                { key: "b", value: "b" },
                { key: "c", value: "c" },
                { key: "d", value: "d" },
            ],
        );

        // out of bounds
        assert.deepStrictEqual(
            tree.getRecords(new FDBKeyRange("0", "z", false, false)),
            [
                { key: "a", value: "a" },
                { key: "b", value: "b" },
                { key: "c", value: "c" },
                { key: "d", value: "d" },
                { key: "e", value: "e" },
            ],
        );

        // lower/upper open
        assert.deepStrictEqual(
            tree.getRecords(new FDBKeyRange("b", "d", true, true)),
            [{ key: "c", value: "c" }],
        );

        // lower open only
        assert.deepStrictEqual(
            tree.getRecords(new FDBKeyRange("b", "d", true, false)),
            [
                { key: "c", value: "c" },
                { key: "d", value: "d" },
            ],
        );

        // upper open only
        assert.deepStrictEqual(
            tree.getRecords(new FDBKeyRange("b", "d", false, true)),
            [
                { key: "b", value: "b" },
                { key: "c", value: "c" },
            ],
        );
    });
});
