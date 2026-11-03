/**
 * STICHOMYTHIA — the column is a PROGRAM, not a column of data.
 * =============================================================================
 * στοιχομυθία — speaking row by row. A codec that reads a table body column by
 * column and asks, for each column, not "what are these values" but "what is
 * the shortest program that prints these values".
 *
 * WHY THIS IS NOT ANOTHER TABLE FOLD
 * -----------------------------------------------------------------------------
 * Every table codec in this stack (HYLE, KANON, AUSTEROS, TABMIN, the columnar
 * family) treats a body cell as a STRING to be copied, possibly deduplicated
 * across rows. The measured consequence, from X72 and X73: a fold can only win
 * where the cells repeat, so it pays on `ps`, `ls`, `kubectl` and loses on any
 * table whose cells are all distinct. X73 tested that wall from every side and
 * falsified all of it (see bench/x73/REPORT.md): columnar transposition ~0.2 %,
 * TAB normal form −24/0/+28 on three lanes, canonical re-padding exact on 0 of
 * 19–91 rows, table family on the TAB form losing outright. The wall is real:
 * copying N distinct cells cannot cost less than N.
 *
 * EIDOS found the way through it for TIME: `t_n = t_{n-1} + Δ`, so a timestamp
 * column becomes two tokens of arithmetic. But EIDOS applies that ONLY to time,
 * and only as a delta along the column. STICHOMYTHIA is the generalisation: a
 * column is a sequence of VALUES PRINTED BY A PROGRAM, and the program may be
 * an arithmetic progression with an arbitrary integer step, a fixed-step clock,
 * a repeating cycle, or a constant — with an arbitrary literal affix on either
 * side of the numeric core. A cell is only stored when no program prints it.
 *
 * The win is not incremental. On `cue-sheet.md` (29 rows, 4 columns) the entire
 * body is four programs: the cue column is 1+r, the start column is 00:00:02
 * plus 3 s per row, the speaker column cycles s0,s1,s2,s3, and the text column
 * is "line "+(0+r). The frontier's cheapest self-describing message for that
 * lane is 163 tokens and it still spells out every row; STICHOMYTHIA prints the
 * four programs and a key, and the body costs nothing.
 *
 * WHAT IS NEW, PRECISELY
 * -----------------------------------------------------------------------------
 *   · Prior art for column generators: Virtual/K (arXiv:2410.14066) fits a
 *     regression per column inside a columnar store; ClickHouse ALP stores
 *     scaled integers. Both are PAYLOAD formats with an out-of-band schema.
 *   · Prior art for in-prompt codes decoded by a model: arXiv:2604.13066.
 *   · Prior art in this repo: EIDOS (Δ on timestamps), HYDRA/PAX (row vs
 *     column order), AUSTEROS (the contract as an objective term).
 *   · New here: the per-column program is chosen by MEASURED MESSAGE COST among
 *     a fixed model family, the model family includes affixed arithmetic and
 *     cycles (not just deltas), and the whole thing is verified by executing the
 *     printed program — `decode(message) === source`, byte for byte — before the
 *     message is allowed to leave this module.
 *
 * WIRE
 * -----------------------------------------------------------------------------
 *   S<n> sep "<sep>" r=0..<m> body:<header line, verbatim, or ->   [header]
 *   spec; spec; ...                                               [one per column]
 *
 *   A spec is one of
 *     =v                 the constant v
 *     p a+k*r q          affix p, integer a + k*r, affix q   (text+k*r = text then number)
 *     a+k*s              a clock HH:MM:SS advanced by k seconds per row
 *     v0|v1|...|vk*      the cycle v0..vk, repeated
 *     v0|v1|...|vk       the literal list, one per row
 *
 *   r runs over the body rows, 0-based. Everything outside a column model — the
 *   separator, the header, the line terminator — is reproduced verbatim.
 *
 * CONTRACT (shipped in the message, one line, measured)
 * -----------------------------------------------------------------------------
 *   `spec: a+k*r = a+k times row#; a+k*s = clock +k sec; list* repeats; =v fixed.`
 *   The message is complete: the only thing a reader needs beyond it is
 *   addition, counting, and the will to print. No table, no codec, no tools.
 *
 * WHAT IS NOT CLAIMED
 * -----------------------------------------------------------------------------
 * No universal win. A table with distinct unstructured cells falls through to
 * the literal model and STICHOMYTHIA must then beat the frontier on its own or
 * lose; the encoder returns identity in that case rather than pretend. The
 * codec is exact by construction and by verification: every message is decoded
 * in-process and compared to the source, and a mismatch returns the source.
 * =============================================================================
 */

