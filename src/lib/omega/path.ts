/**
 * PATH-P1 — exact structural-path factoring for nested JSON arrays.
 *
 * Recent trie-oriented log compressors separate a repeated nested structure from
 * its values. PATH adapts that idea to this repository's readable-wire contract:
 * it factors a structural skeleton for each nested row shape, groups rows by
 * that shape, and keeps the original lexical JSON fragments and row order. It
 * is deliberately not a line-prefix trie (TRIE), a newline schema rewrite
 * (SIGMA), or TABLE's flat-object parser: its admission lane requires nested
 * containers and can carry several heterogeneous nested shapes in one array.
 *
 * A row is parsed without normalising it. Every primitive leaf is replaced by
 * one absent slot character in its shape skeleton; its original lexical value
 * is placed in a path-order column. Rows with equal skeletons share that
 * skeleton, while an assignment stream restores their original order. Constant,
 * arithmetic, cyclic, and literal columns are all decoded as exact lexemes.
 *
 * Wire (F/R/S/G are absent from the source):
 *   [PT1]\n F R S G groupCount R rowCount R prefix F joiner F suffix R
 *   skeleton R specs(F...) G skeleton R specs(F...) R groupIds(S...)
 *
 * The final decoder contract is counted by ECLIPSE. The encoder admits a wire
 * only after live-token measurement and a byte-for-byte decode gate.
 */
import { countTokens, type EncodingName } from './bpe';
import { ideographPool } from './strata';
import { spliceEncode } from './splice';

const SENTINEL = '[PT1]\n';
const MARKER = '\u0000';
const MAX_ROWS = 4000;
const MAX_GROUPS = 32;
const MAX_CHARS = 300_000;
const JSON_WS = /[ \t\r\n]/u;

export const PATH_SYSTEM_PROMPT =
  '[PT1] FRS G groupCount R rowCount R prefixFjoinerFsuffix R groups. Split groups by G; each group is skeleton R specs split by F, with primitive leaves as S slots in depth-first path order. Specs =x repeat, #a,d,w arithmetic, @xS cycle, ~xS literal list. Restore rows by groupIds split S, then prefix+rows joined by joiner+suffix; otherwise literal. Preserve JSON spelling and whitespace.';

export interface PathResult {
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
  mode: 'path' | 'identity' | 'forced-wrap';
  rows: number;
  groups: number;
  leaves: number;
  notes: string;
  encodeMs: number;
}

interface ValueNode {
  template: string;
  values: string[];
  end: number;
  container: boolean;
  nested: boolean;
}

interface ArrayLexeme {
  prefix: string;
  joiner: string;
  suffix: string;
  rows: ValueNode[];
}

interface Frame {
  field: string;
  row: string;
  slot: string;
  group: string;
}

