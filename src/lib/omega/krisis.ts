/**
 * KRISIS (κρίσις — "a judging, a decision, a turning point").
 *
 * X43. Every codec shipped so far in this stack has tried to make the WIRE
 * smaller. This one tries to make the DECISION cheaper, and it exists because a
 * profile said the decision is where all the time goes.
 *
 * THE MEASUREMENT THAT PRODUCED IT
 * ---------------------------------------------------------------------------
 * bench/x43/screen3.ts timed each layer of the stack on pom.xml, a 1,797
 * character file:
 *
 *     chiron          203 ms   msg=305
 *     anadiplosis   9,865 ms   msg=242
 *     euteleia        6,659 ms   msg=242
 *     oura           33,424 ms   msg=242
 *     antistrophe    94,988 ms   msg=242
 *     peritrope     100,517 ms   msg=242
 *     systole       140,598 ms   msg=242
 *     apocope       138,127 ms   msg=242
 *
 * Six layers spend 138 seconds and every one of them returns 242, the value
 * ANADIPLOSIS reached in 9.8 seconds. On this lane the upper stack buys nothing
 * and costs 93 percent of the wall clock. The same shape shows up at real sizes:
 * 814 s for a 6.5 KB CSV, 609 s for an ls listing, 2,393 s for a log file, and
 * -- the case that matters most for the stated priority of everyday prose --
 * 328 s for prose-03 and 261 s for prose-05, against 8.8 s for prose-01.
 *
 * WHERE THE TIME GOES
 * ---------------------------------------------------------------------------
 * Each layer computes its parent on the UNMODIFIED text and then runs a handful
 * of TRIALS on transformed text, each trial a full recursive lower-stack encode.
 * Depth d with t trials per layer is O(t^d) lower-stack encodes. The auctions
 * that decide which trials to run are not the problem: ANTISTROPHE prices 10
 * candidate swaps in 2 ms (bench/x43/screen4.ts, 0.2 ms per pair). The trials
 * are the problem, at 12,036 ms each.
 *
 * The decisions are also badly informed. ANTISTROPHE auctions on the raw token
 * count of the SOURCE and found 5 of 10 pairs with a negative delta on pom.xml,
 * so it ran two 36-second lower-stack encodes -- and both returned no gain,
 * because the redundancy a swap removes is redundancy ANADIPLOSIS had already
 * removed. OURA is worse: it ranks candidates by `est = spans.length * (k - 1)`,
 * a count of CHARACTERS removed rather than tokens, and then runs up to two
 * shapes times three modes, six full lower-stack encodes, on that heuristic.
 *
 * THE MECHANISM
 * ---------------------------------------------------------------------------
 * KRISIS prices every layer's best candidate ONCE, with a single tokenization
 * each, and compares it against the cost of the clause that layer would have to
 * add to the message. A layer whose most optimistic benefit cannot repay its own
 * clause is disabled before any trial runs:
 *
 *     skip layer L  iff  bestRawDelta(L) + clauseCost(L) >= 0
 *
 * This is the reasoning PERITROPE already uses to choose its DEPTH -- "a pair
 * that saves three tokens raw may cost two to state" -- applied instead as an
 * admissibility gate on the trial itself. Nothing in the stack did that before.
 *
 * WHY THE GATE IS SOUND IN THE DIRECTION THAT MATTERS
 * ---------------------------------------------------------------------------
 * bestRawDelta is measured on the SOURCE text, before the lower stack runs. X42
 * established that raw savings attenuate roughly twentyfold through this stack
 * (aapl 915 raw to 43 shipped, vix 504 to 29), because the dictionary and shape
 * rules already capture most redundancy. So the raw delta is an OPTIMISTIC bound
 * on what a layer can achieve. If the optimistic bound cannot repay the clause,
 * the realistic value certainly cannot. The gate can only ever skip a layer that
 * was going to lose.
 *
 * It is deliberately NOT a lower bound on the final message. There is no cheap
 * rigorous lower bound available: X42 proved the digit floor sum(ceil(W/3)) is
 * tight for bare runs but the dictionary beats it by mapping digit strings to
 * single glyphs, so no character-level bound survives contact with the stack.
 * KRISIS therefore claims admissibility pruning, not optimality.
 *
 * ADAPTIVE ALLOCATION, NOT JUST PRUNING
 * ---------------------------------------------------------------------------
 * The same measurement is used in the other direction. Where the evidence is
 * strongly positive, KRISIS SPENDS MORE: ANTISTROPHE's trial count is raised from
 * its default of 2 when the auction's best raw delta is large relative to the
 * clause, so a lane that clearly rewards swapping gets searched deeper instead of
 * being cut off at two. Search effort follows measured evidence in both
 * directions, which is the part that makes this something other than a timeout.
 *
 * WHAT IT COSTS THE WIRE
 * ---------------------------------------------------------------------------
 * Nothing. KRISIS adds no clause, no marker and no alphabet of its own; it only
 * chooses which existing layers run. A gated lane emits exactly the wire the
 * surviving layers would have emitted anyway, so the contract is unchanged and
 * the reader is handed the same single-chat-box instruction as before.
 *
 * Greedy: YES, and that is the point. KRISIS is a one-pass greedy admissibility
 * filter with no backtracking: each layer is priced once on the source text and
 * the decision is never revisited, which is exactly why it is cheap. It is not
 * optimal -- a layer combination that only pays jointly would be missed, since
 * each layer is judged alone -- and the residual risk is bounded by the fact
 * that every judgement uses an optimistic estimate.
 *
 * Time and CPU bound: yes, explicitly and by construction. The gate costs one
 * tokenization per candidate plus one PERITROPE beam search, all milliseconds;
 * what it removes is a set of full recursive lower-stack encodes costing tens of
 * seconds each.
 */
