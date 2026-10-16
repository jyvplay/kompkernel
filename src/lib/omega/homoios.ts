/**
 * src/lib/omega/homoios.ts
 * =============================================================================
 * HOMOIOS (X16): near-duplicate blocks as ordered word edits against an earlier
 * block, inside a DAEDALUS-D message. Byte-exact. Wire form [i|a=b|c=d] and [i].
 *
 * WHAT IT IS (mechanism)
 * -----------------------------------------------------------------------------
 * Real text repeats templates: a status report that is pasted eight times with
 * three numbers changed, a list of log blocks that differ in one field, a quoted
 * reply with one edit. The dictionary and merge codecs (DAEDALUS, the glyph
 * rules) reuse repeated RUNS. They pay for each run's glyph plus the varying
 * fields, and they do not state that a whole block equals an earlier block up
 * to a few replacements. HOMOIOS does: a block is split from its nearest earlier
 * block (by a word-level diff), and written as
 *
 *     [i|a=b|c=d]      block i with the ordered replacements a=b, c=d
 *     [i]              block i unchanged
 *
 * Blocks are the runs between blank lines. The reader rebuilds a block by a
 * forward scan: from a cursor (starting at 0 in block i), each a is searched
 * for at or after the cursor, the text in between is copied, a is replaced by b,
 * and the cursor moves past a. The forward scan is the whole rule.
 *
 * WHAT IS NOT NEW (honest)
 * -----------------------------------------------------------------------------
 * This is the textbook differencing idea: a COPY/ADD edit script against a
 * reference, as in VCDIFF (RFC 3284, Korn and Vo, 2002) and the diff/patch
 * family (Myers, 1986, O(ND) difference algorithm). It is not new to the
 * literature. What is internal here: the wire is a one-chat, LLM-readable
 * instruction with a forward-scan rule and no offsets, the blocks are the
 * blank-line units of prose and ops text, and the edit list is priced in o200k
 * tokens (an edit is kept only if its tokens are cheaper than the literal block).
 *
 * CONTRACT (the reader's rule, in band)
 * -----------------------------------------------------------------------------
 *   [i|a=b]: paragraph i with each a replaced by b, applied in order; each a is the next
 *   occurrence after the previous replacement. [i]: paragraph i unchanged.
 *   Blocks are numbered from 1 in order; they are the runs separated by blank lines.
 *
 * ENCODER RULES
 * -----------------------------------------------------------------------------
 *   - Refuse (identity) if a literal block already has the wire form (e.g. a block "[2]").
 *   - For block j, candidates are earlier non-empty blocks i with the best word
 *     3-gram Jaccard (top 3). For each candidate, a word-level LCS diff gives
 *     ordered edits. Each edit is anchored so its first forward occurrence is the
 *     intended one (the anchor is extended to the left until it is unique after
 *     the cursor). The edits are checked by the reader's own forward scan.
 *   - The block is substituted only if the wire block is cheaper in o200k tokens
 *     than the literal block, and the wire block contains no blank-line separator.
 *
 * READER: the one-chat message says which arm it is. The edits arm carries the HOMOIOS line;
 * the identity arm is plain DAEDALUS-D and must not run the block rule (homoiosRead).
 *
 * GATES (encoder; every failure returns the identity arm = DAEDALUS-D plain)
 * -----------------------------------------------------------------------------
 *   G0  the marker characters [ ] | = are not glyphs of any CHIRON script
 *   G1  homoiosExpand(substituted) === input          (exact, TypeScript)
 *   G2  DAEDALUS-D round trip on the substituted text
 *   G3  one-chat M (HOMOIOS contract + DAEDALUS-D message) < identity M
 *   G4  homoiosDecode(wire) === input                 (end to end, the reader's own path)
 * =============================================================================
 */
import { countTokens, type EncodingName } from './bpe';
import { daedalusDecode } from './daedalus';
import { daedalusDualEncode, type DaedalusDualResult } from './daedalus-dual';
import { CHIRON_SCRIPTS, chironInScript } from './chiron';

export const HOMOIOS_OPEN = '[';
export const HOMOIOS_CLOSE = ']';
export const HOMOIOS_ARROW = '=';   // separates a from b inside one edit
export const HOMOIOS_BAR = '|';      // separates edits

