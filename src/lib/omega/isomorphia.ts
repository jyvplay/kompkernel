/**
 * ἸΣΟΜΟΡΦΊΑ — ISOMORPHIA.  A wire-level isomorphism pass over the glyph tape.
 * =============================================================================
 *
 * THE UNEXERCISED DEGREE OF FREEDOM
 * -----------------------------------------------------------------------------
 * The CHIRON wire language declares its alphabet implicitly: "the first letter
 * of the tape declares which script the wire uses, so nothing about the
 * alphabet is transmitted" (chiron.ts).  A rule is "one *new* letter of a
 * declared one-token script followed by its text".  Nothing in that language
 * says WHICH letter a rule gets.  The map rule -> letter is therefore a free
 * parameter of every wire the stack emits, and it is billed: the letter of a
 * reference is what the tokenizer actually sees, both in the body and inside
 * the values of every rule defined after it.
 *
 * ARIADNE is the only thing in the stack that searches it, and it searches it
 * against `runCostPrepared` — the token cost of the BODY's reference runs and
 * nothing else (ariadne.ts:562, "Fast, assignment-sensitive part of the cost").
 * The tape's value column and the tape's glyph column are treated as
 * assignment-invariant.  They are not.  And on the lanes where some other
 * parent wins the frontier (synkrisis, akolouthia2, stichomythia, metron,
 * diastema) ARIADNE's climb is not the last word on the emitted wire at all.
 *
 * WHAT THIS CODEC DOES
 * -----------------------------------------------------------------------------
 * Take the incumbent's COMPLETE message, re-climb the rule -> letter map
 * against the token cost of the COMPLETE message, and emit the better wire.
 * Nothing else changes: the contract, the rule set, the rule ORDER, the body
 * text, the tape separators and the operators are all untouched.
 *
 * WHY IT IS EXACT RATHER THAN MERELY TESTED
 * -----------------------------------------------------------------------------
 * A bijection from the rules onto a set of unused one-token letters of the same
 * script is an ISOMORPHISM of the wire language, and this is a proof, not a
 * measurement:
 *
 *   (1) Keys stay distinct, so `chironParseTape` still returns one rule per
 *       key rather than `null` (it rejects a repeated key outright).
 *   (2) The first tape letter is still a letter of the same script, so
 *       `scriptOf` still resolves the same alphabet and no existing wire
 *       changes meaning.
 *   (3) Rule ORDER is unchanged, so every reference inside a value or in the
 *       body still points at a strictly earlier rule.  `chironDecode`'s
 *       forward-reference guard (`at >= upto`) therefore still passes, and
 *       expansion terminates exactly as before.
 *   (4) The expansion of each rule is the literal text of that rule with its
 *       earlier-rule references replaced by THEIR expansions.  Relabelling
 *       composes with that substitution: expand(relabel(w)) = expand(w) for
 *       every rule text w and for the body.  Hence the decoded string is
 *       byte-identical.
 *
 * So the decoded text cannot change.  The pass nevertheless VERIFIES it with
 * the repository's own decoder, `chironDecode`, and refuses to emit anything
 * that does not reproduce the source exactly — the check is against the real
 * decoder, not against this file's own idea of the format.
 *
 * THE ONE EXTRA CONDITION, AND WHY IT IS CHECKED
 * -----------------------------------------------------------------------------
 * A letter may only be used as a key if it cannot appear in the payload as
 * literal text: the tape is delimiter-free, so a payload character that happens
 * to be a letter of the declared script would be read as a reference.  The
 * incumbent already satisfies this for the letters it uses.  This pass may move
 * a rule onto a letter the incumbent did NOT use, so the candidate pool is
 * filtered against the source text before the climb, and the filtered pool is
 * asserted to still be large enough.
 *
 * WHAT IS NOT CLAIMED
 * -----------------------------------------------------------------------------
 * No optimality: the assignment problem is a quadratic assignment problem and
 * is NP-hard; this is a stochastic hill-climb with a bounded budget and a
 * seeded RNG, so the number it returns is a lower bound on what a better search
 * would find, not an upper bound.  No universal gain: it is admitted the way
 * everything is admitted here — by being strictly smaller on a complete,
 * decoded, byte-exact message measured in this process, or not at all.
 * =============================================================================
 */
