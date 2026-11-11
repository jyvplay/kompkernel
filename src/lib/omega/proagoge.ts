/**
 * X103 — ΠΡΟΑΓΩΓΗ (proagōgē, "the bringing-forward, the promotion").
 *
 * ============================================================================
 * THE MECHANISM, AND WHY IT IS NOT ΓΕΝΝΑΔΑΣ, ΜΕΤΑΤΑΞΙΣ OR ΠΡΟΟΙΜΙΟΝ
 * ============================================================================
 *
 * A ΧΕΙΡΩΝ tape is `contract § k₁v₁ k₂v₂ … kₙvₙ ¶ body`.  The decoder does not
 * care what order the entries are in, provided every rule still appears after
 * the rules it references.  So the ORDER is a free parameter, and the stack has
 * been spending it in three different ways:
 *
 *   ΜΕΤΑΤΑΞΙΣ      relocates an entry to an arbitrary valid slot, by a seeded
 *                  stochastic first-improvement climb on the whole-message price.
 *                  It has no notion of WHY a slot would be good.
 *   ΓΕΝΝΑΔΑΣ       relocate-to-enable: finds a rule j AFTER i whose value is a
 *                  perfect PREFIX or SUFFIX of value(i), moves j just before i,
 *                  and re-spells only that one boundary.
 *   ΠΡΟΟΙΜΙΟΝ      re-spells a value as an interleaving of literal runs and
 *                  references to STRICTLY EARLIER rules.  Interior factors
 *                  included — but only for rules that are ALREADY earlier.
 *
 * The gap between them is exact and it is not covered by any combination:
 *
 *     a rule j sitting AFTER i whose value is a proper INTERIOR substring of
 *     value(i) is a factor that no codec in this stack can use.
 *
 * ΠΡΟΟΙΜΙΟΝ cannot reference it (j is later, and the delimiter-free parser would
 * read the letter as a NEW key and corrupt the tape — this is documented in
 * syndyasmos.ts as the reason `idx` is built incrementally).  ΓΕΝΝΑΔΑΣ will not
 * relocate it (its predicate is `startsWith` / `endsWith`, never `includes`).
 * ΜΕΤΑΤΑΞΙΣ may or may not stumble on the right slot, and it has no reason to
 * prefer it.
 *
 * ΠΡΟΑΓΩΓΗ closes that gap with TWO moves, because the constraint is directional
 * and either end of it can be moved:
 *
 *   BRING-FORWARD (variant A):  j after i, value(j) an interior substring of
 *       value(i).  Relocate j to immediately before i, then re-spell rule i and
 *       every rule that GAINED j as a factor, with the full interleaver over all
 *       rules now earlier than it.
 *
 *   PUSH-BACK (variant B):      the same pair, moved from the other end.
 *       Relocate i to immediately AFTER j.  Rule i's own dependencies are all
 *       earlier than i, hence earlier than j, so the move is legal for i by
 *       construction; the only thing to check is that no rule sitting between
 *       them mentions key(i), which would become a forward reference.
 *
 * Variant B exists because variant A is blocked exactly when value(j) mentions a
 * key that sits between i and j — and in that case variant B is still legal.
 * The two variants therefore cover different halves of the same population
 * rather than duplicating each other, and both are priced on the whole message
 * and gated on `chironDecode`.
 *
 * It is swept to a fixpoint, because one accepted move changes the factor graph
 * that the next scan reads.
 *
 * ============================================================================
 * WHY THE POPULATION IS NOT EMPTY  (bench/x103/receipts/pop.json, 29 lanes)
 * ============================================================================
 *
 *   interior-factor pairs with j after i ............ 24
 *   CONTROL, ΓΕΝΝΑΔΑΣ's population, same routine, same process, same wires:
 *     prefix-factor pairs with j after i ............ 41
 *     suffix-factor pairs with j after i ............ 16
 *
 * The control is ΓΕΝΝΑΔΑΣ's own population.  ΓΕΝΝΑΔΑΣ paid −43 tokens on 29
 * lanes from 57 pairs, so a population of 24 pairs with a STRONGER re-spelling
 * arm (the full interleaver instead of a single boundary) is a live population,
 * not a rounding error.  If it had measured 0 the codec would have been
 * falsified before it was written, and the receipt records that it did not.
 *
 * ============================================================================
 * LEGALITY, AND WHY EACH VARIANT'S CONDITION IS COMPLETE
 * ============================================================================
 *
 * BRING-FORWARD moves j from slot j to slot i (i < j).  Every other rule keeps
 * its relative order, so for a rule at position p the set of rules before it can
 * only grow (for i <= p < j it gains j) and never shrinks.  The only way to
 * create a forward reference is j itself mentioning a key that is no longer
 * before it.  Hence the single complete condition:
 *
 *     every key mentioned in value(j) must sit at a position < i.
 *
 * PUSH-BACK moves i from slot i to slot j+1.  Rules in (i, j) keep their
 * relative order and lose nothing except that i is no longer before them, so the
 * complete condition is the mirror image:
 *
 *     no rule in (i, j) may mention key(i).
 *
 * The gate `chironDecode(new) === ref` is the backstop for both, and for
 * whatever predicate the tape parser uses.
 *
 * No operator, no contract clause and no decode rule is added: what comes out is
 * an ordinary ΧΕΙΡΩΝ wire with the same rules in a different order and some
 * values spelled differently, so a reader who could expand the incumbent can
 * expand this by the same rule.
 */