/** The decoder rule, as the sentence the reader must follow. */
export const HOMOIOS_CONTRACT =
  '[i|a=b] = paragraph i with each a replaced by b, in order; each a is the next occurrence after the previous one. [i] = paragraph i. Paragraphs are numbered from 1.';

// A block separator: one newline, then one or more blank lines (exact text is kept).
const BLOCK_SEP = /(\n[ \t]*\n(?:[ \t]*\n)*)/;
const WORD_TOKEN = /\s+|\S+/g;
const WIRE_BLOCK = /^\[(\d+)((?:\|[^|=\[\]]*=[^|=\[\]]*)*)\]$/;
const MAX_CELLS = 4_000_000;

/** Split text into alternating [block, sep, block, ..., block] parts (exact). */
export function homoiosSplit(text: string): { blocks: string[]; seps: string[] } {
  const parts = text.split(BLOCK_SEP);
  const blocks: string[] = [];
  const seps: string[] = [];
  for (let k = 0; k < parts.length; k++) {
    if (k % 2 === 0) blocks.push(parts[k]);
    else seps.push(parts[k]);
  }
  return { blocks, seps };
}

function joinBlocks(blocks: string[], seps: string[]): string {
  let s = blocks[0] ?? '';
  for (let k = 1; k < blocks.length; k++) s += seps[k - 1] + blocks[k];
  return s;
}

/** The reader's forward scan: rebuild a block from its reference and ordered edits. */
export function homoiosApply(ref: string, edits: Array<[string, string]>): string {
  let out = '';
  let cur = 0;
  for (const [a, b] of edits) {
    if (a.length === 0) throw new Error('homoios: empty a');
    const idx = ref.indexOf(a, cur);
    if (idx < 0) throw new Error('homoios: a not found after cursor');
    out += ref.slice(cur, idx) + b;
    cur = idx + a.length;
  }
  return out + ref.slice(cur);
}

/** Word-level token boundaries of a string (offsets of each token start, plus the end). */
function tokenize(s: string): { tok: string[]; start: number[] } {
  const tok: string[] = [];
  const start: number[] = [];
  for (const m of s.matchAll(WORD_TOKEN)) {
    tok.push(m[0]);
    start.push(m.index ?? 0);
  }
  return { tok, start };
}

/**
 * Ordered edits that turn `ref` into `target`, each anchored so the reader's forward scan
 * lands on the intended occurrence. Returns null if no exact anchored script is found.
 */
export function homoiosDiff(ref: string, target: string): Array<[string, string]> | null {
  const A = tokenize(ref);
  const B = tokenize(target);
  const n = A.tok.length, m = B.tok.length;
  if (n === 0 || m === 0 || n * m > MAX_CELLS) return null;
  // LCS table over token strings.
  const W = m + 1;
  const dp = new Uint32Array((n + 1) * W);
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i * W + j] = A.tok[i] === B.tok[j]
        ? dp[(i + 1) * W + j + 1] + 1
        : Math.max(dp[(i + 1) * W + j], dp[i * W + j + 1]);
    }
  }
  // Walk the alignment; collect changed regions as (refStart, refEnd, newText).
  type Region = { rs: number; re: number; nt: string };
  const regions: Region[] = [];
  let i = 0, j = 0;
  let cur: Region | null = null;
  const refOff = (k: number) => (k < n ? A.start[k] : ref.length);
  while (i < n || j < m) {
    if (i < n && j < m && A.tok[i] === B.tok[j]) {
      if (cur) { regions.push(cur); cur = null; }
      i++; j++;
    } else {
      if (!cur) cur = { rs: refOff(i), re: refOff(i), nt: '' };
      if (j < m && (i >= n || dp[i * W + j + 1] >= dp[(i + 1) * W + j])) {
        cur.nt += B.tok[j]; j++;
      } else {
        i++; cur.re = refOff(i);
      }
    }
  }
  if (cur) regions.push(cur);
  if (regions.length === 0) return [];
  // Turn regions into anchored edits. An insertion (rs === re) is anchored on a neighbouring token.
  const edits: Array<{ s: number; e: number; b: string }> = [];
  for (const r of regions) {
    let s = r.rs, e = r.re, b = r.nt;
    const old = ref.slice(s, e);
    if (old.length === 0) {
      // insertion at offset s: anchor on the previous reference token (kept), else on the next one
      const k = s >= ref.length ? n : A.start.indexOf(s);
      if (k > 0) {
        const ps = A.start[k - 1];
        b = ref.slice(ps, s) + b; s = ps;                       // e stays at the insertion point
      } else if (k === 0 && n > 0) {
        const ne = n > 1 ? A.start[1] : ref.length;
        b = b + ref.slice(s, ne); e = ne;
      } else {
        return null;
      }
    }
    edits.push({ s, e, b });
  }
  // Anchor check and minimal left extension, in the reader's own forward-scan order.
  const out: Array<[string, string]> = [];
  let cursor = 0;
  for (const ed of edits) {
    let s = ed.s;
    const e = ed.e;
    const want = (st: number) => {
      const a = ref.slice(st, e);
      return a.length > 0 && ref.indexOf(a, cursor) === st;
    };
    let guard = 0;
    while (!want(s)) {
      // extend the anchor leftwards by one token, staying at or after the cursor
      const k = A.start.indexOf(s);
      const prevStart = k > 0 ? A.start[k - 1] : -1;
      if (prevStart < cursor || prevStart < 0 || ++guard > 64) return null;
      s = prevStart;
    }
    const a = ref.slice(s, e);
    if (a.length === 0) return null;
    if (/[|=\[\]]/.test(a)) return null;
    if (/[|=\[\]]/.test(ed.b)) return null;
    out.push([a, ed.b]);
    cursor = e;
  }
  // Verify with the reader's own rule.
  try {
    if (homoiosApply(ref, out) !== target) return null;
  } catch {
    return null;
  }
  return out;
}

