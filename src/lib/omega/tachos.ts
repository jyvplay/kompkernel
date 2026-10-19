/**
 * TACHOS (τάχος, "swiftness") -- X30.
 *
 * Two independent contributions, both measured.
 *
 * ============================================================================
 * PART 1 -- SPEED: the tokenizer was 51% of the encoder, and 97.8% of its
 * calls were redundant.
 * ============================================================================
 *
 * Instrumented on bench/holdout-work/kb-article.txt (bench/x30/prof3.ts):
 * one 3.4 KB encode made 2,240,610 calls to countTokens, of which 2,190,308
 * (97.8%) were for strings under 24 characters and therefore took the
 * `text.length < 24` early return that bypassed the chunk cache entirely.
 * Those short calls cost 14.8 s of a 28.8 s encode. Of those 2.19M short calls
 * only 98,806 were DISTINCT strings: the short path was 95.5% redundant work.
 *
 * The fix lives in bpe.ts (SHORT_CACHE): an exact memo keyed by the full
 * string plus the encoding, so two different strings can never collide and the
 * memo can only change timing, never a number. Measured after the change
 * (bench/x30/prof4.ts): countTokens 18.9 s -> 5.6 s (3.4x), whole encode
 * 25.6 s -> 13.8 s (1.85x) with the emitted message byte-identical.
 *
 * This is the part of X30 that is a large win from a real user's point of
 * view. A 25-second encode is not usable in everyday work; a 14-second one is
 * merely slow. Tokenizer cost is the single largest term and it was almost
 * entirely redundant.
 *
 * ============================================================================
 * PART 2 -- SELECTION: the fixed-cost threshold fallacy.
 * ============================================================================
 *
 * The contract is a fixed tax (~17 tokens) paid once per message, no matter
 * how many rules the tape holds. A greedy that tests each candidate rule
 * against the CURRENT TOTAL therefore demands that the FIRST rule alone retire
 * the whole tax. If the best single rule saves 5 tokens and five rules would
 * save 25, the greedy rejects rule one and never reaches rules two to five.
 *
 * That is not a hypothetical. bench/x30/micro.ts measures it directly on two
 * fresh out-of-sample prose samples (bench/x30/fresh/), scoring each candidate
 * against the full price including the contract:
 *
 *     prose-09.txt   raw 762   with the contract charged: 781 (no rules accepted)
 *                              with the contract waived:  743 (10 rules)
 *     prose-12.txt   raw 761   with the contract charged: 780 (no rules accepted)
 *                              with the contract waived:  747 (8 rules)
 *
 * Both files are ~3 KB of real prose and both ship as IDENTITY under the
 * current stack: 100% retention, zero compression. The dictionary genuinely
 * has ~15-19 tokens of redundancy in them; the tax just eats all of it before
 * the first rule is admitted.
 *
 * TACHOS therefore runs a SECOND arm with a different objective function:
 * accept any rule whose MARGINAL wire gain is positive, ignoring the fixed
 * cost entirely, and only at the end price the finished message against the
 * alternatives. The two arms answers different questions --
 *   SYNKOPE   "does this rule pay for itself AND its share of the tax?"
 *   TACHOS    "does the finished message beat the finished alternatives?"
 * -- and the tournament keeps whichever is shorter. Because identity and the
 * parent are both retained as candidates, TACHOS is monotone against SYNKOPE
 * by construction: it can never be worse.
 *
 * The bootstrap arm is deliberately built from the RAW text with its own
 * flat, shape-free contract, because the parent's contract describes the
 * parent's (digit-shaped) wire and would misdescribe this one. See the
 * CONTRACT ISOMORPHISM note below.
 *
 * ============================================================================
 * Greedy? No. The tournament is an exact minimum over the candidate set
 * {identity, SYNKOPE, bootstrap}, each scored by the true tokenizer on the
 * true message. The rule search inside an arm is greedy, in both arms --
 * that is the thing being compared, not the thing being fixed.
 *
 * Time/CPU bound? Yes, doubly. The memo is bounded (SHORT_CACHE_MAX entries,
 * cleared on overflow). The bootstrap arm is bounded by a rule cap. SYNKOPE's
 * own encode is budget-bounded by POLYTROPOS.
 *
 * Source article: none for Part 1 or Part 2 -- both are measurements made in
 * this repo. The closest external framing for what the contract IS remains
 * arXiv 2607.06145 ("Prompting Complexity": the shortest plausible prompt such
 * that f deterministically outputs t), which provably has no model-independent
 * invariance theorem, so every token count here is an o200k_base count.
 */

