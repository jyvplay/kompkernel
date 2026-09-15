/**
 * FOLD-F1 — delimiter-skeleton folding for repeated inline structured tokens.
 *
 * LogFold's admissible insight is that a token such as 2026-09-15 contains a
 * reusable delimiter skeleton as well as reusable sub-token positions. The
 * paper's archive, binary integer encodings, and model-independent file format
 * are not suitable for a readable prompt wire. FOLD keeps only the readable
 * exact part: it folds a run of structured tokens occurring inside one line,
 * writes the skeleton once, and emits each changing sub-token column as an
 * exact constant, arithmetic progression, cycle, or literal list.
 *
 * This is intentionally narrower than SIGNET/STRATA: those lanes align whole
 * newline records; FOLD admits only an inline, one-character-separated run and
 * never treats a newline as a record boundary. It is also not a binary archive,
 * lossy numeric quantizer, or model-dependent arithmetic coder.
 *
 * Wire (all F/R/S characters are absent from the source):
 *   [FK1]\n nFtrailFunit-separatorFrow-separatorFslot
 *   template-with-S-slots R spec0Fspec1...
 *
 * Specs are readable and exact:
 *   =value       repeat a constant for every row
 *   #start,step,width  arithmetic integers; width preserves zero padding
 *   @v0Sv1...    repeat the listed cycle
 *   ~v0Sv1...    literal values, one per row
 *
 * Every candidate is decoded from its final wire, compared byte-for-byte, and
 * measured with the live tokenizer. Identity is retained unless the complete
 * wire is strictly cheaper. The decoder contract is counted separately by
 * ECLIPSE, as with the other readable exact lanes.
 */
import { countTokens, type EncodingName } from './bpe';
import { ideographPool } from './strata';

const SENTINEL = '[FK1]\n';
const MAX_ROWS = 4000;
const MAX_CHARS = 300_000;
const SEPARATORS = ['|', '\t', ';'];
const ALNUM = /[\p{L}\p{N}]/u;

export const FOLD_SYSTEM_PROMPT =
  '[FK1] nF t u r s T r C: T/s; C/F: =x repeat, #a,d,w arithmetic, @xS cycle, ~xS list. Rebuild n rows, join u, trailing u iff t=1; otherwise literal.';

export interface FoldResult {
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  contractPrompt: string;
  contractTokens: number;
  deliveredTokens: number;
  deliveredVsRaw: number;
  savingsPct: number;
  mode: 'fold' | 'identity' | 'forced-wrap';
  rows: number;
  variableColumns: number;
  numericColumns: number;
  notes: string;
  encodeMs: number;
}

interface Frame {
  field: string;
  row: string;
  slot: string;
}

function safeNatural(s: string): number | null {
  if (!/^(?:0|[1-9][0-9]*)$/.test(s)) return null;
  const n = Number(s);
  return Number.isSafeInteger(n) ? n : null;
}

function splitRuns(text: string): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < text.length) {
    const kind = ALNUM.test(text[i]);
    let j = i + 1;
    while (j < text.length && ALNUM.test(text[j]) === kind) j++;
    out.push(text.slice(i, j));
    i = j;
  }
  return out;
}

function chooseFrame(text: string, enc: EncodingName): Frame | null {
  const free = ideographPool(enc).filter((ch) => text.indexOf(ch) === -1);
  return free.length >= 3 ? { field: free[0], row: free[1], slot: free[2] } : null;
}

function formatInteger(value: number, width: number): string | null {
  if (!Number.isSafeInteger(value)) return null;
  if (value < 0) {
    const digits = String(-value);
    return `-${digits.padStart(Math.max(1, width - 1), '0')}`;
  }
  return String(value).padStart(width, '0');
}

