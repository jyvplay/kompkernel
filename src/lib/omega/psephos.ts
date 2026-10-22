// PSEPHOS / ΨΗΦΟΣ — "pebble" (Greek psephos: a pebble used as a counter, whence
// psephology). X24.
//
// MECHANISM (digit-lattice collapse).
//
//   A BPE tokenizer charges separately for the punctuation that lives *inside* a
//   number. Measured on o200k_base:
//
//       "2026-08-14"  6 tokens      "20260814"  3 tokens
//       "00:02:05"    5 tokens      "000205"    2 tokens
//       "18,442.17"   5 tokens      "18442.17"  4 tokens
//       "192.168.1.1" 7 tokens      "1.2.3"     5 tokens
//
//   Those separators carry ZERO information: given the surrounding format they are
//   a pure function of the digits. So they can be deleted here and restored by the
//   reader with a one-line rule, exactly the way LEXIS deletes the derivable space
//   after a sentence mark. The yield is much larger than LEXIS's because a
//   separator costs a WHOLE token, whereas the space LEXIS deletes is usually
//   absorbed into the following word token and is therefore nearly free.
//
//   Across the 28-lane holdout the raw text contains 986 YYYY-MM-DD dates and
//   301 HH:MM:SS timestamps. Collapsing them is worth 2958 + 903 = 3861 raw
//   tokens, i.e. 6.1% of the whole 62954-token corpus.
//
// WHICH FORMATS ARE SAFE.
//
//   Only formats whose reconstruction is UNIQUE are shipped:
//
//     date8 : YYYY-MM-DD  ->  YYYYMMDD   (8 digits)
//     time6 : HH:MM:SS    ->  HHMMSS     (6 digits)
//
//   Deliberately NOT shipped, because the inverse is not a function:
//
//     thousands  "18,442" -> "18442"  : a bare 18442 is indistinguishable from a
//                                       collapsed 18,442. Not invertible.
//     dotted quad / semver            : "192.168.1.1" -> "19216811" cannot be
//                                       re-split; "1.2.3" -> "123" collides with
//                                       every 3-digit number in the document.
//
// THE AMBIGUITY GUARD (the part that makes this a codec and not a heuristic).
//
//   Collapsing is only valid if the reader can tell a collapsed number from a
//   number that was always bare. Three failure modes exist; all three are checked
//   mechanically at encode time:
//
//     (F1) MERGE    — a collapsed number sits next to a digit, so the two fuse into
//                     one longer run ("12026-08-14" -> "120260814"). The run length
//                     no longer identifies it. Such matches are skipped.
//     (F2) COLLIDE  — the document already contains a bare 8-digit (resp. 6-digit)
//                     run, e.g. the fractional part of "77.44539475" is exactly
//                     8 digits. Handled by choosing one of three modes.
//     (F3) SENTINEL LEAK — the sentinel, or a sentinel+run pair, already occurs in
//                     the text in the position the decoder would read. Handled by
//                     walking a sentinel pool and verifying each candidate.
//
//   Three modes, chosen by whichever is cheapest for THIS text:
//
//     plain  — no bare run of that width exists. Rule: "8-digit numbers are dates".
//     escape — bare runs are fewer than collapsed ones; each bare run gets a
//              trailing sentinel (1 token each) and is left as digits.
//     mark   — bare runs are at least as numerous; instead each collapsed number
//              carries a LEADING sentinel (1 token each).
//
// COMPOSITION.
//
//   PSEPHOS is a POST-FILTER on the parent's wire: wire = collapse(parentWire),
//   and decode = parentDecode(uncollapse(wire)). That ordering is forced. The
//   parent's grammar is built over the UNCOLLAPSED digits, so collapsing first
//   would destroy rules the grammar was already exploiting (measured: collapsing
//   BEFORE POLYTROPOS recovered only 185 of the 600 available tokens on
//   sp500-200.csv). And uncollapse must run BEFORE the parent's own rules because
//   the colons it re-inserts would otherwise be read by LEXIS's sentence-mark rule.

