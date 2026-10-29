/**
 * APOGRAPHE (ἀπογραφή — "a written register, a list, an inventory taken by
 * writing each entry down against its position").
 *
 * X39. Every codec in this stack, without exception, is a SUBSTITUTION codec:
 * it finds a span of the text and writes something shorter in its place, and
 * the reader puts the span back. The whole family therefore pays a cost that
 * nobody in the stack has ever questioned, because none of them can: a
 * substitution needs a POINTER at the point of substitution. CHIRON pays a
 * glyph (1 token) per use. ANADIPLOSIS pays a count and a framing (3–9 tokens
 * per run). SYNCOPE pays a marker. HEMERA pays `※` plus digits. STIGME pays
 * nothing per use but only because it deletes characters that sit INSIDE a
 * token, which is a much narrower class.
 *
 *      per-use cost of a substitution ≥ 1 token, always.
 *
 * That is not a law of compression. It is a law of SUBSTITUTION. It stops being
 * true the moment the position of the value is already determined by the
 * document's own structure, because then the reader knows WHERE the value goes
 * without being told anything, and the value can be deleted outright.
 *
 *      a value whose position is determined costs ZERO tokens per row.
 *
 * This is the mechanism. A record set — a CSV, an `ls` listing, a `df`, a
 * `kubectl` table, a psql result — is a matrix, and a matrix has two
 * independent coordinate systems: the field ORDER inside a line, and the line
 * order in the file. A substitution codec can only see text, so it pays for
 * both coordinates on every row. A reader that is told the SHAPE of the matrix
 * gets both coordinates for free, and then a column whose values are
 * predictable need not be written at all.
 *
 * ---------------------------------------------------------------------------
 * 1. WHAT A LIFTED COLUMN COSTS
 * ---------------------------------------------------------------------------
 *
 * On `aapl-2014.csv` (240 rows of `date,price`) the shipped frontier encodes
 * each date as two glyphs: a rule for "\n2014-" shared by every row, plus a
 * rule for the month, plus the day. Measured: the body is 1265 tokens, of
 * which about 480 are the date column and about 800 are the 10-digit prices
 * (which are at the digit floor and cannot move — see §5).
 *
 * A lifted column costs one 9–16 token header, amortised over the file, and
 * nothing per row. 480 → ~10 on that lane. That is a 3× larger change than any
 * mechanism this stack has shipped since CHIRON, and it is not a niche: every
 * one of the four big families of machine text a person actually handles in a
 * working day is a record set.
 *
 * ---------------------------------------------------------------------------
 * 2. THE FIVE PREDICTORS, AND WHY THEY ARE ALL "ONE STEP"
 * ---------------------------------------------------------------------------
 *
 * A column is lifted by naming a PREDICTOR, and every predictor in v1 is a
 * one-step function of the state the reader already has. Nothing in the model
 * requires the reader to compute row k from row 0; the reader walks the file
 * once and each predicted value depends only on the line above it.
 *
 *   `above`     this column equals the line above. Covers `ditto` columns,
 *               sorted keys, carried-forward status, and constant columns —
 *               including the constant-column case the whole stack already
 *               handles with a framed RLE, but at zero cost per row instead of
 *               one token per span.
 *   `colM`      this column equals column M OF THE SAME LINE. Covers the
 *               duplicated-column family (vix's OPEN=HIGH=LOW=CLOSE, the
 *               trailing columns of a `kubectl` table, the second copy in a
 *               diff) at zero cost per row.
 *   `days`      this column is a date, and equals the date above plus one day.
 *   `workdays`  the next weekday. Friday advances by three, so the reader
 *               skips Saturday and Sunday. This is the calendar model, and it
 *               replaces 250 date deltas with 8 exceptions on `aapl-2014.csv`.
 *   `+b`        this column is `prefix digits suffix`, and equals the value
 *               above with its number increased by b, re-rendered with the
 *               SAME DIGIT WIDTH. Covers `df -h` (100G, 137G, 174G: +37),
 *               `kubectl` AGE/RESTARTS, `psql` ids (10, 11, 12: +1) and every
 *               padded counter. Keeping the width is what makes it exact:
 *               `user_0007` + 1 is `user_0008`, not `user_8`.
 *
 * A predictor that is wrong on a line does not break the file. That line is
 * simply written out in full, and — this is the load-bearing part — a full line
 * RESETS the state. So the wire is self-synchronising: after any exception, the
 * next value is computed from the exception, not from the model's expectation.
 * The encoder therefore never has to enumerate exceptions, quote them, count
 * them or index them. It emits the exception and moves on. On `aapl-2014.csv`
 * that is 8 holiday gaps, and the price of each is the price of the date it
 * already had to write.
 *
 * ---------------------------------------------------------------------------
 * 3. HOW THE READER KNOWS WHICH LINES ARE WHICH
 * ---------------------------------------------------------------------------
 *
 * Ambiguity is the whole risk of this design, so it is closed by arithmetic
 * rather than by markers. The header declares the FULL arity n and the number
 * of lifted columns L is visible in the header, so:
 *
 *     a line with n fields       is literal, and resets the state
 *     a line with n − L fields   is modelled, and gets its lifted columns back
 *     a line with any other count is literal as well (it cannot be modelled)
 *
 * One separator occurrence per field means the field count is decided by the
 * line itself and needs no marker. This is why the design requires a clean
 * record set: every field of a modelled line must be separator-free, which is
 * true by construction because the encoder split the line on that separator.
 *
 * The header is line 1 and is dropped on decode:
 *
 *     <n|sep|col=model;col=model;…>
 *     <2|,|1=workdays>
 *
 * and the first data line is always full, which is what seeds every predictor:
 * no seed value has to be transmitted, and the header does not have to carry
 * dates, numbers or prefixes.
 *
 * ---------------------------------------------------------------------------
 * 4. SELECTION: GREEDY FORWARD ADDITION, MEASURED
 * ---------------------------------------------------------------------------
 *
 * Lifting column A changes which lines are literal, which changes what column B
 * can predict, so the columns are not independent and cannot be scored
 * separately. The encoder therefore adds one (column, predictor) at a time,
 * keeping whichever single addition most reduces the TOKEN count of the
 * transformed text plus that predictor's contract sentence, and stops when no
 * addition helps. That is a greedy search over a small, discrete space (at most
 * arity × 6 candidates per round, at most arity rounds), and it is measured in
 * tokens, not in characters — the lesson ANADIPLOSIS learned when a
 * character-space threshold accepted two-character units that cost more than
 * the framing that carried them.
 *
 * The greedy result is then put through the same whole-message gate as every
 * other codec in the stack: encode the transformed text with the parent,
 * splice the contract, and ship only if the measured message is strictly
 * smaller than the parent's. APOGRAPHE can therefore never regress a lane.
 *
 * ---------------------------------------------------------------------------
 * 5. WHY THIS IS THE MECHANISM THAT WAS LEFT, AND WHAT IT CANNOT DO
 * ---------------------------------------------------------------------------
 *
 * Two measurements bound the whole field, and they were made this turn
 * (`bench/x39/floor.ts`) using brotli -q11 as an entropy oracle:
 *
 *   lane                  raw tok   wire   bits/token achieved
 *   kb-article.txt            656    622     14.46
 *   meeting-transcript.txt    472    385     14.21
 *   pom.xml                   544    242     13.16
 *   aapl-2014.csv            3108   1452      8.35
 *   dump.sql                 1795    608      9.54
 *
 * A token in o200k is a symbol from a 200k alphabet, so a wire cannot exceed
 * log2(200k) ≈ 17.6 bits of information per token. Prose in this stack is
 * already at 14.5, i.e. 82% of channel capacity: there is nothing left there
 * for ANY substitution codec, which is what six turns of prose null results
 * were independently measuring. Numbers are different. Ten decimal digits
 * carry 33 bits, and the tokenizer merges three digits per token, so the digit
 * channel tops out near 10 bits/token — and `aapl` sits at 8.35 of that,
 * because it is spending its tokens on the DATE, which is not information at
 * all. Lifting the date column is what takes the lane to the digit floor.
 *
 * Honest limits, stated before they are asked for:
 *   · Prose does not move. Not by this, not by anything here: see the numbers.
 *   · The record set must be separator-clean and its arity must be stable;
 *     a ragged log line makes the line literal, and a file with no stable
 *     arity is returned unchanged.
 *   · `dates` are Gregorian `YYYY-MM-DD` only. Times, timestamps, locales and
 *     month names are not in v1.
 *   · The reader must be able to advance a calendar and add integers. That is
 *     a weaker requirement than SYNCOPE's and far weaker than the arithmetic
 *     an LLM already does in a chat, but it is not nothing, and §6 of the
 *     report measures it rather than asserting it.
 */

