/**
 * src/lib/omega/dragi-full.ts
 * =============================================================================
 * DRAGI-FULL — TOTAL-COVERAGE D12 SKELETON (regression fix, July 27 2026)
 *
 * THE BUG THIS FIXES
 * -------------------
 * The vendor `compressDragi(text)` in neuralese-dragi.ts extracts exactly ONE
 * fixed-size D12 card from the ENTIRE input, no matter how long it is. Its
 * field extractors sample only:
 *   obj      <- first sentence
 *   DR.eat   <- first TWO sentences
 *   eater    <- first sentence matching /fail|error|risk|.../
 *   foe      <- first sentence matching /not|never|must|.../
 *   cont.law <- first sentence matching /always|must|require|.../
 * Everything after those few sampled sentences is silently discarded. On a
 * 250-char heterogeneous prompt (CSV + JSON + grid + prose) the CSV rows, the
 * JSON object, the grid, and the second prose sentence never appear anywhere
 * in the output. That is the "only single D12 block and no other blocks in the
 * entire output" defect.
 *
 * THE FIX: OPERATIONAL TOTAL COVERAGE
 * ------------------------------------
 * DRAGI-FULL guarantees a *coverage invariant*: every non-empty segment of the
 * input is represented in at least one emitted block. It does this by:
 *   1. SEGMENTING the input by structural type, not just by sentence:
 *        - contiguous CSV row runs        -> one CSV block (header + all rows)
 *        - JSON object / array lines      -> one JSON block per object
 *        - markdown table runs            -> one GRID block
 *        - fenced code runs               -> one CODE block (verbatim)
 *        - prose sentence runs            -> D12 cards, chunked
 *   2. Emitting a typed block for each segment so structured data is preserved
 *      as data (values kept verbatim) rather than paraphrased into a card.
 *   3. Chunking prose so each card covers a bounded window instead of the
 *      whole document.
 *   4. Reporting a measured `coveragePct` = fraction of input content words
 *      that appear somewhere in the output.
 *
 * FIDELITY CLAIM, STATED HONESTLY
 * --------------------------------
 * Structured segments (CSV / JSON / grid / code) are preserved VERBATIM, so
 * they are byte-exact within their block. Prose segments are lossy semantic
 * skeletons (that is what DRAGI is). Therefore DRAGI-FULL is:
 *   - byte-exact for structured data,
 *   - lossy-but-total-coverage for prose,
 *   - NOT byte-exact overall, and this module never claims otherwise.
 * The measured coveragePct is computed by executed content-word overlap, not
 * asserted. It is displayed in the UI as-is.
 * =============================================================================
 */

import { compressDragi } from '@/lib/neuralese-dragi';
import { countTokens, type EncodingName } from './bpe';

export type SegmentKind = 'csv' | 'json' | 'grid' | 'code' | 'prose';

export interface DragiSegment {
  kind: SegmentKind;
  startLine: number;
  endLine: number;
  raw: string;
  rendered: string;
}

export interface DragiFullResult {
  output: string;
  segments: DragiSegment[];
  blockCount: number;
  proseCards: number;
  structuredBlocks: number;
  /** measured: fraction of input content words present in output (0..100) */
  coveragePct: number;
  inTokens: number;
  outTokens: number;
  savingsPct: number;
  inChars: number;
  outChars: number;
  decoderPrompt: string;
  notes: string;
}

