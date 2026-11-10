/**
 * X102 — ΠΑΛΙΝΔΡΟΜΟΣ (palindromos, "running back, recurrence, a return").
 *
 * ============================================================================
 * THE MECHANISM, AND WHY IT IS NOT ANY CODEC ALREADY IN THE STACK
 * ============================================================================
 *
 * Every wire-level codec in this stack is called EXACTLY ONCE, in a fixed order,
 * inside `tagstackEncode`:
 *
 *     ἸΣΟΜΟΡΦΪΑ -> ΜΕΤΑΤΑΞΙΣ -> ΣΥΝΔΥΑΣΜΟΣ -> ΓΕΝΝΑΔΑΣ -> ΔΙΑΓΡΑΦΗ
 *
 * and each one's admission gate is "the whole message got strictly smaller".  A
 * gate like that is a DESCENT step, and a descent step is only locally optimal
 * for the objective it was measured against.  After ΜΕΤΑΤΑΞΙΣ relocates a rule,
 * the tape's price changes — so a re-spelling ΣΥΝΔΥΑΣΜΟΣ rejected a moment ago
 * may now pay, and a rule ΧΕΙΡΟΝ's deletion pass kept may now be dead.  Nothing
 * in the stack ever goes back.
 *
 * ΓΕΝΝΑΔΑΣ is the only codec that loops at all, and it loops over exactly two
 * moves (ΣΥΝΔΥΑΣΜΟΣ and ΜΕΤΑΤΑΞΙΣ) for four rounds, inside its own call.  The
 * chain around it is still a single pass.
 *
 * ΠΑΛΙΝΔΡΟΜΟΣ closes that: it re-runs the WHOLE wire-level sequence against the
 * incumbent until no member improves the message, then stops.  Because every
 * member's gate is a strict decrease on an integer token count, the loop
 * terminates — there are finitely many integers below the incumbent's count —
 * and it is capped at `PALINDROMOS_ROUNDS` as a belt-and-braces bound.
 *
 * This is a different mechanism from every codec in the stack, not a reframing
 * of one:
 *
 *   - ἸΣΟΜΟΡΦΪΑ, ΜΕΤΑΤΑΞΙΣ, ΣΥΝΔΥΑΣΜΟΣ, ΓΕΝΝΑΔΑΣ and ΔΙΑΓΡΑΦΗ are all
 *     TRANSFORMATIONS of the wire.  ΠΑΛΙΝΔΡΟΜΟΣ is a SEARCH SCHEDULE over them.
 *     It introduces no new move, no new operator and no new contract clause; its
 *     contribution is that it lets a move be revisited after a different move has
 *     changed the objective it is measured against.
 *   - Its gain is a SECOND-ORDER effect: it is exactly the set of improvements
 *     that are invisible to any single pass because they require two codecs to
 *     have each changed the wire in turn.
 *   - Its cost is honest and bounded: one extra pass over the wire-level codecs
 *     per round, and it stops the first round in which nothing improves.
 *
 * ============================================================================
 * THE GATE
 * ============================================================================
 *
 * The reference object is ΓΕΝΝΑΔΑΣ's: `chironDecode(incumbent)`, the PARENT'S
 * OUTPUT, which on an ΟΥΡΑ-composed lane is not the source.  Every accepted step
 * re-decodes the exact string emitted with the repository's own decoder and
 * demands byte equality with that reference.  A step is accepted only if it is
 * `applied`, strictly cheaper, and still decodes to the reference.
 */
import { countTokens } from './bpe';
import { CHIRON_START, chironDecode } from './chiron';
import { gennadasEncode } from './gennadas';
import { diagrapheEncode } from './diagraphe';
import { isomorphiaEncode } from './isomorphia';
import { metataxisEncode } from './metataxis';
import { syndyasmosEncode } from './syndyasmos';
import type { EncodingName } from './bpe';

export const PALINDROMOS_ROUNDS = 3;

export interface PalindromosResult {
  applied: boolean;
  message: string;
  messageTokens: number;
  decoded: string;
  notes: string;
  rounds: number;
  steps: number;
  /** per-member accepted steps, so the cost of each member can be priced against its yield */
  byMember: Record<string, number>;
}

interface Cand {
  message: string;
  messageTokens: number;
  decoded: string;
}

