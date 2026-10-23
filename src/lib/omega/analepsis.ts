/**
 * ANALEPSIS (ἀνάληψις — "a taking up again, a resumption").
 *
 * X44. A second gleaning pass over the wire the stack has already finished with.
 *
 * WHY THIS EXISTS
 * ---------------------------------------------------------------------------
 * X44 asked a question no earlier turn had asked: after CHIRON's smallest-grammar
 * search has run and every layer above it has settled, is there anything LEFT in
 * the body worth a rule? bench/x44/greedy.ts scanned the shipped bodies of four
 * lanes for maximal repeated substrings with overlapping windows collapsed, so
 * that "administ", "dministr", "ministra" and "inistrat" count as one find rather
 * than four, and priced each at its measured token count minus a two-token rule
 * definition. It found real residue: " JavaScript " three times and " for you to "
 * twice in readme, "baseline-browser-mapping" and "browserslist" twice each in
 * ls-full-iso, " Q3 reconciliation" and " remittance " in email-thread.
 *
 * The residue is SMALL — that is reported honestly below and not dressed up. What
 * makes it worth a codec is that it is harvestable at zero risk, because every
 * single addition is accepted only on a measured token reduction of the whole
 * frame plus a verified byte-exact decode. The pass cannot make a wire worse, and
 * it cannot make one undecodable, because both are checked before the change is
 * kept.
 *
 * WHY MAXIMAL REPEATS AND NOT BIGRAMS
 * ---------------------------------------------------------------------------
 * CHIRON's search is frequency-driven, which is the Re-Pair strategy: take the
 * most frequent substring first. MR-RePair (Nakashima, Algorithms 13(4):103, 2020)
 * replaces the most frequent MAXIMAL repeat instead, and reports grammars about
 * 55 per cent the size of Re-Pair's on highly repetitive text, with a proof that
 * under a stated condition the maximal-repeat grammar is no larger than Re-Pair's.
 * Maximal repeats are exactly what the first pass tends to leave behind, because a
 * frequent short substring is consumed early and the longer repeat that contains
 * it is then never reconsidered as a unit. ANALEPSIS is that reconsideration.
 *
 * This is not a claim that CHIRON is wrong. bench/x44/greedy.ts also ran exact
 * greedy single-rule REMOVAL on the same wires and found that not one rule out of
 * 31, 27, 36 or 39 could be deleted for a gain — the rule set is already optimal
 * under removal. ANALEPSIS works in the other direction, on material the first
 * pass never nominated.
 *
 * WHAT IT DOES
 * ---------------------------------------------------------------------------
 * Take the finished wire. If it is a plain CHIRON frame (starts with §, has a rule
 * tape, and no layer above CHIRON fired — which is the normal case on prose and
 * code, where the whole upper stack gates itself off), then repeatedly:
 *
 *   1. enumerate maximal repeated substrings of the body, longest first;
 *   2. for each, build the wire that would result from adding it as one new rule
 *      appended to the tape, and measure countTokens of the ENTIRE frame;
 *   3. keep the single best if and only if it strictly reduces that count;
 *   4. decode the result through the full chain and keep it only if it is
 *      byte-identical to the source;
 *   5. repeat until nothing helps or the added-rule budget is spent.
 *
 * The new rule is appended LAST, so it may reference any earlier rule and no
 * earlier rule can reference it; that keeps CHIRON's topological guarantee intact
 * and its decoder unchanged. The glyph is the first one-token character of the
 * tape's own declared script that occurs nowhere in the frame, so the script
 * self-declaration in chiron.ts:144 still identifies the alphabet and nothing
 * about it has to be transmitted.
 *
 * Greedy: YES. One best addition per round, measured exactly, never revisited.
 * Not optimal: two additions that only pay jointly would both be refused, since
 * each is judged alone. Bounded by ANALEPSIS_MAX_ADDED and ANALEPSIS_MAX_CANDS.
 *
 * Time bound: yes. Each round costs at most ANALEPSIS_MAX_CANDS tokenizations of
 * a frame plus one full decode, and there are at most ANALEPSIS_MAX_ADDED rounds.
 * No lower-stack encode is ever run, so the pass adds milliseconds to a stack that
 * takes seconds to minutes.
 */
