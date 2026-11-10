/**
 * X99 — ΣΥΝΔΥΑΣΜΟΣ (syndyasmos, "combination"): alternate two orthogonal tape
 * transformations that no codec in this stack has ever run together.
 *
 * ============================================================================
 * THE TWO TRANSFORMATIONS, AND THE COUPLING BETWEEN THEM
 * ============================================================================
 *
 * A CHIRON wire is `contract § k₁v₁ k₂v₂ … kₙvₙ ¶ body` with a DELIMITER-FREE
 * tape: each entry is one new letter followed by its text, and the entries are
 * concatenated.  The decoder does not care what order the entries are in,
 * provided every rule still appears after the rules it references.  So the tape
 * has free parameters, and the stack has been spending them one at a time:
 *
 *   which substrings become rules   ADD / REMOVE / FACTOR — X94, measured closed
 *   which letter each rule gets     ἸΣΟΜΟΡΦΊΑ REASSIGN   — measured 0
 *   which slot each rule occupies   ΜΕΤΑΤΑΞΙΣ            — shipped, −44 on 29 lanes
 *   how each VALUE is spelled       ΠΡΟΟΙΜΙΟΝ            — this file, −27 on ten wires
 *
 * The last two are not independent, and that is the whole point of this codec.
 *
 *   ΜΕΤΑΤΑΞΙΣ relocates an entry to an arbitrary valid slot.  It changes which
 *   rules are NEIGHBOURS, hence which boundaries of the delimiter-free tape can
 *   fuse into a single vocabulary token.
 *
 *   ΠΡΟΟΙΜΙΟΝ re-spells a value as an interleaving of literal runs and
 *   references to STRICTLY EARLIER rules.  It changes whether a boundary is
 *   fusable at all.
 *
 * The second is gated on the order: a factor must precede the rule that uses it.
 * So relocating a rule earlier can ENABLE a re-spelling that was previously
 * illegal, and a re-spelling changes the character stream that relocation
 * optimises.  Pricing either alone prices half of that.
 *
 * THE MEASUREMENT THAT MOTIVATES THE RE-SPELLING (bench/x97/receipts/glossa.json).
 * In the ten committed tapes there are 589 ASCII→script boundaries, 600
 * script→ASCII boundaries and 846 script→script boundaries.  The vocabulary
 * supplies 2-char tokens for the first and third kinds — polyglot 596 / 3 417,
 * cjk 568 / 2 408, hangul 452 / 387, cyrillic 161 / 823 — and essentially NONE
 * for the second: script+ASCII is 0 for every script except cjk's 1.  So an
 * entry `kᵢ vᵢ` whose value begins with an ASCII character has a boundary that
 * CANNOT fuse.  Re-spelling the value to begin with a reference turns it into a
 * script→script boundary, which has 823 (cyrillic) or 3 417 (polyglot) tokens
 * available.  The same argument applies at `vᵢ|kᵢ₊₁`.
 *
 * MEASURED (bench/x97/receipts/syndyasmos.json, ten authoritative wires,
 * whole-message priced, chironDecode-verified, all arms from the committed wire):
 *
 *   ΜΕΤΑΤΑΞΙΣ only                                  −48
 *   ΠΡΟΟΙΜΙΟΝ only                                  −27
 *   ΜΕΤΑΤΑΞΙΣ → ΠΡΟΟΙΜΙΟΝ                            −72
 *   ΠΡΟΟΙΜΙΟΝ → ΜΕΤΑΤΑΞΙΣ                            −76
 *   alternate ×4                                    −74
 *
 * The combination beats either half by 1.5× and beats their SUM by 1 token, so
 * the interaction is real and not merely additive.
 *
 * ============================================================================
 * IS IT GREEDY?
 * ============================================================================
 *
 * YES, and doubly so: a seeded stochastic first-improvement climb (ΜΕΤΑΤΑΞΙΣ's
 * relocation) alternated with a deterministic greedy first-improvement sweep
 * (ΠΡΟΟΙΜΙΟΝ's re-spelling).  Neither backtracks; neither considers the joint
 * optimum.  Every candidate is priced on the COMPLETE message and re-decoded
 * through `chironDecode` before it is admitted, and a candidate that throws is
 * not a candidate.
 *
 * ============================================================================
 * FIDELITY — WHY THE DECODE CANNOT CHANGE
 * ============================================================================
 *
 * Both transformations preserve the rule→letter map and the expansion:
 *   · relocation is a permutation of the entries; the DAG check keeps every
 *     reference pointing strictly backwards, so expansion still terminates and
 *     composes with the permutation;
 *   · re-spelling replaces a value's text with a concatenation of earlier
 *     rules' letters and literal runs, which expands to exactly the same string.
 * So the decoded text is byte-identical BY CONSTRUCTION.  It is re-decoded
 * anyway, on every admitted candidate, because a construction argument is not a
 * test.
 *
 * ============================================================================
 * SOURCE ARTICLES
 * ============================================================================
 *
 * NONE for the mechanism — this is original engineering of this repository.  The
 * framing is imported, and only the framing:
 *   · ACL 2025, `2025.acl-long.1365`, "Tokenisation is NP-Complete": the
 *     direct/bottom-up distinction, and the observation that an SLP which is not
 *     in CNF "could be converted into an SLP with depth two".  Our tape IS a
 *     non-CNF SLP and o200k is the fixed tokenizer.
 *   · arXiv:2602.22958 (Frequency-Ordered Tokenization, Kalcher): renumbering a
 *     code assignment is a compression lever independent of the code set.  The
 *     tape's rule ORDER is the unexploited remainder that ΜΕΤΑΤΑΞΙΣ takes, and
 *     the tape's value SPELLING is the remainder this file takes.
 *   · Optimal Linear Arrangement (arXiv:2502.10909; Leighton; Bienkowski & Even
 *     STACS 2024; Abboud & Schwartz ICALP 2026).  HONEST SCOPE LIMIT: this
 *     codec's cost is not a cut function — it is the token count of a
 *     delimiter-free serialisation under a fixed tokenizer.  None of the
 *     imported approximation bounds transfers.  They supply the problem's shape
 *     and the balanced-cut divide-and-conquer template, nothing more.
 *
 * ============================================================================
 * TIME- OR CPU-BOUND?
 * ============================================================================
 *
 * CPU-bound, deliberately and reproducibly.  Both budgets are pure functions of
 * the message length, there is no wall-clock term anywhere, and every candidate
 * is priced with `countTokens` on the complete message.  `countTokens` is
 * asserted equal to `countTokensExact` on all ten committed messages
 * (bench/x97/receipts/eq.log), and a re-spelling leaves the body byte-identical,
 * so the body's chunks are cache hits — which is what makes the sweeps
 * affordable.
 *
 * This pass needs NO letter pool, because it never changes a letter.
 * ============================================================================
 */

