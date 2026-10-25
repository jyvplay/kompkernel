/**
 * ΤΥΠΟΣ (TYPOS) — "the mold, the stamp, the impression". X41.
 * =============================================================================
 * THE GAP, IN THE STACK'S OWN TERMS
 * =============================================================================
 * APOGRAPHE and METRON make a record set cheap by refusing to write a column the
 * header determines. They need one thing real output rarely provides: a single
 * character field separator. That is why X39 measured them as refusing
 * `kubectl get`, `df -h`, `ps`, `ls -l`, `journalctl` and every application log
 * in the corpus — the shapes that dominate ops work.
 *
 * The other codec in this repository that handles such text, HYLE's table fold,
 * removes a table's padding but still needs a separator, and — like every
 * dictionary codec — it pays a GLYPH PER LITERAL BLOCK PER LINE for ever: the
 * skeleton of a log line goes into the tape once and is then referenced once per
 * line, on every line, at one token a reference.
 *
 * TYPOS removes both requirements with one mechanism:
 *
 *   TRANSMIT THE SKELETON ONCE AS A MASK, AND PUT THE FIELD BOUNDARIES IN THE
 *   MASK INSTEAD OF IN A SEPARATOR.
 *
 * A mask is a list of literal blocks L0 … Lk. Every line of the family is
 *
 *        L0 v0 L1 v1 … Lk
 *
 * and the wire stores only the v's, as a record set: the row's values, joined by
 * a separator character that does not occur in the source, each row terminated
 * by that character. The reader splits a row, puts v0 … vk back between the
 * literals, and has the line back. Not one literal block is written on a data
 * line: on a log line with eight constant blocks and three varying fields the
 * parent pays eight glyphs per line and TYPOS pays three separators.
 *
 * WHY THIS IS A DIFFERENT MECHANISM, NOT A RENAME
 * =============================================================================
 * (i)   The mask is INDUCED from the data by recursive common-prefix/suffix
 *       block induction, so the skeleton is discovered.
 * (ii)  Field boundaries come from the mask, so the source needs no separator —
 *       the case APOGRAPHE cannot reach at all.
 * (iii) The row encoding is exactly one declared character per value, with the
 *       row marked by the same character at its end, so a literal line is never
 *       mistaken for a row and no arity bookkeeping is required. The separator
 *       is required to be ABSENT from the source, which makes both of those
 *       statements true by construction rather than by measurement.
 * (iv)  Columns may be absolute ramps (`lin:V/at,s`, METRON's grammar: the sample
 *       is the format, the anchor is a real row's value). There is NO carried
 *       state: a row is a function of the mask, the ramp and its own index.
 * (v)   The mask is over a CLUSTER of lines that already agree on their layout
 *       signature (cell count and space widths). TYPOS therefore never spends a
 *       token regenerating padding — measured in this turn, padding removal is
 *       worth 469 raw tokens on ps-aux-real but only 49 tokens of the shipped
 *       message, because the parent's dictionary already represents a repeated
 *       space run as one rule plus one glyph per line. TYPOS goes after the
 *       blocks, which the parent pays per line and cannot amortise.
 *
 * EXACTNESS
 * =============================================================================
 * The encoder RUNS THE DECODER on its own wire and refuses the plan unless the
 * result is byte-identical, and it independently checks that the separator does
 * not occur in the source and that no literal line ends with it. There is no
 * probability model anywhere in the transform: the wire states the whole
 * reconstruction and the reader executes it.
 *
 * NEGATIVE SPACE (measured or argued; see bench/x41/X41.md §8)
 * =============================================================================
 * · Prose: no skeleton, no cluster, the plan is refused.
 * · Space-aligned tables: the space widths are part of the cluster signature, so
 *   rows whose padding disagrees with their cluster are literal. Regenerating the
 *   padding instead was measured and is NOT worth it (49 tokens on ps-aux-real).
 * · A mask over lines with one slot and no literal is a wash and is refused.
 * · Column values that carry the separator are impossible by construction (the
 *   separator must be absent from the source), which is why no escaping is
 *   needed and no value can ever be split.
 *
 * RELATED WORK, HONESTLY
 * =============================================================================
 * Log-template induction is Drain (He, Zhu, He, Lyu, ICSE 2017) and the LogPAI
 * toolkit; parameter-column log compression is surveyed by Landauer et al., "A
 * Critical Review of Log File Compression Approaches" (2023). Sequence alignment
 * for common blocks is Smith–Waterman (1981). Front coding of sorted keys is
 * classical (FM-index line, Ferragina–Manzini 2000). CHIRON's `×` repeat/fill is
 * the nearest relative in this repository and cannot do this: `×` repeats one
 * earlier rule and fills ONE character per copy, so it cannot express "eight
 * literal blocks with three independently varying fields between them".
 * I did not find a prior system that transmits an induced mask as an ALLOCATION
 * (literals once, boundaries from the mask, columns lifted with zero per-row
 * cost) inside a byte-exact, tool-free, single-message wire; I do not claim none
 * exists.
 *
 * GREEDY: yes, with an exact gate. Cluster, mask and ramp declarations are chosen
 * greedily against a token proxy; the transform ships only if the measured
 * one-chat message beats the parent's and the decoder reproduces the input. A bad
 * greedy choice can cost tokens, never exactness.
 *
 * TIME/CPU BOUND: induction is O(k·n·m) character comparisons over the family
 * (n lines, m characters, k recursion depth ≤ 24); ramp fitting is linear per
 * column; the only expensive step is one extra parent encode of the transformed
 * text, which is smaller than the source wherever the codec fires.
 */

