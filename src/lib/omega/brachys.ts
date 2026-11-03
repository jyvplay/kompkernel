/**
 * BRACHYS (βραχύς, "short") — X70. Contract algebra, and a reader written from
 * the contract.
 *
 * ---------------------------------------------------------------------------
 * 0. WHAT WAS MEASURED BEFORE ANY CODE WAS WRITTEN
 * ---------------------------------------------------------------------------
 *
 * HYLE's table fold already deletes every column a reader can rebuild. Measured
 * on this checkout, the *representation* is far ahead of what the stack ships:
 *
 *   lane            raw   shipped frontier   HYLE-driven wire   HYLE contract
 *   psql-output     675   244 (metron)      141                127
 *   metrics.tsv     811   210 (akolouthia2) 109                127
 *   kubectl         1006  326 (akolouthia2) 141                211
 *   df-h            570   171 (akolouthia2) 92                 145
 *
 * On every one of those lanes the wire is 2x smaller than the frontier and the
 * *contract* is bigger than the wire. KANON (X40) loses the gate not because its
 * fold is weak but because it buys the fold with a clause per family: a sentence
 * for the modulus, a sentence for the pad, a sentence for the letter counter, a
 * sentence for the cycle, a sentence for the date. Contract is a fixed tax the
 * message pays exactly once, so on a short message it is the binding term; that
 * is the same arithmetic X29 (SYNKOPE) found and never resolved, because X29
 * only reworded the existing clauses.
 *
 * BRACHYS resolves it by changing the *shape* of the contract, not its words:
 *
 *      KANON:   family -> clause        (one sentence per generator family)
 *      BRACHYS: alphabet -> sentence    (one sentence for the whole algebra)
 *
 * The wire is unchanged (HYLE's directives), so the measured representation gain
 * is inherited exactly, and the contract is written as a *closed algebra*: the
 * generator families are parameters of one arithmetic, so the prose that
 * specifies all of them is one sentence about `{A+B}`, `mM`, `zW`, `cX`, `#p:`
 * and `@`. The wording is our own; nothing is copied from HYLE's clause list.
 * Measured on this checkout: 127 -> 55 tokens (psql, metrics), 211 -> 84
 * (kubectl), 145 -> 70 (df-h). The saving is not a claim about compression
 * theory; it is a measured token count of a specific string, and it is the whole
 * of this codec's size claim.
 *
 * ---------------------------------------------------------------------------
 * 1. THE PART THAT IS NOT WORDING: A READER WRITTEN FROM THE CONTRACT
 * ---------------------------------------------------------------------------
 *
 * A shorter contract is worthless — worse than worthless, it is a decoding bug
 * waiting to happen — unless something checks that the prose is sufficient.
 * Every reader in this repository up to now was written against the encoder's
 * internals and then the prose was written to match, so the prose was never
 * tested: X26 found a contract that was 2 tokens cheaper and silently
 * undecodable, and caught it only because it happened to write a from-spec
 * reader for one lane.
 *
 * `brachysDecodeMessage` below is written from the contract text in
 * `contractFragments`, not by calling `hyleDecode`. It parses the wire with its
 * own regexes and its own BigInt arithmetic. Two consequences, both testable:
 *
 *   (a) if the prose is missing a fact, this reader produces the wrong text and
 *       the round trip fails — the encoder then refuses to ship (fail closed);
 *   (b) the reader is differentially testable against `hyleDecode`, which is
 *       the independent reference. `bench/x70/brachys-spec-diff.ts` runs both on
 *       every real lane and on fuzzed wires and reports every disagreement.
 *
 * ---------------------------------------------------------------------------
 * 2. COST MODEL AND GATE
 * ---------------------------------------------------------------------------
 *
 * M = countTokens(contract + '\n' + wire) with o200k_base, counted on the whole
 * single chat message. BRACHYS ships only if its own reader reproduces the
 * source and M is strictly below the *shipped* frontier's complete-message
 * count for the same source, measured in the same process (`tagstackEncode`,
 * which is what the repo ships and which itself gates against SYNKRISIS,
 * BIFRONT, KANON, AKOLOUTHIA-2, APOGRAPHE, METRON, HEMERA and DIASTEMA). It
 * therefore cannot make any lane worse than the frontier; on a loss it returns
 * the frontier's own message, byte for byte.
 *
 * Greedy? No. The two body arms (literal tape / CHIRON tape) are both built,
 * both round-tripped through the from-spec reader, and the cheaper is kept; the
 * frontier arm is measured in the same pass. That is a measured minimum over
 * three complete messages, not a left-to-right pass.
 *
 * Time/CPU: dominated by the inherited frontier gate (one `tagstackEncode` per
 * source), exactly like every other wrapper in this stack. The fold itself is
 * `hyleEncode(..., { fast: true })`, which is O(n) and makes no arm search.
 */

