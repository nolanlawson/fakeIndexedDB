# fakeIndexedDB benchmarks

Micro-benchmarks used to measure the performance improvements in the
`cmpKeys` / BST-rebuild PR.

## Prerequisites

- Node.js >= 18
- The project must be built first (`pnpm build` from the repo root)
- Install mitata: `npm install mitata` (or use the repo's devDependencies)

## Running

From the repo root:

```bash
pnpm build
node test/bench/cmp-binary.mjs      # Binary key comparison (cmp baseline vs optimized)
node test/bench/cmp-array.mjs       # Nested array key comparison
node test/bench/cmp-known-keys.mjs  # cmp vs cmpKeys on pre-normalized keys + FDBKeyRange.includes
node test/bench/bst-rebuild.mjs     # BinarySearchTree._rebuild slice vs index-range
```

Add `--json` to any command to get JSON output instead of the default table.

## What each benchmark measures

| File | Description |
|---|---|
| `cmp-binary.mjs` | Compares 256 pairs of 256-byte `ArrayBuffer` keys. Measures the dedicated binary comparison path vs the old generic array/binary path. |
| `cmp-array.mjs` | Compares 128 pairs of deeply nested arrays (depth 4, width 6). Measures the recursive `cmpKeys` path which avoids redundant `valueToKey` calls on each recursion. |
| `cmp-known-keys.mjs` | Compares already-normalized binary keys using `cmp` (with `valueToKey` overhead) vs `cmpKeys` (direct). Also benchmarks `FDBKeyRange.includes` before and after. |
| `bst-rebuild.mjs` | Rebuilds a red-black tree from 16384 sorted records. Measures the old `slice()`-based recursion vs the new index-range recursion that avoids temporary array allocations. |