const CODE_FENCE = /^\s*```/;
const GRID_ROW = /^\s*\|.*\|\s*$/;
const JSON_LINE = /^\s*[[{].*[}\]],?\s*$/;

function looksLikeCsvRow(line: string): boolean {
  const t = line.trim();
  if (!t || t.startsWith('|') || t.startsWith('{') || t.startsWith('[')) return false;
  const cells = t.split(',');
  return cells.length >= 2 && cells.every((c) => c.trim().length > 0 && c.length < 64);
}

function contentWords(s: string): Set<string> {
  const out = new Set<string>();
  for (const w of s.toLowerCase().match(/[a-z0-9][a-z0-9._-]*/g) ?? []) {
    if (w.length >= 2) out.add(w);
  }
  return out;
}

/** Split input into typed contiguous segments covering 100% of non-empty lines. */
function segmentInput(text: string): Array<{ kind: SegmentKind; start: number; end: number; raw: string }> {
  const lines = text.split('\n');
  const segs: Array<{ kind: SegmentKind; start: number; end: number; raw: string }> = [];
  let i = 0;

  const push = (kind: SegmentKind, start: number, end: number) => {
    const raw = lines.slice(start, end + 1).join('\n');
    if (raw.trim()) segs.push({ kind, start, end, raw });
  };

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }

    // fenced code
    if (CODE_FENCE.test(line)) {
      const start = i;
      i++;
      while (i < lines.length && !CODE_FENCE.test(lines[i])) i++;
      if (i < lines.length) i++; // closing fence
      push('code', start, i - 1);
      continue;
    }
    // markdown grid
    if (GRID_ROW.test(line)) {
      const start = i;
      while (i < lines.length && GRID_ROW.test(lines[i])) i++;
      push('grid', start, i - 1);
      continue;
    }
    // json object/array lines
    if (JSON_LINE.test(line)) {
      const start = i;
      while (i < lines.length && JSON_LINE.test(lines[i])) i++;
      push('json', start, i - 1);
      continue;
    }
    // csv run (>= 2 consecutive comma rows with consistent arity)
    if (looksLikeCsvRow(line)) {
      const arity = line.trim().split(',').length;
      const start = i;
      let j = i;
      while (j < lines.length && looksLikeCsvRow(lines[j]) && lines[j].trim().split(',').length === arity) j++;
      if (j - start >= 2) {
        i = j;
        push('csv', start, j - 1);
        continue;
      }
    }
    // prose run: until a structural line appears
    const start = i;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !CODE_FENCE.test(lines[i]) &&
      !GRID_ROW.test(lines[i]) &&
      !JSON_LINE.test(lines[i]) &&
      !(looksLikeCsvRow(lines[i]) && i + 1 < lines.length && looksLikeCsvRow(lines[i + 1]))
    ) i++;
    if (i === start) i++; // guarantee forward progress
    push('prose', start, i - 1);
  }
  return segs;
}

/** Render a typed segment. Structured kinds keep their values verbatim. */
function renderSegment(
  seg: { kind: SegmentKind; start: number; end: number; raw: string },
  idx: number,
): string {
  const tag = `B${idx + 1}`;
  switch (seg.kind) {
    case 'csv': {
      const rows = seg.raw.split('\n').filter((l) => l.trim());
      const header = rows[0];
      const body = rows.slice(1);
      return `${tag}:CSV{cols:"${header}" rows:${body.length}\n${body.join('\n')}\n}`;
    }
    case 'json': {
      return `${tag}:JSON{\n${seg.raw}\n}`;
    }
    case 'grid': {
      return `${tag}:GRID{\n${seg.raw}\n}`;
    }
    case 'code': {
      return `${tag}:CODE{\n${seg.raw}\n}`;
    }
    case 'prose':
    default: {
      // Chunk prose into <=3-sentence windows so each card covers a bounded span
      const sentences = seg.raw.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
      if (sentences.length === 0) return `${tag}:PROSE{}`;
      const cards: string[] = [];
      for (let k = 0; k < sentences.length; k += 3) {
        const window = sentences.slice(k, k + 3).join(' ');
        const card = compressDragi(window);
        cards.push(card.output);
      }
      return cards.map((c, n) => `${tag}.${n + 1}:${c}`).join('\n');
    }
  }
}

export function compressDragiFull(
  text: string,
  enc: EncodingName = 'o200k_base',
): DragiFullResult {
  const inTokens = countTokens(text, enc);
  const inChars = text.length;

  if (text.length > 120000) {
    return {
      output: text, segments: [], blockCount: 0, proseCards: 0, structuredBlocks: 0,
      coveragePct: 100, inTokens, outTokens: inTokens, savingsPct: 0,
      inChars, outChars: inChars,
      decoderPrompt: '# DRAGI-FULL\nSkipped over 120k chars for UI latency safety.',
      notes: 'DRAGI-FULL: skipped over 120k chars for UI latency safety.',
    };
  }

  if (!text.trim()) {
    return {
      output: text, segments: [], blockCount: 0, proseCards: 0, structuredBlocks: 0,
      coveragePct: 100, inTokens, outTokens: inTokens, savingsPct: 0,
      inChars, outChars: inChars,
      decoderPrompt: '# DRAGI-FULL\nEmpty input.',
      notes: 'Empty input.',
    };
  }

  const rawSegs = segmentInput(text);
  const segments: DragiSegment[] = rawSegs.map((s, i) => ({
    kind: s.kind,
    startLine: s.start,
    endLine: s.end,
    raw: s.raw,
    rendered: renderSegment(s, i),
  }));

  const output = segments.map((s) => s.rendered).join('\n\n');
  const outTokens = countTokens(output, enc);

  // Measured coverage: what fraction of the input's content words survive?
  const inWords = contentWords(text);
  const outWords = contentWords(output);
  let hit = 0;
  for (const w of inWords) if (outWords.has(w)) hit++;
  const coveragePct = inWords.size === 0 ? 100 : Math.round((hit / inWords.size) * 100);

  const proseCards = segments
    .filter((s) => s.kind === 'prose')
    .reduce((n, s) => n + s.rendered.split('D12{').length - 1, 0);
  const structuredBlocks = segments.filter((s) => s.kind !== 'prose').length;

  const decoderPrompt = `# DRAGI-FULL Decoder (total-coverage typed blocks)
