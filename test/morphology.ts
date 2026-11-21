import { Mask } from '../src/Mask.ts';

/**
 * A binary mask represented as rows of bits. Row 0 is the top row and column 0
 * is the left column, matching `Mask#getBit(column, row)`.
 */
export type BitGrid = number[][];

/**
 * Structuring element. Only entries equal to 1 belong to the element; every
 * other value (including 0) is ignored. Dimensions must be odd.
 */
export type MorphKernel = number[][];

/**
 * Pointwise operation performed by the reference implementation.
 */
export type ScanOperation = 'erode' | 'dilate';

/**
 * Composite operation performed by the reference implementation.
 */
export type CompositeOperation = 'open' | 'close';

/**
 * Coordinates of the structuring element anchor inside its kernel.
 */
export interface KernelAnchor {
  row: number;
  column: number;
}

/**
 * Mask dimensions, in `[width, height]` order.
 */
export type MaskSize = [width: number, height: number];

/**
 * Options controlling the deterministic generation of test inputs.
 */
export interface InputGenerationOptions {
  /** Seed of the deterministic pseudo-random generator. */
  seed: number;
  /** Masks up to and including this many bits are enumerated exhaustively. */
  exhaustiveMaxBits: number;
  /** Number of deterministic random masks generated for larger sizes. */
  sampledInputs: number;
}

/**
 * Everything needed to reproduce a failure: operation, kernel, anchor and the
 * original input mask. It is rendered verbatim in assertion messages.
 */
export interface MaskExpectationContext {
  operation: string;
  kernel: MorphKernel;
  input: BitGrid;
  iterations?: number;
}

/**
 * Options for the erosion/dilation contract runner.
 */
export interface ScanContractOptions {
  operation: ScanOperation;
  kernels?: Record<string, MorphKernel>;
  sizes?: MaskSize[];
  seed?: number;
  /** Masks up to and including this many bits are enumerated exhaustively. */
  exhaustiveMaxBits?: number;
  /** Number of deterministic random masks generated for larger sizes. */
  sampledInputs?: number;
  iterations?: number[];
  checkDual?: boolean;
}

/**
 * Options for the opening/closing contract runner.
 */
export interface CompositeContractOptions {
  operation: CompositeOperation;
  kernels?: Record<string, MorphKernel>;
  sizes?: MaskSize[];
  seed?: number;
  /** Masks up to and including this many bits are enumerated exhaustively. */
  exhaustiveMaxBits?: number;
  /** Number of deterministic random masks generated for larger sizes. */
  sampledInputs?: number;
  iterations?: number[];
}

/**
 * Fixed seed shared by every seeded check. Keep it stable so that a failing
 * sample can be replayed after the implementation changes.
 */
export const MASK_CONTRACT_SEED = 20_261_121;

/**
 * Sizes exercised by the exhaustive and sampled checks. They deliberately
 * include 1-pixel, single-row, single-column and rectangular masks.
 */
export const SAMPLE_SIZES: MaskSize[] = [
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
  [2, 5],
  [5, 2],
  [3, 4],
  [4, 3],
  [4, 4],
];

/**
 * Symmetric structuring elements: they equal their own 180-degree rotation.
 * With them, opening and closing are idempotent and the classic
 * anti-extensive/extensive properties hold.
 */
export const SAMPLE_KERNELS: Record<string, MorphKernel> = {
  '1x1': [[1]],
  '1x3': [[1, 1, 1]],
  '3x1': [[1], [1], [1]],
  '3x3-ones': [
    [1, 1, 1],
    [1, 1, 1],
    [1, 1, 1],
  ],
  '3x3-cross': [
    [0, 1, 0],
    [1, 1, 1],
    [0, 1, 0],
  ],
  '3x3-ring': [
    [1, 1, 1],
    [1, 0, 1],
    [1, 1, 1],
  ],
  '3x5-ones': [
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
  ],
  '5x3-ones': [
    [1, 1, 1],
    [1, 1, 1],
    [1, 1, 1],
    [1, 1, 1],
    [1, 1, 1],
  ],
  '5x5-ones': [
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
  ],
};

/**
 * Asymmetric (non point-symmetric) kernels. They expose the anchor and the
 * out-of-bounds convention because the sampled neighbourhood is not mirrored.
 */
