import { expect, test } from 'vitest';

import {
  ASYMMETRIC_KERNELS,
  EVEN_KERNELS,
  SAMPLE_KERNELS,
  checkKernelRejection,
  checkMaskGrid,
  isSymmetricKernel,
  kernelAnchor,
  kernelIncludesCenter,
  maskFromGrid,
  referenceScan,
} from '../../../test/morphology.ts';
import { Mask } from '../../Mask.ts';

// ---------------------------------------------------------------------------
// Shared structuring-element scan contract.
//
// `Mask#erode` and `Mask#dilate` share one scan convention: kernel offsets are
// measured from the anchor `((rows - 1) / 2, (columns - 1) / 2)`, only cells
// equal to 1 are sampled, and out-of-mask samples are skipped (never treated as
// 0 or 1). These tests pin that convention independently of the composite
// operations, so a change to the scan also has to satisfy them.
// ---------------------------------------------------------------------------

test('structuring element: anchor is the kernel centre', () => {
  expect(kernelAnchor([[1]])).toStrictEqual({ row: 0, column: 0 });
  expect(kernelAnchor([[1, 1, 1]])).toStrictEqual({ row: 0, column: 1 });
  expect(kernelAnchor([[1], [1], [1]])).toStrictEqual({ row: 1, column: 0 });
  expect(
    kernelAnchor([
      [1, 1, 1],
      [1, 1, 1],
      [1, 1, 1],
    ]),
  ).toStrictEqual({ row: 1, column: 1 });
  expect(
    kernelAnchor([
      [1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1],
    ]),
  ).toStrictEqual({ row: 1, column: 2 });
});

test('structuring element: symmetry and centre helpers agree with the fixtures', () => {
  const wronglyAsymmetric = Object.entries(SAMPLE_KERNELS)
    .filter(([, kernel]) => !isSymmetricKernel(kernel))
    .map(([label]) => label);

  expect(wronglyAsymmetric).toStrictEqual([]);

  const wronglySymmetric = Object.entries(ASYMMETRIC_KERNELS)
    .filter(([, kernel]) => isSymmetricKernel(kernel))
    .map(([label]) => label);

  expect(wronglySymmetric).toStrictEqual([]);

  expect(kernelIncludesCenter(SAMPLE_KERNELS['3x3-ones'])).toBe(true);
  expect(kernelIncludesCenter(SAMPLE_KERNELS['3x3-ring'])).toBe(false);
  expect(kernelIncludesCenter(ASYMMETRIC_KERNELS['3x3-corner-top-left'])).toBe(
    false,
  );
});

test('structuring element: 1x1 identity kernel leaves every 3x3 mask unchanged', () => {
  const size = 3;
  const total = 2 ** (size * size);
  for (let bits = 0; bits < total; bits++) {
    const input: number[][] = [];
    for (let row = 0; row < size; row++) {
      const line: number[] = [];
      for (let column = 0; column < size; column++) {
        line.push((bits >> (row * size + column)) & 1);
      }
      input.push(line);
    }
    const mask = maskFromGrid(input);

    expect(
      checkMaskGrid(mask.erode({ kernel: SAMPLE_KERNELS['1x1'] }), input, {
        operation: 'erode with 1x1 kernel',
        kernel: SAMPLE_KERNELS['1x1'],
        input,
      }),
    ).toBeNull();
    expect(
      checkMaskGrid(mask.dilate({ kernel: SAMPLE_KERNELS['1x1'] }), input, {
        operation: 'dilate with 1x1 kernel',
        kernel: SAMPLE_KERNELS['1x1'],
        input,
      }),
    ).toBeNull();
  }
});

test('structuring element: out-of-bounds samples are skipped, not read as 0', () => {
  // A 3x3 all-ones kernel on a 1x1 mask only sees the single in-bounds pixel.
  // If missing samples were treated as 0, erosion would clear it.
  expect(
    checkMaskGrid(maskFromGrid([[1]]).erode(), [[1]], {
      operation: 'erode',
      kernel: SAMPLE_KERNELS['3x3-ones'],
      input: [[1]],
    }),
  ).toBeNull();

  // The same rule applies to a one-row mask: border columns only see their
  // in-bounds neighbour, so [1 1] is kept.
  expect(
    checkMaskGrid(
      maskFromGrid([[1, 1]]).erode({ kernel: SAMPLE_KERNELS['1x3'] }),
      [[1, 1]],
      {
        operation: 'erode',
        kernel: SAMPLE_KERNELS['1x3'],
        input: [[1, 1]],
      },
    ),
  ).toBeNull();
});