import { countTokens, type EncodingName } from './bpe';
import { ouraEncode } from './oura';
import {
  parseNumTemplate, renderNumTemplate, sameNumTemplate, type NumTemplate,
} from './apographe';

const OPEN = '⟨';   // U+27E8
const CLOSE = '⟩';  // U+27E9
const DELIMS = ['¦', '␟', '‖', '⁞', '·', '‡'];
/** Separator candidates, in preference order. Every one is a single exotic code
 *  point: it costs about one token, and it is only used when absent from the
 *  source, which is what makes the row/literal distinction exact. */
const SEPS = ['␟', '¦', '‖', '⁞', '·', '‡', '§', '¤'];

const MIN_ROWS = 6;

export type TyposModel = { kind: 'lin'; t: NumTemplate; v: number; at: number; s: number };

export interface TyposPlan {
  lits: string[];
  sep: string;
  delim: string;
  models: Map<number, TyposModel>;
  header: string;
  rowCount: number;
  literalCount: number;
  proxyGain: number;
}

export interface TyposResult {
  wire: string;
  contract: string;
  messageTokens: number;
  inTokens: number;
  typos: boolean;
  typosHeader: string;
  typosModels: string;
  typosRows: number;
  typosLiterals: number;
  notes: string;
}

/**
 * RAW line split. `\r` is NOT stripped and a trailing newline is NOT dropped:
 * the transform has to be a bijection on the whole text, so every byte lives
 * either in a line body or in the newline that joins it. (An earlier build
 * stripped both and silently lost a final newline and every CR — caught by the
 * self-decode check, not by the test suite, which is exactly why the check runs
 * before anything is measured.)
 */
function rawLines(text: string): string[] {
  return text.split('\n');
}

function commonPrefixAll(strs: string[]): number {
  if (!strs.length) return 0;
  let k = 0;
  const first = strs[0];
  outer: for (; k < first.length; k++) {
    for (let i = 1; i < strs.length; i++) {
      if (strs[i].length <= k || strs[i][k] !== first[k]) break outer;
    }
  }
  return k;
}

function commonSuffixAll(strs: string[], maxLen: number): number {
  if (!strs.length) return 0;
  let k = 0;
  const first = strs[0];
  const lim = Math.min(maxLen, ...strs.map((s) => s.length));
  outer: for (; k < lim; k++) {
    const ch = first[first.length - 1 - k];
    for (let i = 1; i < strs.length; i++) {
      const s = strs[i];
      if (s[s.length - 1 - k] !== ch) break outer;
    }
  }
  return k;
}