import { countTokens, type EncodingName } from './bpe';
import { CHIRON_START, CHIRON_SEP, chironDecode } from './chiron';
import { metataxisEncode } from './metataxis';

/** Alternation rounds.  syndyasmos.json: −72 / −76 / −74 at 1 / 1 / 4 rounds. */
export const SYNDYASMOS_ROUNDS = 4;

/** `OMEGA_NO_SYNDYASMOS=1` skips the pass entirely, for an honest interleaved A/B. */
export function syndyasmosDisabled(): boolean {
  return typeof process !== 'undefined' && process.env?.OMEGA_NO_SYNDYASMOS === '1';
}

/** `OMEGA_SYNDYASMOS_ROUNDS` overrides the alternation count. */
function rounds(): number {
  const e = typeof process !== 'undefined' ? process.env?.OMEGA_SYNDYASMOS_ROUNDS : undefined;
  if (e !== undefined && Number.isFinite(Number(e))) return Math.max(1, Number(e));
  return SYNDYASMOS_ROUNDS;
}

/** Cap on the re-spelling sweep's per-rule segmentation search, whatever the message. */
const MAX_SEGMENTATIONS = 400;
/** Parts in a re-spelling.  5 was priced in syndyasmos.ts; more rarely pays. */
const MAX_PARTS = 5;

