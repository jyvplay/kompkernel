/**
 * TABLE-T1 — exact, readable folding of uniform JSON arrays.
 *
 * TOON and related 2025–2026 structured prompt formats show that uniform
 * arrays pay repeatedly for braces, keys, quotes, and commas. TABLE adapts that
 * idea without changing the JSON data model and without accepting semantic
 * equivalence as byte equivalence: it captures the original lexical object
 * template, whitespace, escaping, number spelling, array prefix, row joiner,
 * and suffix, then stores only the varying primitive value lexemes per column.
 *
 * This is intentionally a different lane from SIGMA, which scans newline JSONL
 * and rewrites parsed primitive values, and from FOLD, which handles an inline
 * delimiter-separated stream. TABLE handles one top-level JSON array of flat
 * objects even when it is compact one-line JSON. It is exact only when the
 * final text decoder reproduces the original source string.
 *
 * Wire:
 *   [TA1]\n F R S count R prefix F joiner F suffix R template R specs/F...
 *
 * F/R/S are absent single-token CJK characters selected from the source. A
 * spec is =constant, #start,step,width arithmetic, @cycle, or ~literal list.
 * The decoder contract is counted by ECLIPSE; identity is retained whenever
 * the complete wire is not cheaper under the live tokenizer.
 */
import { countTokens, type EncodingName } from './bpe';
import { ideographPool } from './strata';
import { FOLD_HANDTRACE_900 } from './fold';

const SENTINEL = '[TA1]\n';
const MAX_ROWS = 4000;
const MAX_CHARS = 300_000;
const WS = /\s/u;

export const TABLE_SYSTEM_PROMPT =
  '[TA1] FRS count R prefixFjoinerFsuffix R template R specs/F. Split template on S. Specs: =x repeat, #a,d,w arithmetic, @xS cycle, ~xS list. Rebuild objects, then prefix+rows+suffix; other text literal.';

export interface TableResult {
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
  mode: 'table' | 'identity' | 'forced-wrap';
  rows: number;
  variableColumns: number;
  numericColumns: number;
  notes: string;
  encodeMs: number;
}

interface Frame { field: string; row: string; slot: string }
interface ObjectLexeme { parts: string[]; values: string[]; end: number }
interface ArrayLexeme {
  prefix: string;
  joiner: string;
  suffix: string;
  objects: ObjectLexeme[];
}

function natural(text: string): number | null {
  if (!/^(?:0|[1-9][0-9]*)$/u.test(text)) return null;
  const n = Number(text);
  return Number.isSafeInteger(n) ? n : null;
}

function skipWhitespace(text: string, at: number): number {
  while (at < text.length && WS.test(text[at])) at++;
  return at;
}

function scanString(text: string, at: number): number | null {
  if (text[at] !== '"') return null;
  let i = at + 1;
  while (i < text.length) {
    if (text[i] === '\\') {
      i += 2;
      continue;
    }
    if (text[i] === '"') return i + 1;
    i++;
  }
  return null;
}

function scanPrimitive(text: string, at: number): number | null {
  if (text[at] === '"') return scanString(text, at);
  for (const word of ['true', 'false', 'null']) {
    if (text.startsWith(word, at)) return at + word.length;
  }
  const number = text.slice(at).match(/^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/u);
  return number ? at + number[0].length : null;
}

function parseFlatObject(text: string, start: number): ObjectLexeme | null {
  if (text[start] !== '{') return null;
  const values: string[] = [];
  const spans: [number, number][] = [];
  let i = start + 1;
  i = skipWhitespace(text, i);
  if (text[i] === '}') return null;
  while (i < text.length) {
    const keyEnd = scanString(text, i);
    if (keyEnd === null) return null;
    i = skipWhitespace(text, keyEnd);
    if (text[i] !== ':') return null;
    i = skipWhitespace(text, i + 1);
    const valueStart = i;
    const valueEnd = scanPrimitive(text, i);
    if (valueEnd === null) return null;
    spans.push([valueStart, valueEnd]);
    values.push(text.slice(valueStart, valueEnd));
    i = skipWhitespace(text, valueEnd);
    if (text[i] === ',') {
      i = skipWhitespace(text, i + 1);
      continue;
    }
    if (text[i] !== '}') return null;
    const parts: string[] = [];
    let last = start;
    for (const [a, b] of spans) {
      parts.push(text.slice(last, a));
      last = b;
    }
    parts.push(text.slice(last, i + 1));
    return { parts, values, end: i + 1 };
  }
  return null;
}

