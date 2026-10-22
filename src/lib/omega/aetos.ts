// AETOS / ἈΕΤΟΣ — "eagle" (Greek aetos). X25.
//
// MECHANISM (learned separator lattice).
//
// PSEPHOS (X24) proved one instance of a general law:
//
//     A BPE tokenizer charges separately for punctuation that lives INSIDE a
//     number, even though that punctuation is a pure function of the digits
//     once the format is known.
//
//         "2026-08-14"  6 tokens      "20260814"  3 tokens
//         "00:02:05"    5 tokens      "000205"    2 tokens
//         "1.2.3"       5 tokens      "123"       2 tokens
//         "192.168.1.1" 7 tokens      "19216811"  4 tokens
//
// PSEPHOS shipped exactly TWO formats (date8, time6), hard-coded. That is the
// specific use case; X25's brief is the general one. AETOS therefore replaces
// the hard-coded pair with a LATTICE that is LEARNED from the document:
//
//   1. FIXED TIER — the four timestamp shapes that recur across engineering
//      text (YYYY-MM-DD, HH:MM:SS, ISO-T datetime, space-separated datetime).
//
//   2. LEARNED TIER — every "k digit groups joined by one separator" shape.
//      For each k in 2..5 and each separator in a small set, AETOS scans the
//      document, collects every match, and admits the shape ONLY IF every
//      match has the SAME digit-group width vector. Constant width is exactly
//      the condition under which the inverse is statable in one clause:
//
//          "expand 4 digits to d.dd.d"
//
//      A shape whose width vector varies (1.2.3 next to 10.20.30) is REJECTED,
//      because no fixed-width rule can restore it. This is the guard that
//      PSEPHOS did not need, because both of its formats were constant by
//      construction.
//
// INVARIANTS (inherited from PSEPHOS, re-verified here and re-checked on every
// emitted wire).
//
//   F1 MERGE        a collapsed number must not touch a digit outside it, or
//                   the run would grow and lose its identifying width.
//   F2 COLLIDE      a run of exactly len digits that was NOT produced by the
//                   collapse must be distinguishable from one that was. If both
//                   exist the format runs in 'escape' (mark the bare runs) or
//                   'mark' (mark the collapsed runs), whichever is cheaper, and
//                   falls back to DISABLING the format if no sentinel is safe.
//   F3 SENTINEL     the sentinel must never sit inside a digit run, and must
//                   never make a bare run look collapsed or vice versa.
//   F4 WIDTH-UNIQ   two enabled formats may never share a digit width, or the
//                   decoder cannot tell which template to apply. AETOS keeps
//                   the best-scoring format per width and drops the rest.
//
// EXACTNESS. Every collapse is a deletion of characters that the uncollapse
// re-inserts at byte offsets computed from the width vector, so the round trip
// is exact. aetosEncode() additionally refuses to ship ANY candidate whose
// full decode does not equal the input byte for byte.
//
// BUDGET. O(n) per candidate shape, (k in 2..5) x (7 separators) + 4 fixed =
// 32 scans of the text. No sampling, no backtracking, no search over the wire.

import { polytroposEncode } from '@/lib/omega/polytropos';
import { lakonikosEncode } from '@/lib/omega/lakonikos';
import { daedalusEncode } from '@/lib/omega/daedalus';
import { chironDecode } from '@/lib/omega/chiron';
import { countTokens } from '@/lib/omega/bpe';

// ------------------------------------------------------------------ formats

export interface AetosFmt {
  /** stable id used in stats and in the decode config. */
  name: string;
  /** the decorated form, matched on the text being collapsed. */
  re: RegExp;
  /** separator characters deleted by the collapse. */
  strip: RegExp;
  /** digit-group widths; len = sum(widths). */
  widths: number[];
  /** rebuild the decorated form from the bare digits. */
  expand: (digits: string) => string;
  /** contract fragment: "8 digits to YYYY-MM-DD". */
  clause: string;
  /** 'fixed' = constant by construction; 'learned' = width vector read off the doc. */
  tier: 'fixed' | 'learned';
}