import { countTokens, type EncodingName } from './bpe';

// ---------------------------------------------------------------------------
// 0. RESULT
// ---------------------------------------------------------------------------
export interface StichomythiaResult {
  message: string;
  decoded: string;
  messageTokens: number;
  exact: boolean;
  applied: boolean;
  rows: number;
  cols: number;
  models: string[];
  contractTokens: number;
  specTokens: number;
  ms: number;
  notes: string;
}

/** The key. Shipped verbatim in every applied message. */
export const STICHOMYTHIA_KEY =
  'spec: v+k*r = v+(k*row#) printed like v; v@+ks = v plus k sec; list* repeats; =v fixed; body = header then rows.';

// ---------------------------------------------------------------------------
// 1. COLUMN MODELS
// ---------------------------------------------------------------------------
type NumFmt = { units: number; dec: number; width: number };
type Model =
  | { kind: 'const'; v: string }
  | { kind: 'affine'; pre: string; base: NumFmt; step: NumFmt; post: string }
  | { kind: 'time'; base: string; step: number }
  | { kind: 'cycle'; list: string[] }
  | { kind: 'literal'; list: string[] };

const CLOCK = /^(\d{1,2}):(\d{2}):(\d{2})$/;
const ISO_FULL = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(Z?)$/;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function clockToSec(v: string): number | null {
  const m = CLOCK.exec(v);
  if (!m) return null;
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}
function secToClock(s: number): string {
  const h = Math.floor(s / 3600);
  const m2 = Math.floor((s - h * 3600) / 60);
  const s2 = s - h * 3600 - m2 * 60;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(h)}:${p(m2)}:${p(s2)}`;
}

/** Seconds since epoch for the two ISO shapes, plus a renderer that reproduces
 *  the ORIGINAL shape (with or without Z, with or without a time part). */
function timeParse(v: string): number | null {
  const c = clockToSec(v);
  if (c !== null) return c;
  let m = ISO_FULL.exec(v);
  if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]) / 1000;
  m = ISO_DATE.exec(v);
  if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3]) / 1000;
  return null;
}
function timeRender(base: string, secs: number): string {
  if (CLOCK.test(base)) return secToClock(secs);
  const d = new Date(secs * 1000);
  const p = (n: number) => String(n).padStart(2, '0');
  const day = `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
  if (ISO_DATE.test(base)) return day;
  const tail = base.endsWith('Z') ? 'Z' : '';
  return `${day}T${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}${tail}`;
}

/** A printed number parsed into scaled integer units, remembering how it was
 *  printed (decimal places and zero-padding width) so the program can print it
 *  the same way. `SKU-001` and `12.50` both survive. */
function numParse(tok: string): NumFmt | null {
  if (!/^-?\d+(\.\d+)?$/.test(tok)) return null;
  const dot = tok.indexOf('.');
  const dec = dot < 0 ? 0 : tok.length - dot - 1;
  const neg = tok.startsWith('-');
  const digits = neg ? tok.slice(1) : tok;
  const intDigits = (dot < 0 ? digits : digits.slice(0, dot)).length;
  const units = Math.round(Number(tok) * Math.pow(10, dec));
  return { units, dec, width: intDigits };
}
function numRender(f: NumFmt, units: number): string {
  const neg = units < 0;
  const a = Math.abs(units);
  let out: string;
  if (f.dec === 0) out = String(a).padStart(f.width, '0');
  else out = `${String(Math.floor(a / Math.pow(10, f.dec))).padStart(f.width, '0')}.${String(a % Math.pow(10, f.dec)).padStart(f.dec, '0')}`;
  return (neg ? '-' : '') + out;
}

function renderNumDigits(f: NumFmt): string { return numRender(f, f.units); }

/** Split a value into a non-numeric prefix, a printed number and a suffix. */
function affixSplit(v: string): { pre: string; num: NumFmt; post: string } | null {
  const m = /^(.*?)(-?\d+(?:\.\d+)?)([^\d]*)$/s.exec(v);
  if (!m) return null;
  const num = numParse(m[2]);
  if (!num) return null;
  return { pre: m[1], num, post: m[3] };
}