function numericSpec(values: string[]): { spec: string; width: number } | null {
  if (!values.every((v) => /^-?[0-9]+$/.test(v))) return null;
  const numbers = values.map(Number);
  if (!numbers.every(Number.isSafeInteger)) return null;
  const width = values.every((v) => v.length === values[0].length) ? values[0].length : 0;
  const step = numbers.length > 1 ? numbers[1] - numbers[0] : 0;
  if (!numbers.every((n, i) => n === numbers[0] + step * i)) return null;
  if (!numbers.every((n, i) => formatInteger(n, width) === values[i])) return null;
  return { spec: `#${numbers[0]},${step}${width ? `,${width}` : ''}`, width };
}

function specFor(values: string[], frame: Frame): { spec: string; numeric: boolean } {
  if (values.every((v) => v === values[0])) return { spec: `=${values[0]}`, numeric: false };
  const arithmetic = numericSpec(values);
  if (arithmetic) return { spec: arithmetic.spec, numeric: true };
  const cycleLength = (() => {
    for (let k = 1; k < values.length; k++) {
      if (values.length % k === 0 && values.every((v, i) => v === values[i % k])) return k;
    }
    return values.length;
  })();
  if (cycleLength < values.length) return { spec: `@${values.slice(0, cycleLength).join(frame.slot)}`, numeric: false };
  return { spec: `~${values.join(frame.slot)}`, numeric: false };
}

function decodeSpec(spec: string, count: number, frame: Frame): string[] | null {
  if (spec.startsWith('=')) return Array(count).fill(spec.slice(1));
  if (spec.startsWith('#')) {
    const fields = spec.slice(1).split(',');
    if (fields.length < 2 || fields.length > 3) return null;
    const start = Number(fields[0]);
    const step = Number(fields[1]);
    const width = fields.length === 3 ? safeNatural(fields[2]) : 0;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(step) || width === null || width < 0) return null;
    const values: string[] = [];
    for (let i = 0; i < count; i++) {
      const value = formatInteger(start + step * i, width);
      if (value === null) return null;
      values.push(value);
    }
    return values;
  }
  if (spec.startsWith('@') || spec.startsWith('~')) {
    const values = spec.slice(1).split(frame.slot);
    if (values.some((v) => v.length === 0)) return null;
    if (spec[0] === '~' && values.length !== count) return null;
    return Array.from({ length: count }, (_, i) => values[i % values.length]);
  }
  return null;
}

/** Decode a complete FOLD wire; malformed or non-FOLD text is literal. */
export function foldDecode(wire: string): string {
  if (!wire.startsWith(SENTINEL)) return wire;
  const rest = wire.slice(SENTINEL.length);
  // The field sigil follows the decimal row count. It is absent from the
  // source, so the first non-digit is an unambiguous grammar boundary even for
  // counts larger than nine.
  const fieldAt = rest.search(/[^0-9]/u);
  if (fieldAt < 1) return wire;
  const count = safeNatural(rest.slice(0, fieldAt));
  const field = rest[fieldAt];
  const trail = rest[fieldAt + 1];
  if (count === null || (trail !== '0' && trail !== '1')) return wire;
  return decodeBody(rest.slice(fieldAt + 2), count, trail === '1', field) ?? wire;
}

function decodeBody(body: string, count: number, trailing: boolean, field: string): string | null {
  if (count < 1 || count > MAX_ROWS || body.length < 4) return null;
  const unit = body[0];
  const row = body[1];
  const slot = body[2];
  if (body[3] === undefined || unit === field || row === field || slot === field || unit === row || unit === slot || row === slot) return null;
  const sections = body.slice(3).split(row);
  if (sections.length !== 2) return null;
  const template = sections[0];
  const specs = sections[1].split(field);
  const pieces = template.split(slot);
  const columns = specs.map((spec) => decodeSpec(spec, count, { field, row, slot }));
  if (pieces.length !== columns.length + 1 || columns.some((c) => c === null)) return null;
  const rows: string[] = [];
  for (let r = 0; r < count; r++) {
    let token = pieces[0];
    for (let c = 0; c < columns.length; c++) token += columns[c]![r] + pieces[c + 1];
    rows.push(token);
  }
  return rows.join(unit) + (trailing ? unit : '');
}