export interface SyndyasmosResult {
  applied: boolean;
  decoded: string;
  message: string;
  messageTokens: number;
  notes: string;
}

interface Tape {
  contract: string;
  keys: string[];
  values: string[];
  body: string;
}

/**
 * Parse a CHIRON tape.  A glyph is a KEY on its first appearance in the tape and
 * a REFERENCE thereafter — the rule X96 paid for twice.  A parser that treats
 * every script character as a new key creates one rule per reference and
 * produces a tape whose expansion is wrong.
 */
function parseTape(msg: string): Tape {
  const w = msg.indexOf(CHIRON_START);
  const t = msg.indexOf(CHIRON_SEP, w);
  if (w < 0 || t < 0) throw new Error('syndyasmos: not a CHIRON message');
  const tape = msg.slice(w + 1, t);
  const keys: string[] = [], values: string[] = [];
  const seen = new Set<string>();
  let ck = '', cv = '';
  for (const ch of tape) {
    if (ch.charCodeAt(0) > 0x370 && !seen.has(ch)) {
      if (ck !== '') { keys.push(ck); values.push(cv); }
      seen.add(ch); ck = ch; cv = '';
    } else cv += ch;
  }
  if (ck !== '') { keys.push(ck); values.push(cv); }
  return { contract: msg.slice(0, w), keys, values, body: msg.slice(t + 1) };
}

const serialise = (tp: Tape): string =>
  tp.contract + CHIRON_START + tp.keys.map((k, i) => k + tp.values[i]).join('') + CHIRON_SEP + tp.body;

/**
 * One greedy sweep of ΠΡΟΟΙΜΙΟΝ: for each rule in turn, try every re-spelling of
 * its value as an interleaving of literal runs and references to STRICTLY
 * EARLIER rules, and keep the cheapest.  `idx` is built incrementally so a
 * factor can never be a later rule — the tape is delimiter-free and the parser
 * treats a letter as a key on FIRST appearance, so a forward reference would be
 * read as a new key and corrupt the whole tape.  (The first version of this
 * probe built the index over all rules up front and reported −1 075 with
 * exact=false on all ten lanes.  That is why the fidelity gate is not optional.)
 */
function respellSweep(tp: Tape, enc: EncodingName): { respellings: number; priced: number } {
  const idx = new Map<string, string[]>();
  const addIdx = (i: number): void => {
    const v = tp.values[i];
    const a = idx.get(v);
    if (a === undefined) idx.set(v, [tp.keys[i]]); else a.push(tp.keys[i]);
  };
  const segmentations = (s: string): string[] => {
    const out: string[] = [];
    const walk = (pos: number, acc: string, parts: number): void => {
      if (out.length >= MAX_SEGMENTATIONS) return;
      if (pos === s.length) { out.push(acc); return; }
      if (parts >= MAX_PARTS) return;
      for (let L = s.length - pos; L >= 1; L--) {
        const sub = s.slice(pos, pos + L);
        const ks = idx.get(sub);
        if (ks !== undefined) {
          for (const k of ks) { walk(pos + L, acc + k, parts + 1); if (out.length >= MAX_SEGMENTATIONS) return; }
        }
        walk(pos + L, acc + sub, parts + 1);
      }
    };
    walk(0, '', 0);
    return out;
  };
  let respellings = 0, priced = 0;
  for (let i = 0; i < tp.keys.length; i++) {
    let cur = countTokens(serialise(tp), enc);
    let best: string | null = null;
    for (const c of segmentations(tp.values[i])) {
      if (c === tp.values[i]) continue;
      priced++;
      const saved = tp.values[i];
      tp.values[i] = c;
      const tk = countTokens(serialise(tp), enc);
      tp.values[i] = saved;
      if (tk < cur) { cur = tk; best = c; }
    }
    if (best !== null) { tp.values[i] = best; respellings++; }
    addIdx(i);
  }
  return { respellings, priced };
}

