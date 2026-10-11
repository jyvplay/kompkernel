/**
 * HYLE — ὕλη, the matter without the form.
 * =============================================================================
 * THE CANONICAL-REGENERATION FOLD: delete what the decoder can rebuild,
 * instead of differencing it.
 *
 * -----------------------------------------------------------------------------
 * 0. WHAT EVERY PRIOR CODEC IN THIS REPOSITORY DOES, AND WHAT IT COSTS
 * -----------------------------------------------------------------------------
 * Every exact codec shipped here reduces a message by one of six moves:
 *
 *   CHIRON   copy      — a phrase used k times is stored once + k one-token
 *                        glyphs                       (LZ78 / two-part MDL)
 *   KIONES   order      — rows become columns so runs meet runs   (PAX 2001)
 *   GLOSSIA  grammar    — a header-tagged block is re-emitted as a schema
 *   EIDOS    generation — t_n = t_{n-1} + Δ, one delta symbol per row
 *   AION     invariance — x_n = x_{n-1}, one `=` symbol per row
 *   MNEMOSYNE abstraction — T1 <params>, one template tag per row
 *   ECHO     causality  — quote nesting folded; LETHE stego; ORACLE keys
 *
 * Note what the last four have in common: **they still pay one symbol per
 * row.** AION's "constant column" costs n−1 `=` glyphs. EIDOS's delta column
 * costs n−1 `+Δ` glyphs. MNEMOSYNE's template costs n−1 `T1` tags. The row
 * index is never eliminated; it is only re-labelled. That is the blind spot.
 *
 * HYLE removes the row entirely. If column c of a table is an exact function
 * of the row number — a constant, an arithmetic progression, a weekday date
 * series, a zero-padded counter, a cycling enum, or any literal template with
 * affine slots — then column c carries **zero bits** and must not appear in
 * the wire at all. The wire states the function once, O(1); the decoder
 * evaluates it n times. That is not a better difference code, it is a
 * different complexity class:
 *
 *      AION / EIDOS / MNEMOSYNE :  Θ(n) tokens for a generated column
 *      HYLE                     :  Θ(1) tokens for a generated column
 *
 * The same principle applies to *layout*, which is the second place this repo
 * pays for non-information:
 *
 *   INDENT  — leading whitespace in formatted JSON/XML/HTML/code is exactly
 *             U × (nesting depth). It is the output of a formatter, i.e. a
 *             function of the bracket structure that is already in the wire.
 *             Measured worth: 1397 tok on package-lock-head.json, 327 on
 *             page.html, 237 on gh-api.json, 116 on code-ts, 110 json-pkg,
 *             56 pom.xml, 47 chart.svg (this branch, o200k_base, 2026-10-10).
 *   ALIGN   — the space runs that pad `df -h` / `kubectl get` / `psql` output
 *             to fixed columns are exactly "pad field i to column c_i".
 *
 * -----------------------------------------------------------------------------
 * 1. WHY THIS IS AN *AI-NATIVE* MECHANISM AND NOT A CLASSICAL ONE
 * -----------------------------------------------------------------------------
 * gzip, zstd, PPM and CM cannot do any of this. A byte-exact decoder built
 * from arithmetic coding has no notion of "canonical indentation" or "the
 * r-th weekday": it can only invert a bitstream. The entire gain here comes
 * from a property unique to this repository's channel — **the decoder is a
 * language model, and a language model already contains the formatter.** It
 * has indented a million JSON files; it has written a million `for r in
 * range(n)` loops; it knows that a Monday-Friday series skips weekends. HYLE
 * is the first codec in this stack whose *decoder-side competence* is the
 * resource being spent, rather than decoder-side arithmetic.
 *
 * That is also why it is orthogonal to everything already shipped: the six
 * moves above all manipulate the message; HYLE moves work from the message to
 * the decoder's own deterministic competence. Same wire alphabet family
 * (one sentinel + a directive line + a body), same total decoder, same
 * byte-perfect contract, same single-chat readability requirement.
 *
 * -----------------------------------------------------------------------------
 * 2. WIRE
 * -----------------------------------------------------------------------------
 *   ¦ D1;D2;…\n BODY
 *
 *   ¦   U+00A6, verified 1 o200k_base token. A message not starting with ¦
 *       decodes to itself (total decoder, identity fallback).
 *   D   directives, `;`-separated, never containing a newline. The body
 *       begins at the FIRST newline, so no escaping is ever needed.
 *   BODY  the payload, handed to one ordinary arm of the existing stack
 *       (raw / chiron / kiones / hydra / glossia / eidos / aion / tachys).
 *       The arm letter is a directive, so decoding is deterministic — HYLE
 *       never guesses which sub-decoder to run.
 *
 * Directives (each emitted only if it is used, and only if it pays):
 *   B<letter>   which arm encodes BODY                       (b=raw, c=chiron,
 *               k=kiones, h=hydra, g=glossia, e=eidos, a=aion, t=tachys)
 *   I<U><M>[*i:n,…]  restore leading whitespace: U = unit (1..8 or t=tab),
 *               M = depth model (b = unclosed {[( outside strings/comments,
 *               g = XML/HTML element stack), `*` = per-line overrides.
 *   T<sep><a>-<b>[h]  lines a..b (0-based, inclusive) are one table; sep is
 *               `,` `;` `|` a literal tab, or `_` = single space; `h` = line a
 *               is a header and stays verbatim, the rest are rows r = 0,1,…
 *   A<c1>,<c2>,…  field i of those lines is space-padded so field i+1 starts
 *               at column c_{i+1} (measured after de-indenting).
 *   G<i>=<spec>   column i was DELETED from every data row; rebuild it.
 *               <spec> is literal text with {slot} parts, or:
 *                 {A+D}   A + D·r        m<M> = modulo, z<W> = zero-pad to W
 *                                        digits, c<X> = letter offset from X
 *                 {A+D f P} not used — decimals are carried by A and D
 *                 @A..B[w][-o1,o2,…]  dates, one per row: every day (w =
 *                                        Mon–Fri only) from A to B minus the
 *                                        listed offsets in days from A
 *                 @A+N[w][-…]         same, B implied as A + N days
 *                 #p:v0,v1,…          cycle of period p
 *               `{{` and `}}` are literal braces inside a template.
 *
 * -----------------------------------------------------------------------------
 * 3. EXACTNESS — THE ONLY CLAIM THAT MATTERS
 * -----------------------------------------------------------------------------
 * Every fold is *inferred* heuristically and then *verified* by running the
 * real decoder over the real wire and comparing bytes. A fold whose
 * reconstruction differs by one character is discarded, not shipped. HYLE
 * therefore cannot regress: its candidate set is a superset of the arms it
 * delegates to (identity is always a candidate), and every candidate is
 * round-trip checked before it is allowed to compete.
 *
 *   ∀ text · decode(encode(text)) === text          (round-trip, verified)
 *   ∀ text · M(hyle) ≤ min(arms)                    (superset, measured)
 *   ∃ text · M(hyle) < min(arms) − 3                (kubectl, aapl, vix, …)
 *
 * -----------------------------------------------------------------------------
 * 4. SPEED — THE SECOND PARETO AXIS
 * -----------------------------------------------------------------------------
 * Measured on this branch, this machine, o200k_base, cold-ish warm cache:
 *   package-lock-head.json  kiones 5460 tok in 126 113 ms
 *   gh-api.json.txt         kiones 1136 tok in  92 008 ms
 *   page.html               kiones   576 tok in  64 348 ms
 *   code-ts.txt             8-arm sweep          202 896 ms
 * The generator folds are O(n) single-pass with no search. HYLE ships a
 * `fast` mode that runs only O(n) detectors plus a budget-capped CHIRON and
 * an incumbent-free KIONES, and a *certificate* that skips both when an
 * admissible upper bound on every fold family plus the free-dictionary bound
 * (TACHYS `fastMacroBound`) proves no arm can pay for its own contract. The
 * certificate is an over-estimate by construction, so a certified exit can
 * only ever fire when there is genuinely nothing to win.
 *
 * -----------------------------------------------------------------------------
 * 5. WHAT IS NOT CLAIMED
 * -----------------------------------------------------------------------------
 * · No universal win. On prose with no table, no derivable indentation and no
 *   repeated phrase, HYLE ≡ identity and returns the input untouched with a
 *   ZERO-token contract (it does not even pay for a sentinel).
 * · No optimality. Smallest-grammar is NP-hard (Charikar 2005, IEEE TIT
 *   51(7):2554-2576); HYLE is a polynomial-time fold, and the fold lattice is
 *   searched greedily.
 * · No parametric-memory dependence. Unlike ORACLE, nothing in a HYLE wire
 *   asks the model to recall a fact it may not have. Every directive is
 *   arithmetic or string assembly on data present in the wire. That is why
 *   HYLE is exact on *any* input, not only on the 20 citations ORACLE's
 *   hardcoded ORACLE_MAP happens to cover.
 * · The decoder-side work is O(n) simple integer/date arithmetic. A model that
 *   can add a delta (AION's contract, already accepted in this repo) can
 *   evaluate A + D·r. The reference decoder below is the ground truth used
 *   for every number in the report, exactly as for every other codec here.
 * =============================================================================
 */

import { countTokens, type EncodingName } from './bpe';
import { chironEncode, chironDecode, chironDecoderPrompt } from './chiron';
import { kionesEncode, kionesDecode } from './kiones';
import { hydraEncode, hydraDecode } from './hydra';
import { glossiaEncode, glossiaDecode } from './glossia';
import { eidosEncode, eidosDecode } from './eidos';
import { aionEncode, aionDecode } from './aion';
import { tachysEncode, tachysDecode } from './tachys';
import { mosaicDecoderPrompt } from './mosaic';
import { anaphoraDecode } from './anaphora';

