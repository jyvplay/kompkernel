/**
 * src/lib/omega/diastema.ts — ΔΙΆΣΤΗΜΑ (DIASTEMA, "interval, distance") — X43.
 *
 * ============================================================================
 * THE HOLE, MEASURED
 * ============================================================================
 * A `find -printf` / `stat` / `ls --full-iso` / `tar -tv` listing, and any log
 * with a clock in it, carries a WIDE NUMERIC STRING on most lines:
 *
 *   2026-09-30T07:59:52.6403938810       7193 node_modules/@babel/code-frame/lib/index.js
 *   2026-09-30T07:59:52.6923941430        132 node_modules/@babel/compat-data/corejs2-built-ins.js
 *
 * Twenty-four digits and six separators per line. Nothing in the current
 * frontier chain collapses them: the four-hundred-token residual census on
 * `bench/holdout-ops/find-listing.txt` (bench/x43/residual.ts) shows the final
 * OURA wire is 40% DIGIT tokens, and the whole lane is 3 997 raw -> 1 279 in the
 * one-chat message. The numbers are the residual.
 *
 * They are also almost free in principle: consecutive lines differ by a small
 * amount. Measured on that lane: the shaped column costs 2 159 o200k tokens in
 * place, and the same values carried as signed DECIMAL intervals cost 505 — a
 * 4.3x reduction on the column, measured, not assumed (bench/x43/enc.ts).
 *
 * ============================================================================
 * THE MECHANISM: INTERVALS OVER A SHAPE, NOT VALUES
 * ============================================================================
 * A value is decomposed into its DIGIT MASK — every digit run replaced by `#`
 * of the same length — and a single arbitrary-precision integer formed by
 * concatenating the digit runs:
 *
 *   2026-09-30T07:59:52.6403938810   ->   ####-##-##T##:##:##.##########
 *                                        (integer 202609300759526403938810)
 *
 * The mask is transmitted ONCE. Each following line transmits only the signed
 * interval to the previous participant's integer. The reader keeps a running
 * value, adds the interval, and renders it back into the mask by writing the
 * decimal digits, left-padded with `0` to the TOTAL digit count, then filled
 * into the runs left to right. That is exact by construction — no date
 * arithmetic, no calendar, no rounding, no locale, no time zone. 10-digit
 * nanosecond fields, 4-digit years, 1-digit counters and 19-digit epoch stamps
 * are all the same case.
 *
 * WHY DECIMAL, MEASURED: the same interval stream in o200k costs 505 tokens as
 * signed decimals, 626 as base-36, 563 as base-62 (bench/x43/enc.ts). BPE packs
 * digit runs densely and letters sparsely, so the "obvious" wide alphabet loses.
 *
 * THE PATTERN, NOT A MARKER: the lines that carry an interval are named by a
 * run-length line pattern (`R120L1`), not by a per-line marker glyph. A marker
 * costs one token per line (that is the shape of HORA, X13); a 120-line run
 * costs six characters once.
 *
 * ============================================================================
 * WHY THIS IS NOT HORA (X13), HONESTLY
 * ============================================================================
 * HORA (hora.ts, X13) is the ancestor and it is cited as such: it replaces a
 * `YYYY-MM-DD HH:MM:SS.mmm` timestamp that falls on the SAME DATE as the
 * previous one with `※N`, N = a millisecond offset with |N| < 10 000, and its
 * own boundary list says what it cannot do — "Date changes are literal (no day
 * roll-over arithmetic)"; "Clock values with 6 or 9 fractional digits are not
 * matched"; timezone suffixes untouched. It also requires the DAEDALUS parent.
 *
 * DIASTEMA is the same *idea* generalized until the format no longer matters:
 *
 *   - ANY mask: any number of digit runs, any widths, any separators, any
 *     position inside the token, any digit count (BigInt, not millisecond
 *     integers), 10-digit fractions included;
 *   - ANY token ordinal, not a timestamp at a known place;
 *   - NO same-date or magnitude restriction, no validity test on the fields —
 *     the value is never interpreted, only differenced;
 *   - the run-length pattern instead of a per-line marker;
 *   - a decimal envelope chosen by measurement over three candidates;
 *   - and it is gated against the CURRENT parent (OURA), not DAEDALUS.
 *
 * ============================================================================
 * WIRE (one self-describing message, contract in band)
 * ============================================================================
 *   line 1:  Δ <d> <mask> <d> <j> <d> <eol> <d> <pattern>
 *   body:    every line of the source, in order, with the j-th space-separated
 *            token of a RECORD line replaced by its signed decimal interval
 *
 *   <d>        a delimiter character absent from the source (measured choice)
 *   <mask>     the digit mask, `#` per digit, literals verbatim
 *   <j>        token ordinal of the shaped token, 0-based, among non-space runs
 *   <eol>      `s` = LF, `S` = CRLF
 *   <pattern>  run-length R/L: `R120L1` = 120 interval lines, then 1 literal
 *
 * The header is one line, so a wire is unambiguous: a source that begins with
 * `Δ` and parses as a header is a wire; anything else is returned untouched.
 *
 * ============================================================================
 * GATES (every failure returns the identity arm: the parent's own wire)
 * ============================================================================
 *   G1  the transform decodes back to the source, byte for byte, BEFORE it is
 *       measured (this is what catches a wrong delta chain)
 *   G2  the parent round-trips the transform (the stack's own decoder)
 *   G3  one-chat M = |parent(transform)| + |clause| is STRICTLY below
 *       |parent(source)|; the clause travels in the message
 *   G4  the emitted wire decodes to the source through the reader's own path
 *
 * ============================================================================
 * ADJACENT BUT DIFFERENT (must not be substituted)
 * ============================================================================
 * Not arithmetic-progression generation (METRON `lin`, KANNABOS `t:`): those
 * predict the NEXT VALUE from a law and need a law that holds; DIASTEMA needs
 * no law, only that the interval is small enough to be cheaper than the value.
 * Not HORA's same-date millisecond offsets (see above). Not run-length coding of
 * repeated values (KANNABOS `r`, TYPOS): here every value is distinct. Not a
 * dictionary (index letters cost one token per line). Not timeline compression
 * of sorted timestamps as a *sorted* stream (the source order is preserved
 * exactly, and the reader never sorts). Not lossy time bucketing: the digits are
 * recovered exactly.
 *
 * ============================================================================
 * TIME / CPU
 * ============================================================================
 * Plan: one pass over the lines per candidate token ordinal (at most 6), each
 * pass parsing the shaped token and chaining BigInts — milliseconds on any lane
 * in this corpus. The cost is the gate: one parent encode of the source and one
 * of the transform (the same price every codec in this stack pays).
 */