import { polytroposEncode } from '@/lib/omega/polytropos';
import { lakonikosEncode } from '@/lib/omega/lakonikos';
import { daedalusEncode } from '@/lib/omega/daedalus';
import { chironDecode } from '@/lib/omega/chiron';
import { countTokens } from '@/lib/omega/bpe';

// ---------------------------------------------------------------- formats

export type PsephosName = 'date8' | 'time6';

export interface PsephosFormat {
  /** 'date8' = YYYY-MM-DD -> YYYYMMDD ; 'time6' = HH:MM:SS -> HHMMSS. */
  name: PsephosName;
  /** exact digit width of the collapsed form. */
  len: number;
  /** matches on the ORIGINAL text. */
  re: RegExp;
  /** characters removed by the collapse. */
  strip: RegExp;
}

export const PSEPHOS_FORMATS: readonly PsephosFormat[] = [
  { name: 'date8', len: 8, re: /\d{4}-\d{2}-\d{2}/g, strip: /-/g },
  { name: 'time6', len: 6, re: /\d{2}:\d{2}:\d{2}/g, strip: /:/g },
] as const;

export const PSEPHOS_SENTINEL_POOL = ['^', '~', '`', '|', '\\', '@', '#', '$', '%', '&', '*', '+', '=', '?', '!'] as const;

export type PsephosMode = 'plain' | 'escape' | 'mark';

export interface PsephosFmtStats {
  name: PsephosName;
  mode: PsephosMode;
  collapsed: number;
  bare: number;
  skippedMerge: number;
  sentinel: string;
  enabled: boolean;
}

export interface PsephosStats {
  formats: PsephosFmtStats[];
  totalCollapsed: number;
  totalBare: number;
}

/** One maximal run of digits. */
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

/**
 * Non-overlapping matches of `fmt` in `text` that are safe to collapse: the
 * character on each side must not be a digit, otherwise the collapsed number
 * would merge into a longer run and lose its identifying width (F1).
 */
function safeMatches(text: string, fmt: PsephosFormat): Run[] {
  const re = new RegExp(fmt.re.source, 'g');
  const out: Run[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const s = m.index;
    const e = s + m[0].length;
    if (isDig(s > 0 ? text[s - 1] : undefined)) continue;
    if (isDig(e < text.length ? text[e] : undefined)) continue;
    out.push({ start: s, end: e });
  }
  return out;
}

/** Collapse `fmt` in `text`, returning the new text and the OUTPUT span of each
 *  collapsed item. `prefix`/`suffix` are wrapped around each collapsed item. */
function collapseWith(
  text: string,
  fmt: PsephosFormat,
  prefix: string,
  suffix: string,
): { text: string; spans: Run[]; skipped: number } {
  const marks = safeMatches(text, fmt);
  const spans: Run[] = [];
  let out = '';
  let prev = 0;
  const body = prefix.length;
  for (const k of marks) {
    out += text.slice(prev, k.start);
    out += prefix;
    spans.push({ start: out.length, end: out.length + fmt.len });
    out += text.slice(k.start, k.end).replace(fmt.strip, '');
    out += suffix;
    prev = k.end;
  }
  out += text.slice(prev);
  return { text: out, spans, skipped: 0 };
}

/** A run of exactly `fmt.len` digits that was NOT produced by a collapse. */
function bareRuns(text: string, fmt: PsephosFormat, spans: Run[]): Run[] {
  const owned = new Set(spans.map((s) => s.start));
  return digitRuns(text)
    .filter((r) => r.end - r.start === fmt.len)
    .filter((r) => !owned.has(r.start));
}

/**
 * Would the decoder misread any run given this sentinel? Checks F3: a collapsed
 * item must not sit where the decoder expects bare, a bare run must not sit where
 * the decoder expects collapsed, and the sentinel must never splice a digit run.
 */