export const ASYMMETRIC_KERNELS: Record<string, MorphKernel> = {
  '1x3-left': [[1, 0, 0]],
  '1x3-right': [[0, 0, 1]],
  '1x3-trailing-gap': [[1, 1, 0]],
  '3x1-top': [[1], [1], [0]],
  '3x1-bottom': [[0], [1], [1]],
  '3x3-corner-top-left': [
    [1, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ],
  '3x3-step': [
    [1, 1, 0],
    [1, 0, 0],
    [0, 0, 0],
  ],
  '3x3-lower-right': [
    [0, 0, 1],
    [0, 1, 1],
    [1, 1, 1],
  ],
  '1x5-sparse': [[0, 1, 1, 0, 1]],
};

/**
 * Kernels with an even number of rows or columns. The public contract rejects
 * them with a `TypeError` before any scan happens.
 */
export const EVEN_KERNELS: Record<string, MorphKernel> = {
  '1x2': [[1, 1]],
  '2x1': [[1], [1]],
  '2x2': [
    [1, 1],
    [1, 1],
  ],
  '1x4': [[1, 1, 1, 1]],
  '4x1': [[1], [1], [1], [1]],
};

/**
 * Returns the anchor of a kernel: the pixel the kernel is centred on.
 * @param kernel - Structuring element.
 * @returns The anchor coordinates. They are fractional for even-sized kernels.
 */
export function kernelAnchor(kernel: MorphKernel): KernelAnchor {
  return {
    row: (kernel.length - 1) / 2,
    column: (kernel[0].length - 1) / 2,
  };
}

/**
 * Checks whether a kernel is symmetric with respect to its anchor. Opening and
 * closing with such a kernel are idempotent, which is not true in general.
 * @param kernel - Structuring element.
 * @returns Whether the kernel equals its own 180-degree rotation.
 */
export function isSymmetricKernel(kernel: MorphKernel): boolean {
  const anchor = kernelAnchor(kernel);
  for (let row = 0; row < kernel.length; row++) {
    for (let column = 0; column < kernel[0].length; column++) {
      const mirrorRow = Math.round(2 * anchor.row - row);
      const mirrorColumn = Math.round(2 * anchor.column - column);
      if (kernel[row][column] !== kernel[mirrorRow][mirrorColumn]) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Checks whether the anchor cell of a kernel is part of the element. For a
 * symmetric kernel that includes its anchor, opening is anti-extensive and
 * closing is extensive.
 * @param kernel - Structuring element.
 * @returns Whether the anchor is a 1 entry.
 */
export function kernelIncludesCenter(kernel: MorphKernel): boolean {
  const anchor = kernelAnchor(kernel);
  return kernel[anchor.row][anchor.column] === 1;
}

/**
 * Deep-copies a grid so callers cannot mutate a shared fixture.
 * @param grid - Grid to clone.
 * @returns A deep copy of the grid.
 */
export function cloneGrid(grid: BitGrid): BitGrid {
  return grid.map((row) => [...row]);
}

/**
 * Builds a `Mask` from a bit grid using the public constructor.
 * @param grid - Mask data.
 * @returns The new mask.
 */
export function maskFromGrid(grid: BitGrid): Mask {
  const height = grid.length;
  if (height === 0) {
    throw new RangeError('a mask needs at least one row');
  }
  const width = grid[0].length;
  if (width === 0) {
    throw new RangeError('a mask needs at least one column');
  }
  const data = new Uint8Array(width * height);
  for (let row = 0; row < height; row++) {
    if (grid[row].length !== width) {
      throw new RangeError(`row ${row} does not have width ${width}`);
    }
    for (let column = 0; column < width; column++) {
      data[row * width + column] = grid[row][column];
    }
  }
  return new Mask(width, height, { data });
}

/**
 * Converts a mask to a bit grid using the public bit accessor.
 * @param mask - Mask to read.
 * @returns The corresponding grid.
 */
export function maskToGrid(mask: Mask): BitGrid {
  const grid: BitGrid = [];
  for (let row = 0; row < mask.height; row++) {
    const line: number[] = [];
    for (let column = 0; column < mask.width; column++) {
      line.push(mask.getBit(column, row));
    }
    grid.push(line);
  }
  return grid;
}

/**
 * Independent per-pixel reference implementation of erosion and dilation.
 *
 * It deliberately shares no code with `src/morphology`: it works on plain
 * number grids and re-derives the anchor and the out-of-bounds rule from the
 * documented convention:
 *
 * - the anchor is the kernel centre `((rows - 1) / 2, (columns - 1) / 2)`;
 * - a kernel cell is sampled at `output + kernelOffset - anchor`;
 * - samples outside the mask are skipped, never treated as 0 or 1;
 * - erosion starts from 1 and is cleared by a 0 sample;
 * - dilation starts from 0 and is set by a 1 sample.
 * @param input - Input mask grid.
 * @param kernel - Structuring element.
 * @param operation - Erosion or dilation.
 * @returns The resulting grid.
 */
export function referenceScan(
  input: BitGrid,
  kernel: MorphKernel,
  operation: ScanOperation,
): BitGrid {
  const height = input.length;
  const width = input[0].length;
  const anchor = kernelAnchor(kernel);
  if (!Number.isInteger(anchor.row) || !Number.isInteger(anchor.column)) {
    throw new RangeError(
      'the reference implementation only supports odd-sized kernels',
    );
  }

  const result: BitGrid = [];
  for (let row = 0; row < height; row++) {
    const resultRow: number[] = [];
    for (let column = 0; column < width; column++) {
      let value = operation === 'erode' ? 1 : 0;
      for (let kernelRow = 0; kernelRow < kernel.length; kernelRow++) {
        for (
          let kernelColumn = 0;
          kernelColumn < kernel[0].length;
          kernelColumn++
        ) {
          if (kernel[kernelRow][kernelColumn] !== 1) continue;
          const sampleColumn = column + kernelColumn - anchor.column;
          const sampleRow = row + kernelRow - anchor.row;
          if (
            sampleColumn < 0 ||
            sampleRow < 0 ||
            sampleColumn >= width ||
            sampleRow >= height
          ) {
            continue;
          }
          const sample = input[sampleRow][sampleColumn];
          if (operation === 'erode') {
            if (sample === 0) value = 0;
          } else if (sample === 1) {
            value = 1;
          }
        }
      }
      resultRow.push(value);
    }
    result.push(resultRow);
  }
  return result;
}

/**
 * Applies the reference scan several times, matching `iterations`.
 * @param input - Input mask grid.
 * @param kernel - Structuring element.
 * @param operation - Erosion or dilation.
 * @param iterations - Number of passes.
 * @returns The resulting grid.
 */
export function referenceIterate(
  input: BitGrid,
  kernel: MorphKernel,
  operation: ScanOperation,
  iterations: number,
): BitGrid {
  let current = cloneGrid(input);
  for (let iteration = 0; iteration < iterations; iteration++) {
    current = referenceScan(current, kernel, operation);
  }
  return current;
}

/**
 * Reference opening: dilation of the erosion, `iterations` times.
 * @param input - Input mask grid.
 * @param kernel - Structuring element.
 * @param iterations - Number of opening iterations.
 * @returns The resulting grid.
 */
export function referenceOpen(
  input: BitGrid,
  kernel: MorphKernel,
  iterations = 1,
): BitGrid {
  let current = cloneGrid(input);
  for (let iteration = 0; iteration < iterations; iteration++) {
    current = referenceScan(current, kernel, 'erode');
    current = referenceScan(current, kernel, 'dilate');
  }
  return current;
}

/**
 * Reference closing: erosion of the dilation, `iterations` times.
 * @param input - Input mask grid.
 * @param kernel - Structuring element.
 * @param iterations - Number of closing iterations.
 * @returns The resulting grid.
 */
export function referenceClose(
  input: BitGrid,
  kernel: MorphKernel,
  iterations = 1,
): BitGrid {
  let current = cloneGrid(input);
  for (let iteration = 0; iteration < iterations; iteration++) {
    current = referenceScan(current, kernel, 'dilate');
    current = referenceScan(current, kernel, 'erode');
  }
  return current;
}

/**
 * Produces a deterministic sequence of masks. Small sizes are enumerated
 * exhaustively in row-major bit order; larger ones use a seeded LCG so that a
 * failure can always be replayed. No `Math.random` is involved.
 * @param width - Mask width.
 * @param height - Mask height.
 * @param options - Generation options.
 * @returns The generated grids.
 */
export function generateInputs(
  width: number,
  height: number,
  options: InputGenerationOptions,
): BitGrid[] {
  const size = width * height;
  const inputs: BitGrid[] = [];

  if (size <= options.exhaustiveMaxBits) {
    const total = 2 ** size;
    for (let bits = 0; bits < total; bits++) {
      const grid: BitGrid = [];
      for (let row = 0; row < height; row++) {
        const line: number[] = [];
        for (let column = 0; column < width; column++) {
          const index = row * width + column;
          line.push((bits >> index) & 1);
        }
        grid.push(line);
      }
      inputs.push(grid);
    }
    return inputs;
  }

  const random = createDeterministicRandom(options.seed);
  for (let sample = 0; sample < options.sampledInputs; sample++) {
    const grid: BitGrid = [];
    for (let row = 0; row < height; row++) {
      const line: number[] = [];
      for (let column = 0; column < width; column++) {
        line.push(random() < 0.5 ? 0 : 1);
      }
      grid.push(line);
    }
    inputs.push(grid);
  }
  return inputs;
}

/**
 * Deterministic pseudo-random generator (numerical recipes LCG).
 * @param seed - Initial state.
 * @returns A function returning numbers in `[0, 1)`.
 */
function createDeterministicRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return state / 4_294_967_296;
  };
}

/**
 * Formats a grid with column and row headers for assertion messages.
 * @param grid - Grid to format.
 * @returns A multi-line string.
 */
export function formatGrid(grid: BitGrid): string {
  const width = grid.length > 0 ? grid[0].length : 0;
  const header = `        ${Array.from({ length: width }, (_, index) =>
    String(index % 10),
  ).join(' ')}`;
  const lines = grid.map(
    (row, index) => `  row ${String(index).padStart(2, ' ')} ${row.join(' ')}`,
  );
  return [header, ...lines].join('\n');
}

/**
 * Formats a kernel together with its anchor.
 * @param kernel - Structuring element.
 * @returns A multi-line string.
 */
export function formatKernel(kernel: MorphKernel): string {
  const rows = kernel.length;
  const columns = kernel[0].length;
  const anchor = kernelAnchor(kernel);
  const anchorText =
    Number.isInteger(anchor.row) && Number.isInteger(anchor.column)
      ? `{ row: ${anchor.row}, column: ${anchor.column} }`
      : 'undefined (even kernel)';
  const body = kernel.map((row) => `    [${row.join(', ')}]`).join('\n');
  return `  size ${rows}x${columns}, anchor ${anchorText}\n${body}`;
}

/**
 * Renders the reproducer block shared by every failure message.
 * @param context - Expectation context.
 * @returns The formatted context.
 */
function contextBlock(context: MaskExpectationContext): string {
  const iterations = context.iterations ?? 1;
  return [
    `  operation: ${context.operation} (iterations: ${iterations})`,
    '  kernel:',
    formatKernel(context.kernel),
    `  input (${context.input[0].length}x${context.input.length}):`,
    formatGrid(context.input),
  ].join('\n');
}

/**
 * Compares a mask with an expected grid and returns a reproducer on mismatch.
 *
 * It checks dimensions, `size`, the binary metadata, the bit ordering
 * (`getBit(column, row) === data[row * width + column]`) and every pixel. The
 * message contains the operation, kernel, anchor, input mask, both grids and
 * the first mismatching pixel, so the failure can be located exactly.
 * @param received - Observed mask.
 * @param expected - Expected grid.
 * @param context - Reproducer context.
 * @returns `null` on success, a detailed message otherwise.
 */
export function checkMaskGrid(
  received: Mask,
  expected: BitGrid,
  context: MaskExpectationContext,
): string | null {
  const expectedHeight = expected.length;
  const expectedWidth = expected[0].length;
  if (
    received.width !== expectedWidth ||
    received.height !== expectedHeight ||
    received.size !== expectedWidth * expectedHeight
  ) {
    return [
      `geometry mismatch: expected ${expectedWidth}x${expectedHeight} ` +
        `(size ${expectedWidth * expectedHeight}), received ` +
        `${received.width}x${received.height} (size ${received.size})`,
      contextBlock(context),
    ].join('\n');
  }

  if (received.bitDepth !== 1 || received.colorModel !== 'BINARY') {
    return [
      `metadata mismatch: expected BITDEPTH 1 / BINARY, received ` +
        `bitDepth ${received.bitDepth} / ${received.colorModel}`,
      contextBlock(context),
    ].join('\n');
  }

  const raw = received.getRawImage().data;
  for (let row = 0; row < expectedHeight; row++) {
    for (let column = 0; column < expectedWidth; column++) {
      const bit = received.getBit(column, row);
      const rawIndex = row * expectedWidth + column;
      if (bit !== raw[rawIndex]) {
        return [
          `bit ordering mismatch at column ${column}, row ${row}: ` +
            `getBit() returned ${bit} but raw index ${rawIndex} contains ` +
            `${raw[rawIndex]}`,
          contextBlock(context),
        ].join('\n');
      }
    }
  }

  for (let row = 0; row < expectedHeight; row++) {
    for (let column = 0; column < expectedWidth; column++) {
      const bit = received.getBit(column, row);
      if (bit !== expected[row][column]) {
        return [
          `first mismatch at column ${column}, row ${row}: expected ` +
            `${expected[row][column]}, received ${bit}`,
          contextBlock(context),
          '  expected:',
          formatGrid(expected),
          '  received:',
          formatGrid(maskToGrid(received)),
        ].join('\n');
      }
    }
  }
  return null;
}

/**
 * Compares two masks with the diagnostics of {@link checkMaskGrid}.
 * @param received - Observed mask.
 * @param expected - Expected mask.
 * @param context - Reproducer context.
 * @returns `null` on success, a detailed message otherwise.
 */
export function checkMaskEquals(
  received: Mask,
  expected: Mask,
  context: MaskExpectationContext,
): string | null {
  return checkMaskGrid(received, maskToGrid(expected), context);
}

/**
 * Checks one operation against the reference oracle, the `iterations`
 * semantics, the optional complement relation and the absence of input
 * mutation.
 * @param operation - Erosion or dilation.
 * @param mask - Input mask.
 * @param input - Original input grid.
 * @param kernel - Structuring element.
 * @param iterations - Numbers of passes to check.
 * @param checkDual - Whether to check the complement relation.
 * @returns `null` on success, a detailed message otherwise.
 */
function checkScan(
  operation: ScanOperation,
  mask: Mask,
  input: BitGrid,
  kernel: MorphKernel,
  iterations: number[],
  checkDual: boolean,
): string | null {
  for (const count of iterations) {
    const context: MaskExpectationContext = {
      operation,
      kernel,
      input,
      iterations: count,
    };
    const received = mask[operation]({ kernel, iterations: count });
    const expected = referenceIterate(input, kernel, operation, count);
    const mismatch = checkMaskGrid(received, expected, context);
    if (mismatch !== null) return mismatch;
  }

  const context: MaskExpectationContext = { operation, kernel, input };
  if (checkDual) {
    const dual =
      operation === 'erode'
        ? mask.invert().dilate({ kernel }).invert()
        : mask.invert().erode({ kernel }).invert();
    const primary = mask[operation]({ kernel });
    const mismatch = checkMaskGrid(dual, maskToGrid(primary), {
      ...context,
      operation: `dual(${operation})`,
    });
    if (mismatch !== null) return mismatch;
  }

  return checkMaskGrid(mask, input, {
    ...context,
    operation: `${operation} (input unchanged)`,
  });
}

/**
 * Runs the erosion/dilation contract over deterministic inputs.
 * @param options - Contract options.
 * @returns `null` on success, a full reproducer on the first mismatch.
 */
export function checkScanContract(options: ScanContractOptions): string | null {
  const {
    operation,
    kernels = { ...SAMPLE_KERNELS, ...ASYMMETRIC_KERNELS },
    sizes = SAMPLE_SIZES,
    seed = MASK_CONTRACT_SEED,
    exhaustiveMaxBits = 9,
    sampledInputs = 40,
    iterations = [1, 2],
    checkDual = true,
  } = options;
  const generation = { seed, exhaustiveMaxBits, sampledInputs };

  for (const kernelName of Object.keys(kernels)) {
    const kernel = kernels[kernelName];
    for (const [width, height] of sizes) {
      for (const input of generateInputs(width, height, generation)) {
        const failure = checkScan(
          operation,
          maskFromGrid(input),
          input,
          kernel,
          iterations,
          checkDual,
        );
        if (failure !== null) {
          return [
            failure,
            `  kernel name: "${kernelName}"`,
            `  reproducible input: ${JSON.stringify(input)}`,
          ].join('\n');
        }
      }
    }
  }
  return null;
}

/**
 * Checks an opening or closing against the reference oracle, the idempotency
 * property of symmetric kernels, the anti-extensive/extensive property of
 * kernels that include their anchor, and the absence of input mutation.
 * @param operation - Opening or closing.
 * @param mask - Input mask.
 * @param input - Original input grid.
 * @param kernel - Structuring element.
 * @param iterations - Numbers of passes to check.
 * @returns `null` on success, a detailed message otherwise.
 */
function checkComposite(
  operation: CompositeOperation,
  mask: Mask,
  input: BitGrid,
  kernel: MorphKernel,
  iterations: number[],
): string | null {
  for (const count of iterations) {
    const context: MaskExpectationContext = {
      operation,
      kernel,
      input,
      iterations: count,
    };
    const received = mask[operation]({ kernel, iterations: count });
    const expected =
      operation === 'open'
        ? referenceOpen(input, kernel, count)
        : referenceClose(input, kernel, count);
    const mismatch = checkMaskGrid(received, expected, context);
    if (mismatch !== null) return mismatch;
  }

  const context: MaskExpectationContext = { operation, kernel, input };
  const once = mask[operation]({ kernel });
  const onceGrid = maskToGrid(once);

  if (isSymmetricKernel(kernel)) {
    const twice = once[operation]({ kernel });
    const idempotency = checkMaskGrid(twice, onceGrid, {
      ...context,
      operation: `${operation} idempotency (applied twice)`,
    });
    if (idempotency !== null) return idempotency;

    if (kernelIncludesCenter(kernel)) {
      for (let row = 0; row < input.length; row++) {
        for (let column = 0; column < input[0].length; column++) {
          const original = input[row][column];
          const result = onceGrid[row][column];
          const violates =
            operation === 'open'
              ? result === 1 && original === 0
              : result === 0 && original === 1;
          if (violates) {
            const relation =
              operation === 'open' ? 'anti-extensive' : 'extensive';
            return [
              `${operation} is not ${relation} at column ${column}, row ` +
                `${row}: input ${original}, result ${result}`,
              contextBlock(context),
              '  result:',
              formatGrid(onceGrid),
            ].join('\n');
          }
        }
      }
    }
  }

  return checkMaskGrid(mask, input, {
    ...context,
    operation: `${operation} (input unchanged)`,
  });
}

/**
 * Runs the opening/closing contract over deterministic inputs.
 * @param options - Contract options.
 * @returns `null` on success, a full reproducer on the first mismatch.
 */
export function checkCompositeContract(
  options: CompositeContractOptions,
): string | null {
  const {
    operation,
    kernels = { ...SAMPLE_KERNELS, ...ASYMMETRIC_KERNELS },
    sizes = SAMPLE_SIZES,
    seed = MASK_CONTRACT_SEED,
    exhaustiveMaxBits = 9,
    sampledInputs = 40,
    iterations = [1, 2],
  } = options;
  const generation = { seed, exhaustiveMaxBits, sampledInputs };

  for (const kernelName of Object.keys(kernels)) {
    const kernel = kernels[kernelName];
    for (const [width, height] of sizes) {
      for (const input of generateInputs(width, height, generation)) {
        const failure = checkComposite(
          operation,
          maskFromGrid(input),
          input,
          kernel,
          iterations,
        );
        if (failure !== null) {
          return [
            failure,
            `  kernel name: "${kernelName}"`,
            `  reproducible input: ${JSON.stringify(input)}`,
          ].join('\n');
        }
      }
    }
  }
  return null;
}

/**
 * Checks that every public morphology entry point rejects a kernel before
 * running any scan, with a `TypeError` that mentions the odd-dimension rule.
 * @param kernel - Rejected kernel.
 * @param label - Name used in failure messages.
 * @returns `null` on success, a detailed message otherwise.
 */
export function checkKernelRejection(
  kernel: MorphKernel,
  label: string,
): string | null {
  const mask = maskFromGrid([
    [1, 0, 1],
    [0, 1, 0],
    [1, 0, 1],
  ]);
  const calls: Array<[string, () => unknown]> = [
    ['erode', () => mask.erode({ kernel })],
    ['dilate', () => mask.dilate({ kernel })],
    ['open', () => mask.open({ kernel })],
    ['close', () => mask.close({ kernel })],
  ];
  for (const [operation, call] of calls) {
    let caught: unknown;
    try {
      call();
    } catch (error) {
      caught = error;
    }
    if (!(caught instanceof TypeError)) {
      return `${operation} did not throw a TypeError for kernel ${label}`;
    }
    if (
      !caught.message.includes(
        'the number of rows and columns of the kernel must be odd',
      )
    ) {
      return `${operation} threw an unexpected message for kernel ${label}: ${caught.message}`;
    }
  }
  return null;
}