import { countTokens, type EncodingName } from './bpe';
import { ouraEncode } from './oura';
import { apographeDecodeResult } from './apographe';

// ---------------------------------------------------------------------------
// constants
// ---------------------------------------------------------------------------

/** A wire must start with this. It is one o200k token and never starts a CLI line. */
export const DIASTEMA_OPEN = 'Δ';
/** Candidate header delimiters, cheapest first (measured: `¦` and `·` are 1 token). */
const DELIMS = ['¦', '·', '␟', '‖', '⁞', '‡', '⟂'];
/** Minimum participant rows for a column to be worth transmitting a mask. */
export const DIASTEMA_MIN_ROWS = 6;
/** Minimum digits in the mask: below this the mask costs more than it saves. */
export const DIASTEMA_MIN_DIGITS = 6;
/** Candidate token ordinals inspected (0..MAX_ORD-1). */
const MAX_ORD = 8;
/** A mask longer than this is not a value any real tool prints. */
const MAX_MASK = 64;

// ---------------------------------------------------------------------------
// types
// ---------------------------------------------------------------------------

export interface DiastemaPlan {
  /** the mask, digits as `#`, literals verbatim */
  mask: string;
  /** total digit count in the mask */
  digits: number;
  /** token ordinal of the shaped token among non-space runs */
  ord: number;
  /** index of every participating line, ascending */
  rows: number[];
  /** signed decimal intervals, one per participant (the first is absolute) */
  deltas: string[];
  /** RLE line pattern: R = interval line, L = literal */
  pattern: string;
  /** the rendered transform (before the parent) */
  text: string;
  /** proxy only: measured column gain before the parent; never the decision */
  proxyGain: number;
}

export interface DiastemaResult {
  wire: string;
  contract: string;
  decoded: string;
  messageTokens: number;
  inTokens: number;
  diastema: boolean;
  mask: string;
  ord: number;
  rows: number;
  notes: string;
  /* the parent's decode view, so a receiver can undo the wire without re-encoding */
  stats?: unknown;
  order?: unknown;
  alphabet?: string;
  marker?: string;
  marker2?: string;
  syncopeGroup?: unknown;
  framing?: unknown;
  ouraShape?: unknown;
  ouraMode?: unknown;
  ouraSentinel?: unknown;
}

// ---------------------------------------------------------------------------
// shape algebra
// ---------------------------------------------------------------------------