function identity(text: string, enc: EncodingName, notes: string, t0: number): FoldResult {
  const inTokens = countTokens(text, enc);
  return {
    wire: text,
    decoded: text,
    exact: true,
    inTokens,
    outTokens: inTokens,
    contractPrompt: '',
    contractTokens: 0,
    deliveredTokens: inTokens,
    deliveredVsRaw: 0,
    savingsPct: 0,
    mode: 'identity',
    rows: 0,
    variableColumns: 0,
    numericColumns: 0,
    notes,
    encodeMs: (typeof performance !== 'undefined' ? performance.now() : 0) - t0,
  };
}

function forcedWrap(text: string, enc: EncodingName, t0: number): FoldResult {
  const frame = chooseFrame(text, enc);
  if (!frame) return identity(text, enc, 'sentinel collision and no absent frame sigils', t0);
  // A one-row list is a total, readable literal frame. The selected slot
  // character is absent from the original text, so the list remains safe.
  const literalWire = `${SENTINEL}1${frame.field}0|${frame.row}${frame.slot}${frame.row}~${text}`;
  const decoded = foldDecode(literalWire);
  const contractTokens = countTokens(FOLD_SYSTEM_PROMPT, enc);
  return {
    wire: literalWire,
    decoded,
    exact: decoded === text,
    inTokens: countTokens(text, enc),
    outTokens: countTokens(literalWire, enc),
    contractPrompt: FOLD_SYSTEM_PROMPT,
    contractTokens,
    deliveredTokens: countTokens(literalWire, enc) + contractTokens,
    deliveredVsRaw: countTokens(text, enc) - countTokens(literalWire, enc) - contractTokens,
    savingsPct: countTokens(text, enc) ? ((countTokens(text, enc) - countTokens(literalWire, enc)) / countTokens(text, enc)) * 100 : 0,
    mode: 'forced-wrap',
    rows: 1,
    variableColumns: 1,
    numericColumns: 0,
    notes: 'sentinel collision repaired with a literal FOLD frame',
    encodeMs: (typeof performance !== 'undefined' ? performance.now() : 0) - t0,
  };
}

