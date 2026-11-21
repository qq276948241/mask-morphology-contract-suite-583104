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

test('GREY image 5x5', () => {
  const image = testUtils.createGreyImage([
    [255, 0, 255, 255, 255],
    [255, 0, 255, 255, 255],
    [255, 0, 255, 255, 255],
    [255, 0, 255, 255, 255],
    [255, 0, 255, 255, 255],
  ]);

  expect(image.erode()).toMatchImageData([
    [0, 0, 0, 255, 255],
    [0, 0, 0, 255, 255],
    [0, 0, 0, 255, 255],
    [0, 0, 0, 255, 255],
    [0, 0, 0, 255, 255],
  ]);
});

test('another GREY image 5x5', () => {
  const image = testUtils.createGreyImage([
    [255, 255, 255, 255, 255],
    [255, 255, 0, 255, 255],
    [255, 0, 0, 0, 255],
    [255, 255, 0, 255, 255],
    [255, 255, 255, 255, 255],
  ]);

  const expected = [
    [255, 0, 0, 0, 255],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [255, 0, 0, 0, 255],
  ];

  expect(image.erode()).toMatchImageData(expected);
});

test('GREY image 5x5, 1x3 onlyOnes kernel', () => {
  const kernel = [[1, 1, 1]];

  const image = testUtils.createGreyImage([
    [255, 255, 255, 255, 255],
    [255, 255, 0, 255, 255],
    [255, 0, 0, 0, 255],
    [255, 255, 0, 255, 255],
    [255, 255, 255, 255, 255],
  ]);

  const expected = [
    [255, 255, 255, 255, 255],
    [255, 0, 0, 0, 255],
    [0, 0, 0, 0, 0],
    [255, 0, 0, 0, 255],
    [255, 255, 255, 255, 255],
  ];

  expect(image.erode({ kernel })).toMatchImageData(expected);
});

test('GREY image 5x5, 1x3 kernel with zeros', () => {
  const kernel = [[1, 0, 1]];

  const image = testUtils.createGreyImage([
    [255, 255, 255, 255, 255],
    [255, 255, 0, 255, 255],
    [255, 0, 0, 0, 255],
    [255, 255, 0, 255, 255],
    [255, 255, 255, 255, 255],
  ]);

  const expected = [
    [255, 255, 255, 255, 255],
    [255, 0, 255, 0, 255],
    [0, 0, 0, 0, 0],
    [255, 0, 255, 0, 255],
    [255, 255, 255, 255, 255],
  ];

  expect(image.erode({ kernel })).toMatchImageData(expected);
});

test('mask 5x5', () => {
  const mask = testUtils.createMask(`
      1 0 1 1 1
      1 0 1 1 1
      1 0 1 1 1
      1 0 1 1 1
      1 0 1 1 1
    `);

  expect(mask.erode()).toMatchMaskData(`
        0 0 0 1 1
        0 0 0 1 1
        0 0 0 1 1
        0 0 0 1 1
        0 0 0 1 1
      `);
});

test('erode with 2 iterations', () => {
  const mask = testUtils.createMask(`
      1 0 1 1 1
      1 0 1 1 1
      1 0 1 1 1
      1 0 1 1 1
      1 0 1 1 1
    `);

  const expected = `
      0 0 0 0 1
      0 0 0 0 1
      0 0 0 0 1
      0 0 0 0 1
      0 0 0 0 1
    `;

  expect(mask.erode({ iterations: 2 })).toMatchMaskData(expected);
});

test('5x5 mask', () => {
  const mask = testUtils.createMask(`
      1 1 1 1 1
      1 1 0 1 1
      1 0 0 0 1
      1 1 0 1 1
      1 1 1 1 1
    `);

  expect(mask.erode()).toMatchMaskData(`
      1 0 0 0 1
      0 0 0 0 0
      0 0 0 0 0
      0 0 0 0 0
      1 0 0 0 1
    `);
});

test('another 5x5 mask', () => {
  const mask = testUtils.createMask(`
      1 1 0 1 1
      1 1 0 1 1
      0 0 0 0 0
      1 1 0 1 1
      1 1 0 1 1
    `);

  const expected = `
      1 0 0 0 1
      0 0 0 0 0
      0 0 0 0 0
      0 0 0 0 0
      1 0 0 0 1`;

  expect(mask.erode()).toMatchMaskData(expected);
});

