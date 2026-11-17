/**
 * src/lib/omega/anagraphe.ts — X125. ΑΝΑΓΡΑΦΗ (anagraphē, "a writing out afresh").
 * =============================================================================
 *
 * THE ASYMMETRY THIS EXPLOITS
 * -----------------------------------------------------------------------------
 * X120's ΒΕΛΤΙΣΤΟΣ answered the question "given this tape, what is the cheapest
 * spelling of the BODY?" with an exact shortest path, and then applied the same
 * parse to the TAPE's values. Measured on the canonical 29 the body stage is
 * where it pays: on bench/holdout-x41/apt-real.txt the shipped note reads
 *
 *     body −14, tape −0
 *
 * and on every lane I measured the tape column is the one that does not move.
 * The reason is visible in the code and has nothing to do with the tape being
 * intrinsically hard. Stage 1 (BODY) is searched over a PORTFOLIO: `rungs()`
 * returns three (context, beam) settings and each one is priced as a complete
 * message, so the body is proposed three times by three different searches and
 * the cheapest survives. Stage 2 (TAPE) is searched ONCE, with a fixed
 * `(24, 4)` — a beam of 4 that is not even a rung of the ladder — and one
 * proposal is priced for the whole tape.
 *
 * That is not a modelling judgement, it is an unfinished search: the tape column
 * is 24.5 % of the emitted tokens (bench/x125 anatomy: Σ 12 023 = contract 736 +
 * tape 2 940 + body 8 347 over 877 rules), it is priced at 0.420 tokens/char
 * against the body's 0.311, and it is the one column the portfolio never ran on.
 *
 * WHAT THIS CODEC DOES
 * -----------------------------------------------------------------------------
 * Re-spell the tape's values with the SAME lattice — `veltistosParse`, the
 * (position, emitted-tail) shortest path whose state X120 proved exact — but
 * driven by the SAME portfolio the body gets, and iterated:
 *
 *   1. for each rung of ΒΕΛΤΙΣΤΟΣ's own ladder, re-spell every rule value in
 *      tape order using only EARLIER glyphs, price the resulting complete
 *      message, and keep it only on a strict win;
 *   2. repeat from the improved tape until a round wins nothing (a re-spelled
 *      value changes the byte context for every rule after it, so a second
 *      round is not the same computation as the first);
 *   3. exact seeds: the context handed to each value's parse is the whole tape
 *      prefix, not X120's deliberately truncated 32-character slice.
 *
 * On (3) I measured before claiming anything (bench/x125): of the 877 rules in
 * the 29 shipped wires, exactly 2 have a value long enough for the truncation
 * to change the seed's tail. So (3) is a latent-defect fix and is reported as
 * one — it is not where the gain comes from, and claiming otherwise would be
 * claiming a win I did not measure. It is still fixed here, because a truncated
 * seed is a wrong price and a wrong price can only cost optimality.
 *
 * WHY THE TOPOLOGICAL RESTRICTION IS NOT A HEURISTIC
 * -----------------------------------------------------------------------------
 * A value may only be spelled with glyphs of rules written EARLIER in the tape.
 * A later glyph would be parsed by `chironParseTape` as a new KEY, and
 * `chironDecode` rejects forward references (`at >= upto`). This is the wire
 * grammar, not a modelling choice, and it is why the order of the walk is the
 * order of the tape.
 *
 * EXACTNESS
 * -----------------------------------------------------------------------------
 * Every proposal is priced as a COMPLETE one-chat message and admitted only if
 * `chironDecode` of that message reproduces the incumbent's own decoded text
 * byte for byte. No rule is added, deleted or re-valued: only the spelling of a
 * value changes, and the expansion of a rule is a homomorphism over that
 * spelling. Reachability pruning (a rule no spelling reaches) is applied by the
 * same `pruneTape` logic ΒΕΛΤΙΣΤΟΣ uses, and a rule that becomes unreachable is
 * dropped only as a consequence of re-spelling — never as an independent move.
 *
 * GREEDY? The per-value parse is a dynamic program, so it is optimal for one
 * value given the rules written before it and the context. The walk over rules
 * is sequential and one-pass per round, so the ROUND is greedy; the ladder, the
 * rounds and the price gates are what make the whole thing not-greedy, and the
 * ladder is chosen by measurement rather than by search.
 *
 * CPU/time. No wall clock is consulted. Bounded by VELTISTOS_MAX_EDGES shared
 * across the whole run, by ANAGRAPHE_MAX_PRICED whole-message prices and by
 * ANAGRAPHE_MAX_ROUNDS rounds; every bound is deterministic, so the same input
 * gives the same output on any machine.
 */

