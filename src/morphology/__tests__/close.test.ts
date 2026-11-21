import { expect, test } from 'vitest';

import {
  ASYMMETRIC_KERNELS,
  SAMPLE_KERNELS,
  checkCompositeContract,
  checkMaskGrid,
  maskFromGrid,
} from '../../../test/morphology.ts';

test('check for GREY image 5x5', () => {
  const kernel = [
    [1, 1, 1],
    [1, 1, 1],
    [1, 1, 1],
  ];
  const image = testUtils.createGreyImage([
    [255, 255, 0, 255, 255],
    [255, 0, 0, 0, 255],
    [255, 0, 0, 0, 255],
    [255, 0, 0, 0, 255],
    [255, 255, 0, 255, 255],
  ]);

  expect(image.close({ kernel })).toMatchImageData([
    [255, 255, 255, 255, 255],
    [255, 0, 0, 0, 255],
    [255, 0, 0, 0, 255],
    [255, 0, 0, 0, 255],
    [255, 255, 255, 255, 255],
  ]);
});

test('check for GREY image 5x5 2 iterations', () => {
  const kernel = [
    [1, 1, 1],
    [1, 1, 1],
    [1, 1, 1],
  ];
  const image = testUtils.createGreyImage([
    [255, 255, 0, 255, 255],
    [255, 0, 0, 0, 255],
    [255, 0, 0, 0, 255],
    [255, 0, 0, 0, 255],
    [255, 255, 0, 255, 255],
  ]);

  expect(image.close({ kernel, iterations: 2 })).toMatchImageData([
    [255, 255, 255, 255, 255],
    [255, 0, 0, 0, 255],
    [255, 0, 0, 0, 255],
    [255, 0, 0, 0, 255],
    [255, 255, 255, 255, 255],
  ]);
});

test('check on 5x5 mask', () => {
  const mask = testUtils.createMask(`
      1 1 0 1 1
      1 0 0 0 1
      1 0 0 0 1
      1 0 0 0 1
      1 1 0 1 1
    `);

  expect(mask.close()).toMatchMaskData(`
        1 1 1 1 1
        1 0 0 0 1
        1 0 0 0 1
        1 0 0 0 1
        1 1 1 1 1
    `);
});

// ---------------------------------------------------------------------------
// Mask contract regressions (see `test/morphology.ts` for the oracle).
// ---------------------------------------------------------------------------

test('close: single pixel and single hole 3x3', () => {
  expect(
    checkMaskGrid(maskFromGrid([[0]]).close(), [[0]], {
      operation: 'close',
      kernel: SAMPLE_KERNELS['3x3-ones'],
      input: [[0]],
    }),
  ).toBeNull();

  const hole = [
    [1, 1, 1],
    [1, 0, 1],
    [1, 1, 1],
  ];

  expect(
    checkMaskGrid(
      maskFromGrid(hole).close(),
      [
        [1, 1, 1],
        [1, 1, 1],
        [1, 1, 1],
      ],
      { operation: 'close', kernel: SAMPLE_KERNELS['3x3-ones'], input: hole },
    ),
  ).toBeNull();
});

test('close: fills a hole inside a block', () => {
  const input = [
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 1, 1, 1, 0, 0],
    [0, 0, 1, 0, 1, 0, 0],
    [0, 0, 1, 1, 1, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
  ];

  expect(
    checkMaskGrid(
      maskFromGrid(input).close(),
      [
        [0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0],
        [0, 0, 1, 1, 1, 0, 0],
        [0, 0, 1, 1, 1, 0, 0],
        [0, 0, 1, 1, 1, 0, 0],
        [0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0],
      ],
      { operation: 'close', kernel: SAMPLE_KERNELS['3x3-ones'], input },
    ),
  ).toBeNull();
});

test('close: fills an edge-touching notch', () => {
  const input = [
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
    [1, 0, 0, 0, 1],
    [1, 1, 1, 1, 1],
  ];

  expect(
    checkMaskGrid(
      maskFromGrid(input).close(),
      [
        [1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1],
      ],
      { operation: 'close', kernel: SAMPLE_KERNELS['3x3-ones'], input },
    ),
  ).toBeNull();
});

test('close: asymmetric kernel shifts the result toward its anchor', () => {
  // The 1x3-right kernel has its anchor at column 0 with samples at columns
  // 0..2. Dilation shifts the lone pixel right and the erosion cannot recover
  // the columns that leave the mask, so the oracle pins the shifted column.
  const input = [
    [1, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];

  expect(
    checkMaskGrid(
      maskFromGrid(input).close({ kernel: ASYMMETRIC_KERNELS['1x3-right'] }),
      [
        [0, 0, 1],
        [0, 0, 1],
        [0, 0, 1],
      ],
      {
        operation: 'close',
        kernel: ASYMMETRIC_KERNELS['1x3-right'],
        input,
      },
    ),
  ).toBeNull();
});

test('close: does not modify its input', () => {
  const input = [
    [1, 0, 1],
    [0, 1, 0],
    [1, 0, 1],
  ];
  const mask = maskFromGrid(input);
  mask.close();

  expect(
    checkMaskGrid(mask, input, {
      operation: 'close (input unchanged)',
      kernel: SAMPLE_KERNELS['3x3-ones'],
      input,
    }),
  ).toBeNull();
});

test('close: composite contract, idempotency and extensivity', () => {
  expect(checkCompositeContract({ operation: 'close' })).toBeNull();
});