import { countTokens, type EncodingName } from './bpe';
import { CHIRON_START, CHIRON_SEP, chironDecode } from './chiron';

export interface ProagogeResult {
  applied: boolean;
  message: string;
  messageTokens: number;
  decoded: string;
  notes: string;
  /** interior-factor pairs (i, j) examined */
  pairs: number;
  /** pairs refused because the move would create a forward reference */
  blocked: number;
  /** moves actually taken */
  moves: number;
  /** of those, how many were bring-forward vs push-back */
  bringForward: number;
  pushBack: number;
  /** values actually re-spelled */
  respelled: number;
  /** whole-message prices computed */
  priced: number;
}

interface Tape {
  contract: string;
  keys: string[];
  values: string[];
  body: string;
}

/** Full scans of the factor graph.  Each accepted move restarts the scan. */
const PROAGOGE_ROUNDS = 8;
/** Same bounds ΠΡΟΟΙΜΙΟΝ uses, so the re-speller is not stronger by accident. */
const MAX_SEGMENTATIONS = 400;
const MAX_PARTS = 5;
/** Hard CPU ceiling on whole-message prices, per lane.  Reported, never hidden. */
const PRICE_CAP = 40_000;

/**
 * Split a CHIRON message into contract / tape keys / tape values / body.
 * Identical predicate to ΔΙΑΓΡΑΦΗ's: a character is a key on FIRST appearance,
 * which is exactly what chironParseTape does, so the split agrees with the
 * decoder even when a value contains literal text from a key's script.
 */
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
  return { contract: msg.slice(0, w), keys, values, body: msg.slice(t + CHIRON_SEP.length) };
}

const serialise = (tp: Tape, keys: string[], values: string[]): string =>
  tp.contract + CHIRON_START + keys.map((k, i) => k + values[i]).join('') + CHIRON_SEP + tp.body;

/**
 * Every way of writing `target` as an interleaving of literal runs and
 * references to the values indexed in `idx` (which holds only rules EARLIER
 * than the target).  Same shape and same bounds as ΠΡΟΟΙΜΙΟΝ's `segmentations`.
 */
function segmentationsOf(target: string, idx: Map<string, string[]>): string[] {
  const out: string[] = [];
  const walk = (pos: number, acc: string, parts: number): void => {
    if (out.length >= MAX_SEGMENTATIONS) return;
    if (pos === target.length) { out.push(acc); return; }
    if (parts >= MAX_PARTS) return;
    for (let L = target.length - pos; L >= 1; L--) {
      const sub = target.slice(pos, pos + L);
      const ks = idx.get(sub);
      if (ks !== undefined) {
        for (const k of ks) { walk(pos + L, acc + k, parts + 1); if (out.length >= MAX_SEGMENTATIONS) return; }
      }
      walk(pos + L, acc + sub, parts + 1);
    }
  };
  walk(0, '', 0);
  return out;
}