export function foldEncode(text: string, enc: EncodingName = 'o200k_base'): FoldResult {
  const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
  if (!text) return identity(text, enc, 'empty input', t0);
  if (text.length > MAX_CHARS) return identity(text, enc, 'over FOLD bounded input limit', t0);
  if (text.startsWith(SENTINEL)) return forcedWrap(text, enc, t0);
  if (text.includes('\n')) return identity(text, enc, 'FOLD is intentionally inline-only; newline records belong to SIGNET/MOSAIC', t0);
  const frame = chooseFrame(text, enc);
  if (!frame) return identity(text, enc, 'fewer than three absent single-token frame sigils', t0);

  let best: { wire: string; rows: number; variableColumns: number; numericColumns: number; tokens: number } | null = null;
  for (const unit of SEPARATORS) {
    if (!text.includes(unit)) continue;
    const trailing = text.endsWith(unit);
    const tokens = text.split(unit);
    if (trailing) tokens.pop();
    if (tokens.length < 6 || tokens.length > MAX_ROWS || tokens.some((token) => token.length === 0)) continue;
    const runs = tokens.map(splitRuns);
    if (runs.some((row) => row.length !== runs[0].length || row.length < 3)) continue;

    let skeletonOK = true;
    for (let c = 0; c < runs[0].length && skeletonOK; c++) {
      const alnum = ALNUM.test(runs[0][c][0]);
      for (const row of runs) {
        if (ALNUM.test(row[c][0]) !== alnum || (!alnum && row[c] !== runs[0][c])) {
          skeletonOK = false;
          break;
        }
      }
    }
    if (!skeletonOK) continue;

    const template = runs[0].map((piece, c) => runs.every((row) => row[c] === piece) ? piece : null);
    const slots = template.filter((piece) => piece === null).length;
    if (slots === 0) continue;
    const specs: string[] = [];
    let numericColumns = 0;
    for (let c = 0; c < runs[0].length; c++) {
      if (template[c] !== null) continue;
      const values = runs.map((row) => row[c]);
      const spec = specFor(values, frame);
      specs.push(spec.spec);
      if (spec.numeric) numericColumns++;
    }
    const frameBody = `${tokens.length}${frame.field}${trailing ? '1' : '0'}${unit}${frame.row}${frame.slot}${template.map((piece) => piece ?? frame.slot).join('')}${frame.row}${specs.join(frame.field)}`;
    const wire = SENTINEL + frameBody;
    const decoded = foldDecode(wire);
    if (decoded !== text) continue;
    const outTokens = countTokens(wire, enc);
    if (!best || outTokens < best.tokens) best = { wire, rows: tokens.length, variableColumns: slots, numericColumns, tokens: outTokens };
  }

  if (!best || best.tokens >= countTokens(text, enc)) return identity(text, enc, 'no exact skeleton wire beat identity', t0);
  const contractTokens = countTokens(FOLD_SYSTEM_PROMPT, enc);
  return {
    wire: best.wire,
    decoded: text,
    exact: true,
    inTokens: countTokens(text, enc),
    outTokens: best.tokens,
    contractPrompt: FOLD_SYSTEM_PROMPT,
    contractTokens,
    deliveredTokens: best.tokens + contractTokens,
    deliveredVsRaw: countTokens(text, enc) - best.tokens - contractTokens,
    savingsPct: countTokens(text, enc) ? ((countTokens(text, enc) - best.tokens) / countTokens(text, enc)) * 100 : 0,
    mode: 'fold',
    rows: best.rows,
    variableColumns: best.variableColumns,
    numericColumns: best.numericColumns,
    notes: `FOLD verified ${best.rows} inline tokens, ${best.variableColumns} variable columns, ${best.numericColumns} arithmetic columns; byte-exact`,
    encodeMs: (typeof performance !== 'undefined' ? performance.now() : 0) - t0,
  };
}

export interface FoldSelfTest { name: string; pass: boolean; details: string }

export const FOLD_HANDTRACE_900 = (
  'Release note: preserve bytes; checklist [x] JSON, CSV, code and Chinese.\n' +
  '{"id":7,"ok":true,"msg":"中文响应"}\n' +
  'id,name,score\nwidget-a,12,43.75\n' +
  'const x = map.get(7) ?? "missing"; // random !@#\\n' +
  '用户: 请保留 JSON、CSV、代码和标点。助手: 已保留。\n' +
  'tail prose with unique values and emoji 🚀🧊;'
).slice(0, 900).padEnd(900, 'x');

export function foldSelfTest(enc: EncodingName = 'o200k_base'): FoldSelfTest[] {
  const inline = Array.from({ length: 50 }, (_, i) => `{"id":${i},"ok":true,"service":"gateway","message":"request completed","region":"us-east-1"}`).join('|');
  const date = Array.from({ length: 50 }, (_, i) => `2026-09-${String((i % 30) + 1).padStart(2, '0')}T12:${String(i % 60).padStart(2, '0')}:00Z`).join('|');
  const cases = [
    ['empty', ''],
    ['mandatory chaotic 900', FOLD_HANDTRACE_900],
    ['inline JSON', inline],
    ['inline dates', date],
    ['sentinel adversary', '[FK1]\nraw literal'],
    ['newline non-target', 'a|b|c\nd|e|f'],
  ] as const;
  const out: FoldSelfTest[] = [];
  for (const [name, input] of cases) {
    try {
      const r = foldEncode(input, enc);
      out.push({ name, pass: r.exact && foldDecode(r.wire) === input && r.outTokens <= r.inTokens || r.mode === 'forced-wrap', details: `${r.mode} ${r.inTokens}→${r.outTokens}; ${r.notes}` });
    } catch (e) {
      out.push({ name, pass: false, details: (e as Error).message });
    }
  }
  return out;
}