function render(m: Model, r: number): string {
  switch (m.kind) {
    case 'const': return m.v;
    case 'affine': return m.pre + numRender(m.base, m.base.units + m.step.units * r) + m.post;
    case 'time': return timeRender(m.base, timeParse(m.base)! + m.step * r);
    case 'cycle': return m.list[r % m.list.length];
    case 'literal': return m.list[r] ?? '';
  }
}

function fitColumn(values: string[]): Model {
  const n = values.length;
  if (n === 0) return { kind: 'const', v: '' };
  if (values.every(v => v === values[0])) return { kind: 'const', v: values[0] };

  // constant-step clock / ISO stamp / ISO date
  const secs = values.map(timeParse);
  if (secs.every(s => s !== null)) {
    const step = (secs[1] as number) - (secs[0] as number);
    if (secs.every((s, i) => s === (secs[0] as number) + step * i) && timeRender(values[0], secs[0] as number) === values[0]) {
      return { kind: 'time', base: values[0], step };
    }
  }

  // affixed printed-number arithmetic progression (integers, decimals, zero-pad)
  const parts = values.map(affixSplit);
  if (parts.every(p => p !== null)) {
    const p0 = parts[0]!;
    const sameShape = parts.every(p => p!.pre === p0.pre && p!.post === p0.post &&
      p!.num.dec === p0.num.dec);
    if (sameShape) {
      const step = parts[1] ? parts[1]!.num.units - p0.num.units : 0;
      // Padding survives only when the program PRINTS BACK every value exactly
      // as the source printed it — `SKU-001` needs its width, `line 0` must not
      // inherit width 2 from `line 10`. The width is therefore the narrowest
      // observed, and the claim is checked value by value rather than assumed.
      const width = Math.min(...parts.map(p => p!.num.width));
      const base = { ...p0.num, width };
      const renders = parts.every((p, i) => numRender(base, base.units + step * i) === renderNumDigits(p!.num));
      if (renders && parts.every((p, i) => p!.num.units === p0.num.units + step * i)) {
        return { kind: 'affine', pre: p0.pre, base, step: { ...base, units: step }, post: p0.post };
      }
    }
  }

  // repeating cycle — at least two full repeats, so a cycle is never a
  // disguised literal list
  for (let p = 1; p <= Math.min(8, Math.floor(n / 2)); p++) {
    const list = values.slice(0, p);
    if (values.every((v, i) => v === list[i % p])) return { kind: 'cycle', list };
  }

  return { kind: 'literal', list: values };
}

function specOf(m: Model): string {
  switch (m.kind) {
    case 'const': return `=${m.v}`;
    case 'affine': {
      const sign = m.step.units >= 0 ? '+' : '-';
      // the step is a quantity, not a printed field: it never inherits the
      // zero-padding width of the base (`SKU-001+1*r`, not `SKU-001+001*r`)
      const stepFmt: NumFmt = { ...m.base, units: Math.abs(m.step.units), width: 1 };
      return `${m.pre}${numRender(m.base, m.base.units)}${sign}${numRender(stepFmt, Math.abs(m.step.units))}*r${m.post}`;
    }
    case 'time': {
      const sign = m.step >= 0 ? '+' : '-';
      return `${m.base}@${sign}${Math.abs(m.step)}s`;
    }
    case 'cycle': return `${m.list.join('|')}*`;
    case 'literal': return m.list.join('|');
  }
}

// ---------------------------------------------------------------------------
// 2. TABLE DISCOVERY
// ---------------------------------------------------------------------------
const SEPS = [' | ', '\t', ', ', '; ', ',', ';', '  ', '|'];

interface Table { sep: string; rows: string[][]; }

function asTable(lines: string[]): Table | null {
  if (lines.length < 3) return null;
  for (const sep of SEPS) {
    const rows = lines.map(l => l.split(sep));
    const k = rows[0].length;
    if (k < 2) continue;
    if (!rows.every(r => r.length === k)) continue;
    if (!rows.every((r, i) => r.join(sep) === lines[i])) continue;
    return { sep, rows };
  }
  return null;
}

