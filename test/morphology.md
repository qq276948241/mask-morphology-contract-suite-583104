# Mask morphology regression contract

This document fixes the observable behaviour of `Mask#erode`, `Mask#dilate`,
`Mask#open` and `Mask#close`, together with the structuring-element scan they
share. It is the reference for the regression suites in
`src/morphology/__tests__/` and for the independent oracle in
`test/morphology.ts`.

The suites only go through the public API (`new Mask`, `Mask#getBit`,
`Mask#getRawImage`, `Mask#erode`, …). They never import anything from
`src/morphology`, so they stay valid if the implementation is refactored.

## Existing conventions

These are the behaviours of the current implementation that the tests pin.
Changing any of them is a behaviour change, not a snapshot update.

### Mask geometry

- `Mask` is row-major: the bit at `(column, row)` is stored at index
  `row * width + column`. `getRawImage().data` uses the same order.
  `getBit(column, row)` and `getBitByIndex(row * width + column)` agree.
- `width`, `height` and `size` (`width * height`) are preserved by every
  morphology operation. `bitDepth` stays `1` and `colorModel` stays `'BINARY'`.
- `origin` is copied from the input to the output for `erode`, `dilate`, `open`
  and `close`.
- Every operation returns a new `Mask`; the input is never modified.
- Masks must have `width >= 1` and `height >= 1`; there is no empty mask
  object, so "empty mask" means a mask whose bits are all `0`.

### Structuring element

- The kernel is an odd-sized matrix of `0`/`1` values (e.g. `[[1, 1, 1]]`).
  Only cells equal to `1` are sampled; every other value is ignored.
- The anchor is the kernel centre: `((rows - 1) / 2, (columns - 1) / 2)`. For
  odd kernels these are integers, so there is no fractional-anchor case.
- For an output pixel at `(column, row)`, a kernel cell at
  `(kernelColumn, kernelRow)` samples the input pixel at
  `(column + kernelColumn - anchorColumn, row + kernelRow - anchorRow)`.
- Samples that fall outside the mask are **skipped**. They are never treated as
  `0` (which would erode borders) nor as `1` (which would dilate borders).
  This is why a `3x3` kernel on a `1x1` mask preserves the single bit.
- A kernel may be larger than the mask. The same skip rule applies.
- Even-sized kernels, empty kernels (`[]`) and kernels with an empty row
  (`[[]]`) are rejected by `checkKernel` with a `TypeError` whose message
  contains `the number of rows and columns of the kernel must be odd`. The
  rejection happens for `erode`, `dilate`, `open` and `close`.

### Operations

- `erode` starts from `1` for each output pixel and is cleared to `0` when a
  sampled in-bounds bit is `0`.
- `dilate` starts from `0` and is set to `1` when a sampled in-bounds bit is
  `1`.
- `iterations` applies the operation that many times. `iterations: 2` is
  equivalent to calling the operation twice.
- `open` is `erode` then `dilate`; `close` is `dilate` then `erode`. With
  `iterations: n` each pair is repeated `n` times.
- The complement relation holds for every odd kernel:
  `invert(dilate(invert(mask))) === erode(mask)` and
  `invert(erode(invert(mask))) === dilate(mask)`.

### Algebraic properties and their limits

Some textbook properties only hold for symmetric kernels (a kernel equal to its
own 180-degree rotation), so the suites check them conditionally:

- For symmetric kernels, `open` and `close` are idempotent:
  `open(open(mask)) === open(mask)` and the same for `close`. For asymmetric
  kernels this is **false**; for example with `[[1, 1, 0]]` on the `1x3` mask
  `1 0 0`, `open` gives `1 1 0` and `open(open(...))` gives `1 1 1`.
- For symmetric kernels whose anchor cell is `1`, `open` is anti-extensive
  (`open(mask) ⊆ mask`) and `close` is extensive (`mask ⊆ close(mask)`). For
  asymmetric kernels this is **false**, even when the anchor cell is `1`.
- The complement relation above holds for both symmetric and asymmetric
  kernels.

The helper `isSymmetricKernel` / `kernelIncludesCenter` in `test/morphology.ts`
decide which property applies, so the assertions never depend on a property
that does not hold.

## Test layout

