/**
 * METATHESIS / ΜΕΤΆΘΕΣΙΣ — "transposition" (Greek). X27.
 *
 * ===========================================================================
 * THE DISCOVERY THIS CODEC IS BUILT ON
 * ===========================================================================
 *
 * Every cost model in this repository, across X21–X26, priced a glyph as a
 * flat ~0.801 tokens per body occurrence. That number is the MEAN of a
 * bimodal distribution, and the bimodality is the whole opportunity:
 *
 *     T("ених")  == 1 token      three glyphs, one token
 *     T("әм")    == 1 token      two glyphs, one token
 *     T("е")     == 1 token      one glyph, one token
 *
 * A run of k adjacent glyphs costs roughly the same as a single glyph,
 * because o200k_base has vocabulary entries for word-like sequences inside a
 * script. So the real unit of cost is the RUN, not the glyph.
 *
 * That reframes the problem completely. The rule SET is chosen by the parent
 * and this codec does not touch it. But which pool character stands for which
 * phrase is a free choice — it decides which glyphs end up adjacent in real
 * text, and therefore how many runs the tokenizer can swallow. That is a pure
 * relabelling: it cannot change what the message DECODES to, because
 * chironParseTape requires only that glyphs be distinct and in-script, and the
 * substitution rewrites every occurrence (tape heads, nested references inside
 * other rules' payloads, and body) consistently. It does, however, change what
 * the message COSTS.
 *
 * ---------------------------------------------------------------------------
 * WHY THERE IS ANYTHING LEFT AFTER THE PARENT
 * ---------------------------------------------------------------------------
 *
 * ariadne.ts already hill-climbs this assignment (see its header: "hill-climbs
 * the rule→glyph permutation against the live tokenizer"), so the obvious
 * version of this idea is already shipped. The gain here is not the idea, it is
 * the search: ariadne optimises while it is still building rules, against a
 * provisional cost model, and under a deadline shared with the macro search.
 * METATHESIS runs AFTER the wire is final, scores the real emitted wire with
 * the real tokenizer, and uses moves the inner loop does not:
 *
 *   - pairwise SWAPS. Once every good character is taken, the only improving
 *     move is an EXCHANGE between two rules. Reassigning to an unused pool
 *     character cannot express that, which is why a reassign-only search finds
 *     almost nothing (measured: 0 on readme).
 *   - random-restart perturbation, to leave the basin the parent landed in.
 *
 * The headroom scales with the number of rules, which is why this pays most on
 * ops text and least on short prose:
 *
 *     git-numstat   105 rules   -13      openstack   65 rules   -18
 *     find-listing   59 rules    -8      dump.sql    47 rules    -6
 *     kb-article     27 rules    -1      readme      27 rules     0
 *
 * ---------------------------------------------------------------------------
 * WHAT IS PROVABLY PRESERVED
 * ---------------------------------------------------------------------------
 *
 * Let A be an injective map from the parent's glyph set to distinct characters
 * of the SAME script, none of which occurs in the payload. Extend A to strings
 * characterwise. Then the relabelled wire is
 *
 *     START · A(tape) · SEP · A(body)
 *
 * and because A is injective and fixes every non-glyph character, the tape
 * parses to exactly the rules { A(g) -> A(raw) } and expansion commutes with A.
 * So decode(relabel(wire)) == decode(wire) for EVERY injective A. Correctness
 * is therefore independent of the search: any bug in the search shows up as a
 * worse token count, never as a corrupted message. The contract is untouched
 * and stays valid, because the braided SYMPLOKE contract names no glyph.
 */
import { symplokeEncode, symplokeDecode, type SymplokeStats } from './symploke';
import { chironParseTape, chironDecode, CHIRON_START, CHIRON_SEP , CHIRON_SCRIPTS} from './chiron';
import { scriptOfChar } from './syntomia';
import { countTokens, type EncodingName } from './bpe';
import { now, DET_MODE as DET } from './clock';

export interface MetathesisOptions {
  /** wall-clock budget for the relayout search, in ms */
  budgetMs?: number;
  /** random-restart perturbations; 0 keeps the parent's assignment as the only start */
  restarts?: number;
  /** disable the search entirely (ablation) */
  noRelayout?: boolean;
  /** cap on tokenizer evaluations; the deterministic substitute for a deadline */
  maxEvals?: number;
  /** X33: forwarded to SYMPLOKE (see SymplokeOptions). */
  inCap?: number;
  /** X33: forwarded to SYMPLOKE (see SymplokeOptions). */
  inGate?: number;
  /**
   * X35: force the relayout pool to a named CHIRON script instead of inheriting
   * the script of the parent's first glyph. Lets a caller search the ALPHABET,
   * not just the assignment inside a fixed alphabet.
   */
  forceScript?: string;
}