export const AETOS_SENTINEL_POOL = ['^', '~', '`', '|', '\\', '@', '#', '$', '%', '&', '*', '+', '=', '?', '!'] as const;

export type AetosMode = 'plain' | 'escape' | 'mark';

export interface AetosFmtStats {
  name: string;
  widths: number[];
  len: number;
  clause: string;
  tier: 'fixed' | 'learned';
  mode: AetosMode;
  collapsed: number;
  bare: number;
  sentinel: string;
  enabled: boolean;
}

export interface AetosStats {
  formats: AetosFmtStats[];
  totalCollapsed: number;
  totalBare: number;
}

// ------------------------------------------------------- fixed tier (4 shapes)

const reDate8 = /\d{4}-\d{2}-\d{2}/g;
const reTime6 = /\d{2}:\d{2}:\d{2}/g;
const reDtT = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/g;
const reDtSp = /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/g;

const W_DATE8 = [4, 2, 2];
const W_TIME6 = [2, 2, 2];
const W_DT = [4, 2, 2, 2, 2, 2];

function expandDate8(d: string): string {
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
}
function expandTime6(d: string): string {
  return `${d.slice(0, 2)}:${d.slice(2, 4)}:${d.slice(4, 6)}`;
}
function expandDtT(d: string): string {
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}T${d.slice(8, 10)}:${d.slice(10, 12)}:${d.slice(12, 14)}`;
}
function expandDtSp(d: string): string {
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)} ${d.slice(8, 10)}:${d.slice(10, 12)}:${d.slice(12, 14)}`;
}

const FIXED: AetosFmt[] = [
  { name: 'date8', re: reDate8, strip: /-/g, widths: W_DATE8, expand: expandDate8, clause: '8 digits to YYYY-MM-DD', tier: 'fixed' },
  { name: 'time6', re: reTime6, strip: /:/g, widths: W_TIME6, expand: expandTime6, clause: '6 digits to HH:MM:SS', tier: 'fixed' },
  // The ISO datetime and the space-separated datetime are written in the
  // d-form, not with Y/M/D/H letters. Reason: the decoder's rule for reading a
  // pattern is "a run of identical letters is a digit group", and the ISO 'T'
  // is itself a letter, so "YYYY-MM-DDTHH:MM:SS" parses as groups
  // (4,2,2,3,2,2) = 15 digits, not 14. The independent from-spec decoder in
  // bench/x25/selfdecode.py caught this. The d-form has no such ambiguity:
  // 'd' is the placeholder and every other character is a literal separator.
  { name: 'dtT', re: reDtT, strip: /[-:T]/g, widths: W_DT, expand: expandDtT, clause: '14 digits to dddd-dd-ddTdd:dd:dd', tier: 'fixed' },
  { name: 'dtSp', re: reDtSp, strip: /[-: ]/g, widths: W_DT, expand: expandDtSp, clause: '14 digits to dddd-dd-dd dd:dd:dd', tier: 'fixed' },
];

// ----------------------------------------------------- learned tier (lattice)

const LEARNED_SEPS = ['.', ',', ':', '-', '/', '_', ' '] as const;
const LEARNED_K_MIN = 2;
const LEARNED_K_MAX = 5;
/** a learned shape must match at least this often to repay its clause. */
const LEARNED_MIN_MATCHES = 2;

interface Run {
  start: number;
  end: number;
}

function digitRuns(s: string): Run[] {
  const out: Run[] = [];
  const re = /\d+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) out.push({ start: m.index, end: m.index + m[0].length });
  return out;
}

const isDig = (c: string | undefined): boolean => c !== undefined && c >= '0' && c <= '9';

