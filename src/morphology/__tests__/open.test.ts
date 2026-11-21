import { expect, test } from 'vitest';

import {
  SAMPLE_KERNELS,
  checkCompositeContract,
  checkMaskGrid,
  maskFromGrid,
} from '../../../test/morphology.ts';

test('GREY image 5x5', () => {
  const image = testUtils.createGreyImage([
    [255, 255, 0, 255, 255],
    [255, 0, 0, 0, 255],
    [255, 0, 0, 0, 255],
    [255, 0, 0, 0, 255],
    [255, 255, 0, 255, 255],
  ]);

  expect(image.open()).toMatchImageData([
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
  ]);
});

test('GREY image 5x5, 2 iterations', () => {
  const image = testUtils.createGreyImage([
    [255, 255, 255, 255, 255],
    [255, 255, 0, 255, 255],
    [255, 0, 0, 0, 255],
    [255, 255, 0, 255, 255],
    [255, 255, 255, 255, 255],
  ]);

  expect(image.open({ iterations: 2 })).toMatchImageData([
    [255, 255, 0, 255, 255],
    [255, 255, 0, 255, 255],
    [0, 0, 0, 0, 0],
    [255, 255, 0, 255, 255],
    [255, 255, 0, 255, 255],
  ]);
});

test('mask 5x5, 1x3 kernel with onlyOnes', () => {
  const kernel = [[1, 1, 1]];

  const mask = testUtils.createMask(`
      1 0 0 0 1
      0 0 0 0 0
      0 0 0 0 0
      0 0 0 0 0
      1 0 0 0 1
    `);

  const expected = testUtils.createMask(`
      1 1 0 1 1
      0 0 0 0 0
      0 0 0 0 0
      0 0 0 0 0
      1 1 0 1 1
    `);

  expect(mask.dilate({ kernel })).toMatchMask(expected);
});

// ---------------------------------------------------------------------------
// Mask contract regressions (see `test/morphology.ts` for the oracle).
// ---------------------------------------------------------------------------

test('open: single pixel and 3x3 speck are removed', () => {
  expect(
    checkMaskGrid(maskFromGrid([[1]]).open(), [[1]], {
      operation: 'open',
      kernel: SAMPLE_KERNELS['3x3-ones'],
      input: [[1]],
    }),
  ).toBeNull();

  const speck = [
    [0, 0, 0],
    [0, 1, 0],
    [0, 0, 0],
  ];

  expect(
    checkMaskGrid(
      maskFromGrid(speck).open(),
      [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
      ],
      { operation: 'open', kernel: SAMPLE_KERNELS['3x3-ones'], input: speck },
    ),
  ).toBeNull();
});

test('open: keeps components that contain the structuring element', () => {
  const block = [
    [1, 1, 1, 0, 0],
    [1, 1, 1, 0, 0],
    [1, 1, 1, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
  ];

  expect(
    checkMaskGrid(
      maskFromGrid(block).open(),
      [
        [1, 1, 1, 0, 0],
        [1, 1, 1, 0, 0],
        [1, 1, 1, 0, 0],
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0],
      ],
      { operation: 'open', kernel: SAMPLE_KERNELS['3x3-ones'], input: block },
    ),
  ).toBeNull();
});

test('open: removes an interior protrusion but keeps the slab', () => {
  const input = [
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 1, 1, 1, 0, 0],
    [0, 0, 1, 1, 1, 0, 0],
    [0, 0, 1, 1, 1, 1, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
  ];

  expect(
    checkMaskGrid(
      maskFromGrid(input).open(),
      [
        [0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0],
        [0, 0, 1, 1, 1, 0, 0],
        [0, 0, 1, 1, 1, 0, 0],
        [0, 0, 1, 1, 1, 0, 0],
        [0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0],
      ],
      { operation: 'open', kernel: SAMPLE_KERNELS['3x3-ones'], input },
    ),
  ).toBeNull();
});

test('open: empties an edge-touching one-pixel-wide line', () => {
  const input = [
    [0, 0, 0, 0, 0],
    [1, 1, 1, 1, 1],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
  ];

  expect(
    checkMaskGrid(
      maskFromGrid(input).open(),
      [
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0],
      ],
      { operation: 'open', kernel: SAMPLE_KERNELS['3x3-ones'], input },
    ),
  ).toBeNull();
});

test('open: does not modify its input', () => {
  const input = [
    [1, 0, 1],
    [0, 1, 0],
    [1, 0, 1],
  ];
  const mask = maskFromGrid(input);
  mask.open();

  expect(
    checkMaskGrid(mask, input, {
      operation: 'open (input unchanged)',
      kernel: SAMPLE_KERNELS['3x3-ones'],
      input,
    }),
  ).toBeNull();
});

test('open: composite contract, idempotency and anti-extensivity', () => {
  expect(checkCompositeContract({ operation: 'open' })).toBeNull();
});
