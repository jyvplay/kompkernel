/**
 * src/lib/omega/morphe.ts
 * =============================================================================
 * MORPHE / ΜΟΡΦΗ — per-payload auto-fitted shape-rule codec (X20).
 *
 * WHAT IT IS
 * -----------------------------------------------------------------------------
 * STIGME (X19) established the mechanism: bytes whose position is FIXED BY A SHAPE
 * RULE can be deleted, and the rule bought once in the contract.  STIGME shipped three
 * hard-coded rules (ISO date, T-time, clock-after-date) with three fixed clause strings.
 *
 * MORPHE is the same mechanism with the hard-coding removed.  A rule library is FITTED
 * TO THE PAYLOAD: each rule proposes its own parameter values (separator glyph, decimal
 * precision, timezone suffix, grouping style, ...), states its own precondition, and
 * GENERATES its own clause text from the fitted parameter.  A rule is accepted only if
 *
 *   (P1) its precondition holds on the payload            -- uniformity, verified below
 *   (P2) render(apply(payload)) === payload, byte for byte -- the reader's rule is total
 *   (P3) the wire of the transformed text plus the clause beats the identity arm
 *
 * and the whole set is re-verified with a byte-exact round trip through the real wire.
 *
 * WHY THE PRECONDITION IS THE WHOLE GAME
 * -----------------------------------------------------------------------------
 * A shape rule is a TOTAL FUNCTION on the transformed text: the reader applies it to
 * everything that matches, not only to the places we changed.  So a rule is admissible
 * only when the payload is UNIFORM under it.  Example: "pad to 6 decimals" is safe on
 * vix-daily (every number has exactly 6) and silently corrupts sp500 (which mixes
 * integers and 4-digit years).  Example: "every timestamp ends with +00:00" is safe only
 * if no timestamp in the payload ends any other way.  Every rule therefore carries a
 * uniformity test, and the test is re-checked after the fact by P2.
 *
 * THE CENTRAL NEGATIVE RESULT (from STIGME, re-confirmed here)
 * -----------------------------------------------------------------------------
 * Raw-token saving is not the prize -- the grammar already owns everything that REPEATS.
 * find-listing.txt: deleting date and time separators saves 720 raw o200k tokens and
 * exactly 0 tokens on the wire, because DAEDALUS was already merging the repeated
 * `2026-09-30T07:59:` prefix into one glyph and removing punctuation destroys the token
 * alignment that made that merge cheap.  A rule pays only where its instances VARY.
 * Consequently every candidate below is measured on the WIRE, never on raw text.
 *
 * GATES (every failure returns the identity arm)
 * -----------------------------------------------------------------------------
 *   G1  render(apply(text)) === text                          (byte-exact reader rule)
 *   G2  the chosen wire decodes to the transformed text       (grammar round trip)
 *   G3  render(decode(wire)) === text                         (end-to-end)
 *   G4  one-chat M (contract + clauses + wire) < identity M
 * =============================================================================
 */

import { countTokens, type EncodingName } from './bpe';
import { chironDecode } from './chiron';
import { akolouthia2Decode } from './akolouthia2';
import {
  stigmeElide, stigmeRestore, stigmeWireToText, bestArm,
  STIGME_DATE_CLAUSE, STIGME_TIME_CLAUSE, STIGME_AFTER_CLAUSE,
} from './stigme';

/* ---------------------------------------------------------------------------
 * 0. Rule abstraction
 * ------------------------------------------------------------------------- */

export interface MorpheFit {
  /** short key, used in receipts */
  name: string;
  /** the clause text handed to the reader; generated from the fitted parameter */
  clause: string;
  /** payload -> minimal form (what we transmit) */
  apply: (s: string) => string;
  /** minimal form -> payload (what the reader computes; used for verification) */
  render: (s: string) => string;
  /** how often the rule fires, for receipts */
  hits: number;
}

const DIGITS = '0123456789';

/* ---------------------------------------------------------------------------
 * 1. Rule library.  Each `fitX` returns null when the payload is not uniform.
 * ------------------------------------------------------------------------- */

/**
 * NUMPAD — uniform fixed-precision decimals.
 * If every decimal literal in the payload has exactly D fractional digits, the trailing
 * zeros carry no information: strip them and let the reader re-pad.  Fires on financial
 * and scientific exports; measured -208 tokens on vix-daily-1990.csv.
 */
