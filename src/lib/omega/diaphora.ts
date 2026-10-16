/**
 * src/lib/omega/diaphora.ts
 * =============================================================================
 * DIAPHORA (X15): column-difference coding of long numbers, inside a DAEDALUS
 * message. Byte-exact. Marker ∆ (U+2206).
 *
 * WHAT IT IS (mechanism)
 * -----------------------------------------------------------------------------
 * In ops text (df, psql, kubectl, ls, git numstat, tables of counters) the same
 * field position holds numbers of the same magnitude on consecutive lines. A
 * number is written as a signed difference from the number at the same
 * position in the line above:
 *
 *   Let a "number" be a maximal run of ASCII digits in an original line, and let
 *   its position be its 1-based index N among the digit runs of that line.
 *   If the line above has an N-th number P and this number C is canonical
 *   (no leading zero, C = String(BigInt(C))) with at least MIN_DIGITS digits,
 *   and the mark is shorter than C, then C is written as  ∆d,  d = C − P.
 *
 * The reader decodes line by line. For each number in a wire line (a literal
 * run of digits, or ∆d), the position N is counted from the left. For ∆d the
 * value is (N-th number of the decoded line above) + d.
 *
 * WHAT IS NOT NEW (honest)
 * -----------------------------------------------------------------------------
 * - AKOLOUTHIA / AKOLOUTHIA-2 elide an arithmetic progression (the step must be
 *   exactly the step of the two lines above). DIAPHORA codes any small difference
 *   from the line above; it has no step rule and no two-line history.
 * - DITTO (same field as above) is the d = 0 case for every field; DIAPHORA codes
 *   only long numbers, and any d.
 * - HEMERA / HORA code dates and timestamps; DIAPHORA is the same idea for
 *   plain integers in ops columns.
 * - Textbook: delta coding of a column (Elias 1975 for integers, PFOR-delta
 *   and columnar delta encoding in column stores). Not new in the literature.
 *
 * CONTRACT (the reader's rule, one sentence, in band)
 * -----------------------------------------------------------------------------
 *   ∆d: the number at the same position as this one in the line above, plus d.
 *   Numbers are the digit runs of a line, counted from the left; d may be negative.
 *
 * GATES (encoder): G0 marker is not a CHIRON script glyph; input does not already
 * contain ∆; G1 expansion round-trips the original text; G2 DAEDALUS round-trips
 * the substituted text; G3 one-chat M (contract + wire) is strictly below the
 * identity arm; G4 the library reader reproduces the original. Otherwise identity.
 */
import { countTokens, type EncodingName } from './bpe';
import { daedalusEncode, daedalusDecode, type DaedalusResult } from './daedalus';
import { CHIRON_SCRIPTS, chironInScript } from './chiron';

export const DIAPHORA_MARK = '∆';   // U+2206
export const MIN_DIGITS = 4;

export const DIAPHORA_CONTRACT =
  '∆d = the number at the same position as this one in the line above, plus d (d may be negative). ' +
  'Numbers are the digit runs of a line, counted from the left.';

const RUN = /[0-9]+/g;
const CANON = /^(0|[1-9][0-9]*)$/;
const TOKEN = /∆(-?[0-9]+)|[0-9]+/g;

/** Encoder: substitute ∆d for eligible numbers. Returns the new text and the count. */
export function diaphoraSubstitute(text: string): { out: string; n: number } {
  if (text.includes(DIAPHORA_MARK)) return { out: text, n: 0 };   // refuse: input uses the marker
  const lines = text.split('\n');
  let prev: string[] | null = null;                               // raw digit runs of the original line above
  let n = 0;
  const out: string[] = [];
  for (const line of lines) {
    const runs = [...line.matchAll(RUN)];
    let res = '';
    let last = 0;
    const cur: string[] = [];
    runs.forEach((m, i) => {
      const raw = m[0];
      const idx = m.index as number;
      res += line.slice(last, idx);
      last = idx + raw.length;
      cur.push(raw);
      const p = prev ? prev[i] : undefined;
      if (p !== undefined && raw.length >= MIN_DIGITS && CANON.test(raw)) {
        const d = BigInt(raw) - BigInt(p);
        const mark = DIAPHORA_MARK + d.toString();
        if (mark.length < raw.length) { res += mark; n++; return; }
      }
      res += raw;
    });
    res += line.slice(last);
    out.push(res);
    prev = cur;
  }
  return { out: out.join('\n'), n };
}