function wordGrams(s: string): Set<string> {
  const w = s.split(/\s+/).filter(Boolean);
  const g = new Set<string>();
  for (let k = 0; k + 3 <= w.length; k++) g.add(w.slice(k, k + 3).join(' '));
  return g;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

/** Encoder: substitute block j by [i|…] when the wire block is cheaper in o200k tokens. */
export function homoiosSubstitute(text: string, enc: EncodingName = 'o200k_base'): { out: string; subs: number; notes: string } {
  const { blocks, seps } = homoiosSplit(text);
  // A literal block that matches the wire form would be read as an edit; refuse the whole input.
  if (blocks.some(b => WIRE_BLOCK.test(b))) return { out: text, subs: 0, notes: 'refuse: a literal block has the wire form' };
  const grams = blocks.map(b => wordGrams(b));
  const wire = [...blocks];
  let subs = 0;
  for (let j = 0; j < blocks.length; j++) {
    const B = blocks[j];
    if (B.trim().length === 0 || grams[j].size < 2) continue;
    // top-3 earlier candidates by Jaccard
    const cands: Array<{ i: number; s: number }> = [];
    for (let i = 0; i < j; i++) {
      if (blocks[i].trim().length === 0) continue;
      const s = jaccard(grams[i], grams[j]);
      if (s >= 0.2) cands.push({ i, s });
    }
    cands.sort((x, y) => y.s - x.s);
    const litCost = countTokens(B, enc);
    let best: { w: string; cost: number } | null = null;
    for (const c of cands.slice(0, 3)) {
      const ed = homoiosDiff(blocks[c.i], B);
      if (ed === null) continue;
      const w = ed.length === 0
        ? `${HOMOIOS_OPEN}${c.i + 1}${HOMOIOS_CLOSE}`
        : `${HOMOIOS_OPEN}${c.i + 1}${ed.map(([a, b]) => `${HOMOIOS_BAR}${a}${HOMOIOS_ARROW}${b}`).join('')}${HOMOIOS_CLOSE}`;
      if (BLOCK_SEP.test(w)) continue;           // the reader splits blocks on blank lines
      const cost = countTokens(w, enc);
      if (!best || cost < best.cost) best = { w, cost };
    }
    if (best && best.cost < litCost) {
      wire[j] = best.w;
      subs++;
    }
  }
  return { out: joinBlocks(wire, seps), subs, notes: `${subs} block(s) substituted` };
}

/** Reader: exact inverse of homoiosSubstitute. Blocks are rebuilt in order. */
export function homoiosExpand(wire: string): string {
  const { blocks, seps } = homoiosSplit(wire);
  const dec: string[] = [];
  for (const w of blocks) {
    const m = WIRE_BLOCK.exec(w);
    if (!m) { dec.push(w); continue; }
    const i = Number(m[1]) - 1;
    if (i < 0 || i >= dec.length) throw new Error('homoios: reference to a block not yet decoded');
    const edits: Array<[string, string]> = [];
    const body = m[2];
    if (body.length > 0) {
      for (const part of body.split(HOMOIOS_BAR).slice(1)) {
        const k = part.indexOf(HOMOIOS_ARROW);
        edits.push([part.slice(0, k), part.slice(k + 1)]);
      }
    }
    dec.push(homoiosApply(dec[i], edits));
  }
  return joinBlocks(dec, seps);
}

export interface HomoiosResult {
  codec: 'homoios';
  arm: 'edits' | 'identity';
  wire: string;
  decoded: string;
  exact: boolean;
  subs: number;
  inTokens: number;
  messageTokens: number;
  daedalus: DaedalusDualResult;
  decoderPrompt: string;
  notes: string;
}

/** Full encoder with gates. Identity arm = plain DAEDALUS-D (never worse by construction). */
export function homoiosEncode(text: string, enc: EncodingName = 'o200k_base'): HomoiosResult {
  const inTokens = countTokens(text, enc);
  const plain = daedalusDualEncode(text, enc);
  const identity: HomoiosResult = {
    codec: 'homoios', arm: 'identity', wire: plain.wire, decoded: text, exact: true, subs: 0,
    inTokens, messageTokens: plain.messageTokens[enc === 'cl100k_base' ? 'cl100k_base' : 'o200k_base'],
    daedalus: plain, decoderPrompt: plain.decoderPrompt, notes: 'identity arm (DAEDALUS-D plain)',
  };
  const { out, subs, notes } = homoiosSubstitute(text, enc);
  if (subs === 0) return { ...identity, notes: `identity: ${notes}` };
  if (homoiosExpand(out) !== text) return { ...identity, notes: 'identity: G1 failed' };        // G1
  const d = daedalusDualEncode(out, enc);
  // G0: no marker may be a glyph of any CHIRON script (conservative: all scripts, not just the chosen one)
  for (const ch of [HOMOIOS_OPEN, HOMOIOS_CLOSE, HOMOIOS_BAR, HOMOIOS_ARROW]) {
    if (CHIRON_SCRIPTS.some(sc => chironInScript(sc, ch.codePointAt(0) as number))) {
      return { ...identity, notes: 'identity: G0 (marker in a CHIRON script)' };
    }
  }
  if (!d.exact || daedalusDecode(d.wire) !== out) return { ...identity, notes: 'identity: G2' };  // G2
  const decoderPrompt = HOMOIOS_CONTRACT + '\n' + d.decoderPrompt;
  const M = countTokens(decoderPrompt, enc);
  const identityM = identity.messageTokens;
  if (M >= identityM) return { ...identity, notes: `identity: edits arm ${M} >= identity ${identityM}` };  // G3
  if (homoiosDecode(d.wire) !== text) return { ...identity, notes: 'identity: G4' };            // G4
  return {
    codec: 'homoios', arm: 'edits', wire: d.wire, decoded: text, exact: true, subs, inTokens,
    messageTokens: M, daedalus: d, decoderPrompt, notes: `subs=${subs}; edits M=${M} vs identity ${identityM}`,
  };
}

/** Library reader for the EDITS arm: DAEDALUS-D decode, then the block rule. */
export function homoiosDecode(wire: string): string {
  return homoiosExpand(daedalusDecode(wire));
}

/**
 * Arm-aware reader. The one-chat message says which arm it is: the edits arm carries the
 * HOMOIOS contract line; the identity arm is the plain DAEDALUS-D message (no HOMOIOS line),
 * so its reader must not apply the block rule. Identity arm of raw mode is the text itself.
 */
export function homoiosRead(r: Pick<HomoiosResult, 'arm' | 'wire' | 'daedalus'>): string {
  if (r.arm === 'edits') return homoiosDecode(r.wire);
  return r.daedalus.mode === 'raw' ? r.wire : daedalusDecode(r.wire);
}