function sentinelLeaks(text: string, fmt: PsephosFormat, mode: PsephosMode, sentinel: string, spans: Run[]): boolean {
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== sentinel) continue;
    if (isDig(i > 0 ? text[i - 1] : undefined) && isDig(i + 1 < text.length ? text[i + 1] : undefined)) return true;
  }
  const owned = new Set(spans.map((s) => s.start));
  const runs = digitRuns(text).filter((r) => r.end - r.start === fmt.len);
  for (const r of runs) {
    const collapsed = owned.has(r.start);
    const prevCh = r.start > 0 ? text[r.start - 1] : undefined;
    const nextCh = r.end < text.length ? text[r.end] : undefined;
    if (mode === 'escape') {
      // decoder reads: run followed by sentinel => bare. A collapsed run must
      // therefore never be followed by the sentinel.
      if (collapsed && nextCh === sentinel) return true;
      if (!collapsed && nextCh !== sentinel) return true; // would be wrongly restored
    } else {
      // decoder reads: run preceded by sentinel => collapsed. A bare run must
      // therefore never be preceded by the sentinel.
      if (!collapsed && prevCh === sentinel) return true;
      if (collapsed && prevCh !== sentinel) return true;
    }
  }
  return false;
}

/** Collapse one format, choosing and verifying the cheapest safe mode. */
function collapseFormat(text: string, fmt: PsephosFormat): { text: string; stats: PsephosFmtStats } {
  const probe = collapseWith(text, fmt, '', '');
  const nCollapsed = probe.spans.length;
  const stats: PsephosFmtStats = {
    name: fmt.name,
    mode: 'plain',
    collapsed: nCollapsed,
    bare: 0,
    skippedMerge: 0,
    sentinel: '',
    enabled: nCollapsed > 0,
  };
  if (!nCollapsed) return { text, stats };

  const bare = bareRuns(probe.text, fmt, probe.spans);
  stats.bare = bare.length;
  if (!bare.length) return { text: probe.text, stats };

  // escape costs one sentinel per bare run; mark costs one per collapsed number
  const order: PsephosMode[] = bare.length < nCollapsed ? ['escape', 'mark'] : ['mark', 'escape'];

  for (const mode of order) {
    for (const sentinel of PSEPHOS_SENTINEL_POOL) {
      if (mode === 'escape') {
        // mark the bare runs; collapsed items stay bare of markup
        let out = probe.text;
        for (let i = bare.length - 1; i >= 0; i--) {
          out = out.slice(0, bare[i].end) + sentinel + out.slice(bare[i].end);
        }
        if (sentinelLeaks(out, fmt, 'escape', sentinel, probe.spans)) continue;
        stats.mode = 'escape';
        stats.sentinel = sentinel;
        return { text: out, stats };
      }
      const mk = collapseWith(text, fmt, sentinel, '');
      if (sentinelLeaks(mk.text, fmt, 'mark', sentinel, mk.spans)) continue;
      stats.mode = 'mark';
      stats.sentinel = sentinel;
      return { text: mk.text, stats };
    }
  }
  // no safe sentinel for this format: skip it rather than risk corruption
  stats.enabled = false;
  stats.mode = 'plain';
  return { text, stats };
}

// ---------------------------------------------------------------- public fold