function parseArray(text: string): ArrayLexeme | null {
  if (text.length === 0 || text[0] !== '[') return null;
  let start = skipWhitespace(text, 1);
  if (start >= text.length || text[start] === ']') return null;
  const first = parseFlatObject(text, start);
  if (!first) return null;
  const prefix = text.slice(0, start);
  const objects = [first];
  let joiner: string | null = null;
  let current = first;
  while (true) {
    const boundary = skipWhitespace(text, current.end);
    if (text[boundary] === ']') {
      return { prefix, joiner: joiner ?? '', suffix: text.slice(current.end), objects };
    }
    if (text[boundary] !== ',') return null;
    const nextStart = skipWhitespace(text, boundary + 1);
    const candidateJoiner = text.slice(current.end, nextStart);
    if (joiner === null) joiner = candidateJoiner;
    if (joiner !== candidateJoiner) return null;
    const next = parseFlatObject(text, nextStart);
    if (!next) return null;
    objects.push(next);
    current = next;
    start = nextStart;
    if (objects.length > MAX_ROWS) return null;
  }
}

function chooseFrame(text: string, enc: EncodingName): Frame | null {
  const free = ideographPool(enc).filter((ch) => text.indexOf(ch) === -1);
  return free.length >= 3 ? { field: free[0], row: free[1], slot: free[2] } : null;
}

function formatInteger(value: number, width: number): string | null {
  if (!Number.isSafeInteger(value)) return null;
  if (value < 0) return `-${String(-value).padStart(Math.max(1, width - 1), '0')}`;
  return String(value).padStart(width, '0');
}

function arithmetic(values: string[]): string | null {
  if (!values.every((value) => /^-?[0-9]+$/u.test(value))) return null;
  const numbers = values.map(Number);
  if (!numbers.every(Number.isSafeInteger)) return null;
  const width = values.every((value) => value.length === values[0].length) ? values[0].length : 0;
  const step = numbers.length > 1 ? numbers[1] - numbers[0] : 0;
  if (!numbers.every((value, i) => value === numbers[0] + step * i)) return null;
  if (!numbers.every((value, i) => formatInteger(value, width) === values[i])) return null;
  return `#${numbers[0]},${step}${width ? `,${width}` : ''}`;
}

function specFor(values: string[], frame: Frame): { spec: string; numeric: boolean } {
  if (values.every((value) => value === values[0])) return { spec: `=${values[0]}`, numeric: false };
  const numeric = arithmetic(values);
  if (numeric) return { spec: numeric, numeric: true };
  for (let length = 1; length < values.length; length++) {
    if (values.length % length === 0 && values.every((value, i) => value === values[i % length])) {
      return { spec: `@${values.slice(0, length).join(frame.slot)}`, numeric: false };
    }
  }
  return { spec: `~${values.join(frame.slot)}`, numeric: false };
}

function decodeSpec(spec: string, count: number, frame: Frame): string[] | null {
  if (spec.startsWith('=')) return Array(count).fill(spec.slice(1));
  if (spec.startsWith('#')) {
    const fields = spec.slice(1).split(',');
    if (fields.length < 2 || fields.length > 3) return null;
    const start = Number(fields[0]);
    const step = Number(fields[1]);
    const width = fields.length === 3 ? natural(fields[2]) : 0;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(step) || width === null || width < 0) return null;
    return Array.from({ length: count }, (_, i) => formatInteger(start + step * i, width)).every((x) => x !== null)
      ? Array.from({ length: count }, (_, i) => formatInteger(start + step * i, width)!)
      : null;
  }
  if (spec.startsWith('@') || spec.startsWith('~')) {
    const values = spec.slice(1).split(frame.slot);
    if (values.some((value) => value.length === 0) || (spec[0] === '~' && values.length !== count)) return null;
    return Array.from({ length: count }, (_, i) => values[i % values.length]);
  }
  return null;
}