/** Reader: exact inverse of diaphoraSubstitute (the rule the LLM applies). Throws on a bad wire. */
export function diaphoraExpand(wire: string): string {
  const lines = wire.split('\n');
  let prev: string[] | null = null;                               // decoded digit runs of the line above
  const out: string[] = [];
  for (const wl of lines) {
    const nums: string[] = [];
    let res = '';
    let last = 0;
    for (const m of wl.matchAll(TOKEN)) {
      res += wl.slice(last, m.index as number);
      last = (m.index as number) + m[0].length;
      const k = nums.length;
      if (m[1] !== undefined) {                                   // ∆d
        const p = prev ? prev[k] : undefined;
        if (p === undefined) throw new Error('diaphora: ∆ with no number above');
        const v = BigInt(p) + BigInt(m[1]);
        if (v < 0n) throw new Error('diaphora: negative value');
        const s = v.toString();
        nums.push(s);
        res += s;
      } else {
        nums.push(m[0]);
        res += m[0];
      }
    }
    res += wl.slice(last);
    out.push(res);
    prev = nums;
  }
  return out.join('\n');
}

export interface DiaphoraResult {
  codec: 'diaphora';
  arm: 'diaphora' | 'identity';
  wire: string;
  decoded: string;
  exact: boolean;
  subs: number;
  inTokens: number;
  messageTokens: number;
  daedalus: DaedalusResult;
  decoderPrompt: string;
  notes: string;
}

/** Encoder entry: one DIAPHORA arm against the identity arm; the cheaper exact one wins. */
export function diaphoraEncode(text: string, enc: EncodingName = 'o200k_base'): DiaphoraResult {
  const inTokens = countTokens(text, enc);
  const plain = daedalusEncode(text, enc);
  const identity: DiaphoraResult = {
    codec: 'diaphora', arm: 'identity', wire: plain.wire, decoded: plain.decoded, exact: plain.exact,
    subs: 0, inTokens, messageTokens: plain.messageTokens, daedalus: plain,
    decoderPrompt: plain.decoderPrompt, notes: 'identity arm (DAEDALUS plain)',
  };
  const { out, n } = diaphoraSubstitute(text);
  if (n === 0) return identity;
  if (diaphoraExpand(out) !== text) return identity;                                 // G1
  const d = daedalusEncode(out, enc);
  const sc = CHIRON_SCRIPTS.find(x => x.name === d.script);                          // G0
  if (sc && chironInScript(sc, DIAPHORA_MARK.codePointAt(0) as number)) return identity;
  if (!d.exact || daedalusDecode(d.wire) !== out) return identity;                   // G2
  const decoderPrompt = DIAPHORA_CONTRACT + '\n' + d.decoderPrompt;
  const M = countTokens(decoderPrompt, enc);
  if (M >= identity.messageTokens) return identity;                                  // G3
  if (diaphoraDecode(d.wire) !== text) return identity;                              // G4
  return {
    codec: 'diaphora', arm: 'diaphora', wire: d.wire, decoded: text, exact: true, subs: n,
    inTokens, messageTokens: M, daedalus: d, decoderPrompt,
    notes: `subs=${n}; M=${M} vs identity ${identity.messageTokens}`,
  };
}

/** Library reader: DAEDALUS decode, then the column-difference rule. */
export function diaphoraDecode(wire: string): string {
  return diaphoraExpand(daedalusDecode(wire));
}