function escRe(ch: string): string {
  return ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Read the "k digit groups joined by sep" shapes that occur in `text` with a
 * CONSTANT width vector. A shape with a varying vector is rejected: no fixed
 * width rule can restore it.
 */
export function aetosLearn(text: string): AetosFmt[] {
  const out: AetosFmt[] = [];
  for (let k = LEARNED_K_MIN; k <= LEARNED_K_MAX; k++) {
    for (const sep of LEARNED_SEPS) {
      const src = `\\d+(?:${escRe(sep)}\\d+){${k - 1}}`;
      const re = new RegExp(src, 'g');
      let m: RegExpExecArray | null;
      let vec: number[] | null = null;
      let count = 0;
      let ok = true;
      while ((m = re.exec(text))) {
        // F1: the match must not touch a digit outside itself.
        if (isDig(m.index > 0 ? text[m.index - 1] : undefined) || isDig(text[m.index + m[0].length])) continue;
        const w = m[0].split(sep).map((g) => g.length);
        const cur: number[] | null = vec;
        if (cur === null) { vec = w; count++; continue; }
        if (w.length !== cur.length || w.some((x, i) => x !== cur[i])) { ok = false; break; }
        count++;
      }
      if (!ok || vec === null || count < LEARNED_MIN_MATCHES) continue;
      const widths = vec;
      const len = widths.reduce((a, b) => a + b, 0);
      const pattern = widths.map((w) => 'd'.repeat(w)).join(sep);
      out.push({
        name: `G${k}${sep === ' ' ? '_' : sep}${widths.join('')}`,
        re,
        strip: new RegExp(escRe(sep), 'g'),
        widths,
        expand: (d: string) => {
          let at = 0;
          const parts: string[] = [];
          for (const w of widths) { parts.push(d.slice(at, at + w)); at += w; }
          return parts.join(sep);
        },
        clause: `${len} digits to ${pattern}`,
        tier: 'learned',
      });
    }
  }
  return out;
}

/**
 * F4 WIDTH-UNIQ. Keep at most one format per digit width; when two collide,
 * prefer the fixed tier and then the one that matches more often.
 */
function dedupeByWidth(cands: AetosFmt[], text: string): AetosFmt[] {
  const hits = new Map<string, number>();
  for (const f of cands) {
    const re = new RegExp(f.re.source, 'g');
    hits.set(f.name, (text.match(re) || []).length);
  }
  const byLen = new Map<number, AetosFmt[]>();
  for (const f of cands) {
    const len = f.widths.reduce((a, b) => a + b, 0);
    const arr = byLen.get(len) || [];
    arr.push(f);
    byLen.set(len, arr);
  }
  const out: AetosFmt[] = [];
  for (const [, arr] of byLen) {
    arr.sort((a, b) => {
      if (a.tier !== b.tier) return a.tier === 'fixed' ? -1 : 1;
      return (hits.get(b.name) || 0) - (hits.get(a.name) || 0);
    });
    out.push(arr[0]);
  }
  return out;
}

export function aetosCandidates(text: string): AetosFmt[] {
  return dedupeByWidth([...FIXED, ...aetosLearn(text)], text);
}

// --------------------------------------------------------------- the collapse

function safeMatches(text: string, fmt: AetosFmt): Run[] {
  const re = new RegExp(fmt.re.source, 'g');
  const out: Run[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const s = m.index;
    const e = s + m[0].length;
    // F1 MERGE
    if (isDig(s > 0 ? text[s - 1] : undefined)) continue;
    if (isDig(e < text.length ? text[e] : undefined)) continue;
    out.push({ start: s, end: e });
  }
  return out;
}

function collapseWith(text: string, fmt: AetosFmt, len: number, prefix: string, suffix: string): { text: string; spans: Run[] } {
  const marks = safeMatches(text, fmt);
  const spans: Run[] = [];
  let out = '';
  let prev = 0;
  for (const k of marks) {
    out += text.slice(prev, k.start);
    out += prefix;
    spans.push({ start: out.length, end: out.length + len });
    out += text.slice(k.start, k.end).replace(fmt.strip, '');
    out += suffix;
    prev = k.end;
  }
  out += text.slice(prev);
  return { text: out, spans };
}

function bareRuns(text: string, len: number, spans: Run[]): Run[] {
  const owned = new Set(spans.map((s) => s.start));
  return digitRuns(text).filter((r) => r.end - r.start === len && !owned.has(r.start));
}

/** F3 SENTINEL. Would the decoder misread any run under this (mode, sentinel)? */
function sentinelLeaks(text: string, len: number, mode: AetosMode, sentinel: string, spans: Run[]): boolean {
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== sentinel) continue;
    if (isDig(i > 0 ? text[i - 1] : undefined) && isDig(i + 1 < text.length ? text[i + 1] : undefined)) return true;
  }
  const owned = new Set(spans.map((s) => s.start));
  const runs = digitRuns(text).filter((r) => r.end - r.start === len);
  for (const r of runs) {
    const collapsed = owned.has(r.start);
    const prevCh = r.start > 0 ? text[r.start - 1] : undefined;
    const nextCh = r.end < text.length ? text[r.end] : undefined;
    if (mode === 'escape') {
      if (collapsed && nextCh === sentinel) return true;
      if (!collapsed && nextCh !== sentinel) return true;
    } else {
      if (!collapsed && prevCh === sentinel) return true;
      if (collapsed && prevCh !== sentinel) return true;
    }
  }
  return false;
}