type Part = { lit: string } | { slot: string[] };

/** Longest common substring of two strings, via one rolling DP row. */
function lcs(a: string, b: string): string {
  if (!a.length || !b.length) return '';
  let prev = new Int32Array(b.length + 1);
  let cur = new Int32Array(b.length + 1);
  let best = 0, bestEnd = 0;
  for (let i = 1; i <= a.length; i++) {
    const ai = a.charCodeAt(i - 1);
    for (let j = 1; j <= b.length; j++) {
      if (ai === b.charCodeAt(j - 1)) {
        const v = prev[j - 1] + 1;
        cur[j] = v;
        if (v > best) { best = v; bestEnd = i; }
      } else cur[j] = 0;
    }
    const t = prev; prev = cur; cur = t;
  }
  return best ? a.slice(bestEnd - best, bestEnd) : '';
}

/** A substring present in EVERY string, shrunk monotonically until it is. */
function commonInterior(strs: string[]): string {
  if (strs.length < 2) return '';
  let cand = lcs(strs[0], strs[1]);
  for (let i = 2; i < strs.length && cand.length; i++) {
    if (strs[i].includes(cand)) continue;
    cand = lcs(cand, strs[i]);
  }
  return cand;
}

const MIN_LIT = 3;
const MAX_LITS = 64;
const MAX_DEPTH = 14;

/**
 * RECURSIVE BLOCK INDUCTION. A region whose strings are all identical is a
 * LITERAL, not a slot: a slot with one distinct value costs a separator per row
 * for nothing. Otherwise the region is split around its longest common interior
 * block, which is what finds a log line's skeleton *between* two varying fields
 * (` 25746 INFO nova.osapi_compute.wsgi.server [req-` sits between the
 * timestamp and the request id). If no block is long enough to be worth a
 * literal, the region is a slot; prefix/suffix splitting is the fallback for
 * constants that touch a boundary.
 */
function induce(strs: string[], budget: { lits: number }, depth = 0): Part[] {
  if (!strs.length) return [{ lit: '' }];
  if (strs.every((s) => s === strs[0])) return [{ lit: strs[0] }];
  if (depth >= MAX_DEPTH || budget.lits >= MAX_LITS) return [{ slot: strs }];
  const cand = commonInterior(strs);
  if (cand.length >= MIN_LIT) {
    const lefts: string[] = [];
    const rights: string[] = [];
    for (const s of strs) {
      const at = s.indexOf(cand);
      lefts.push(s.slice(0, at));
      rights.push(s.slice(at + cand.length));
    }
    budget.lits++;
    const out: Part[] = [];
    out.push(...induce(lefts, budget, depth + 1));
    out.push({ lit: cand });
    out.push(...induce(rights, budget, depth + 1));
    return out;
  }
  // boundary fallback
  const p = commonPrefixAll(strs);
  const s2 = commonSuffixAll(strs, Math.min(...strs.map((x) => x.length)) - p);
  if (p === 0 && s2 === 0) return [{ slot: strs }];
  const middles = strs.map((x) => x.slice(p, x.length - s2));
  budget.lits += (p ? 1 : 0) + (s2 ? 1 : 0);
  const out: Part[] = [];
  if (p) out.push({ lit: strs[0].slice(0, p) });
  out.push(...induce(middles, budget, depth + 1));
  if (s2) out.push({ lit: strs[0].slice(strs[0].length - s2) });
  return out;
}

/**
 * Split a line by the mask, greedily, left to right. Encoder and decoder call
 * THIS SAME function, so exactness never depends on the split being unique.
 */
export function typosSplit(line: string, lits: string[]): string[] | null {
  const k = lits.length - 1;
  if (!line.startsWith(lits[0])) return null;
  const vals: string[] = [];
  let pos = lits[0].length;
  for (let i = 1; i <= k; i++) {
    const lit = lits[i];
    if (i === k) {
      if (!line.endsWith(lit)) return null;
      const end = line.length - lit.length;
      if (end < pos) return null;
      vals.push(line.slice(pos, end));
      pos = line.length;
      break;
    }
    const idx = lit.length ? line.indexOf(lit, pos) : pos;
    if (idx < 0) return null;
    vals.push(line.slice(pos, idx));
    pos = idx + lit.length;
  }
  return vals.length === k && pos === line.length ? vals : null;
}