function fitNumpad(text: string): MorpheFit | null {
  const widths = new Set<number>();
  let n = 0;
  for (const m of text.matchAll(/\d+\.(\d+)/g)) { widths.add(m[1].length); n++; }
  if (n < 8 || widths.size !== 1) return null;
  const D = [...widths][0];
  if (D < 2 || D > 12) return null;
  const apply = (s: string) => s.replace(/(\d+\.\d*?)0+(?=\D|$)/g, '$1');
  const render = (s: string) =>
    s.replace(/(\d+\.(\d*))(?=\D|$)/g, (_m, whole: string, frac: string) => {
      if (frac.length > D) return whole;                 // cannot happen after apply; be safe
      return whole + '0'.repeat(D - frac.length);
    });
  const out = apply(text);
  if (render(out) !== text) return null;                 // P2
  return {
    name: `numpad${D}`, clause: `Pad numbers to ${D} decimals with zeros.`,
    apply, render, hits: n,
  };
}

/**
 * TZ — uniform timezone suffix on clock literals.
 * Every `HH:MM:SS`/`THHMMSS` carries the same offset, so the offset is a constant of the
 * document rather than a per-row fact.
 */
const CLOCK = '((?:T\\d{6})|(?:\\d{2}:\\d{2}:\\d{2}))';
const OFFSET = '[+-]\\d{2}:\\d{2}|Z';

function fitTz(text: string): MorpheFit | null {
  const clocks = text.match(new RegExp(CLOCK, 'g')) || [];
  if (clocks.length < 8) return null;

  // Every clock must end in a recognisable offset; otherwise "add the dominant one" is not
  // a total function the reader can evaluate.
  const withAny = text.match(new RegExp(`${CLOCK}(?:${OFFSET})`, 'g')) || [];
  if (withAny.length !== clocks.length) return null;

  // NB: CLOCK is itself group 1, so the offset is group 2.
  const tally = new Map<string, number>();
  for (const m of text.matchAll(new RegExp(`${CLOCK}(${OFFSET})`, 'g'))) {
    tally.set(m[2], (tally.get(m[2]) ?? 0) + 1);
  }
  if (!tally.size) return null;
  let suffix = ''; let bestN = -1;
  for (const [k, v] of tally) if (v > bestN) { bestN = v; suffix = k; }
  if (bestN < 4) return null;

  const esc = suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const apply = (s: string) => s.replace(new RegExp(`${CLOCK}${esc}`, 'g'), '$1');
  // Re-attach to clocks that do NOT already carry an offset of their own.
  const render = (s: string) => s.replace(new RegExp(`${CLOCK}(?!\\s*(?:${OFFSET}))`, 'g'), `$1${suffix}`);
  const out = apply(text);
  if (render(out) !== text) return null;                 // P2
  return {
    name: `tz${suffix}`, clause: `A clock with no offset ends with ${suffix}.`,
    apply, render, hits: bestN,
  };
}

/**
 * THOUSANDS — uniform comma grouping of integers.
 * Grouping by threes from the right is a total function on integers, so it is safe only
 * when the payload contains NO ungrouped integer of 4+ digits (a bare year "1957" would
 * otherwise be rewritten "1,957").
 */
function fitThousands(text: string): MorpheFit | null {
  const grouped = text.match(/(?<![\d.,:])(\d{1,3}(?:,\d{3})+)(?![\d.,:])/g) || [];
  const bare = text.match(/(?<![\d.,:])(\d{4,})(?![\d.,:])/g) || [];
  if (grouped.length < 8 || bare.length > 0) return null;
  const apply = (s: string) => s.replace(/(?<=\d),(?=\d{3}(?!\d))/g, '');
  const render = (s: string) =>
    s.replace(/(?<![\d.,:])(\d{4,})(?![\d.,:])/g, (m) => m.replace(/\B(?=(?:\d{3})+(?!\d))/g, ','));
  const out = apply(text);
  if (render(out) !== text) return null;                 // P2
  return {
    name: 'thousands', clause: 'Group integers by threes from the right with commas.',
    apply, render, hits: grouped.length,
  };
}

/**
 * URL — the scheme prefix of every URL.  Deliberately uses U+27E8/U+27E9, which are
 * outside every Chiron glyph script and outside the § / ¶ structural markers.
 */