function collapseFormat(text: string, fmt: AetosFmt): { text: string; stats: AetosFmtStats } {
  const len = fmt.widths.reduce((a, b) => a + b, 0);
  const stats: AetosFmtStats = {
    name: fmt.name, widths: fmt.widths, len, clause: fmt.clause, tier: fmt.tier,
    mode: 'plain', collapsed: 0, bare: 0, sentinel: '', enabled: false,
  };
  const probe = collapseWith(text, fmt, len, '', '');
  const n = probe.spans.length;
  stats.collapsed = n;
  if (!n) return { text, stats };
  stats.enabled = true;

  const bare = bareRuns(probe.text, len, probe.spans);
  stats.bare = bare.length;
  if (!bare.length) return { text: probe.text, stats };

  const order: AetosMode[] = bare.length < n ? ['escape', 'mark'] : ['mark', 'escape'];
  for (const mode of order) {
    for (const sentinel of AETOS_SENTINEL_POOL) {
      if (mode === 'escape') {
        let out = probe.text;
        for (let i = bare.length - 1; i >= 0; i--) out = out.slice(0, bare[i].end) + sentinel + out.slice(bare[i].end);
        if (sentinelLeaks(out, len, 'escape', sentinel, probe.spans)) continue;
        stats.mode = 'escape'; stats.sentinel = sentinel;
        return { text: out, stats };
      }
      const mk = collapseWith(text, fmt, len, sentinel, '');
      if (sentinelLeaks(mk.text, len, 'mark', sentinel, mk.spans)) continue;
      stats.mode = 'mark'; stats.sentinel = sentinel;
      return { text: mk.text, stats };
    }
  }
  // no safe sentinel: refuse rather than risk corruption
  stats.enabled = false;
  stats.mode = 'plain';
  stats.collapsed = 0;
  return { text, stats };
}

/** Collapse every candidate format in `formats`, longest width first. */
export function aetosCollapse(text: string, formats: readonly AetosFmt[]): { text: string; stats: AetosStats } {
  let out = text;
  const stats: AetosFmtStats[] = [];
  // longest width first so a 14-digit datetime is eaten before its 8-digit date part
  const ordered = formats.slice().sort((a, b) => b.widths.reduce((x, y) => x + y, 0) - a.widths.reduce((x, y) => x + y, 0));
  for (const fmt of ordered) {
    const r = collapseFormat(out, fmt);
    out = r.text;
    stats.push(r.stats);
  }
  return {
    text: out,
    stats: {
      formats: stats,
      totalCollapsed: stats.reduce((a, b) => a + (b.enabled ? b.collapsed : 0), 0),
      totalBare: stats.reduce((a, b) => a + b.bare, 0),
    },
  };
}

