import { expect, test } from 'vitest';

import {
  ASYMMETRIC_KERNELS,
  EVEN_KERNELS,
  SAMPLE_KERNELS,
  checkKernelRejection,
  checkMaskGrid,
  checkScanContract,
  maskFromGrid,
} from '../../../test/morphology.ts';

test('another GREY image 5x5, default kernel', () => {
  const image = testUtils.createGreyImage([
    [255, 0, 0, 0, 255],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [255, 0, 0, 0, 255],
  ]);

  expect(image.dilate()).toMatchImageData([
    [255, 255, 0, 255, 255],
    [255, 255, 0, 255, 255],
    [0, 0, 0, 0, 0],
    [255, 255, 0, 255, 255],
    [255, 255, 0, 255, 255],
  ]);
});

test('GREY image 5x5, 3x3 kernel onlyOnes', () => {
  const kernel = [
    [1, 1, 1],
    [1, 1, 1],
    [1, 1, 1],
  ];
  const image = testUtils.createGreyImage([
    [255, 0, 0, 0, 255],
    [255, 0, 0, 0, 255],
    [255, 0, 0, 0, 255],
    [255, 0, 0, 0, 255],
    [255, 0, 0, 0, 255],
  ]);

  expect(image.dilate({ kernel })).toMatchImageData([
    [255, 255, 0, 255, 255],
    [255, 255, 0, 255, 255],
    [255, 255, 0, 255, 255],
    [255, 255, 0, 255, 255],
    [255, 255, 0, 255, 255],
  ]);
});

test('another GREY image 5x5, default kernel, 2 iterations', () => {
  const image = testUtils.createGreyImage([
    [255, 0, 0, 0, 255],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
  ]);

  expect(image.dilate({ iterations: 2 })).toMatchImageData([
    [255, 255, 255, 255, 255],
    [255, 255, 255, 255, 255],
    [255, 255, 255, 255, 255],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
  ]);
});

test('GREY image 5x5, 3x1 kernel onlyOnes', () => {
  const kernel = [[1], [1], [1]];
  const image = testUtils.createGreyImage([
    [255, 0, 0, 0, 255],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [255, 0, 0, 0, 255],
  ]);

  expect(image.dilate({ kernel })).toMatchImageData([
    [255, 0, 0, 0, 255],
    [255, 0, 0, 0, 255],
    [0, 0, 0, 0, 0],
    [255, 0, 0, 0, 255],
    [255, 0, 0, 0, 255],
  ]);
});

test('GREY image 5x5, 3x1 kernel with zero', () => {
  const kernel = [[1], [1], [0]];
  const image = testUtils.createGreyImage([
    [255, 0, 0, 0, 255],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [255, 0, 0, 0, 255],
  ]);

  expect(image.dilate({ kernel })).toMatchImageData([
    [255, 0, 0, 0, 255],
    [255, 0, 0, 0, 255],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [255, 0, 0, 0, 255],
  ]);
});

test('mask 5x5, default kernel', () => {
  const mask = testUtils.createMask(`
      1 0 0 0 1
      0 0 0 0 0
      0 0 0 0 0
      0 0 0 0 0
      1 0 0 0 1
    `);

  const expected = testUtils.createMask(`
      1 1 0 1 1
      1 1 0 1 1
      0 0 0 0 0
      1 1 0 1 1
      1 1 0 1 1
    `);

  expect(mask.dilate()).toMatchMask(expected);
});