import { countTokens, type EncodingName } from './bpe';
import { hyleEncode } from './hyle';
import { chironDecode } from './chiron';
import { daedalusEncode } from './daedalus';
import { tagstackEncode, type TagstackResult } from './tagstack';

const SENTINEL = '¦';
const DAY = 86400000;
const BI10 = (n: number): bigint => 10n ** BigInt(n);

// ---------------------------------------------------------------------------
// 1. THE CONTRACT
// ---------------------------------------------------------------------------

/**
 * Fragments of the contract, one per fact the wire actually needs. Each is
 * emitted only when the wire uses the fact, so a message never pays for a
 * generator family it does not use. (This is HYLE's idea, kept: the *minimality*
 * is good. What changes is that four families now share one sentence.)
 */
export const BRACHYS_FRAGMENTS = {
  /** band `b`: the body after the directive line is literal. */
  baseLit: 'Lines A-B (from 0) below the directive line are one table split by SEP; the rest is literal.',
  /** band `c`: the body is a c-tape that states its own rule. */
  baseTape: 'The body below the directive line is a c-tape; decode it by the rule inside it. Lines A-B (from 0) of the result are one table split by SEP; the rest is literal.',
  runs: '_ = fields split by 2+ spaces, rejoined with 1; only the last may hold a space.',
  verbatim: 'h = leading lines kept, then rows r=0,1,2,..',
  align: 'A = field start columns, minus = end column of a right-aligned field.',
  genHead: 'G<c>=<spec> restores deleted column c per row r;',
  s1: '{A+B}=A+B*r',
  s2: 'mM=A+(B*r mod M)',
  s3: 'zW=zero-pad to W',
  s4: 'cX is the r-th letter from X',
  s5: '{{ }} are braces',
  cycle: '#p:v,.. cycles p values.',
  date: '@A..B or @A+N = one date per row from A, w=weekdays, -i skips day offset i.',
  tail: 'print only.',
} as const;

export interface BrachysFacts {
  hasTable: boolean;
  runs: boolean;
  verbatim: boolean;
  align: boolean;
  gen: boolean;
  mod: boolean;
  pad: boolean;
  letter: boolean;
  cycle: boolean;
  date: boolean;
  anySlot: boolean;
  braces: boolean;
}

export function brachysFacts(dirs: string[]): BrachysFacts {
  const f: BrachysFacts = {
    hasTable: dirs.some((d) => d[0] === 'T'), runs: false, verbatim: false, align: false,
    gen: false, mod: false, pad: false, letter: false, cycle: false, date: false,
    anySlot: false, braces: false,
  };
  for (const d of dirs) {
    if (d[0] === 'T') {
      if (d[1] === '_') f.runs = true;
      if (/h[12]$/.test(d)) f.verbatim = true;
    }
    if (d[0] === 'A') f.align = true;
    if (d[0] === 'G') {
      f.gen = true;
      const spec = d.slice(d.indexOf('=') + 1);
      if (spec.startsWith('#')) { f.cycle = true; continue; }
      if (spec.startsWith('@')) { f.date = true; continue; }
      if (spec.includes('{{') || spec.includes('}}')) f.braces = true;
      if (spec.includes('{')) f.anySlot = true;
      for (const inner of spec.matchAll(/\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g)) {
        const s = inner[1];
        if (/^c[A-Za-z]/.test(s)) f.letter = true;
        if (/z\d+$/.test(s)) f.pad = true;
        if (/m-?\d+$/.test(s.replace(/z\d+$/, ''))) f.mod = true;
      }
    }
  }
  return f;
}

