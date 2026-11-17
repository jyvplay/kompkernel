/**
 * src/lib/omega/enkibotismos.ts
 * =============================================================================
 * X131 — ΕΓΚΙΒΩΤΙΣΜΌΣ (enkibotismós, "encapsulation"): make the frontier's
 *        TAPE pay only for rules that earn their keep, and let it cite itself.
 *
 * WHY THE TAPE. Every prior arm (X129 ΣΥΓΚΌΛΛΗΣΙΣ, X130 ΜΕΤΟΝΟΜΑΣΊΑ) edited the
 * BODY. X129 was not pareto (+2190): rewriting the body destroys the whitespace,
 * column alignment and identifier substrings that ΣΤΉΛΗ / ΣΤΟΙΧΗΔΌΝ / ΒΈΛΤΙΣΤΟΣ
 * depend on. X130 touched only glyph *names* and was worth -8 over 29 lanes.
 * This codec's primary moves edit ONLY the tape — the dictionary's own storage.
 * The tape is pure overhead: it stores no content of its own, it only names the
 * content. Measured on the 29-lane frontier: total 12 020 = preamble 736 (6%) +
 * tape 2 915 (24%) + body 8 370 (70%).
 *
 * THE MOVES, all of which leave the message DENOTING the same text:
 *
 *   (1) LIVENESS PRUNING. A rule costs (1 glyph + its value) in the tape and
 *       saves (len - 1) tokens at each use. Used ZERO times (an ORPHAN — the
 *       body never reaches it, even through another rule) the whole entry is
 *       waste; used ONCE it is a dead loss of ~2 tokens. Mining creates rules
 *       for spans that WERE repeated, so a rule can be born profitable and
 *       stranded by a later arm. Both are undone by inlining the glyph back at
 *       its remaining use site and dropping the rule.
 *       MEASURED: orphans and single-use rules are both ~0 — the frontier's
 *       mining gate c*(t-1)-(1+t) > 0 already rejects c<=1. This move is kept
 *       because it is the correctness precondition for (2), and because it is
 *       what makes the pruning idempotent; it contributes ~0 tokens.
 *
 *   (2) CONTAINMENT FACTORING. If rule A's value occurs inside rule B's value,
 *       B can spell that part as a back-reference to A, which the tape format
 *       ALREADY supports. This is the textbook grammar-based-compression move
 *       (straight-line grammars; Re-Pair, Larsson & Moffat 1999; RPFC for
 *       string dictionaries) applied to the frontier's tape. It is a different
 *       relation from the repeated-n-gram one that every previous census tested
 *       and found empty — it is CONTAINMENT BETWEEN RULES, and no n-gram census
 *       can see it.
 *       The match is computed on EXPANDED values but must land on RAW character
 *       boundaries, so a match may span an existing back-reference. Matching on
 *       raw literals only (the first implementation) found far less: it missed
 *       every case where the shared text straddled a glyph the frontier had
 *       already emitted.
 *
 *   (3) ORDER REPACKING. The tape is an unordered set of (glyph -> value) pairs
 *       serialized in some order, and o200k is context-sensitive across the
 *       concatenation boundary, so the token count DEPENDS ON THE ORDER.
 *       Measured spread over valid orderings: code-ts 21, ls-real 17, json-pkg
 *       19 tokens — but the frontier's own order already sits at the minimum,
 *       so ORDERING HEADROOM IS 0. Ordering is therefore only ever *restored*,
 *       never improved: the codec uses Kahn's algorithm with the frontier's
 *       original order as priority so that the new dependency edges introduced
 *       by (2) cost as little reordering as possible. (A naive DFS topological
 *       sort reordered aggressively and gave back most of (2)'s gain: json-pkg
 *       added 5 references for -1 net token.)
 *
 * WHAT IS MEASURED AS CLOSED, so this does not chase it: repeated-token n-grams
 * in the body (0 profitable), in the tape (0), in the whole message (0); a
 * second full frontier pass (0 on every lane, bench/x131/recursive.ts); glyph
 * relabelling (X130, -8 total); single-use and orphaned rules (~0, above).
 *
 * SAFETY. The identity is the floor: a lane is only changed when the rewritten
 * WHOLE MESSAGE is strictly cheaper under the real `countTokens`, so no lane
 * can regress. Four further gates throw or bail rather than ship.
 *
 * EXACTNESS. A tape denotes a map glyph -> expanded value. Because pruning may
 * rewrite the body, the codec checks the thing that actually matters: it fully
 * expands every glyph in the body, before and after, and refuses to emit unless
 * the two expansions are EQUAL CHARACTER FOR CHARACTER. The frontier
 * independently guarantees `decoded === source`, which is asserted.
 *
 * NOT a greedy substring miner: no new substring is mined from the source. It is
 * a greedy best-gain rewrite over an already-existing rule set.
 * CPU-bound: O(rules^2) containment tests plus `countTokens` probes.
 * Opt out with OMEGA_NO_ENKIBOTISMOS=1.
 * ----------------------------------------------------------------------------
 */