/**
 * Re-spell nv[pos] with the cheapest interleaving, priced on the WHOLE message.
 * Returns null when nothing beats the current spelling.  `nv` is mutated only
 * transiently and is restored before returning.
 */
function respellAt(
  tp: Tape, nk: string[], nv: string[], pos: number, enc: EncodingName, priced: { n: number },
): string | null {
  const target = nv[pos];
  if (target.length < 2) return null;
  const idx = new Map<string, string[]>();
  for (let p = 0; p < pos; p++) {
    const v = nv[p];
    if (v.length < 2) continue;
    const a = idx.get(v);
    if (a === undefined) idx.set(v, [nk[p]]); else a.push(nk[p]);
  }
  const cands = segmentationsOf(target, idx);
  if (cands.length < 2) return null;
  let bestTok = countTokens(serialise(tp, nk, nv), enc);
  priced.n++;
  let best: string | null = null;
  const saved = nv[pos];
  for (const c of cands) {
    if (c === saved) continue;
    if (priced.n >= PRICE_CAP) break;
    nv[pos] = c;
    priced.n++;
    const t = countTokens(serialise(tp, nk, nv), enc);
    if (t < bestTok) { bestTok = t; best = c; }
  }
  nv[pos] = saved;
  return best;
}

export function proagogeDisabled(): boolean {
  return typeof process !== 'undefined' && !!process.env && process.env.OMEGA_NO_PROAGOGE === '1';
}

/**
 * Close the interior-factor gap: move a rule and the rule that wants it until
 * the factor is legal, then re-spell.
 *
 * `text` is the SOURCE.  The object preserved is `chironDecode(incumbent)` — the
 * parent's output, which on a composed lane (ΟΥΡΑ) is not the source.  This is
 * ΓΕΝΝΑΔΑΣ's reference object, kept, because on a composed lane `decoded ===
 * text` is unsatisfiable and the codec would refuse without ever searching.
 */