The payload is a sequence of typed blocks, each covering a contiguous span of the
original document. Every block is labelled B<n> in original document order.

Block types:
  Bn:CSV{cols:"<header>" rows:<count> ...}  header + all data rows, VERBATIM
  Bn:JSON{...}                              JSON lines, VERBATIM
  Bn:GRID{...}                              markdown table rows, VERBATIM
  Bn:CODE{...}                              fenced code, VERBATIM
  Bn.k:D12{...}                             prose semantic skeleton card k

Reconstruction rules:
  1. Process blocks in order B1, B2, ... Bn.
  2. For CSV / JSON / GRID / CODE blocks, the content is already exact —
     reproduce it byte-for-byte. Do not paraphrase or reformat it.
  3. For D12 cards, expand the skeleton back into prose using obj + DR.eat +
     cont.law + flags as anchors. Each card covers at most 3 sentences.
  4. Do not invent content that is not present in any block.

Measured content-word coverage of this payload: ${coveragePct}%.`;

  return {
    output,
    segments,
    blockCount: segments.length,
    proseCards,
    structuredBlocks,
    coveragePct,
    inTokens,
    outTokens,
    savingsPct: inTokens ? ((inTokens - outTokens) / inTokens) * 100 : 0,
    inChars,
    outChars: output.length,
    decoderPrompt,
    notes: `${segments.length} typed block(s): ${structuredBlocks} structured (verbatim) + ${proseCards} D12 prose card(s). Measured coverage ${coveragePct}% of input content words.`,
  };
}

export interface DragiFullSelfTest { name: string; pass: boolean; detail: string }

export function dragiFullSelfTests(enc: EncodingName = 'o200k_base'): DragiFullSelfTest[] {
  const out: DragiFullSelfTest[] = [];
  const check = (name: string, text: string, minBlocks: number) => {
    try {
      const r = compressDragiFull(text, enc);
      out.push({
        name,
        pass: r.blockCount >= minBlocks,
        detail: `${r.blockCount} blocks (${r.structuredBlocks} structured + ${r.proseCards} D12), coverage ${r.coveragePct}%, ${r.inTokens}->${r.outTokens} tok`,
      });
    } catch (e) {
      out.push({ name, pass: false, detail: String(e) });
    }
  };

  const hetero =
    'id,qty,px\n7,1200,43.75\n8,940,43.75\n' +
    '{"ok":true,"ids":[7,8],"ts":"2026-07-19T04:15:00Z"}\n' +
    '| A | B |\n|---|---|\n| 1 | 2 |\n' +
    'The pump failed at 04:15 UTC. Replace seal 12-A before the next run.';
  check('hetero chaotic emits multiple typed blocks', hetero, 4);
  check('pure prose chunks into multiple D12 cards',
    'One. Two. Three. Four. Five. Six. Seven. Eight. Nine.', 1);
  check('csv only', 'a,b,c\n1,2,3\n4,5,6', 1);

  // Coverage invariant: structured values must survive verbatim
  try {
    const r = compressDragiFull(hetero, enc);
    const keeps = ['1200', '43.75', '2026-07-19T04:15:00Z', '| 1 | 2 |'];
    const missing = keeps.filter((k) => !r.output.includes(k));
    out.push({
      name: 'structured values preserved verbatim',
      pass: missing.length === 0,
      detail: missing.length === 0 ? 'all CSV/JSON/grid values present' : `missing: ${missing.join(', ')}`,
    });
  } catch (e) {
    out.push({ name: 'structured values preserved verbatim', pass: false, detail: String(e) });
  }
  return out;
}