import { countTokens, type EncodingName } from './bpe';
import { ouraFind } from './oura';
import {
  antistrophePairsFor, antistropheSwap, antistropheClausesFor,
} from './antistrophe';
import { peritropeSearch, peritropeApply, peritropeClauseFor } from './peritrope';
import { systoleChoose, systoleClauseFor } from './systole';
import { apocopeChoose, apocopeClauseFor, apocopeEncode, apocopeDecode, type ApocopeTemplate } from './apocope';

/**
 * OURA's clause, at its cheapest, costs about this many tokens. Used only as a
 * threshold against an optimistic character-count estimate, so an over-estimate
 * here would skip a winner and an under-estimate would merely fail to prune.
 * Measured: OURA's clauses run 8-14 tokens across the framings in ouraClausesFor.
 */
export const KRISIS_OURA_CLAUSE = 8;
/** Raise ANTISTROPHE's trial count only when the evidence is this strong. */
export const KRISIS_DEEPEN_RATIO = 4;
/** Never spend more trials than this, whatever the evidence says. */
export const KRISIS_MAX_TRIALS = 4;

export interface KrisisGate {
  oura: boolean;
  antistrophe: boolean;
  peritrope: boolean;
  systole: boolean;
  apocope: boolean;
  /** measured evidence behind each decision, for the bench record */
  evidence: {
    ouraEst: number;
    antiRaw: number;
    antiClause: number;
    periNet: number;
    sysNet: number;
    apoNet: number;
    trials: number;
  };
  /** milliseconds spent deciding */
  gateMs: number;
}

const clauseTok = (c: string, enc: EncodingName) =>
  c ? countTokens(' ' + c + ' print only.', enc) - countTokens(' print only.', enc) : 0;

/**
 * Price every layer once and decide which are admissible.
 * Cheap: a handful of tokenizations plus one PERITROPE beam search.
 */