import { countTokens, type EncodingName } from './bpe';
import {
  type AnadiplosisOptions, type AnadiplosisResult,
} from './anadiplosis';
// The parent is the FRONTIER, not an inner layer. `anadiplosisEncode` is three
// codecs short of the shipped frontier: on dump.sql it returns 662 where
// `ouraEncode` returns 608, on page.html 561 against 547, on vix 582 against 579.
// Gating against the inner layer would let APOGRAPHE "win" a comparison nobody
// asked it to win, so the gate runs against the codec the repo actually ships.
import { ouraEncode, ouraDecode } from './oura';
import { workEpoch, workBudgetFor } from './workmeter';
import { chironDecode } from './chiron';

/** Line ending kept verbatim, so the transform never has to re-join. */
interface Line { text: string; eol: string }

/** A predictor. Every one of them is a one-step function of the reader's state. */
export type ApographeModel =
  | { kind: 'above' }
  | { kind: 'col'; src: number }
  | { kind: 'days' }
  | { kind: 'workdays' }
  | { kind: 'int'; step: number }
  // ---- METRON families (X40). Absolute: the value is a function of the line's
  // OWN index, not of its predecessor, so a literal line never shifts any other
  // line and nothing accumulates. The render template travels in the header as a
  // sample value, so decimals, zero padding and unit suffixes are all preserved
  // by construction rather than by a separate width rule.
  | { kind: 'lin'; t: NumTemplate; v: number; at: number; s: number }
  | { kind: 'clock'; t: ClockTemplate; v: number; at: number; s: number };

export interface ApographeLift {
  /** 0-based column index */
  col: number;
  model: ApographeModel;
}

export interface ApographeConfig {
  n: number;
  sep: string;
  headerSep: string;
  open: string;
  close: string;
  lifts: ApographeLift[];
}

export interface ApographePlan {
  /** the transformed source, exactly as it will be handed to the parent */
  text: string;
  header: string;
  config: ApographeConfig;
  lifts: ApographeLift[];
  literalRows: number;
  modelledRows: number;
  /** token cost of the contract sentence that explains this plan */
  clauseTokens: number;
  clause: string;
  /** raw-token delta measured on the text alone (selection objective) */
  proxyGain: number;
}

/** Minimum data rows before a record set is worth a header. */
export const APOGRAPHE_MIN_ROWS = 6;
/** Minimum field count. A one-field "record set" has no columns to lift. */
export const APOGRAPHE_MIN_ARITY = 2;
/** Hard ceiling on input size, matching the rest of the stack's safety rails. */
export const APOGRAPHE_MAX_CHARS = 400_000;

/** Candidate openings, cheapest first. The source's line 1 must not start with one. */
export const APOGRAPHE_OPENERS: ReadonlyArray<readonly [string, string]> = [
  ['<', '>'],
  ['\u00ab', '\u00bb'],       // « »
  ['\u2039', '\u203a'],       // ‹ ›
  ['{', '}'],
  ['[', ']'],
];

/** Separators tried, in order of how common they are in real record sets. */
export const APOGRAPHE_SEPARATORS = [',', '\t', '|', ';'] as const;

/** Header inter-field separators (must differ from the data separator). */
const HEADER_SEPS = ['|', ';', '!'];

// ---------------------------------------------------------------------------
// line handling
// ---------------------------------------------------------------------------

function splitLines(text: string): Line[] {
  const out: Line[] = [];
  let i = 0;
  while (i <= text.length) {
    const j = text.indexOf('\n', i);
    if (j < 0) {
      if (i < text.length || out.length === 0) out.push({ text: text.slice(i), eol: '' });
      break;
    }
    let body = text.slice(i, j);
    let eol = '\n';
    if (body.endsWith('\r')) { body = body.slice(0, -1); eol = '\r\n'; }
    out.push({ text: body, eol });
    i = j + 1;
  }
  return out;
}

function joinLines(lines: Line[]): string {
  let out = '';
  for (const l of lines) out += l.text + l.eol;
  return out;
}

/** Number of fields a single-or-multi-character separator produces. */
function splitFields(line: string, sep: string): string[] {
  return line.split(sep);
}