// ---------------------------------------------------------------------------
// 0. CONSTANTS, RESULT TYPE
// ---------------------------------------------------------------------------

/** U+00A6 BROKEN BAR — verified 1 token in o200k_base and cl100k_base. */
export const HYLE_SENTINEL = '¦';

/**
 * THE CONTRACT IS A FUNCTION OF THE WIRE, NOT A CONSTANT.
 *
 * HYLE pays for its contract on every single message (the access model is one
 * chat input/output, no system prompt, no skills file), so a fixed grammar is
 * a tax most wires do not owe.  Measured in o200k_base the monolithic clauses
 * cost CL_T=60, CL_A=67, CL_G=144, CL_I=53 -- CL_G alone outweighs the entire
 * wire of a 23-row kubectl table.  Each fold therefore ships a core fragment
 * plus one fragment per spec FEATURE the wire actually uses: a table with no
 * modulo slot never pays for the modulo sentence, a comma table never pays for
 * the space-run sentence, an indent fold with no exceptions never pays for the
 * exception sentence.  `hyleContractFor` is the only place that decides, and
 * the encoder charges exactly the string it returns.
 */

export const CL_T =
  'T: lines a-b are one table split by SEP into fields; the first hn lines stay verbatim and the rest are data rows r=0,1,2,...';
export const CL_T_RUNS =
  'SEP _ = one space between fields; only the last field of a line may contain spaces.';
export const CL_A =
  'A: column placement per field, 0-based: N = pad with spaces so the field starts at column N; -N = pad so the field ends at column N (right-aligned).';
export const CL_G =
  'G<c>=<spec>: rebuild deleted column c for each data row r=0,1,2,... and put it back in its own position. In spec {A+D} is the number A+D*r; {{ and }} are literal braces.';
export const CL_G_MOD = 'mM in a slot means A+((D*r) mod M).';
export const CL_G_PAD = 'zW in a slot = zero-pad to W digits.';
export const CL_G_LETTER = 'cX in a slot counts letters from X: {ca+1m5} = a,b,c,d,e,a,...';
export const CL_G_CYCLE = '#p:v0,v1,... = cycle through those p values.';
export const CL_G_DATE = '@A..B or @A+N = one date per row from A, every day (w = Monday to Friday only), minus the day-offsets after the final -.';
export const CL_I =
  'I<u><b>: give each line u*depth leading spaces (t = tabs), where depth = unclosed { [ ( before the line, ignoring quoted text and // comments, if b; XML/HTML element depth if g; a line starting with a closer uses depth-1.';
export const CL_I_EXC = '*i:n,... overrides line i with exactly n spaces.';

/** the full union, kept for the self-test and for cost accounting */
export const HYLE_CONTRACT = [
  CL_T, CL_T_RUNS, CL_A, CL_G, CL_G_MOD, CL_G_PAD, CL_G_LETTER, CL_G_CYCLE, CL_G_DATE, CL_I, CL_I_EXC,
].join(' ');

/** which spec features a list of G directives actually uses */
function specFeatures(gdirs: string[]): { mod: boolean; pad: boolean; letter: boolean; cycle: boolean; date: boolean } {
  const f = { mod: false, pad: false, letter: false, cycle: false, date: false };
  for (const d of gdirs) {
    const eq = d.indexOf('=');
    const sp = parseSpec(d.slice(eq + 1));
    // unparseable => explain every feature rather than risk a silent misread
    if (!sp) return { mod: true, pad: true, letter: true, cycle: true, date: true };
    if (sp.kind === 'cycle') f.cycle = true;
    else if (sp.kind === 'date') f.date = true;
    else for (const part of sp.parts) {
      if (!('slot' in part)) continue;
      if (part.slot.mod !== null) f.mod = true;
      if (part.slot.pad > 0) f.pad = true;
      if (part.slot.letter) f.letter = true;
    }
  }
  return f;
}

/** the minimal contract a decoder needs for this directive list */
export function hyleContractFor(dirs: string[]): string {
  const out: string[] = [];
  const T = dirs.find(d => d[0] === 'T');
  const I = dirs.find(d => d[0] === 'I');
  const G = dirs.filter(d => d[0] === 'G');
  if (T) {
    out.push(CL_T);
    if (T[1] === '_') out.push(CL_T_RUNS);
  }
  if (dirs.some(d => d[0] === 'A')) out.push(CL_A);
  if (G.length) {
    out.push(CL_G);
    const f = specFeatures(G);
    if (f.mod) out.push(CL_G_MOD);
    if (f.pad) out.push(CL_G_PAD);
    if (f.letter) out.push(CL_G_LETTER);
    if (f.cycle) out.push(CL_G_CYCLE);
    if (f.date) out.push(CL_G_DATE);
  }
  if (I) {
    out.push(CL_I);
    if (I.includes('*')) out.push(CL_I_EXC);
  }
  return out.join(' ');
}

/** token cost of every contract fragment, for the report's cost accounting */
export function clauseCosts(enc: EncodingName = 'o200k_base'): Record<string, number> {
  const all: Record<string, string> = {
    CL_T, CL_T_RUNS, CL_A, CL_G, CL_G_MOD, CL_G_PAD, CL_G_LETTER, CL_G_CYCLE, CL_G_DATE, CL_I, CL_I_EXC,
  };
  const out: Record<string, number> = {};
  for (const k of Object.keys(all)) out[k] = countTokens(all[k], enc);
  out.TOTAL = countTokens(HYLE_CONTRACT, enc);
  return out;
}

export interface HyleResult {
  codec: 'hyle';
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  messageTokens: number;
  contractTokens: number;
  decoderPrompt: string;
  savingsPct: number;
  winner: string;
  folds: string[];
  arm: string;
  certified: boolean;
  ms: number;
  notes: string;
  tried: string[];              // every (variant, arm) scored, with its honest M
  /** every variant the encoder built and REJECTED, with the measured reason.
   *  This is the machine-readable negative space: it shows which folds fired,
   *  which candidate column sets were tried, and the cost that disqualified
   *  each one.  Cleared at the start of every encode. */
  rejected: string[];
}

export interface HyleOptions {
  /** wall-clock budget for the whole encode, ms */
  budgetMs?: number;
  /** skip the search arms (chiron/kiones) — O(n) folds only */
  fast?: boolean;
  /** budget handed to chiron when the search arms do run, ms */
  chironBudgetMs?: number;
  /** also run the previous stack champion (ORACLE) as a candidate */
  includeChampion?: boolean;
}

// ---------------------------------------------------------------------------
// 1. SMALL EXACT-INTEGER HELPERS (BigInt, no float drift anywhere)
// ---------------------------------------------------------------------------

const BI10 = (n: number): bigint => 10n ** BigInt(n);

function decimalsOf(s: string): number {
  const i = s.indexOf('.');
  return i < 0 ? 0 : s.length - i - 1;
}

/** "100.00" -> { v: 10000n, scale: 2 } */
function parseDecimal(s: string): { v: bigint; scale: number } | null {
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  const scale = decimalsOf(s);
  const neg = s.startsWith('-');
  const body = neg ? s.slice(1) : s;
  const [ip, fp = ''] = body.split('.');
  const v = BigInt(ip + fp.padEnd(scale, '0')) * (neg ? -1n : 1n);
  return { v, scale };
}

function formatScaled(v: bigint, scale: number, pad: number): string {
  const neg = v < 0n;
  let a = neg ? -v : v;
  let ip: string, fp = '';
  if (scale > 0) {
    const d = BI10(scale);
    ip = (a / d).toString();
    fp = '.' + (a % d).toString().padStart(scale, '0');
  } else {
    ip = a.toString();
  }
  if (pad > ip.length) ip = ip.padStart(pad, '0');
  return (neg ? '-' : '') + ip + fp;
}

interface Slot {
  a: bigint; d: bigint; scale: number;
  mod: bigint | null; pad: number; letter: string | null;
}

function evalSlot(s: Slot, r: number): string {
  // MODULO SEMANTICS: v = a + ((d*r) mod M).  The base `a` is OUTSIDE the
  // modulus, because real formatters number things from 1 (months, 1-based
  // indices) as often as from 0.  Letters use the same rule, offset from the
  // declared base character.
  let v: bigint;
  if (s.mod !== null && s.mod > 0n) {
    const m = s.mod * BI10(s.scale);
    const t = s.d * BigInt(r);
    v = s.a + ((t % m) + m) % m;
  } else {
    v = s.a + s.d * BigInt(r);
  }
  if (s.letter) return String.fromCharCode(s.letter.charCodeAt(0) + Number(v));
  return formatScaled(v, s.scale, s.pad);
}

/** parse `{...}` inner text: `[c<X>]<A>+<D>[m<M>][z<W>]` */
function parseSlotSpec(inner: string): Slot | null {
  let rest = inner;
  let letter: string | null = null;
  if (/^c[A-Za-z]/.test(rest)) { letter = rest[1]; rest = rest.slice(2); }
  // suffixes are stripped in the REVERSE order the serializer emits them
  // (A+D, then m<M>, then z<W>) -- so z first, then m.  Stripping m first made
  // every padded modulo slot such as {1+1m12z2} (a month field) unparseable,
  // which is why psql's created_at column silently dropped out.
  const zm = rest.match(/^(.*?)z(\d+)$/);
  let pad = 0;
  if (zm) { pad = parseInt(zm[2], 10); rest = zm[1]; }
  const mm = rest.match(/^(.*?)m(-?\d+)$/);
  let mod: bigint | null = null;
  if (mm) { const p = parseDecimal(mm[2]); if (!p || p.v <= 0n) return null; mod = p.v; rest = mm[1]; }
  // split A+D at the first '+' that is not position 0
  let cut = -1;
  for (let i = 1; i < rest.length; i++) if (rest[i] === '+') { cut = i; break; }
  if (cut < 0) return null;
  const A = parseDecimal(rest.slice(0, cut));
  const D = parseDecimal(rest.slice(cut + 1));
  if (!A || !D) return null;
  const scale = Math.max(A.scale, D.scale);
  const k = BI10(scale);
  void k;
  return { a: A.v * BI10(scale - A.scale), d: D.v * BI10(scale - D.scale), scale, mod, pad, letter };
}

