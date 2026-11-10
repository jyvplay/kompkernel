/**
 * X102 — ΔΙΑΓΡΑΦΗ (diagraphe, "the deletion, the erasure").
 *
 * ============================================================================
 * THE MECHANISM, AND WHY IT IS NOT ANY CODEC ALREADY IN THE STACK
 * ============================================================================
 *
 * ΧΕΙΡΟΝ's macro search ends with a BACKWARD-DELETION pass: a rule that stopped
 * paying is removed, its value written back into every user, and the whole wire
 * re-priced.  That pass is the only place in the stack where a rule is ever
 * REMOVED, and it is gated:
 *
 *     while (changed && !spent() && trials < 400) {
 *       for (let i = rules.length - 1; i >= 0; i--) {
 *         if (trials++ >= 400 || spent()) break;
 *
 * `spent()` is the SHARED WORK METER, and on the lane set it is nearly gone by
 * the time the deletion pass starts.  Measured on all 29 frontier lanes
 * (bench/x101/klimax29.json): the meter is 96 % exhausted on ls-l-real, 75 % on
 * ps-aux-real, 73 % on code-ts.  So ΧΕΙΡΟΝ's own cleanup is cut short exactly
 * where it has the most rules to clean.
 *
 * And nothing downstream ever cleans up after it.  ΜΕΤΑΤΑΞΙΣ relocates rules,
 * ΣΥΝΔΥΑΣΜΟΣ re-spells their values, ΓΕΝΝΑΔΑΣ relocates again to enable
 * re-spellings — all three change the tape's price, and NONE of them asks
 * whether a rule that paid at ΧΕΙΡΟΝ time still pays now.  The shipped wire has
 * therefore never been swept.
 *
 * ΔΙΑΓΡΑΦΗ is that sweep, run on the FINISHED wire, where it is not
 * budget-gated:
 *
 *     for each rule i, from last to first:
 *         write rule i's value back into every user (the body and every other
 *         rule's value), drop the rule, re-price the WHOLE message, and keep it
 *         only if the message got strictly smaller AND chironDecode is unchanged.
 *
 * Three properties make it a different mechanism rather than a rehash:
 *
 *   1. It runs on the POST-wire-level wire.  ΧΕΙΡΟΝ's deletion pass cannot see
 *      what ΜΕΤΑΤΑΞΙΣ/ΣΥΝΔΥΑΣΜΟΣ/ΓΕΝΝΑΔΑΣ did to the tape's price.
 *   2. It is not budget-gated, so it cannot be cut short by the meter that
 *      ΧΕΙΡΟΝ's own pass shares with the variant sweep.
 *   3. Its acceptance predicate is the whole message re-priced and re-decoded,
 *      not a per-rule bound — so a rule whose local bound is negative but whose
 *      global price is also negative (because removing it lets the tokenizer
 *      merge the residue) is still found.
 *
 * It adds NO operator, NO contract clause and NO decode rule: the wire that
 * comes out is an ordinary ΧΕΙΡΟΝ wire with fewer rules, so a reader who could
 * expand the incumbent can expand this by the same rule.
 *
 * ============================================================================
 * LEGALITY
 * ============================================================================
 *
 * Deleting rule i writes `value(i)` into every user.  `value(i)` may itself
 * contain references, but only to rules EARLIER than i (chironDecode rejects
 * forward references: `if (at >= upto) return null`), and those rules survive
 * the deletion, so the remaining tape is still acyclic and every reference is
 * still backwards.  The emitted wire is therefore always well-formed, and the
 * gate is `chironDecode(new) === chironDecode(old)` — a byte-exact round trip of
 * the object the incumbent produced, checked with the repository's own decoder.
 *
 * Only plain literal rules are deleted.  `rep` (`~`) and `list` (`…`) rules are
 * left alone, and the census says there are none on this lane set anyway
 * (bench/x100: `×` count 0, `…` count 0, integer runs >= 4: 0).
 */
import { countTokens } from './bpe';
import { CHIRON_LIST, CHIRON_REP, CHIRON_SEP, CHIRON_START, chironDecode } from './chiron';

export interface DiagrapheResult {
  applied: boolean;
  message: string;
  messageTokens: number;
  decoded: string;
  notes: string;
  /** rules examined */
  examined: number;
  /** rules actually deleted */
  deleted: number;
  /** whole-message prices computed */
  priced: number;
}

interface Tape {
  contract: string;
  keys: string[];
  values: string[];
  body: string;
}

/** Split a CHIRON message into contract / tape keys / tape values / body. */
function parseTape(msg: string): Tape | null {
  const w = msg.indexOf(CHIRON_START);
  if (w < 0) return null;
  const t = msg.indexOf(CHIRON_SEP, w);
  if (t < 0) return null;
  const tape = msg.slice(w + 1, t);
  const keys: string[] = [];
  const values: string[] = [];
  const seen = new Set<string>();
  let ck = '';
  let cv = '';
  for (const ch of tape) {
    if (ch.charCodeAt(0) > 0x370 && !seen.has(ch)) {
      if (ck !== '') { keys.push(ck); values.push(cv); }
      seen.add(ch); ck = ch; cv = '';
    } else {
      cv += ch;
    }
  }
  if (ck !== '') { keys.push(ck); values.push(cv); }
  return { contract: msg.slice(0, w), keys, values, body: msg.slice(t + 1) };
}