function joinRow(lits: string[], vals: string[]): string {
  let s = lits[0];
  for (let i = 0; i < vals.length; i++) s += vals[i] + lits[i + 1];
  return s;
}

/** Induced mask for a line cluster, or null when the mask is not worth having. */
function maskFor(cluster: string[]): { lits: string[]; values: string[][] } | null {
  if (cluster.length < MIN_ROWS) return null;
  const parts = induce(cluster, { lits: 0 });
  const lits: string[] = [];
  const slotAt: number[] = [];
  let pending = '';
  for (const p of parts) {
    if ('lit' in p) pending += p.lit;
    else { lits.push(pending); pending = ''; slotAt.push(lits.length - 1); }
  }
  lits.push(pending);
  const k = lits.length - 1;
  if (k < 1 || k > 96) return null;
  // a mask of one slot with no literal is not a skeleton, it is the text
  if (lits.every((l) => l.length === 0)) return null;
  const values: string[][] = [];
  for (const line of cluster) {
    const v = typosSplit(line, lits);
    if (!v || v.length !== k) return null;
    values.push(v);
  }
  return { lits, values };
}

export function cellSignature(s: string): string {
  const cells = s.match(/\S+| +/g) ?? [];
  let sig = '';
  let words = 0;
  for (const c of cells) {
    if (c[0] === ' ') sig += 's' + c.length + ',';
    else { sig += 'w,'; words++; }
  }
  return words + '|' + sig;
}

function largestGroup(lines: string[], key: (s: string) => string): string[] {
  const g = new Map<string, string[]>();
  for (const l of lines) {
    if (!l.length) continue;
    const k = key(l);
    const cur = g.get(k);
    if (cur) cur.push(l); else g.set(k, [l]);
  }
  let best: string[] = [];
  for (const v of g.values()) if (v.length > best.length) best = v;
  return best;
}

function runsOf(pat: string): string {
  const out: string[] = [];
  let i = 0;
  while (i < pat.length) {
    const c = pat[i];
    let j = i;
    while (j < pat.length && pat[j] === c) j++;
    out.push(c + String(j - i));
    i = j;
  }
  return out.join('');
}

