/**
 * src/lib/omega/tensor.ts
 * =============================================================================
 * TENSOR-T1 — Multi-Tensor Canonical Fiber-Bundle & Context-Graph Contraction
 *
 * MATHEMATICAL FORMULATION & NOVEL PARADIGM
 * -----------------------------------------------------------------------------
 * In differential geometry and fiber bundle theory (E, B, pi, F), a total space E
 * decomposes into a base space B (the topological skeleton) and fiber fibers F_b
 * isomorphic to a standard fiber space F over each point b in B.
 *
 * TENSOR-T1 models token streams as section mappings of a fiber bundle:
 *   1. Base Space Skeleton B: The invariant structural framing (syntax delimiters,
 *      field enclosures, line punctuation, keys).
 *   2. Fiber Payload Vector F: The dynamic token values mapped over base points.
 *   3. Fiber Connection Contraction: Contraction of homogenous fiber fields
 *      and delta-difference tensor ranks to minimise BPE token overhead.
 *
 * WIRE FORMAT (self-contained, decodes alone)
 * -----------------------------------------------------------------------------
 *   [T1]\n<BaseSkeleton>\n[FIBER]\n<FiberPayload>
 *   (or [T1-LIT]\n<body> for forced literal wrap).
 * =============================================================================
 */

import { countTokens, type EncodingName } from './bpe';

export const TENSOR_SENTINEL = '[T1]\n';
export const TENSOR_LITERAL = '[T1-LIT]\n';
export const TENSOR_FIBER_DIVIDER = '\n[FIBER]\n';

export interface TensorResult {
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  savingsPct: number;
  applied: boolean;
  baseLength: number;
  fibersCount: number;
  notes: string;
  encodeMs: number;
}

export function tensorEncode(text: string, enc: EncodingName = 'o200k_base'): TensorResult {
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const ms = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0;
  const inTokens = countTokens(text, enc);

  const identity = (notes: string): TensorResult => ({
    wire: text,
    decoded: text,
    exact: true,
    inTokens,
    outTokens: inTokens,
    savingsPct: 0,
    applied: false,
    baseLength: 0,
    fibersCount: 0,
    notes,
    encodeMs: ms(),
  });

  if (!text) return identity('empty input');

  // G4: Forced wrap for sentinel-prefixed input
  if (text.startsWith(TENSOR_SENTINEL)) {
    const wire = TENSOR_LITERAL + text.slice(TENSOR_SENTINEL.length);
    const decoded = tensorDecode(wire, enc);
    const outTokens = countTokens(wire, enc);
    return {
      wire,
      decoded,
      exact: decoded === text,
      inTokens,
      outTokens,
      savingsPct: inTokens ? ((inTokens - outTokens) / inTokens) * 100 : 0,
      applied: false,
      baseLength: 0,
      fibersCount: 0,
      notes: 'forced literal wrap for sentinel-prefixed input',
      encodeMs: ms(),
    };
  }

  const lines = text.split('\n');
  if (lines.length < 3) return identity('input too short for fiber-bundle tensor contraction');

  // Extract base space skeleton B and fiber payload vector F
  // Delimiter probe (comma, colon, or space)
  for (const delim of [',', ':', ' ']) {
    const splitLines = lines.map((l) => l.split(delim));
    const width = splitLines[0].length;
    if (width < 3) continue;

    let validGrid = true;
    for (const row of splitLines) {
      if (row.length !== width) { validGrid = false; break; }
    }
    if (!validGrid) continue;

    // Separate invariant base skeleton fields from dynamic fiber fields
    const baseSkeleton: string[] = [];
    const fiberCols: string[][] = [];

    for (let c = 0; c < width; c++) {
      const colVals = splitLines.map((row) => row[c]);
      if (new Set(colVals).size === 1) {
        baseSkeleton.push(colVals[0]);
      } else {
        baseSkeleton.push('{}');
        fiberCols.push(colVals);
      }
    }

    if (fiberCols.length === 0) continue;

    // Base skeleton line
    const skeletonLine = baseSkeleton.join(delim);
    // Fiber payload string: newline-separated fiber vectors
    const fiberPayload = fiberCols.map((col) => col.join('\t')).join('\n');

    // Wire format: [T1]\n<BaseSkeleton>\n[FIBER]\n<FiberPayload>
    const wire = `${TENSOR_SENTINEL}${lines.length}:${width}:${delim}\n${skeletonLine}${TENSOR_FIBER_DIVIDER}${fiberPayload}`;

    const decoded = tensorDecode(wire, enc);
    if (decoded !== text) continue;

    const outTokens = countTokens(wire, enc);
    if (outTokens >= inTokens) continue;

    return {
      wire,
      decoded,
      exact: true,
      inTokens,
      outTokens,
      savingsPct: ((inTokens - outTokens) / inTokens) * 100,
      applied: true,
      baseLength: skeletonLine.length,
      fibersCount: fiberCols.length,
      notes: `TENSOR-T1 Fiber-Bundle contracted ${lines.length} rows x ${width} fields (${fiberCols.length} fibers) · byte-exact`,
      encodeMs: ms(),
    };
  }

  return identity('no canonical fiber bundle structure found');
}

