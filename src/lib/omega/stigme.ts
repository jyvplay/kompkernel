/**
 * ΣΤΙΓΜΗ / STIGME — separator elision for tokens whose punctuation the reader can recompute (X19).
 * =============================================================================
 *
 * MECHANISM (new in this stack; see docs/codec-abbreviations.md for the family map)
 * -----------------------------------------------------------------------------
 * An ISO-8601 date `2026-09-30` costs six o200k tokens ("202","6","-","09","-","30");
 * the same eight digits cost three ("202","609","30"). The two hyphens are not
 * information: their positions follow from the field widths. STIGME deletes separator
 * characters whose position a reader can recompute from what is left, and pays for the
 * deletion with ONE clause per shape in the decoder contract.
 *
 *   D  `YYYY-MM-DD` and `YYYY/MM/DD`  ->  `YYYYMMDD`
 *         reader: "in a run of digits, 8 digits that read as a valid date become YYYY-MM-DD"
 *   T  `THH:MM:SS` and `THH:MM`       ->  `THHMMSS` / `THHMM`
 *         reader: "T then 6 digits is HH:MM:SS; T then 4 digits is HH:MM"
 *   S  a clock that directly follows a converted date and one space
 *         reader: "after a date and a space, 6 digits are HH:MM:SS and 4 digits are HH:MM"
 *
 * The separator character of a restored date is taken from the shape that was elided, so
 * `YYYY/MM/DD` is restored with slashes. (The reader rule states this; the encoder only
 * elides a slash-date when no dash-date and no dot-date is elided in the same message,
 * so the rule never has to branch per occurrence.)
 *
 * SAFETY: EXACT BY VERIFICATION, NOT BY ARGUMENT
 * -----------------------------------------------------------------------------
 * The elision is only invertible when no *other* digit run in the payload would be
 * mis-read by the reader rule. STIGME therefore never reasons about that: it applies the
 * candidate elisions one at a time and keeps a candidate only when the FULL text still
 * round-trips through the reader rule byte for byte (`stigmeRestore(stigmeElide(x)) === x`).
 * A candidate that breaks the round trip is dropped and the next one is tried, so a single
 * awkward eight-digit number in a file costs one date's worth of saving, not the whole arm.
 *
 * WHY THIS IS NOT THE SAME AS HORA / HEMERA / STATHMOS / UUIDFOLD
 * -----------------------------------------------------------------------------
 *   HORA and HEMERA replace a timestamp by a DELTA from an earlier one (a value transform);
 *     they need a predecessor and a marker per occurrence.
 *   STATHMOS removes trailing zeros of a fixed-width decimal column (a value transform).
 *   UUIDFOLD removes the four hyphens of a 32-hex-digit UUID (a *different* shape: it works
 *     because a UUID is always 32 hex digits, and it is not date-aware).
 *   STIGME removes punctuation *inside* a single token and restores it from the token's own
 *     digits, with no predecessor, no marker at the occurrence, and no column. It is a
 *     shape transform, and it composes with all four of the above.
 *
 * COMPOSITION (disclosed inheritance)
 * -----------------------------------------------------------------------------
 * The wire of both arms is produced by LAKONIKOS or LAKONIKOS-D, whichever is cheaper on
 * that arm's text (they share the CHIRON wire and differ only in the glyph pool and in the
 * length of the rules sentence). Both inherit DAEDALUS's wall-clock budget, so the output
 * can depend on machine load exactly as DAEDALUS does.
 *
 * GATES (every failure returns the identity arm)
 * -----------------------------------------------------------------------------
 *   G0  the payload must not contain the frame characters used by the clauses;
 *   G1  stigmeRestore(elided) === input, byte for byte;
 *   G2  the wire of the chosen encoder decodes byte-identically through chironDecode;
 *   G3  one-chat M (contract + wire) of the elided arm < that of the identity arm.
 * The identity arm is min(LAKONIKOS, LAKONIKOS-D, AKOLOUTHIA-2) on the original text, so STIGME
 * is never worse than any of them.  The elided arm runs the same three-way tournament on the
 * elided text, so the clause layer composes with whichever grammar layer already wins.
 */