/**
 * Alternate ΜΕΤΑΤΑΞΙΣ's arbitrary-rank relocation with ΠΡΟΟΙΜΙΟΝ's re-spelling.
 *
 * The incumbent is the chain's best message so far.  Nothing is admitted unless
 * it is strictly cheaper on the complete message AND `chironDecode` returns the
 * source byte for byte; a candidate that throws is not a candidate.
 */
export function syndyasmosEncode(
  text: string,
  enc: EncodingName,
  incumbent: { message: string; messageTokens: number; decoded: string },
  opts?: { rounds?: number },
): SyndyasmosResult {
  const no = (notes: string): SyndyasmosResult => ({
    applied: false, message: incumbent.message, messageTokens: incumbent.messageTokens,
    decoded: incumbent.decoded, notes,
  });
  const R = opts?.rounds ?? rounds();
  let cur = { message: incumbent.message, messageTokens: incumbent.messageTokens };
  let relocations = 0, respellings = 0, priced = 0, roundsRun = 0, roundsWasted = 0;
  try {
    for (let r = 0; r < R; r++) {
      roundsRun++;
      const atEntry = cur.messageTokens;
      // ---- relocation half: reuse ΜΕΤΑΤΑΞΙΣ, which owns its own deterministic
      // budget and its own fidelity gate.  It returns applied=false (and the
      // incumbent unchanged) when it finds nothing, which is the common case
      // once the tape has converged.
      const m = metataxisEncode(text, enc, { message: cur.message, messageTokens: cur.messageTokens, decoded: text });
      if (m.applied && m.messageTokens < cur.messageTokens) { cur = { message: m.message, messageTokens: m.messageTokens }; relocations++; }
      // ---- re-spelling half
      const tp = parseTape(cur.message);
      const before = countTokens(serialise(tp), enc);
      const s = respellSweep(tp, enc);
      priced += s.priced; respellings += s.respellings;
      const after = serialise(tp);
      const afterTok = countTokens(after, enc);
      if (afterTok < before) {
        const decoded = chironDecode(after.slice(after.indexOf(CHIRON_START)));
        if (decoded !== text) return no(`syndyasmos: re-spelling failed fidelity at round ${r + 1} — refused`);
        cur = { message: after, messageTokens: afterTok };
      }
      // ---- EARLY EXIT.  synd10.json shows most rounds change nothing (a typical
      // lane is "4 rounds, 1 relocation, 3 re-spellings"), and every wasted round
      // re-runs ΜΕΤΑΤΑΞΙΣ's whole climb.  A round that improves nothing is followed
      // by a round over the same tape with the same budget, which cannot improve
      // either -- the search is deterministic and seeded.  Stopping here costs no
      // fidelity: nothing has been admitted that was not already verified.
      if (cur.messageTokens >= atEntry) { roundsWasted = R - r - 1; break; }
    }
  } catch {
    return no('syndyasmos: threw — not a candidate');
  }
  if (cur.messageTokens >= incumbent.messageTokens) {
    return no(`syndyasmos: ${roundsRun} rounds (${roundsWasted} skipped by early exit), ${relocations} relocations, ${respellings} re-spellings, ${priced} priced — no gain`);
  }
  // Final gate with the repository's own decoder, on the exact string we emit.
  let decoded: string;
  try { decoded = chironDecode(cur.message.slice(cur.message.indexOf(CHIRON_START))); } catch { return no('syndyasmos: decode threw — refused'); }
  if (decoded !== text) return no('syndyasmos: final decode mismatch — refused');
  return {
    applied: true, message: cur.message, messageTokens: cur.messageTokens, decoded,
    notes: `syndyasmos: ${roundsRun} rounds (${roundsWasted} skipped by early exit), ${relocations} relocations, ${respellings} re-spellings, ${priced} priced, ${incumbent.messageTokens} -> ${cur.messageTokens}`,
  };
}