test('structuring element: anchor at the kernel edge samples asymmetrically', () => {
  // The single 1 sits at kernel offset (-1, -1) from the centre anchor, so the
  // sample position is `output - (1, 1)`: the centre input pixel lands on the
  // bottom-right output pixel, and the top-left corner of the mask is never
  // reached.
  const input = [
    [0, 0, 0],
    [0, 1, 0],
    [0, 0, 0],
  ];

  expect(
    checkMaskGrid(
      maskFromGrid(input).dilate({
        kernel: ASYMMETRIC_KERNELS['3x3-corner-top-left'],
      }),
      [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 1],
      ],
      {
        operation: 'dilate',
        kernel: ASYMMETRIC_KERNELS['3x3-corner-top-left'],
        input,
      },
    ),
  ).toBeNull();

  // The mirrored triangle occupies offsets from (-1, +1) to (+1, -1); with the
  // centre anchor it scatters the single input pixel up and to the left, never
  // into the bottom-right corner.
  expect(
    checkMaskGrid(
      maskFromGrid(input).dilate({
        kernel: ASYMMETRIC_KERNELS['3x3-lower-right'],
      }),
      [
        [1, 1, 1],
        [1, 1, 0],
        [1, 0, 0],
      ],
      {
        operation: 'dilate',
        kernel: ASYMMETRIC_KERNELS['3x3-lower-right'],
        input,
      },
    ),
  ).toBeNull();
});

test('structuring element: kernel larger than the mask still scans in-bounds samples', () => {
  // The 5x5 anchor is the centre: a single 1 in the centre of a 3x3 mask is
  // the only in-bounds sample for the centre output pixel, so erosion clears
  // everything else but the 5x5 kernel never sees an out-of-bounds zero either.
  const centred = [
    [0, 0, 0],
    [0, 1, 0],
    [0, 0, 0],
  ];

  expect(
    checkMaskGrid(
      maskFromGrid(centred).erode({ kernel: SAMPLE_KERNELS['5x5-ones'] }),
      [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
      ],
      {
        operation: 'erode',
        kernel: SAMPLE_KERNELS['5x5-ones'],
        input: centred,
      },
    ),
  ).toBeNull();
  expect(
    checkMaskGrid(
      maskFromGrid(centred).dilate({ kernel: SAMPLE_KERNELS['5x5-ones'] }),
      [
        [1, 1, 1],
        [1, 1, 1],
        [1, 1, 1],
      ],
      {
        operation: 'dilate',
        kernel: SAMPLE_KERNELS['5x5-ones'],
        input: centred,
      },
    ),
  ).toBeNull();

  const full = [
    [1, 1, 1],
    [1, 1, 1],
    [1, 1, 1],
  ];

  expect(
    checkMaskGrid(
      maskFromGrid(full).erode({ kernel: SAMPLE_KERNELS['5x5-ones'] }),
      full,
      { operation: 'erode', kernel: SAMPLE_KERNELS['5x5-ones'], input: full },
    ),
  ).toBeNull();
});

test('structuring element: zero entries are not sampled', () => {
  // The ring kernel has a hole in the anchor cell. Eroding a mask whose only
  // zero is exactly the centre therefore keeps the centre, while the all-ones
  // kernel clears it. If zeros were sampled, both results would be identical.
  const input = [
    [1, 1, 1],
    [1, 0, 1],
    [1, 1, 1],
  ];

  expect(
    checkMaskGrid(
      maskFromGrid(input).erode({ kernel: SAMPLE_KERNELS['3x3-ring'] }),
      [
        [0, 0, 0],
        [0, 1, 0],
        [0, 0, 0],
      ],
      { operation: 'erode', kernel: SAMPLE_KERNELS['3x3-ring'], input },
    ),
  ).toBeNull();
  expect(
    checkMaskGrid(
      maskFromGrid(input).erode({ kernel: SAMPLE_KERNELS['3x3-ones'] }),
      [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
      ],
      { operation: 'erode', kernel: SAMPLE_KERNELS['3x3-ones'], input },
    ),
  ).toBeNull();
});

test('structuring element: operations preserve geometry, origin and metadata', () => {
  const data = Uint8Array.from([1, 0, 0, 0, 1, 0]);
  const origin = { row: 4, column: 9 };
  const positioned = new Mask(3, 2, { data, origin });

  for (const operation of ['erode', 'dilate', 'open', 'close'] as const) {
    const result = positioned[operation]({
      kernel: SAMPLE_KERNELS['3x3-ones'],
    });

    const summary = {
      width: result.width,
      height: result.height,
      size: result.size,
      origin: result.origin,
      bitDepth: result.bitDepth,
      colorModel: result.colorModel,
      sameInstance: result === positioned,
    };

    expect({ operation, ...summary }).toStrictEqual({
      operation,
      width: 3,
      height: 2,
      size: 6,
      origin,
      bitDepth: 1,
      colorModel: 'BINARY',
      sameInstance: false,
    });
  }

  // The input keeps its own data.
  expect(Array.from(positioned.getRawImage().data)).toStrictEqual([
    1, 0, 0, 0, 1, 0,
  ]);
});

test('structuring element: the reference oracle rejects even kernels', () => {
  const accepted = Object.entries(EVEN_KERNELS)
    .filter(([, kernel]) => {
      try {
        referenceScan([[1]], kernel, 'erode');
        return true;
      } catch (error) {
        return !(error instanceof RangeError);
      }
    })
    .map(([label]) => label);

  expect(accepted).toStrictEqual([]);
});

test('structuring element: all operations reject even and empty kernels', () => {
  for (const [label, kernel] of Object.entries(EVEN_KERNELS)) {
    expect(checkKernelRejection(kernel, label)).toBeNull();
  }

  expect(checkKernelRejection([], 'empty kernel')).toBeNull();
  expect(checkKernelRejection([[]], 'kernel with an empty row')).toBeNull();
});