import { countTokensExact, type EncodingName } from './bpe';
import {
  CHIRON_START, CHIRON_SEP, CHIRON_SCRIPTS, chironInScript, chironParseTape, chironDecode,
  type ChironScript,
} from './chiron';


export interface IsomorphiaResult {
  applied: boolean;
  message: string;
  messageTokens: number;
  decoded: string;
  notes: string;
}

/**
 * Default climb budget.  MEASURED KNEE, not a guess: bench/x96/reorder.ts prices the
 * reorder lever at 150 / 400 / 1 000 / 4 000 / 20 000 iterations and gets
 * -10 / -11 / -11 / -11 / -11 over the ten committed wires.  The lever saturates
 * by ~150 probes, so 400 is set as the default: it keeps 100 % of the measured
 * gain at ~44 % of the cost, and the 900-probe revision RUN K pass 2 measured is kept reachable through `OMEGA_ISO_ITERS` for the published A/B.
 */
export const ISOMORPHIA_ITERS = 400;
/** `OMEGA_NO_ISO=1` skips the pass entirely, for an honest interleaved A/B. */
export function isomorphiaDisabled(): boolean {
  return typeof process !== 'undefined' && process.env?.OMEGA_NO_ISO === '1';
}
/** Stop early when the climb has not improved for this many probes. */
const PATIENCE = 260;
/** Candidate letters sampled per merge-seeking probe. */
const POOL_SAMPLE = 40;

