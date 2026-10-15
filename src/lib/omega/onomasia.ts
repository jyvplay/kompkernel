/**
 * src/lib/omega/onomasia.ts
 * =============================================================================
 * ONOMASIA (ὀνομασία, "naming") — KEYED arithmetic-progression elision.
 *
 * WHAT IT ADDS OVER AKOLOUTHIA (measured, bench/z56/keyed-probe.jsonl)
 * -----------------------------------------------------------------------------
 * AKOLOUTHIA addresses a number by ORDINAL POSITION: "the k-th digit run in the
 * line". Any line whose count of numbers differs shifts every later position and
 * the progression is lost. ONOMASIA addresses a number by its KEY: the literal
 * text immediately before it (back to the previous space or digit), plus j, the
 * occurrence index of that key within the line. The reader finds the same key in
 * the line above; no counting of unrelated numbers is needed.
 *   - Ties AKOLOUTHIA on every lane where AKOLOUTHIA fires (gross, 43 lanes).
 *   - Also fires on numbered references and time stamps in prose and ops text:
 *     bibliography.txt −22, meeting-transcript.txt −14, markdown-table.md −6,
 *     git-numstat.txt −5 (gross, before the contract).
 *
 * RULE (decoder)
 * -----------------------------------------------------------------------------
 * Slots are digit runs and markers, read left to right in each line. For a slot
 * with key K and occurrence j in the line: a marker means
 *     value(line i-1, K, j) + (value(line i-1, K, j) - value(line i-2, K, j))
 * written in canonical decimal. The key of a marker is computed from the already
 * decoded prefix of its own line, so the reader never looks ahead.
 * The encoder additionally requires the same (K, j) slot in line i-3 with an equal
 * step (three-term run), so that one coincidence does not fire a marker. The
 * reader does not need that check.
 *
 * GATES (encoder; every failure returns the identity arm)
 * -----------------------------------------------------------------------------
 *   G1  onomasiaExpand(substituted) === input   (the reader's rule inverts the encoder)
 *   G2  DAEDALUS round trip on the substituted text
 *   G3  one-chat M (contract + DAEDALUS message) < plain DAEDALUS M
 * Refused outright: input containing the marker character; numbers longer than 15
 * digits; a marker in the first three lines.
 *
 * CONTRACT (one sentence in the message)
 * -----------------------------------------------------------------------------
 *   ⁺ = the number after the same text in the line above (that text is the characters just before it, back to a space or digit), plus the change from the line two above.
 * =============================================================================
 */

import { countTokens, type EncodingName } from './bpe';
import { daedalusEncode, daedalusDecode, type DaedalusResult } from './daedalus';

export const ONOMASIA_MARK = '⁺';

export const ONOMASIA_CONTRACT =
  `${ONOMASIA_MARK} = the number after the same text in the line above (that text is the characters just before it, back to a space or digit), plus the change from the line two above.`;

interface Slot { key: string; j: number; s: string; v: number; at: number }

/** Key of the digit run starting at `at`: characters just before it, back to a space or digit. */
function keyBefore(line: string, at: number): string {
  let b = at;
  while (b > 0 && line[b - 1] !== ' ' && !(line[b - 1] >= '0' && line[b - 1] <= '9')) b--;
  return line.slice(b, at);
}

function slotsOf(line: string): Slot[] {
  const out: Slot[] = [];
  const seen = new Map<string, number>();
  for (const m of line.matchAll(/[0-9]+/g)) {
    const at = m.index ?? 0;
    const key = keyBefore(line, at);
    const j = seen.get(key) ?? 0;
    seen.set(key, j + 1);
    out.push({ key, j, s: m[0], v: Number(m[0]), at });
  }
  return out;
}

function findSlot(sl: Slot[], key: string, j: number): Slot | undefined {
  return sl.find(x => x.key === key && x.j === j);
}

