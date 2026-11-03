/**
 * src/lib/omega/stadion.ts — X72. ΣΤΑΔΙΟΝ (stadion), the measured course.
 * =============================================================================
 *
 * THE FINDING THIS CODEC IS BUILT ON
 * -----------------------------------------------------------------------------
 * Measured with the real counter (`bench/x72/pad.ts`), the share of a document
 * that is *column padding* — runs of two or more interior spaces that exist only
 * to keep a table aligned:
 *
 *     dpkg -l            1000 -> 858 tokens   (142, 14.2%)
 *     ps aux --sort      3054 -> 2585 tokens  (469, 15.4%)
 *     ls -l              5194 -> 4752 tokens  (442,  8.5%)
 *     findmnt             787 ->  711 tokens  ( 76,  9.7%)
 *     node --help        1099 ->  953 tokens  (146, 13.3%)
 *     apt list           2739 -> 2739 tokens  (  0)
 *
 * Every one of those documents is *fixed-width*: the columns begin at the same
 * character offset on every line, so the padding carries no information at all.
 * But no codec in the stack can remove it, and the reason is not laziness — it is
 * that the frontier's dictionary and tape parents are literal-repetition engines.
 * Padding runs differ from line to line (`python3` + 22 spaces, `libc6` + 25), so
 * not one of them is a repeated literal, and nothing in the stack models "this
 * file has columns that begin at offsets 0, 4, 35, 67, 68, 81".
 *
 * THE MECHANIC: WIDTH-VECTOR FOLD, THEN THE FRONTIER, THEN UNFOLD
 * -----------------------------------------------------------------------------
 * STADION does not compete with the frontier, it *feeds* it. Three steps:
 *
 *   1. INDUCE the width vector. A character offset p is a column boundary when
 *      every line has a space at p and some line has a non-space on either side
 *      of it. Offsets that satisfy that are collected, the line is cut at them,
 *      and the resulting cells are right-padded by construction. If the induced
 *      vector does not reproduce every line byte for byte the fold is ABANDONED
 *      for that file — the induction is checked by reconstruction, never assumed.
 *   2. EMIT the normal form: the same lines with every cell trimmed and joined by
 *      a TAB. All padding is gone, and the text is now a table shape — which is
 *      exactly the shape this stack is strongest on (the TSV/CSV lanes are the
 *      ones AUSTEROS wins). The frontier is then run **on the normal form**.
 *   3. SHIP a two-line prelude that re-pads: cut each decoded line at TAB, write
 *      each cell, then spaces up to that column's width, the last cell as-is.
 *
 * So the message is `prelude + frontier(normal form)`, and the decoder runs the
 * frontier's own decoder and then applies a purely mechanical padding rule. That
 * is what makes the composition admissible: the frontier's contract is unchanged
 * and still self-contained, and the only new text is a list of integers.
 *
 * Never worse, by construction: the plain frontier is always computed and the
 * fold's candidate is used only if it is cheaper AND its decode is byte-exact.
 * When the fold does not apply (prose, JSON, code) STADION returns the frontier's
 * message unchanged.
 *
 * Greedy: no. STADION is not a substitution cipher and does not pick a phrase
 * pool; the fold is a total function of the input (the width vector is the unique
 * maximal such vector), and the only choice — fold or not — is made by measuring
 * the complete message both ways.
 *
 * Source: fixed-width column induction is the same idea as the `cut`/`unexpand`
 * half of POSIX text utilities and, more relevantly, as the "columnar
 * transposition" step in column-oriented storage (Abadi et al., "Column-Stores vs
 * Row-Stores", SIGMOD 2008) — a fixed-width file is stored column-major precisely
 * because the padding is derivable from the widths. Prior art for the *padding* is
 * RFC 4180's inverse (delimited text) and ALP (Afroozeh et al., "ALP: Adaptive
 * Lossless floating-Point compression", SIGMOD 2024) for the general principle
 * that a column's formatting is a rule, not data.
 */

import { countTokens, countTokensExact } from './bpe';
import type { EncodingName } from './bpe';
import { tagstackEncode } from './tagstack';
import type { TagstackResult } from './tagstack';

export type StadionFold = {
  widths: number[];
  normal: string;
  rule: string;
};