test('mask 5x5, 1x3 kernel onlyOnes', () => {
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

test('mask 5x5, 1x3 kernel with zero', () => {
  const kernel = [[1, 0, 1]];

  const mask = testUtils.createMask(`
      1 0 0 0 1
      0 0 0 0 0
      0 0 0 0 0
      0 0 0 0 0
      1 0 0 0 1
    `);

  const expected = testUtils.createMask(`
      0 1 0 1 0
      0 0 0 0 0
      0 0 0 0 0
      0 0 0 0 0
      0 1 0 1 0
    `);

  expect(mask.dilate({ kernel })).toMatchMask(expected);
});

// ---------------------------------------------------------------------------
// Mask contract regressions (see `test/morphology.ts` for the oracle).
// ---------------------------------------------------------------------------

test('dilate: single pixel, empty and full masks', () => {
  expect(
    checkMaskGrid(maskFromGrid([[0]]).dilate(), [[0]], {
      operation: 'dilate',
      kernel: SAMPLE_KERNELS['3x3-ones'],
      input: [[0]],
    }),
  ).toBeNull();

  const empty = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];

  expect(
    checkMaskGrid(
      maskFromGrid(empty).dilate(),
      [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
      ],
      { operation: 'dilate', kernel: SAMPLE_KERNELS['3x3-ones'], input: empty },
    ),
  ).toBeNull();

  const full = [
    [1, 1, 1],
    [1, 1, 1],
    [1, 1, 1],
  ];

  expect(
    checkMaskGrid(
      maskFromGrid(full).dilate(),
      [
        [1, 1, 1],
        [1, 1, 1],
        [1, 1, 1],
      ],
      { operation: 'dilate', kernel: SAMPLE_KERNELS['3x3-ones'], input: full },
    ),
  ).toBeNull();
});

test('dilate: narrow 1x5 and 5x1 masks with a 1x3 / 3x1 kernel', () => {
  expect(
    checkMaskGrid(
      maskFromGrid([[1, 0, 1, 1, 0]]).dilate({
        kernel: SAMPLE_KERNELS['1x3'],
      }),
      [[1, 1, 1, 1, 1]],
      {
        operation: 'dilate',
        kernel: SAMPLE_KERNELS['1x3'],
        input: [[1, 0, 1, 1, 0]],
      },
    ),
  ).toBeNull();

  expect(
    checkMaskGrid(
      maskFromGrid([[1], [0], [1], [1], [0]]).dilate({
        kernel: SAMPLE_KERNELS['3x1'],
      }),
      [[1], [1], [1], [1], [1]],
      {
        operation: 'dilate',
        kernel: SAMPLE_KERNELS['3x1'],
        input: [[1], [0], [1], [1], [0]],
      },
    ),
  ).toBeNull();
});

test('dilate: kernel larger than the image floods the whole mask', () => {
  const input = [
    [1, 0, 0],
    [1, 0, 0],
    [1, 0, 0],
  ];

  expect(
    checkMaskGrid(
      maskFromGrid(input).dilate({ kernel: SAMPLE_KERNELS['5x5-ones'] }),
      [
        [1, 1, 1],
        [1, 1, 1],
        [1, 1, 1],
      ],
      { operation: 'dilate', kernel: SAMPLE_KERNELS['5x5-ones'], input },
    ),
  ).toBeNull();
});

test('dilate: kernel anchor on the top-left and bottom-right corners', () => {
  const input = [
    [1, 1, 1],
    [1, 0, 1],
    [1, 1, 1],
  ];

  expect(
    checkMaskGrid(
      maskFromGrid(input).dilate({
        kernel: ASYMMETRIC_KERNELS['3x3-corner-top-left'],
      }),
      [
        [0, 0, 0],
        [0, 1, 1],
        [0, 1, 0],
      ],
      {
        operation: 'dilate',
        kernel: ASYMMETRIC_KERNELS['3x3-corner-top-left'],
        input,
      },
    ),
  ).toBeNull();

  expect(
    checkMaskGrid(
      maskFromGrid(input).dilate({
        kernel: ASYMMETRIC_KERNELS['3x3-lower-right'],
      }),
      [
        [1, 1, 1],
        [1, 1, 1],
        [1, 1, 1],
      ],
      {
        operation: 'dilate',
        kernel: ASYMMETRIC_KERNELS['3x3-lower-right'],
        input,
      },
    ),
  ).toBeNull();
});

test('dilate: diagonal line is thickened perpendicular to itself', () => {
  const input = [
    [1, 0, 0, 0, 0],
    [0, 1, 0, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 0, 1, 0],
    [0, 0, 0, 0, 1],
  ];

  expect(
    checkMaskGrid(
      maskFromGrid(input).dilate({ kernel: SAMPLE_KERNELS['3x3-cross'] }),
      [
        [1, 1, 0, 0, 0],
        [1, 1, 1, 0, 0],
        [0, 1, 1, 1, 0],
        [0, 0, 1, 1, 1],
        [0, 0, 0, 1, 1],
      ],
      { operation: 'dilate', kernel: SAMPLE_KERNELS['3x3-cross'], input },
    ),
  ).toBeNull();
});

test('dilate: edge-touching connected components grow inward and outward', () => {
  const input = [
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 1, 1, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
  ];

  expect(
    checkMaskGrid(
      maskFromGrid(input).dilate(),
      [
        [1, 1, 0, 0, 0],
        [1, 1, 1, 1, 0],
        [1, 1, 1, 1, 0],
        [1, 1, 1, 1, 0],
        [0, 0, 0, 0, 0],
      ],
      { operation: 'dilate', kernel: SAMPLE_KERNELS['3x3-ones'], input },
    ),
  ).toBeNull();

  const corner = [
    [1, 1, 0, 0],
    [1, 1, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ];

  expect(
    checkMaskGrid(
      maskFromGrid(corner).dilate(),
      [
        [1, 1, 1, 0],
        [1, 1, 1, 0],
        [1, 1, 1, 0],
        [0, 0, 0, 0],
      ],
      {
        operation: 'dilate',
        kernel: SAMPLE_KERNELS['3x3-ones'],
        input: corner,
      },
    ),
  ).toBeNull();
});

test('dilate: does not modify its input', () => {
  const input = [
    [1, 0, 1],
    [0, 1, 0],
    [1, 0, 1],
  ];
  const mask = maskFromGrid(input);
  mask.dilate({ kernel: SAMPLE_KERNELS['3x3-ones'] });

  expect(
    checkMaskGrid(mask, input, {
      operation: 'dilate (input unchanged)',
      kernel: SAMPLE_KERNELS['3x3-ones'],
      input,
    }),
  ).toBeNull();
});

test('dilate: rejects even-sized kernels', () => {
  for (const [label, kernel] of Object.entries(EVEN_KERNELS)) {
    expect(checkKernelRejection(kernel, label)).toBeNull();
  }
});

test('dilate: pointwise contract against the independent oracle', () => {
  expect(checkScanContract({ operation: 'dilate' })).toBeNull();
});

test('dilate: pointwise contract with asymmetric kernels only', () => {
  expect(
    checkScanContract({
      operation: 'dilate',
      kernels: ASYMMETRIC_KERNELS,
      sizes: [
        [1, 1],
        [1, 2],
        [2, 1],
        [1, 3],
        [3, 1],
        [2, 2],
        [2, 3],
        [3, 2],
        [3, 3],
        [1, 5],
        [5, 1],
      ],
      iterations: [1],
      checkDual: false,
    }),
  ).toBeNull();
});