| File                                                  | Scope                                                                                                                |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `test/morphology.ts`                                  | Independent per-pixel oracle, fixtures, deterministic input generation, comparison helpers and the contract runners. |
| `src/morphology/__tests__/erode.test.ts`              | `Mask#erode` fixed samples plus the full pointwise contract.                                                         |
| `src/morphology/__tests__/dilate.test.ts`             | `Mask#dilate` fixed samples plus the full pointwise contract.                                                        |
| `src/morphology/__tests__/open.test.ts`               | `Mask#open` fixed samples plus the composite contract.                                                               |
| `src/morphology/__tests__/close.test.ts`              | `Mask#close` fixed samples plus the composite contract.                                                              |
| `src/morphology/__tests__/structuringElement.test.ts` | Anchor, out-of-bounds rule, ignored zero cells, geometry/origin preservation, kernel rejection.                      |

### The oracle

`referenceScan` in `test/morphology.ts` is a plain-array re-implementation of
the scan described above. It shares no code with `src/morphology`.
`referenceIterate`, `referenceOpen` and `referenceClose` build the
multi-iteration and composite results from it.

### Deterministic inputs

`generateInputs` enumerates **every** mask whose bit count is at most
`exhaustiveMaxBits` (9 by default) in row-major order. Larger masks use a seeded
LCG (`MASK_CONTRACT_SEED`), never `Math.random`. A failing sample is printed as
JSON so it can be reconstructed:

```ts
maskFromGrid(JSON.parse('[[0,1],[1,0]]'));
```

### Fixed samples

The fixed samples cover:

- 1x1 masks, single-row (`1xN`) and single-column (`Nx1`) masks;
- all-zero and all-one masks;
- kernels larger than the mask (`5x5` on `3x3` and on `1x1`);
- anchors on the kernel edge (`3x3` corner kernels);
- asymmetric kernels (`1x3-left`, `1x3-right`, `3x1-top`, …);
- diagonal lines with a cross kernel;
- connected components touching the mask border;
- a kernel with a hole in the anchor cell (`3x3-ring`).

Every expected grid was pinned against `referenceScan`; no test compares whole
images or uses snapshots.

### Failure output

Every comparison goes through `checkMaskGrid`, which returns `null` on success
and a message otherwise. A failure looks like:

```
first mismatch at column 1, row 1: expected 0, received 1
  operation: dilate (iterations: 1)
  kernel:
  size 3x3, anchor { row: 1, column: 1 }
    [1, 1, 1]
    [1, 1, 1]
    [1, 1, 1]
  input (3x3):
        0 1 2
  row  0 0 0 0
  row  1 0 1 0
  row  2 0 0 0
  expected:
  ...
  received:
  ...
```

The message always contains the operation, the kernel and its anchor, the
input, both grids and the first mismatching pixel. Contract-runner failures add
the kernel name and a JSON copy of the input. Geometry, metadata and bit-order
mismatches are reported separately.

## Running the checks

```bash
# Focused morphology tests (fast)
npx vitest run src/morphology/__tests__/erode.test.ts \
  src/morphology/__tests__/dilate.test.ts \
  src/morphology/__tests__/open.test.ts \
  src/morphology/__tests__/close.test.ts \
  src/morphology/__tests__/structuringElement.test.ts

# Full suite
npx vitest run

# Type and style checks
npx tsc --noEmit
npm run eslint
npx prettier --check .
```

### Known environment limits

- The full suite also runs the draw / feature-matching snapshot tests. They
  need the optional `skia-canvas` native binary, which is not built when
  dependencies are installed with the repository's `ignore-scripts=true`
  setting. Those tests fail with
  `drawText on Node.js requires the optional "skia-canvas" package`; this is an
  environment limitation unrelated to morphology.
- Benchmarks (`npm run bench`) need the separately downloaded demo image
  dataset and are not part of the checks above.

## Re-validating after a change

When `Mask`, the structuring-element scan or the output conversion changes:

1. Run the focused tests above. A failure names the exact pixel, kernel and
   anchor, so it can be repaired without inspecting a whole image.
2. If the change is intentional, update the convention in this document and the
   fixtures in `test/morphology.ts`; do **not** relax an assertion only to make
   the suite pass.
3. Re-run the full suite, `tsc`, ESLint and Prettier.