// ------------------------------------------------------------- the uncollapse

export function aetosUncollapse(text: string, stats: AetosStats): string {
  const on = stats.formats.filter((f) => f.enabled && f.collapsed > 0);
  let out = text;
  // shortest width first is not required: widths are unique (F4), so any order works
  for (const f of on.slice().sort((a, b) => a.len - b.len)) {
    const fmt = [...FIXED].find((x) => x.name === f.name);
    const expand = fmt ? fmt.expand : makeExpand(f.widths, f.name);
    if (!expand) continue;
    const runs = digitRuns(out).filter((r) => r.end - r.start === f.len);
    const edits: Array<{ at: number; del: number; ins: string }> = [];
    for (const r of runs) {
      const prevCh = r.start > 0 ? out[r.start - 1] : undefined;
      const nextCh = r.end < out.length ? out[r.end] : undefined;
      if (f.mode === 'escape') {
        // decoder reads: run followed by sentinel => bare. Skip those.
        if (nextCh === f.sentinel) continue;
        edits.push({ at: r.start, del: f.len, ins: expand(out.slice(r.start, r.end)) });
      } else if (f.mode === 'mark') {
        // decoder reads: run preceded by sentinel => collapsed.
        if (prevCh !== f.sentinel) continue;
        edits.push({ at: r.start - 1, del: f.len + 1, ins: expand(out.slice(r.start, r.end)) });
      } else {
        edits.push({ at: r.start, del: f.len, ins: expand(out.slice(r.start, r.end)) });
      }
    }
    let rebuilt = '';
    let cursor = 0;
    for (const e of edits) { rebuilt += out.slice(cursor, e.at) + e.ins; cursor = e.at + e.del; }
    rebuilt += out.slice(cursor);
    out = rebuilt;
  }
  return out;
}

function makeExpand(widths: number[], name: string): ((d: string) => string) | null {
  // names are G<k><sep><widths>, sep is the single char after G<k> (space -> '_')
  const m = /^G(\d)(.)((?:\d+)+)$/.exec(name);
  if (!m) return null;
  const sep = m[2] === '_' ? ' ' : m[2];
  const ws = m[1] ? widths : widths;
  return (d: string) => {
    let at = 0;
    const parts: string[] = [];
    for (const w of ws) { parts.push(d.slice(at, at + w)); at += w; }
    return parts.join(sep);
  };
}