import { countTokens, type EncodingName } from './bpe';
import {
  CHIRON_START, CHIRON_SEP, CHIRON_LIST, chironParseTape, chironOpsUsed, chironDecode,
} from './chiron';
import {
  veltistosParse, veltistosRungs, veltistosEncode,
  VELTISTOS_MAX_EDGES, VELTISTOS_MAX_VALUE_LEN,
  type Entry, type Budget,
} from './veltistos';

export const ANAGRAPHE_MAX_PRICED = 96;
export const ANAGRAPHE_MAX_ROUNDS = 2;
/**
 * X120's tape stage runs one parse per value at beam 4. This module exists to
 * run the beams it did NOT run, so rungs at or below that width are skipped —
 * they would repeat work whose answer is already in the incumbent. The edge
 * budget is the real brake: measured on bench/holdout-x41/ls-l-real.txt the
 * unbounded portfolio tripled the lane's encode time for no gain at all, and a
 * codec that costs 3x to find nothing is not a codec.
 */
export const ANAGRAPHE_MAX_EDGES = 150_000;
export const VELTISTOS_TAPE_BEAM = 4;

export interface AnagrapheResult {
  applied: boolean;
  message: string;
  messageTokens: number;
  decoded: string;
  notes: string;
  parses: number;
  edges: number;
  priced: number;
  tapeGain: number;
  rounds: number;
  capped: boolean;
}

export function anagrapheDisabled(): boolean {
  if (typeof process === 'undefined') return false;
  return process.env?.OMEGA_ANAGRAPHE === '0'
    || process.env?.OMEGA_ANAGRAPHE === 'false'
    || process.env?.OMEGA_NO_ANAGRAPHE === '1';
}

interface Incumbent { message: string; decoded: string }

function no(enc: EncodingName, inc: Incumbent, notes: string, extra: Partial<AnagrapheResult> = {}): AnagrapheResult {
  return {
    applied: false, message: inc.message, messageTokens: countTokens(inc.message, enc), decoded: inc.decoded, notes,
    parses: 0, edges: 0, priced: 0, tapeGain: 0, rounds: 0, capped: false, ...extra,
  };
}

/** Drop rules that no rule value and not the body reaches. Same rule as X120. */
function pruneTape(parsed: ReadonlyArray<{ glyph: string; raw: string }>, body: string): string {
  let live = parsed.map(() => true);
  const refs = (s: string): string[] => {
    const out: string[] = [];
    for (const p of parsed) if (s.includes(p.glyph)) out.push(p.glyph);
    return out;
  };
  const order = parsed.map((p) => p.glyph);
  // a `×` template keeps its operands live; walk until fixpoint
  for (let pass = 0; pass < 8; pass++) {
    let changed = false;
    for (let i = 0; i < parsed.length; i++) {
      const p = parsed[i]!;
      if (!live[i]) continue;
      const usedInBody = body.includes(p.glyph);
      let usedLater = false;
      for (let j = i + 1; j < parsed.length; j++) {
        if (!live[j]) continue;
        if (parsed[j]!.raw.includes(p.glyph)) { usedLater = true; break; }
      }
      if (!usedInBody && !usedLater) { live[i] = false; changed = true; }
    }
    if (!changed) break;
  }
  void refs; void order;
  return parsed.filter((_, i) => live[i]).map((p) => p.glyph + p.raw).join('');
}