import { countTokens, type EncodingName } from './bpe';
import { tagstackEncode } from './tagstack';

const GLYPH_LO = 0x0386;
const GLYPH_HI = 0x04ff;

function isGlyphCh(ch: string): boolean {
  const c = ch.codePointAt(0)!;
  return c >= GLYPH_LO && c <= GLYPH_HI;
}

interface Rule { g: string; v: string; }

/** Parse `§glyph value glyph value ...` — the FIRST occurrence of a glyph starts its rule. */
function parseTape(tape: string): Rule[] {
  const rules: Rule[] = [];
  const seen = new Set<string>();
  let cur: Rule | null = null;
  for (const ch of tape) {
    if (isGlyphCh(ch) && !seen.has(ch)) { seen.add(ch); cur = { g: ch, v: '' }; rules.push(cur); }
    else if (cur) cur.v += ch;
  }
  return rules;
}

function buildTape(rules: Rule[]): string { return '\u00a7' + rules.map((r) => r.g + r.v).join(''); }

/** Resolve every back-reference in the rules, yielding glyph -> full text. */
function expandRules(rules: Rule[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const r of rules) {
    let out = '';
    for (const ch of r.v) out += (isGlyphCh(ch) && m.has(ch)) ? m.get(ch)! : ch;
    m.set(r.g, out);
  }
  return m;
}

export interface EnkibotismosResult {
  message: string;
  /** Recover the plain frontier message (put the original tape and body back). */
  toFrontier: (m: string) => string;
  rulesBefore: number;
  rulesAfter: number;
  orphansDropped: number;
  prunedSingleUse: number;
  refsAdded: number;
  tokens: number;
  baseTokens: number;
}

/** A chosen rewrite: in rule `g`, replace raw chars [i, j) with glyph `a`. */
interface Ref { a: string; i: number; j: number; }

/**
 * Rewrite the frontier's tape: prune dead rules, factor containment into
 * back-references, and restore the entry order. Returns null when the frontier
 * emitted no tape, when nothing applies, or when the rewrite does not strictly
 * pay — in which case callers must emit the unmodified frontier message.
 */