export type StadionResult = {
  message: string;
  /**
   * THE SCORE IS TAKEN TWICE. Once with the accelerated counter that the whole
   * search used, and once with the library's own `encode`, which shares no code
   * with the index. The number that is reported and compared is the LIBRARY's.
   *
   * This is the part of STADION that is not a wrapper: the stack now scores
   * millions of candidate strings with an instrument that is not the reference
   * implementation, so the instrument itself has to be checked against the
   * reference on the artefact that was actually emitted — not on a test fixture
   * that was chosen in advance. If the two ever disagree, the encode fails
   * loudly instead of shipping a message whose price is wrong.
   */
  messageTokens: number;
  scoredTokens: number;
  countAgrees: boolean;
  frontierTokens: number;
  frontierMessage: string;
  decoded: string;
  parentCodec: string;
  folded: boolean;
  widths: number[] | null;
  contractTokens: number;
  exact: boolean;
};

const TAB = '\t';

/**
 * Induce the column widths of a fixed-width block, or null.
 *
 * A boundary at offset p requires a space at p on EVERY line (lines shorter than
 * p are treated as having a space there — the trailing columns are optional in
 * real output) and a non-space at p-1 or p+1 on at least one line.
 */
export function stadionFold(text: string): StadionFold | null {
  const lines = text.split('\n');
  if (lines.length < 8) return null;
  let maxLen = 0;
  for (const l of lines) if (l.length > maxLen) maxLen = l.length;
  if (maxLen < 24) return null;

  // A boundary at offset p is a space at p on at least 90% of the lines (a line
  // shorter than p counts as a space there: its column is simply absent), with
  // real content on both sides of it somewhere in the file.
  const need = Math.ceil(lines.length * 0.9);
  const spaceCount = new Int32Array(maxLen + 1);
  for (const l of lines) for (let p = 0; p < l.length; p++) if (l.charCodeAt(p) === 32) spaceCount[p]++;
  const isBound: boolean[] = new Array(maxLen + 1).fill(false);
  for (let p = 1; p < maxLen; p++) {
    const present = spaceCount[p] + (lines.length - lines.filter(l => l.length > p).length);
    if (present < need) continue;
    let left = false, right = false;
    for (const l of lines) {
      if (l.length > p - 1 && l.charCodeAt(p - 1) !== 32) left = true;
      if (l.length > p + 1 && l.charCodeAt(p + 1) !== 32) right = true;
    }
    if (left && right) isBound[p] = true;
  }
  // one boundary per blank run, placed at its left edge
  const bounds: number[] = [0];
  for (let p = 1; p < maxLen; p++) {
    if (!isBound[p]) continue;
    if (isBound[p - 1]) continue;
    bounds.push(p);
  }
  bounds.push(maxLen);
  const spans: Array<[number, number]> = [];
  for (let b = 0; b + 1 < bounds.length; b++) spans.push([bounds[b], bounds[b + 1]]);
  if (spans.length < 2 || spans.length > 24) return null;
  const widths = spans.map(([a, b]) => b - a);

  // every boundary offset must actually be a space on the lines we fold, and a
  // line is foldable only when every one of its non-final cells is right-padded
  const cutsP = bounds.slice(1, -1);
  const rows: string[] = [];
  let folded = 0;
  for (const l of lines) {
    let ok = true;
    for (const c of cutsP) if (c < l.length && l.charCodeAt(c) !== 32) { ok = false; break; }
    if (ok && l.length > 0) {
      const cells: string[] = [];
      for (let c = 0; c < spans.length; c++) {
        const [a, b] = spans[c];
        const raw = c === spans.length - 1 ? l.slice(a) : l.slice(a, Math.min(b, l.length));
        if (c < spans.length - 1) {
          const t = raw.replace(/ +$/, '');
          if (t.includes(TAB) || raw.slice(t.length) !== ' '.repeat(raw.length - t.length)) { ok = false; break; }
          cells.push(t);
        } else {
          if (raw.includes(TAB)) { ok = false; break; }
          cells.push(raw);
        }
      }
      if (ok) {
        rows.push(cells.join(TAB));
        folded++;
        continue;
      }
    }
    if (l.startsWith('\\')) return null;
    rows.push('\\' + l);
  }
  if (folded < lines.length * 0.5) return null;
  const normal = rows.join('\n');

  const rebuilt = rows.map(r => {
    if (r.startsWith('\\') && !r.includes(TAB)) return r.slice(1);
    const cells = r.split(TAB);
    let out = '';
    for (let c = 0; c < cells.length; c++) {
      out += cells[c];
      if (c < cells.length - 1) out += ' '.repeat(widths[c] - cells[c].length);
    }
    return out;
  }).join('\n');
  if (rebuilt !== text) return null;
  if (normal.length > text.length * 0.97) return null;

  // The rule is stated as cumulative character positions, not as widths, so that
  // the reader never has to add: "pad cell i until the line has that many
  // characters" is a single mechanical instruction per cell. The first version of
  // this rule spelled the arithmetic out in prose and cost 130 tokens on a
  // 20-row file, which is the entire reason the arm cannot pay for itself at
  // these sizes; the short form is ~50 and is what is measured below.
  const ends: number[] = [];
  let acc = 0;
  for (let i = 0; i + 1 < widths.length; i++) { acc += widths[i]; ends.push(acc); }
  const perCell = ends.map((e, i) => `cell ${i + 1} to char ${e}`).join(', ');
  const rule =
    `X72 pad. Unfold: split each line at TAB. Write ${perCell}, and the last cell as-is. ` +
    `Lines starting with a backslash are literal: drop it and keep the rest.`;
  return { widths, normal, rule };
}