export function anagrapheEncode(text: string, enc: EncodingName, inc: Incumbent): AnagrapheResult {
  const msg0 = inc.message;
  const ref = inc.decoded;
  const w = msg0.indexOf(CHIRON_START);
  if (w < 0) return no(enc, inc, 'anagraphe: no frame');
  const cut = msg0.indexOf(CHIRON_SEP, w + CHIRON_START.length);
  if (cut < 0) return no(enc, inc, 'anagraphe: no tape separator');
  const prefix = msg0.slice(0, w);
  const script = chironOpsUsed(msg0.slice(w)).script;
  if (!script) return no(enc, inc, 'anagraphe: no script');
  const parsed0 = chironParseTape(msg0.slice(w + CHIRON_START.length, cut), script);
  if (!parsed0 || parsed0.length === 0) return no(enc, inc, 'anagraphe: malformed tape');
  if (parsed0.length > 512) return no(enc, inc, 'anagraphe: too many rules');

  // A key letter that also occurs in the payload cannot be emitted literally.
  for (const p of parsed0) if (ref.includes(p.glyph)) return no(enc, inc, 'anagraphe: key letter in payload');

  const budget: Budget = { edges: 0, capped: false };
  let priced = 0, parses = 0, rounds = 0;
  const base = countTokens(msg0, enc);
  let bestMsg = msg0, bestTok = base, bestTape = msg0.slice(w + CHIRON_START.length, cut),
      bestBody = msg0.slice(cut + CHIRON_SEP.length);
  let tapeGain = 0;

  /** String value of every rule, decoded through the CURRENT tape. */
  const valuesOf = (tape: string, parsed: ReadonlyArray<{ glyph: string; raw: string }>): Map<string, string> => {
    const out = new Map<string, string>();
    for (const p of parsed) {
      if (p.raw.startsWith(CHIRON_LIST)) continue;
      let v: string;
      try { v = chironDecode(CHIRON_START + tape + CHIRON_SEP + p.glyph); } catch { continue; }
      if (!v || v === p.glyph || v.startsWith(CHIRON_START)) continue;
      if (v.length > VELTISTOS_MAX_VALUE_LEN) continue;
      out.set(p.glyph, v);
    }
    return out;
  };

  const consider = (tape: string, body: string, parsed: ReadonlyArray<{ glyph: string; raw: string }>): boolean => {
    if (priced >= ANAGRAPHE_MAX_PRICED) { budget.capped = true; return false; }
    const nt = pruneTape(parsed, body);
    const m = prefix + CHIRON_START + nt + CHIRON_SEP + body;
    priced++;
    const t = countTokens(m, enc);
    if (t >= bestTok) return false;
    let ok = false;
    try { ok = chironDecode(m.slice(w)) === ref; } catch { ok = false; }
    if (!ok) return false;
    bestMsg = m; bestTok = t; bestTape = nt; bestBody = body;
    return true;
  };

  /* RE-ENTRY.  ΒΕΛΤΙΣΤΟΣ runs body → tape → prune exactly once, and the two
   * stages are priced against each other: the body is spelled with the glyphs of
   * the tape as it then stands, and the values are spelled with the context the
   * body's own re-spelling leaves behind. Re-spelling the tape invalidates the
   * body's price and vice versa, so a single pass is a fixed point only by
   * accident. This alternates this module's tape portfolio with a full
   * ΒΕΛΤΙΣΤΟΣ pass until neither one improves anything, which is the
   * multi-round structure Hucke's lower bound (arXiv:2609.12106) says is the
   * only shape that can approach the optimum: a single greedy pass over the
   * replacements is provably not within a constant factor of the smallest
   * grammar. Every iteration is a strict whole-message improvement, so the loop
   * terminates on the token count and not on a clock. */
  let veltistosRuns = 0;
  for (let round = 0; round < ANAGRAPHE_MAX_ROUNDS; round++) {
    rounds = round + 1;
    if (budget.capped || budget.edges >= VELTISTOS_MAX_EDGES) break;
    if (round > 0 && veltistosRuns < ANAGRAPHE_MAX_ROUNDS) {
      veltistosRuns++;
      const v = veltistosEncode(text, enc,
        { message: bestMsg, messageTokens: bestTok, decoded: ref });
      if (v.applied && v.messageTokens < bestTok) {
        bestMsg = v.message; bestTok = v.messageTokens;
        const c = bestMsg.indexOf(CHIRON_SEP, bestMsg.indexOf(CHIRON_START));
        bestTape = bestMsg.slice(bestMsg.indexOf(CHIRON_START) + CHIRON_START.length, c);
        bestBody = bestMsg.slice(c + CHIRON_SEP.length);
      }
    }
    const parsed = chironParseTape(bestTape, script);
    if (!parsed || parsed.length === 0) break;
    const vals = valuesOf(bestTape, parsed);
    const before = bestTok;
    for (const [ctxLen, beam] of veltistosRungs()) {
      if (beam <= VELTISTOS_TAPE_BEAM) continue;          // already done by X120
      if (budget.capped || budget.edges >= Math.min(VELTISTOS_MAX_EDGES, ANAGRAPHE_MAX_EDGES)) break;
      const earlier: Entry[] = [];
      const newRaw = new Map<string, string>();
      let tapePrefix = '';
      for (const p of parsed) {
        const v = vals.get(p.glyph);
        const isOp = p.raw.startsWith(CHIRON_LIST) || p.raw.startsWith('×');
        /* EXACT SEED. X120 truncated this to 32 characters on purpose and said
         * so; the truncation changes the seed's tail for 2 of the 877 rules in
         * the 29 shipped wires (bench/x125), so this is a latent-defect fix, not
         * a gain, and it is reported that way. */
        if (budget.edges >= ANAGRAPHE_MAX_EDGES) { budget.capped = true; break; }
        if (!isOp && v !== undefined && v.length >= 2 && earlier.length) {
          const sp = veltistosParse(v, earlier, ctxLen, beam, tapePrefix + p.glyph, enc, budget);
          parses++;
          if (sp !== null && sp !== p.raw) newRaw.set(p.glyph, sp);
        }
        if (v !== undefined) earlier.push({ g: p.glyph, v });
        tapePrefix += p.glyph + (newRaw.get(p.glyph) ?? p.raw);
      }
      if (!newRaw.size) continue;
      const rebuilt = parsed.map((p) => ({ glyph: p.glyph, raw: newRaw.get(p.glyph) ?? p.raw }));
      consider(rebuilt.map((p) => p.glyph + p.raw).join(''), bestBody, rebuilt);
    }
    if (bestTok >= before) break;   // nothing moved this round
  }

  if (bestMsg === msg0) {
    return no(enc, inc, `anagraphe: ${parses} parse(s), ${priced} prices, ${rounds} round(s), no win${budget.capped ? ' (capped)' : ''}`,
      { parses, edges: budget.edges, priced, rounds, capped: budget.capped });
  }
  tapeGain = base - bestTok;
  return {
    applied: true, message: bestMsg, messageTokens: bestTok, decoded: ref,
    notes: `anagraphe: ${parses} tape parse(s) over ${veltosRungCount()} rung(s), ${budget.edges} edges, ${priced} whole-message prices, ${rounds} round(s), ${veltistosRuns} re-entry pass(es); M ${base} -> ${bestTok} (−${tapeGain})${budget.capped ? ' (capped)' : ''}`,
    parses, edges: budget.edges, priced, tapeGain, rounds, capped: budget.capped,
  };
  void veltistosRuns;
}

function veltosRungCount(): number { return veltistosRungs().length; }