/** The complete contract for exactly the facts a wire uses. */
export function brachysContractFor(dirs: string[], band: 'b' | 'c' = 'b'): string {
  const f = brachysFacts(dirs);
  if (!f.hasTable) return '';
  const out: string[] = [band === 'c' ? BRACHYS_FRAGMENTS.baseTape : BRACHYS_FRAGMENTS.baseLit];
  if (f.runs) out.push(BRACHYS_FRAGMENTS.runs);
  if (f.verbatim) out.push(BRACHYS_FRAGMENTS.verbatim);
  if (f.align) out.push(BRACHYS_FRAGMENTS.align);
  if (f.gen) {
    const s: string[] = [];
    if (f.anySlot) s.push(BRACHYS_FRAGMENTS.s1);
    if (f.mod) s.push(BRACHYS_FRAGMENTS.s2);
    if (f.pad) s.push(BRACHYS_FRAGMENTS.s3);
    if (f.letter) s.push(BRACHYS_FRAGMENTS.s4);
    if (f.braces) s.push(BRACHYS_FRAGMENTS.s5);
    out.push(s.length ? `${BRACHYS_FRAGMENTS.genHead} ${s.join(', ')}.` : 'G<c>=<spec> restores deleted column c per row r.');
  }
  if (f.cycle) out.push(BRACHYS_FRAGMENTS.cycle);
  if (f.date) out.push(BRACHYS_FRAGMENTS.date);
  out.push(BRACHYS_FRAGMENTS.tail);
  return out.join(' ');
}

/** The body band the contract declares, or null when the contract is not ours. */
/**
 * X71: the base clause is the BAND MARKER, not decoration. AUSTEROS (austere.ts)
 * searches the instruction, so the reader must recognise every base phrasing the
 * pool admits. Two things are load-bearing and are therefore fixed:
 *   - the c-tape band is identified by the words "c-tape", so a tape body is
 *     never read as a literal body;
 *   - the literal band is identified by this exact prefix, which every admitted
 *     literal phrasing in AUSTERE_POOL.baseLit carries verbatim.
 * Nothing else in the contract is parsed by the decoder: the WIRE is identical to
 * BRACHYS's, so exactness does not depend on the rest of the English. The rest of
 * the English is validated by an independent reader instead (bench/x71/reader3.ts).
 */
export const AUSTERE_BASE_LIT_PREFIX = 'A-B are 0-based body lines';

export function brachysBandOf(contract: string): 'b' | 'c' | null {
  if (contract === '') return null;
  if (contract.startsWith(BRACHYS_FRAGMENTS.baseLit)) return 'b';
  if (contract.startsWith(BRACHYS_FRAGMENTS.baseTape)) return 'c';
  if (contract.includes('c-tape')) return 'c';
  if (contract.startsWith(AUSTERE_BASE_LIT_PREFIX)) return 'b';
  return null;
}

// ---------------------------------------------------------------------------
// 2. THE FROM-SPEC READER
// ---------------------------------------------------------------------------
// Written from the prose above. It does not import HYLE's parsers, its slot
// evaluator, or its restore functions; the only thing it shares with HYLE is
// the CHIRON tape decoder, which is the declared parent codec and is named as
// such in the contract ("decode the tape ... by the rule it states").

interface WireSlot {
  a: bigint; d: bigint; scale: number; mod: bigint | null; pad: number; letter: string | null;
}
type WireSpec =
  | { kind: 'tpl'; parts: Array<{ lit: string } | { slot: WireSlot }> }
  | { kind: 'cycle'; period: number; values: string[] }
  | { kind: 'date'; start: number; span: number | null; end: number | null; weekday: boolean; skip: number[]; explicitEnd: boolean };