function decodeBody(rest: string): string | null {
  if (rest.length < 4) return null;
  const frame: Frame = { field: rest[0], row: rest[1], slot: rest[2] };
  if (new Set([frame.field, frame.row, frame.slot]).size !== 3) return null;
  const countEnd = rest.indexOf(frame.row, 3);
  if (countEnd < 4) return null;
  const count = natural(rest.slice(3, countEnd));
  if (count === null || count < 1 || count > MAX_ROWS) return null;
  const sections = rest.slice(countEnd + 1).split(frame.row);
  if (sections.length !== 3) return null;
  const envelope = sections[0].split(frame.field);
  if (envelope.length !== 3) return null;
  const [prefix, joiner, suffix] = envelope;
  const pieces = sections[1].split(frame.slot);
  const specs = sections[2].split(frame.field);
  const columns = specs.map((spec) => decodeSpec(spec, count, frame));
  if (pieces.length !== columns.length + 1 || columns.some((column) => column === null)) return null;
  const objects: string[] = [];
  for (let r = 0; r < count; r++) {
    let object = pieces[0];
    for (let c = 0; c < columns.length; c++) object += columns[c]![r] + pieces[c + 1];
    objects.push(object);
  }
  return prefix + objects.join(joiner) + suffix;
}

export function tableDecode(wire: string): string {
  if (!wire.startsWith(SENTINEL)) return wire;
  return decodeBody(wire.slice(SENTINEL.length)) ?? wire;
}

function identity(text: string, enc: EncodingName, notes: string, t0: number): TableResult {
  const tokens = countTokens(text, enc);
  return {
    wire: text, decoded: text, exact: true, inTokens: tokens, outTokens: tokens,
    contractPrompt: '', contractTokens: 0, deliveredTokens: tokens, deliveredVsRaw: 0,
    savingsPct: 0, mode: 'identity', rows: 0, variableColumns: 0, numericColumns: 0,
    notes, encodeMs: (typeof performance !== 'undefined' ? performance.now() : 0) - t0,
  };
}

function forcedWrap(text: string, enc: EncodingName, t0: number): TableResult {
  const frame = chooseFrame(text, enc);
  if (!frame) return identity(text, enc, 'sentinel collision and no absent frame sigils', t0);
  const wire = `${SENTINEL}${frame.field}${frame.row}${frame.slot}1${frame.row}${frame.field}${frame.field}${frame.row}${frame.slot}${frame.row}~${text}`;
  const decoded = tableDecode(wire);
  const inTokens = countTokens(text, enc);
  const outTokens = countTokens(wire, enc);
  const contractTokens = countTokens(TABLE_SYSTEM_PROMPT, enc);
  return {
    wire, decoded, exact: decoded === text, inTokens, outTokens,
    contractPrompt: TABLE_SYSTEM_PROMPT, contractTokens,
    deliveredTokens: outTokens + contractTokens, deliveredVsRaw: inTokens - outTokens - contractTokens,
    savingsPct: inTokens ? ((inTokens - outTokens) / inTokens) * 100 : 0,
    mode: 'forced-wrap', rows: 1, variableColumns: 1, numericColumns: 0,
    notes: 'sentinel collision repaired with a literal TABLE frame',
    encodeMs: (typeof performance !== 'undefined' ? performance.now() : 0) - t0,
  };
}