function specOfSlot(s: Slot): string {
  const A = formatScaled(s.a, s.scale, 0);
  const D = (s.d >= 0n ? '' : '') + formatScaled(s.d, s.scale, 0);
  let out = (s.letter ? 'c' + s.letter : '') + A + '+' + D;
  if (s.mod !== null) out += 'm' + formatScaled(s.mod, 0, 0);
  if (s.pad > 0) out += 'z' + s.pad;
  return out;
}

// ---------------------------------------------------------------------------
// 2. COLUMN SPEC: template | date | cycle
// ---------------------------------------------------------------------------

type ColSpec =
  | { kind: 'tpl'; parts: Array<{ lit: string } | { slot: Slot }> }
  | { kind: 'date'; start: number; span: number | null; end: number | null; weekdays: boolean; skip: number[]; explicitEnd: boolean }
  | { kind: 'cycle'; period: number; values: string[] };

const DAY = 86400000;
const isoDay = (n: number): string => new Date(n * DAY).toISOString().slice(0, 10);
const dayOf = (s: string): number => Math.round(Date.parse(s + 'T00:00:00Z') / DAY);

export function evalSpec(sp: ColSpec, r: number): string {
  if (sp.kind === 'tpl') {
    let out = '';
    for (const p of sp.parts) out += 'lit' in p ? p.lit : evalSlot(p.slot, r);
    return out;
  }
  if (sp.kind === 'cycle') return sp.values[((r % sp.period) + sp.period) % sp.period];
  // date
  const skip = new Set(sp.skip);
  const last = sp.explicitEnd ? sp.end! : sp.start + sp.span!;
  let seen = -1;
  for (let d = sp.start; d <= last; d++) {
    if (sp.weekdays) { const w = new Date(d * DAY).getUTCDay(); if (w === 0 || w === 6) continue; }
    if (skip.has(d - sp.start)) continue;
    seen++;
    if (seen === r) return isoDay(d);
  }
  return '';
}

export function parseSpec(spec: string): ColSpec | null {
  if (spec.startsWith('@')) {
    const m = spec.slice(1).match(/^(\d{4}-\d{2}-\d{2})(?:\.\.(\d{4}-\d{2}-\d{2})|\+(\d+))?(w)?(?:-([\d,]+))?$/);
    if (!m) return null;
    const start = dayOf(m[1]);
    const explicitEnd = !!m[2];
    const end = explicitEnd ? dayOf(m[2]) : start;
    const span = m[3] ? parseInt(m[3], 10) : 0;
    if (!explicitEnd && !m[3]) return null;
    const skip = m[5] ? m[5].split(',').filter(s => s.length).map(s => parseInt(s, 10)) : [];
    if (skip.some(isNaN)) return null;
    return { kind: 'date', start, span, end, weekdays: !!m[4], skip, explicitEnd };
  }
  if (spec.startsWith('#')) {
    const i = spec.indexOf(':');
    if (i < 0) return null;
    const p = parseInt(spec.slice(1, i), 10);
    if (!p || p < 1) return null;
    const values = spec.slice(i + 1).split(',');
    if (values.length !== p) return null;
    return { kind: 'cycle', period: p, values };
  }
  // template
  const parts: Array<{ lit: string } | { slot: Slot }> = [];
  let lit = '';
  for (let i = 0; i < spec.length; i++) {
    const c = spec[i];
    if (c === '{' && spec[i + 1] === '{') { lit += '{'; i++; continue; }
    if (c === '}' && spec[i + 1] === '}}') { lit += '}'; i++; continue; }
    if (c === '{') {
      let depth = 1, j = i + 1;
      while (j < spec.length && depth > 0) {
        if (spec[j] === '{') depth++;
        else if (spec[j] === '}') depth--;
        if (depth > 0) j++;
      }
      if (depth !== 0) return null;
      const inner = spec.slice(i + 1, j);
      const slot = parseSlotSpec(inner);
      if (!slot) return null;
      if (lit) { parts.push({ lit }); lit = ''; }
      parts.push({ slot });
      i = j;
      continue;
    }
    lit += c;
  }
  if (lit) parts.push({ lit });
  return { kind: 'tpl', parts };
}

export function serializeSpec(sp: ColSpec): string {
  if (sp.kind === 'cycle') return '#' + sp.period + ':' + sp.values.join(',');
  if (sp.kind === 'date') {
    let s = '@' + isoDay(sp.start);
    s += sp.explicitEnd ? '..' + isoDay(sp.end!) : '+' + sp.span;
    if (sp.weekdays) s += 'w';
    if (sp.skip.length) s += '-' + sp.skip.join(',');
    return s;
  }
  let out = '';
  for (const p of sp.parts) out += 'lit' in p ? p.lit.replace(/\{/g, '{{').replace(/\}/g, '}}') : '{' + specOfSlot(p.slot) + '}';
  return out;
}

// ---------------------------------------------------------------------------
// 3. RUN-CLASS ALIGNMENT — the template inference
// ---------------------------------------------------------------------------

type Run = { cls: 'dec' | 'int' | 'alpha' | 'oth'; text: string };

const RE_NODEC = /(\d+)|([A-Za-z]+)|([\s\S])/g;
const RE_DEC = /(\d+\.\d+)|(\d+)|([A-Za-z]+)|([\s\S])/g;

function runsOf(v: string, dec: boolean): Run[] {
  const out: Run[] = [];
  const re = dec ? RE_DEC : RE_NODEC;
  re.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(v)) !== null) {
    if (dec) {
      if (m[1]) out.push({ cls: 'dec', text: m[1] });
      else if (m[2]) out.push({ cls: 'int', text: m[2] });
      else if (m[3]) out.push({ cls: 'alpha', text: m[3] });
      else out.push({ cls: 'oth', text: m[4] });
    } else {
      if (m[1]) out.push({ cls: 'int', text: m[1] });
      else if (m[2]) out.push({ cls: 'alpha', text: m[2] });
      else out.push({ cls: 'oth', text: m[3] });
    }
  }
  // merge adjacent 'oth' runs so the skeleton is canonical
  const merged: Run[] = [];
  for (const r of out) {
    const last = merged[merged.length - 1];
    if (last && last.cls === 'oth' && r.cls === 'oth') last.text += r.text;
    else merged.push({ ...r });
  }
  return merged;
}

/**
 * Infer a column spec from n observed values. Returns null when the column is
 * not an exact function of the row index under the supported grammar.
 * Everything returned here is re-verified by generation before it is used.
 */
export function inferSpec(values: string[]): ColSpec | null {
  let best: ColSpec | null = null;
  let bestLen = Infinity;
  for (const dec of [false, true]) {
    const sp = inferSpecMode(values, dec);
    if (!sp) continue;
    if (!specMatches(sp, values)) continue;
    const len = serializeSpec(sp).length;
    if (len < bestLen) { best = sp; bestLen = len; }
  }
  return best;
}

function inferSpecMode(values: string[], dec: boolean): ColSpec | null {
  // A constant column is always the cheapest explanation, so it short-circuits.
  // Everything else is a CANDIDATE: a cycle is not automatically better than a
  // template.  `node-0.cluster.internal` repeated with period 5 is 60 tokens as
  // a cycle and 12 as `node-{0+1m5}.cluster.internal`, so both are built and
  // the shorter serialization wins.  Choosing by shape instead of by cost was
  // what made kubectl's NODE column 5x more expensive than it needed to be.
  const cands: ColSpec[] = [];
  const con = tryConstant(values);
  if (con) return con;
  const cyc = tryCycle(values);
  if (cyc) cands.push(cyc);
  const dat = tryDate(values);
  if (dat) cands.push(dat);
  const tpl = tryTemplate(values, dec);
  if (tpl) cands.push(tpl);
  let best: ColSpec | null = null;
  let bestLen = Infinity;
  for (const c of cands) {
    let l: number;
    try { l = serializeSpec(c).length; } catch { continue; }
    if (l < bestLen) { best = c; bestLen = l; }
  }
  return best;
}

function tryConstant(values: string[]): ColSpec | null {
  if (!values.every(v => v === values[0])) return null;
  if (/[{};,]/.test(values[0])) return null;
  return { kind: 'tpl', parts: [{ lit: values[0] }] };
}

/** smallest period p < n reproducing the whole column */
function tryCycle(values: string[]): ColSpec | null {
  const n = values.length;
  for (let p = 2; p <= Math.min(8, Math.floor(n / 2)); p++) {
    let ok = true;
    for (let r = 0; r < n && ok; r++) if (values[r] !== values[r % p]) ok = false;
    if (ok) {
      const cyc = values.slice(0, p);
      if (cyc.some(v => /[{}:;,]/.test(v))) return null;
      return { kind: 'cycle', period: p, values: cyc };
    }
  }
  return null;
}

