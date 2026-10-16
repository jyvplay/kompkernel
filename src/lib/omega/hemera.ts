/**
 * src/lib/omega/hemera.ts
 * =============================================================================
 * HEMERA (X14) — calendar-day deltas, plus HORA's millisecond deltas, inside a
 * DAEDALUS message. Byte-exact. Marker ※ (U+203B), as in HORA.
 *
 * WHAT IT IS (mechanism)
 * -----------------------------------------------------------------------------
 * A column of calendar dates (daily prices, daily metrics, dated records) is a
 * sequence whose step is usually 1–3 days. DAEDALUS sees each date as digits
 * that change on every row, so every row pays for its date again. HEMERA writes
 * a date that is 1..DAY_MAX days away from the previous date as  ※dN , where N is
 * the signed day count. The reader adds N to the previous date.
 *
 * HORA's millisecond delta is kept as a second, separate mark: a full
 * "YYYY-MM-DD HH:MM:SS.mmm" on the same date as the previous timestamp, with the
 * same separator, is written as  ※N  (N in ms). A date token keeps any time that
 * follows it as literal text, so a datetime's clock is never altered by a day mark.
 *
 * WIRE
 * -----------------------------------------------------------------------------
 *   date token:           ※dN            N = optional '-' then digits, |N| <= DAY_MAX
 *                         replaces the date only; a following " HH:MM:SS[.mmm]" stays literal
 *   millisecond token:    ※N             N = optional '-' then digits, |N| <= MS_MAX
 *                         replaces a whole timestamp on the previous timestamp's date
 *   literal date:         YYYY-MM-DD     any valid date that is not replaced
 *   Reader state, two parts (X14 repair):
 *     lastDay            day number of the last valid date of ANY kind; day marks use it.
 *     fullDay/fullSep/fullTod  from the last valid date that carries a time; fullTod is
 *                        ms-of-day when the fraction is present, else -1. Ms marks use these,
 *                        and an ms mark sets lastDay = fullDay.
 *   Date-only tokens move lastDay only, so a file-name date cannot clear the time state.
 *
 * VALIDITY
 * -----------------------------------------------------------------------------
 *   A date is valid if year >= 1, month 1..12 and day within the month of the
 *   proleptic Gregorian calendar. Invalid or year-0000 dates are literal and do not
 *   update state (both encoder and reader apply this rule).
 *
 * THREE ARMS, THREE CONTRACTS
 * -----------------------------------------------------------------------------
 *   'ms'    HEMERA_CONTRACT_MS    (= HORA's contract, 23 tokens): ms marks only
 *   'days'  HEMERA_CONTRACT_DAYS  (23 tokens): day marks only
 *   'both'  HEMERA_CONTRACT_BOTH  (36 tokens): day and ms marks
 *   The encoder runs every arm that has marks, keeps the one with the smallest M that passes all
 *   gates, and falls back to identity when none pays.
 *
 * GATES (encoder; every failure falls back to the identity arm = plain DAEDALUS)
 * -----------------------------------------------------------------------------
 *   G1  hemeraExpand(substituted) === input          (exact, TypeScript)
 *   G0  the marker's code point lies outside the DAEDALUS glyph alphabet (CHIRON script range)
 *   G2  DAEDALUS round trip on the substituted text
 *   G3  one-chat M (contract + DAEDALUS decoder prompt) < plain DAEDALUS M
 *   G4  hemeraDecode(wire, arm) === input           (end to end, the reader's own path)
 *
 * BOUNDARIES
 * -----------------------------------------------------------------------------
 * - Day steps larger than DAY_MAX stay literal. The default DAY_MAX = 31 (one
 *   month) keeps unordered date columns (birthdays, listing dates) literal; they
 *   usually fail G3 and fall back.
 * - Years are 4 digits; 6- or 9-digit fractions are not matched.
 * - Timezone suffixes (Z, +02:00) are literal text after the match.
 * =============================================================================
 */
import { countTokens, type EncodingName } from './bpe';
import { daedalusEncode, daedalusDecode, type DaedalusResult } from './daedalus';
import { CHIRON_SCRIPTS, chironInScript } from './chiron';

export const HEMERA_MARK = '※';   // U+203B; same marker as HORA (not a CHIRON or DAEDALUS glyph; checked X13)

export const DAY_MAX = 31;
export const MS_MAX = 9999;
const MS_DAY = 86_400_000;

export const HEMERA_CONTRACT_DAYS =
  '※dN = the previous date plus N days (N may be negative); write dates as YYYY-MM-DD.';
// Identical to HORA_CONTRACT (23 tokens): the ms-only arm is HORA's rule, byte for byte.
export const HEMERA_CONTRACT_MS =
  '※N = previous timestamp + N ms (N may be negative; same date; keep 3 ms digits).';
// Combined arm: the shortest wording that keeps the two format rules (YYYY-MM-DD, 3 ms digits). 36 tokens.
export const HEMERA_CONTRACT_BOTH =
  '※dN = previous date + N days (YYYY-MM-DD). ※N = previous timestamp + N ms (same date; 3 ms digits). N may be negative.';