/** Inverse of runsOf: "R6L3R2" -> "RRRRRRLLLRR". `null` on a malformed run. */
function expandRuns(r: string): string | null {
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

/**
 * THE COLUMNAR BODY.
 *
 * A row-major body pays one separator per cell boundary per row. A columnar body
 * pays *nothing* per cell: each of the (k − L) unlifted columns is ONE line whose
 * values are joined by a single character, and the values of a column are, by
 * construction, the value of the same mask slot on consecutive rows — a
 * homogeneous sequence, which is exactly the shape the parent's dictionary and
 * its run-length block were built to exploit (a constant column becomes one
 * repetition, not fifteen glyph references). De-interleaving is the mechanism;
 * the mask is what makes de-interleaving sound, because a "column" here is a
 * mask slot, not a position in a padded table.
 *
 * The body is therefore: (k − L) column lines, then every literal line in source
 * order. The header carries `p<runs>`, an RLE of the row/literal pattern, so the
 * reader knows where the rows go back. That is a few tokens once, whatever the
 * row count.
 */
function buildBody(
  lines: string[], pat: string, lits: string[], k: number,
  models: Map<number, TyposModel>, sep: string, values: Map<string, string[]>,
): string[] {
  const out: string[] = [];
  const cols: number[] = [];
  for (let c = 0; c < k; c++) if (!models.has(c)) cols.push(c);
  for (const c of cols) {
    const vs: string[] = [];
    for (const line of lines) {
      const v = typosSplit(line, lits);
      if (v && v.length === k) vs.push(v[c]);
    }
    out.push(vs.join(sep));
  }
  for (let i = 0; i < lines.length; i++) if (pat[i] === 'L') out.push(lines[i]);
  return out;
}

function patternOf(lines: string[], lits: string[], k: number): string {
  let pat = '';
  for (const line of lines) {
    const v = line.length ? typosSplit(line, lits) : null;
    pat += v && v.length === k ? 'R' : 'L';
  }
  return pat;
}

/** Decode: header line, then (k − L) column lines, then the literal lines. */
export function typosDecode(wire: string): string {
  if (!wire.startsWith(OPEN)) return wire;
  const nl = wire.indexOf('\n');
  const head = nl < 0 ? wire : wire.slice(0, nl);
  const rest = nl < 0 ? '' : wire.slice(nl + 1);
  const close = head.indexOf(CLOSE);
  if (close < 0) return wire;
  const inner = head.slice(OPEN.length, close);
  // The delimiter is the FIRST character after the closing bracket, never "the
  // first candidate that appears somewhere in the mask": a mask literal may
  // itself contain a delimiter candidate (a path listing's `␟`-separated cells
  // are exactly that), and guessing wrong splits the mask in the wrong place.
  const delim = head[close + 1];
  if (!delim || !DELIMS.includes(delim)) return wire;
  const lits = inner.split(delim);
  const k = lits.length - 1;
  if (k < 1) return wire;
  const segs = head.slice(close + 1).split(delim).filter((x, i) => !(i === 0 && x === ''));
  let sep: string | null = null;
  let pat = '';
  const models = new Map<number, TyposModel>();
  for (const seg of segs) {
    if (seg.startsWith('@')) {
      const eq = seg.indexOf('=');
      if (eq < 0) return wire;
      const col = Number(seg.slice(1, eq));
      const spec = seg.slice(eq + 1);
      if (!Number.isInteger(col) || col < 0 || col >= k) return wire;
      if (!spec.startsWith('lin:')) return wire;
      const body = spec.slice(4);
      const cut = body.lastIndexOf(',');
      const slash = body.lastIndexOf('/', cut);
      if (cut < 0 || slash < 0) return wire;
      const sample = body.slice(0, slash);
      const at = Number(body.slice(slash + 1, cut));
      const step = Number(body.slice(cut + 1));
      const pnum = parseNumTemplate(sample);
      if (!pnum || !Number.isSafeInteger(at) || !Number.isSafeInteger(step)) return wire;
      if (renderNumTemplate(pnum.t, pnum.v) !== sample) return wire;
      models.set(col, { kind: 'lin', t: pnum.t, v: pnum.v, at, s: step });
    } else if (seg.startsWith('s') && seg.length === 2) {
      sep = seg[1];
    } else if (seg.startsWith('p')) {
      pat = seg.slice(1);
    } else return wire;
  }
  if (sep === null || !pat.length) return wire;
  const expanded = expandRuns(pat);
  if (expanded === null) return wire;
  pat = expanded;
  const bodyLines = rest.length ? rest.split('\n') : [];
  const cols: number[] = [];
  for (let c = 0; c < k; c++) if (!models.has(c)) cols.push(c);
  const colValues: string[][] = [];
  let bi = 0;
  let rows = 0;
  for (const ch of pat) if (ch === 'R') rows++;
  for (let i = 0; i < cols.length; i++) {
    if (bi >= bodyLines.length) return wire;
    const vs = bodyLines[bi++].split(sep);
    if (vs.length !== rows) return wire;
    colValues.push(vs);
  }
  const literals = bodyLines.slice(bi);
  const out: string[] = [];
  let li = 0;
  let r = 0;
  let ci = 0;
  for (const ch of pat) {
    if (ch === 'L') {
      if (li >= literals.length) return wire;
      out.push(literals[li++]);
      continue;
    }
    const vals: string[] = new Array(k);
    let cj = 0;
    let bad = false;
    for (let c = 0; c < k; c++) {
      const m = models.get(c);
      if (!m) { vals[c] = colValues[cj++][r]; continue; }
      const got = renderNumTemplate(m.t, m.v + m.s * (r - m.at));
      if (got === null) { bad = true; break; }
      vals[c] = got;
    }
    if (bad) return wire;
    out.push(joinRow(lits, vals));
    r++;
    ci = cj;
  }
  if (li !== literals.length) return wire;
  return out.join('\n');
}

function clauseCost(cl: string, enc: EncodingName): number {
  return countTokens(' ' + cl + '; print only.', enc) - countTokens('; print only.', enc);
}

const CLAUSES = [
  'mask: each data line is L0 v0 L1 v1 .. Lk; rows list the v\'s and end with ␟; other lines literal. @i=lin:V/at,s = V+(row-at)s like V',
  'lines rebuild as L0 v0 L1 v1 .. Lk from rows that end with ␟; others literal. @i=lin:V/at,s is V+(row-at)*s in V\'s form',
];

function buildPlan(text: string, cluster: string[], enc: EncodingName): TyposPlan | null {
  const mask = maskFor(cluster);
  if (!mask) return null;
  const { lits, values } = mask;
  const k = lits.length - 1;
  // separator: must be absent from the whole source, or the marker is ambiguous
  const sep = SEPS.find((s) => !text.includes(s));
  if (!sep) return null;
  const delim = DELIMS.find((d) => !lits.join('').includes(d) && d !== sep) ?? null;
  if (!delim) return null;

  // ramp candidates: exact integer arithmetic progression over the ROW index
  const cand: Array<{ col: number; m: TyposModel }> = [];
  for (let c = 0; c < k; c++) {
    const vs = values.map((v) => v[c]);
    let t: NumTemplate | null = null;
    const pts: Array<{ i: number; v: number }> = [];
    let ok = true;
    for (let i = 0; i < vs.length; i++) {
      const p = parseNumTemplate(vs[i]);
      if (!p || renderNumTemplate(p.t, p.v) !== vs[i]) { ok = false; break; }
      if (t === null) t = p.t;
      else if (!sameNumTemplate(t, p.t)) { ok = false; break; }
      pts.push({ i, v: p.v });
    }
    if (!ok || !t || pts.length < MIN_ROWS) continue;
    const num = pts[1].v - pts[0].v;
    if (num === 0 || !Number.isSafeInteger(num)) continue;
    if (!pts.every((p) => pts[0].v + num * (p.i - pts[0].i) === p.v)) continue;
    cand.push({ col: c, m: { kind: 'lin', t, v: pts[0].v, at: pts[0].i, s: num } });
  }

  const lines = rawLines(text);
  const pat = patternOf(lines, lits, k);
  const render = (models: Map<number, TyposModel>) => {
    let h = OPEN + lits.join(delim) + CLOSE + delim + 's' + sep;
    for (const c of [...models.keys()].sort((a, b) => a - b)) {
      const m = models.get(c)!;
      h += delim + '@' + c + '=lin:' + renderNumTemplate(m.t, m.v)! + '/' + m.at + ',' + m.s;
    }
    h += delim + 'p' + runsOf(pat);
    return h;
  };

  const bodyOf = (models: Map<number, TyposModel>): string[] =>
    buildBody(lines, pat, lits, k, models, sep, new Map());

  const clause = CLAUSES[0];
  const cCost = clauseCost(clause, enc);
  // The comparison that matters is against the SOURCE, not against the mask:
  // the mask's own contribution is that the skeleton stops being written once
  // per line, and that is invisible if the base case is the mask itself.
  const sourceCost = countTokens(text, enc) + cCost;
  const score = (models: Map<number, TyposModel>, body: string[]): number =>
    countTokens(render(models) + '\n' + body.join('\n'), enc) + cCost;

  let chosen = new Map<number, TyposModel>();
  let body = bodyOf(chosen);
  let bestScore = score(chosen, body);
  let improved = true;
  while (improved) {
    improved = false;
    let bestAdd: { col: number; m: TyposModel } | null = null;
    let bestTrial = bestScore;
    let bestBody: string[] | null = null;
    for (const c of cand) {
      if (chosen.has(c.col)) continue;
      const trial = new Map(chosen);
      trial.set(c.col, c.m);
      const tb = bodyOf(trial);
      const sc = score(trial, tb);
      if (sc < bestTrial) { bestTrial = sc; bestAdd = c; bestBody = tb; }
    }
    if (bestAdd && bestBody) {
      chosen.set(bestAdd.col, bestAdd.m);
      body = bestBody;
      bestScore = bestTrial;
      improved = true;
    }
  }
  if (bestScore >= sourceCost) return null;
  return {
    lits, sep, delim, models: chosen, header: render(chosen),
    rowCount: cluster.length,
    literalCount: rawLines(text).length - cluster.length,
    proxyGain: sourceCost - bestScore,
  };
}

export function typosPlan(text: string, enc: EncodingName = 'o200k_base'): TyposPlan | null {
  if (!text.length || text.length > 400_000) return null;
  const lines = rawLines(text);
  if (lines.length < MIN_ROWS + 1) return null;
  if (lines[0].startsWith(OPEN)) return null;
  const raw = lines.filter((s) => s.length);
  const families: string[][] = [
    raw,
    largestGroup(raw, cellSignature),
    largestGroup(raw, (s) => String((s.match(/\S+/g) ?? []).length)),
  ];
  let best: TyposPlan | null = null;
  for (const fam of families) {
    if (fam.length < MIN_ROWS) continue;
    let p: TyposPlan | null = null;
    try { p = buildPlan(text, fam, enc); } catch { p = null; }
    if (p && (!best || p.proxyGain > best.proxyGain)) best = p;
  }
  return best;
}

/** The transformed text a plan implies (header line, then every source line in
 *  order with rows rewritten). Exported for the receipts and the red team. */
export function typosTransform(text: string, plan: TyposPlan): string {
  const lines = rawLines(text);
  const k = plan.lits.length - 1;
  const pat = patternOf(lines, plan.lits, k);
  return plan.header + '\n' + buildBody(lines, pat, plan.lits, k, plan.models, plan.sep, new Map()).join('\n');
}

export function typosEncode(
  text: string, enc: EncodingName = 'o200k_base', opts: { typos?: boolean } = {},
): TyposResult {
  const parent = ouraEncode(text, enc, opts as any) as any;
  const plain: TyposResult = {
    wire: parent.wire, contract: parent.contract, messageTokens: parent.messageTokens,
    inTokens: countTokens(text, enc), typos: false, typosHeader: '', typosModels: '',
    typosRows: 0, typosLiterals: 0, notes: 'typos off',
  };
  if (opts.typos === false) return plain;
  let plan: TyposPlan | null = null;
  try { plan = typosPlan(text, enc); } catch { plan = null; }
  if (!plan || plan.proxyGain <= 0) return plain;

  const transformed = typosTransform(text, plan);
  // SOUNDNESS BEFORE MEASUREMENT
  if (typosDecode(transformed) !== text) return plain;

  let clause = CLAUSES[0];
  let bestClause = Infinity;
  for (const cl of CLAUSES) {
    const c = clauseCost(cl, enc);
    if (c < bestClause) { bestClause = c; clause = cl; }
  }

  let alt: any;
  try { alt = ouraEncode(transformed, enc, opts as any); } catch { return plain; }
  const tail = '; print only.';
  const total = alt.messageTokens + countTokens(' ' + clause + tail, enc) - countTokens(tail, enc);
  if (total >= parent.messageTokens) return plain;

  return {
    wire: alt.wire,
    contract: alt.contract ? alt.contract.replace(/; print only\.$/, ` ${clause} print only.`) : clause,
    messageTokens: total,
    inTokens: countTokens(text, enc),
    typos: true,
    typosHeader: plan.header,
    typosModels: [...plan.models.entries()].sort((a, b) => a[0] - b[0]).map(([c, m]) => `${c + 1}:${m.kind}`).join(','),
    typosRows: plan.rowCount,
    typosLiterals: plan.literalCount,
    notes: `rows=${plan.rowCount} literals=${plan.literalCount} slots=${plan.lits.length - 1} gainProxy=${plan.proxyGain}`,
  };
}