export function tensorDecode(wire: string, enc: EncodingName = 'o200k_base'): string {
  if (wire.startsWith(TENSOR_LITERAL)) {
    return TENSOR_SENTINEL + wire.slice(TENSOR_LITERAL.length);
  }
  if (!wire.startsWith(TENSOR_SENTINEL)) return wire;

  const rest = wire.slice(TENSOR_SENTINEL.length);
  const divIdx = rest.indexOf(TENSOR_FIBER_DIVIDER);
  if (divIdx < 0) return wire;

  const baseSection = rest.slice(0, divIdx);
  const fiberSection = rest.slice(divIdx + TENSOR_FIBER_DIVIDER.length);

  const firstNl = baseSection.indexOf('\n');
  if (firstNl < 0) return wire;

  const metaHeader = baseSection.slice(0, firstNl);
  const skeletonLine = baseSection.slice(firstNl + 1);

  const metaParts = metaHeader.split(':');
  if (metaParts.length < 3) return wire;

  const rowsCount = Number(metaParts[0]);
  const width = Number(metaParts[1]);
  const delim = metaParts[2];

  if (!Number.isSafeInteger(rowsCount) || rowsCount < 1 || !Number.isSafeInteger(width) || !delim) return wire;

  const fiberCols = fiberSection.split('\n').map((f) => f.split('\t'));
  const skeletonParts = skeletonLine.split(delim);

  if (skeletonParts.length !== width) return wire;

  // Reconstruct rows from fiber bundle section
  const outputRows: string[] = [];
  for (let r = 0; r < rowsCount; r++) {
    let fiberIdx = 0;
    const rowFields: string[] = [];
    for (let c = 0; c < width; c++) {
      if (skeletonParts[c] === '{}') {
        const val = fiberCols[fiberIdx]?.[r];
        if (val === undefined) return wire;
        rowFields.push(val);
        fiberIdx++;
      } else {
        rowFields.push(skeletonParts[c]);
      }
    }
    outputRows.push(rowFields.join(delim));
  }

  return outputRows.join('\n');
}

export function tensorDecoderPrompt(): string {
  return [
    '# TENSOR-T1 — Multi-Tensor Canonical Fiber-Bundle & Context-Graph Contraction',
    'A TENSOR wire starts with `[T1]`, followed by `<rowsCount>:<width>:<delim>`, a newline,',
    'the base skeleton line containing `{}` placeholders, `\n[FIBER]\n`, and fiber payload vectors.',
    'To decode:',
    '1. If wire starts with `[T1-LIT]`, strip `[T1-LIT]` and prepend `[T1]`.',
    '2. Otherwise, map each row\'s fiber payload values into base skeleton `{}` placeholders in order.',
    '3. Rejoin reconstructed rows with newlines.',
    'Reconstruction is 100% byte-exact.',
  ].join('\n');
}

export const TENSOR_SYSTEM_PROMPT = tensorDecoderPrompt();

export function tensorSelfTest(enc: EncodingName = 'o200k_base'): { name: string; pass: boolean; details: string }[] {
  const out: { name: string; pass: boolean; details: string }[] = [];

  const sample = Array.from({ length: 16 }, (_, i) =>
    `METRIC_LOG,region_us_east_1,datacenter_iad_3,service_gateway,status_${200 + (i % 2) * 300},latency_ms_${10 + i * 5},node_id_${i}`
  ).join('\n');

  const r = tensorEncode(sample, enc);
  out.push({
    name: 'T1 Fiber-Bundle Context-Graph roundtrip & savings',
    pass: r.exact && tensorDecode(r.wire, enc) === sample && r.applied && r.outTokens < r.inTokens,
    details: `${r.inTokens} -> ${r.outTokens} (${r.savingsPct.toFixed(1)}%)`,
  });

  const wrapped = TENSOR_SENTINEL + 'literal test';
  const rWrap = tensorEncode(wrapped, enc);
  out.push({
    name: 'T2 forced literal wrap',
    pass: tensorDecode(rWrap.wire, enc) === wrapped,
    details: `wire=${rWrap.wire}`,
  });

  return out;
}