import { countTokens, type EncodingName } from './bpe';
import {
  chironDecode, CHIRON_START, CHIRON_SEP, CHIRON_SCRIPTS, chironInScript,
  type ChironScript,
} from './chiron';
import { krisisEncode, krisisDecode, type KrisisResult } from './krisis';
import type { ApocopeTemplate } from './apocope';

/** Shortest repeated substring worth nominating, in characters. */
export const ANALEPSIS_MIN_LEN = 6;
/** Longest nominated; longer repeats are rarer and the scan is O(n) per length. */
export const ANALEPSIS_MAX_LEN = 64;
/** Most new rules one encode may add. */
export const ANALEPSIS_MAX_ADDED = 12;
/** Most candidates priced per round. */
export const ANALEPSIS_MAX_CANDS = 24;

export interface AnalepsisResult extends KrisisResult {
  analepsis: boolean;
  analepsisAdded: number;
  analepsisGain: number;
  analepsisPhrases: string[];
}

const scriptOfChar = (ch: string | undefined): ChironScript | null => {
  if (!ch) return null;
  const cp = ch.codePointAt(0);
  if (cp === undefined) return null;
  for (const s of CHIRON_SCRIPTS) if (chironInScript(s, cp)) return s;
  return null;
};

/** First one-token character of `s`'s alphabet that occurs nowhere in `frame`. */
function freeGlyph(s: ChironScript, frame: string, enc: EncodingName): string | null {
  const spans = s.ranges ?? [[s.lo, s.hi] as [number, number]];
  for (const [a, b] of spans) {
    for (let cp = a; cp < b; cp++) {
      const ch = String.fromCodePoint(cp);
      if (frame.includes(ch)) continue;
      if (countTokens(ch, enc) !== 1) continue;
      return ch;
    }
  }
  return null;
}

/**
 * Maximal repeated substrings of `body`, longest first, with any candidate
 * contained in an already-accepted longer one suppressed. That suppression is the
 * difference between this scan and a naive one: without it a single four-fold
 * "administrator" reports as four separate finds at four offsets.
 */
export function analepsisCandidates(body: string): string[] {
  const accepted: string[] = [];
  const hi = Math.min(ANALEPSIS_MAX_LEN, body.length >> 1);
  for (let L = hi; L >= ANALEPSIS_MIN_LEN; L--) {
    const seen = new Map<string, number>();
    for (let k = 0; k + L <= body.length; k++) {
      const s = body.slice(k, k + L);
      seen.set(s, (seen.get(s) ?? 0) + 1);
    }
    for (const [s, n] of seen) {
      if (n < 2) continue;
      if (accepted.some((a) => a.includes(s))) continue;
      accepted.push(s);
    }
    if (accepted.length >= ANALEPSIS_MAX_CANDS) break;
  }
  // prefer repeats that are not prefixes/suffixes of an accepted longer one
  return accepted.filter((s) => !accepted.some((a) => a !== s && a.includes(s))).slice(0, ANALEPSIS_MAX_CANDS);
}

/**
 * Split a finished wire into its CHIRON tape and body.
 *
 * Layers above CHIRON transform the wire's surface, but bench/x44/resid.ts showed
 * the `§ tape ¶ body` structure survives them: ls-full-iso, page.html, chart.svg
 * and readme all still split cleanly with ANTISTROPHE, PERITROPE or OURA active.
 * So the split is attempted unconditionally rather than gated on which layers
 * fired. That is safe only because every accepted addition is re-decoded through
 * the FULL chain before it is kept -- the split being permissive is what makes the
 * decode check load-bearing, and the decode check is what makes it sound.
 */