export function proagogeEncode(
  text: string,
  enc: import('./bpe').EncodingName,
  incumbent: { message: string; messageTokens: number; decoded: string },
): ProagogeResult {
  const no = (notes: string, extra: Partial<ProagogeResult> = {}): ProagogeResult => ({
    applied: false, message: incumbent.message, messageTokens: incumbent.messageTokens,
    decoded: incumbent.decoded, notes, pairs: 0, blocked: 0, moves: 0, bringForward: 0,
    pushBack: 0, respelled: 0, priced: 0, ...extra,
  });
  if (proagogeDisabled()) return no('proagoge: disabled by OMEGA_NO_PROAGOGE');

  const tp = parseTape(incumbent.message);
  if (!tp) return no('proagoge: incumbent has no CHIRON frame');

  let ref: string;
  try { ref = chironDecode(incumbent.message.slice(incumbent.message.indexOf(CHIRON_START))); }
  catch { return no('proagoge: incumbent does not decode — not a candidate'); }

  // Sanity: the incumbent's own recorded price must be reproducible.  A mismatch
  // is a broken measurement, not a result.
  const incumbentPrice = countTokens(incumbent.message, enc);
  if (incumbentPrice !== incumbent.messageTokens) {
    return no(`proagoge: REFUSED — incumbent price ${incumbentPrice} != recorded ${incumbent.messageTokens}`, { priced: 1 });
  }

  let keys = tp.keys.slice();
  let values = tp.values.slice();
  let cur = incumbent.messageTokens;
  let pairs = 0, blocked = 0, moves = 0, bringForward = 0, pushBack = 0, respelled = 0, rounds = 0, capped = false;
  const priced = { n: 1 };   // the sanity price above

  for (let round = 0; round < PROAGOGE_ROUNDS; round++) {
    rounds++;
    let moved = false;
    const n = keys.length;
    if (n < 4) break;
    const posOf = new Map<string, number>();
    for (let p = 0; p < n; p++) posOf.set(keys[p], p);
    scan:
    for (let i = 0; i < n; i++) {
      const vi = values[i];
      if (vi.length < 3) continue;
      for (let j = i + 1; j < n; j++) {
        if (priced.n >= PRICE_CAP) { capped = true; break scan; }
        const vj = values[j];
        if (vj.length < 2 || vj.length + 2 > vi.length) continue;
        // first occurrence that is NEITHER a prefix NOR a suffix
        let at = vi.indexOf(vj);
        while (at >= 0 && (at === 0 || at + vj.length === vi.length)) at = vi.indexOf(vj, at + 1);
        if (at < 0) continue;
        pairs++;

        // ---- variant A: BRING-FORWARD j to slot i.
        // Legal iff every key value(j) mentions sits before i.
        let legalA = true;
        for (const ch of vj) {
          const p = posOf.get(ch);
          if (p !== undefined && p >= i) { legalA = false; break; }
        }
        // ---- variant B: PUSH-BACK i to just after j.
        // Legal iff no rule in (i, j) mentions key(i).
        let legalB = true;
        for (let p = i + 1; p < j; p++) {
          if (values[p].includes(keys[i])) { legalB = false; break; }
        }
        if (!legalA && !legalB) { blocked++; continue; }

        // Try A first, then B, and keep the first that is strictly cheaper.
        for (const variant of (legalA ? ['A', 'B'] : ['B']) as Array<'A' | 'B'>) {
          if (priced.n >= PRICE_CAP) { capped = true; break scan; }
          let order: number[];
          if (variant === 'A') {
            order = [];
            for (let p = 0; p < n; p++) if (p !== j) order.push(p);
            order.splice(i, 0, j);
          } else {
            order = [];
            for (let p = 0; p < n; p++) if (p !== i) order.push(p);
            order.splice(j, 0, i);   // removing i shifts j down by one, so j is the slot after it
          }
          const newIdx = new Array<number>(n);
          order.forEach((p, k) => { newIdx[p] = k; });
          const nk = order.map((p) => keys[p]);
          const nv = order.map((p) => values[p]);
          // Re-spell the rule that can now use the factor.  Under BRING-FORWARD the
          // rules that sat in (i, j) also GAIN j (j now precedes them), so they are
          // re-spelled too; under PUSH-BACK they do not, so only the moved rule is.
          const targets = new Set<number>([newIdx[i]]);
          if (variant === 'A') {
            for (let p = i + 1; p < j; p++) if (values[p].includes(vj)) targets.add(newIdx[p]);
          }
          for (const t of targets) {
            const r = respellAt(tp, nk, nv, t, enc, priced);
            if (r !== null) { nv[t] = r; respelled++; }
          }
          const msg = serialise(tp, nk, nv);
          priced.n++;
          const tok = countTokens(msg, enc);
          if (tok >= cur) continue;
          let dec: string;
          try { dec = chironDecode(msg.slice(msg.indexOf(CHIRON_START))); } catch { continue; }
          if (dec !== ref) continue;
          keys = nk; values = nv; cur = tok; moves++;
          if (variant === 'A') bringForward++; else pushBack++;
          moved = true;
          break scan;   // the factor graph changed; rescan from the new tape
        }
      }
    }
    if (!moved) break;
  }

  const summary = `proagoge: ${rounds} scan(s), ${pairs} interior-factor pairs, ${blocked} blocked by a forward reference, ${moves} moved (${bringForward} bring-forward, ${pushBack} push-back), ${respelled} re-spelled, ${priced.n} whole-message prices; M ${incumbent.messageTokens} -> ${cur}${capped ? ` (PRICE_CAP ${PRICE_CAP} reached)` : ''}`;
  if (moves === 0) {
    return {
      applied: false, message: incumbent.message, messageTokens: incumbent.messageTokens, decoded: ref,
      notes: summary, pairs, blocked, moves: 0, bringForward: 0, pushBack: 0, respelled: 0, priced: priced.n,
    };
  }
  const message = serialise(tp, keys, values);
  return {
    applied: true, message, messageTokens: cur, decoded: ref, notes: summary,
    pairs, blocked, moves, bringForward, pushBack, respelled, priced: priced.n,
  };
}