export function krisisGate(text: string, enc: EncodingName): KrisisGate {
  const t0 = Date.now();
  const base = countTokens(text, enc);

  // --- OURA: est = separators removed, each worth at most one token ---------
  let ouraEst = 0;
  try {
    for (const s of ouraFind(text)) ouraEst = Math.max(ouraEst, s.spans.length * (s.k - 1));
  } catch { ouraEst = 0; }
  const oura = ouraEst - KRISIS_OURA_CLAUSE < 0 ? false : true;

  // --- ANTISTROPHE: measured raw auction + measured clause ------------------
  let antiRaw = 0, antiClause = 0, antiBest: [string, string] | null = null;
  try {
    for (const [a, b] of antistrophePairsFor(text)) {
      const d = countTokens(antistropheSwap(text, a, b), enc) - base;
      if (d < antiRaw) { antiRaw = d; antiBest = [a, b]; }
    }
    if (antiBest) {
      antiClause = Math.min(...antistropheClausesFor(antiBest[0], antiBest[1]).map((c) => clauseTok(c, enc)));
    }
  } catch { antiRaw = 0; }
  const antistrophe = antiRaw + antiClause < 0;

  // Adaptive allocation: deepen the search when the evidence is strong.
  let trials = 2;
  if (antistrophe && antiClause > 0 && -antiRaw >= KRISIS_DEEPEN_RATIO * antiClause) {
    trials = Math.min(KRISIS_MAX_TRIALS, 2 + Math.floor(-antiRaw / (KRISIS_DEEPEN_RATIO * antiClause)));
  }

  // --- PERITROPE: beam search, priced with its own clause -------------------
  let periNet = 0;
  try {
    const ps = peritropeSearch(text, enc);
    for (let i = 0; i < ps.chains.length; i++) {
      const d = countTokens(peritropeApply(text, ps.chains[i]), enc) - base;
      const net = d + clauseTok(peritropeClauseFor(ps.chains[i]), enc);
      if (net < periNet) periNet = net;
    }
  } catch { periNet = 0; }
  const peritrope = periNet < 0;

  // --- SYSTOLE / APOCOPE: measured raw saving minus measured clause ---------
  let sysNet = 0, apoNet = 0;
  try {
    const sc = systoleChoose(text, enc);
    sysNet = sc.reduce((s, x) => s + x.save, 0) - clauseTok(systoleClauseFor(sc), enc);
  } catch { sysNet = 0; }
  try {
    const ac = apocopeChoose(text, enc);
    apoNet = ac.reduce((s, x) => s + x.save, 0) - clauseTok(apocopeClauseFor(ac), enc);
  } catch { apoNet = 0; }

  return {
    oura, antistrophe, peritrope,
    systole: sysNet > 0,
    apocope: apoNet > 0,
    evidence: { ouraEst, antiRaw, antiClause, periNet, sysNet, apoNet, trials },
    gateMs: Date.now() - t0,
  };
}

export interface KrisisResult {
  wire: string;
  messageTokens: number;
  contract?: string;
  krisis: boolean;
  krisisGate: KrisisGate;
  [k: string]: any;
}

/**
 * Encode: decide cheaply, then run the stack once with the inadmissible layers
 * disabled. The wire is exactly what the surviving layers produce on their own.
 */
export function krisisEncode(
  text: string, enc: EncodingName, opts: Record<string, any> = {},
): KrisisResult {
  if (opts.krisis === false) {
    const r: any = apocopeEncode(text, enc, opts);
    return { ...r, krisis: false, krisisGate: null as any };
  }
  const gate = krisisGate(text, enc);
  const r: any = apocopeEncode(text, enc, {
    ...opts,
    oura: gate.oura ? opts.oura : false,
    antistrophe: gate.antistrophe ? opts.antistrophe : false,
    peritrope: gate.peritrope ? opts.peritrope : false,
    systole: gate.systole ? opts.systole : false,
    apocope: gate.apocope ? opts.apocope : false,
    antistropheTrials: gate.antistrophe ? gate.evidence.trials : undefined,
  });
  return { ...r, krisis: true, krisisGate: gate };
}

/**
 * Decode: identical to APOCOPE's. Gated layers report no templates and no shapes,
 * so their undo steps are no-ops and the same total decoder reads the wire.
 */
export function krisisDecode(
  wire: string,
  cfg: { stats?: any; order?: 'in' | 'out'; undo: (w: string) => string },
  opts: {
    alphabet?: string; marker?: string; marker2?: string; group?: any; framing?: any;
    ouraShape?: { sep: string; suf: number[]; minLen: number; k?: number } | null;
    ouraMode?: 'mark' | 'plain' | 'lead'; ouraSentinel?: string;
    antistrophePair?: [string, string] | null;
    peritropePairs?: [string, string][];
    systoleTemplates?: { shape: string; digits: number; count: number }[];
    apocopeTemplates?: ApocopeTemplate[];
  } = {},
): string {
  return apocopeDecode(wire, cfg, opts);
}