/** Tokens of a line: every maximal non-space run, with exact offsets. */
export function diastemaTokens(line: string): Array<{ s: string; i: number; e: number }> {
  const out: Array<{ s: string; i: number; e: number }> = [];
  const re = /[^ ]+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) out.push({ s: m[0], i: m.index, e: m.index + m[0].length });
  return out;
}

/** Every digit run replaced by `#` of the same length. */
export function diastemaMask(s: string): string {
  return s.replace(/\d+/g, (d) => '#'.repeat(d.length));
}

/** The concatenated digit runs as one arbitrary-precision integer. */
export function diastemaValue(s: string): bigint {
  const d = s.replace(/\D/g, '');
  return d.length ? BigInt(d) : 0n;
}

/**
 * Render an integer into a mask. The decimal digits are left-padded with `0` to
 * the mask's TOTAL digit count and then filled into the runs, left to right —
 * which is what makes `52.6403938810` and `52.6403941276` both exact, including
 * every interior zero. Returns null when the value cannot fit.
 */
export function diastemaRender(mask: string, v: bigint): string | null {
  if (v < 0n) return null;
  const widths = [...mask.matchAll(/#+/g)].map((m) => m[0].length);
  const total = widths.reduce((a, b) => a + b, 0);
  const d = v.toString();
  if (d.length > total) return null;
  const padded = d.padStart(total, '0');
  let out = '';
  let di = 0;
  for (const m of mask.matchAll(/#+|[^#]+/g)) {
    if (m[0][0] === '#') { out += padded.slice(di, di + m[0].length); di += m[0].length; }
    else out += m[0];
  }
  return out;
}

/** Run-length a line pattern: `RRRLL` -> `R3L2`. */
export function diastemaRuns(pat: string): string {
  const out: string[] = [];
  let i = 0;
  while (i < pat.length) {
    let j = i;
    while (j < pat.length && pat[j] === pat[i]) j++;
    out.push(pat[i] + String(j - i));
    i = j;
  }
  return out.join('');
}

/** Inverse of `diastemaRuns`; null on anything malformed. */
export function diastemaPattern(r: string): string | null {
  let out = '';
  let i = 0;
  while (i < r.length) {
    const c = r[i];
    if (c !== 'R' && c !== 'L') return null;
    let j = i + 1;
    while (j < r.length && r[j] >= '0' && r[j] <= '9') j++;
    if (j === i + 1) return null;
    const n = Number(r.slice(i + 1, j));
    if (!Number.isSafeInteger(n) || n < 1 || n > 1e6) return null;
    out += c.repeat(n);
    i = j;
  }
  return out.length ? out : null;
}

// ---------------------------------------------------------------------------
// plan
// ---------------------------------------------------------------------------

/**
 * Find the shaped column that pays best, build the interval chain, and render
 * the transform. Returns null when no column pays — the codec then does nothing,
 * which is the only honest behaviour for a text with no intervals in it.
 */
export function diastemaPlan(text: string, enc: EncodingName = 'o200k_base'): DiastemaPlan | null {
  if (!text.length || text.length > 400_000) return null;
  if (text.startsWith(DIASTEMA_OPEN)) return null;          // never re-encode a wire
  // EOL is handled ONCE, globally: the wire body is LF-only and the header says
  // whether the reader puts CRs back. Mixed EOLs are not a listing and are
  // refused rather than silently normalized.
  const raw = text.split('\n');
  const crCount = raw.filter((l) => l.endsWith('\r')).length;
  if (crCount !== 0 && crCount !== raw.length - 1) return null;
  const lines = raw.map((l) => (l.endsWith('\r') ? l.slice(0, -1) : l));
  if (lines.length < DIASTEMA_MIN_ROWS + 1) return null;

  let best: { ord: number; mask: string; gain: number; rows: number[]; deltas: string[] } | null = null;
  for (let ord = 0; ord < MAX_ORD; ord++) {
    // Group the values at this ordinal by mask.
    const byMask = new Map<string, Array<{ li: number; s: string }>>();
    for (let i = 0; i < lines.length; i++) {
      const ts = diastemaTokens(lines[i]);
      if (ts.length <= ord) continue;
      const t = ts[ord];
      if (!/\d/.test(t.s)) continue;
      const m = diastemaMask(t.s);
      if (m.length > MAX_MASK) continue;
      const arr = byMask.get(m);
      if (arr) arr.push({ li: i, s: t.s });
      else byMask.set(m, [{ li: i, s: t.s }]);
    }
    for (const [mask, vals] of byMask) {
      const digits = mask.split('').filter((c) => c === '#').length;
      if (vals.length < DIASTEMA_MIN_ROWS || digits < DIASTEMA_MIN_DIGITS) continue;
      // Build the chain, verifying every render. A participant whose value does
      // not render into the mask (a wider number, a leading sign) is DROPPED into
      // the literal set rather than silently corrupted.
      const rows: number[] = [];
      const deltas: string[] = [];
      let prev: bigint | null = null;
      let ok = true;
      for (const v of vals) {
        const cur = diastemaValue(v.s);
        if (diastemaRender(mask, cur) !== v.s) continue;
        const d = prev === null ? cur : cur - prev;
        rows.push(v.li); deltas.push(d.toString()); prev = cur;
      }
      if (rows.length < DIASTEMA_MIN_ROWS || !ok) continue;
      // MEASURE, never estimate: the column's own token cost against the
      // intervals plus the mask, minus what the mask costs to state.
      // Membership is a set lookup, not Array.includes: `vals` and `rows`
      // can each be O(line count), so the previous nested scan was quadratic
      // for every (ordinal, mask) candidate on long listings. This changes no
      // fit, row order, token input, or acceptance decision.
      const participantRows = new Set(rows);
      const colTok = countTokens(vals.filter((v) => participantRows.has(v.li)).map((v) => v.s).join('\n'), enc);
      const dTok = countTokens(deltas.join('\n'), enc);
      const gain = colTok - dTok - countTokens(mask, enc) - 4;
      if (gain > 8 && (!best || gain > best.gain)) best = { ord, mask, gain, rows, deltas };
    }
  }
  if (!best) return null;

  // Render: the source with the shaped token replaced by its interval, in place.
  const rowSet = new Set(best.rows);
  const out: string[] = [];
  let k = 0;
  for (let i = 0; i < lines.length; i++) {
    if (!rowSet.has(i)) { out.push(lines[i]); continue; }
    const t = diastemaTokens(lines[i])[best.ord];
    out.push(lines[i].slice(0, t.i) + best.deltas[k++] + lines[i].slice(t.e));
  }
  const pat = lines.map((_, i) => (rowSet.has(i) ? 'R' : 'L')).join('');
  return {
    mask: best.mask, digits: best.mask.split('').filter((c) => c === '#').length,
    ord: best.ord, rows: best.rows, deltas: best.deltas,
    pattern: diastemaRuns(pat), text: out.join('\n'), proxyGain: best.gain,
  };
}

// ---------------------------------------------------------------------------
// wire
// ---------------------------------------------------------------------------

function delimFor(text: string): string | null {
  for (const d of DELIMS) if (!text.includes(d)) return d;
  return null;
}

/** Header line for a plan (chosen delimiter absent from both source and transform). */
export function diastemaWire(plan: DiastemaPlan, text: string): string | null {
  const d = delimFor(text) ?? delimFor(plan.text);
  if (!d) return null;
  const crlf = text.includes('\r\n');
  const head = [DIASTEMA_OPEN, plan.mask, String(plan.ord), crlf ? 'S' : 's', plan.pattern].join(d);
  return head + '\n' + plan.text;
}

// ---------------------------------------------------------------------------
// decode — total on encoder output, identity on anything else
// ---------------------------------------------------------------------------

export function diastemaDecode(wire: string): string {
  if (!wire.startsWith(DIASTEMA_OPEN)) return wire;
  const nl = wire.indexOf('\n');
  if (nl < 0) return wire;
  const head = wire.slice(0, nl);
  const d = head[1];
  if (!d) return wire;
  const f = head.slice(2).split(d);
  if (f.length !== 4) return wire;
  const [mask, ordS, eol, patR] = f;
  // A mask is ANY string with at least one digit run — it may start or end with a
  // literal (`id-###.bak`, `out-########`). The only requirement is that it has
  // something to fill and that it is short enough to be a value, not a document.
  if (!mask.length || mask.length > MAX_MASK || !mask.includes('#')) return wire;
  const ord = Number(ordS);
  if (!Number.isSafeInteger(ord) || ord < 0 || ord >= MAX_ORD) return wire;
  if (eol !== 's' && eol !== 'S') return wire;
  const pat = diastemaPattern(patR);
  if (!pat) return wire;

  const body = wire.slice(nl + 1);
  const bl = body.length ? body.split('\n') : [];
  if (bl.length !== pat.length) return wire;

  let v = 0n;
  const out: string[] = [];
  for (let i = 0; i < pat.length; i++) {
    const line = bl[i];
    if (pat[i] === 'L') { out.push(line); continue; }
    const ts = diastemaTokens(line);
    if (ts.length <= ord) return wire;
    const t = ts[ord];
    const neg = t.s[0] === '-';
    const digits = neg ? t.s.slice(1) : t.s;
    if (!/^\d+$/.test(digits)) return wire;
    const d2 = BigInt(digits);
    v = neg ? v - d2 : v + d2;
    const val = diastemaRender(mask, v);
    if (val === null) return wire;
    out.push(line.slice(0, t.i) + val + line.slice(t.e));
  }
  const clean = eol === 'S' ? out.map((l) => (l.endsWith('\r') ? l.slice(0, -1) : l)) : out;
  return clean.join(eol === 'S' ? '\r\n' : '\n');
}

// ---------------------------------------------------------------------------
// clause — the reader's rule, generated from the plan, measured
// ---------------------------------------------------------------------------

/**
 * The clause names only what this wire uses. `j` is omitted from the wording
 * when it is 0 (the common case: the shaped token leads the line).
 */
export function diastemaClause(plan: DiastemaPlan): string {
  // MEASURED: five phrasings were tokenised and this pair is the cheapest that
  // still fixes every degree of freedom the wire leaves open (bench/x43/cl.ts:
  // 99 tokens for the first draft, 45 for this one). The token ordinal is named
  // only when it is not 0 — `first space-token` is shorter and less ambiguous
  // than `j-th (0-based)`.
  const which = plan.ord === 0 ? 'first space-token' : `space-token ${plan.ord} (0-based)`;
  return `Δ: mask = value shape with # per digit. R: add the ${which} (signed int) to a sum`
    + ` from 0 and print it into the #s, zero-padded; L: verbatim. Print.`;
}

// ---------------------------------------------------------------------------
// encode — exactness first, then the parent's own measure
// ---------------------------------------------------------------------------

export interface DiastemaOptions { diastema?: boolean; [k: string]: unknown }

export function diastemaEncode(
  text: string, enc: EncodingName = 'o200k_base', opts: DiastemaOptions = {},
): DiastemaResult {
  const parent = ouraEncode(text, enc, opts as any) as any;
  const plain: DiastemaResult = {
    wire: parent.wire, contract: parent.contract, decoded: text,
    messageTokens: parent.messageTokens, inTokens: countTokens(text, enc),
    diastema: false, mask: '', ord: 0, rows: 0, notes: 'diastema off',
    stats: parent.stats, order: parent.order,
    alphabet: parent.alphabet, marker: parent.marker, marker2: parent.marker2,
    syncopeGroup: parent.syncopeGroup, framing: parent.framing,
    ouraShape: parent.ouraShape, ouraMode: parent.ouraMode, ouraSentinel: parent.ouraSentinel,
  };
  if (opts.diastema === false) return plain;
  let plan: DiastemaPlan | null = null;
  try { plan = diastemaPlan(text, enc); } catch { plan = null; }
  if (!plan) return plain;

  const wire0 = diastemaWire(plan, text);
  if (!wire0) return { ...plain, notes: 'interval column found, but no safe delimiter' };
  // SOUNDNESS BEFORE MEASUREMENT.
  if (diastemaDecode(wire0) !== text) {
    return { ...plain, notes: 'interval column found, but the transform is not byte-exact' };
  }
  const clause = diastemaClause(plan);
  let alt: any;
  try { alt = ouraEncode(wire0, enc, opts as any); } catch { return plain; }
  let decoded = text;
  try { decoded = diastemaDecode(apographeDecodeResult(alt)); } catch { decoded = 'THREW'; }
  if (decoded !== text) {
    return { ...plain, notes: 'interval column found, but the parent round-trip is not byte-exact' };
  }
  const tail = '; print only.';
  const total = alt.messageTokens + countTokens(' ' + clause + tail, enc) - countTokens(tail, enc);
  if (total >= parent.messageTokens) {
    return {
      ...plain,
      notes: `mask ${plan.mask} on ${plan.rows.length} lines but ${total} >= parent `
        + `${parent.messageTokens}: refused at the gate`,
    };
  }
  return {
    wire: alt.wire,
    contract: alt.contract
      ? alt.contract.replace(/; print only\.$/, ` ${clause} print only.`)
      : clause,
    decoded,
    messageTokens: total,
    inTokens: countTokens(text, enc),
    diastema: true,
    mask: plan.mask,
    ord: plan.ord,
    rows: plan.rows.length,
    notes: `rows=${plan.rows.length} proxy=${plan.proxyGain} parent=${parent.messageTokens} diastema=${total}`,
    stats: alt.stats, order: alt.order,
    alphabet: alt.alphabet, marker: alt.marker, marker2: alt.marker2,
    syncopeGroup: alt.syncopeGroup, framing: alt.framing,
    ouraShape: alt.ouraShape, ouraMode: alt.ouraMode, ouraSentinel: alt.ouraSentinel,
  };
}