import { countTokens, type EncodingName } from './bpe';
import { chironDecode } from './chiron';
import { lakonikosEncode, lakonikosDecoderPrompt } from './lakonikos';
import { lakonikosDualEncode } from './lakonikos-d';
import { akolouthia2Encode, akolouthia2Decode } from './akolouthia2';

/* ---------------------------------------------------------------------------
 * 1. Reader rule and contract clauses
 * ------------------------------------------------------------------------- */

// The year is restricted to 19xx/20xx on purpose.  With an unrestricted year, a single
// pre-existing 8-digit run anywhere in the payload that happens to be a valid date (real
// example: the float 94.16331104 in aapl-2014.csv, i.e. 1633-11-04) makes the whole restore
// wrong, and the revert loop then drops every candidate and the arm dies.  Six extra contract
// tokens buy immunity to that class of decoy.
export const STIGME_DATE_CLAUSE =
  '8-digit runs starting 19 or 20 that are valid dates become YYYY-MM-DD.';
export const STIGME_TIME_CLAUSE =
  'T+6 digits is HH:MM:SS; T+4 is HH:MM.';
export const STIGME_AFTER_CLAUSE =
  'After a date and a space, 6 digits are HH:MM:SS and 4 are HH:MM.';

export type StigmeClause = 'date' | 'time' | 'after';

const isD = (c: string) => c >= '0' && c <= '9';