export function enkibotismosEncode(text: string, enc: EncodingName = 'o200k_base'): EnkibotismosResult | null {
  if (enkibotismosDisabled()) return null;
  const base = tagstackEncode(text, enc) as unknown as { message: string; messageTokens: number; decoded: string };
  const M = base.message;
  const i1 = M.indexOf('\u00a7');
  if (i1 < 0) return null;                                  // frontier emitted no tape
  const i2 = M.indexOf('\u00b6', i1);
  const tape = i2 < 0 ? M.slice(i1) : M.slice(i1, i2);
  const body = i2 < 0 ? '' : M.slice(i2);

  const rules = parseTape(tape);
  if (rules.length < 3) return null;

  // ---- (1) reachability: keep only rules the body can actually reach --------
  const byV0 = new Map(rules.map((r) => [r.g, r.v] as const));
  const live = new Set<string>();
  for (const ch of body) if (isGlyphCh(ch) && byV0.has(ch)) live.add(ch);
  let grew = true;
  while (grew) {
    grew = false;
    for (const g of [...live]) {
      for (const ch of byV0.get(g)!) {
        if (isGlyphCh(ch) && byV0.has(ch) && !live.has(ch)) { live.add(ch); grew = true; }
      }
    }
  }
  const kept = rules.filter((r) => live.has(r.g));
  const orphansDropped = rules.length - kept.length;
  if (kept.length < 2) return null;

  // single-use rules are a net loss; inline them back and drop them
  // Uses are counted separately in the BODY and in other rules' values. Only a
  // rule with NO body use may be pruned: inlining into the body would break the
  // clean splice that `toFrontier` relies on, and the frontier's own mining gate
  // c*(t-1)-(1+t) > 0 already refuses to create body rules used only once, so
  // there is nothing measurable to win by rewriting the body here.
  const countUses = (g: string, rs: Rule[], b: string) => {
    let inBody = 0, inRules = 0;
    for (const ch of b) if (ch === g) inBody++;
    for (const r of rs) if (r.g !== g) for (const ch of r.v) if (ch === g) inRules++;
    return { inBody, inRules };
  };
  const inlineDead = (rs: Rule[], b: string, dead: Set<string>) => {
    const val = new Map(rs.map((r) => [r.g, r.v] as const));
    // Fixpoint: a dead rule's value may itself contain another dead glyph.
    const subst = (s0: string) => {
      let o = s0;
      for (let k = 0; k <= rs.length; k++) {
        let n = '';
        for (const ch of o) n += dead.has(ch) ? (val.get(ch) ?? ch) : ch;
        if (n === o) break;
        o = n;
      }
      return o;
    };
    return { rules: rs.filter((r) => !dead.has(r.g)).map((r) => ({ g: r.g, v: subst(r.v) })), body: subst(b) };
  };
  let work: Rule[] = kept.map((r) => ({ g: r.g, v: r.v }));
  let workBody = body;                       // invariant: only rules are rewritten
  for (let pass = 0; pass < 8; pass++) {
    const dead = new Set<string>();
    for (const r of work) {
      const u = countUses(r.g, work, workBody);
      if (u.inBody === 0 && u.inRules <= 1) dead.add(r.g);   // orphan, or used once inside a rule
    }
    if (dead.size === 0) break;
    const nx = inlineDead(work, workBody, dead);
    work = nx.rules; workBody = nx.body;
  }
  if (workBody !== body) return null;        // belt and braces: body must not move
  const prunedSingleUse = Math.max(0, kept.length - work.length);
  if (work.length < 2) return null;

  // ---- (2) containment factoring on EXPANDED values, RAW boundaries --------
  // The match is computed on EXPANDED values but must land on RAW character
  // boundaries, so a match may span a back-reference the frontier already
  // emitted. Matching raw literals only (the first implementation) found far
  // less: it missed every case where the shared text straddled an existing glyph.
  const byG2 = new Map(work.map((r) => [r.g, r.v] as const));
  const full = expandRules(work);                    // glyph -> fully expanded text
  const origOrder = work.map((r) => r.g);
  const idxOf = new Map(origOrder.map((g, i) => [g, i] as const));

  interface Cand2 { g: string; a: string; i: number; j: number; est: number; }
  const cands: Cand2[] = [];
  for (const B of work) {
    const v = B.v;
    if (v.length < 3) continue;
    const off: number[] = [0];
    let E = '';
    for (const ch of v) {
      const piece = (isGlyphCh(ch) && byG2.has(ch)) ? full.get(ch)! : ch;
      E += piece;
      off.push(off[off.length - 1]! + piece.length);
    }
    if (E.length < 3) continue;
    const isBoundary = new Set(off);
    let best: Cand2 | null = null;
    for (const A of work) {
      if (A.g === B.g) continue;
      const EA = full.get(A.g)!;
      if (EA.length < 3 || EA.length >= E.length) continue;
      let from = 0;
      for (;;) {
        const s = E.indexOf(EA, from);
        if (s < 0) break;
        from = s + 1;
        const e = s + EA.length;
        if (!isBoundary.has(s) || !isBoundary.has(e)) continue;
        const i = off.indexOf(s);
        const j = off.indexOf(e);
        if (i < 0 || j < 0 || j <= i) continue;
        if (j - i <= 1) continue;
        const est = countTokens(v.slice(i, j), enc) - 1;   // ranking hint only
        if (est > 0 && (best === null || est > best.est)) best = { g: B.g, a: A.g, i, j, est };
      }
    }
    if (best) cands.push(best);
  }

  // ---- (3) greedy, MEASURED application ------------------------------------
  // `est` is computed on the substring in isolation and is only a ranking hint:
  // in context a substring often merges with its neighbours and costs less than
  // it does alone, so the estimate overstates the gain (measured: json-pkg
  // estimated 6 tokens from 6 references and realised 1). Each reference is
  // therefore applied tentatively and kept only if the REAL whole-message token
  // count actually falls — in whichever direction it points.
  //
  // A backward reference (A already before B) needs no reordering. A forward one
  // is tried too, by moving A to immediately before B — the smallest move that
  // satisfies the tape's "first occurrence defines the rule" convention — and
  // kept only if the measured total still improves.
  const wellFormed = (rs: Rule[]) => {
    const seen = new Set<string>();
    for (const r of rs) {
      for (const ch of r.v) if (isGlyphCh(ch) && !seen.has(ch)) return false;
      seen.add(r.g);
    }
    return true;
  };
  const msgTok = (order: string[], val: Map<string, string>) =>
    countTokens(M.slice(0, i1) + buildTape(order.map((g) => ({ g, v: val.get(g)! }))) + workBody, enc);

  let curOrder: string[] = [...origOrder];
  const curVal = new Map(work.map((r) => [r.g, byG2.get(r.g)!] as const));
  let curTok = msgTok(curOrder, curVal);
  let refsAdded = 0;
  const usedRule = new Set<string>();
  cands.sort((x, y) => y.est - x.est);
  const MAX_PROBES = 600;
  let probes = 0;
  for (const c of cands) {
    if (probes++ >= MAX_PROBES) break;
    if (usedRule.has(c.g)) continue;                       // one reference per rule
    const v = curVal.get(c.g)!;
    if (c.j > v.length || c.j <= c.i) continue;
    let order = curOrder;
    const ia = order.indexOf(c.a);
    const ib = order.indexOf(c.g);
    if (ia < 0 || ib < 0) continue;
    if (ia > ib) {                                         // forward: minimal move
      const nxt = [...order];
      nxt.splice(ia, 1);
      nxt.splice(nxt.indexOf(c.g), 0, c.a);
      order = nxt;
    }
    const trialVal = new Map(curVal);
    trialVal.set(c.g, v.slice(0, c.i) + c.a + v.slice(c.j));
    const trialRules = order.map((g) => ({ g, v: trialVal.get(g)! }));
    if (!wellFormed(trialRules)) continue;
    const t = msgTok(order, trialVal);
    if (t < curTok) { curOrder = order; curVal.set(c.g, trialVal.get(c.g)!); curTok = t; refsAdded++; usedRule.add(c.g); }
  }
  const cur: Rule[] = curOrder.map((g) => ({ g, v: curVal.get(g)! }));

  const newTape = buildTape(cur);
  const message = M.slice(0, i1) + newTape + workBody;
  const tok = curTok;

  // ------------------------------- gates ------------------------------------
  // G0 (the real one): the message must DENOTE exactly the same text. Expand
  // every glyph in the body, recursively, before and after. Checked rather than
  // assumed, because pruning and factoring may rewrite both tape and body.
  const expandBody = (rs: Rule[], b: string) => {
    const m = expandRules(rs);
    let o = '';
    for (const ch of b) o += (isGlyphCh(ch) && m.has(ch)) ? m.get(ch)! : ch;
    return o;
  };
  if (expandBody(rules, body) !== expandBody(parseTape(newTape), workBody)) return null;
  // G1: every glyph the (possibly rewritten) body uses must still be defined
  const defined = new Set(parseTape(newTape).map((r) => r.g));
  for (const ch of workBody) if (isGlyphCh(ch) && !defined.has(ch)) return null;
  // G2: strictly cheaper than the identity (the floor)
  if (tok >= base.messageTokens) return null;
  // G3: the frontier still reproduces the source
  if (base.decoded !== text) throw new Error('ΕΓΚΙΒΩΤΙΣΜΌΣ: frontier did not reproduce the source');

  const toFrontier = (m: string): string => m.slice(0, i1) + tape + m.slice(i1 + newTape.length);
  if (toFrontier(message) !== M) throw new Error('ΕΓΚΙΒΩΤΙΣΜΌΣ: tape restore is not invertible');

  return {
    message, toFrontier,
    rulesBefore: rules.length, rulesAfter: cur.length,
    orphansDropped, prunedSingleUse, refsAdded,
    tokens: tok, baseTokens: base.messageTokens,
  };
}

/** Opt out with OMEGA_NO_ENKIBOTISMOS=1. */
export function enkibotismosDisabled(): boolean {
  if (typeof process === 'undefined') return false;
  return process.env?.OMEGA_NO_ENKIBOTISMOS === '1';
}