export interface MetathesisResult {
  wire: string;
  contract: string;
  messageTokens: number;
  inTokens: number;
  parent: string;
  order: 'in' | 'out';
  shapes: string[];
  stats: SymplokeStats;
  /** tokens of the parent's wire before relayout */
  parentWireTokens: number;
  /** tokens of the wire after relayout */
  wireTokens: number;
  /** how many rules were relabelled */
  rules: number;
  /** wall-clock ms spent in the relayout search */
  searchMs: number;
}

/**
 * Deterministic PRNG (mulberry32). The repo guarantees that a codec's output
 * is a pure function of its input under OMEGA_DET=1 -- clock.ts makes now()
 * constant 0 for exactly that reason. The relayout restarts need randomness, so
 * they draw from a generator seeded from the wire itself rather than from
 * Math.random, or two runs on the same input could emit two different wires.
 */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function seedFrom(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** One-token characters of a script that do not occur in the payload. */
function poolFor(sc: any, payload: Set<string>, enc: EncodingName): string[] {
  const out: string[] = [];
  const spans: Array<[number, number]> = sc.ranges ?? [[sc.lo, sc.hi]];
  for (const [a, b] of spans) {
    for (let cp = a; cp < b; cp++) {
      const ch = String.fromCodePoint(cp);
      if (!payload.has(ch) && countTokens(ch, enc) === 1) out.push(ch);
    }
  }
  return out;
}

export interface RelayoutOutcome {
  wire: string;
  tokens: number;
  base: number;
  rules: number;
  assign: string[];
  ms: number;
}

/**
 * Re-assign pool characters to the parent's rules to minimise the token count
 * of the REAL emitted wire. Returns the parent's wire unchanged if the search
 * finds nothing better, so this can never regress a lane.
 */
export function relayoutGlyphs(
  wire: string,
  text: string,
  enc: EncodingName,
  opts: MetathesisOptions = {},
): RelayoutOutcome {
  const t0 = now();
  const budget = opts.budgetMs ?? 1200;
  const restarts = opts.restarts ?? 2;
  const identity: RelayoutOutcome = {
    wire, tokens: countTokens(wire, enc), base: countTokens(wire, enc),
    rules: 0, assign: [], ms: 0,
  };
  if (opts.noRelayout) return identity;
  if (!wire.startsWith(CHIRON_START)) return identity;
  const cut = wire.indexOf(CHIRON_SEP, CHIRON_START.length);
  if (cut < 0) return identity;

  const tape = wire.slice(CHIRON_START.length, cut);
  const body = wire.slice(cut + CHIRON_SEP.length);
  // Parse with the script the glyphs are ACTUALLY written in; forceScript only
  // redirects which POOL we relabel into. (Parsing with a foreign script can
  // never succeed: tape[0] would not be in it.)
  const sc = scriptOfChar(tape[0]);
  if (!sc) return identity;
  const rules = chironParseTape(tape, sc);
  if (!rules || rules.length < 4) return identity;

  const orig = rules.map((r) => r.glyph);
  const payload = new Set(text);
  const poolSc = opts.forceScript
    ? (CHIRON_SCRIPTS.find((x) => x.name === opts.forceScript) ?? sc)
    : sc;
  const pool = poolFor(poolSc, payload, enc);
  if (pool.length < orig.length + 2) return identity;

  // The renderer: substitute symbolically, so nested references inside other
  // rules' payloads are rewritten too, then rebuild tape and body.
  const wireOf = (assign: string[]): string => {
    const map = new Map<string, string>();
    for (let i = 0; i < orig.length; i++) map.set(orig[i], assign[i]);
    const conv = (s: string): string => {
      let out = '';
      for (const ch of s) out += map.get(ch) ?? ch;
      return out;
    };
    let t = '';
    for (let i = 0; i < rules.length; i++) t += assign[i] + conv(rules[i].raw);
    return CHIRON_START + t + CHIRON_SEP + conv(body);
  };

  const start = orig.slice();
  const base = countTokens(wireOf(start), enc);
  let best = start.slice();
  let bestTok = base;
  // Deterministic work budget. Under OMEGA_DET=1 the clock is frozen at 0, so
  // a wall-clock deadline can never fire and the search would run to its natural
  // end -- fine on 27 rules, minutes on 105. Counting EVALUATIONS instead is
  // machine independent, which is the property the repo actually wants.
  const maxEvals = opts.maxEvals ?? Math.min(400_000, 40_000 + orig.length * orig.length * 12);
  let evals = 0;
  const spent = () => evals >= maxEvals || (!DET && now() > deadline);

  // The candidate alphabet: the pool actually in play plus a margin of spares
  // so that reassign-to-free remains expressible.
  const free = pool.slice(0, Math.min(pool.length, orig.length + 24));
  const deadline = t0 + budget;
  const rand = rng(seedFrom(wire));
  let cur = start.slice();
  let curTok = base;

  for (let restart = 0; restart <= restarts; restart++) {
    if (spent()) break;
    if (restart > 0) {
      cur = best.slice();
      // perturb a third of the assignment, then re-descend
      const k = Math.max(2, Math.floor(cur.length / 3));
      for (let q = 0; q < k; q++) {
        const i = Math.floor(rand() * cur.length);
        const c = free[Math.floor(rand() * free.length)];
        if (!cur.includes(c)) cur[i] = c;
        else { const j = Math.floor(rand() * cur.length); [cur[i], cur[j]] = [cur[j], cur[i]]; }
      }
      curTok = countTokens(wireOf(cur), enc); evals++;
      if (curTok >= bestTok) continue;
    }
    for (let round = 0; round < 30 && !spent(); round++) {
      let improved = false;
      // (1) pairwise swaps — the move the reassign-only search cannot make
      for (let i = 0; i < cur.length && !spent(); i++) {
        for (let j = i + 1; j < cur.length; j++) {
          const a = cur[i]; cur[i] = cur[j]; cur[j] = a;
          const t = countTokens(wireOf(cur), enc); evals++;
          if (t < curTok) { curTok = t; improved = true; }
          else { cur[j] = cur[i]; cur[i] = a; }
        }
      }
      // (2) reassign to an unused pool character
      for (let i = 0; i < cur.length && !spent(); i++) {
        for (const c of free) {
          if (cur[i] === c || cur.includes(c)) continue;
          const old = cur[i]; cur[i] = c;
          const t = countTokens(wireOf(cur), enc); evals++;
          if (t < curTok) { curTok = t; improved = true; } else cur[i] = old;
        }
      }
      if (!improved) break;
    }
    if (curTok < bestTok) { bestTok = curTok; best = cur.slice(); }
  }

  // Never ship a regression: any failure mode returns the parent's own wire.
  if (bestTok >= base) return { ...identity, rules: orig.length, ms: now() - t0 };
  return { wire: wireOf(best), tokens: bestTok, base, rules: orig.length, assign: best, ms: now() - t0 };
}

/** Encode: SYMPLOKE, then relabel the glyph alphabet against the live tokenizer. */
export function metathesisEncode(
  text: string,
  enc: EncodingName = 'o200k_base',
  options: MetathesisOptions = {},
): MetathesisResult {
  const r = symplokeEncode(text, enc, undefined, { inCap: options.inCap, inGate: options.inGate });
  const out = relayoutGlyphs(r.wire, text, enc, options);
  const wireTok = countTokens(out.wire, enc);
  return {
    wire: out.wire,
    contract: r.contract,
    messageTokens: wireTok + (r.contract ? countTokens(r.contract, enc) : 0),
    inTokens: r.inTokens,
    parent: r.parent,
    order: r.order,
    shapes: r.shapes,
    stats: r.stats,
    parentWireTokens: out.base,
    wireTokens: wireTok,
    rules: out.rules,
    searchMs: out.ms,
  };
}

/** Decode: identical to SYMPLOKE — the relabelling is transparent to the parser. */
export function metathesisDecode(
  wire: string,
  cfg: { stats: SymplokeStats; order?: 'in' | 'out'; undo: (w: string) => string },
): string {
  return symplokeDecode(wire, cfg);
}

/** Convenience: full round trip through chiron, for tests and receipts. */
export function metathesisRoundTrip(text: string, enc: EncodingName = 'o200k_base'): boolean {
  const r = metathesisEncode(text, enc);
  const undo = (w: string) => (r.parent === 'identity' ? w : chironDecode(w));
  return metathesisDecode(r.wire, { stats: r.stats, order: r.order, undo }) === text;
}