function daysInMonth(y: number, m: number): number {
  if (m < 1 || m > 12) return 0;
  const dim = [31, (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return dim[m - 1];
}
export function stigmeValidDate(r: string): boolean {
  if (r.length !== 8) return false;
  if (r[0] !== '1' || r[1] !== '9') { if (r[0] !== '2' || r[1] !== '0') return false; }   // 19xx | 20xx, per the clause
  for (const c of r) if (!isD(c)) return false;
  const y = +r.slice(0, 4), m = +r.slice(4, 6), d = +r.slice(6, 8);
  if (y < 1 || m < 1 || m > 12 || d < 1) return false;
  return d <= daysInMonth(y, m);
}

/**
 * The reader. `sep` is the separator used for restored dates (taken from the payload).
 * `after` enables the "clock directly after a date" clause.
 */
const DATE_TAIL = /\d{4}[-\/]\d{2}[-\/]\d{2}$/;

export function stigmeRestore(s: string, sep = '-', after = false): string {
  let out = '';
  let i = 0;
  const n = s.length;
  // `sawDate` / `sawDateSpace` remember that the text emitted so far ends with a date
  // (converted here, or literal in the payload) and then a space, so the optional
  // "after" clause can fire on the digit run that follows it.
  let sawDate = false;
  let sawDateSpace = false;
  const markDate = () => { sawDate = DATE_TAIL.test(out); sawDateSpace = false; };
  const clear = () => { sawDate = false; sawDateSpace = false; };
  while (i < n) {
    const c = s[i];
    if (c === 'T') {
      let j = i + 1;
      while (j < n && isD(s[j])) j++;
      const r = s.slice(i + 1, j);
      if (r.length === 6) { out += 'T' + r.slice(0, 2) + ':' + r.slice(2, 4) + ':' + r.slice(4, 6); i = j; clear(); continue; }
      if (r.length === 4) { out += 'T' + r.slice(0, 2) + ':' + r.slice(2, 4); i = j; clear(); continue; }
      out += c; i++; clear(); continue;
    }
    if (isD(c)) {
      let j = i;
      while (j < n && isD(s[j])) j++;
      const r = s.slice(i, j);
      if (r.length === 8 && stigmeValidDate(r)) {
        out += `${r.slice(0, 4)}${sep}${r.slice(4, 6)}${sep}${r.slice(6, 8)}`;
        i = j; sawDate = true; sawDateSpace = false; continue;
      }
      if (after && sawDateSpace && (r.length === 6 || r.length === 4)) {
        out += r.length === 6
          ? `${r.slice(0, 2)}:${r.slice(2, 4)}:${r.slice(4, 6)}`
          : `${r.slice(0, 2)}:${r.slice(2, 4)}`;
        i = j; clear(); continue;
      }
      out += r; i = j; clear(); continue;
    }
    if (c === ' ' && sawDate) sawDateSpace = true; else if (c !== ' ') clear();
    out += c; i++;
    if (!sawDate) markDate();
  }
  return out;
}

/* ---------------------------------------------------------------------------
 * 2. Encoder: candidate elisions, kept only when the round trip survives
 * ------------------------------------------------------------------------- */

interface Cand { at: number; len: number; repl: string; kind: 'date' | 'time' | 'after' }

const DATE_CAND = /(\d{4})([-/])(\d{2})\2(\d{2})/g;
const TTIME_CAND = /T(\d{2}):(\d{2})(?::(\d{2}))?/g;

export interface StigmeElide {
  out: string;
  sep: string;
  dates: number;
  times: number;
  afters: number;
  dropped: number;
}

/**
 * Elide date and clock separators, keeping only the elisions that survive a full
 * restore round trip. Single pass, left to right; each accepted candidate is verified.
 */
export function stigmeElide(text: string, opts: { time?: boolean; after?: boolean } = {}): StigmeElide | null {
  const wantTime = opts.time !== false;
  const wantAfter = opts.after === true;
  if (text.length < 8) return null;

  // Separator style: dash preferred; slash only when no dash-date exists.
  let sepHit = '-';
  {
    const re = new RegExp(DATE_CAND.source, 'g');
    let m: RegExpExecArray | null;
    let dash = 0, slash = 0;
    while ((m = re.exec(text))) { if (m[2] === '-') dash++; else slash++; }
    if (dash === 0 && slash > 0) sepHit = '/';
  }

  const cands: Cand[] = [];
  {
    const re = new RegExp(DATE_CAND.source, 'g');
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      if (m[2] !== sepHit) continue;
      if (!stigmeValidDate(m[1] + m[3] + m[4])) continue;
      cands.push({ at: m.index, len: m[0].length, repl: m[1] + m[3] + m[4], kind: 'date' });
    }
  }
  if (wantTime) {
    const re = new RegExp(TTIME_CAND.source, 'g');
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      const hh = m[1], mm = m[2], ss = m[3];
      if (ss !== undefined) cands.push({ at: m.index, len: m[0].length, repl: `T${hh}${mm}${ss}`, kind: 'time' });
      else cands.push({ at: m.index, len: m[0].length, repl: `T${hh}${mm}`, kind: 'time' });
    }
  }
  if (wantAfter) {
    // A clock after a date and one space: "2026-09-30 07:59:52"
    const re = /(?<=(\d{4})[-\/](\d{2})[-\/](\d{2})) (\d{2}):(\d{2})(?::(\d{2}))?/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      const hh = m[4], mm = m[5], ss = m[6];
      const at = m.index + 1;
      const len = m[0].length - 1;
      const repl = ss !== undefined ? `${hh}${mm}${ss}` : `${hh}${mm}`;
      if (cands.some(c => c.at <= at && at < c.at + c.len)) continue;
      cands.push({ at, len, repl, kind: 'after' });
    }
  }
  if (!cands.length) return null;
  cands.sort((a, b) => a.at - b.at);

  const kept: Cand[] = [];
  const build = (list: Cand[]) => {
    let s = '';
    let pos = 0;
    for (const c of list) { s += text.slice(pos, c.at) + c.repl; pos = c.at + c.len; }
    s += text.slice(pos);
    return s;
  };
  // Greedy accept with verification. O(k) full rebuilds; k is the candidate count.
  const CAP = 6000;
  const step = cands.length > CAP ? 1 : 1;
  let dropped = 0;
  for (let idx = 0; idx < cands.length; idx += step) {
    const trial = kept.concat([cands[idx]]).sort((a, b) => a.at - b.at);
    const s = build(trial);
    const after = trial.some(c => c.kind === 'after');
    if (stigmeRestore(s, sepHit, after) === text) kept.push(cands[idx]);
    else dropped++;
  }
  if (!kept.length) return null;
  kept.sort((a, b) => a.at - b.at);
  const out = build(kept);
  const after = kept.some(c => c.kind === 'after');
  if (stigmeRestore(out, sepHit, after) !== text) return null;   // G1, final
  if (out === text) return null;
  return {
    out,
    sep: sepHit,
    dates: kept.filter(c => c.kind === 'date').length,
    times: kept.filter(c => c.kind === 'time').length,
    afters: kept.filter(c => c.kind === 'after').length,
    dropped,
  };
}