// ---------------------------------------------------------------------------
// 3. ENCODE
// ---------------------------------------------------------------------------
export function stichomythiaEncode(text: string, enc: EncodingName = 'o200k_base'): StichomythiaResult {
  const t0 = Date.now();
  const identity = (notes: string): StichomythiaResult => ({
    message: text, decoded: text, messageTokens: countTokens(text, enc), exact: true,
    applied: false, rows: 0, cols: 0, models: [], contractTokens: 0,
    specTokens: countTokens(text, enc), ms: Date.now() - t0, notes,
  });

  // Trailing newline is part of the file; keep it out of the line split and put
  // it back, so the reconstruction is byte-identical rather than nearly so.
  const tail = text.endsWith('\n') ? '\n' : '';
  const lines = (tail ? text.slice(0, -1) : text).split('\n');
  const table = asTable(lines);
  if (!table) return identity('no uniform delimiter table');
  const { sep, rows } = table;
  if (rows.length < 3) return identity('too few rows');

  const header = lines[0];
  const body = rows.slice(1);
  const n = body.length;
  const cols = body[0].length;

  const models: Model[] = [];
  for (let c = 0; c < cols; c++) models.push(fitColumn(body.map(r => r[c])));
  const specs = models.map(specOf);

  const msg =
    `${STICHOMYTHIA_KEY}\n` +
    `S${n} sep "${sep}" r=0..${n - 1} body:${rows.length > n ? header : '-'}\n` +
    specs.join(' ; ') + tail;

  const decoded = tryDecode(msg);
  if (decoded !== text) return identity('decode mismatch — refused');
  if (countTokens(msg, enc) >= countTokens(text, enc)) return identity('no gain over identity — refused');

  const contractTokens = countTokens(STICHOMYTHIA_KEY, enc);
  const messageTokens = countTokens(msg, enc);
  return {
    message: msg, decoded, messageTokens, exact: true, applied: true,
    rows: n, cols, models: specs, contractTokens,
    specTokens: messageTokens - contractTokens, ms: Date.now() - t0,
    notes: `S${n}x${cols} sep=${JSON.stringify(sep)} models=${specs.length}`,
  };
}

// ---------------------------------------------------------------------------
// 4. DECODE — total, mechanical, executes the printed program.
// ---------------------------------------------------------------------------
export function stichomythiaDecode(message: string): string {
  const out = tryDecode(message);
  if (out === null) throw new Error('STICHOMYTHIA: message does not parse');
  return out;
}

function tryDecode(message: string): string | null {
  try {
    const tail = message.endsWith('\n') ? '\n' : '';
    const bodyText = tail ? message.slice(0, -1) : message;
    const lines = bodyText.split('\n');
    if (lines.length !== 3) return null;
    if (!lines[0].startsWith('spec:')) return null;
    const m = /^S(\d+) sep "([\s\S]*)" r=0\.\.(\d+) body:([\s\S]*)$/.exec(lines[1]);
    if (!m) return null;
    const n = Number(m[1]);
    const sep = m[2];
    const headerRaw = m[4];
    const specs = lines[2].split(' ; ');
    if (specs.length < 1) return null;

    const models: Model[] = specs.map(parseSpec);
    if (models.length !== specs.length) return null;

    const out: string[] = [];
    if (headerRaw !== '-') out.push(headerRaw);
    for (let r = 0; r < n; r++) out.push(models.map(mm => render(mm, r)).join(sep));
    return out.join('\n') + tail;
  } catch {
    return null;
  }
}

function parseSpec(s: string): Model {
  if (s.startsWith('=')) return { kind: 'const', v: s.slice(1) };
  if (s.endsWith('*')) return { kind: 'cycle', list: s.slice(0, -1).split('|') };
  const tm = /^(.*?)@([+-])(\d+)s$/.exec(s);
  if (tm && timeParse(tm[1]) !== null) {
    return { kind: 'time', base: tm[1], step: (tm[2] === '-' ? -1 : 1) * Number(tm[3]) };
  }
  const am = /^(.*?)(-?\d+(?:\.\d+)?)([+-])(\d+(?:\.\d+)?)\*r([^\d]*)$/s.exec(s);
  if (am) {
    const base = numParse(am[2]);
    const step = numParse(am[4]);
    if (base && step) {
      // the step is printed with the base's own shape, so `2.5+0.5*r` and
      // `1+1*r` both mean what they look like
      const stepUnits = (am[3] === '-' ? -1 : 1) * Math.round(step.units * Math.pow(10, base.dec - step.dec));
      return { kind: 'affine', pre: am[1], base, step: { ...base, units: stepUnits }, post: am[5] };
    }
  }
  return { kind: 'literal', list: s.split('|') };
}
