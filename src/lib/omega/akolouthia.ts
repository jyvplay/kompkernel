/**
 * src/lib/omega/akolouthia.ts
 * =============================================================================
 * AKOLOUTHIA (ἀκολουθία, "sequence") — arithmetic-progression elision across lines.
 *
 * THE GAP (measured this turn; bench/z55)
 * -----------------------------------------------------------------------------
 * DAEDALUS spends a token per position whose content is not a copy of earlier
 * text (bench/z46 position bound). A number that continues a run is such a
 * position, and it is not a copy: `node-7` after `node-6` is a new string, and
 * DAEDALUS's glyph dictionary cannot reach it. Numbers that step by a constant
 * from line to line are common in ops and document output: SVG axis labels
 * (x = 35, 77, 119, ...), kubectl node names (node-0, node-1, ...), IPs, row ids
 * in SQL dumps, `df` device indexes.
 *
 * MECHANISM CLASS
 * -----------------------------------------------------------------------------
 * Arithmetic-progression field elision (same family as ELLEIPSIS for constants,
 * and LeCo's delta/linear models for integer columns in the storage literature:
 * arXiv 2306.15374). Distinct here because the decoder is an LLM reading one
 * chat message, the rule is one sentence, and the encoder only elides when the
 * DAEDALUS message including the contract is smaller (the identity arm is always
 * present, so the codec cannot lose to DAEDALUS on the metric).
 *
 * RULE
 * -----------------------------------------------------------------------------
 * Numbers are maximal digit runs, counted left to right in each line (position k).
 * A number at position k of line i may be written as the marker MARK when it is
 * exactly   value(line i-1, k) + (value(line i-1, k) - value(line i-2, k))
 * and its digits are the canonical decimal of that sum. The encoder also requires
 * a three-line run (line i-3, i-2, i-1 equal step) so that a single coincidence
 * does not fire a marker; the decoder does not need that check.
 *
 * CONTRACT (one sentence, in the message)
 * -----------------------------------------------------------------------------
 *   MARK = the number at the same position in the line above, plus the change from the line two above.
 *
 * BYTE-EXACTNESS
 * -----------------------------------------------------------------------------
 * The encoder runs the same expander the reader uses and requires equality with
 * the input. It refuses input that already contains MARK, numbers longer than 15
 * digits (JS integer precision), or a text with no marker to write.
 */

import { countTokens, type EncodingName } from './bpe';
import { daedalusEncode, daedalusDecode, type DaedalusResult } from './daedalus';

export const AKOLOUTHIA_MARK = '⁺';

export const AKOLOUTHIA_CONTRACT =
  `${AKOLOUTHIA_MARK} = the number at the same position in the line above, plus the change from the line two above.`;

const DIGITS = /\d+/g;

interface Num { s: string; v: number; at: number }

function numbersOf(line: string): Num[] {
  const out: Num[] = [];
  for (const m of line.matchAll(DIGITS)) out.push({ s: m[0], v: Number(m[0]), at: m.index ?? 0 });
  return out;
}

/** Encoder: replace eligible numbers by MARK. Returns the substituted text and the number of marks. */
export function akolouthiaSubstitute(text: string): { out: string; marks: number } {
  const lines = text.split('\n');
  const nums = lines.map(numbersOf);
  let marks = 0;
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const cur = nums[i];
    if (i >= 3 && cur.length) {
      const p1 = nums[i - 1], p2 = nums[i - 2], p3 = nums[i - 3];
      const edits: { at: number; len: number }[] = [];
      for (let k = 0; k < cur.length && k < p1.length && k < p2.length && k < p3.length; k++) {
        const s = p1[k].v - p2[k].v;
        if (s === 0 || p2[k].v - p3[k].v !== s) continue;
        const want = String(p1[k].v + s);
        if (want !== cur[k].s) continue;
        if (p1[k].s !== String(p1[k].v) || p2[k].s !== String(p2[k].v) || p3[k].s !== String(p3[k].v)) continue;
        if (want.length > 15) continue;
        edits.push({ at: cur[k].at, len: cur[k].s.length });
        marks++;
      }
      for (const e of edits.reverse()) line = line.slice(0, e.at) + AKOLOUTHIA_MARK + line.slice(e.at + e.len);
    }
    out.push(line);
  }
  return { out: out.join('\n'), marks };
}

