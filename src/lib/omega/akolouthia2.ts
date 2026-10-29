/**
 * src/lib/omega/akolouthia2.ts
 * =============================================================================
 * AKOLOUTHIA-2 — arithmetic-progression elision, TWO-term eligibility.
 *
 * WHAT CHANGED FROM AKOLOUTHIA (and what did not)
 * -----------------------------------------------------------------------------
 * The reader's rule and the contract sentence are unchanged. A marker at
 * position k of line i means value(line i-1, k) + (value(line i-1, k) - value(line i-2, k)).
 * AKOLOUTHIA (v1) additionally required the same step in line i-3 before writing a
 * marker (an encoder-side guard against coincidences). The reader never used that
 * guard. AKOLOUTHIA-2 drops the guard. The encoder then writes a marker wherever
 * the reader's rule holds, and the whole-message gate decides whether the marked
 * text is worth sending.
 *
 * MEASURED (bench/z56/twoterm-probe.ts, bench/z56/receipts/*; one-chat M, o200k)
 * -----------------------------------------------------------------------------
 *   lane              plain   AKOLOUTHIA v1   AKOLOUTHIA-2
 *   chart.svg           465        −123          −135
 *   df-h.txt            281        −102          −110
 *   kubectl-get-pods    386         −30           −60
 *   psql-output         397         −19           −42
 *   dump.sql            728         −15           −25
 *   vix-daily-1990     1394         −13           −25
 *   bibliography        711           0            −2
 *   aapl-2014          1490           0            0  (identity; the marked wire is +104)
 * Identity arm wins on the remaining lanes (no progression fires, or the marked
 * wire does not pay for the contract).
 *
 * GATES (encoder; every failure returns the identity arm, which is plain DAEDALUS)
 * -----------------------------------------------------------------------------
 *   G1  akolouthiaExpand(substituted) === input
 *   G2  DAEDALUS round trip on the substituted text
 *   G3  one-chat M (contract + DAEDALUS message) < plain DAEDALUS M
 * Refused: input containing the marker character; numbers longer than 15 digits.
 *
 * THIS IS NOT A NEW MECHANISM. It is the v1 mechanism with a weaker encoder-side
 * eligibility test, measured to be a net gain on six of the 33 lanes with a
 * whole-message gate. Its novelty claim is limited to the measurements above.
 * =============================================================================
 */

import { countTokens, type EncodingName } from './bpe';
import { daedalusEncode, daedalusDecode, type DaedalusResult } from './daedalus';
import { workEpoch, workBudgetFor } from './workmeter';
import { AKOLOUTHIA_MARK, AKOLOUTHIA_CONTRACT, akolouthiaExpand } from './akolouthia';

export const AKOLOUTHIA2_MARK = AKOLOUTHIA_MARK;
export const AKOLOUTHIA2_CONTRACT = AKOLOUTHIA_CONTRACT;

/** Encoder: a digit run is marked when line i-1 and line i-2 give the same step at the same position. */
export function akolouthia2Substitute(text: string): { out: string; marks: number } {
  const lines = text.split('\n');
  const nums = lines.map(l => [...l.matchAll(/[0-9]+/g)].map(m => ({ s: m[0], v: Number(m[0]), at: m.index ?? 0 })));
  let marks = 0;
  const out = lines.map((line, i) => {
    if (i < 2 || !nums[i].length) return line;
    const edits: { at: number; len: number }[] = [];
    for (let k = 0; k < nums[i].length && k < nums[i - 1].length && k < nums[i - 2].length; k++) {
      const a = nums[i - 1][k], b = nums[i - 2][k];
      const s = a.v - b.v;
      if (s === 0) continue;
      if (String(a.v) !== a.s || String(b.v) !== b.s) continue;
      const want = String(a.v + s);
      if (want !== nums[i][k].s || want.length > 15) continue;
      edits.push({ at: nums[i][k].at, len: nums[i][k].s.length });
      marks++;
    }
    let r = line;
    for (const e of edits.reverse()) r = r.slice(0, e.at) + AKOLOUTHIA2_MARK + r.slice(e.at + e.len);
    return r;
  });
  return { out: out.join('\n'), marks };
}

export interface Akolouthia2Result {
  codec: 'akolouthia2';
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

/** X57: top-level calls open a deterministic work window (workmeter.ts);
 * nested calls share the outer one. */
export function akolouthia2Encode(text: string, enc: EncodingName = 'o200k_base'): Akolouthia2Result {
  return workEpoch(workBudgetFor(text.length), () => akolouthia2EncodeInner(text, enc));
}

function akolouthia2EncodeInner(text: string, enc: EncodingName = 'o200k_base'): Akolouthia2Result {
  const inTokens = countTokens(text, enc);
  const plain = daedalusEncode(text, enc);
  const identity: Akolouthia2Result = {
    codec: 'akolouthia2', arm: 'identity', wire: plain.wire, decoded: plain.decoded, exact: plain.exact,
    marks: 0, inTokens, messageTokens: plain.messageTokens, daedalus: plain, decoderPrompt: plain.decoderPrompt,
    notes: 'identity arm (DAEDALUS plain)',
  };
  if (text.includes(AKOLOUTHIA2_MARK)) return identity;
  const { out, marks } = akolouthia2Substitute(text);
  if (marks === 0) return identity;
  if (akolouthiaExpand(out) !== text) return identity;                       // G1
  const d = daedalusEncode(out, enc);
  if (!d.exact || daedalusDecode(d.wire) !== out) return identity;         // G2
  const decoderPrompt = AKOLOUTHIA2_CONTRACT + '\n' + d.decoderPrompt;
  const M = countTokens(decoderPrompt, enc);
  if (M >= identity.messageTokens) {                                       // G3
    return { ...identity, notes: `identity: progression arm ${M} >= identity ${identity.messageTokens}` };
  }
  return {
    codec: 'akolouthia2', arm: 'progression', wire: d.wire, decoded: text, exact: true, marks, inTokens,
    messageTokens: M, daedalus: d, decoderPrompt,
    notes: `marks=${marks}; progression M=${M} vs identity ${identity.messageTokens}`,
  };
}

/** Arm-aware library reader (same rule as AKOLOUTHIA v1). */
export function akolouthia2Decode(wire: string, arm: 'progression' | 'identity' = 'progression'): string {
  const expanded = daedalusDecode(wire);
  return arm === 'progression' ? akolouthiaExpand(expanded) : expanded;
}