function mulberry32(a: number): () => number {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** One-token letters of `sc`, cached: the CJK script alone is 20 742 code points. */
const poolCache = new Map<string, string[]>();
function scriptLetters(sc: ChironScript, enc: EncodingName): string[] {
  const key = `${sc.name}:${enc}`;
  const hit = poolCache.get(key);
  if (hit) return hit;
  const out: string[] = [];
  for (const [a, b] of sc.ranges ?? [[sc.lo, sc.hi] as [number, number]]) {
    for (let cp = a; cp < b; cp++) {
      const ch = String.fromCodePoint(cp);
      if (countTokensExact(ch, enc) === 1) out.push(ch);
    }
  }
  poolCache.set(key, out);
  return out;
}

/** One-token letters of `sc` that do not occur in `text`. */
function safePool(sc: ChironScript, enc: EncodingName, text: string): string[] {
  const bad = new Set(text);
  return scriptLetters(sc, enc).filter((ch) => !bad.has(ch));
}

/**
 * ἸΣΟΜΟΡΦΊΑ.  `incumbent` is the complete message the frontier would otherwise
 * emit and its measured token count; this returns a complete message that is
 * never worse and is strictly better when the climb finds something.
 */
export function isomorphiaEncode(
  text: string,
  enc: EncodingName,
  incumbent: { message: string; messageTokens: number },
  opts: { iters?: number; seed?: number } = {},
): IsomorphiaResult {
  const envIters = typeof process !== 'undefined' ? process.env?.OMEGA_ISO_ITERS : undefined;
  const iters = opts.iters ?? (envIters !== undefined && Number.isFinite(Number(envIters)) ? Number(envIters) : ISOMORPHIA_ITERS);
  const seed = opts.seed ?? 0x1590;
  const base: IsomorphiaResult = {
    applied: false, message: incumbent.message, messageTokens: incumbent.messageTokens,
    decoded: text, notes: '',
  };
  try {
    const msg = incumbent.message;
    // The contract PRECEDES the tape marker, so the message does not start with
    // §.  The first measurement of this codec tested `startsWith(CHIRON_START)`
    // and therefore rejected all 29 lanes without a single probe -- a shape bug,
    // not a negative result.  Locate the marker instead.
    const s0 = msg.indexOf(CHIRON_START);
    if (s0 < 0) return base;
    const cut = msg.indexOf(CHIRON_SEP, s0 + CHIRON_START.length);
    if (cut < 0) return base;
    const contract = msg.slice(0, s0);
    const tape = msg.slice(s0 + CHIRON_START.length, cut);
    const body = msg.slice(cut + CHIRON_SEP.length);
    if (tape.length === 0) return base;
    const wireStart = s0;

    const first = tape.codePointAt(0)!;
    const sc: ChironScript | undefined = CHIRON_SCRIPTS.find((s) => chironInScript(s, first));
    if (!sc) return base;
    const parsed = chironParseTape(tape, sc);
    if (!parsed) return base;
    const keys = parsed.map((r) => r.glyph);
    const raws = parsed.map((r) => r.raw);
    if (keys.length < 4) return base; // too few letters for a relabelling to matter

    const pool = safePool(sc, enc, text);
    if (pool.length < keys.length) return base;

    // Precompute the relabelling closure once; every probe is one string build
    // plus one countTokens of the COMPLETE message.  `order` lists rule indices
    // in tape order and `perm[i]` is the letter of rule i.
    const render = (order: number[], perm: string[]): string => {
      const m = new Map<string, string>();
      for (let i = 0; i < keys.length; i++) m.set(keys[i], perm[i]);
      const sub = (x: string) => { let o = ''; for (const ch of x) o += (m.get(ch) ?? ch); return o; };
      let t = '';
      for (const i of order) t += perm[i] + sub(raws[i]);
      return contract + CHIRON_START + t + CHIRON_SEP + sub(body);
    };

    // Reference DAG: dep[i][j] = rule i's value references rule j's letter.
    // The incumbent order is a topological sort of it (references only ever point
    // backwards), so a swap of adjacent order entries (i before j -> j before i)
    // is legal exactly when j does not depend on i.
    const n = keys.length;
    const keyIdx = new Map<string, number>();
    keys.forEach((k, i) => keyIdx.set(k, i));
    const dep: boolean[][] = [];
    for (let i = 0; i < n; i++) {
      const row = new Array<boolean>(n).fill(false);
      for (const ch of raws[i]) { const j = keyIdx.get(ch); if (j !== undefined && j !== i) row[j] = true; }
      dep.push(row);
    }

    // Distinct body run patterns with multiplicity, for pattern-directed probes.
    const keySet = new Set(keys);
    const patAt = new Map<string, number>();
    const pats: string[] = [];
    const mult: number[] = [];
    {
      let cur = '';
      for (const ch of body) {
        if (keySet.has(ch)) cur += ch;
        else if (cur) {
          const i = patAt.get(cur);
          if (i === undefined) { patAt.set(cur, pats.length); pats.push(cur); mult.push(1); } else mult[i]++;
          cur = '';
        }
      }
      if (cur) { const i = patAt.get(cur); if (i === undefined) { pats.push(cur); mult.push(1); } else mult[i]++; }
    }
    const hot: number[] = [];
    for (let i = 0; i < pats.length; i++) if (mult[i] > 1 && pats[i].length >= 2) hot.push(i);

    const rnd = mulberry32(seed);
    let order: number[] = keys.map((_, i) => i);
    let perm = keys.slice();
    let cur = render(order, perm);
    let best = countTokensExact(cur, enc);
    const start = best;
    let since = 0;
    let probes = 0;
    let reorderWins = 0;
    let assignWins = 0;

    /**
     * OWN BUDGET, NOT THE SHARED ONE.  This pass runs LAST in the X74 chain, by
     * which time `workExhausted()` is true on every lane (synkrisis, apographe,
     * metron and ARIADNE have all spent the window), and `workEpoch` cannot open
     * a fresh window from inside the chain because it only resets at depth 0.
     * The first measurement of this codec therefore did literally zero probes and
     * reported no gain on all 29 lanes -- a budget-starvation bug, not a negative
     * result.  The bound is instead local and deterministic: a probe cap that
     * scales inversely with the message length, a patience stop, and a hard cap
     * on characters pushed through the relabelling closure.  Same input, same
     * probes, same wire, on any machine.
     */
    const maxProbes = Math.max(40, Math.min(iters, Math.floor(4_000_000 / Math.max(1, msg.length))));
    let charBudget = 40_000_000;

    for (let it = 0; it < maxProbes && since < PATIENCE; it++) {
      // MEASURED MIX.  bench/x96/joint.ts ran both move types over three seeds:
      // the reassignment move contributed 0 on every lane (the incumbent letter
      // map is already a local optimum of the whole-message objective, 0 over
      // 8 seeds x 10 wires in bench/x96/seeds.ts), while the reorder move
      // contributed the entire -9..-11.  The reassignment move is kept because
      // it is the same isomorphism and cannot regress (every candidate is priced
      // and rejected), but it is given the smaller share of the budget.
      const doReorder = rnd() < 0.6;
      if (doReorder && n >= 2) {
        const a = Math.floor(rnd() * (n - 1));
        const i = order[a], j = order[a + 1];
        if (dep[j][i]) { since++; continue; }
        order[a] = j; order[a + 1] = i;
        const m2 = render(order, perm);
        charBudget -= m2.length;
        probes++;
        const t = countTokensExact(m2, enc);
        if (t < best) { best = t; cur = m2; since = 0; reorderWins++; }
        else { order[a] = i; order[a + 1] = j; since++; }
      } else {
        let i: number;
        if (hot.length && rnd() < 0.45) {
          // pattern-directed: aim a recurring body run at a better letter
          const q = pats[hot[Math.floor(rnd() * hot.length)]];
          i = keyIdx.get(q[Math.floor(rnd() * q.length)])!;
        } else i = Math.floor(rnd() * n);
        const old = perm[i];
        let cand = '';
        for (let s2 = 0; s2 < POOL_SAMPLE; s2++) {
          const c = pool[Math.floor(rnd() * pool.length)];
          if (c !== old && !perm.includes(c)) { cand = c; break; }
        }
        if (!cand) { since++; continue; }
        perm[i] = cand;
        const m2 = render(order, perm);
        charBudget -= m2.length;
        probes++;
        const t = countTokensExact(m2, enc);
        if (t < best) { best = t; cur = m2; since = 0; assignWins++; }
        else { perm[i] = old; since++; }
      }
      if (charBudget <= 0) break;
    }

    // FIDELITY: the repository's own decoder, not this file's own expansion.
    // chironDecode wants the wire, which starts at the tape marker, not the
    // whole message -- the contract is prose in front of it.
    const decoded = chironDecode(cur.slice(wireStart));
    if (decoded !== text) {
      return { ...base, notes: `ISOMORPHIA refused: relabelled wire does not decode to the source (${decoded.length} vs ${text.length} chars)` };
    }
    if (best >= incumbent.messageTokens) {
      return { ...base, notes: `ISOMORPHIA no gain: ${start} -> ${best} over ${probes} probes, ${keys.length} letters, script ${sc.name}` };
    }
    return {
      applied: true,
      message: cur,
      messageTokens: best,
      decoded,
      notes: `ISOMORPHIA ${start} -> ${best} (-${start - best}) over ${probes} probes (reorder ${reorderWins}, reassign ${assignWins}), ${keys.length} letters, script ${sc.name}, ${pats.length} distinct body runs`,
    };
  } catch (e) {
    return { ...base, notes: `ISOMORPHIA threw: ${(e as Error).message}` };
  }
}