/** Decoder (the same rule the reader applies). Throws if a MARK has no predecessor values. */
export function akolouthiaExpand(text: string): string {
  const lines = text.split('\n');
  const values: number[][] = [];          // decoded number values per decoded line
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // slots: a digit run or a MARK, in order; each takes the next position index k
    let res = '';
    let k = 0;
    const nums: number[] = [];
    let j = 0;
    while (j < line.length) {
      const ch = line[j];
      if (ch === AKOLOUTHIA_MARK) {
        if (i < 2) throw new Error('akolouthia: MARK in the first two lines');
        const a = values[i - 1]?.[k], b = values[i - 2]?.[k];
        if (a === undefined || b === undefined) throw new Error('akolouthia: MARK without predecessor numbers');
        const v = a + (a - b);
        const s = String(v);
        res += s;
        nums.push(v);
        k++;
        j++;
        continue;
      }
      if (ch >= '0' && ch <= '9') {
        let e = j;
        while (e < line.length && line[e] >= '0' && line[e] <= '9') e++;
        const s = line.slice(j, e);
        res += s;
        nums.push(Number(s));
        k++;
        j = e;
        continue;
      }
      res += ch;
      j++;
    }
    values.push(nums);
    out.push(res);
  }
  return out.join('\n');
}

export interface AkolouthiaResult {
  codec: 'akolouthia';
  arm: 'progression' | 'identity';
  wire: string;
  decoded: string;
  exact: boolean;
  marks: number;
  inTokens: number;
  messageTokens: number;
  daedalus: DaedalusResult;
  decoderPrompt: string;
  notes: string;
}

export function akolouthiaEncode(text: string, enc: EncodingName = 'o200k_base'): AkolouthiaResult {
  const inTokens = countTokens(text, enc);
  const plain = daedalusEncode(text, enc);
  const identity: AkolouthiaResult = {
    codec: 'akolouthia', arm: 'identity', wire: plain.wire, decoded: plain.decoded, exact: plain.exact,
    marks: 0, inTokens, messageTokens: plain.messageTokens, daedalus: plain, decoderPrompt: plain.decoderPrompt,
    notes: 'identity arm (DAEDALUS plain)',
  };
  if (text.includes(AKOLOUTHIA_MARK)) return identity; // the marker is not free in this input
  const { out, marks } = akolouthiaSubstitute(text);
  if (marks === 0) return identity;
  if (akolouthiaExpand(out) !== text) return identity; // G1: the reader's rule inverts the encoder on this input
  const d = daedalusEncode(out, enc);
  if (!d.exact || daedalusDecode(d.wire) !== out) return identity; // G2: DAEDALUS round trip on the substituted text
  const decoderPrompt = AKOLOUTHIA_CONTRACT + '\n' + d.decoderPrompt;
  const M = countTokens(decoderPrompt, enc);
  if (M >= identity.messageTokens) return { ...identity, notes: `identity: progression arm ${M} >= identity ${identity.messageTokens}` };
  return {
    codec: 'akolouthia', arm: 'progression', wire: d.wire, decoded: text, exact: true, marks, inTokens,
    messageTokens: M, daedalus: d, decoderPrompt,
    notes: `marks=${marks}; progression M=${M} vs identity ${identity.messageTokens}`,
  };
}

/** Library reader, arm-aware: the progression arm is the DAEDALUS expansion followed by the progression rule;
 *  the identity arm is the DAEDALUS expansion alone (its text may contain the marker character). */
export function akolouthiaDecode(wire: string, arm: 'progression' | 'identity' = 'progression'): string {
  const expanded = daedalusDecode(wire);
  return arm === 'progression' ? akolouthiaExpand(expanded) : expanded;
}