function render(tp: Tape, keys: string[], values: string[], body: string): string {
  let tape = '';
  for (let i = 0; i < keys.length; i++) tape += keys[i] + values[i];
  return tp.contract + CHIRON_START + tape + CHIRON_SEP + body;
}

/** Replace every occurrence of `from` in `s` with `to`, in one left-to-right pass. */
function subst(s: string, from: string, to: string): string {
  if (!s.includes(from)) return s;
  let out = '';
  let i = 0;
  while (i < s.length) {
    if (s.startsWith(from, i)) { out += to; i += from.length; } else { out += s[i]; i++; }
  }
  return out;
}

const isPlainLiteral = (v: string): boolean => !v.startsWith(CHIRON_REP) && !v.startsWith(CHIRON_LIST);

export function diagrapheDisabled(): boolean {
  return typeof process !== 'undefined' && !!process.env && process.env.OMEGA_NO_DIAGRAPHE === '1';
}

/**
 * Sweep the finished wire for rules that no longer pay, and delete them.
 *
 * `text` is the SOURCE.  The object preserved is `chironDecode(incumbent)` — the
 * parent's output, which on a composed lane (ΟΥΡΑ) is not the source.  This is
 * ΓΕΝΝΑΔΑΣ's reference object, kept, because on a composed lane `decoded ===
 * text` is unsatisfiable and the codec would refuse without ever searching.
 */
export function diagrapheEncode(
  text: string,
  enc: import('./bpe').EncodingName,
  incumbent: { message: string; messageTokens: number; decoded: string },
): DiagrapheResult {
  const no = (notes: string): DiagrapheResult => ({
    applied: false, message: incumbent.message, messageTokens: incumbent.messageTokens,
    decoded: incumbent.decoded, notes, examined: 0, deleted: 0, priced: 0,
  });
  if (diagrapheDisabled()) return no('diagraphe: disabled by OMEGA_NO_DIAGRAPHE');

  const tp = parseTape(incumbent.message);
  if (!tp) return no('diagraphe: incumbent has no CHIRON frame');

  let ref: string;
  try { ref = chironDecode(incumbent.message.slice(incumbent.message.indexOf(CHIRON_START))); }
  catch { return no('diagraphe: incumbent does not decode — not a candidate'); }

  let keys = tp.keys.slice();
  let values = tp.values.slice();
  let body = tp.body;
  let cur = incumbent.messageTokens;
  let examined = 0, deleted = 0, priced = 0;
  let changed = true;
  let guard = 0;

  while (changed && guard++ < 64) {
    changed = false;
    // Sweep from the LAST rule backwards: a later rule is a user of an earlier
    // one, so removing the later one first cannot strand a reference.
    for (let i = keys.length - 1; i >= 0; i--) {
      examined++;
      const v = values[i];
      if (!isPlainLiteral(v)) continue;
      const g = keys[i];
      const used = body.includes(g) || values.some((x, j) => j !== i && x.includes(g));
      if (!used) {
        // Nothing references this rule: dropping it is a pure win, but price it
        // anyway rather than assuming, because the tokenizer's segmentation of
        // the tape changes when an entry disappears.
        const nk = keys.slice(0, i).concat(keys.slice(i + 1));
        const nv = values.slice(0, i).concat(values.slice(i + 1));
        const m = render(tp, nk, nv, body);
        priced++;
        const t = countTokens(m, enc);
        if (t < cur) {
          try { if (chironDecode(m.slice(m.indexOf(CHIRON_START))) !== ref) continue; } catch { continue; }
          keys = nk; values = nv; cur = t; deleted++; changed = true;
        }
        continue;
      }
      const nk = keys.slice(0, i).concat(keys.slice(i + 1));
      const nv = values.slice(0, i).concat(values.slice(i + 1)).map((x) => subst(x, g, v));
      const nb = subst(body, g, v);
      if (nb === body && nv.every((x, j) => x === values[j < i ? j : j + 1])) continue;
      const m = render(tp, nk, nv, nb);
      priced++;
      const t = countTokens(m, enc);
      if (t < cur) {
        try { if (chironDecode(m.slice(m.indexOf(CHIRON_START))) !== ref) continue; } catch { continue; }
        keys = nk; values = nv; body = nb; cur = t; deleted++; changed = true;
      }
    }
  }

  if (deleted === 0) {
    return { applied: false, message: incumbent.message, messageTokens: incumbent.messageTokens, decoded: ref, notes: `diagraphe: swept ${examined} rules, none stopped paying`, examined, deleted: 0, priced };
  }
  const message = render(tp, keys, values, body);
  return {
    applied: true, message, messageTokens: cur, decoded: ref,
    notes: `diagraphe: swept ${examined} rules, deleted ${deleted}, ${priced} whole-message prices; M ${incumbent.messageTokens} -> ${cur}`,
    examined, deleted, priced,
  };
}