/**
 * ΠΑΛΙΝΔΡΟΜΟΣ is OPT-IN, and that is a measured decision rather than a caution.
 *
 * 29-lane interleaved A/B (bench/x102/receipts/palindromos29.json): **-9 tokens,
 * 4 lanes improved, 0 worse, byte-exact 29/29** on top of ΔΙΑΓΡΑΦΗ's own -5.
 * Isolated CPU, alternating reps, medians (bench/x102/receipts/x102cpu.json):
 * **109 959 ms vs 63 648 ms control = +72.8 % wall clock** on the six lanes
 * measured, because the loop re-runs ΓΕΝΝΑΔΑΣ and ΓΕΝΝΑΔΑΣ's relocate-to-enable
 * is O(rules^2).  The compression gain is real and the CPU cost is real, and
 * 0.07 % of tokens is not worth 1.7x the wall clock for a user who is not
 * billed per token.  So the loop ships DISABLED and is switched on with
 * OMEGA_PALINDROMOS=1; ΔΙΑΓΡΑΦΗ, which is cheap and pays on its own, ships
 * ENABLED.
 */
export function palindromosDisabled(): boolean {
  if (typeof process === 'undefined' || !process.env) return true;
  if (process.env.OMEGA_NO_PALINDROMOS === '1') return true;
  return process.env.OMEGA_PALINDROMOS !== '1';
}

/** One wire-level codec, in the order the chain applies them. */
type Member = (text: string, enc: EncodingName, cur: Cand) => { applied: boolean; message: string; messageTokens: number; decoded: string };

export function palindromosEncode(
  text: string,
  enc: EncodingName,
  incumbent: { message: string; messageTokens: number; decoded: string },
): PalindromosResult {
  const no = (notes: string): PalindromosResult => ({
    applied: false, message: incumbent.message, messageTokens: incumbent.messageTokens,
    decoded: incumbent.decoded, notes, rounds: 0, steps: 0, byMember: {},
  });
  if (palindromosDisabled()) return no('palindromos: disabled by OMEGA_NO_PALINDROMOS');

  const w = incumbent.message.indexOf(CHIRON_START);
  if (w < 0) return no('palindromos: incumbent has no CHIRON frame');

  let ref: string;
  try { ref = chironDecode(incumbent.message.slice(w)); }
  catch { return no('palindromos: incumbent does not decode — not a candidate'); }

  const members: Array<[string, Member]> = [
    ['ἸΣΟΜΟΡΦΪΑ', (t, e, c) => isomorphiaEncode(t, e, c) as unknown as ReturnType<Member>],
    ['ΜΕΤΑΤΑΞΙΣ', (t, e, c) => metataxisEncode(t, e, c) as unknown as ReturnType<Member>],
    ['ΣΥΝΔΥΑΣΜΟΣ', (t, e, c) => syndyasmosEncode(t, e, c) as unknown as ReturnType<Member>],
    ['ΓΕΝΝΑΔΑΣ', (t, e, c) => gennadasEncode(t, e, c) as unknown as ReturnType<Member>],
    ['ΔΙΑΓΡΑΦΗ', (t, e, c) => diagrapheEncode(t, e, c) as unknown as ReturnType<Member>],
  ];

  let cur: Cand = { message: incumbent.message, messageTokens: incumbent.messageTokens, decoded: ref };
  let rounds = 0, steps = 0;
  const byMember: Record<string, number> = {};
  const before = incumbent.messageTokens;

  for (let r = 0; r < PALINDROMOS_ROUNDS; r++) {
    rounds++;
    let improved = false;
    for (const [name, m] of members) {
      let out: ReturnType<Member>;
      try { out = m(text, enc, cur); } catch { continue; }
      if (!out || !out.applied) continue;
      if (!(out.messageTokens < cur.messageTokens)) continue;
      let ok = false;
      try { ok = chironDecode(out.message.slice(out.message.indexOf(CHIRON_START))) === ref; } catch { ok = false; }
      if (!ok) continue;
      cur = { message: out.message, messageTokens: out.messageTokens, decoded: ref };
      steps++;
      byMember[name] = (byMember[name] ?? 0) + 1;
      improved = true;
    }
    if (!improved) break;
  }

  if (steps === 0) {
    return { applied: false, message: incumbent.message, messageTokens: incumbent.messageTokens, decoded: ref, notes: `palindromos: ${rounds} rounds, no member improved on re-run`, rounds, steps: 0, byMember };
  }
  // A final exact price: the members report their own counts, but the emitted
  // string is what is billed, so count it once more on the exact output.
  const exactTokens = countTokens(cur.message, enc);
  return {
    applied: exactTokens < before,
    message: cur.message,
    messageTokens: exactTokens,
    decoded: ref,
    notes: `palindromos: ${rounds} rounds, ${steps} re-run steps (${Object.entries(byMember).map(([k, v]) => `${k} ${v}`).join(', ')}); M ${before} -> ${exactTokens}`,
    rounds, steps, byMember,
  };
}