interface WireTable {
  start: number; end: number; sepRepr: string; sep: string; runs: boolean; head: number; fields: number;
}
interface WireAlign { left: boolean; pos: number }

function scaledParse(s: string): { v: bigint; scale: number } | null {
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  const dot = s.indexOf('.');
  const scale = dot < 0 ? 0 : s.length - dot - 1;
  const neg = s.startsWith('-');
  const body = neg ? s.slice(1) : s;
  const digits = body.replace('.', '');
  return { v: BigInt(digits) * (neg ? -1n : 1n), scale };
}

/** `A+B*r`, with optional `mM` and `zW` and an optional leading `cX`. */
function slotParse(inner: string): WireSlot | null {
  let rest = inner;
  let letter: string | null = null;
  if (/^c[A-Za-z]/.test(rest)) { letter = rest[1]; rest = rest.slice(2); }
  let pad = 0;
  const zp = /^(.*?)z(\d+)$/.exec(rest);
  if (zp) { pad = parseInt(zp[2], 10); rest = zp[1]; }
  let mod: bigint | null = null;
  const mp = /^(.*?)m(-?\d+)$/.exec(rest);
  if (mp) {
    const p = scaledParse(mp[2]);
    if (!p || p.v <= 0n) return null;
    mod = p.v;
    rest = mp[1];
  }
  const cut = rest.indexOf('+', 1);
  if (cut < 0) return null;
  const A = scaledParse(rest.slice(0, cut));
  const D = scaledParse(rest.slice(cut + 1));
  if (!A || !D) return null;
  const scale = Math.max(A.scale, D.scale);
  return {
    a: A.v * BI10(scale - A.scale), d: D.v * BI10(scale - D.scale), scale, mod, pad, letter,
  };
}

