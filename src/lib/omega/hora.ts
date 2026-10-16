/**
 * src/lib/omega/hora.ts
 * =============================================================================
 * HORA (X13) — timestamp deltas inside a DAEDALUS message. Byte-exact. Marker ※ (U+203B); CHIRON uses § as a structural delimiter, so § is not the marker.
 *
 * WHAT IT IS (mechanism)
 * -----------------------------------------------------------------------------
 * Logs repeat a full timestamp "YYYY-MM-DD HH:MM:SS.mmm" on almost every line.
 * DAEDALUS sees the digits of each timestamp as literal text, because they
 * change on every line, so every line pays for its clock reading. Inside one
 * log the clock moves forward by a small amount between neighbouring lines.
 * HORA replaces every timestamp that falls on the SAME DATE as the previous
 * timestamp in the text with the marker  ※N,  where N is the signed difference
 * in milliseconds from that previous timestamp. The reader adds N back.
 *
 * This is not AKOLOUTHIA: AKOLOUTHIA needs the same step in the two previous
 * lines of one column, and it only sees digit runs. HORA works on a datetime
 * value, is independent of column position, and tolerates irregular steps.
 * It is not ANAPHORA-FOLD: nothing is copied from another line. It is a
 * delta on one value type.
 *
 * WIRE
 * -----------------------------------------------------------------------------
 *   literal timestamp:  any "YYYY-MM-DD HH:MM:SS.mmm" that is not replaced
 *   delta timestamp:    ※N   (N = optional '-' then decimal digits, |N| < 10000)
 *   Reader state: prev = the last timestamp in document order (literal or
 *   decoded). ※N decodes to prev + N ms, with the same date as prev.
 *
 * ENCODER RULES
 * -----------------------------------------------------------------------------
 *   - Refuse (identity) if the input contains the marker ※, or if no delta fires.
 *   - Replace a timestamp only if it has the same date as prev, its time of day
 *     is a valid time, and |delta| < 10000 ms. Otherwise write it literally.
 *   - prev is updated to every timestamp, replaced or not.
 *
 * GATES (encoder; every failure returns the identity arm = plain DAEDALUS)
 * -----------------------------------------------------------------------------
 *   G1  horaExpand(substituted) === input          (exact, TypeScript)
 *   G0  the marker's code point lies outside the DAEDALUS glyph alphabet (CHIRON script range)
 *   G2  DAEDALUS round trip on the substituted text
 *   G3  one-chat M (HORA contract + DAEDALUS message) < plain DAEDALUS M
 *   G4  horaDecode(wire, 'delta') === input       (end to end, the reader's own path)
 *
 * BOUNDARIES
 * -----------------------------------------------------------------------------
 * - Date changes are literal (no day roll-over arithmetic in the reader).
 * - Clock values with 6 or 9 fractional digits are not matched (literal).
 * - Timezone suffixes are untouched and copied as literal text.
 * =============================================================================
 */
import { countTokens, type EncodingName } from './bpe';
import { daedalusEncode, daedalusDecode, type DaedalusResult } from './daedalus';
import { CHIRON_SCRIPTS, chironInScript } from './chiron';

export const HORA_MARK = '※';   // U+203B: 1 o200k token; not used by CHIRON/DAEDALUS (checked X13)

/** The decoder rule, as the single sentence the reader must follow. */
export const HORA_CONTRACT =
  '※N = previous timestamp + N ms (N may be negative; same date; keep 3 ms digits).';

// Core of a timestamp: date, one separator (space or T), time, exactly 3 fraction digits.
// Lookbehind/lookahead on digits keep 6/9-digit fractions literal; a trailing Z or offset stays literal.
const TS = /(?<!\d)(\d{4})-(\d{2})-(\d{2})([ T])(\d{2}):(\d{2}):(\d{2})\.(\d{3})(?!\d)/g;
const TOKEN = /※(-?\d+)|(?<!\d)(\d{4})-(\d{2})-(\d{2})([ T])(\d{2}):(\d{2}):(\d{2})\.(\d{3})(?!\d)/g;
const DAY_MS = 86_400_000;
const MAX_DELTA = 9999;

function todMs(h: number, m: number, s: number, ms: number): number {
  return ((h * 60 + m) * 60 + s) * 1000 + ms;
}