test('mask 5x3, 3x1 kernel onlyOnes', () => {
  const kernel = [[1], [1], [1]];
  const mask = testUtils.createMask(`
      1 1 0
      1 0 0
      1 1 1
      0 0 1
      0 1 1
    `);

  const expected = `
      1 0 0
      1 0 0
      0 0 0
      0 0 1
      0 0 1
    `;

  expect(mask.erode({ kernel })).toMatchMaskData(expected);
});

test('mask 5x3, 3x1 kernel with zeros', () => {
  const kernel = [[1], [1], [0]];
  const mask = testUtils.createMask(`
      1 1 0
      1 0 0
      1 1 1
      0 0 1
      0 1 1
    `);

  const expected = `
      1 1 0
      1 0 0
      1 0 0
      0 0 1
      0 0 1
    `;

  expect(mask.erode({ kernel })).toMatchMaskData(expected);
});

test('mask 5x5, kernel with holes', () => {
  const kernel = [
    [1, 1, 1],
    [1, 0, 1],
    [1, 1, 1],
  ];
  const mask = testUtils.createMask(`
      1 1 1 1 1
      1 1 1 1 1
      1 1 1 0 1
      1 1 1 1 1
      1 1 1 1 1
    `);

  const expected = `
      1 1 1 1 1
      1 1 0 0 0
      1 1 0 1 0
      1 1 0 0 0
      1 1 1 1 1
    `;

  expect(mask.erode({ kernel })).toMatchMaskData(expected);
});

// ---------------------------------------------------------------------------
// Mask contract regressions.
//
// The reference implementation in `test/morphology.ts` shares no code with
// `src/morphology`. Every fixed sample below was pinned against that oracle;
// the seeded checks exhaustively enumerate every mask up to 9 bits and then
// sample larger ones with a fixed LCG seed, so a failure is replayable.
// ---------------------------------------------------------------------------

test('erode: single pixel, empty and full masks', () => {
  expect(
    checkMaskGrid(maskFromGrid([[1]]).erode(), [[1]], {
      operation: 'erode',
      kernel: SAMPLE_KERNELS['3x3-ones'],
      input: [[1]],
    }),
  ).toBeNull();

  const empty = [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ];

  expect(
    checkMaskGrid(
      maskFromGrid(empty).erode(),
      [
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ],
      { operation: 'erode', kernel: SAMPLE_KERNELS['3x3-ones'], input: empty },
    ),
  ).toBeNull();

  const full = [
    [1, 1, 1, 1],
    [1, 1, 1, 1],
    [1, 1, 1, 1],
    [1, 1, 1, 1],
  ];

  expect(
    checkMaskGrid(
      maskFromGrid(full).erode(),
      [
        [1, 1, 1, 1],
        [1, 1, 1, 1],
        [1, 1, 1, 1],
        [1, 1, 1, 1],
      ],
      { operation: 'erode', kernel: SAMPLE_KERNELS['3x3-ones'], input: full },
    ),
  ).toBeNull();
});

test('erode: narrow 1x5 and 5x1 masks with a 1x3 / 3x1 kernel', () => {
  expect(
    checkMaskGrid(
      maskFromGrid([[1, 0, 1, 1, 0]]).erode({
        kernel: SAMPLE_KERNELS['1x3'],
      }),
      [[0, 0, 0, 0, 0]],
      {
        operation: 'erode',
        kernel: SAMPLE_KERNELS['1x3'],
        input: [[1, 0, 1, 1, 0]],
      },
    ),
  ).toBeNull();

  expect(
    checkMaskGrid(
      maskFromGrid([[1], [0], [1], [1], [0]]).erode({
        kernel: SAMPLE_KERNELS['3x1'],
      }),
      [[0], [0], [0], [0], [0]],
      {
        operation: 'erode',
        kernel: SAMPLE_KERNELS['3x1'],
        input: [[1], [0], [1], [1], [0]],
      },
    ),
  ).toBeNull();
});