/** The inverse of the fold. Pure mechanics — no interpretation. */
export function stadionUnfold(decodedNormal: string, widths: number[]): string {
  return decodedNormal.split('\n').map(row => {
    if (row.startsWith('\\') && !row.includes(TAB)) return row.slice(1);
    const cells = row.split(TAB);
    let out = '';
    for (let c = 0; c < cells.length; c++) {
      out += cells[c];
      if (c < cells.length - 1) {
        const w = widths[c];
        const pad = w === undefined ? 0 : w - cells[c].length;
        out += pad > 0 ? ' '.repeat(pad) : '';
      }
    }
    return out;
  }).join('\n');
}

/**
 * Encode with the frontier, then try to beat it by folding the fixed-width
 * padding away and compressing the normal form instead. The plain frontier's
 * message is always available and is used whenever the fold is absent, lossy,
 * or merely not cheaper.
 */
export function stadionEncode(text: string, enc: EncodingName = 'o200k_base'): StadionResult {
  const base: TagstackResult = tagstackEncode(text, enc);
  const baseTokens = countTokens(base.message, enc);
  const baseRef = countTokensExact(base.message, enc);
  if (baseRef !== baseTokens) {
    throw new Error(`STADION: accelerated count ${baseTokens} != library count ${baseRef} on the emitted message`);
  }
  if (base.decoded !== text) throw new Error('STADION: frontier comparator did not round-trip');

  const fold = stadionFold(text);
  if (!fold) {
    return {
      message: base.message, messageTokens: baseRef, scoredTokens: baseTokens,
      countAgrees: true, frontierTokens: baseTokens,
      frontierMessage: base.message, decoded: base.decoded, parentCodec: base.parentCodec,
      folded: false, widths: null, contractTokens: 0, exact: true,
    };
  }

  const inner: TagstackResult = tagstackEncode(fold.normal, enc);
  const candidateMessage = fold.rule + '\n' + inner.message;
  const rebuilt = stadionUnfold(inner.decoded, fold.widths);
  if (rebuilt !== text) {
    return {
      message: base.message, messageTokens: baseRef, scoredTokens: baseTokens,
      countAgrees: true, frontierTokens: baseTokens,
      frontierMessage: base.message, decoded: base.decoded, parentCodec: base.parentCodec,
      folded: false, widths: null, contractTokens: 0, exact: true,
    };
  }
  const candidateTokens = countTokens(candidateMessage, enc);
  const candidateRef = countTokensExact(candidateMessage, enc);
  if (candidateRef !== candidateTokens) {
    throw new Error(`STADION: accelerated count ${candidateTokens} != library count ${candidateRef} on the folded message`);
  }
  if (candidateRef >= baseRef) {
    return {
      message: base.message, messageTokens: baseRef, scoredTokens: baseTokens,
      countAgrees: true, frontierTokens: baseTokens,
      frontierMessage: base.message, decoded: base.decoded, parentCodec: base.parentCodec,
      folded: false, widths: null, contractTokens: 0, exact: true,
    };
  }
  return {
    message: candidateMessage, messageTokens: candidateRef, scoredTokens: candidateTokens,
    countAgrees: true, frontierTokens: baseTokens,
    frontierMessage: base.message, decoded: text, parentCodec: inner.parentCodec,
    folded: true, widths: fold.widths,
    contractTokens: countTokens(fold.rule, enc) + 1, exact: true,
  };
}