// ---------------------------------------------------------------------------
// calendars — proleptic Gregorian day numbers, exact for every year 0001..9999
// ---------------------------------------------------------------------------

export function dayNumber(y: number, m: number, d: number): number {
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  return d + Math.floor((153 * mm + 2) / 5) + 365 * yy
    + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
}

export function fromDayNumber(z: number): { y: number; m: number; d: number } {
  const a = z + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor((146097 * b) / 4);
  const d2 = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d2) / 4);
  const m2 = Math.floor((5 * e + 2) / 153);
  return {
    d: e - Math.floor((153 * m2 + 2) / 5) + 1,
    m: m2 + 3 - 12 * Math.floor(m2 / 10),
    y: 100 * b + d2 - 4800 + Math.floor(m2 / 10),
  };
}

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseDate(s: string): { y: number; m: number; d: number; n: number } | null {
  const m = DATE_RE.exec(s);
  if (!m) return null;
  const y = +m[1], mo = +m[2], d = +m[3];
  if (y < 1 || y > 9999 || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const n = dayNumber(y, mo, d);
  const back = fromDayNumber(n);
  // reject 2026-02-30 and friends: the only exactness test is the round trip
  if (back.y !== y || back.m !== mo || back.d !== d) return null;
  return { y, m: mo, d, n };
}

export function formatDate(n: number): string {
  const t = fromDayNumber(n);
  const p = (v: number, w: number) => String(v).padStart(w, '0');
  return `${p(t.y, 4)}-${p(t.m, 2)}-${p(t.d, 2)}`;
}

/** 0 = Sunday … 6 = Saturday, for a Julian day number. */
export function weekdayOf(n: number): number {
  return (((n + 1) % 7) + 7) % 7;   // 32045 (0001-01-01) is a Monday
}

/** The next weekday after day number n (skips Sat and Sun). */
export function nextWorkday(n: number): number {
  let x = n + 1;
  for (let k = 0; k < 7; k++, x++) {
    const w = weekdayOf(x);
    if (w !== 0 && w !== 6) return x;
  }
  return x;
}

// ---------------------------------------------------------------------------
// number rendering with a preserved digit width
// ---------------------------------------------------------------------------

/** Split a field into prefix, digit run (the FIRST one), suffix. */
export function splitNumber(s: string): { pre: string; digits: string; suf: string } | null {
  const m = /^(\D*)(\d+)(\D*)$/.exec(s);
  if (!m) return null;
  return { pre: m[1], digits: m[2], suf: m[3] };
}

function renderNumber(pre: string, value: number, width: number, suf: string): string | null {
  if (!Number.isSafeInteger(value)) return null;
  const s = String(Math.abs(value));
  if (s.length > width) return null;                 // would change the column's width
  return pre + (value < 0 ? '-' : '') + s.padStart(width, '0') + suf;
}

// ---------------------------------------------------------------------------
// X40 METRON: render templates and absolute generators
// ---------------------------------------------------------------------------

/**
 * A number field split into everything that is NOT the value: leading text,
 * trailing text, decimal places and the width of the integer part. The value is
 * the integer obtained by deleting the point (`100.00` -> 10000, dec = 2).
 */
export interface NumTemplate { pre: string; suf: string; dec: number; width: number }

export function parseNumTemplate(field: string): { t: NumTemplate; v: number } | null {
  // the trailing text may be non-empty, so split it off first
  // `\D*?` is lazy so a leading '-' lands in the SIGN group, not in the prefix:
  // otherwise a mixed-sign column would have the minus baked into its template
  const m = /^(\D*?)(-?)(\d+)(?:\.(\d+))?(\D*)$/.exec(field);
  if (!m) return null;
  const dec = m[4] ? m[4].length : 0;
  const mag = Number(m[3] + (m[4] ?? ''));
  if (!Number.isSafeInteger(mag)) return null;
  const v = m[2] === '-' ? -mag : mag;
  return { t: { pre: m[1], suf: m[5], dec, width: m[3].length }, v };
}

export function sameNumTemplate(a: NumTemplate, b: NumTemplate): boolean {
  return a.pre === b.pre && a.suf === b.suf && a.dec === b.dec && a.width === b.width;
}

export function renderNumTemplate(t: NumTemplate, v: number): string | null {
  if (!Number.isSafeInteger(v)) return null;
  const neg = v < 0;
  const av = Math.abs(v);
  const unit = 10 ** t.dec;
  const ip = String(Math.floor(av / unit));
  if (ip.length > t.width) return null;            // the column would change width
  const fp = t.dec ? '.' + String(av % unit).padStart(t.dec, '0') : '';
  return t.pre + (neg ? '-' : '') + ip.padStart(t.width, '0') + fp + t.suf;
}

/** A clock field: `[00:02:05]`, `02:05`, `1:02:05.250`. Value = seconds. */
export interface ClockTemplate { pre: string; suf: string; fields: 2 | 3 }

export function parseClockTemplate(field: string): { t: ClockTemplate; v: number } | null {
  const m = /^(\D*)(\d{1,2}):(\d{2})(?::(\d{2}))?(\D*)$/.exec(field);
  if (!m) return null;
  const fields = (m[4] !== undefined ? 3 : 2) as 2 | 3;
  const v = fields === 3
    ? Number(m[2]) * 3600 + Number(m[3]) * 60 + Number(m[4])
    : Number(m[2]) * 60 + Number(m[3]);
  return { t: { pre: m[1], suf: m[5], fields }, v };
}

export function sameClockTemplate(a: ClockTemplate, b: ClockTemplate): boolean {
  return a.pre === b.pre && a.suf === b.suf && a.fields === b.fields;
}

export function renderClockTemplate(t: ClockTemplate, v: number): string | null {
  if (!Number.isSafeInteger(v) || v < 0) return null;
  const p = (x: number) => String(x).padStart(2, '0');
  if (t.fields === 2) {
    if (v >= 3600) return null;
    return t.pre + p(Math.floor(v / 60)) + ':' + p(v % 60) + t.suf;
  }
  return t.pre + p(Math.floor(v / 3600)) + ':' + p(Math.floor(v / 60) % 60) + ':' + p(v % 60) + t.suf;
}

/**
 * Exact absolute fit: is there (a, s) with value(line i) = a + s*i for every
 * line that parses? Returns null unless every parsing line agrees EXACTLY and at
 * least APOGRAPHE_MIN_ROWS lines parse. `s` must be an integer, which is what
 * makes the header cheap (no rationals) and the reader's arithmetic trivial.
 */
function fitAbsolute<T>(
  samples: Array<{ i: number; field: string }>,
  parse: (f: string) => { t: T; v: number } | null,
  same: (a: T, b: T) => boolean,
): { t: T; a: number; s: number } | null {
  let t: T | null = null;
  const pts: Array<{ i: number; v: number }> = [];
  for (const s of samples) {
    const p = parse(s.field);
    if (!p) continue;
    if (t === null) t = p.t;
    else if (!same(t, p.t)) return null;
    pts.push({ i: s.i, v: p.v });
  }
  if (t === null || pts.length < APOGRAPHE_MIN_ROWS) return null;
  const [p0, p1] = [pts[0], pts[1]];
  const den = p1.i - p0.i;
  if (!den) return null;
  const num = p1.v - p0.v;
  if (num % den !== 0) return null;
  const s = num / den;
  if (!Number.isSafeInteger(s)) return null;
  for (const p of pts) if (p0.v + s * (p.i - p0.i) !== p.v) return null;
  // the anchor is a REAL source value and its line index, never a projection to
  // line 0: a projection can be negative (a table whose first data row is line 1
  // with a negative step), and a clock cannot render a negative reading
  return { t, a: p0.v, at: p0.i, s } as any;
}

function fitLin(samples: Array<{ i: number; field: string }>): ApographeModel | null {
  const f: any = fitAbsolute(samples, parseNumTemplate, sameNumTemplate);
  if (!f) return null;
  if (renderNumTemplate(f.t, f.a) === null) return null;
  // a constant column is cheaper as `above`; a step of 1 on a width-1 integer is
  // cheaper as `+1`. Both are already in the portfolio; do not duplicate them.
  if (f.s === 0) return null;
  return { kind: 'lin', t: f.t, v: f.a, at: f.at, s: f.s };
}

function fitClock(samples: Array<{ i: number; field: string }>): ApographeModel | null {
  const f: any = fitAbsolute(samples, parseClockTemplate, sameClockTemplate);
  if (!f || f.s === 0) return null;
  if (renderClockTemplate(f.t, f.a) === null) return null;
  return { kind: 'clock', t: f.t, v: f.a, at: f.at, s: f.s };
}

// ---------------------------------------------------------------------------
// the predictors
// ---------------------------------------------------------------------------

/** A predictor's answer, or null when it refuses (which forces a literal line). */
type Predict = (state: string | undefined, row: Map<number, string>, i: number) => string | null;

function makePredict(model: ApographeModel): Predict {
  switch (model.kind) {
    case 'above':
      return (state) => (state === undefined ? null : state);
    case 'col':
      return (_state, row) => (row.has(model.src) ? row.get(model.src)! : null);
    case 'days':
      return (state) => {
        if (state === undefined) return null;
        const p = parseDate(state);
        return p ? formatDate(p.n + 1) : null;
      };
    case 'workdays':
      return (state) => {
        if (state === undefined) return null;
        const p = parseDate(state);
        return p ? formatDate(nextWorkday(p.n)) : null;
      };
    case 'int':
      return (state) => {
        if (state === undefined) return null;
        const p = splitNumber(state);
        if (!p) return null;
        const v = Number(p.digits) + model.step;
        if (!Number.isSafeInteger(v)) return null;
        return renderNumber(p.pre, v, p.digits.length, p.suf);
      };
    // absolute generators: the answer depends only on the line's own index
    case 'lin':
      return (_state, _row, i) => renderNumTemplate(model.t, model.v + model.s * (i - model.at));
    case 'clock':
      return (_state, _row, i) => renderClockTemplate(model.t, model.v + model.s * (i - model.at));
  }
}

// ---------------------------------------------------------------------------
// the transform
// ---------------------------------------------------------------------------

function renderHeader(cfg: ApographeConfig): string {
  const items = cfg.lifts.map((l) => {
    const c = String(l.col + 1);
    switch (l.model.kind) {
      case 'above': return `${c}=above`;
      case 'col': return `${c}=col${l.model.src + 1}`;
      case 'days': return `${c}=days`;
      case 'workdays': return `${c}=workdays`;
      case 'int': return `${c}=${l.model.step >= 0 ? '+' : ''}${l.model.step}`;
      case 'lin': {
        const sample = renderNumTemplate(l.model.t, l.model.v);
        return `${c}=lin:${sample}/${l.model.at},${l.model.s}`;
      }
      case 'clock': {
        const sample = renderClockTemplate(l.model.t, l.model.v);
        return `${c}=clock:${sample}/${l.model.at},${l.model.s}`;
      }
    }
  });
  return cfg.open + [String(cfg.n), cfg.sep, ...items].join(cfg.headerSep) + cfg.close;
}

export function apographeParseHeader(line: string, open: string, close: string): ApographeConfig | null {
  if (!line.startsWith(open) || !line.endsWith(close)) return null;
  const inner = line.slice(open.length, line.length - close.length);
  for (const headerSep of HEADER_SEPS) {
    const parts = inner.split(headerSep);
    if (parts.length < 3) continue;
    const n = Number(parts[0]);
    if (!Number.isInteger(n) || n < 2) continue;
    const sep = parts[1];
    if (!sep.length || sep.includes(headerSep)) continue;
    const lifts: ApographeLift[] = [];
    let ok = true;
    for (const item of parts.slice(2)) {
      const eq = item.indexOf('=');
      if (eq < 0) { ok = false; break; }
      const col = Number(item.slice(0, eq)) - 1;
      const spec = item.slice(eq + 1);
      if (!Number.isInteger(col) || col < 0 || col >= n) { ok = false; break; }
      let model: ApographeModel | null = null;
      if (spec === 'above') model = { kind: 'above' };
      else if (spec === 'days') model = { kind: 'days' };
      else if (spec === 'workdays') model = { kind: 'workdays' };
      else if (/^col\d+$/.test(spec)) {
        const src = Number(spec.slice(3)) - 1;
        if (src >= 0 && src < col) model = { kind: 'col', src };
      } else if (/^[+-]\d{1,15}$/.test(spec)) {
        model = { kind: 'int', step: Number(spec) };
      } else if (spec.startsWith('lin:') || spec.startsWith('clock:')) {
        const isClock = spec.startsWith('clock:');
        const rest = spec.slice(isClock ? 6 : 4);
        const cut = rest.lastIndexOf(',');
        const slash = cut > 0 ? rest.lastIndexOf('/', cut) : -1;
        if (cut > 0 && slash > 0) {
          const sample = rest.slice(0, slash);
          const at = Number(rest.slice(slash + 1, cut));
          const step = Number(rest.slice(cut + 1));
          if (Number.isSafeInteger(step) && Number.isInteger(at) && at >= 0
              && !sample.includes(headerSep) && !sample.includes('/')) {
            const p = isClock ? parseClockTemplate(sample) : parseNumTemplate(sample);
            // the sample must render back to itself, or the reader would build a
            // different column than the writer measured
            if (p) {
              const back = isClock
                ? renderClockTemplate(p.t as ClockTemplate, p.v)
                : renderNumTemplate(p.t as NumTemplate, p.v);
              if (back === sample) {
                model = isClock
                  ? { kind: 'clock', t: p.t as ClockTemplate, v: p.v, at, s: step }
                  : { kind: 'lin', t: p.t as NumTemplate, v: p.v, at, s: step };
              }
            }
          }
        }
      }
      if (!model || spec.includes(headerSep)) { ok = false; break; }
      if (lifts.some((l) => l.col === col)) { ok = false; break; }
      lifts.push({ col, model });
    }
    if (!ok || !lifts.length) continue;
    return { n, sep, headerSep, open, close, lifts: lifts.sort((a, b) => a.col - b.col) };
  }
  return null;
}

/**
 * Apply a plan to the ORIGINAL lines. Pure and total: returns null when any
 * structural condition fails, so the caller can fall back to identity.
 */
export function apographeApply(
  lines: Line[], cfg: ApographeConfig,
): { text: string; header: string; literalRows: number; modelledRows: number } | null {
  const L = cfg.lifts.length;
  if (!L || cfg.headerSep === cfg.sep) return null;
  const state = new Map<number, string>();
  const preds = new Map<number, Predict>();
  for (const l of cfg.lifts) preds.set(l.col, makePredict(l.model));

  const header = renderHeader(cfg);
  // the writer must be readable by the reader: if the header it emits does not
  // parse back to this exact configuration, the plan is refused rather than
  // written in a form the reader cannot open
  const echoed = apographeParseHeader(header, cfg.open, cfg.close);
  if (!echoed || echoed.n !== cfg.n || echoed.sep !== cfg.sep
      || echoed.lifts.length !== cfg.lifts.length) return null;
  const headerEol = lines.length ? (lines[0].eol || '\n') : '\n';
  const out: Line[] = [{ text: header, eol: headerEol }];

  let literalRows = 0;
  let modelledRows = 0;
  let rowIndex = -1;
  for (const ln of lines) {
    rowIndex++;
    const f = splitFields(ln.text, cfg.sep);
    if (f.length !== cfg.n) {
      // already short (or not a record line): copied verbatim; the reader does
      // the same because its field count is neither n nor n-L
      if (f.length === cfg.n - L) return null;
      out.push({ text: ln.text, eol: ln.eol });
      continue;
    }
    // full-arity line: reduce it when EVERY lifted column is predicted exactly
    const row = new Map<number, string>();
    let ok = true;
    for (let c = 0; c < cfg.n; c++) {
      if (!preds.has(c)) { row.set(c, f[c]); continue; }
      const v = preds.get(c)!(state.get(c), row, rowIndex);
      if (v === null || v !== f[c]) { ok = false; break; }
      row.set(c, v);
    }
    if (!ok) {
      out.push({ text: ln.text, eol: ln.eol });
      for (const l of cfg.lifts) state.set(l.col, f[l.col]);
      literalRows++;
      continue;
    }
    const kept: string[] = [];
    for (let c = 0; c < cfg.n; c++) if (!preds.has(c)) kept.push(f[c]);
    out.push({ text: kept.join(cfg.sep), eol: ln.eol });
    for (const l of cfg.lifts) state.set(l.col, f[l.col]);
    modelledRows++;
  }
  return { text: joinLines(out), header, literalRows, modelledRows };
}

/**
 * The reference decoder: exactly the reader rule, in code. Returns null when
 * the text is not a well-formed APOGRAPHE wire.
 */
export function apographeUndo(text: string): string | null {
  const lines = splitLines(text);
  if (!lines.length) return null;
  let cfg: ApographeConfig | null = null;
  for (const [open, close] of APOGRAPHE_OPENERS) {
    const c = apographeParseHeader(lines[0].text, open, close);
    if (c) { cfg = c; break; }
  }
  if (!cfg) return null;
  const L = cfg.lifts.length;
  const predCols = new Set(cfg.lifts.map((l) => l.col));
  const preds = new Map<number, Predict>();
  for (const l of cfg.lifts) preds.set(l.col, makePredict(l.model));
  const state = new Map<number, string>();
  const out: Line[] = [];

  for (let i = 1; i < lines.length; i++) {
    const f = splitFields(lines[i].text, cfg.sep);
    if (f.length === cfg.n) {
      out.push(lines[i]);
      for (const l of cfg.lifts) state.set(l.col, f[l.col]);
      continue;
    }
    if (f.length !== cfg.n - L) { out.push(lines[i]); continue; }
    const row = new Map<number, string>();
    const rebuilt: string[] = [];
    let k = 0;
    for (let c = 0; c < cfg.n; c++) {
      if (!predCols.has(c)) { row.set(c, f[k]); rebuilt.push(f[k]); k++; continue; }
      const v = preds.get(c)!(state.get(c), row, i - 1);
      if (v === null) return null;
      row.set(c, v);
      rebuilt.push(v);
    }
    out.push({ text: rebuilt.join(cfg.sep), eol: lines[i].eol });
    for (const l of cfg.lifts) state.set(l.col, row.get(l.col)!);
  }
  return joinLines(out);
}

// ---------------------------------------------------------------------------
// planning: greedy forward addition, measured in tokens
// ---------------------------------------------------------------------------

/** The modal difference between consecutive numbers of a column, if any. */
function modalStep(values: string[]): number | null {
  const counts = new Map<number, number>();
  for (let i = 1; i < values.length; i++) {
    const a = splitNumber(values[i - 1]);
    const b = splitNumber(values[i]);
    if (!a || !b || a.pre !== b.pre || a.suf !== b.suf || a.digits.length !== b.digits.length) continue;
    const d = Number(b.digits) - Number(a.digits);
    if (!Number.isSafeInteger(d) || d === 0) continue;
    counts.set(d, (counts.get(d) ?? 0) + 1);
  }
  let best: number | null = null;
  let bestN = 1;
  for (const [d, c] of counts) if (c > bestN) { bestN = c; best = d; }
  return best;
}

/** Candidate predictors for each column, cheapest-to-explain first. */
function candidatesFor(
  col: number, values: string[], n: number, rowIndex: number[] = [], kanon = false,
): ApographeModel[] {
  const out: ApographeModel[] = [];
  const nonEmpty = values.filter((v) => v.length > 0);
  if (!nonEmpty.length) return out;
  // Tolerance matters: the first line of a record set is often a column-title
  // row (aapl: `AAPL_x,AAPL_y`), which pollutes every column. A candidate is
  // therefore proposed on a MAJORITY, never on unanimity — the exact coverage is
  // settled afterwards by the token-measured greedy, not by the heuristic.
  const modalCount = (() => {
    const m = new Map<string, number>();
    for (const v of nonEmpty) m.set(v, (m.get(v) ?? 0) + 1);
    let best = 0;
    for (const c of m.values()) best = Math.max(best, c);
    return best;
  })();
  if (modalCount * 2 >= nonEmpty.length) out.push({ kind: 'above' });
  for (let s = 0; s < col; s++) out.push({ kind: 'col', src: s });
  const dateCount = nonEmpty.filter((v) => parseDate(v) !== null).length;
  if (dateCount * 2 >= nonEmpty.length) out.push({ kind: 'workdays' }, { kind: 'days' });
  const step = modalStep(values);
  if (step !== null) out.push({ kind: 'int', step });
  if (kanon && rowIndex.length === values.length) {
    // absolute generators see (line index, field) pairs, so a title row or a
    // holiday does not move the fit for any other line
    const samples = values.map((field, k) => ({ i: rowIndex[k], field }));
    const lin = fitLin(samples);
    if (lin) out.push(lin);
    const clk = fitClock(samples);
    if (clk) out.push(clk);
  }
  return out;
}

function liftsEqual(a: ApographeLift[], b: ApographeLift[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].col !== b[i].col) return false;
    const x = a[i].model, y = b[i].model;
    if (x.kind !== y.kind) return false;
    if (x.kind === 'col' && y.kind === 'col' && x.src !== y.src) return false;
    if (x.kind === 'int' && y.kind === 'int' && x.step !== y.step) return false;
    if (x.kind === 'lin' && y.kind === 'lin'
      && (x.v !== y.v || x.at !== y.at || x.s !== y.s || !sameNumTemplate(x.t, y.t))) return false;
    if (x.kind === 'clock' && y.kind === 'clock'
      && (x.v !== y.v || x.at !== y.at || x.s !== y.s || !sameClockTemplate(x.t, y.t))) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// the contract sentence
// ---------------------------------------------------------------------------

/**
 * Clause wordings, one per predictor family actually used. Every wording is
 * scored by measuring the contract it actually produces (EUTELEIA's lesson:
 * the price of a clause is the price of the junction, not of the clause).
 */
export const APOGRAPHE_CLAUSE: Record<string, string[]> = {
  above: [
    'colN=above: that column repeats the line above.',
    'colN=above: same as the line above.',
  ],
  col: [
    'colN=colM: that column copies column M of its own line.',
    'colN=colM: same line, column M.',
  ],
  days: [
    'colN=days: dates, one day apart.',
    'colN=days: the date above plus one day.',
  ],
  workdays: [
    'colN=workdays: dates, next weekday (skip Sat/Sun).',
    'colN=workdays: next weekday after the date above.',
  ],
  int: [
    'colN=+b: that column is the number above plus b, same digit count.',
    'colN=+b: number above + b, same width.',
  ],
  lin: [
    'colN=lin:V/i,S: V is line i; every line j has V+(j-i)*S in V\'s exact format.',
    'colN=lin:V/i,S: line i is V, each line j is V+(j-i)*S, written like V.',
  ],
  clock: [
    'colN=clock:V/i,S: line i reads V; line j reads V+(j-i)*S seconds, same clock format.',
    'colN=clock:V/i,S: V at line i, plus S seconds per line after, same shape.',
  ],
  setup: [
    'Line 1 is a header: n, sep, then col=model. Each named column is deleted from the lines and rebuilt at its place; a line with n fields is literal and resets. Drop line 1.',
    'Header line = n, sep, col=model; named columns are dropped from lines and rebuilt; a full n-field line is literal and resets. Drop it.',
    'Line 1: n|sep|col=model. Rebuild each named column (it is missing from the lines); a full n-field line is literal and resets. Drop line 1.',
  ],
  combined: [
    'above=line above, colM=column M of the same line, days/workdays=next date/weekday, +b=number above+b same width',
  ],
  combined2: [
    'above=line above, colM=column M of its own line, days/workdays=next date/weekday, +b=number above+b, lin:V/i,S=line i is V and line j is V+(j-i)*S',
  ],
};

/**
 * Candidate contract clauses for a plan. The encoder measures every candidate
 * against the exact contract it produces and keeps the cheapest — EUTELEIA's
 * junction-pricing rule, applied to a clause that is composed rather than
 * chosen. The space is small (three setup wordings × two wordings per family
 * used, plus one combined wording) and bounded by the arity.
 */
export function apographeClauseSets(lifts: ApographeLift[]): string[] {
  const kinds: string[] = [];
  for (const k of ['above', 'col', 'days', 'workdays', 'int', 'lin', 'clock']) {
    if (lifts.some((l) => l.model.kind === k)) kinds.push(k);
  }
  const out: string[] = [];
  const setups = APOGRAPHE_CLAUSE.setup;
  // (a) per-family wording, 2^i combinations
  const choices = kinds.map((k) => APOGRAPHE_CLAUSE[k]);
  const idx = new Array(kinds.length).fill(0);
  const combos: string[][] = [];
  const walk = (i: number, acc: string[]) => {
    if (i === kinds.length) { combos.push([...acc]); return; }
    for (let c = 0; c < choices[i].length; c++) { acc.push(choices[i][c]); walk(i + 1, acc); acc.pop(); }
  };
  walk(0, []);
  for (const setup of setups) for (const c of combos) out.push([setup, ...c].join(' '));
  // (b) the combined wording, which is cheaper as soon as two families are used
  if (kinds.length >= 2) {
    for (const setup of setups) out.push([setup, APOGRAPHE_CLAUSE.combined[0]].join(' '));
    // the two-family combined wording is ambiguous about lin/clock, so it is only
    // offered when neither is in play; otherwise a longer wording names them
    if (kinds.includes('lin') || kinds.includes('clock')) {
      for (const setup of setups) out.push([setup, APOGRAPHE_CLAUSE.combined2[0]].join(' '));
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// encode / decode
// ---------------------------------------------------------------------------

export interface ApographeOptions extends AnadiplosisOptions {
  apographe?: boolean;
  /** enable the METRON absolute-generator families (X40) */
  kanon?: boolean;
  /** force a plan (tests and the ablation benches) */
  forceLifts?: ApographeLift[];
  forceSep?: string;
  /** disable the parent-encode gate (tests only; the gate is what keeps lanes safe) */
  noGate?: boolean;
}

export interface ApographeResult extends AnadiplosisResult {
  apographe: boolean;
  apographeLifts: ApographeLift[];
  apographeSep: string;
  apographeArity: number;
  apographeModelled: number;
  apographeLiteral: number;
  apographeClause: string;
  apographeHeader: string;
  apographeProxyGain: number;
  /** the parent's measured one-chat message, so a receipt can state the delta */
  apographeParentTokens: number;
}

/** Choose the separator that makes the most lines have the same arity. */
export function detectSeparator(lines: Line[]):
  { sep: string; n: number; rows: number } | null {
  let best: { sep: string; n: number; rows: number } | null = null;
  for (const sep of APOGRAPHE_SEPARATORS) {
    const counts = new Map<number, number>();
    for (const l of lines) {
      const k = splitFields(l.text, sep).length;
      if (k < APOGRAPHE_MIN_ARITY) continue;
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    for (const [n, rows] of counts) {
      if (rows < APOGRAPHE_MIN_ROWS) continue;
      if (!best || rows > best.rows) best = { sep, n, rows };
    }
  }
  return best;
}

export function apographePlan(
  text: string, enc: EncodingName, opts: ApographeOptions = {},
): ApographePlan | null {
  if (opts.apographe === false) return null;
  if (!text.length || text.length > APOGRAPHE_MAX_CHARS) return null;
  const lines = splitLines(text);
  if (lines.length < APOGRAPHE_MIN_ROWS + 1) return null;
  // the source's first line must not already look like a header
  for (const [open] of APOGRAPHE_OPENERS) {
    if (lines[0].text.startsWith(open)) return null;
  }

  const detected = detectSeparator(lines);
  if (!detected) return null;
  const sep = opts.forceSep ?? detected.sep;
  const n = detected.n;

  const rowValues: string[][] = [];
  const rowIndex: number[] = [];
  lines.forEach((l, i) => {
    const f = splitFields(l.text, sep);
    if (f.length === n) { rowValues.push(f); rowIndex.push(i); }
  });
  if (rowValues.length < APOGRAPHE_MIN_ROWS) return null;

  const [open, close] = APOGRAPHE_OPENERS[0];
  const headerSep = HEADER_SEPS.find((h) => h !== sep) ?? '|';

  const baseTokens = countTokens(text, enc);
  const score = (lifts: ApographeLift[]): { tokens: number; wire: number; clause: string; text: string } | null => {
    if (!lifts.length) return { tokens: baseTokens, wire: baseTokens, clause: '', text };
    const cfg: ApographeConfig = { n, sep, headerSep, open, close, lifts };
    const applied = apographeApply(lines, cfg);
    if (!applied) return null;
    // soundness BEFORE measurement — the rewrite must be exactly invertible
    if (apographeUndo(applied.text) !== text) return null;
    let bestClause = '';
    let bestTotal = Infinity;
    for (const clause of apographeClauseSets(lifts)) {
      const c = countTokens(' ' + clause + '; print only.', enc)
        - countTokens('; print only.', enc);
      const total = countTokens(applied.text, enc) + c;
      if (total < bestTotal) { bestTotal = total; bestClause = clause; }
    }
    return { tokens: bestTotal, wire: countTokens(applied.text, enc), clause: bestClause, text: applied.text };
  };

  if (opts.forceLifts) {
    const s = score(opts.forceLifts);
    if (!s) return null;
    const applied = apographeApply(
      lines, { n, sep, headerSep, open, close, lifts: opts.forceLifts })!;
    return {
      text: applied.text, header: applied.header,
      config: { n, sep, headerSep, open, close, lifts: opts.forceLifts },
      lifts: opts.forceLifts, literalRows: applied.literalRows, modelledRows: applied.modelledRows,
      clauseTokens: s.tokens - countTokens(applied.text, enc), clause: s.clause,
      proxyGain: baseTokens - s.tokens,
    };
  }

  // Greedy forward addition, one (column, predictor) at a time. `by` is the
  // quantity the step must improve:
  //   'total' — the measured one-chat total (wire + clause). This is the X39
  //             search and is left byte-for-byte as it was.
  //   'wire'  — the wire alone. The clause is a FIXED cost paid once per plan,
  //             so charging it to the FIRST lift hides every plan whose win is
  //             spread over several columns: a table of four 2.5-second ramps
  //             saves ~41 tokens per column but the clause costs ~60, so no
  //             single lift clears the barrier and the total-greedy stops at
  //             zero lifts. Scoring the wire removes that artefact; the fixed
  //             cost is then paid once, at the gate, where it belongs.
  const greedy = (by: 'total' | 'wire'): { chosen: ApographeLift[]; s: NonNullable<ReturnType<typeof score>> } | null => {
    let best = score([]);
    if (!best) return null;
    const chosen: ApographeLift[] = [];
    for (;;) {
      let bestAdd: { lift: ApographeLift; s: NonNullable<ReturnType<typeof score>> } | null = null;
      for (let c = 0; c < n; c++) {
        if (chosen.some((l) => l.col === c)) continue;
        const colValues = rowValues.map((r) => r[c]);
        for (const model of candidatesFor(c, colValues, n, rowIndex, !!opts.kanon)) {
          const trial = [...chosen, { col: c, model }];
          const s = score(trial);
          if (!s) continue;
          const mine = by === 'total' ? s.tokens : s.wire;
          const curb = by === 'total' ? best!.tokens : best!.wire;
          if (mine < curb && (!bestAdd || mine < (by === 'total' ? bestAdd.s.tokens : bestAdd.s.wire))) {
            bestAdd = { lift: { col: c, model }, s };
          }
        }
      }
      if (!bestAdd) break;
      chosen.push(bestAdd.lift);
      best = bestAdd.s;
    }
    return { chosen, s: best! };
  };

  let run = greedy('total');
  // METRON only: if the total-greedy found nothing (or found a set that still
  // loses), look for a plan whose win only appears once several lifts share the
  // clause. The better of the two measured totals wins; a plan that does not
  // beat the parent is refused below, exactly as before.
  if (opts.kanon && (!run || run.s.tokens >= baseTokens)) {
    const alt = greedy('wire');
    if (alt && alt.chosen.length && (!run || alt.s.tokens < run.s.tokens)) run = alt;
  }
  if (!run || !run.chosen.length) return null;
  const chosen = run.chosen, best = run.s;
  const cfg: ApographeConfig = {
    n, sep, headerSep, open, close, lifts: chosen.sort((a, b) => a.col - b.col),
  };
  const applied = apographeApply(lines, cfg);
  if (!applied) return null;
  if (apographeUndo(applied.text) !== text) return null;
  return {
    text: applied.text, header: applied.header, config: cfg, lifts: cfg.lifts,
    literalRows: applied.literalRows, modelledRows: applied.modelledRows,
    clauseTokens: best.tokens - countTokens(applied.text, enc), clause: best.clause,
    proxyGain: baseTokens - best.tokens,
  };
}

/**
 * Encode: lift the modelled columns, then run the whole parent stack on the
 * transformed text, then keep the result only if the measured one-chat message
 * is strictly smaller than the parent's own.
 */
/** X57: top-level calls open a deterministic work window (workmeter.ts);
 * nested calls (inside TAGSTACK/ARCHETYPON epochs) share the outer one. */
export function apographeEncode(
  text: string,
  enc: EncodingName = 'o200k_base',
  opts: ApographeOptions = {},
): ApographeResult {
  return workEpoch(workBudgetFor(text.length), () => apographeEncodeInner(text, enc, opts));
}

function apographeEncodeInner(
  text: string,
  enc: EncodingName = 'o200k_base',
  opts: ApographeOptions = {},
): ApographeResult {
  const parent = ouraEncode(text, enc, opts);
  const plain: ApographeResult = {
    ...parent,
    apographe: false, apographeLifts: [], apographeSep: '', apographeArity: 0,
    apographeModelled: 0, apographeLiteral: 0, apographeClause: '',
    apographeHeader: '', apographeProxyGain: 0,
    apographeParentTokens: parent.messageTokens,
  };
  if (opts.apographe === false) return plain;

  let plan: ApographePlan | null = null;
  try { plan = apographePlan(text, enc, opts); } catch { plan = null; }
  if (!plan || plan.proxyGain <= 0) return plain;

  let alt: AnadiplosisResult;
  try { alt = ouraEncode(plan.text, enc, opts); } catch { return plain; }

  const baseTail = '; print only.';
  let total = alt.messageTokens + countTokens(' ' + plan.clause + baseTail, enc)
    - countTokens(baseTail, enc);
  if (!opts.noGate && total >= parent.messageTokens) return plain;

  return {
    ...alt,
    contract: alt.contract
      ? alt.contract.replace(/; print only\.$/, ` ${plan.clause} print only.`)
      : plan.clause,
    messageTokens: total,
    apographe: true,
    apographeLifts: plan.lifts,
    apographeSep: plan.config.sep,
    apographeArity: plan.config.n,
    apographeModelled: plan.modelledRows,
    apographeLiteral: plan.literalRows,
    apographeClause: plan.clause,
    apographeHeader: plan.header,
    apographeProxyGain: plan.proxyGain,
    apographeParentTokens: parent.messageTokens,
  };
}

/**
 * Which arm of the parent produced this wire — read from the wire itself.
 *
 * The parent reports an arm label in its result object, but that label is not part
 * of the message: a third-party reader has only the text. On `pl-kb.txt` the label
 * says `identity` while the wire opens with the tape mark and carries CHIRON rules,
 * so a decoder that trusts the label silently fails to expand them. The wire is the
 * authority: a tape opens with `§` and closes at the first `¶`.
 */
export function apographeArmOf(wire: string): 'tape' | 'plain' {
  const head = wire.replace(/^\s+/, '');
  if (!head.startsWith('\u00a7')) return 'plain';
  const end = head.indexOf('\u00b6');
  return end > 0 ? 'tape' : 'plain';
}

/** Decode: the parent first, then the column rebuild. */
export function apographeDecode(
  wire: string,
  cfg: { stats?: any; order?: 'in' | 'out'; undo: (w: string) => string },
  opts: Parameters<typeof ouraDecode>[2] = {},
): string {
  const expanded = ouraDecode(wire, cfg, opts);
  const back = apographeUndo(expanded);
  return back === null ? expanded : back;
}

/**
 * Decode a result the codec itself produced, without the caller having to know
 * which optional arms fired.
 *
 * This exists because of a real defect found in X40: the arm that undoes OURA's
 * tail-anchored numeric collapse needs `ouraShape`/`ouraMode`/`ouraSentinel`, and
 * a call site that passed only the five base options round-tripped fine on the
 * source (`40.0 s`) but silently produced `~400 s` once the transform pushed the
 * parent into OURA's mark mode. A decoder whose correctness depends on the caller
 * remembering an option list is not a decoder. The rule is now: the result object
 * carries everything, and the wire decides the arm.
 */
export function apographeDecodeResult(r: ApographeResult): string {
  return apographeDecode(r.wire, {
    stats: r.stats, order: r.order,
    undo: apographeArmOf(r.wire) === 'tape' ? chironDecode : (w: string) => w,
  }, {
    alphabet: r.alphabet, marker: r.marker, marker2: r.marker2,
    group: r.syncopeGroup, framing: r.framing,
    ouraShape: (r as any).ouraShape, ouraMode: (r as any).ouraMode,
    ouraSentinel: (r as any).ouraSentinel,
  } as any);
}

/** Convenience: encode, decode, compare. */
export function apographeRoundTrip(
  text: string, enc: EncodingName = 'o200k_base', opts: ApographeOptions = {},
): boolean {
  const r = apographeEncode(text, enc, opts);
  if (!r.apographe) return true;
  return apographeDecode(r.wire, {
    stats: r.stats, order: r.order,
    undo: r.parent === 'identity' ? (w: string) => w : (w: string) => w,
  }, {
    alphabet: r.alphabet, marker: r.marker, marker2: r.marker2,
    group: r.syncopeGroup, framing: r.framing,
  }) === text;
}
