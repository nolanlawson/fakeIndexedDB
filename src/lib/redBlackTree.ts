import { Record } from "./types.js";
import cmp from "./cmp.js";

const RED = true;
const BLACK = false;

class Node {
    record: Record;
    color: boolean;
    size: number;
    left: Node | undefined;
    right: Node | undefined;

    constructor(record: Record, color: boolean, size: number) {
        this.record = record;
        this.color = color;
        this.size = size;
        this.left = undefined;
        this.right = undefined;
    }
}

type RedNode = Node & { color: typeof RED };
type NodeWithLeft = Node & { left: Node };
type NodeWithRight = Node & { right: Node };
type NodeWithBoth = NodeWithLeft & NodeWithRight;

const compare = (a: Record, b: Record): number => {
    const keyComparison = cmp(a.key, b.key);
    if (keyComparison !== 0) {
        return keyComparison;
    }
    return cmp(a.value, b.value);
};

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
export default class RedBlackBST {
    private _root: Node | undefined;

    size(): number {
        return size(this._root);
    }

    get(record: Record): Record | undefined {
        return this._get(this._root, record);
    }

    // value associated with the given key in subtree rooted at x; null if no such key
    private _get(x: Node | undefined, record: Record): Record | undefined {
        while (x) {
            const comparison = compare(record, x.record);
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

    contains(record: Record): boolean {
        return !!this.get(record);
    }

    put(record: Record): void {
        this._root = this._put(this._root, record);
        this._root.color = BLACK;
    }

    private _put(h: Node | undefined, record: Record): Node {
        if (!h) {
            return new Node(record, RED, 1);
        }

        const comparison = compare(record, h.record);
        if (comparison < 0) {
            h.left = this._put(h.left, record);
        } else if (comparison > 0) {
            h.right = this._put(h.right, record);
        } else {
            h.record = record;
        }

        // fix-up any right-leaning links
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
    }

    /**
     * Removes the smallest key and associated value from the symbol table.
     */
    public deleteMin(): void {
        if (!this._root) {
            throw new Error("Cannot call deleteMin() on an empty table");
        }

        // if both children of root are black, set root to red
        if (!hasRedLeft(this._root) && !hasRedRight(this._root)) {
            this._root.color = RED;
        }

        this._root = this._deleteMin(this._root);
        if (this._root) {
            this._root.color = BLACK;
        }
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

    /**
     * Removes the largest key and associated value from the symbol table.
     */
    public deleteMax(): void {
        if (!this._root) {
            throw new Error("Cannot call deleteMin() on an empty table");
        }

        // if both children of root are black, set root to red
        if (!hasRedLeft(this._root) && !hasRedRight(this._root)) {
            this._root.color = RED;
        }

        this._root = this._deleteMax(this._root);
        if (this._root) {
            this._root.color = BLACK;
        }
    }

    // delete the key-value pair with the maximum key rooted at h
    private _deleteMax(h: Node): Node | undefined {
        if (hasRedLeft(h)) {
            h = rotateRight(h);
        }

        if (!h.right) {
            return undefined;
        }

        if (!hasRedRight(h) && !hasRedLeft(h.right)) {
            h = moveRedRight(h as NodeWithBoth);
        }

        h.right = this._deleteMax((h as NodeWithRight).right);

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
        if (compare(record, h.record) < 0) {
            if (!hasRedLeft(h) && !hasRedLeft((h as NodeWithLeft).left)) {
                h = moveRedLeft(h as NodeWithBoth);
            }
            h.left = this._delete((h as NodeWithLeft).left, record);
        } else {
            if (hasRedLeft(h)) {
                h = rotateRight(h);
            }
            if (compare(record, h.record) == 0 && !h.right) {
                return undefined;
            }
            if (!hasRedRight(h) && !hasRedLeft((h as NodeWithRight).right)) {
                h = moveRedRight(h as NodeWithBoth);
            }
            if (compare(record, h.record) == 0) {
                const x = this._min((h as NodeWithRight).right);
                h.record = x.record;
                h.right = this._deleteMin((h as NodeWithRight).right);
            } else {
                h.right = this._delete((h as NodeWithRight).right, record);
            }
        }
        return balance(h);
    }

    /***************************************************************************
     *  Utility functions.
     ***************************************************************************/

    /**
     * Returns the height of the BST (for debugging).
     * @return the height of the BST (a 1-node tree has height 0)
     */
    // public int height() {
    //     return height(root);
    // }
    // private int height(Node x) {
    //     if (x == null) return -1;
    //     return 1 + Math.max(height(x.left), height(x.right));
    // }

    /***************************************************************************
     *  Ordered symbol table methods.
     ***************************************************************************/

    /**
     * Returns the smallest key in the symbol table.
     * @return the smallest key in the symbol table
     */
    min(): Record {
        if (!this._root) {
            throw new Error("Cannot call min() on an empty table");
        }
        return this._min(this._root).record;
    }

    // the smallest key in subtree rooted at x; null if no such key
    private _min(x: Node): Node {
        if (!x.left) {
            return x;
        } else {
            return this._min(x.left);
        }
    }

    /**
     * Returns the largest key in the symbol table.
     * @return the largest key in the symbol table
     */
    max(): Record {
        if (!this._root) {
            throw new Error("Cannot call max() on an empty table");
        }
        return this._max(this._root).record;
    }

    // the largest key in the subtree rooted at x; null if no such key
    private _max(x: Node): Node {
        if (!x.right) {
            return x;
        } else {
            return this._max(x.right);
        }
    }

    // /**
    //  * Returns the largest key in the symbol table less than or equal to {@code key}.
    //  * @param key the key
    //  * @return the largest key in the symbol table less than or equal to {@code key}
    //  * @throws NoSuchElementException if there is no such key
    //  * @throws IllegalArgumentException if {@code key} is {@code null}
    //  */
    // public Key floor(Key key) {
    //     if (key == null) throw new IllegalArgumentException("argument to floor() is null");
    //     if (isEmpty()) throw new NoSuchElementException("calls floor() with empty symbol table");
    //     Node x = floor(root, key);
    //     if (x == null) throw new NoSuchElementException("argument to floor() is too small");
    //     else           return x.key;
    // }
    //
    // // the largest key in the subtree rooted at x less than or equal to the given key
    // private Node floor(Node x, Key key) {
    //     if (x == null) return null;
    //     int cmp = key.compareTo(x.key);
    //     if (cmp == 0) return x;
    //     if (cmp < 0)  return floor(x.left, key);
    //     Node t = floor(x.right, key);
    //     if (t != null) return t;
    //     else           return x;
    // }
    //
    // /**
    //  * Returns the smallest key in the symbol table greater than or equal to {@code key}.
    //  * @param key the key
    //  * @return the smallest key in the symbol table greater than or equal to {@code key}
    //  * @throws NoSuchElementException if there is no such key
    //  * @throws IllegalArgumentException if {@code key} is {@code null}
    //  */
    // public Key ceiling(Key key) {
    //     if (key == null) throw new IllegalArgumentException("argument to ceiling() is null");
    //     if (isEmpty()) throw new NoSuchElementException("calls ceiling() with empty symbol table");
    //     Node x = ceiling(root, key);
    //     if (x == null) throw new NoSuchElementException("argument to ceiling() is too large");
    //     else           return x.key;
    // }
    //
    // // the smallest key in the subtree rooted at x greater than or equal to the given key
    // private Node ceiling(Node x, Key key) {
    //     if (x == null) return null;
    //     int cmp = key.compareTo(x.key);
    //     if (cmp == 0) return x;
    //     if (cmp > 0)  return ceiling(x.right, key);
    //     Node t = ceiling(x.left, key);
    //     if (t != null) return t;
    //     else           return x;
    // }

    // /**
    //  * Return the key in the symbol table of a given {@code rank}.
    //  * This key has the property that there are {@code rank} keys in
    //  * the symbol table that are smaller. In other words, this key is the
    //  * ({@code rank}+1)st smallest key in the symbol table.
    //  *
    //  * @param  rank the order statistic
    //  * @return the key in the symbol table of given {@code rank}
    //  * @throws IllegalArgumentException unless {@code rank} is between 0 and
    //  *        <em>n</em>–1
    //  */
    // public Key select(int rank) {
    //     if (rank < 0 || rank >= size()) {
    //         throw new IllegalArgumentException("argument to select() is invalid: " + rank);
    //     }
    //     return select(root, rank);
    // }
    //
    // // Return key in BST rooted at x of given rank.
    // // Precondition: rank is in legal range.
    // private Key select(Node x, int rank) {
    //     if (x == null) return null;
    //     int leftSize = size(x.left);
    //     if      (leftSize > rank) return select(x.left,  rank);
    //     else if (leftSize < rank) return select(x.right, rank - leftSize - 1);
    //     else                      return x.key;
    // }
    //
    // /**
    //  * Return the number of keys in the symbol table strictly less than {@code key}.
    //  * @param key the key
    //  * @return the number of keys in the symbol table strictly less than {@code key}
    //  * @throws IllegalArgumentException if {@code key} is {@code null}
    //  */
    // public int rank(Key key) {
    //     if (key == null) throw new IllegalArgumentException("argument to rank() is null");
    //     return rank(key, root);
    // }
    //
    // // number of keys less than key in the subtree rooted at x
    // private int rank(Key key, Node x) {
    //     if (x == null) return 0;
    //     int cmp = key.compareTo(x.key);
    //     if      (cmp < 0) return rank(key, x.left);
    //     else if (cmp > 0) return 1 + size(x.left) + rank(key, x.right);
    //     else              return size(x.left);
    // }

    /***************************************************************************
     *  Range count and range search.
     ***************************************************************************/

    // /**
    //  * Returns all keys in the symbol table in ascending order as an {@code Iterable}.
    //  * To iterate over all of the keys in the symbol table named {@code st},
    //  * use the foreach notation: {@code for (Key key : st.keys())}.
    //  * @return all keys in the symbol table in ascending order
    //  */
    // public Iterable<Key> keys() {
    //     if (isEmpty()) return new Queue<Key>();
    //     return keys(min(), max());
    // }

    // /**
    //  * Returns all keys in the symbol table in the given range in ascending order,
    //  * as an {@code Iterable}.
    //  *
    //  * @param  lo minimum endpoint
    //  * @param  hi maximum endpoint
    //  * @return all keys in the symbol table between {@code lo}
    //  *    (inclusive) and {@code hi} (inclusive) in ascending order
    //  * @throws IllegalArgumentException if either {@code lo} or {@code hi}
    //  *    is {@code null}
    //  */
    // public Iterable<Key> keys(Key lo, Key hi) {
    //     if (lo == null) throw new IllegalArgumentException("first argument to keys() is null");
    //     if (hi == null) throw new IllegalArgumentException("second argument to keys() is null");
    //
    //     Queue<Key> queue = new Queue<Key>();
    //     // if (isEmpty() || lo.compareTo(hi) > 0) return queue;
    //     keys(root, queue, lo, hi);
    //     return queue;
    // }
    //
    // // add the keys between lo and hi in the subtree rooted at x
    // // to the queue
    // private void keys(Node x, Queue<Key> queue, Key lo, Key hi) {
    //     if (x == null) return;
    //     int cmplo = lo.compareTo(x.key);
    //     int cmphi = hi.compareTo(x.key);
    //     if (cmplo < 0) keys(x.left, queue, lo, hi);
    //     if (cmplo <= 0 && cmphi >= 0) queue.enqueue(x.key);
    //     if (cmphi > 0) keys(x.right, queue, lo, hi);
    // }

    // /**
    //  * Returns the number of keys in the symbol table in the given range.
    //  *
    //  * @param  lo minimum endpoint
    //  * @param  hi maximum endpoint
    //  * @return the number of keys in the symbol table between {@code lo}
    //  *    (inclusive) and {@code hi} (inclusive)
    //  * @throws IllegalArgumentException if either {@code lo} or {@code hi}
    //  *    is {@code null}
    //  */
    // public int size(Key lo, Key hi) {
    //     if (lo == null) throw new IllegalArgumentException("first argument to size() is null");
    //     if (hi == null) throw new IllegalArgumentException("second argument to size() is null");
    //
    //     if (lo.compareTo(hi) > 0) return 0;
    //     if (contains(hi)) return rank(hi) - rank(lo) + 1;
    //     else              return rank(hi) - rank(lo);
    // }

    /***************************************************************************
     *  Check integrity of red-black tree data structure.
     ***************************************************************************/
    // private boolean check() {
    //     if (!isBST())            StdOut.println("Not in symmetric order");
    //     if (!isSizeConsistent()) StdOut.println("Subtree counts not consistent");
    //     if (!isRankConsistent()) StdOut.println("Ranks not consistent");
    //     if (!is23())             StdOut.println("Not a 2-3 tree");
    //     if (!isBalanced())       StdOut.println("Not balanced");
    //     return isBST() && isSizeConsistent() && isRankConsistent() && is23() && isBalanced();
    // }
    //
    // // does this binary tree satisfy symmetric order?
    // // Note: this test also ensures that data structure is a binary tree since order is strict
    // private boolean isBST() {
    //     return isBST(root, null, null);
    // }
    //
    // // is the tree rooted at x a BST with all keys strictly between min and max
    // // (if min or max is null, treat as empty constraint)
    // // Credit: elegant solution due to Bob Dondero
    // private boolean isBST(Node x, Key min, Key max) {
    //     if (x == null) return true;
    //     if (min != null && x.key.compareTo(min) <= 0) return false;
    //     if (max != null && x.key.compareTo(max) >= 0) return false;
    //     return isBST(x.left, min, x.key) && isBST(x.right, x.key, max);
    // }
    //
    // // are the size fields correct?
    // private boolean isSizeConsistent() { return isSizeConsistent(root); }
    // private boolean isSizeConsistent(Node x) {
    //     if (x == null) return true;
    //     if (x.size != size(x.left) + size(x.right) + 1) return false;
    //     return isSizeConsistent(x.left) && isSizeConsistent(x.right);
    // }
    //
    // // check that ranks are consistent
    // private boolean isRankConsistent() {
    //     for (int i = 0; i < size(); i++)
    //     if (i != rank(select(i))) return false;
    //     for (Key key : keys())
    //     if (key.compareTo(select(rank(key))) != 0) return false;
    //     return true;
    // }
    //
    // // Does the tree have no red right links, and at most one (left)
    // // red links in a row on any path?
    // private boolean is23() { return is23(root); }
    // private boolean is23(Node x) {
    //     if (x == null) return true;
    //     if (isRed(x.right)) return false;
    //     if (x != root && isRed(x) && isRed(x.left))
    //         return false;
    //     return is23(x.left) && is23(x.right);
    // }
    //
    // // do all paths from root to leaf have same number of black edges?
    // private boolean isBalanced() {
    //     int black = 0;     // number of black links on path from root to min
    //     Node x = root;
    //     while (x != null) {
    //         if (!isRed(x)) black++;
    //         x = x.left;
    //     }
    //     return isBalanced(root, black);
    // }
    //
    // // does every path from the root to a leaf have the given number of black links?
    // private boolean isBalanced(Node x, int black) {
    //     if (x == null) return black == 0;
    //     if (!isRed(x)) black--;
    //     return isBalanced(x.left, black) && isBalanced(x.right, black);
    // }

    // /**
    //  * Unit tests the {@code RedBlackBST} data type.
    //  *
    //  * @param args the command-line arguments
    //  */
    // public static void main(String[] args) {
    //     RedBlackBST<String, Integer> st = new RedBlackBST<String, Integer>();
    //     for (int i = 0; !StdIn.isEmpty(); i++) {
    //         String key = StdIn.readString();
    //         st.put(key, i);
    //     }
    //     StdOut.println();
    //     for (String s : st.keys())
    //     StdOut.println(s + " " + st.get(s));
    //     StdOut.println();
    // }
}