function skipWhitespace(text: string, at: number): number {
  while (at < text.length && JSON_WS.test(text[at]!)) at++;
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
    if (text[i] === '"') {
      try {
        if (typeof JSON.parse(text.slice(at, i + 1)) === 'string') return i + 1;
      } catch {
        return null;
      }
      return null;
    }
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

function parseValue(text: string, start: number): ValueNode | null {
  const end = scanPrimitive(text, start);
  if (end === null) return null;
  return { template: MARKER, values: [text.slice(start, end)], end, container: false, nested: false };
}

/**
 * Container parsing is kept separate so every source byte between child values
 * is copied into the skeleton exactly once.
 */
function parseContainer(text: string, start: number): ValueNode | null {
  const opening = text[start];
  if (opening !== '{' && opening !== '[') return null;
  const close = opening === '{' ? '}' : ']';
  let cursor = start + 1;
  let template = opening;
  const values: string[] = [];
  let nested = false;

  while (true) {
    const valueAt = skipWhitespace(text, cursor);
    template += text.slice(cursor, valueAt);
    if (text[valueAt] === close) {
      const end = valueAt + 1;
      template += close;
      return { template, values, end, container: true, nested };
    }
    if (valueAt >= text.length) return null;

    let childStart = valueAt;
    if (opening === '{') {
      const keyEnd = scanString(text, childStart);
      if (keyEnd === null) return null;
      childStart = skipWhitespace(text, keyEnd);
      if (text[childStart] !== ':') return null;
      childStart = skipWhitespace(text, childStart + 1);
    }
    const child = (text[childStart] === '{' || text[childStart] === '[')
      ? parseContainer(text, childStart)
      : parseValue(text, childStart);
    if (!child) return null;
    // Copy object key/colon or array whitespace, then the child's factored body.
    template += text.slice(valueAt, childStart) + child.template;
    values.push(...child.values);
    if (child.container) nested = true;
    cursor = skipWhitespace(text, child.end);

    if (text[cursor] === ',') {
      const afterComma = cursor + 1;
      const next = skipWhitespace(text, afterComma);
      template += text.slice(child.end, next);
      cursor = next;
      continue;
    }
    if (text[cursor] === close) {
      template += text.slice(child.end, cursor) + close;
      return { template, values, end: cursor + 1, container: true, nested };
    }
    return null;
  }
}

function parseArray(text: string): ArrayLexeme | null {
  if (!text || text[0] !== '[') return null;
  const firstStart = skipWhitespace(text, 1);
  if (firstStart >= text.length || text[firstStart] === ']') return null;
  const first = (text[firstStart] === '{' || text[firstStart] === '[')
    ? parseContainer(text, firstStart)
    : parseValue(text, firstStart);
  if (!first) return null;
  const rows = [first];
  const prefix = text.slice(0, firstStart);
  let joiner: string | null = null;
  let current = first;

  while (true) {
    const boundary = skipWhitespace(text, current.end);
    if (text[boundary] === ']') {
      return { prefix, joiner: joiner ?? '', suffix: text.slice(current.end), rows };
    }
    if (text[boundary] !== ',') return null;
    const nextStart = skipWhitespace(text, boundary + 1);
    const candidateJoiner = text.slice(current.end, nextStart);
    if (joiner === null) joiner = candidateJoiner;
    if (joiner !== candidateJoiner) return null;
    const next = (text[nextStart] === '{' || text[nextStart] === '[')
      ? parseContainer(text, nextStart)
      : parseValue(text, nextStart);
    if (!next) return null;
    rows.push(next);
    if (rows.length > MAX_ROWS) return null;
    current = next;
  }
}

function chooseFrame(text: string, enc: EncodingName): Frame | null {
  const free = ideographPool(enc).filter((ch) => !text.includes(ch));
  return free.length >= 4 ? { field: free[0]!, row: free[1]!, slot: free[2]!, group: free[3]! } : null;
}

function natural(text: string): number | null {
  if (!/^(?:0|[1-9][0-9]*)$/u.test(text)) return null;
  const value = Number(text);
  return Number.isSafeInteger(value) ? value : null;
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
  const width = values.every((value) => value.length === values[0]!.length) ? values[0]!.length : 0;
  const step = numbers.length > 1 ? numbers[1]! - numbers[0]! : 0;
  if (!numbers.every((value, i) => value === numbers[0]! + step * i)) return null;
  if (!numbers.every((value, i) => formatInteger(value, width) === values[i])) return null;
  return `#${numbers[0]},${step}${width ? `,${width}` : ''}`;
}

function specFor(values: string[], frame: Frame): string {
  if (values.every((value) => value === values[0])) return `=${values[0]}`;
  const numeric = arithmetic(values);
  if (numeric) return numeric;
  for (let length = 1; length < values.length; length++) {
    if (values.length % length === 0 && values.every((value, i) => value === values[i % length])) {
      return `@${values.slice(0, length).join(frame.slot)}`;
    }
  }
  return `~${values.join(frame.slot)}`;
}

function decodeSpec(spec: string, count: number, frame: Frame): string[] | null {
  if (spec.startsWith('=')) return Array(count).fill(spec.slice(1));
  if (spec.startsWith('#')) {
    const fields = spec.slice(1).split(',');
    if (fields.length < 2 || fields.length > 3) return null;
    const start = Number(fields[0]);
    const step = Number(fields[1]);
    const width = fields.length === 3 ? natural(fields[2]!) : 0;
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
    if (values.some((value) => value.length === 0)) return null;
    if (spec[0] === '~' && values.length !== count) return null;
    return Array.from({ length: count }, (_, i) => values[i % values.length]!);
  }
  return null;
}

function decodeBody(rest: string): string | null {
  if (rest.length < 8) return null;
  const frame: Frame = { field: rest[0]!, row: rest[1]!, slot: rest[2]!, group: rest[3]! };
  if (new Set([frame.field, frame.row, frame.slot, frame.group]).size !== 4) return null;
  let at = 4;
  const groupEnd = rest.indexOf(frame.row, at);
  if (groupEnd < 4) return null;
  const groups = natural(rest.slice(at, groupEnd));
  at = groupEnd + 1;
  const rowEnd = rest.indexOf(frame.row, at);
  if (rowEnd < at) return null;
  const rowCount = natural(rest.slice(at, rowEnd));
  if (groups === null || rowCount === null || groups < 1 || groups > MAX_GROUPS || rowCount < 1 || rowCount > MAX_ROWS) return null;
  at = rowEnd + 1;
  const envEnd = rest.indexOf(frame.row, at);
  if (envEnd < at) return null;
  const envelope = rest.slice(at, envEnd).split(frame.field);
  if (envelope.length !== 3) return null;
  const [prefix, joiner, suffix] = envelope;
  const body = rest.slice(envEnd + 1);
  const finalRow = body.lastIndexOf(frame.row);
  if (finalRow < 0) return null;
  const groupText = body.slice(0, finalRow);
  const assignmentText = body.slice(finalRow + 1);
  const sections = groupText.split(frame.group);
  if (sections.length !== groups || assignmentText.length === 0) return null;
  const assignments = assignmentText.split(frame.slot).map(natural);
  if (assignments.length !== rowCount || assignments.some((g) => g === null || g < 0 || g >= groups)) return null;

  const rowsByGroup: string[][] = [];
  for (let g = 0; g < sections.length; g++) {
    const section = sections[g]!;
    const split = section.indexOf(frame.row);
    if (split < 1 || section.indexOf(frame.row, split + 1) !== -1) return null;
    const skeleton = section.slice(0, split);
    const specs = section.slice(split + 1).split(frame.field);
    const pieces = skeleton.split(frame.slot);
    if (pieces.length !== specs.length + 1 || specs.length === 0) return null;
    const count = assignments.filter((x) => x === g).length;
    if (count < 1) return null;
    const columns = specs.map((spec) => decodeSpec(spec, count, frame));
    if (columns.some((column) => column === null)) return null;
    const rows: string[] = [];
    for (let r = 0; r < count; r++) {
      let value = pieces[0]!;
      for (let c = 0; c < columns.length; c++) value += columns[c]![r]! + pieces[c + 1]!;
      rows.push(value);
    }
    rowsByGroup.push(rows);
  }

  const cursors = Array(groups).fill(0) as number[];
  const restored: string[] = [];
  for (const group of assignments) {
    const index = cursors[group!];
    const row = rowsByGroup[group!]![index];
    if (row === undefined) return null;
    restored.push(row);
    cursors[group!] = index + 1;
  }
  return prefix + restored.join(joiner) + suffix;
}

export function pathDecode(wire: string): string {
  if (!wire.startsWith(SENTINEL)) return wire;
  const rest = wire.slice(SENTINEL.length);
  if (rest.startsWith('L')) return SENTINEL + rest.slice(1);
  return decodeBody(rest) ?? wire;
}

function identity(text: string, enc: EncodingName, notes: string, t0: number): PathResult {
  const tokens = countTokens(text, enc);
  return {
    wire: text, decoded: text, exact: true, inTokens: tokens, outTokens: tokens,
    contractPrompt: '', contractTokens: 0, deliveredTokens: tokens, deliveredVsRaw: 0,
    savingsPct: 0, mode: 'identity', rows: 0, groups: 0, leaves: 0, notes,
    encodeMs: (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0,
  };
}

function forcedWrap(text: string, enc: EncodingName, t0: number): PathResult {
  const wire = SENTINEL + 'L' + (text.startsWith(SENTINEL) ? text.slice(SENTINEL.length) : text);
  const inTokens = countTokens(text, enc);
  const outTokens = countTokens(wire, enc);
  const contractTokens = countTokens(PATH_SYSTEM_PROMPT, enc);
  return {
    wire, decoded: pathDecode(wire), exact: pathDecode(wire) === text,
    inTokens, outTokens, contractPrompt: PATH_SYSTEM_PROMPT, contractTokens,
    deliveredTokens: outTokens + contractTokens, deliveredVsRaw: inTokens - outTokens - contractTokens,
    savingsPct: inTokens ? ((inTokens - outTokens) / inTokens) * 100 : 0,
    mode: 'forced-wrap', rows: 1, groups: 0, leaves: 0,
    notes: 'forced literal wrapper for a PT1-prefixed input',
    encodeMs: (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0,
  };
}

export function pathEncode(text: string, enc: EncodingName = 'o200k_base'): PathResult {
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  if (!text) return identity(text, enc, 'empty input', t0);
  if (text.startsWith(SENTINEL)) return forcedWrap(text, enc, t0);
  if (text.length > MAX_CHARS) return identity(text, enc, 'over PATH bounded input limit', t0);
  const frame = chooseFrame(text, enc);
  if (!frame) return identity(text, enc, 'fewer than four absent frame sigils', t0);
  const parsed = parseArray(text);
  if (!parsed || parsed.rows.length < 6 || parsed.rows.some((row) => !row.nested || row.values.length === 0)) {
    return identity(text, enc, 'not a repeated nested JSON array with primitive leaves', t0);
  }

  const groups: { skeleton: string; rows: ValueNode[] }[] = [];
  const bySkeleton = new Map<string, number>();
  for (let i = 0; i < parsed.rows.length; i++) {
    const row = parsed.rows[i]!;
    const key = row.template;
    let index = bySkeleton.get(key);
    if (index === undefined) {
      if (groups.length >= MAX_GROUPS) return identity(text, enc, 'too many nested row shapes', t0);
      index = groups.length;
      bySkeleton.set(key, index);
      groups.push({ skeleton: key, rows: [] });
    }
    groups[index]!.rows.push(row);
  }
  if (groups.some((group) => group.rows.length === 0)) return identity(text, enc, 'empty PATH shape group', t0);

  const sections: string[] = [];
  let leaves = 0;
  for (const group of groups) {
    const leafCount = group.rows[0]!.values.length;
    if (leafCount === 0 || group.rows.some((row) => row.values.length !== leafCount)) {
      return identity(text, enc, 'incompatible primitive path arity', t0);
    }
    const skeleton = group.skeleton.split(MARKER).join(frame.slot);
    const specs = Array.from({ length: leafCount }, (_, c) => {
      leaves++;
      return specFor(group.rows.map((row) => row.values[c]!), frame);
    });
    sections.push(`${skeleton}${frame.row}${specs.join(frame.field)}`);
  }
  const assignments = parsed.rows.map((row) => bySkeleton.get(row.template)!).join(frame.slot);
  const header = `${frame.field}${frame.row}${frame.slot}${frame.group}${groups.length}${frame.row}${parsed.rows.length}${frame.row}${parsed.prefix}${frame.field}${parsed.joiner}${frame.field}${parsed.suffix}${frame.row}`;
  const wire = SENTINEL + header + sections.join(frame.group) + frame.row + assignments;
  const decoded = pathDecode(wire);
  if (decoded !== text) return identity(text, enc, 'final PATH byte round-trip failed', t0);
  const inTokens = countTokens(text, enc);
  const outTokens = countTokens(wire, enc);
  if (outTokens >= inTokens) return identity(text, enc, 'PATH wire did not beat identity', t0);
  const contractTokens = countTokens(PATH_SYSTEM_PROMPT, enc);
  if (outTokens + contractTokens >= inTokens) return identity(text, enc, 'PATH delivered-token gate rejected candidate', t0);
  return {
    wire, decoded, exact: true, inTokens, outTokens,
    contractPrompt: PATH_SYSTEM_PROMPT, contractTokens,
    deliveredTokens: outTokens + contractTokens, deliveredVsRaw: inTokens - outTokens - contractTokens,
    savingsPct: inTokens ? ((inTokens - outTokens) / inTokens) * 100 : 0,
    mode: 'path', rows: parsed.rows.length, groups: groups.length, leaves,
    notes: `PATH verified ${parsed.rows.length} nested JSON rows across ${groups.length} structural shape group(s), ${leaves} path leaves; byte-exact`,
    encodeMs: (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0,
  };
}

export interface PathSelfTest { name: string; pass: boolean; details: string }

export function pathSelfTest(enc: EncodingName = 'o200k_base'): PathSelfTest[] {
  const nested = JSON.stringify(Array.from({ length: 40 }, (_, i) => ({
    id: i,
    meta: { service: 'gateway', region: i % 2 ? 'eu-west' : 'us-east', active: i % 2 === 0 },
    tags: ['request', i % 2 ? 'retry' : 'ok'],
  })));
  const heterogeneous = JSON.stringify(Array.from({ length: 30 }, (_, i) => i % 2
    ? { kind: 'event', payload: { id: i, ok: true, note: 'completed' } }
    : { kind: 'metric', payload: { id: i, value: i * 3 }, extra: { source: 'agent' } }));
  const pretty = JSON.stringify(JSON.parse(nested), null, 2);
  const cases: [string, string][] = [
    ['nested compact', nested],
    ['heterogeneous nested shapes', heterogeneous],
    ['nested pretty whitespace', pretty],
    ['flat TABLE negative space', JSON.stringify(Array.from({ length: 20 }, (_, i) => ({ id: i, ok: true })))],
    ['chaotic 900 identity', ('prose\n' + nested).slice(0, 900).padEnd(900, 'x')],
    ['sentinel adversary', '[PT1]\nnot a path wire'],
  ];
  const out: PathSelfTest[] = [];
  for (const [name, input] of cases) {
    try {
      const result = pathEncode(input, enc);
      const back = pathDecode(result.wire);
      const guard = result.mode === 'forced-wrap' || result.outTokens <= result.inTokens;
      out.push({ name, pass: back === input && result.exact && guard, details: `${result.mode} ${result.inTokens}→${result.outTokens}; ${result.notes}` });
    } catch (error) {
      out.push({ name, pass: false, details: String(error) });
    }
  }

  // Restricted-lane receipt: on a larger heterogeneous nested stream, PATH's
  // charged wire plus contract is strictly below the existing inline SPLICE
  // wire plus its charged contract. This is a local comparison, not a claim
  // about every input; incompressible inputs retain the identity fallback.
  try {
    const strictInput = JSON.stringify(Array.from({ length: 120 }, (_, i) => i % 2
      ? { kind: 'event', payload: { id: i, ok: true, note: 'request completed successfully', meta: { region: 'us-east-1' } } }
      : { kind: 'metric', payload: { id: i, value: i * 3, unit: 'ms' }, extra: { source: 'agent', version: 'v2' } }));
    const path = pathEncode(strictInput, enc);
    const splice = spliceEncode(strictInput, enc);
    const pathBack = pathDecode(path.wire);
    const pathDelivered = path.outTokens + path.contractTokens;
    const spliceDelivered = splice.outTokens + splice.contractTokens;
    out.push({
      name: 'strict nested heterogeneous lane vs SPLICE',
      pass: path.mode === 'path' && pathBack === strictInput && pathDelivered < spliceDelivered,
      details: `PATH ${pathDelivered} vs SPLICE ${spliceDelivered}; raw ${path.inTokens}; groups=${path.groups}`,
    });
  } catch (error) {
    out.push({ name: 'strict nested heterogeneous lane vs SPLICE', pass: false, details: String(error) });
  }
  return out;
}