export type HemeraArm = 'days' | 'ms' | 'both' | 'identity';

// --- proleptic Gregorian day numbers (Howard Hinnant's days_from_civil / civil_from_days) ---
export function daysFromCivil(y: number, m: number, d: number): number {
  const yy = m <= 2 ? y - 1 : y;
  const era = Math.floor(yy / 400);
  const yoe = yy - era * 400;
  const mp = (m + 9) % 12;                       // March = 0
  const doy = Math.floor((153 * mp + 2) / 5) + d - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}

export function civilFromDays(z0: number): [number, number, number] {
  const z = z0 + 719468;
  const era = Math.floor(z / 146097);
  const doe = z - era * 146097;
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
  let y = yoe + era * 400;
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const d = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const m = mp < 10 ? mp + 3 : mp - 9;
  if (m <= 2) y += 1;
  return [y, m, d];
}

function pad(x: number, n: number): string {
  return String(x).padStart(n, '0');
}

/** Valid date: year >= 1 and the (y,m,d) triple is a real date. */
export function validDate(y: number, m: number, d: number): boolean {
  if (y < 1 || m < 1 || m > 12 || d < 1) return false;
  const [yy, mm, dd] = civilFromDays(daysFromCivil(y, m, d));
  return yy === y && mm === m && dd === d;
}

function fmtDay(z: number): string {
  const [y, m, d] = civilFromDays(z);
  return `${pad(y, 4)}-${pad(m, 2)}-${pad(d, 2)}`;
}

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
  return `${pad(hh, 2)}:${pad(mm, 2)}:${pad(ss, 2)}.${pad(ms, 3)}`;
}

// Literal date with an optional time. The time group is shared by the encoder's scan
// and by the reader's regex, so both sides see identical matches.
const TIME = '(?:([ T])(\\d{2}):(\\d{2}):(\\d{2})(\\.\\d{3}(?!\\d))?)?';
const LITERAL = `(?<!\\d)(\\d{4})-(\\d{2})-(\\d{2})${TIME}(?!\\d)`;
// Reader: ※dN [time] | ※N | literal date [time]
const READ = new RegExp(
  `※d(-?\\d+)${TIME}|※(-?\\d+)|${LITERAL}`,
  'g',
);
const SCAN = new RegExp(LITERAL, 'g');

interface Flags { day: boolean; ms: boolean; }

/** Encoder: substitute day and/or ms marks. Returns the substituted text and mark counts. */
/**
 * State (encoder and reader apply the same rules, in document order):
 *   lastDay  : day number of the last VALID date of any kind (date-only or with a time).
 *              A day mark ※dN is relative to lastDay.
 *   full*    : fullDay / fullSep / fullTod, from the last valid date that carries a time.
 *              fullTod is the ms-of-day when the time has a 3-digit fraction, else -1.
 *              An ms mark ※N is relative to fullTod on fullDay with fullSep.
 * Date-only matches (for example a date inside a file name) move lastDay only, so they never
 * clear the time state. This is what lets the ms arm run on logs that carry dates in file names.
 */
export function hemeraSubstitute(text: string, flags: Flags): { out: string; days: number; ms: number } {
  if (text.includes(HEMERA_MARK)) return { out: text, days: 0, ms: 0 };   // refuse: input uses the marker
  let lastDay: number | null = null;
  let fullDay: number | null = null;
  let fullSep = '';
  let fullTod = -1;
  let days = 0, ms = 0;
  const out = text.replace(SCAN, (whole, y, mo, d, sep, hh, mi, ss, frac) => {
    const yi = +y, mo2 = +mo, di = +d;
    if (!validDate(yi, mo2, di)) return whole;                // invalid: literal, no state change
    const z = daysFromCivil(yi, mo2, di);
    const hasTime = sep !== undefined;
    const hasFrac = frac !== undefined;
    const tod = hasTime && hasFrac && +hh < 24 && +mi < 60 && +ss < 60
      ? todMs(+hh, +mi, +ss, Number(frac.slice(1))) : -1;
    let res = whole;
    if (flags.ms && hasFrac && tod >= 0 && fullDay !== null && fullTod >= 0 && z === fullDay && sep === fullSep
        && Math.abs(tod - fullTod) <= MS_MAX) {
      res = `${HEMERA_MARK}${tod - fullTod}`;
      ms++;
    } else if (flags.day && lastDay !== null && z !== lastDay && Math.abs(z - lastDay) <= DAY_MAX) {
      res = `${HEMERA_MARK}d${z - lastDay}` + (hasTime ? whole.slice(10) : '');
      days++;
    }
    lastDay = z;
    if (hasTime) { fullDay = z; fullSep = sep; fullTod = tod; }
    return res;
  });
  return { out, days, ms };
}