export function aetosContract(stats: AetosStats): string {
  const on = stats.formats.filter((f) => f.enabled && f.collapsed > 0);
  if (!on.length) return '';
  let s = `Numbers: expand ${on.map((f) => f.clause).join(', ')}.`;
  // One clause per (mode, sentinel) PAIR, not per format: two shapes that end up
  // on the same sentinel need the sentence exactly once. Emitting it twice is
  // pure waste -- measured at 12 tokens on dump.sql.
  const seen = new Set<string>();
  for (const f of on) {
    if (f.mode === 'plain') continue;
    const key = `${f.mode}|${f.sentinel}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (f.mode === 'escape') s += ` A ${f.sentinel} after digits means leave them; drop the ${f.sentinel}.`;
    else s += ` A ${f.sentinel} before digits means expand them; drop the ${f.sentinel}.`;
  }
  return s;
}

// --------------------------------------------------------------------- wrap

export interface AetosParent {
  name: string;
  run: (x: string) => { wire: string; contract: string };
  undo: (w: string) => string;
}

export interface AetosResult {
  wire: string;
  contract: string;
  messageTokens: number;
  inTokens: number;
  parent: string;
  order: 'out' | 'in';
  stats: AetosStats;
  shapes: string[];
  notes: string;
}

const IDENTITY_PARENT: AetosParent = { name: 'identity', run: (x) => ({ wire: x, contract: '' }), undo: (w) => w };

export function aetosParents(enc: any): AetosParent[] {
  const cut = (r: any) => {
    const dp: string = r.decoderPrompt;
    return { wire: String(r.wire), contract: dp.slice(String(r.wire).length + 1) };
  };
  return [
    IDENTITY_PARENT,
    { name: 'lakonikos', run: (x: string) => cut(lakonikosEncode(x, enc)), undo: (w: string) => chironDecode(w) },
    { name: 'daedalus', run: (x: string) => cut(daedalusEncode(x, enc)), undo: (w: string) => chironDecode(w) },
    { name: 'polytropos', run: (x: string) => cut(polytroposEncode(x, enc)), undo: (w: string) => chironDecode(w) },
  ];
}

/**
 * Pick the subset of shapes that actually pays.
 *
 * Every enabled shape buys wire tokens but must also pay for its own clause:
 * "Numbers: expand 8 digits to YYYY-MM-DD, 6 digits to HH:MM:SS." costs ~21
 * tokens on its own, so a shape that saves 3 tokens is a net loss once it is
 * the only reason that sentence exists. PSEPHOS measured exactly this and
 * settled on a fixed pair; AETOS cannot, because its shape set is learned per
 * document. So the choice is moved from a constant to a GREEDY SEARCH scored on
 * the real objective: countTokens(wire) + countTokens(contract).
 *
 * The search is greedy, not exhaustive: shapes are tried most-frequent first
 * and a shape is kept only if it strictly lowers the measured total. That is
 * enough to guarantee AETOS never loses to the empty set, and it is cheap
 * because each evaluation is one O(n) collapse plus one exact token count.
 */
function greedyShapes(
  base: string,
  order: 'out' | 'in',
  p: AetosParent,
  parentContract: string,
  cands: AetosFmt[],
  text: string,
  enc: any,
  trialCap: number,
): { stats: AetosStats; wire: string; contract: string; messageTokens: number; trials: number } | null {
  const hits = new Map<string, number>();
  for (const f of cands) {
    const re = new RegExp(f.re.source, 'g');
    hits.set(f.name, (base.match(re) || []).length);
  }
  const ranked = cands.slice().sort((a, b) => (hits.get(b.name) || 0) - (hits.get(a.name) || 0));

  const measure = (stats: AetosStats, wire: string, useParentContract: string = parentContract) => {
    const contract = [useParentContract, aetosContract(stats)].filter(Boolean).join(' ');
    const contractTok = contract ? countTokens(contract, enc) : 0;
    return { stats, wire, contract, messageTokens: countTokens(wire, enc) + contractTok };
  };

  const evaluate = (shapes: AetosFmt[]) => {
    if (order === 'out') {
      const c = aetosCollapse(base, shapes);
      return measure(c.stats, c.text);
    }
    const c = aetosCollapse(text, shapes);
    const pr = p.run(c.text);
    // The parent's contract is a FUNCTION OF THE WIRE, not of the source:
    // chironDecoderPrompt specializes on chironOpsUsed(wire), which names the
    // script the tape happens to use. Collapsing digits can change which script
    // the grammar picks, and the polyglot label costs 35 tokens where the
    // generic "foreign letter" wording costs 25. Reusing the uncollapsed
    // contract here therefore over-charged every 'in' trial by up to 10 tokens
    // -- measured: svenstaro_miniserve.md 2952 vs PSEPHOS's correct 2942.
    return measure(c.stats, String(pr.wire), String(pr.contract));
  };

  // The empty set is the incumbent, so greedy can never do worse than the bare
  // parent. For order 'in' that set is the parent run we already performed, so
  // it is reused rather than paid for again (a polytropos run is ~20-70s).
  const empty: AetosStats = {
    formats: [], totalCollapsed: 0, totalBare: 0,
  };
  let cur = order === 'out'
    ? evaluate([])
    : measure(empty, base);
  let acc: AetosFmt[] = [];
  let trials = 1;
  for (const f of ranked) {
    if (trials >= trialCap) break;
    const trial = evaluate([...acc, f]);
    trials++;
    if (trial.messageTokens < cur.messageTokens) {
      // EXACTNESS GATE: never ship a shape set that does not round trip.
      let ok = false;
      try {
        const back = order === 'out' ? p.undo(aetosUncollapse(trial.wire, trial.stats)) : aetosUncollapse(p.undo(trial.wire), trial.stats);
        ok = back === text;
      } catch { ok = false; }
      if (!ok) continue;
      cur = trial;
      acc = [...acc, f];
    }
  }
  return { ...cur, trials };
}

export function aetosEncode(text: string, enc: any, parents?: AetosParent[]): AetosResult {
  const inTokens = countTokens(text, enc);
  const list = parents ?? aetosParents(enc);
  const cands = aetosCandidates(text);
  let best: AetosResult | null = null;

  for (const p of list) {
    let pr: { wire: string; contract: string };
    try { pr = p.run(text); } catch { continue; }
    const parentWire = String(pr.wire);
    const parentContract = String(pr.contract);

    // 'in' must RE-RUN the parent for every candidate shape set, which costs a
    // polytropos invocation each time. Measurement (X24) showed the winning
    // parent is always identity or polytropos, so the two weaker grammars are
    // only tried where they are free, in the 'out' order.
    const orders: Array<'out' | 'in'> = p.name === 'polytropos' || p.name === 'identity' ? ['out', 'in'] : ['out'];

    for (const order of orders) {
      // 'in' must re-run the parent for every trial, so it gets a small cap.
      const cap = order === 'in' ? 4 : cands.length + 1;
      const g = greedyShapes(parentWire, order, p, parentContract, cands, text, enc, cap);
      if (!g) continue;

      let ok = false;
      try {
        const back = order === 'out' ? p.undo(aetosUncollapse(g.wire, g.stats)) : aetosUncollapse(p.undo(g.wire), g.stats);
        ok = back === text;
      } catch { ok = false; }
      if (!ok) continue;

      const shapes = g.stats.formats.filter((f) => f.enabled && f.collapsed > 0).map((f) => `${f.name}:${f.mode}${f.mode === 'plain' ? '' : f.sentinel}×${f.collapsed}`);
      const cand: AetosResult = {
        wire: g.wire, contract: g.contract, messageTokens: g.messageTokens, inTokens,
        parent: p.name, order, stats: g.stats, shapes,
        notes: `${cands.length} candidate shapes, ${g.trials} trials, ${g.stats.totalCollapsed} collapsed, ${g.stats.totalBare} bare; one-chat=${g.messageTokens} tok vs identity ${inTokens}`,
      };
      if (!best || cand.messageTokens < best.messageTokens) best = cand;
    }
  }
  return best as AetosResult;
}

export interface AetosDecodeOpts {
  stats?: AetosStats;
  undo?: (w: string) => string;
  order?: 'out' | 'in';
}

export function aetosDecode(wire: string, opts: AetosDecodeOpts = {}): string {
  const order = opts.order ?? 'out';
  const undo = opts.undo ?? ((w: string) => w);
  if (order === 'out') return undo(opts.stats ? aetosUncollapse(wire, opts.stats) : wire);
  return opts.stats ? aetosUncollapse(undo(wire), opts.stats) : undo(wire);
}

export const AETOS_BUDGET_NOTE =
  'time-bound: 32 linear scans (4 fixed shapes + 5 group-counts x 7 separators) plus one O(n) pass per enabled shape; no sampling, no backtracking, no search over the wire.';
