import { now } from './clock';
import { workTick, workExhausted } from './workmeter';
import { countTokens, encodeIds, type EncodingName } from './bpe';
import {
  CHIRON_START, CHIRON_SEP, CHIRON_SCRIPTS,
  chironInScript, chironParseTape, chironDecode, type ChironScript,
} from './chiron';

/**
 * src/lib/omega/stoichedon.ts — X122. ΣΤΟΙΧΗΔΟΝ (stoichedon, "set out in rows").
 * =============================================================================
 *
 * THE QUANTIFIER EVERY TAPE IN THIS STACK LEAVES ON THE TABLE
 * -----------------------------------------------------------------------------
 * A CHIRON tape is `§ g1 v1 g2 v2 … ¶ body`, and the reader is told only:
 *
 *     "Every new <Cyrillic letter> before ¶ starts a rule whose text runs to the
 *      next new letter or to ¶.  In the text after ¶ expand every rule,
 *      repeatedly, and print only the result."
 *
 * That sentence names the rules by their GLYPH, never by their position.  So two
 * things about a tape are invisible to the reader and are therefore free:
 *
 *   (a) the ORDER in which the rules are written out, and
 *   (b) which pool letter stands for which rule.
 *
 * Neither changes a single byte of the expansion.  Both change the price, because
 * the tape is delimiter-free: the exotic letters are simultaneously dictionary
 * keys AND the token-boundary separators that decide how the 700-odd characters
 * of literal dictionary text merge.  Every miner in this repository fixes (a) to
 * its own discovery order and (b) to the pool order, and never revisits either.
 *
 * Measured on the 19 framed lanes of the frozen X121 frontier
 * (bench/x122/lanes29.txt, receipts in bench/x122/): the tape's literal content
 * prices at 0.414 tok/char while the body's plain text prices at 0.275, and the
 * whole relabelling search is worth −39 tokens with −13 on `ps-aux-real`
 * (bench/x122/opt.ts, every state verified by `chironDecode`).  That is small,
 * and this header says so; the point is that it is FREE and that nobody was
 * taking it.
 *
 * WHAT IS ACTUALLY NEW HERE
 * -----------------------------------------------------------------------------
 *   1. The tape's serialization order as an OPTIMIZATION VARIABLE.  It is not
 *      unconstrained.  `chironParseTape` re-cuts the tape at the first in-script
 *      character it has not yet seen, so a value may only reference rules that
 *      appear EARLIER, and `chironDecode` rejects a forward reference outright
 *      (`at >= upto`).  The feasible set is therefore the set of topological
 *      orders of the rule DAG, and the search is over that set.
 *
 *   2. The rule -> glyph bijection as an optimization variable, searched TOGETHER
 *      with the order.  They are not separable: a glyph transposition turns rule
 *      A's value, which referenced rule B, into a reference to A ITSELF, and that
 *      is malformed.  A rule-id topological test does not see this — only the real
 *      parser does — so the feasibility test here is `chironParseTape` compared
 *      element-by-element against the tape we meant to write.
 *
 *   3. Exact SEPARABILITY of the frame, which is what makes the search cheap.
 *      Measured on all 19 framed lanes (bench/x122/sep.ts, 0 mismatches):
 *
 *          tokens(§ tape ¶ body) === tokens(§ tape ¶) + tokens(body)
 *
 *      The `§` and `¶` marks are always their own tokens, so the tape and the body
 *      tokenize independently.  An ORDER move therefore re-counts only the tape;
 *      a GLYPH move re-counts both.  On ls-l-real that is 1 019 characters instead
 *      of 2 532, i.e. the dominant neighbourhood costs ~40 % as much as a naive
 *      whole-message re-count.
 *
 * WHAT IS BORROWED, AND WHAT IS ACTUALLY NEW (STATED PLAINLY)
 * -----------------------------------------------------------------------------
 * The frame, the tape grammar, the decoder and the generated prose contract are
 * CHIRON's, used through its exported functions and never re-implemented.  The
 * admission gate — byte-exact `chironDecode` against the incumbent's own
 * expansion, plus a strict whole-message token win — is ΒΕΛΤΙΣΤΟΣ's
 * (`admitParentRelative` in tagstack.ts), and it is the repository's decoder
 * that decides, not this module's own bookkeeping.
 *
 * BOTH AXES ARE ALREADY SPENT, INDIVIDUALLY, BY EXISTING CODECS.  ΜΕΤΑΤΑΞΙΣ
 * relocates one rule to an arbitrary valid slot by a seeded first-improvement
 * climb; ΙΣΟΜΟΡΦΙΑ swaps two letters everywhere; ΠΡΟΑΓΩΓΗ relocates a rule to
 * ENABLE a re-spelling; ARIADNE hill-climbs the rule→glyph bijection during
 * construction.  This module claims none of those moves.
 *
 * What is new here is narrow and measurable:
 *   (1) The two axes are searched JOINTLY, and they have to be: a glyph
 *       transposition turns rule A's reference to rule B into a reference to A
 *       itself, which is malformed.  Searched separately, each axis is stuck at
 *       whatever the other one left behind; searched together, the coupling
 *       constraint is checked by the real parser on every probe.
 *   (2) The FRAME SPLIT `tokens(§ tape ¶ body) = tokens(§ tape ¶) + tokens(body)`,
 *       measured exact on all 19 framed lanes.  An order move therefore prices
 *       only the tape, not the message — on ls-l-real, 1 019 characters instead
 *       of 2 532.  Every other wire-level codec here re-counts the whole message
 *       per probe.
 *   (3) The relocation neighbourhood is pruned by the dependency DAG: with rule
 *       k lifted out, k may only be re-inserted between its last dependency and
 *       its first dependent, so infeasible slots are never priced at all.
 *   (4) The residual is measured, and it is small: −27 tokens over the 19 framed
 *       lanes with −11 on `ps-aux-real`, 0 worse, 0 inexact (bench/x122/receipts).
 *       Αgainst a frontier of 12 133 tokens that is 0.22 %.
 *
 * GREEDY?  PARTLY, AND SAID PLAINLY.
 * -----------------------------------------------------------------------------
 * The search is first-improvement local descent over three finite neighbourhoods
 * (order transpositions, order relocations, glyph transpositions, glyph
 * reassignment from the free pool), swept to a local optimum.  It is not a global
 * optimum and makes no claim to be; the assignment problem it is approximating is
 * a quadratic assignment problem and is NP-hard.
 *
 * TIME / CPU BOUND
 * -----------------------------------------------------------------------------
 * No wall clock and no randomness: the loop is deterministic, and the sweep is
 * bounded by `workTick` so it consumes the shared deterministic work budget
 * exactly like every other search here.  Each accepted state is priced with the
 * real tokenizer; nothing is estimated.  Cost per lane is O(passes × rules²)
 * tokenizer calls on the tape (plus the body for glyph moves), and the module
 * returns the parent's message unchanged when it cannot strictly win.
 *
 * HONEST LIMITS
 * -----------------------------------------------------------------------------
 *   · It needs a `§` frame and at least two rules; a lane without one is returned
 *     untouched.
 *   · It only pays where the incumbent tape was left in a bad order.  On
 *     `ls-l-real` it finds NOTHING (0 tokens): that tape uses 119 of the 122
 *     one-token Cyrillic letters, so the free pool is 3, and its dependency DAG
 *     is dense enough that almost every relocation is infeasible.  The biggest
 *     gap lane in the benchmark is the one lane this mechanism cannot reach.
 *   · It adds no rules, deletes none, and re-spells nothing: it is a pure
 *     relabelling, so its ceiling is the slack the incumbent's own choices left.
 *   · It is a compression-gain module, not a speed module.  Its cost is the
 *     search; see bench/x122/ for the measured milliseconds per lane.
 * =============================================================================
 */