function specParse(spec: string): WireSpec | null {
  if (spec.startsWith('#')) {
    const i = spec.indexOf(':');
    if (i < 0) return null;
    const period = parseInt(spec.slice(1, i), 10);
    if (!period || period < 1) return null;
    const values = spec.slice(i + 1).split(',');
    if (values.length !== period) return null;
    return { kind: 'cycle', period, values };
  }
  if (spec.startsWith('@')) {
    const m = spec.slice(1).match(/^(\d{4}-\d{2}-\d{2})(?:\.\.(\d{4}-\d{2}-\d{2})|\+(\d+))?(w)?(?:-([\d,]+))?$/);
    if (!m) return null;
    const start = Math.round(Date.parse(m[1] + 'T00:00:00Z') / DAY);
    const explicitEnd = !!m[2];
    const end = explicitEnd ? Math.round(Date.parse(m[2] + 'T00:00:00Z') / DAY) : null;
    const span = m[3] ? parseInt(m[3], 10) : null;
    if (!explicitEnd && span === null) return null;
    const skip = m[5] ? m[5].split(',').filter((x) => x.length).map((x) => parseInt(x, 10)) : [];
    if (skip.some((x) => Number.isNaN(x))) return null;
    return { kind: 'date', start, span, end, weekday: !!m[4], skip, explicitEnd };
  }
  const parts: Array<{ lit: string } | { slot: WireSlot }> = [];
  let lit = '';
  for (let i = 0; i < spec.length; i++) {
    const c = spec[i];
    if (c === '{' && spec[i + 1] === '{') { lit += '{'; i++; continue; }
    if (c === '}' && spec[i + 1] === '}') { lit += '}'; i++; continue; }
    if (c === '{') {
      let depth = 1;
      let j = i + 1;
      while (j < spec.length && depth > 0) {
        if (spec[j] === '{') depth++;
        else if (spec[j] === '}') depth--;
        if (depth > 0) j++;
      }
      if (depth !== 0) return null;
      const slot = slotParse(spec.slice(i + 1, j));
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

function scaledRender(v: bigint, scale: number, pad: number): string {
  const neg = v < 0n;
  const mag = neg ? -v : v;
  let ip: string;
  let fp = '';
  if (scale > 0) {
    const d = BI10(scale);
    ip = (mag / d).toString();
    fp = '.' + (mag % d).toString().padStart(scale, '0');
  } else {
    ip = mag.toString();
  }
  if (pad > ip.length) ip = ip.padStart(pad, '0');
  return (neg ? '-' : '') + ip + fp;
}

function specEval(sp: WireSpec, r: number): string {
  if (sp.kind === 'cycle') return sp.values[((r % sp.period) + sp.period) % sp.period];
  if (sp.kind === 'date') {
    const skip = new Set(sp.skip);
    const last = sp.explicitEnd ? sp.end! : sp.start + sp.span!;
    let seen = -1;
    for (let d = sp.start; d <= last; d++) {
      if (sp.weekday) {
        const w = new Date(d * DAY).getUTCDay();
        if (w === 0 || w === 6) continue;
      }
      if (skip.has(d - sp.start)) continue;
      seen++;
      if (seen === r) return new Date(d * DAY).toISOString().slice(0, 10);
    }
    return '';
  }
  let out = '';
  for (const p of sp.parts) {
    if ('lit' in p) { out += p.lit; continue; }
    const s = p.slot;
    let v: bigint;
    if (s.mod !== null && s.mod > 0n) {
      const m = s.mod * BI10(s.scale);
      const t = s.d * BigInt(r);
      v = s.a + ((t % m) + m) % m;
    } else {
      v = s.a + s.d * BigInt(r);
    }
    out += s.letter
      ? String.fromCharCode(s.letter.charCodeAt(0) + Number(v))
      : scaledRender(v, s.scale, s.pad);
  }
  return out;
}

/** Split a line into `count` fields joined by single spaces (space-run tables). */
function splitCapped(line: string, sep: string, count?: number): string[] {
  if (sep !== ' ' || count === undefined || count < 1) return line.split(sep);
  const out: string[] = [];
  let rest = line;
  for (let k = 0; k < count - 1; k++) {
    const sp = rest.indexOf(' ');
    if (sp < 0) return line.split(sep);
    out.push(rest.slice(0, sp));
    rest = rest.slice(sp + 1);
  }
  out.push(rest);
  return out;
}

/**
 * The reader. Given the whole message (contract line + LF + wire) it returns the
 * document, or null when the wire is outside the contract it can honour. Null is
 * never "best effort": the encoder treats it as a refusal.
 */
export function brachysDecodeMessage(message: string): string | null {
  const firstLf = message.indexOf('\n');
  if (firstLf < 0) return null;
  const wire = message.slice(firstLf + 1);
  if (!wire.startsWith(SENTINEL)) return null;
  const nl = wire.indexOf('\n');
  if (nl < 0) return null;
  const dirs = wire.slice(1, nl).split(';');
  const body = wire.slice(nl + 1);
  const band = brachysBandOf(message.slice(0, firstLf));
  if (band === null) return null;

  let arm = band;
  let table: WireTable | null = null;
  let align: WireAlign[] = [];
  const gens: Array<{ index: number; spec: WireSpec }> = [];
  for (const d of dirs) {
    if (!d.length) return null;
    switch (d[0]) {
      case 'T': {
        const m = d.match(/^T([,;|_\t])(\d+)-(\d+)(?:h(\d))?$/);
        if (!m) return null;
        const head = m[4] === undefined ? 0 : parseInt(m[4], 10);
        if (head > 2) return null;
        table = {
          start: parseInt(m[2], 10), end: parseInt(m[3], 10), sepRepr: m[1],
          sep: m[1] === '_' ? ' ' : m[1], runs: m[1] === '_', head, fields: 0,
        };
        break;
      }
      case 'A': {
        const nums = d.slice(1).split(',').map((x) => parseInt(x, 10));
        if (!nums.length || nums.some((v) => !Number.isFinite(v))) return null;
        align = nums.map((v) => (v < 0 ? { left: false, pos: -v } : { left: true, pos: v }));
        break;
      }
      case 'G': {
        if (!table) return null;
        const eq = d.indexOf('=');
        if (eq < 0) return null;
        const index = parseInt(d.slice(1, eq), 10);
        if (!Number.isFinite(index) || index < 0) return null;
        const spec = specParse(d.slice(eq + 1));
        if (!spec) return null;
        gens.push({ index, spec });
        break;
      }
      default:
        // 'I' (indentation) is deliberately outside BRACHYS's contract.
        return null;
    }
  }
  if (!table) return null;
  gens.sort((a, b) => a.index - b.index);

  let text = arm === 'c' ? chironDecode(body) : body;

  if (gens.length) {
    if (table.runs) table.fields = align.length;
    const k = gens.length;
    const lines = text.split('\n');
    const first = table.start + table.head;
    for (let i = first; i <= table.end && i < lines.length; i++) {
      const r = i - first;
      const survive = table.fields > 0 ? table.fields - k : undefined;
      const f = lines[i] === '' ? [] : splitCapped(lines[i], table.sep, survive);
      const total = f.length + k;
      const vals: string[] = new Array(total).fill('');
      let gi = 0;
      let fi = 0;
      for (let c = 0; c < total; c++) {
        if (gi < gens.length && gens[gi].index === c) { vals[c] = specEval(gens[gi].spec, r); gi++; }
        else vals[c] = fi < f.length ? f[fi++] : '';
      }
      lines[i] = vals.join(table.sep);
    }
    text = lines.join('\n');
  }

  if (align.length) {
    if (!table.runs) return null;
    const lines = text.split('\n');
    for (let i = table.start; i <= table.end && i < lines.length; i++) {
      const f = splitCapped(lines[i], ' ', table.fields);
      if (f.length !== table.fields || f.some((x, c) => c < table.fields - 1 && x === '')) continue;
      let res = '';
      let ok = true;
      for (let c = 0; c < f.length; c++) {
        if (c >= align.length) { ok = false; break; }
        const at = align[c].left ? align[c].pos : align[c].pos - f[c].length;
        if (at < res.length) { ok = false; break; }
        while (res.length < at) res += ' ';
        res += f[c];
      }
      if (ok) lines[i] = res;
    }
    text = lines.join('\n');
  }

  return text;
}

// ---------------------------------------------------------------------------
// 3. ENCODER
// ---------------------------------------------------------------------------

export interface BrachysResult extends TagstackResult {
  brachys: boolean;
  contract: string;
  contractTokens: number;
  wireTokens: number;
  candidateTokens: number | null;
  candidateExact: boolean | null;
  candidateMessage: string | null;
  frontierFloor: number;
  brachysWinner: 'brachys' | 'frontier';
  brachysArm: 'b' | 'c' | null;
  dirs: string[];
  reader: 'from-spec' | 'frontier';
}

function cloneFrontier(r: TagstackResult, why: string): BrachysResult {
  return {
    ...r,
    frontierCosts: { ...r.frontierCosts },
    frontierReportedCosts: { ...r.frontierReportedCosts },
    brachys: false, contract: '', contractTokens: 0, wireTokens: 0,
    candidateTokens: null, candidateExact: null, candidateMessage: null,
    frontierFloor: r.messageTokens, brachysWinner: 'frontier', brachysArm: null, dirs: [],
    reader: 'frontier', notes: why,
  };
}

export interface BrachysPlan {
  arm: 'b' | 'c';
  message: string;
  wire: string;
  contract: string;
  tokens: number;
  dirs: string[];
  /** every arm that was built and how it scored, for receipts */
  tried: string[];
}

/**
 * The fold planner. No frontier call: this is the part that can be exercised
 * exhaustively (unit + fuzz), and it is deliberately separate so that a test of
 * the reader never has to pay for the eight-parent gate.
 */
export function brachysPlan(text: string, enc: EncodingName = 'o200k_base'): { plan: BrachysPlan | null; why: string } {
  if (!text.length || text.length > 200_000) return { plan: null, why: `size ${text.length}` };
  let fold: { wire: string; dirs: string[]; body: string } | null = null;
  try {
    const h = hyleEncode(text, enc, { fast: true });
    const nl = h.wire.indexOf('\n');
    if (h.wire.startsWith(SENTINEL) && nl > 0) {
      const dirs = h.wire.slice(1, nl).split(';').filter((d) => d.length && d[0] !== 'B');
      fold = { wire: h.wire, dirs, body: h.wire.slice(nl + 1) };
    }
  } catch { fold = null; }
  if (!fold || !fold.dirs.some((d) => d[0] === 'T')) return { plan: null, why: 'no table fold offered' };
  // Anything outside the from-spec reader's contract is refused, not adapted.
  if (fold.dirs.some((d) => d[0] === 'I')) return { plan: null, why: 'indentation fold is outside this contract' };

  const arms: Array<{ arm: 'b' | 'c'; body: string }> = [{ arm: 'b', body: fold.body }];
  try {
    arms.push({ arm: 'c', body: daedalusEncode(fold.body, enc).wire });
  } catch { /* literal arm only */ }

  let best: BrachysPlan | null = null;
  const tried: string[] = [];
  for (const a of arms) {
    const dirs = fold.dirs;
    const contract = brachysContractFor(dirs, a.arm);
    if (!contract) { tried.push(`${a.arm}:no-contract`); continue; }
    const wire = SENTINEL + dirs.join(';') + '\n' + a.body;
    const message = contract + '\n' + wire;
    const decoded = brachysDecodeMessage(message);
    if (decoded !== text) { tried.push(`${a.arm}:reader-mismatch`); continue; }
    const tokens = countTokens(message, enc);
    tried.push(`${a.arm}:${tokens}`);
    if (!best || tokens < best.tokens) best = { arm: a.arm, message, wire, contract, tokens, dirs, tried };
  }
  if (!best) return { plan: null, why: `no arm survived the reader [${tried.join(' ')}]` };
  best.tried = tried;
  return { plan: best, why: tried.join(' ') };
}

/**
 * BRACHYS. Fails closed: when the from-spec reader does not reproduce the source
 * exactly, or the complete message is not strictly cheaper than the shipped
 * frontier's, the frontier's own message is returned unchanged.
 */
export function brachysEncode(text: string, enc: EncodingName = 'o200k_base'): BrachysResult {
  const started = Date.now();
  const frontier = tagstackEncode(text, enc);
  const floor = frontier.messageTokens;
  const { plan: best, why } = brachysPlan(text, enc);
  if (!best) {
    return cloneFrontier(frontier, `brachys: ${why}; frontier ${floor}`);
  }
  if (best.tokens >= floor) {
    const out = cloneFrontier(frontier, `brachys loses: candidate ${best.tokens} (arm ${best.arm}, tried ${best.tried.join(' ')}) vs frontier ${floor}`);
    out.candidateTokens = best.tokens;
    out.candidateExact = true;
    out.candidateMessage = best.message;
    return out;
  }

  const ms = Date.now() - started;
  return {
    ...frontier,
    codec: 'tagstack',
    wire: best.wire,
    message: best.message,
    decoded: text,
    exact: true,
    messageTokens: best.tokens,
    parentTokens: frontier.parentTokens,
    frontierCosts: { ...frontier.frontierCosts },
    frontierReportedCosts: { ...frontier.frontierReportedCosts },
    frontierComplete: frontier.frontierComplete,
    candidateTokens: best.tokens,
    candidateExact: true,
    candidateMessage: best.message,
    brachys: true, contract: best.contract,
    contractTokens: countTokens(best.contract, enc),
    wireTokens: countTokens(best.wire, enc),
    frontierFloor: floor,
    brachysArm: best.arm, dirs: best.dirs, reader: 'from-spec', ms,
    brachysWinner: 'brachys',
    notes: `brachys arm ${best.arm}: contract ${countTokens(best.contract, enc)} + wire ${countTokens(best.wire, enc)} = ${best.tokens} vs frontier ${floor} (${best.tried.join(' ')})`,
  };
}