export function tableEncode(text: string, enc: EncodingName = 'o200k_base'): TableResult {
  const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
  if (!text) return identity(text, enc, 'empty input', t0);
  if (text.length > MAX_CHARS) return identity(text, enc, 'over TABLE bounded input limit', t0);
  if (text.startsWith(SENTINEL)) return forcedWrap(text, enc, t0);
  const frame = chooseFrame(text, enc);
  if (!frame) return identity(text, enc, 'fewer than three absent frame sigils', t0);
  const parsed = parseArray(text);
  if (!parsed || parsed.objects.length < 6) return identity(text, enc, 'not a uniform flat JSON array', t0);
  const first = parsed.objects[0];
  if (parsed.objects.some((object) => object.parts.length !== first.parts.length || object.values.length !== first.values.length)) {
    return identity(text, enc, 'non-uniform value arity', t0);
  }
  // `parts[c]` is the static text before value column c and `parts[last]`
  // follows the final value. Move constant value lexemes into the surrounding
  // pieces; only genuinely varying columns receive slots and specs.
  const template: string[] = [first.parts[0]];
  const variableIndexes: number[] = [];
  for (let c = 0; c < first.values.length; c++) {
    const values = parsed.objects.map((object) => object.values[c]);
    if (values.every((value) => value === values[0])) {
      template[template.length - 1] += values[0] + first.parts[c + 1];
    } else {
      variableIndexes.push(c);
      template.push(first.parts[c + 1]);
    }
  }
  const variableColumns = variableIndexes.length;
  if (variableColumns < 1) return identity(text, enc, 'all object values are constant', t0);
  const specs: string[] = [];
  let numericColumns = 0;
  for (const c of variableIndexes) {
    const values = parsed.objects.map((object) => object.values[c]);
    const spec = specFor(values, frame);
    specs.push(spec.spec);
    if (spec.numeric) numericColumns++;
  }
  const body = `${frame.field}${frame.row}${frame.slot}${parsed.objects.length}${frame.row}${parsed.prefix}${frame.field}${parsed.joiner}${frame.field}${parsed.suffix}${frame.row}${template.map((part, i) => i < template.length - 1 ? part + frame.slot : part).join('')}${frame.row}${specs.join(frame.field)}`;
  const wire = SENTINEL + body;
  const decoded = tableDecode(wire);
  if (decoded !== text) return identity(text, enc, 'final TABLE round-trip failed', t0);
  const inTokens = countTokens(text, enc);
  const outTokens = countTokens(wire, enc);
  if (outTokens >= inTokens) return identity(text, enc, 'TABLE wire did not beat identity', t0);
  const contractTokens = countTokens(TABLE_SYSTEM_PROMPT, enc);
  if (outTokens + contractTokens >= inTokens) return identity(text, enc, 'TABLE delivered-token gate rejected the candidate', t0);
  return {
    wire, decoded, exact: true, inTokens, outTokens,
    contractPrompt: TABLE_SYSTEM_PROMPT, contractTokens,
    deliveredTokens: outTokens + contractTokens, deliveredVsRaw: inTokens - outTokens - contractTokens,
    savingsPct: inTokens ? ((inTokens - outTokens) / inTokens) * 100 : 0,
    mode: 'table', rows: parsed.objects.length, variableColumns, numericColumns,
    notes: `TABLE verified ${parsed.objects.length} flat JSON rows, ${variableColumns} varying lexical columns, ${numericColumns} arithmetic columns; byte-exact`,
    encodeMs: (typeof performance !== 'undefined' ? performance.now() : 0) - t0,
  };
}

export interface TableSelfTest { name: string; pass: boolean; details: string }

export function tableSelfTest(enc: EncodingName = 'o200k_base'): TableSelfTest[] {
  const compact = JSON.stringify(Array.from({ length: 40 }, (_, i) => ({ id: i, status: i % 2 ? 'ok' : 'warn', service: 'gateway', message: 'request completed', region: 'us-east-1', active: i % 2 === 0 })));
  const pretty = JSON.stringify(JSON.parse(compact), null, 2);
  const escaped = '[' + Array.from({ length: 20 }, (_, i) => `{"id":${i}, "msg":"a,b;\\\"quoted\\\"", "ok":true}`).join(', ') + ']';
  const cases = [
    ['compact JSON array', compact],
    ['pretty JSON array', pretty],
    ['escaped primitive values', escaped],
    ['mandatory chaotic 900', FOLD_HANDTRACE_900],
    ['sentinel adversary', '[TA1]\nraw'],
    ['non-array identity', '{"id":1}'],
  ] as const;
  const out: TableSelfTest[] = [];
  for (const [name, input] of cases) {
    try {
      const result = tableEncode(input, enc);
      out.push({ name, pass: result.exact && tableDecode(result.wire) === input && (result.mode === 'forced-wrap' || result.outTokens <= result.inTokens), details: `${result.mode} ${result.inTokens}→${result.outTokens}; ${result.notes}` });
    } catch (error) {
      out.push({ name, pass: false, details: String(error) });
    }
  }
  return out;
}