import { EncodingName, countTokens } from './bpe';
import { chironDecode } from './chiron';
import { symplokeDecode, symplokeUncollapse } from './symploke';
import { SyntomosResult } from './syntomos';
import { SynkopeOptions, SynkopeResult, synkopeEncode } from './synkope';

export interface TachosArm {
  id: string;
  wire: string;
  contract: string;
  tokens: number;
  rules: number;
  exact: boolean;
}

export interface TachosOptions extends Omit<SynkopeOptions, 'ladder'> {
  /** maximum rules the subsidized arm may install (default 64) */
  maxBootstrapRules?: number;
  /** run the subsidized arm at all (default true) */
  bootstrap?: boolean;
}

export interface TachosResult extends SynkopeResult {
  /** which arm won: 'parent' (SYNKOPE), 'bootstrap', or 'identity' */
  winner: string;
  /** every arm that was built and verified, with its true score */
  arms: TachosArm[];
  /** tokens the subsidized arm found that the priced greedy refused */
  bootstrapRules: number;
}

/**
 * The subsidized arm's contract.
 *
 * CONTRACT ISOMORPHISM. This must describe THIS arm's wire, not the parent's.
 * The parent's contract is generated from its SymplokeStats and therefore
 * reports whichever digit shapes that wire actually uses; the subsidized arm
 * is built from raw text, carries no `^` sentinel and no stripped digits, so
 * borrowing the parent's wording would state digit rules that do not apply and
 * omit nothing that does. That is the same failure class as the X28 shape-
 * clause deletion: the contract must be derived from the wire it ships with.
 * This tape is flat by construction, so it says "expand", not "expand
 * repeatedly" -- REPEAT is only needed when some rule references another.
 */
const FLAT_HEAD = 'Letters before ¶ name the phrases after them. Then ';
const FLAT_CONTRACT = `${FLAT_HEAD}expand; print result only.`;

function countAll(hay: string, needle: string): number {
  let c = 0, i = 0;
  for (;;) { const j = hay.indexOf(needle, i); if (j < 0) break; c++; i = j + 1; }
  return c;
}

/**
 * Build a tape/body pair by greedy rule selection under the SUBSIDIZED
 * objective: accept a rule iff it strictly lowers (tape + body), with no term
 * for the contract. Returns null if no rule is profitable even so.
 */
/**
 * The subsidized arm is only ever worth running where the fixed tax can decide
 * the outcome, i.e. on SHORT messages: the tax is constant while the achievable
 * dictionary saving grows with length, so beyond MAX_BOOTSTRAP_CHARS the parent
 * either wins outright or loses by more than the arm could recover.
 *
 * It is also bounded by a deadline. The candidate enumeration below is O(n * L)
 * substring insertions plus an O(n) occurrence count per candidate, which is
 * fine at 3 KB and catastrophic at 300 KB -- measured: on the 28-lane sweep the
 * unguarded arm stalled a 6.6 K-token lane past 20 minutes. Both bounds are
 * correctness-neutral: they can only remove an arm, never change a wire.
 */
const MAX_BOOTSTRAP_CHARS = 6000;
const BOOTSTRAP_DEADLINE_MS = 20000;