/** every day, or every weekday, minus a skip list of offsets in days */
function tryDate(values: string[]): ColSpec | null {
  const n = values.length;
  if (!values.every(v => /^\d{4}-\d{2}-\d{2}$/.test(v))) return null;
  const days = values.map(dayOf);
  let inc = true;
  for (let i = 1; i < n; i++) if (days[i] <= days[i - 1]) inc = false;
  if (!inc) return null;
  const have = new Set(values);
  for (const weekdays of [true, false]) {
    const skip: number[] = [];
    let cnt = 0;
    const last = days[n - 1];
    for (let d = days[0]; d <= last; d++) {
      if (weekdays) { const w = new Date(d * DAY).getUTCDay(); if (w === 0 || w === 6) continue; }
      const s = isoDay(d);
      if (have.has(s)) cnt++; else skip.push(d - days[0]);
    }
    if (cnt !== n) continue;
    const span = last - days[0];
    return { kind: 'date', start: days[0], span, end: last, weekdays, skip, explicitEnd: false };
  }
  return null;
}

/** run-class-aligned template: literal text with {A+D[m<M>][z<W>][c<X>]} slots */
function tryTemplate(values: string[], dec: boolean): ColSpec | null {
  const n = values.length;
  const rr = values.map(v => runsOf(v, dec));
  const k = rr[0].length;
  if (k === 0 || k > 24) return null;
  if (!rr.every(r => r.length === k)) return null;
  const parts: Array<{ lit: string } | { slot: Slot }> = [];
  for (let j = 0; j < k; j++) {
    const col = rr.map(r => r[j]);
    const cls = col[0].cls;
    if (!col.every(c => c.cls === cls)) return null;
    if (cls === 'oth') {
      const t = col[0].text;
      if (!col.every(c => c.text === t)) return null;
      if (/[{}]/.test(t)) return null;
      const last = parts[parts.length - 1];
      if (last && 'lit' in last) last.lit += t; else parts.push({ lit: t });
      continue;
    }
    if (col.every(c => c.text === col[0].text)) {
      if (/[{}]/.test(col[0].text)) return null;
      const last = parts[parts.length - 1];
      if (last && 'lit' in last) last.lit += col[0].text; else parts.push({ lit: col[0].text });
      continue;
    }
    if (cls === 'alpha') {
      const codes = col.map(c => c.text.length === 1 ? c.text.charCodeAt(0) : NaN);
      if (codes.some(isNaN)) return null;
      const lo = Math.min(...codes), hi = Math.max(...codes);
      const o = codes.map(c => c - lo);
      const dd = codes[1] - codes[0];
      if (codes.every((v, r) => v === codes[0] + dd * r)) {
        // plain affine over char codes, expressed from the lowest letter seen
        parts.push({ slot: { a: BigInt(codes[0] - lo), d: BigInt(dd), scale: 0, mod: null, pad: 0, letter: String.fromCharCode(lo) } });
        continue;
      }
      const M = hi - lo + 1;
      const d = o[1];
      if (M >= 2 && o.every((v, r) => v === ((d * r) % M + M) % M)) {
        parts.push({ slot: { a: 0n, d: BigInt(d), scale: 0, mod: BigInt(M), pad: 0, letter: String.fromCharCode(lo) } });
        continue;
      }
      return null;
    }
    // numeric (int or dec)
    const scale = cls === 'dec' ? Math.max(...col.map(c => decimalsOf(c.text))) : 0;
    if (cls === 'dec' && !col.every(c => decimalsOf(c.text) === scale)) return null;
    const nums = col.map(c => { const q = parseDecimal(c.text); return q ? q.v * BI10(scale - q.scale) : null; });
    if (nums.some(v => v === null)) return null;
    const xs = nums as bigint[];
    const pad = cls === 'int' && col.every(c => c.text.length === col[0].text.length) && col[0].text.length > 1 && col[0].text.startsWith('0')
      ? col[0].text.length : 0;
    const d = xs[1] - xs[0];
    if (xs.every((v, r) => v === xs[0] + d * BigInt(r))) {
      parts.push({ slot: { a: xs[0], d, scale, mod: null, pad, letter: null } });
      continue;
    }
    // base + ((d*r) mod M): try the value range and the observed period
    if (scale === 0) {
      const lo = xs.reduce((a, b) => (b < a ? b : a), xs[0]);
      const hi = xs.reduce((a, b) => (b > a ? b : a), xs[0]);
      let period = 0;
      for (let p = 1; p <= Math.min(64, Math.floor(n / 2)); p++) {
        if (xs.every((v, r) => v === xs[r % p])) { period = p; break; }
      }
      const Ms: bigint[] = [];
      if (hi > lo) Ms.push(hi - lo + 1n);
      if (period > 1) Ms.push(BigInt(period));
      let got = false;
      for (const M of Ms) {
        if (got || M < 2n) continue;
        for (const dd of [xs[1] - xs[0], 1n, -1n]) {
          if (dd === 0n) continue;
          if (xs.every((v, r) => v === lo + (((dd * BigInt(r)) % M) + M) % M)) {
            parts.push({ slot: { a: lo, d: dd, scale: 0, mod: M, pad, letter: null } });
            got = true;
            break;
          }
        }
      }
      if (got) continue;
    }
    return null;
  }
  return { kind: 'tpl', parts };
}