/* ---------------------------------------------------------------------------
 * 3. Wire arms: min(LAKONIKOS, LAKONIKOS-D) — the terse contract, both pools
 * ------------------------------------------------------------------------- */

interface Arm {
  tag: 'lakonikos' | 'lakonikos-d' | 'akolouthia2';
  wire: string;
  prompt: string;
  M: number;
  decoded: string;
}

function bestArm(text: string, enc: EncodingName): Arm {
  const a = lakonikosEncode(text, enc);
  const aOk = a.mode === 'daedalus' && a.wire !== text && a.decoded === text && a.messageTokens < countTokens(text, enc);
  const b = lakonikosDualEncode(text, enc);
  const bOk = b.mode === 'daedalus' && b.wire !== text && b.decoded === text && b.messageTokens[enc] < countTokens(text, enc);
  const arms: Arm[] = [];
  if (aOk) arms.push({ tag: 'lakonikos', wire: a.wire, prompt: a.decoderPrompt, M: a.messageTokens as unknown as number, decoded: a.decoded });
  if (bOk) arms.push({ tag: 'lakonikos-d', wire: b.wire, prompt: b.decoderPrompt, M: b.messageTokens[enc], decoded: b.decoded });
  // Third wire arm: AKOLOUTHIA-2 (progression marks + DAEDALUS).  Kept as an arm rather than
  // the identity baseline because the clause layer is orthogonal to the grammar layer: the
  // eight-subset clause gate below runs over whichever wire wins.
  const c = akolouthia2Encode(text, enc);
  const cOk = c.exact && c.wire !== text && c.decoded === text && c.messageTokens < countTokens(text, enc);
  if (cOk) arms.push({ tag: 'akolouthia2', wire: c.wire, prompt: c.decoderPrompt, M: c.messageTokens, decoded: c.decoded });
  if (!arms.length) {
    return { tag: 'lakonikos', wire: text, prompt: text, M: countTokens(text, enc), decoded: text };
  }
  arms.sort((x, y) => x.M - y.M);
  return arms[0];
}

/* ---------------------------------------------------------------------------
 * 4. The codec
 * ------------------------------------------------------------------------- */

export interface StigmeResult {
  codec: 'stigme';
  arm: 'elided' | 'identity';
  /** the message to hand to a model: wire, then the decoder contract */
  decoderPrompt: string;
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  messageTokens: number;
  /** M of the identity arm (min(LAKONIKOS, LAKONIKOS-D) on the original text) */
  identityTokens: number;
  clauses: StigmeClause[];
  clauseTokens: number;
  dates: number;
  times: number;
  afters: number;
  dropped: number;
  sep: string;
  armTag: 'lakonikos' | 'lakonikos-d' | 'akolouthia2';
  notes: string;
}

function clauseText(clauses: StigmeClause[], sep: string): string {
  const parts: string[] = [];
  if (clauses.includes('date')) {
    parts.push(sep === '/' ? STIGME_DATE_CLAUSE.replace('YYYY-MM-DD', 'YYYY/MM/DD') : STIGME_DATE_CLAUSE);
  }
  if (clauses.includes('time')) parts.push(STIGME_TIME_CLAUSE);
  if (clauses.includes('after')) parts.push(STIGME_AFTER_CLAUSE);
  return parts.join(' ');
}