/** Reader: exact inverse of hemeraSubstitute (the rule the LLM applies). */
export function hemeraExpand(wire: string): string {
  let lastDay: number | null = null;
  let fullDay: number | null = null;
  let fullSep = '';
  let fullTod = -1;
  return wire.replace(READ, (whole, dn, dsep, dh, dmi, dss, dfrac, msn, y, mo, d, sep, hh, mi, ss, frac) => {
    if (dn !== undefined) {                                      // ※dN [time]
      if (lastDay === null) throw new Error('hemera: date delta with no previous date');
      const z = lastDay + Number(dn);
      lastDay = z;
      if (dsep !== undefined) {
        fullDay = z;
        fullSep = dsep;
        fullTod = dfrac !== undefined && +dh < 24 && +dmi < 60 && +dss < 60
          ? todMs(+dh, +dmi, +dss, Number(dfrac.slice(1))) : -1;
        return fmtDay(z) + `${dsep}${dh}:${dmi}:${dss}${dfrac ?? ''}`;
      }
      return fmtDay(z);
    }
    if (msn !== undefined) {                                     // ※N
      if (fullDay === null || fullTod < 0) throw new Error('hemera: ms delta with no previous timestamp');
      const t = fullTod + Number(msn);
      if (t < 0 || t >= MS_DAY) throw new Error('hemera: ms delta leaves the day');
      fullTod = t;
      lastDay = fullDay;
      return `${fmtDay(fullDay)}${fullSep}${fmtTod(t)}`;
    }
    if (!validDate(+y, +mo, +d)) return whole;                   // invalid: literal, no state change
    const z = daysFromCivil(+y, +mo, +d);
    lastDay = z;
    if (sep !== undefined) {
      fullDay = z;
      fullSep = sep;
      fullTod = frac !== undefined && +hh < 24 && +mi < 60 && +ss < 60
        ? todMs(+hh, +mi, +ss, Number(frac.slice(1))) : -1;
    }
    return whole;
  });
}

export interface HemeraResult {
  codec: 'hemera';
  arm: HemeraArm;
  wire: string;
  decoded: string;
  exact: boolean;
  days: number;
  ms: number;
  inTokens: number;
  messageTokens: number;
  daedalus: DaedalusResult;
  decoderPrompt: string;
  notes: string;
}

/** Full encoder with gates. Identity arm = plain DAEDALUS (never worse by construction). */
export function hemeraEncode(text: string, enc: EncodingName = 'o200k_base'): HemeraResult {
  const inTokens = countTokens(text, enc);
  const plain = daedalusEncode(text, enc);
  const identity: HemeraResult = {
    codec: 'hemera', arm: 'identity', wire: plain.wire, decoded: plain.decoded, exact: plain.exact,
    days: 0, ms: 0, inTokens, messageTokens: plain.messageTokens, daedalus: plain,
    decoderPrompt: plain.decoderPrompt, notes: 'identity arm (DAEDALUS plain)',
  };
  // Three arms, each with the contract that states exactly the marks it uses. The cheapest arm that
  // passes every gate is chosen; a tie keeps the earlier arm in this list.
  const candidates: { arm: 'days' | 'ms' | 'both'; flags: Flags; contract: string }[] = [
    { arm: 'ms', flags: { day: false, ms: true }, contract: HEMERA_CONTRACT_MS },
    { arm: 'days', flags: { day: true, ms: false }, contract: HEMERA_CONTRACT_DAYS },
    { arm: 'both', flags: { day: true, ms: true }, contract: HEMERA_CONTRACT_BOTH },
  ];
  let best: HemeraResult | null = null;
  for (const c of candidates) {
    const { out, days, ms } = hemeraSubstitute(text, c.flags);
    if (days + ms === 0) continue;
    if (hemeraExpand(out) !== text) continue;                                   // G1
    const d = daedalusEncode(out, enc);
    const sc = CHIRON_SCRIPTS.find(x => x.name === d.script);                    // G0
    if (sc && chironInScript(sc, HEMERA_MARK.codePointAt(0) as number)) continue;
    if (!d.exact || daedalusDecode(d.wire) !== out) continue;                    // G2
    const decoderPrompt = c.contract + '\n' + d.decoderPrompt;
    const M = countTokens(decoderPrompt, enc);
    if (M >= identity.messageTokens) continue;                                   // G3
    if (hemeraDecode(d.wire, c.arm) !== text) continue;                          // G4
    if (!best || M < best.messageTokens) {
      best = {
        codec: 'hemera', arm: c.arm, wire: d.wire, decoded: text, exact: true, days, ms,
        inTokens, messageTokens: M, daedalus: d, decoderPrompt,
        notes: `days=${days}; ms=${ms}; M=${M} vs identity ${identity.messageTokens}`,
      };
    }
  }
  return best ?? identity;
}

/** Library reader: DAEDALUS decode, then the temporal rule (arm-aware). */
export function hemeraDecode(wire: string, arm: HemeraArm = 'both'): string {
  const expanded = daedalusDecode(wire);
  return arm === 'identity' ? expanded : hemeraExpand(expanded);
}