/** Encoder: replace eligible digit runs by the marker. */
export function onomasiaSubstitute(text: string): { out: string; marks: number } {
  const lines = text.split('\n');
  const slots = lines.map(slotsOf);
  let marks = 0;
  const out = lines.map((line, i) => {
    if (i < 3) return line;
    const edits: { at: number; len: number }[] = [];
    for (const c of slots[i]) {
      const a = findSlot(slots[i - 1], c.key, c.j);
      const b = findSlot(slots[i - 2], c.key, c.j);
      const d = findSlot(slots[i - 3], c.key, c.j);
      if (!a || !b || !d) continue;
      const s = a.v - b.v;
      if (s === 0 || b.v - d.v !== s) continue;
      if (String(a.v) !== a.s || String(b.v) !== b.s || String(d.v) !== d.s) continue;
      const want = String(a.v + s);
      if (want !== c.s || want.length > 15) continue;
      edits.push({ at: c.at, len: c.s.length });
      marks++;
    }
    let r = line;
    for (const e of edits.reverse()) r = r.slice(0, e.at) + ONOMASIA_MARK + r.slice(e.at + e.len);
    return r;
  });
  return { out: out.join('\n'), marks };
}

/** Decoder (the reader's rule). Throws on a marker with no predecessor slot. */
export function onomasiaExpand(text: string): string {
  const lines = text.split('\n');
  const decodedSlots: Slot[][] = [];
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let res = '';
    const mine: Slot[] = [];
    const seen = new Map<string, number>();
    let j = 0;
    while (j < line.length) {
      const ch = line[j];
      if (ch === ONOMASIA_MARK) {
        if (i < 2) throw new Error('onomasia: MARK in the first two lines');
        const key = keyBefore(res, res.length);
        const occ = seen.get(key) ?? 0;
        const a = findSlot(decodedSlots[i - 1] ?? [], key, occ);
        const b = findSlot(decodedSlots[i - 2] ?? [], key, occ);
        if (!a || !b) throw new Error('onomasia: MARK without predecessor slots');
        const v = a.v + (a.v - b.v);
        const s = String(v);
        res += s;
        mine.push({ key, j: occ, s, v, at: res.length - s.length });
        seen.set(key, occ + 1);
        j++;
        continue;
      }
      if (ch >= '0' && ch <= '9') {
        let e = j;
        while (e < line.length && line[e] >= '0' && line[e] <= '9') e++;
        const s = line.slice(j, e);
        const key = keyBefore(res, res.length);
        const occ = seen.get(key) ?? 0;
        res += s;
        mine.push({ key, j: occ, s, v: Number(s), at: res.length - s.length });
        seen.set(key, occ + 1);
        j = e;
        continue;
      }
      res += ch;
      j++;
    }
    decodedSlots.push(mine);
    out.push(res);
  }
  return out.join('\n');
}

export interface OnomasiaResult {
  codec: 'onomasia';
  arm: 'keyed' | 'identity';
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

export function onomasiaEncode(text: string, enc: EncodingName = 'o200k_base'): OnomasiaResult {
  const inTokens = countTokens(text, enc);
  const plain = daedalusEncode(text, enc);
  const identity: OnomasiaResult = {
    codec: 'onomasia', arm: 'identity', wire: plain.wire, decoded: plain.decoded, exact: plain.exact,
    marks: 0, inTokens, messageTokens: plain.messageTokens, daedalus: plain, decoderPrompt: plain.decoderPrompt,
    notes: 'identity arm (DAEDALUS plain)',
  };
  if (text.includes(ONOMASIA_MARK)) return identity;
  const { out, marks } = onomasiaSubstitute(text);
  if (marks === 0) return identity;
  if (onomasiaExpand(out) !== text) return identity;                       // G1
  const d = daedalusEncode(out, enc);
  if (!d.exact || daedalusDecode(d.wire) !== out) return identity;         // G2
  const decoderPrompt = ONOMASIA_CONTRACT + '\n' + d.decoderPrompt;
  const M = countTokens(decoderPrompt, enc);
  if (M >= identity.messageTokens) {                                       // G3
    return { ...identity, notes: `identity: keyed arm ${M} >= identity ${identity.messageTokens}` };
  }
  return {
    codec: 'onomasia', arm: 'keyed', wire: d.wire, decoded: text, exact: true, marks, inTokens,
    messageTokens: M, daedalus: d, decoderPrompt,
    notes: `marks=${marks}; keyed M=${M} vs identity ${identity.messageTokens}`,
  };
}

/** Arm-aware library reader. The keyed arm is DAEDALUS expansion then the keyed rule; identity is DAEDALUS alone. */
export function onomasiaDecode(wire: string, arm: 'keyed' | 'identity' = 'keyed'): string {
  const expanded = daedalusDecode(wire);
  return arm === 'keyed' ? onomasiaExpand(expanded) : expanded;
}