/** Collapse all formats. Returns the new wire plus per-format stats. */
export function psephosCollapse(
  text: string,
  formats: readonly PsephosFormat[] = PSEPHOS_FORMATS,
): { text: string; stats: PsephosStats } {
  let out = text;
  const stats: PsephosFmtStats[] = [];
  for (const fmt of formats) {
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

function fmtSeparator(fmt: PsephosFormat): (d: string) => string {
  if (fmt.name === 'date8') return (d) => `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
  return (d) => `${d.slice(0, 2)}:${d.slice(2, 4)}:${d.slice(4, 6)}`;
}

function uncollapseFormat(text: string, fmt: PsephosFormat, f: PsephosFmtStats): string {
  const sep = fmtSeparator(fmt);
  const runs = digitRuns(text).filter((r) => r.end - r.start === fmt.len);
  const edits: Array<{ at: number; del: number; ins: string }> = [];
  for (const r of runs) {
    const digits = text.slice(r.start, r.end);
    const prevCh = r.start > 0 ? text[r.start - 1] : undefined;
    const nextCh = r.end < text.length ? text[r.end] : undefined;
    if (f.mode === 'plain') {
      edits.push({ at: r.start, del: fmt.len, ins: sep(digits) });
    } else if (f.mode === 'escape') {
      if (nextCh === f.sentinel) continue; // bare run: decoder drops the sentinel
      edits.push({ at: r.start, del: fmt.len, ins: sep(digits) });
    } else {
      if (prevCh !== f.sentinel) continue; // bare run
      edits.push({ at: r.start - 1, del: fmt.len + 1, ins: sep(digits) });
    }
  }
  let out = '';
  let cur = 0;
  for (const e of edits) {
    if (e.at < cur) continue;
    out += text.slice(cur, e.at) + e.ins;
    cur = e.at + e.del;
  }
  out += text.slice(cur);
  if (f.mode === 'escape') out = out.split(f.sentinel).join('');
  return out;
}

/** Inverse of psephosCollapse. Deterministic; never sees the original text. */
export function psephosUncollapse(text: string, stats: PsephosStats): string {
  let out = text;
  for (let i = stats.formats.length - 1; i >= 0; i--) {
    const f = stats.formats[i];
    if (!f.enabled || !f.collapsed) continue;
    const fmt = PSEPHOS_FORMATS.find((x) => x.name === f.name);
    if (!fmt) continue;
    out = uncollapseFormat(out, fmt, f);
  }
  return out;
}

// ------------------------------------------------------------------ contract

/**
 * Build the decoder instruction. Kept deliberately terse: the clause is paid on
 * every single message, so verbosity here is a direct tax on the ratio.
 * Measured on o200k_base: 11 tokens for date8 alone, 13 for time6 alone,
 * 21 for both, +12 when a sentinel is needed.
 */
export function psephosContract(stats: PsephosStats): string {
  const on = stats.formats.filter((f) => f.enabled && f.collapsed > 0);
  if (!on.length) return '';
  const d = on.find((f) => f.name === 'date8');
  const t = on.find((f) => f.name === 'time6');
  let s: string;
  if (d && t) s = 'Numbers: expand 8 digits to YYYY-MM-DD and 6 digits to HH:MM:SS.';
  else if (d) s = 'Numbers: expand 8 digits to YYYY-MM-DD.';
  else s = 'Numbers: expand 6 digits to HH:MM:SS.';
  for (const f of on) {
    if (f.mode === 'escape') s += ` A ${f.sentinel} after digits means leave them; drop the ${f.sentinel}.`;
    if (f.mode === 'mark') s += ` A ${f.sentinel} before digits means expand them; drop the ${f.sentinel}.`;
  }
  return s;
}

// --------------------------------------------------------------------- wrap

export interface PsephosParent {
  name: string;
  run: (x: string) => { wire: string; contract: string };
  undo: (w: string) => string;
}

export interface PsephosDecodeConfig {
  stats: PsephosStats;
  undo: (w: string) => string;
  /** 'out' = collapse applied to the parent's wire; 'in' = collapse applied first. */
  order?: 'out' | 'in';
}

export interface PsephosResult {
  wire: string;
  contract: string;
  messageTokens: number;
  inTokens: number;
  parent: string;
  stats: PsephosStats;
  decodeConfig: PsephosDecodeConfig;
  notes: string;
}

/** Wrap a parent codec: collapse digits in its wire and extend its contract. */
export function psephosWrap(text: string, enc: any, parents: PsephosParent[]): PsephosResult {
  const inTokens = countTokens(text, enc);
  let best: PsephosResult | null = null;

  const consider = (cand: PsephosResult) => {
    if (!best || cand.messageTokens < best.messageTokens) best = cand;
  };

  for (const p of parents) {
    const pr = p.run(text);
    const parentWire = String(pr.wire);
    const parentCost = countTokens(parentWire, enc) + countTokens(pr.contract, enc);
    const EMPTY: PsephosStats = { formats: [], totalCollapsed: 0, totalBare: 0 };
    const passthrough = (stats: PsephosStats, note: string): PsephosResult => ({
      wire: parentWire,
      contract: pr.contract,
      messageTokens: parentCost,
      inTokens,
      parent: `${p.name}/none`,
      stats,
      decodeConfig: { stats: EMPTY, undo: p.undo },
      notes: note,
    });

    const considerOrder = (order: 'out' | 'in') => {
      let wireOut: string;
      let stats: PsephosStats;
      let baseContract: string;
      if (order === 'out') {
        // collapse the parent's wire; decode = parent(uncollapse(wire))
        const c = psephosCollapse(parentWire);
        if (!c.stats.totalCollapsed) return false;
        wireOut = c.text;
        stats = c.stats;
        baseContract = pr.contract;
      } else {
        // collapse first, then let the parent encode the collapsed text;
        // decode = uncollapse(parent(wire))
        const c = psephosCollapse(text);
        if (!c.stats.totalCollapsed) return false;
        stats = c.stats;
        const q = p.run(c.text);
        wireOut = String(q.wire);
        baseContract = String(q.contract);
      }
      const clause = psephosContract(stats);
      const contract = baseContract ? `${baseContract} ${clause}` : clause;
      const total = countTokens(wireOut, enc) + countTokens(contract, enc);

      // byte-exactness gate: decode the whole thing and compare to the original
      const decoded =
        order === 'out'
          ? p.undo(psephosUncollapse(wireOut, stats))
          : psephosUncollapse(p.undo(wireOut), stats);
      if (decoded !== text) return false;

      consider({
        wire: wireOut,
        contract,
        messageTokens: total,
        inTokens,
        parent: `${p.name}/${order}`,
        stats,
        decodeConfig: { stats, undo: p.undo, order },
        notes: `exact=true; collapsed=${stats.totalCollapsed}; bare=${stats.totalBare}; modes=[${stats.formats
          .map((f) => `${f.name}:${f.mode}${f.sentinel ? '/' + f.sentinel : ''}`)
          .join(' ')}]`,
      });
      return true;
    };

    // The uncollapsed parent is ALWAYS a candidate. It must be, otherwise a lane
    // where the collapse is worth less than its own contract clause would ship a
    // regression simply because something collapsed successfully.
    consider(passthrough(EMPTY, 'parent alone; no collapse shipped'));
    for (const order of ['out', 'in'] as const) considerOrder(order);
  }
  return best!;
}

// The identity parent carries an EMPTY contract, matching the convention the
// frontier already uses (LEXIS and STOICHOS both report contractTok 0 for it):
// if nothing is transformed there is nothing to instruct, and charging 7 tokens
// for "print the text exactly as given" would invent a regression on the short
// lanes. When a collapse does ship on identity the clause alone is the contract.
const IDENTITY_PARENT: PsephosParent = {
  name: 'identity',
  run: (x) => ({ wire: x, contract: '' }),
  undo: (w) => w,
};

export function psephosParents(enc: any): PsephosParent[] {
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

export function psephosEncode(text: string, enc: any, parents?: PsephosParent[]): PsephosResult {
  return psephosWrap(text, enc, parents ?? psephosParents(enc));
}

export interface PsephosDecodeOpts {
  stats?: PsephosStats;
  undo?: (w: string) => string;
  order?: 'out' | 'in';
}

export function psephosDecode(wire: string, opts: PsephosDecodeOpts = {}): string {
  const order = opts.order ?? 'out';
  const undo = opts.undo ?? ((w: string) => w);
  if (order === 'out') return undo(opts.stats ? psephosUncollapse(wire, opts.stats) : wire);
  return opts.stats ? psephosUncollapse(undo(wire), opts.stats) : undo(wire);
}

export const PSEPHOS_BUDGET_NOTE =
  'time-bound: one linear pass per format, O(n) each; no search, no sampling, no backtracking.';