/** verify a spec against every observed value; the only gate that matters */
function specMatches(sp: ColSpec, values: string[]): boolean {
  for (let r = 0; r < values.length; r++) {
    let v: string;
    try { v = evalSpec(sp, r); } catch { return false; }
    if (v !== values[r]) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// 4. FOLD I — CANONICAL INDENTATION
// ---------------------------------------------------------------------------

interface IndentSpec { unit: number; tab: boolean; model: 'b' | 'g'; over: Map<number, number>; }

const FLAT_TAGS = new Set(['html', 'head', 'body']);

function depthBracket(lines: string[]): number[] {
  const out: number[] = [];
  let d = 0, q: string | null = null, esc = false, block = false;
  for (const l of lines) {
    const t = l.trimStart();
    let dd = d;
    if (t.length && '})]'.includes(t[0])) dd = Math.max(0, d - 1);
    out.push(dd);
    for (let i = 0; i < l.length; i++) {
      const c = l[i];
      if (block) { if (c === '*' && l[i + 1] === '/') { block = false; i++; } continue; }
      if (esc) { esc = false; continue; }
      if (q) { if (c === '\\') esc = true; else if (c === q) q = null; continue; }
      if (c === '/' && l[i + 1] === '/') break;
      if (c === '/' && l[i + 1] === '*') { block = true; i++; continue; }
      if (c === '"' || c === "'" || c === '`') { q = c; continue; }
      if ('{[('.includes(c)) d++;
      else if ('})]'.includes(c)) d = Math.max(0, d - 1);
    }
  }
  return out;
}

function depthTag(lines: string[]): number[] {
  const out: number[] = [];
  const stack: string[] = [];
  const re = /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!\[CDATA\[[\s\S]*?\]\]>|<(\/?)([A-Za-z_][\w.:-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>/g;
  for (const l of lines) {
    const t = l.trimStart();
    let dd = stack.length;
    if (t.startsWith('</')) dd = Math.max(0, stack.length - 1);
    out.push(dd);
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(l)) !== null) {
      if (m[0][1] !== '<' || m[0][2] === undefined) continue;
      if (m[0].startsWith('<!--') || m[0].startsWith('<?') || m[0].startsWith('<!')) continue;
      const closing = m[1] === '/';
      const name = m[2];
      const selfClose = m[4] === '/';
      if (closing) { const i = stack.lastIndexOf(name); if (i >= 0) stack.length = i; else if (stack.length) stack.length = stack.length - 1; }
      else if (!selfClose && !FLAT_TAGS.has(name.toLowerCase())) stack.push(name);
      else if (!selfClose && FLAT_TAGS.has(name.toLowerCase())) { /* Prettier keeps html/head/body flat */ }
    }
  }
  return out;
}

function indentOf(l: string): string { return (l.match(/^[ \t]*/) ?? [''])[0]; }

interface IndentCand { spec: IndentSpec; body: string; gross: number; exc: number }

export function indentInfer(text: string): IndentCand | null {
  const lines = text.split('\n');
  if (lines.length < 4) return null;
  let indented = 0, spaces = 0;
  for (const l of lines) { const ind = indentOf(l); if (ind.length) { indented++; spaces += ind.length; } }
  if (indented < 4 || spaces < 16) return null;

  // A holder box, not a bare `let`: tsc's control-flow analysis loses track of
  // an assignment made four loops deep and then reports the read as `never`.
  const box: { best: IndentCand | null } = { best: null };
  const models: Array<'b' | 'g'> = text.includes('<') && /[<][A-Za-z!/]/.test(text) ? ['g', 'b'] : ['b', 'g'];
  for (const model of models) {
    const depth = model === 'b' ? depthBracket(lines) : depthTag(lines);
    for (const tab of [false, true]) {
      for (const unit of tab ? [1] : [2, 4, 8, 3, 1]) {
        const over = new Map<number, number>();
        let ok = true;
        for (let i = 0; i < lines.length; i++) {
          const ind = indentOf(lines[i]);
          if (!ind.length && depth[i] === 0) continue;
          let want: string;
          if (tab) want = '\t'.repeat(depth[i]);
          else want = ' '.repeat(unit * depth[i]);
          if (ind !== want) {
            if (/^ +$/.test(ind) && ind.length <= 64) over.set(i, ind.length);
            else { ok = false; break; }
          }
        }
        if (!ok) continue;
        if (over.size > Math.max(4, Math.floor(lines.length * 0.06))) continue;
        const body = lines.map(l => l.replace(/^[ \t]+/, '')).join('\n');
        const spec: IndentSpec = { unit, tab, model, over };
        const gross = spaces; // crude; the caller measures tokens
        const cand: IndentCand = { spec, body, gross, exc: over.size };
        if (!box.best || cand.exc < box.best.exc) box.best = cand;
      }
    }
    if (box.best && box.best.exc === 0) break;
  }
  return box.best;
}

function indentDirective(s: IndentSpec): string {
  let d = 'I' + (s.tab ? 't' : String(s.unit)) + s.model;
  if (s.over.size) d += '*' + [...s.over.entries()].map(([i, n]) => `${i}:${n}`).join(',');
  return d;
}

function indentParse(d: string): IndentSpec | null {
  const m = d.match(/^I([1-8]|t)([bg])(?:\*(.*))?$/);
  if (!m) return null;
  const spec: IndentSpec = { unit: m[1] === 't' ? 1 : parseInt(m[1], 10), tab: m[1] === 't', model: m[2] as 'b' | 'g', over: new Map() };
  if (m[3]) for (const p of m[3].split(',')) {
    const [a, b] = p.split(':');
    const i = parseInt(a, 10), n = parseInt(b, 10);
    if (isNaN(i) || isNaN(n)) return null;
    spec.over.set(i, n);
  }
  return spec;
}

function indentApply(body: string, s: IndentSpec): string {
  const lines = body.split('\n');
  const depth = s.model === 'b' ? depthBracket(lines) : depthTag(lines);
  return lines.map((l, i) => {
    const ov = s.over.get(i);
    if (ov !== undefined) return ' '.repeat(ov) + l;
    const d = depth[i];
    if (!d) return l;
    return (s.tab ? '\t'.repeat(d) : ' '.repeat(s.unit * d)) + l;
  }).join('\n');
}

// ---------------------------------------------------------------------------
// 5. FOLD T / A — TABLE DETECTION AND CANONICAL COLUMN ALIGNMENT
// ---------------------------------------------------------------------------

/**
 * A table is a maximal run of >= MIN_ROWS consecutive lines that all split
 * into the same number of fields (>= 2) under one separator. Separators tried,
 * cheapest first: tab, comma, pipe, semicolon, and "runs of two or more
 * spaces" — the last is what `df -h`, `kubectl get`, `psql`, `ls -l` and
 * every fixed-width CLI report actually use.
 *
 * For the space-run separator the wire keeps ONE space between fields and the
 * directive keeps the original column starts, because those starts are a
 * property of the *formatter*, not of the data: pad field i so field i+1
 * begins at column c_i. That is the ALIGN fold, and it is shared by every row
 * of the block, so it costs O(columns) once instead of O(rows x columns).
 */
export const HYLE_MIN_ROWS = 5;

export interface TableSpec {
  start: number;            // first line of the block (0-based, inclusive)
  end: number;              // last line of the block (inclusive)
  sepRepr: string;          // wire letter: , ; | \t or _ (space runs)
  sep: string;              // separator used on the WIRE body (' ' for _)
  runs: boolean;            // sepRepr === '_'
  nHead: number;            // leading lines of the block kept verbatim (0..2)
  nFields: number;          // field count before any column deletion
  align: AlignCol[];        // placement of EVERY field (runs only)
}

/**
 * Placement of one column in a fixed-width table.  printf-style formatters
 * emit exactly two kinds: a left-aligned field always STARTS at the same
 * column (kubectl's NAME, STATUS), and a right-aligned numeric field always
 * ENDS at the same column (df's Used/Avail -- whose start column therefore
 * moves by one as soon as a number grows a digit).  A start-offset-only model
 * can only express the first kind and so rejects all of `df -h`.
 */
export interface AlignCol { left: boolean; pos: number }

interface FieldPos { text: string; start: number; sepLen: number }

/** exact field starts for a space-run table line */
export function fieldPositions(line: string): FieldPos[] {
  const out: FieldPos[] = [];
  let pos = 0;
  const parts = line.split(/( {2,})/);
  for (const p of parts) {
    if (/^ {2,}$/.test(p)) { pos += p.length; continue; }
    out.push({ text: p, start: pos, sepLen: 0 });
    pos += p.length;
  }
  return out;
}

/**
 * Split a wire line into exactly `count` fields.  For a space-run table the
 * wire joins fields with ONE space, which is only parseable because
 * `tableHits` refuses any block where a NON-FINAL field contains a space; the
 * final field may (df's "30% /mnt/vol0", ls's "Jan  1 00:00 host name"), so
 * it is whatever remains of the line instead of another split.
 */
function splitFields(l: string, sep: string, count?: number): string[] {
  if (sep !== ' ' || count === undefined || count < 1) return l.split(sep);
  const out: string[] = [];
  let rest = l;
  for (let k = 0; k < count - 1; k++) {
    const sp = rest.indexOf(' ');
    if (sp < 0) return l.split(sep);
    out.push(rest.slice(0, sp));
    rest = rest.slice(sp + 1);
  }
  out.push(rest);
  return out;
}

interface TableHit { spec: TableSpec; lines: string[]; fields: string[][]; score: number }

export function tableHits(text: string): TableHit[] {
  const lines = text.split('\n');
  if (lines.length < HYLE_MIN_ROWS) return [];
  const hits: TableHit[] = [];
  const charSeps: Array<[string, string]> = [['\t', '\t'], [',', ','], ['|', '|'], [';', ';']];
  for (const [sep, repr] of charSeps) {
    let i = 0;
    while (i < lines.length) {
      const c = lines[i].split(sep).length;
      if (c < 2) { i++; continue; }
      let j = i + 1;
      while (j < lines.length && lines[j].split(sep).length === c) j++;
      if (j - i >= HYLE_MIN_ROWS) {
        hits.push({
          spec: { start: i, end: j - 1, sepRepr: repr, sep, runs: false, nHead: 0, nFields: c, align: [] },
          lines: lines.slice(i, j), fields: lines.slice(i, j).map(l => l.split(sep)), score: (j - i) * c,
        });
      }
      i = j > i ? j : i + 1;
    }
  }
  // space-run tables: a line qualifies when it has no leading/trailing space
  // and every field between 2+ space runs is non-empty
  {
    const qual = lines.map(l => l.length > 0 && l === l.trim() && !/ $/.test(l) && l.split(/ {2,}/).length >= 2 && l.split(/ {2,}/).every(f => f.length > 0));
    let i = 0;
    while (i < lines.length) {
      if (!qual[i]) { i++; continue; }
      const fp = fieldPositions(lines[i]);
      const c = fp.length;
      let j = i + 1;
      while (j < lines.length && qual[j] && fieldPositions(lines[j]).length === c) j++;
      if (j - i >= HYLE_MIN_ROWS) {
        const fps: FieldPos[][] = [];
        let ok = true;
        for (let r = i; r < j; r++) {
          const f = fieldPositions(lines[r]);
          if (f.length !== c) { ok = false; break; }
          fps.push(f);
        }
        // (a) no non-final field may contain a single space, or the wire join
        //     would not be parseable back; (b) every column must sit in a
        //     fixed slot -- constant start (left) or constant end (right).
        const align: AlignCol[] = [];
        if (ok && fps.some(f => f.slice(0, c - 1).some(x => x.text.includes(' ')))) ok = false;
        for (let k = 0; ok && k < c; k++) {
          const st = fps[0][k].start, en = st + fps[0][k].text.length;
          if (fps.every(f => f[k].start === st)) align.push({ left: true, pos: st });
          else if (fps.every(f => f[k].start + f[k].text.length === en)) align.push({ left: false, pos: en });
          else ok = false;
        }
        if (ok) hits.push({
          spec: { start: i, end: j - 1, sepRepr: '_', sep: ' ', runs: true, nHead: 0, nFields: c, align },
          lines: lines.slice(i, j), fields: fps.map(f => f.map(x => x.text)), score: (j - i) * c * 2,
        });
      }
      i = j > i ? j : i + 1;
    }
  }
  return hits.sort((a, b) => b.score - a.score);
}

/** collapse the space runs of one block to single spaces, leaving the rest of the text alone */
export function collapseBlock(text: string, t: TableSpec): string {
  if (!t.runs) return text;
  const lines = text.split('\n');
  for (let i = t.start; i <= t.end; i++) lines[i] = lines[i].replace(/ {2,}/g, ' ');
  return lines.join('\n');
}

function tableDirective(t: TableSpec): string {
  return 'T' + t.sepRepr + t.start + '-' + t.end + (t.nHead ? 'h' + t.nHead : '');
}

function tableParse(d: string): TableSpec | null {
  const m = d.match(/^T([,;|_\t])(\d+)-(\d+)(?:h(\d))?$/);
  if (!m) return null;
  const sepRepr = m[1];
  const nHead = m[4] === undefined ? 0 : parseInt(m[4], 10);
  if (!Number.isFinite(nHead) || nHead < 0 || nHead > 2) return null;
  return {
    start: parseInt(m[2], 10), end: parseInt(m[3], 10),
    sepRepr, sep: sepRepr === '_' ? ' ' : sepRepr, runs: sepRepr === '_',
    nHead, nFields: 0, align: [],
  };
}

// ---------------------------------------------------------------------------
// 6. FOLD G — GENERATED-COLUMN ELIMINATION  (Theta(n) -> Theta(1))
// ---------------------------------------------------------------------------

interface GenCol { index: number; spec: ColSpec; }

/**
 * Try to explain every column of the data rows as an exact function of the
 * row number. `nHead` is a decision variable: for `kubectl get pods` the
 * header has the same field count as the rows and must be excluded (nHead=1),
 * for a markdown table the header AND the `|---|` rule must be excluded
 * (nHead=2), and for `df -h` the header has a different field count and is
 * therefore already outside the block (nHead=0).
 */
export function genInfer(fields: string[][], nHead: number): GenCol[] {
  const first = nHead;
  const data = fields.slice(first);
  if (data.length < 3) return [];
  const k = fields[0].length;
  if (!fields.every(r => r.length === k)) return [];
  const out: GenCol[] = [];
  for (let c = 0; c < k; c++) {
    const values = data.map(r => r[c]);
    if (values.some(v => v.includes('\n') || v.includes(';'))) continue;
    let sp: ColSpec | null = null;
    try { sp = inferSpec(values); } catch { sp = null; }
    if (!sp) continue;
    if (!specMatches(sp, values)) continue;      // exact regeneration or nothing
    const s = serializeSpec(sp);
    if (/[\n;]/.test(s)) continue;
    if (s.length >= values.join(',').length) continue;   // never pay more than the column
    out.push({ index: c, spec: sp });
  }
  return out;
}

/** delete the generated columns from every data row of the block */
/**
 * Delete the generated columns from every data row. A row that loses ALL of
 * its fields becomes the empty line, which is unambiguous only because
 * `genOk` refuses any column set that would leave a *partial* row empty.
 */
export function genApply(text: string, t: TableSpec, cols: GenCol[]): string | null {
  const lines = text.split('\n');
  const removed = new Set(cols.map(c => c.index));
  const all = removed.size === t.nFields;
  for (let i = t.start + t.nHead; i <= t.end && i < lines.length; i++) {
    const f = splitFields(lines[i], t.sep, t.nFields);
    if (f.length !== t.nFields) return null;   // not a row of this table
    const keep = f.filter((_, c) => !removed.has(c));
    if (!all && keep.every(x => x === '')) return null;   // ambiguous empty row
    lines[i] = keep.join(t.sep);
  }
  return lines.join('\n');
}

/** put them back: row r = i - start - (header?1:0) */
function genRestore(text: string, t: TableSpec, cols: GenCol[]): string {
  const lines = text.split('\n');
  const k = cols.length;
  const first = t.start + t.nHead;
  for (let i = first; i <= t.end && i < lines.length; i++) {
    const r = i - first;
    // The surviving-field count is all the wire needs: the generated column
    // indices are known and sorted, so total = surviving + generated and the
    // two interleave uniquely.  (nFields is only consulted to decide whether
    // the space-run split has to keep a space-containing final field whole.)
    const survive = t.nFields > 0 ? t.nFields - k : undefined;
    const f = lines[i] === '' ? [] : splitFields(lines[i], t.sep, survive);
    const total = f.length + k;
    const vals: string[] = new Array(total).fill('');
    let ci = 0, fi = 0;
    for (let c = 0; c < total; c++) {
      if (ci < cols.length && cols[ci].index === c) { vals[c] = evalSpec(cols[ci].spec, r); ci++; }
      else vals[c] = fi < f.length ? f[fi++] : '';
    }
    lines[i] = vals.join(t.sep);
  }
  return lines.join('\n');
}

/** place each field in its slot: left-aligned to pos, or ending at pos */
function alignRestore(text: string, t: TableSpec, align: AlignCol[]): string {
  if (!t.runs || !align.length) return text;
  const lines = text.split('\n');
  for (let i = t.start; i <= t.end && i < lines.length; i++) {
    const f = splitFields(lines[i], ' ', t.nFields);
    if (f.length !== t.nFields || f.some((x, c) => c < t.nFields - 1 && x === '')) continue;
    let res = '';
    let ok = true;
    for (let c = 0; c < f.length; c++) {
      if (c >= align.length) { ok = false; break; }
      const a = align[c];
      const at = a.left ? a.pos : a.pos - f[c].length;
      if (at < res.length) { ok = false; break; }
      while (res.length < at) res += ' ';
      res += f[c];
    }
    if (ok) lines[i] = res;
  }
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// 7. DECODER — total. Unknown wire => the wire itself (identity).
// ---------------------------------------------------------------------------

const ARM_DECODE: Record<string, (w: string) => string> = {
  b: (w) => w,
  c: (w) => chironDecode(w),
  k: (w) => kionesDecode(w),
  h: (w) => hydraDecode(w),
  g: (w) => glossiaDecode(w),
  e: (w) => eidosDecode(w),
  a: (w) => aionDecode(w),
  t: (w) => tachysDecode(w),
};

export function hyleDecode(wire: string): string {
  if (!wire.startsWith(HYLE_SENTINEL)) return wire;
  const nl = wire.indexOf('\n');
  if (nl < 0) return wire;
  const body = wire.slice(nl + 1);
  const dirs = wire.slice(1, nl).split(';');
  let arm = 'b';
  let ind: IndentSpec | null = null;
  let tab: TableSpec | null = null;
  let align: AlignCol[] = [];
  const gens: GenCol[] = [];
  try {
    for (const d of dirs) {
      if (!d.length) return wire;
      switch (d[0]) {
        case 'B': arm = d.slice(1); if (!ARM_DECODE[arm]) return wire; break;
        case 'I': { const s = indentParse(d); if (!s) return wire; ind = s; break; }
        case 'T': { const s = tableParse(d); if (!s) return wire; tab = s; break; }
        case 'A': {
          const nums = d.slice(1).split(',').map(x => parseInt(x, 10));
          if (!nums.length || nums.some(v => !Number.isFinite(v))) return wire;
          align = nums.map(v => (v < 0 ? { left: false, pos: -v } : { left: true, pos: v }));
          break;
        }
        case 'G': {
          if (!tab) return wire;
          const eq = d.indexOf('=');
          if (eq < 0) return wire;
          const idx = parseInt(d.slice(1, eq), 10);
          if (!Number.isFinite(idx) || idx < 0) return wire;
          const sp = parseSpec(d.slice(eq + 1));
          if (!sp) return wire;
          gens.push({ index: idx, spec: sp });
          break;
        }
        default: return wire;
      }
    }
    gens.sort((a, b) => a.index - b.index);
    if ((gens.length || align.length) && !tab) return wire;
    // nFields is not transmitted: for a space-run table A carries exactly one
    // placement per field but the last, so the field count is its length + 1.
    if (tab && tab.runs && !tab.nFields) tab.nFields = align.length;
    let out = ARM_DECODE[arm](body);
    // decode order is the exact reverse of encode order: arm -> G -> A -> I
    if (gens.length && tab) out = genRestore(out, tab, gens);
    if (align.length && tab) out = alignRestore(out, tab, align);
    if (ind) out = indentApply(out, ind);
    return out;
  } catch {
    return wire;
  }
}

// ---------------------------------------------------------------------------
// 8. ENCODER — variant lattice x existing arms, every candidate round-tripped
// ---------------------------------------------------------------------------

interface Variant {
  name: string;
  text: string;
  dirs: string[];
  clauses: string[];
  folds: string[];
  contract?: string;      // the minimal contract charged for this variant
}

/** O(n) grosssaving probe used by the fast certificate */
export function hyleProbe(text: string): { indent: number; table: number; gen: number } {
  let indent = 0, table = 0, gen = 0;
  try {
    const inf = indentInfer(text);
    if (inf) {
      const lines = text.split('\n');
      let sp = 0; for (const l of lines) sp += (l.match(/^[ \t]*/) ?? [''])[0].length;
      indent = sp - inf.exc * 3;
    }
  } catch { /* no indent fold */ }
  try {
    const hits = tableHits(text);
    if (hits.length) {
      const h = hits[0];
      table = h.spec.runs ? h.lines.reduce((a, l) => a + (l.match(/ {2,}/g)?.reduce((x, r) => x + r.length - 1, 0) ?? 0), 0) : 0;
      for (const nHead of [1, 0, 2]) {
        const cols = genInfer(h.fields, nHead);
        if (cols.length) {
          const first = nHead;
          const rows = h.fields.length - first;
          gen = Math.max(gen, cols.reduce((a, c) => a + rows * Math.max(1, h.fields[first][c.index].length), 0) / 4);
        }
      }
    }
  } catch { /* no table fold */ }
  return { indent, table, gen };
}

const REJECTED: string[] = [];
export function hyleRejected(): string[] { return REJECTED.slice(); }

function buildVariants(text: string, enc: EncodingName, deadline: number): Variant[] {
  const T = (s: string) => countTokens(s, enc);
  const base = T(text);
  REJECTED.length = 0;          // per-encode diagnostics, not cumulative
  const rejected = REJECTED;
  const out: Variant[] = [{ name: 'raw', text, dirs: [], clauses: [], folds: [] }];

  // ---- Fold I (indent) on the original text -------------------------------
  let iTxt = text;
  let iDirs: string[] = [];
  let iCl: string[] = [];
  let iFolds: string[] = [];
  try {
    const inf = indentInfer(text);
    if (inf && Date.now() < deadline) {
      const dir = indentDirective(inf.spec);
      const icl = hyleContractFor([dir]);
      const cost = T(inf.body) + T(dir) + T(icl) + 2;
      if (cost + 3 < base) {
        iTxt = inf.body; iDirs = [dir]; iCl = [CL_I];
        iFolds = [`I${inf.spec.model}${inf.spec.tab ? 't' : inf.spec.unit}${inf.exc ? '*' + inf.exc : ''}`];
        out.push({ name: 'indent', text: iTxt, dirs: iDirs, clauses: iCl, folds: iFolds });
      }
    }
  } catch { /* no indent fold */ }

  // ---- Folds T/A/G on both the original and the de-indented text ----------
  const bases: Array<[string, string, string[], string[], string[]]> = [
    ['raw', text, [], [], []],
    ['indent', iTxt, iDirs, iCl, iFolds],
  ];
  for (const [srcName, srcText, preDirs, preCl, preFolds] of bases) {
    if (Date.now() > deadline) break;
    let hits: TableHit[] = [];
    try { hits = tableHits(srcText); } catch { hits = []; }
    for (const h of hits.slice(0, 2)) {
      if (Date.now() > deadline) break;
      for (const nHead of [1, 0, 2]) {
        if (nHead > h.fields.length - 3) continue;
        const t: TableSpec = { ...h.spec, nHead };
        // 1. generator columns, inferred on the ORIGINAL fields.
        //
        //    `genInfer` pre-filters on CHARACTER length, which is not the
        //    currency: a cycle spec over long strings can be shorter in chars
        //    than the column yet cost more tokens (measured on dump.sql: eight
        //    columns "explained" for 711 tokens of directives).  But a greedy
        //    per-column token filter is wrong in principle too, because the
        //    marginal value of the LAST explained column is the whole row: once
        //    every column is generated the row collapses to an empty line worth
        //    ~1 token, so a column that looks unprofitable alone can be the one
        //    that unlocks the collapse.  Both column sets are therefore built
        //    and MEASURED, plus the no-column set (collapse only).  Candidates,
        //    not heuristics: the variant with the lowest real cost wins.
        const colsAll = (() => { try { return genInfer(h.fields, nHead); } catch { return [] as GenCol[]; } })();
        const colsCheap = colsAll.filter(c => {
          const dir = T(`G${c.index}=${serializeSpec(c.spec)};`);
          const col = T(h.fields.slice(nHead).map(r => r[c.index]).join('\n'));
          return dir < col;
        });
        // DIAGNOSTIC TAG: which candidate column set produced this variant.
        // 'a' = every column genInfer could explain (the default, untagged),
        // 'c' = the token-cheap subset, 'n' = no generated columns at all.
        // The tag is appended only for the non-default sets so that recorded
        // winner strings stay comparable across runs.
        const sets: Array<{ cols: GenCol[]; tag: string }> = [];
        if (colsAll.length) sets.push({ cols: colsAll, tag: 'a' });
        if (colsCheap.length && colsCheap.length !== colsAll.length) sets.push({ cols: colsCheap, tag: 'c' });
        sets.push({ cols: [], tag: 'n' });
        for (const cand of sets) {
        const cols = cand.cols;
        // 2. build the variant text: collapse runs (if any), then delete columns
        let vtext = collapseBlock(srcText, t);
        const dirs = [...preDirs, tableDirective(t)];
        const clauses = [...preCl, CL_T];   // kept for the fold label; the charged contract is derived from dirs
        const folds = [...preFolds, `T${t.sepRepr}${t.start}-${t.end}${nHead ? 'h' + nHead : ''}`];
        if (cols.length) {
          const applied = genApply(vtext, t, cols);
          if (applied === null) { rejected.push(`${srcName}+Th${nHead}+G${cols.length}:genApply-null`); continue; }
          vtext = applied;
          const gd = cols.map(c => `G${c.index}=${serializeSpec(c.spec)}`);
          dirs.push(...gd);
          clauses.push(CL_G);
          folds.push(`G${cols.map(c => c.index).join('')}`);
        }
        // 3. column placement — only needed when space runs were collapsed and
        //    at least one field survives per row (otherwise rows are empty and
        //    genRestore rebuilds the full field list before placing them).
        if (t.runs && t.align.length) {
          dirs.push('A' + t.align.map(a => (a.left ? a.pos : -a.pos)).join(','));
          clauses.push(CL_A);
          folds.push(`A${t.align.length}`);
        }
        const contract = hyleContractFor(dirs);
        const cost = T(vtext) + T(dirs.join(';')) + T(contract) + 2;
        const label = `${srcName}+Th${nHead}${cols.length ? '+G' + cols.map(c => c.index).join('') : ''}${cand.tag === 'a' ? '' : '@' + cand.tag}`;
        if (cost + 3 >= base) { rejected.push(`${label}=${cost}>=${base}`); continue; }
        out.push({ name: label, text: vtext, dirs, clauses, folds, contract });
        }
        // NOTE: no early break on "every column explained".  nHead=1 does
      }
    }
  }
  // de-duplicate identical variant texts
  const seen = new Set<string>();
  return out.filter(v => { const k = v.text + '|' + v.dirs.join(';'); if (seen.has(k)) return false; seen.add(k); return true; });
}

function armContract(r: { wire: string; messageTokens: number; decoderPrompt?: string }, enc: EncodingName): string | null {
  const p = r.decoderPrompt;
  if (typeof p === 'string' && p.startsWith(r.wire)) return p.slice(r.wire.length).replace(/^\n/, '');
  return null;
}

/**
 * HONEST CONTRACT ACCOUNTING FOR BORROWED ARMS.
 *
 * GLOSSIA bills the MOSAIC arm a contract of zero ("its contract is 0, region
 * tags are in wire"), and EIDOS and AION delegate down that same chain, so all
 * three report `decoderPrompt === wire` for a payload that is actually a
 * SIGNET/ANAPHORA/… lane wire.  MOSAIC itself publishes the contract those
 * wires need -- `mosaicDecoderPrompt` -- and it measures 962 tokens in
 * o200k_base for a signet region (head 320 + SIGNET_SYSTEM_PROMPT 642), 660
 * for plexus-local, 1061 when an ANAPHORA wrapper is peeled as well.  A codec
 * that inherits an arm inherits that arm's accounting, so HYLE re-bills any
 * borrowed wire that claims a zero contract: it identifies the lane sentinels
 * actually present, asks MOSAIC for the contract of exactly those lanes, and
 * charges the larger of the two figures.  Identity (arm b) is exempt: raw text
 * carries no notation and legitimately costs nothing.
 */
const BARE_SENTINELS: Array<[string, string]> = [
  ['[SG1]\n', 'signet'], ['[P1]\n', 'pulse'], ['[M1]\n', 'meridian-local'],
  ['\u27e8QSR\u27e9\n', 'quasar-local'], ['[PX]\n', 'plexus-local'], ['[[VX1\n', 'veritas-local'],
  ['[AX1]\n', 'axiom-local'], ['[TS1]\n', 'tessera-local'], ['[ST1]\n', 'strata-local'],
  ['[RP1]\n', 'repair-local'], ['[TR1]\n', 'trie-local'], ['[CL1]\n', 'column-local'],
  ['[AN1]\n', 'anaphora'],
];

/** every lane whose rules a decoder must apply to read this (nested) wire */
export function lanesOfWire(wire: string): string[] {
  const out: string[] = [];
  let cur = wire;
  for (let depth = 0; depth < 6; depth++) {
    if (cur.startsWith('[MZ1]\n')) {
      // framed partition: the first char after each separator is the lane tag
      const rest = cur.slice('[MZ1]\n'.length);
      const sep = rest[0];
      if (sep && rest[1] === '\n') {
        const TAGS: Record<string, string> = {
          g: 'signet', h: 'helix', p: 'pulse', a: 'anaphora', d: 'praxis-local', s: 'sigma-local',
          m: 'meridian-local', q: 'quasar-local', x: 'plexus-local', v: 'veritas-local', o: 'axiom-local',
          t: 'tessera-local', r: 'strata-local', b: 'repair-local', l: 'trie-local', c: 'column-local',
        };
        for (const piece of rest.slice(2).split(sep).slice(1)) {
          const lane = TAGS[piece[0]];
          if (lane && !out.includes(lane)) out.push(lane);
        }
      }
      return out;
    }
    const hit = BARE_SENTINELS.find(([sn]) => cur.startsWith(sn));
    if (!hit) {
      // HELIX has no wire prefix: it sprinkles inline \u27d0[...] markers through
      // the text.  Anything else is a foreign codec's own wire (chiron's \u00a7,
      // kiones, or plain text) and is NOT re-billed here -- those arms publish
      // their own contract, and inventing a charge for an unrecognised header
      // would over-bill exactly as dishonestly as under-billing.
      if (!out.length && cur.includes('\u27d0[')) out.push('helix');
      return out;
    }
    if (!out.includes(hit[1])) out.push(hit[1]);
    if (hit[1] !== 'anaphora') return out;
    let peeled = cur;
    try { peeled = anaphoraDecode(cur); } catch { return out; }
    if (peeled === cur) return out;
    cur = peeled;
  }
  return out;
}

/**
 * MOSAIC's own published contract for exactly the lanes this wire uses.  The
 * TEXT is returned, not just its cost: a codec that charges for a contract has
 * to ship it, so HYLE appends this prompt to its own decoderPrompt instead of
 * billing tokens for instructions the decoder never receives.
 */
export function laneContract(wire: string, enc: EncodingName): { lanes: string[]; text: string; tokens: number } {
  const lanes = lanesOfWire(wire);
  if (!lanes.length) return { lanes, text: '', tokens: 0 };
  try {
    const text = mosaicDecoderPrompt({ regions: lanes.map(lane => ({ lane })) } as never);
    return { lanes, text, tokens: countTokens(text, enc) };
  } catch {
    return { lanes, text: '', tokens: 0 };
  }
}

interface ArmRun { arm: string; wire: string; contract: string; contractTok: number; contractSrc: string; ms: number }

interface Best { M: number; wire: string; contract: string; arm: string; folds: string[]; decoded: string }

/** the identity arm: the text itself, zero contract, zero risk */
function identityArm(text: string, enc: EncodingName): ArmRun {
  return { arm: 'b', wire: text, contract: '', contractTok: countTokens(text, enc), contractSrc: 'arm', ms: 0 };
}

function runArms(text: string, enc: EncodingName, opts: HyleOptions, deadline: number): ArmRun[] {
  const out: ArmRun[] = [];
  const push = (arm: string, fn: () => { wire: string; decoded: string; messageTokens: number; decoderPrompt?: string }) => {
    const t0 = Date.now();
    try {
      const r = fn();
      if (r.decoded !== text) return;
      const c = armContract(r, enc);
      let ctok = c !== null ? countTokens(c, enc) : Math.max(0, r.messageTokens - countTokens(r.wire, enc));
      let ctokSrc = 'arm';
      let ctext = c ?? '';
      if (arm !== 'b' && !ctext.trim()) {
        // the arm published no contract of its own: re-bill AND re-ship the
        // contract of the lanes its wire actually uses
        const lc = laneContract(r.wire, enc);
        if (lc.tokens > ctok) { ctok = lc.tokens; ctext = lc.text; ctokSrc = `lanes:${lc.lanes.join('+')}`; }
      }
      out.push({ arm, wire: r.wire, contract: ctext, contractTok: ctok, contractSrc: ctokSrc, ms: Date.now() - t0 });
    } catch { /* arm unavailable */ }
  };
  push('b', () => ({ wire: text, decoded: text, messageTokens: countTokens(text, enc) }));
  if (opts.fast) return out;
  if (Date.now() < deadline) push('c', () => chironEncode(text, enc, { budgetMs: opts.chironBudgetMs ?? 3000 }));
  if (Date.now() < deadline) push('g', () => glossiaEncode(text, enc));
  if (Date.now() < deadline) push('e', () => eidosEncode(text, enc));
  if (Date.now() < deadline) push('a', () => aionEncode(text, enc));
  if (Date.now() < deadline) push('k', () => kionesEncode(text, enc, { maxConfigs: 2, configBudgetMs: 40, budgetMs: Math.max(300, deadline - Date.now()) }));
  return out;
}

export function hyleEncode(text: string, enc: EncodingName = 'o200k_base', opts: HyleOptions = {}): HyleResult {
  const t0 = Date.now();
  const budgetMs = opts.budgetMs ?? 20000;
  const deadline = t0 + budgetMs;
  const inTokens = countTokens(text, enc);
  const finish = (wire: string, decoded: string, contract: string, arm: string, folds: string[], certified: boolean, notes: string, tried: string[] = []): HyleResult => {
    const outTokens = countTokens(wire, enc);
    const contractTokens = countTokens(contract, enc);
    const messageTokens = outTokens + contractTokens;
    return {
      codec: 'hyle', wire, decoded, exact: decoded === text, inTokens, outTokens, messageTokens, contractTokens,
      decoderPrompt: contract ? wire + '\n' + contract : wire,
      savingsPct: inTokens ? Math.round((1 - messageTokens / inTokens) * 1000) / 10 : 0,
      winner: folds.length ? `hyle:${folds.join('+')}:${arm}` : arm, folds, arm, certified,
      ms: Date.now() - t0, notes, tried, rejected: REJECTED.slice(),
    };
  };

  if (!text) return finish('', '', '', 'b', [], false, 'empty');

  const variants = buildVariants(text, enc, deadline);
  const box: { best: Best | null } = { best: null };
  const tried: string[] = [];

  const evaluate = (v: Variant, a: ArmRun) => {
    const wire = HYLE_SENTINEL + [...v.dirs, 'B' + a.arm].join(';') + '\n' + a.wire;
    const mine = v.contract ?? hyleContractFor(v.dirs);
    const contract = mine ? (a.contract ? mine + '\n\n' + a.contract : mine) : a.contract;
    const decoded = hyleDecode(wire);
    if (decoded !== text) return;                        // exactness gate, non-negotiable
    const M = countTokens(wire, enc) + countTokens(contract, enc);
    tried.push(`${v.name}/${a.arm}=${M}${a.contractSrc === 'arm' ? '' : '(' + a.contractSrc + ')'}`);
    if (!box.best || M < box.best.M) box.best = { M, wire, contract, arm: a.arm, folds: v.folds, decoded };
  };

  // PASS A — every fold with the identity arm. O(n), no search, always runs:
  // this is the part of HYLE that is new, and it must never be starved by the
  // borrowed-arm sweep (which can take 100 s on a single file).
  for (const v of variants) evaluate(v, identityArm(v.text, enc));

  // PASS B — borrowed arms, cheapest variant text first while budget remains.
  // A folded body is often ~20 tokens, so running the arms on it costs
  // milliseconds and can beat both the fold alone and the arm alone; the raw
  // text is the most expensive candidate and therefore goes last.
  if (!opts.fast) {
    const order = variants.slice().sort((x, y) => countTokens(x.text, enc) - countTokens(y.text, enc));
    for (const v of order) {
      if (Date.now() > deadline) break;
      for (const a of runArms(v.text, enc, opts, deadline)) {
        if (a.arm === 'b') continue;                     // already scored in pass A
        evaluate(v, a);
        if (Date.now() > deadline) break;
      }
    }
  }

  // Identity pays NO contract at all — HYLE never charges for a sentinel it
  // does not need, so it cannot regress against `raw`.
  const best = box.best;
  if (!best || best.M + 3 >= inTokens) {
    return finish(text, text, '', 'b', [], variants.length <= 1,
      `hyle identity: nothing pays for its contract (best=${best ? best.M : '-'} raw=${inTokens}) [${tried.slice(0, 5).join(' ')}]`, tried);
  }
  return finish(best.wire, best.decoded, best.contract, best.arm, best.folds, false,
    `hyle ${best.folds.join('+')} → arm ${best.arm} M=${best.M} vs raw ${inTokens} [${tried.slice(0, 6).join(' ')}]`, tried);
}

// ---------------------------------------------------------------------------
// 9. SELF TEST
// ---------------------------------------------------------------------------

export function hyleSelfTest(enc: EncodingName = 'o200k_base'): Array<{ name: string; ok: boolean; detail: string }> {
  const json = '{\n  "name": "x",\n  "deps": {\n    "a": "1.0.0",\n    "b": "2.0.0",\n    "c": [1, 2, 3]\n  },\n  "z": "}\u00a6{"\n}\n';
  const xml = '<a>\n  <b x="1">t</b>\n  <b x="2">u</b>\n  <b x="3">v</b>\n  <b x="4">w</b>\n</a>\n';
  const csv = 'id,day,amount,flag\n' + Array.from({ length: 12 }, (_, i) => `${10 + i},2026-0${1 + Math.floor(i / 28)}-0${1 + (i % 28)},${(100 + 7.3 * i).toFixed(2)},${['a', 'b', 'c'][i % 3]}`).join('\n') + '\n';
  const pods = ['NAME        READY  STATUS   AGE   NODE',
    ...Array.from({ length: 20 }, (_, i) => `pod-${i}       1/1    Running  ${2 + i}d${i}h  node-${i % 3}.local`)].join('\n') + '\n';
  const prose = 'The quick brown fox jumps over the lazy dog. '.repeat(6);
  const cases: Array<{ name: string; text: string }> = [
    { name: 'empty', text: '' },
    { name: 'single', text: 'x' },
    { name: 'prose', text: prose },
    { name: 'json-indent', text: json },
    { name: 'xml-indent', text: xml },
    { name: 'csv-generated', text: csv },
    { name: 'pods-aligned', text: pods },
    { name: 'sentinel-in-payload', text: HYLE_SENTINEL + 'not a wire at all\nsecond line\nthird\nfourth\nfifth\nsixth' },
    { name: 'braces-in-payload', text: 'a {b} c\n'.repeat(6) },
    { name: 'crlf', text: 'DATE,V\r\n' + Array.from({ length: 8 }, (_, i) => `2020-01-0${i + 1},${10 + i}\r\n`).join('') },
    { name: 'no-trailing-nl', text: 'x,y\n' + Array.from({ length: 6 }, (_, i) => `${i},${2 * i}`).join('\n') },
    { name: 'tabs', text: 'a\tb\n' + Array.from({ length: 6 }, (_, i) => `${i}\t${i * 3}`).join('\n') + '\n' },
    // regression guards for the three inference bugs fixed this session:
    // (1) right-aligned columns move their START column, so a start-offset-only
    //     model rejected every real `df -h` block;
    { name: 'right-aligned', text: ['Filesystem      Size  Used Avail Use% Mounted on',
      ...Array.from({ length: 20 }, (_, i) => {
        const dev = `/dev/nvme0n1p${i}`, size = `${100 + 37 * i}G`;
        const used = `${40 + 11 * i}G`, avail = `${50 + 9 * i}G`;
        return dev.padEnd(17) + size.padEnd(7) + used.padStart(6) + '  ' + avail.padStart(6) + `  ${10 + i}% /mnt/vol${i}`;
      })].join('\n') + '\n' },
    // (2) a greedy \d+\.\d+ run swallowed "10.244" and made dotted-integer
    //     columns (IP addresses) unexplainable;
    { name: 'dotted-integers', text: ['NAME   IP           NODE',
      ...Array.from({ length: 20 }, (_, i) => `pod-${i}  10.244.${i % 8}.${i * 11}  node-${i % 5}.internal`)].join('\n') + '\n' },
    // (3) modulo semantics: a month column counts from 1, so the base must sit
    //     OUTSIDE the modulus, and the padded slot must still parse (z before m).
    { name: 'padded-modulo', text: 'id,created\n' + Array.from({ length: 26 }, (_, i) => `${i},2026-${String(1 + (i % 12)).padStart(2, '0')}-${String(1 + i).padStart(2, '0')}`).join('\n') + '\n' },
    // (4) a pipe table whose every column is generated: rows collapse to empty
    //     lines and must come back with their padding intact.
    { name: 'all-columns-pipe', text: ['| id | name | day |', '|---|---|---|',
      ...Array.from({ length: 16 }, (_, i) => `| ${10 + i} | u${i} | ${20 + 2 * i} |`)].join('\n') + '\n' },
  ];
  return cases.map(({ name, text }) => {
    try {
      const r = hyleEncode(text, enc, { budgetMs: 8000 });
      const d = hyleDecode(r.wire);
      const ok = d === text && r.exact && r.decoded === text;
      return { name: `${name} ${ok ? 'ok' : 'FAIL'}`, ok, detail: `${r.winner} M=${r.messageTokens} in=${r.inTokens} ${r.ms}ms` };
    } catch (e: any) {
      return { name, ok: false, detail: String(e?.message ?? e) };
    }
  });
}

export const HYLE_SYSTEM_PROMPT = HYLE_CONTRACT;