function fmtTod(t: number): string {
  const ms = t % 1000;
  let s = Math.floor(t / 1000);
  const hh = Math.floor(s / 3600);
  s %= 3600;
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  const p = (x: number, n: number) => String(x).padStart(n, '0');
  return `${p(hh, 2)}:${p(mm, 2)}:${p(ss, 2)}.${p(ms, 3)}`;
}

/** Encoder: substitute ※N for each same-date timestamp that has a small delta. */
export function horaSubstitute(text: string): { out: string; marks: number } {
  if (text.includes(HORA_MARK)) return { out: text, marks: 0 };   // refuse: input already uses the marker
  let prevDate = '';
  let prevSep = '';
  let prevTod = -1;
  let marks = 0;
  const out = text.replace(TS, (whole, y, mo, d, sep, hh, mi, ss, ms) => {
    const date = `${y}-${mo}-${d}`;
    const tod = todMs(+hh, +mi, +ss, +ms);
    let res = whole;
    if (prevTod >= 0 && date === prevDate && sep === prevSep) {
      const delta = tod - prevTod;
      if (Math.abs(delta) <= MAX_DELTA) {
        res = `${HORA_MARK}${delta}`;
        marks++;
      }
    }
    prevDate = date;
    prevSep = sep;
    prevTod = tod;
    return res;
  });
  return { out, marks };
}

/** Reader: exact inverse of horaSubstitute (the rule the LLM applies). */
export function horaExpand(wire: string): string {
  let prevDate = '';
  let prevSep = '';
  let prevTod = -1;
  return wire.replace(TOKEN, (whole, delta, y, mo, d, sep, hh, mi, ss, ms) => {
    if (delta !== undefined) {
      if (prevTod < 0) throw new Error('hora: delta with no previous timestamp');
      const t = prevTod + Number(delta);
      if (t < 0 || t >= DAY_MS) throw new Error('hora: delta leaves the day');
      prevTod = t;                                  // every timestamp becomes prev, decoded or literal
      return `${prevDate}${prevSep}${fmtTod(t)}`;
    }
    prevDate = `${y}-${mo}-${d}`;
    prevSep = sep;
    prevTod = todMs(+hh, +mi, +ss, +ms);
    return whole;
  });
}

export interface HoraResult {
  codec: 'hora';
  arm: 'delta' | 'identity';
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

/** Full encoder with gates. Identity arm = plain DAEDALUS (never worse by construction). */
export function horaEncode(text: string, enc: EncodingName = 'o200k_base'): HoraResult {
  const inTokens = countTokens(text, enc);
  const plain = daedalusEncode(text, enc);
  const identity: HoraResult = {
    codec: 'hora', arm: 'identity', wire: plain.wire, decoded: plain.decoded, exact: plain.exact, marks: 0,
    inTokens, messageTokens: plain.messageTokens, daedalus: plain, decoderPrompt: plain.decoderPrompt,
    notes: 'identity arm (DAEDALUS plain)',
  };
  const { out, marks } = horaSubstitute(text);
  if (marks === 0) return identity;
  if (horaExpand(out) !== text) return identity;                                  // G1
  const d = daedalusEncode(out, enc);
  // G0: the marker must lie outside the glyph alphabet DAEDALUS used (CHIRON script ranges). The wire
  // legitimately contains the marker; what must not happen is a glyph in the marker's code point.
  const sc = CHIRON_SCRIPTS.find(x => x.name === d.script);
  if (sc && chironInScript(sc, HORA_MARK.codePointAt(0) as number)) return identity;
  if (!d.exact || daedalusDecode(d.wire) !== out) return identity;                 // G2
  const decoderPrompt = HORA_CONTRACT + '\n' + d.decoderPrompt;
  const M = countTokens(decoderPrompt, enc);
  if (M >= identity.messageTokens) {                                              // G3
    return { ...identity, notes: `identity: delta arm ${M} >= identity ${identity.messageTokens}` };
  }
  if (horaDecode(d.wire, 'delta') !== text) return identity;                       // G4: end-to-end, the reader's own path
  return {
    codec: 'hora', arm: 'delta', wire: d.wire, decoded: text, exact: true, marks, inTokens,
    messageTokens: M, daedalus: d, decoderPrompt,
    notes: `marks=${marks}; delta M=${M} vs identity ${identity.messageTokens}`,
  };
}

/** Library reader: DAEDALUS decode, then the timestamp rule (arm-aware). */
export function horaDecode(wire: string, arm: 'delta' | 'identity' = 'delta'): string {
  const expanded = daedalusDecode(wire);
  return arm === 'delta' ? horaExpand(expanded) : expanded;
}