test('erode: kernel larger than the image keeps only border-skipped samples', () => {
  const input = [
    [1, 0, 0],
    [1, 0, 0],
    [1, 0, 0],
  ];

  // The 5x5 kernel is bigger than the 3x3 mask: each output pixel only sees
  // in-bounds samples, and the right column samples a zero, so everything goes
  // to zero instead of keeping the left column.
  expect(
    checkMaskGrid(
      maskFromGrid(input).erode({ kernel: SAMPLE_KERNELS['5x5-ones'] }),
      [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
      ],
      { operation: 'erode', kernel: SAMPLE_KERNELS['5x5-ones'], input },
    ),
  ).toBeNull();

  expect(
    checkMaskGrid(
      maskFromGrid([[1]]).erode({ kernel: SAMPLE_KERNELS['5x5-ones'] }),
      [[1]],
      { operation: 'erode', kernel: SAMPLE_KERNELS['5x5-ones'], input: [[1]] },
    ),
  ).toBeNull();
});

test('erode: kernel anchor on the top-left and bottom-right corners', () => {
  const input = [
    [1, 1, 1],
    [1, 0, 1],
    [1, 1, 1],
  ];

  expect(
    checkMaskGrid(
      maskFromGrid(input).erode({
        kernel: ASYMMETRIC_KERNELS['3x3-corner-top-left'],
      }),
      [
        [1, 1, 1],
        [1, 1, 1],
        [1, 1, 0],
      ],
      {
        operation: 'erode',
        kernel: ASYMMETRIC_KERNELS['3x3-corner-top-left'],
        input,
      },
    ),
  ).toBeNull();

  expect(
    checkMaskGrid(
      maskFromGrid(input).erode({
        kernel: ASYMMETRIC_KERNELS['3x3-lower-right'],
      }),
      [
        [0, 0, 0],
        [0, 0, 1],
        [0, 1, 1],
      ],
      {
        operation: 'erode',
        kernel: ASYMMETRIC_KERNELS['3x3-lower-right'],
        input,
      },
    ),
  ).toBeNull();
});

test('erode: diagonal line disappears with a cross kernel', () => {
  const input = [
    [1, 0, 0, 0, 0],
    [0, 1, 0, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 0, 1, 0],
    [0, 0, 0, 0, 1],
  ];

  expect(
    checkMaskGrid(
      maskFromGrid(input).erode({ kernel: SAMPLE_KERNELS['3x3-cross'] }),
      [
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0],
      ],
      { operation: 'erode', kernel: SAMPLE_KERNELS['3x3-cross'], input },
    ),
  ).toBeNull();
});

test('erode: edge-touching connected components lose their border', () => {
  const input = [
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 1, 1, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
  ];

  expect(
    checkMaskGrid(
      maskFromGrid(input).erode(),
      [
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0],
      ],
      { operation: 'erode', kernel: SAMPLE_KERNELS['3x3-ones'], input },
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
      maskFromGrid(corner).erode(),
      [
        [1, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ],
      { operation: 'erode', kernel: SAMPLE_KERNELS['3x3-ones'], input: corner },
    ),
  ).toBeNull();
});

test('erode: kernel with a hole in the anchor cell', () => {
  const input = [
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
    [1, 1, 1, 0, 1],
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
  ];

  expect(
    checkMaskGrid(
      maskFromGrid(input).erode({ kernel: SAMPLE_KERNELS['3x3-ring'] }),
      [
        [1, 1, 1, 1, 1],
        [1, 1, 0, 0, 0],
        [1, 1, 0, 1, 0],
        [1, 1, 0, 0, 0],
        [1, 1, 1, 1, 1],
      ],
      { operation: 'erode', kernel: SAMPLE_KERNELS['3x3-ring'], input },
    ),
  ).toBeNull();
});

test('erode: does not modify its input', () => {
  const input = [
    [1, 0, 1],
    [0, 1, 0],
    [1, 0, 1],
  ];
  const mask = maskFromGrid(input);
  mask.erode({ kernel: SAMPLE_KERNELS['3x3-ones'] });

  expect(
    checkMaskGrid(mask, input, {
      operation: 'erode (input unchanged)',
      kernel: SAMPLE_KERNELS['3x3-ones'],
      input,
    }),
  ).toBeNull();
});

test('erode: rejects even-sized kernels', () => {
  for (const [label, kernel] of Object.entries(EVEN_KERNELS)) {
    expect(checkKernelRejection(kernel, label)).toBeNull();
  }
});

test('erode: pointwise contract against the independent oracle', () => {
  expect(checkScanContract({ operation: 'erode' })).toBeNull();
});

test('erode: pointwise contract with asymmetric kernels only', () => {
  expect(
    checkScanContract({
      operation: 'erode',
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