function bootstrapArm(
  text: string,
  enc: EncodingName,
  maxRules: number,
): { wire: string; rules: number } | null {
  if (text.length > MAX_BOOTSTRAP_CHARS) return null;
  const deadline = Date.now() + BOOTSTRAP_DEADLINE_MS;
  const used = new Set([...text]);
  const pool: string[] = [];
  for (const [lo, hi] of [[0x400, 0x460], [0x370, 0x3d0]] as Array<[number, number]>) {
    for (let cp = lo; cp < hi; cp++) {
      const ch = String.fromCodePoint(cp);
      if (!used.has(ch) && countTokens(ch, enc) === 1) pool.push(ch);
    }
  }
  if (pool.length < 4) return null;
  const CHIRON_START = '§', CHIRON_SEP = '¶';

  let body = text, tape = '', gi = 0;
  let wireTok = countTokens(text, enc);
  let rules = 0;

  for (let round = 0; round < maxRules && gi < pool.length; round++) {
    if (Date.now() > deadline) break;
    const cand = new Map<string, number>();
    for (let L = 2; L <= Math.min(64, body.length); L++) {
      const seen = new Set<string>();
      for (let i = 0; i + L <= body.length; i++) {
        const s = body.slice(i, i + L);
        if (!seen.has(s)) { seen.add(s); const c = countAll(body, s); if (c >= 2) cand.set(s, c); }
      }
      if (Date.now() > deadline) break;
    }
    let best: { s: string; tot: number; nb: string; nt: string } | null = null;
    const X = pool[gi];
    for (const [s] of cand) {
      const nb = body.split(s).join(X);
      const nt = tape + X + s;
      const tot = countTokens(nt, enc) + countTokens(nb, enc);
      if (tot < wireTok && (!best || tot < best.tot)) best = { s, tot, nb, nt };
    }
    if (!best) break;
    body = best.nb; tape = best.nt; wireTok = best.tot; gi++; rules++;
  }
  if (rules === 0) return null;
  return { wire: CHIRON_START + tape + CHIRON_SEP + body, rules };
}

/** Encode: run SYNKOPE and the subsidized arm, keep whichever message is shortest. */
export function tachosEncode(
  text: string,
  enc: EncodingName = 'o200k_base',
  opts: TachosOptions = {},
): TachosResult {
  const parent: SynkopeResult = synkopeEncode(text, enc, opts);
  const arms: TachosArm[] = [];

  const pushParent = () => arms.push({
    id: 'parent', wire: parent.wire, contract: parent.contract,
    tokens: parent.messageTokens, rules: parent.rules, exact: true,
  });
  pushParent();

  let bootstrapRules = 0;
  // Only worth spending time on where the fixed tax can plausibly have decided
  // the outcome. If the parent already installed rules, the tax was affordable
  // and the priced greedy's answer stands; if the parent shipped identity (or
  // found no rules at all) the tax may have eaten a real dictionary, and that
  // is precisely the case the subsidized arm exists for. Gating here keeps the
  // arm off the fast path entirely: measured overhead on kb-article drops from
  // +2.9 s to zero, while prose-09 -- an identity lane -- still flips.
  const taxMayHaveDecided = parent.rules === 0 || parent.parent === 'identity';
  if (opts.bootstrap !== false && taxMayHaveDecided) {
    try {
      const b = bootstrapArm(text, enc, opts.maxBootstrapRules ?? 64);
      if (b) {
        bootstrapRules = b.rules;
        // Verify against the wire we are about to ship, not against stats.
        const dec = symplokeDecode(b.wire, { stats: undefined as any, undo: (w: string) => chironDecode(w) });
        const exact = dec === text;
        const tokens = countTokens(b.wire, enc) + countTokens(FLAT_CONTRACT, enc);
        arms.push({ id: 'bootstrap', wire: b.wire, contract: FLAT_CONTRACT, tokens, rules: b.rules, exact });
      }
    } catch { /* arm unavailable */ }
  }

  let winner = arms[0];
  for (const a of arms) if (a.exact && a.tokens < winner.tokens) winner = a;

  if (winner.id === 'bootstrap') {
    return {
      ...parent,
      wire: winner.wire,
      contract: winner.contract,
      messageTokens: winner.tokens,
      rules: winner.rules,
      winner: 'bootstrap',
      arms,
      bootstrapRules,
      rungs: [],
      delta: winner.tokens - parent.messageTokens,
    };
  }
  return { ...parent, winner: 'parent', arms, bootstrapRules };
}

export function tachosDecode(
  wire: string,
  cfg: { stats?: any; order?: 'in' | 'out'; undo: (w: string) => string },
): string {
  return symplokeDecode(wire, cfg as any);
}

export function tachosRoundTrip(text: string, enc: EncodingName = 'o200k_base'): boolean {
  const r = tachosEncode(text, enc);
  return tachosDecode(r.wire, { undo: (w: string) => chironDecode(w) }) === text;
}