function pureFrame(r: any): { tape: string; body: string; script: ChironScript } | null {
  const wire: string = r.wire;
  if (!wire.startsWith(CHIRON_START)) return null;
  const rest = wire.slice(1);
  const sep = rest.indexOf(CHIRON_SEP);
  if (sep < 0) return null;
  const tape = rest.slice(0, sep);
  const body = rest.slice(sep + 1);
  const script = scriptOfChar(tape[0]) ?? null;
  if (!script) return null;
  return { tape, body, script };
}

export function analepsisEncode(
  text: string, enc: EncodingName = 'o200k_base', opts: Record<string, any> = {},
): AnalepsisResult {
  const parent = krisisEncode(text, enc, opts);
  const plain: AnalepsisResult = {
    ...parent, analepsis: false, analepsisAdded: 0, analepsisGain: 0, analepsisPhrases: [],
  };
  if (opts.analepsis === false) return plain;

  const pf = pureFrame(parent);
  if (!pf) return plain;

  let tape = pf.tape, body = pf.body;
  const script = pf.script;
  let curWire = CHIRON_START + tape + CHIRON_SEP + body;
  let cur = countTokens(curWire, enc);
  const baseMsg = parent.messageTokens;
  const added: string[] = [];

  const decodeOk = (w: string) => {
    try {
      const back = krisisDecode(w, {
        stats: parent.stats, order: parent.order,
        undo: parent.parent === 'identity' ? (x: string) => x : chironDecode,
      } as any, {
        alphabet: parent.alphabet, marker: parent.marker, marker2: parent.marker2,
        group: parent.syncopeGroup, framing: parent.framing, ouraShape: parent.ouraShape,
        ouraMode: parent.ouraMode, ouraSentinel: parent.ouraSentinel,
        antistrophePair: parent.antistrophePair, peritropePairs: parent.peritropePairs,
        systoleTemplates: parent.systoleTemplates,
        apocopeTemplates: parent.apocopeTemplates as ApocopeTemplate[],
      } as any);
      return back === text;
    } catch { return false; }
  };

  for (let round = 0; round < ANALEPSIS_MAX_ADDED; round++) {
    const glyph = freeGlyph(script, curWire, enc);
    if (!glyph) break;
    const cands = analepsisCandidates(body);
    if (!cands.length) break;

    let bestWire = '', bestTk = cur, bestPhrase = '';
    for (const phrase of cands) {
      if (phrase.includes(glyph) || phrase.includes(CHIRON_SEP) || phrase.includes(CHIRON_START)) continue;
      const nBody = body.split(phrase).join(glyph);
      if (nBody === body) continue;
      const w = CHIRON_START + tape + glyph + phrase + CHIRON_SEP + nBody;
      const tk = countTokens(w, enc);
      if (tk < bestTk) { bestTk = tk; bestWire = w; bestPhrase = phrase; }
    }
    if (!bestWire) break;
    if (!decodeOk(bestWire)) break;              // never ship a wire that does not decode

    curWire = bestWire; cur = bestTk;
    const sep = curWire.indexOf(CHIRON_SEP);
    tape = curWire.slice(1, sep); body = curWire.slice(sep + 1);
    added.push(bestPhrase);
  }

  if (!added.length) return plain;
  // positive = tokens saved; the frame is the only part that changed
  const frameBefore = countTokens(CHIRON_START + pf.tape + CHIRON_SEP + pf.body, enc);
  const gain = frameBefore - cur;
  return {
    ...parent,
    wire: curWire,
    messageTokens: baseMsg - gain,
    analepsis: true,
    analepsisAdded: added.length,
    analepsisGain: gain,
    analepsisPhrases: added,
  };
}

/** Decode is the parent's: the augmented tape is still a valid CHIRON tape. */
export function analepsisDecode(
  wire: string,
  cfg: { stats?: any; order?: 'in' | 'out'; undo: (w: string) => string },
  opts: any = {},
): string {
  return krisisDecode(wire, cfg, opts);
}