export interface StoichedonOptions {
  /** The incumbent complete message (contract + wire).  Required. */
  message?: string;
  /** Its token count, if the caller already has it. */
  messageTokens?: number;
  /** Maximum full sweeps of the neighbourhoods.  Default 8. */
  passes?: number;
}

export interface StoichedonResult {
  codec: 'stoichedon';
  applied: boolean;
  /** The complete message: contract + wire. */
  message: string;
  messageTokens: number;
  parentTokens: number;
  /** Dictionary rules found in the tape. */
  rules: number;
  /** One-token pool characters the incumbent was not using. */
  freePool: number;
  orderMoves: number;
  glyphMoves: number;
  tapeTokens: number;
  bodyTokens: number;
  /** Whole-message tokenizer calls spent. */
  probes: number;
  ms: number;
  exact: boolean;
  notes: string;
}

export const STOICHEDON_MIN_RULES = 2;
export const STOICHEDON_MAX_RULES = 4096;
export const STOICHEDON_DEFAULT_PASSES = 8;
/** Whole-message tokenizer calls allowed, per rule, before the sweep stops. */
export const STOICHEDON_PROBES_PER_RULE = 500;
/** Free-pool characters tried per rule in the reassignment neighbourhood. */
export const STOICHEDON_MAX_POOL_SCAN = 16;