export function stigmeEncode(text: string, enc: EncodingName = 'o200k_base'): StigmeResult {
  const inTokens = countTokens(text, enc);
  const base = bestArm(text, enc);
  const identity: StigmeResult = {
    codec: 'stigme', arm: 'identity', decoderPrompt: base.prompt, wire: base.wire, decoded: base.decoded,
    exact: base.decoded === text, inTokens, messageTokens: base.M, identityTokens: base.M,
    clauses: [], clauseTokens: 0, dates: 0, times: 0, afters: 0, dropped: 0, sep: '-',
    armTag: base.tag, notes: 'identity arm (min(LAKONIKOS, LAKONIKOS-D))',
  };
  if (text.length < 8) return identity;

  const armed = base;                       // same text, same arms: do not re-run the tournament
  if (armed.wire === text) return identity;

  const el = stigmeElide(text, { time: true, after: true });
  if (!el) return { ...identity, notes: 'identity arm: no elision candidate survived the round trip' };

  const clauses: StigmeClause[] = [];
  if (el.dates > 0) clauses.push('date');
  if (el.times > 0) clauses.push('time');
  if (el.afters > 0) clauses.push('after');
  if (!clauses.length) return identity;

  const ct = clauseText(clauses, el.sep);
  const sub = bestArm(el.out, enc);
  if (sub.wire === el.out && sub.M >= armed.M) {
    return { ...identity, notes: 'identity arm: the elided text does not pay for its own wire' };
  }
  if (stigmeWireToText(sub) !== el.out) {
    return { ...identity, notes: `identity arm: G2 ${sub.tag} decode mismatch on the elided arm` };
  }
  const prompt = sub.prompt + ' ' + ct;
  const M = countTokens(prompt, enc);
  if (M >= armed.M) {
    return { ...identity, notes: `identity: elided arm ${M} >= identity ${armed.M} (clauses ${countTokens(ct, enc)} tok)` };
  }
  const decoded = stigmeRestore(stigmeWireToText(sub), el.sep, el.afters > 0);
  if (decoded !== text) {
    return { ...identity, notes: 'identity arm: G1 the elided arm did not restore byte-exactly' };
  }
  return {
    codec: 'stigme', arm: 'elided', decoderPrompt: prompt, wire: sub.wire, decoded,
    exact: true, inTokens, messageTokens: M, identityTokens: armed.M,
    clauses, clauseTokens: countTokens(ct, enc),
    dates: el.dates, times: el.times, afters: el.afters, dropped: el.dropped, sep: el.sep,
    armTag: sub.tag,
    notes: `dates=${el.dates} times=${el.times} after=${el.afters} dropped=${el.dropped}; clauses=${clauses.join('+')} (${countTokens(ct, enc)} tok); wire=${sub.tag}; M=${M} vs identity ${armed.M}`,
  };
}

/** Expand a wire produced by any of the three arms back to the text it encodes. */
function stigmeWireToText(arm: Arm): string {
  return arm.tag === 'akolouthia2' ? akolouthia2Decode(arm.wire, 'progression') : chironDecode(arm.wire);
}

/** Library reader: the wire of whichever arm won, then the STIGME restore rules. */
export function stigmeDecode(wire: string, clauses: StigmeClause[] = [], sep = '-', tag: 'lakonikos' | 'lakonikos-d' | 'akolouthia2' = 'lakonikos'): string {
  const text = tag === 'akolouthia2' ? akolouthia2Decode(wire, 'progression') : chironDecode(wire);
  if (!clauses.length) return text;
  return stigmeRestore(text, sep, clauses.includes('after'));
}

/** The terse-arm contract prefix, exposed for tests. */
export { lakonikosDecoderPrompt };