function fitUrl(text: string): MorpheFit | null {
  const n = (text.match(/https?:\/\//g) || []).length;
  if (n < 4) return null;
  const apply = (s: string) => s.replace(/https:\/\//g, '〈').replace(/http:\/\//g, '〉');
  const render = (s: string) => s.replace(/〈/g, 'https://').replace(/〉/g, 'http://');
  const out = apply(text);
  if (render(out) !== text) return null;
  return { name: 'url', clause: '〈 is https:// and 〉 is http://.', apply, render, hits: n };
}

/** UUID — the 8-4-4-4-12 dash layout is fixed. */
function fitUuid(text: string): MorpheFit | null {
  const re = /\b([0-9a-fA-F]{8})-([0-9a-fA-F]{4})-([0-9a-fA-F]{4})-([0-9a-fA-F]{4})-([0-9a-fA-F]{12})\b/g;
  const n = (text.match(re) || []).length;
  if (n < 4) return null;
  const apply = (s: string) => s.replace(re, '$1$2$3$4$5');
  const render = (s: string) =>
    s.replace(/\b[0-9a-fA-F]{32}\b/g, (m) =>
      `${m.slice(0, 8)}-${m.slice(8, 12)}-${m.slice(12, 16)}-${m.slice(16, 20)}-${m.slice(20)}`);
  const out = apply(text);
  if (render(out) !== text) return null;
  return { name: 'uuid', clause: 'A 32-hex run is a UUID: dashes at 8-4-4-4-12.', apply, render, hits: n };
}

/** HEX — a 6-hex run in a style context is a colour. */
function fitHex(text: string): MorpheFit | null {
  const re = /#([0-9a-fA-F]{6})\b/g;
  const n = (text.match(re) || []).length;
  if (n < 6) return null;
  const apply = (s: string) => s.replace(re, '$1');
  const render = (s: string) => s.replace(/\b[0-9a-fA-F]{6}\b/g, (m) => `#${m}`);
  const out = apply(text);
  if (render(out) !== text) return null;
  return { name: 'hex', clause: 'A 6-hex run is a colour: prefix #.', apply, render, hits: n };
}

/** HTMLENT — the five XML entities have canonical single-character expansions. */
function fitEntity(text: string): MorpheFit | null {
  const pairs: [RegExp, string][] = [
    [/&amp;/g, '&'], [/&lt;/g, '<'], [/&gt;/g, '>'], [/&quot;/g, '"'], [/&#39;/g, "'"],
  ];
  let n = 0;
  for (const [re] of pairs) n += (text.match(re) || []).length;
  if (n < 6) return null;
  const back: [RegExp, string][] = [
    [/&/g, '&amp;'], [/</g, '&lt;'], [/>/g, '&gt;'], [/"/g, '&quot;'], [/'/g, '&#39;'],
  ];
  const apply = (s: string) => { let o = s; for (const [re, ch] of pairs) o = o.replace(re, ch); return o; };
  const render = (s: string) => { let o = s; for (const [re, en] of back) o = o.replace(re, en); return o; };
  const out = apply(text);
  if (render(out) !== text) return null;
  return { name: 'htmlent', clause: 'Restore XML entities: & < > " \' as &amp; &lt; &gt; &quot; &#39;.', apply, render, hits: n };
}

const LIBRARY = [fitNumpad, fitTz, fitThousands, fitUrl, fitUuid, fitHex, fitEntity];

/* ---------------------------------------------------------------------------
 * 2. Encoding
 * ------------------------------------------------------------------------- */

export interface MorpheResult {
  codec: 'morphe';
  arm: 'elided' | 'identity';
  decoderPrompt: string;
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  messageTokens: number;
  identityTokens: number;
  clauses: string[];
  clauseTokens: number;
  /** rules that were fitted AND survived the wire gate */
  rules: string[];
  /** rules that fitted but were rejected by the wire gate */
  rejected: string[];
  /** rule -> how many times it fired */
  hits: Record<string, number>;
  sep: string;
  after: boolean;
  dates: number;
  times: number;
  afters: number;
  dropped: number;
  armTag: string;
  notes: string;
}

interface Plan {
  rules: MorpheFit[];
  clauses: string[];
  text: string;
  stigmeSep: string;
  stigmeAfter: boolean;
  dates: number; times: number; afters: number; dropped: number;
  render: (s: string) => string;
}

/** Build the transformed text for a given rule subset (order: STIGME shapes, then library). */
function buildPlan(text: string, fits: MorpheFit[], wantStigme: boolean): Plan | null {
  let cur = text;
  const renderers: ((s: string) => string)[] = [];
  let sep = '-', after = false;
  let dates = 0, times = 0, afters = 0, dropped = 0;

  if (wantStigme) {
    const el = stigmeElide(cur, { time: true, after: true });
    if (el) {
      cur = el.out; sep = el.sep; after = el.afters > 0;
      dates = el.dates; times = el.times; afters = el.afters; dropped = el.dropped;
      renderers.push((s) => stigmeRestore(s, sep, after));
    }
  }
  for (const f of fits) { cur = f.apply(cur); renderers.push(f.render); }

  // G1: the reader's rule, replayed in reverse order, must be the identity on `text`.
  const render = (s: string) => { let o = s; for (let i = renderers.length - 1; i >= 0; i--) o = renderers[i](o); return o; };
  if (render(cur) !== text) return null;

  const clauses: string[] = [];
  if (wantStigme) {
    if (dates > 0) clauses.push(sep === '/' ? STIGME_DATE_CLAUSE.replace('YYYY-MM-DD', 'YYYY/MM/DD') : STIGME_DATE_CLAUSE);
    if (times > 0) clauses.push(STIGME_TIME_CLAUSE);
    if (afters > 0) clauses.push(STIGME_AFTER_CLAUSE);
  }
  for (const f of fits) clauses.push(f.clause);
  return { rules: fits, clauses, text: cur, stigmeSep: sep, stigmeAfter: after, dates, times, afters, dropped, render };
}

export function morpheEncode(text: string, enc: EncodingName = 'o200k_base'): MorpheResult {
  const inTokens = countTokens(text, enc);
  const base = bestArm(text, enc);
  const identity: MorpheResult = {
    codec: 'morphe', arm: 'identity', decoderPrompt: base.prompt, wire: base.wire,
    decoded: base.decoded, exact: base.decoded === text, inTokens,
    messageTokens: base.M, identityTokens: base.M,
    clauses: [], clauseTokens: 0, rules: [], rejected: [], hits: {},
    sep: '-', after: false, dates: 0, times: 0, afters: 0, dropped: 0,
    armTag: base.tag, notes: `identity arm (${base.tag})`,
  };
  if (text.length < 8) return identity;

  // Fit every rule whose precondition (P1) and reader-rule totality (P2) hold.
  const fits: MorpheFit[] = [];
  for (const f of LIBRARY) {
    try { const r = f(text); if (r) fits.push(r); } catch { /* regex/refusals: skip */ }
  }
  const wantStigme = true;
  const clauseTokOf = (cs: string[]) => (cs.length ? countTokens(cs.join(' '), enc) : 0);

  const tryPlan = (subset: MorpheFit[]): { plan: Plan; arm: ReturnType<typeof bestArm>; M: number } | null => {
    const plan = buildPlan(text, subset, wantStigme);
    if (!plan) return null;
    if (plan.text === text) return null;
    const arm = bestArm(plan.text, enc);
    if (stigmeWireToText(arm) !== plan.text) return null;              // G2
    const M = arm.M + clauseTokOf(plan.clauses);
    return { plan, arm, M };
  };

  // Attempt 1: the full fitted set.
  let best = tryPlan(fits);

  // Attempt 2: backward elimination.  Rules interact through the grammar -- TZ on
  // git-log-iso passes every gate alone (1493 < identity 1520) yet costs +5 next to the
  // set without it (1488), because the grammar already owned part of "+00:00".  So the
  // shipped set is not "everything that fits"; it is the result of dropping each rule in
  // turn, cheapest first, and keeping the drop whenever the wire gets smaller.
  // Bounded at 3 extra wire encodes.
  if (best && best.M < base.M) {
    let cur = fits.slice();
    let tries = 0;
    for (const drop of [...fits].sort((a, b) => a.hits - b.hits)) {
      if (tries >= 3) break;
      if (!cur.includes(drop)) continue;
      const sub = cur.filter((f) => f !== drop);
      const t = tryPlan(sub);
      tries++;
      if (t && t.M < best!.M) { best = t; cur = sub; }
    }
  }

  // Attempt 3: the full set (and every subset of it) lost -- try each rule alone, so a
  // single expensive clause cannot veto a rule that pays on its own.
  if (!best || best.M >= base.M) {
    const singles = [...fits].sort((a, b) => b.hits - a.hits).slice(0, 3);
    for (const f of singles) {
      const t = tryPlan([f]);
      if (t && (!best || t.M < best.M)) best = t;
    }
  }

  if (!best || best.M >= base.M) {                                     // G4
    const names = fits.map((f) => f.name);
    return { ...identity, rejected: names, notes: `identity arm: rules fitted [${names.join(',')}] but none paid (best ${best ? best.M : 'n/a'} vs identity ${base.M})` };
  }

  const { plan, arm, M } = best;
  const decoded = plan.render(stigmeWireToText(arm));                  // G3
  if (decoded !== text) {
    return { ...identity, rejected: fits.map((f) => f.name), notes: 'identity arm: G3 end-to-end mismatch' };
  }

  const clauseText = plan.clauses.join(' ');
  const prompt = arm.prompt + ' ' + clauseText;
  const accepted = plan.rules.map((f) => f.name).concat(
    [plan.dates > 0 ? 'date' : '', plan.times > 0 ? 'time' : '', plan.afters > 0 ? 'after' : ''].filter(Boolean));
  const rejected = fits.filter((f) => !plan.rules.includes(f)).map((f) => f.name);
  const hits: Record<string, number> = {};
  if (plan.dates) hits.date = plan.dates;
  if (plan.times) hits.time = plan.times;
  if (plan.afters) hits.after = plan.afters;
  for (const f of plan.rules) hits[f.name] = f.hits;

  return {
    codec: 'morphe', arm: 'elided', decoderPrompt: prompt, wire: arm.wire, decoded, exact: true,
    inTokens, messageTokens: M, identityTokens: base.M,
    clauses: plan.clauses, clauseTokens: countTokens(clauseText, enc),
    rules: accepted, rejected, hits,
    sep: plan.stigmeSep, after: plan.stigmeAfter,
    dates: plan.dates, times: plan.times, afters: plan.afters, dropped: plan.dropped,
    armTag: arm.tag,
    notes: `rules=${accepted.join('+')} (${countTokens(clauseText, enc)} tok); rejected=[${rejected.join(',')}]; wire=${arm.tag}; M=${M} vs identity ${base.M}`,
  };
}

/**
 * Library reader: expand the wire, then undo the fitted rules.
 *
 * The encoder applied STIGME's shape rules FIRST and the library rules AFTER, so the
 * reader undoes the library rules first and STIGME's last.  That order is load-bearing for
 * TZ: the offset has to be re-attached to the packed `THHMMSS` run before the time clause
 * unpacks it into `HH:MM:SS`.
 */
export function morpheDecode(
  wire: string,
  opts: { rules?: string[]; sep?: string; after?: boolean; tag?: string } = {},
): string {
  let text = (opts.tag ?? 'lakonikos') === 'akolouthia2'
    ? akolouthia2Decode(wire, 'progression')
    : chironDecode(wire);
  const names = new Set(opts.rules ?? []);
  const sep = opts.sep ?? '-';
  const after = opts.after === true;

  if (names.has('htmlent')) text = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  if (names.has('hex')) text = text.replace(/\b[0-9a-fA-F]{6}\b/g, (m) => `#${m}`);
  if (names.has('uuid')) text = text.replace(/\b[0-9a-fA-F]{32}\b/g, (m) => `${m.slice(0, 8)}-${m.slice(8, 12)}-${m.slice(12, 16)}-${m.slice(16, 20)}-${m.slice(20)}`);
  if (names.has('url')) text = text.replace(/\u27e8/g, 'https://').replace(/\u27e9/g, 'http://');
  if (names.has('thousands')) text = text.replace(/(?<![\d.,:])(\d{4,})(?![\d.,:])/g, (m) => m.replace(/\B(?=(?:\d{3})+(?!\d))/g, ','));
  const tzName = [...names].find((n) => n.startsWith('tz'));
  if (tzName) {
    const suffix = tzName.slice(2);
    text = text.replace(new RegExp(`${CLOCK}(?!\\s*(?:${OFFSET}))`, 'g'), `$1${suffix}`);
  }
  const np = [...names].find((n) => n.startsWith('numpad'));
  if (np) {
    const D = parseInt(np.slice(6), 10);
    text = text.replace(/(\d+\.(\d*))(?=\D|$)/g, (_m, whole: string, frac: string) =>
      frac.length >= D ? whole : whole + '0'.repeat(D - frac.length));
  }
  return stigmeRestore(text, sep, after);
}