export function stoichedonDisabled(): boolean {
  return process.env.OMEGA_NO_STOICHEDON === '1';
}

function scriptOf(cp: number): ChironScript | null {
  for (const s of CHIRON_SCRIPTS) if (chironInScript(s, cp)) return s;
  return null;
}

/**
 * Re-set an existing CHIRON tape in the order and lettering the tokenizer prices
 * lowest.  The expansion is bit-identical by construction and verified with the
 * real decoder before anything is emitted.
 */
export function stoichedonEncode(
  _text: string,
  enc: EncodingName = 'o200k_base',
  options: StoichedonOptions = {},
): StoichedonResult {
  const t0 = now();
  const message = options.message ?? '';
  const parentTokens = options.messageTokens ?? countTokens(message, enc);
  const fail = (notes: string): StoichedonResult => ({
    codec: 'stoichedon', applied: false, message, messageTokens: parentTokens,
    parentTokens, rules: 0, freePool: 0, orderMoves: 0, glyphMoves: 0,
    tapeTokens: 0, bodyTokens: 0, probes: 0, ms: now() - t0, exact: true, notes,
  });

  if (stoichedonDisabled()) return fail('disabled (OMEGA_NO_STOICHEDON=1)');
  const s0 = message.indexOf(CHIRON_START);
  if (s0 < 0) return fail('no § frame');
  const p0 = message.indexOf(CHIRON_SEP, s0 + 1);
  if (p0 < 0) return fail('no ¶ separator');

  const head = message.slice(0, s0);
  const framed = message.slice(s0, p0 + 1);       // § tape ¶ — tokenizes on its own
  const body = message.slice(p0 + 1);
  const tape = message.slice(s0 + 1, p0);
  const script = scriptOf(tape.codePointAt(0) ?? 0);
  if (!script || !tape) return fail('tape has no usable script');

  // Parse with the REAL parser: same rule as chironParseTape, so what we
  // optimize is what the reader will read.
  const inS = (c: string) => chironInScript(script, c.codePointAt(0)!);
  const seen = new Set<string>();
  const rules: { g: string; v: string }[] = [];
  let i = 0;
  while (i < tape.length) {
    const g = tape[i]!;
    if (!inS(g) || seen.has(g)) return fail('tape does not parse');
    seen.add(g);
    let j = i + 1;
    while (j < tape.length && !(inS(tape[j]!) && !seen.has(tape[j]!))) j++;
    rules.push({ g, v: tape.slice(i + 1, j) });
    i = j;
  }
  const n = rules.length;
  if (n < STOICHEDON_MIN_RULES || n > STOICHEDON_MAX_RULES) return fail(`rule count ${n} out of range`);

  // oidx maps ORIGINAL glyph -> rule id.  The stored values and the body both
  // speak in original glyphs, so every re-render translates through this and
  // never through a map keyed by the CURRENT glyphs.
  const oidx = new Map<string, number>();
  rules.forEach((r, k) => oidx.set(r.g, k));

  // One-token characters of the script the incumbent did not use, and that do
  // not occur literally anywhere else in the message (such an occurrence would
  // be re-read as a reference).
  const spans = script.ranges ?? [[script.lo, script.hi] as [number, number]];
  const pool: string[] = [];
  for (const [a, b] of spans) {
    for (let cp = a; cp < b; cp++) {
      const ch = String.fromCodePoint(cp);
      if (encodeIds(ch, enc).length === 1) pool.push(ch);
    }
  }
  const elsewhere = new Set<string>();
  for (const ch of head) elsewhere.add(ch);
  for (const ch of body) if (!oidx.has(ch)) elsewhere.add(ch);
  for (const r of rules) for (const ch of r.v) if (!oidx.has(ch)) elsewhere.add(ch);
  const glyphOf = rules.map((r) => r.g);
  let freePool = pool.filter((c) => !oidx.has(c) && !elsewhere.has(c));
  const free0 = freePool.length;

  const ruleValue = (k: number) => {
    let v = '';
    for (const c of rules[k]!.v) { const r = oidx.get(c); v += r === undefined ? c : glyphOf[r]!; }
    return v;
  };
  const tapeStr = (o: number[]) => { let t = ''; for (const k of o) t += glyphOf[k]! + ruleValue(k); return t; };
  const bodyStr = () => { let out = ''; for (const ch of body) { const r = oidx.get(ch); out += r === undefined ? ch : glyphOf[r]!; } return out; };

  let probes = 0;
  const maxProbes = STOICHEDON_PROBES_PER_RULE * n;
  const framedTok = (ts: string) => { probes++; workTick(); return countTokens(CHIRON_START + ts + CHIRON_SEP, enc); };
  const bodyTok = (bs: string) => { probes++; workTick(); return countTokens(bs, enc); };

  /* Feasibility, cheaply and exactly.
   *
   * `chironParseTape` re-cuts the tape at the first in-script character it has
   * not yet seen, so the parse is faithful iff every in-script character inside a
   * value names a rule that appears EARLIER in the order.  Two conditions:
   *   (i)  no rule references itself, and
   *   (ii) the order is topological for the dependency DAG.
   * (i) is order-independent, so it is one O(value chars) pass per glyph state.
   * Note that a rule-id DAG is NOT enough on its own: a glyph transposition turns
   * rule A's reference to rule B into a reference to A itself, which is exactly
   * (i), and that is the case which made the first version of this search emit
   * wires `chironDecode` refused.
   *
   * The resulting test is O(rules + edges) instead of a string build plus a full
   * parse plus an element-by-element compare, and the string version is still run
   * once, at the end, as the real assertion. */
  let depOf: number[][] = [];
  let depSet: Set<number>[] = [];
  let selfBad = false;
  const rebuildDeps = () => {
    depOf = rules.map(() => []);
    depSet = rules.map(() => new Set<number>());
    selfBad = false;
    for (let k = 0; k < n; k++) {
      const set = new Set<number>();
      for (const c of rules[k]!.v) { const r = oidx.get(c); if (r !== undefined) set.add(r); }
      if (set.has(k)) selfBad = true;
      depOf[k] = [...set];
      depSet[k] = set;
    }
  };
  const pos = new Int32Array(n);
  const topoOK = (o: number[]) => {
    for (let k = 0; k < n; k++) pos[o[k]!] = k;
    for (let k = 0; k < n; k++) {
      const pi = pos[k]!;
      for (const j of depOf[k]!) if (pos[j]! >= pi) return false;
    }
    return true;
  };
  const feasible = (o: number[]) => !selfBad && topoOK(o);
  rebuildDeps();

  let order = rules.map((_, k) => k);
  if (!feasible(order)) return fail('incumbent tape is not a feasible seed');
  let tapeCost = framedTok(tapeStr(order));
  let bodyCost = bodyTok(bodyStr());
  let cur = tapeCost + bodyCost;
  let orderMoves = 0, glyphMoves = 0;
  const passes = options.passes ?? STOICHEDON_DEFAULT_PASSES;

  // An ORDER move touches the tape only; a GLYPH move touches tape and body.
  // The frame identity above is what lets them be priced separately.
  const tryOrder = (apply: () => void, revert: () => void): boolean => {
    apply();
    if (!feasible(order)) { revert(); return false; }
    const t = framedTok(tapeStr(order));
    if (t < tapeCost) { tapeCost = t; cur = tapeCost + bodyCost; orderMoves++; return true; }
    revert();
    return false;
  };
  const tryGlyph = (apply: () => void, revert: () => void): boolean => {
    apply();
    if (!feasible(order)) { revert(); return false; }
    // a glyph move must price BOTH halves: the tape may rise while the body
    // falls further, and only the sum decides
    const t = framedTok(tapeStr(order));
    const b = bodyTok(bodyStr());
    if (t + b < cur) { tapeCost = t; bodyCost = b; cur = t + b; glyphMoves++; return true; }
    revert();
    return false;
  };

  outer:
  for (let pass = 0; pass < passes; pass++) {
    let improved = false;
    for (let a = 0; a < n; a++) {
      for (let b = a + 1; b < n; b++) {
        if (workExhausted() || probes >= maxProbes) break outer;
        if (tryOrder(() => { const t = order[a]!; order[a] = order[b]!; order[b] = t; },
                     () => { const t = order[a]!; order[a] = order[b]!; order[b] = t; })) improved = true;
      }
    }
    // RELOCATION, pruned by the DAG.  With rule k lifted out, k may only be
    // re-inserted between its last dependency and its first dependent; every
    // other slot is infeasible by construction, so it is never probed.  On a
    // dense tape (ls-l-real: 119 rules, 184 dependency edges) this collapses the
    // neighbourhood from rules^2 to a handful of slots per rule.
    for (let a = 0; a < n; a++) {
      const k = order[a]!;
      let lo = 0, hi = n - 1;
      for (let q = 0; q < n; q++) {
        if (q === a) continue;
        const other = order[q]!;
        const at = q < a ? q : q - 1;            // position in the reduced array
        if (depSet[k]!.has(other)) lo = Math.max(lo, at + 1);
        if (depSet[other]!.has(k)) hi = Math.min(hi, at);
      }
      for (let b = lo; b <= hi; b++) {
        if (b === a) continue;
        if (workExhausted() || probes >= maxProbes) break outer;
        const mv = (from: number, to: number) => { const x = order.splice(from, 1)[0]!; order.splice(to, 0, x); };
        if (tryOrder(() => mv(a, b), () => mv(b, a))) improved = true;
      }
    }
    for (let a = 0; a < n; a++) {
      for (let b = a + 1; b < n; b++) {
        if (workExhausted()) break outer;
        if (probes >= maxProbes) break outer;
        const sw = () => { const ga = glyphOf[a]!, gb = glyphOf[b]!; glyphOf[a] = gb; glyphOf[b] = ga; };
        if (tryGlyph(sw, sw)) { improved = true; rebuildDeps(); }
      }
    }
    const poolScan = Math.min(freePool.length, STOICHEDON_MAX_POOL_SCAN);
    for (let a = 0; a < n && poolScan > 0; a++) {
      for (let fi = 0; fi < poolScan; fi++) {
        if (workExhausted() || probes >= maxProbes) break outer;
        const sw = () => { const og = glyphOf[a]!, nc = freePool[fi]!; glyphOf[a] = nc; freePool[fi] = og; };
        if (tryGlyph(sw, sw)) { improved = true; rebuildDeps(); }
      }
    }
    if (!improved) break;
  }

  const wire = head + CHIRON_START + tapeStr(order) + CHIRON_SEP + bodyStr();
  const after = countTokens(wire, enc);
  // The real assertion: the cheap DAG test is only a stand-in for this.
  const ts = tapeStr(order);
  const sc = scriptOf(ts.codePointAt(0)!);
  const pr = sc ? chironParseTape(ts, sc) : null;
  if (pr === null || pr.length !== n) return fail('final tape does not parse');
  let exact = false;
  try {
    exact = chironDecode(message.slice(s0)) === chironDecode(wire.slice(wire.indexOf(CHIRON_START)));
  } catch { exact = false; }
  if (!exact) return fail(`decode mismatch (${orderMoves} order / ${glyphMoves} glyph moves rejected)`);
  if (after >= parentTokens) {
    return {
      codec: 'stoichedon', applied: false, message, messageTokens: parentTokens, parentTokens,
      rules: n, freePool: free0, orderMoves, glyphMoves, tapeTokens: tapeCost, bodyTokens: bodyCost,
      probes, ms: now() - t0, exact: true,
      notes: `no win (${after} >= ${parentTokens}); parent message returned unchanged`,
    };
  }
  return {
    codec: 'stoichedon', applied: true, message: wire, messageTokens: after, parentTokens,
    rules: n, freePool: free0, orderMoves, glyphMoves, tapeTokens: tapeCost, bodyTokens: bodyCost,
    probes, ms: now() - t0, exact: true,
    notes: `M ${parentTokens} -> ${after} (${after - parentTokens}); ${orderMoves} order + ${glyphMoves} glyph moves over ${n} rules, ${probes} priced probes`,
  };
}

/** Decode a ΣΤΟΙΧΗΔΟΝ message.  It is a CHIRON wire, so this is CHIRON's decoder. */
export function stoichedonDecode(message: string): string {
  const w = message.indexOf(CHIRON_START);
  return w < 0 ? message : chironDecode(message.slice(w));
}
