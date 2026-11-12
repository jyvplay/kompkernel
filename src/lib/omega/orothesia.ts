/**
 * src/lib/omega/orothesia.ts
 * =============================================================================
 * ΟΡΟΘΕΣΙΑ (OROTHESIA, "boundary-setting") — X105.
 *
 * THE MECHANISM, AND WHY IT IS NOT ΜΕΤΑΤΑΞΙΣ.
 *
 * ΜΕΤΑΤΑΞΙΣ relocates rules inside the ΧΕΙΡΩΝ tape and measured −44 tokens doing
 * it. Its search is a RANDOMIZED FIRST-IMPROVEMENT WALK: it builds the full list
 * of n*(n-2) legal single-rule relocations, Fisher-Yates shuffles it with a
 * seeded PRNG, and takes the first candidate whose price beats the incumbent —
 * then re-shuffles and repeats, stopping after PATIENCE non-improving probes or
 * at a budget derived from the message LENGTH. Every probe rebuilds the entire
 * tape string and re-tokenises the entire message.
 *
 * ΟΡΟΘΕΣΙΑ searches the same neighbourhood with a different algorithm and a
 * different price. Three things are new, and none of them is a reframing:
 *
 *   1. THE PRICE IS INCREMENTAL AND PAIRWISE. A permutation of the tape changes
 *      only which blocks are ADJACENT — ΜΕΤΑΤΑΞΙΣ itself notes "Letters are
 *      UNCHANGED, so no substitution pass is needed". So the price of an order
 *      is the sum of the blocks' own prices plus the cost at each junction, and
 *      junction(i,j) = countTokens(B_i + B_j) - t_i - t_j can be precomputed for
 *      all n^2 ordered pairs once. Measured (bench/x104/junction.ts, apt-real,
 *      64 rules, 200 random permutations): the model's worst error against the
 *      exact price is 2 TOKENS and its mean absolute error is 0.16, while the
 *      n^2 matrix builds in 18 ms and prices the whole neighbourhood faster than
 *      the timer can resolve. ΜΕΤΑΤΑΞΙΣ's per-probe cost is an O(message) string
 *      rebuild plus a full re-tokenisation; this is an O(n) integer sum.
 *
 *   2. THE NEIGHBOURHOOD IS EVALUATED COMPLETELY, NOT SAMPLED. ΜΕΤΑΤΑΞΙΣ's walk
 *      accepts the first improving move in a random order, so it can and does
 *      step past a better one, and its patience and length-derived budget are
 *      proxies for convergence that bench/x97 measured as NOT converged ("the
 *      largest lane, ls-l-real, 143 rules, still improving at the 16 000 cap").
 *      ΟΡΟΘΕΣΙΑ prices every legal move with the model, ranks them, and takes the
 *      best — steepest descent, not first improvement.
 *
 *   3. ACCEPTANCE IS ON THE EXACT PRICE, ALWAYS. The model is a RANKING function
 *      and is never the thing a move is accepted on. A move is accepted only when
 *      countTokens of the actual serialised message strictly beats the incumbent,
 *      which is the same acceptor ΜΕΤΑΤΑΞΙΣ uses. The model's +/-2-token error
 *      therefore cannot put a worse wire on the tape: it can only change which
 *      candidates reach the exact test, and a safety margin of MODEL_SLACK skips
 *      candidates the model says cannot win.
 *
 * WHY IT CANNOT BE WORSE. Every candidate that is actually emitted has been
 * priced by the real tokenizer and has strictly beaten the incumbent, and the
 * final message is re-verified with chironDecode before it is returned. The
 * model only ever decides what gets looked at.
 *
 * SOURCE. The pairwise-junction decomposition is the standard trick for pricing
 * a permutation of fixed blocks by adjacent-pair costs, and it is what makes the
 * sequencing problem a Travelling-Salesman-shaped one. Its use as a RANKING
 * function under an exact acceptor, in a grammar-compression tape, is original
 * to this repository; the measurement that justifies it is
 * bench/x104/junction.ts. The neighbouring literature that frames it: Bieniawski,
 * "Assembly Theory and the Smallest Grammar Problem" (arXiv:2608.19228, Jul 2026),
 * which shows the ORDER in which Re-Pair's tied digrams are resolved is a hidden
 * degree of freedom worth searching; and Maneth, "Grammar-Based Graph
 * Compression" (arXiv:1704.05254), whose pruning result is that post-processing
 * order matters. Neither prices a permutation incrementally.
 *
 * TIME OR CPU BOUND: CPU-bound, and deliberately so. There is no wall clock in
 * this module at all — the search runs to a local optimum of the complete
 * neighbourhood, so the same input always yields the same wire on any machine.
 * The one unbounded-looking cost, the n^2 junction matrix, is a pure function of
 * the rule count and is built once per call.
 */
import { countTokens, type EncodingName } from './bpe';
import { chironDecode } from './chiron';
import { CHIRON_START, CHIRON_SEP } from './chiron';

/** `OMEGA_NO_OROTHESIA=1` skips the pass, for an honest interleaved A/B. */
export function orothesiaDisabled(): boolean {
  return typeof process !== 'undefined' && !!process.env && process.env.OMEGA_NO_OROTHESIA === '1';
}

/**
 * Skip a candidate outright when the model says it is this far from winning.
 * The measured worst model error is 2 tokens (bench/x104/junction.ts), so 3 is
 * one token of headroom over the measured bound. Raising it re-admits candidates
 * that cannot win; lowering it risks skipping one that can.
 */
export const MODEL_SLACK = 3;

/** Exactly price this many of the model's best moves per step. */
const SHORTLIST_DEFAULT = 4;

/**
 * X105: the shortlist is the one place the model's +/-2-token error can cost a
 * win, because a move whose model price is ranked below the shortlist is never
 * exactly priced. OMEGA_OROTHESIA_SHORTLIST overrides it for the A/B; the
 * default is 4 because the model's mean absolute error is 0.16 tokens
 * (bench/x104/junction.ts) and the top-4 by model is normally the top-4 exactly.
 */
function shortlistSize(): number {
  const v = Number(process.env?.OMEGA_OROTHESIA_SHORTLIST);
  return Number.isFinite(v) && v >= 1 ? Math.floor(v) : SHORTLIST_DEFAULT;
}

/** Hard cap on descent steps, so a pathological tape cannot loop. */
const MAX_STEPS = 512;

export interface OrothesiaResult {
  applied: boolean;
  message: string;
  messageTokens: number;
  decoded: string;
  notes: string;
  probes: number;
  relocations: number;
  modelMs: number;
  exactMs: number;
}

/** Parse a CHIRON tape into blocks. A glyph is a KEY on its first appearance. */
function parseBlocks(tape: string): { keys: string[]; values: string[] } {
  const keys: string[] = [], values: string[] = [];
  const seen = new Set<string>();
  let ck = '', cv = '';
  for (const ch of tape) {
    if (ch.charCodeAt(0) > 0x370 && !seen.has(ch)) {
      if (ck !== '') { keys.push(ck); values.push(cv); }
      seen.add(ch); ck = ch; cv = '';
    } else cv += ch;
  }
  if (ck !== '') { keys.push(ck); values.push(cv); }
  return { keys, values };
}

export function orothesiaEncode(
  text: string,
  enc: EncodingName,
  incumbent: { message: string; messageTokens: number; decoded: string },
  opts: { steps?: number } = {},
): OrothesiaResult {
  const no: OrothesiaResult = {
    applied: false, message: incumbent.message, messageTokens: incumbent.messageTokens,
    decoded: incumbent.decoded, notes: 'skipped', probes: 0, relocations: 0, modelMs: 0, exactMs: 0,
  };
  if (orothesiaDisabled()) return no;

  const msg = incumbent.message;
  const w = msg.indexOf(CHIRON_START);
  if (w < 0) return no;
  const tEnd = msg.indexOf(CHIRON_SEP, w);
  if (tEnd < 0) return no;
  const head = msg.slice(0, w + CHIRON_START.length);
  const tape = msg.slice(w + CHIRON_START.length, tEnd);
  const tail = msg.slice(tEnd);

  const { keys, values } = parseBlocks(tape);
  const n = keys.length;
  if (n < 4) return no;   // too few rules for the order to matter, and no DAG to respect

  const blocks = keys.map((k, i) => k + values[i]);
  const keyIdx = new Map<string, number>();
  keys.forEach((k, i) => keyIdx.set(k, i));
  const dep: number[][] = Array.from({ length: n }, () => []);
  const rdep: number[][] = Array.from({ length: n }, () => []);
  for (let i = 0; i < n; i++) {
    let prev = -1;
    for (const ch of values[i]) {
      const j = keyIdx.get(ch);
      if (j !== undefined && j !== i && j !== prev) { dep[i].push(j); rdep[j].push(i); prev = j; }
    }
  }

  // ---- the pairwise junction matrix -------------------------------------
  const tm0 = Date.now();
  const t = new Int32Array(n);
  for (let i = 0; i < n; i++) t[i] = countTokens(blocks[i], enc);
  const headT = countTokens(head, enc);
  const tailT = countTokens(tail, enc);
  // J[i*n+j] = countTokens(B_i + B_j) - t_i - t_j ; negative means the pair fuses
  const J = new Int32Array(n * n);
  for (let i = 0; i < n; i++) {
    J[i * n + i] = 0;
    for (let j = i + 1; j < n; j++) {
      const v = countTokens(blocks[i] + blocks[j], enc) - t[i] - t[j];
      J[i * n + j] = v;
      J[j * n + i] = v;
    }
  }
  const modelMs = Date.now() - tm0;

  let order: number[] = keys.map((_, i) => i);
  const posOf = new Int32Array(n);
  const refreshPos = (): void => { for (let k = 0; k < n; k++) posOf[order[k]] = k; };
  refreshPos();

  const serialise = (o: number[]): string => { let s = ''; for (const i of o) s += blocks[i]; return s; };
  const exactPrice = (o: number[]): number => countTokens(head + serialise(o) + tail, enc);

  let base = headT + tailT;
  for (let i = 0; i < n; i++) base += t[i];
  /** O(n) model price of an order. */
  const modelPrice = (o: number[]): number => {
    let s = base;
    for (let k = 0; k + 1 < n; k++) s += J[o[k] * n + o[k + 1]];
    return s;
  };

  let cur = exactPrice(order);
  const start = cur;
  let probes = 0, relocations = 0, exactMs = 0;
  const maxSteps = opts.steps ?? MAX_STEPS;

  for (let step = 0; step < maxSteps; step++) {
    // ---- price EVERY legal single-rule relocation with the model ----------
    // scored[m] packs (modelPrice, a, np); a and np are the move ΜΕΤΑΤΑΞΙΣ makes.
    const scored: Array<{ m: number; a: number; np: number }> = [];
    for (let a = 0; a < n; a++) {
      const i = order[a];
      for (let np = 0; np < n; np++) {
        if (np === a || np === a + 1) continue;             // no-op relocations
        // Legality, identical to ΜΕΤΑΤΑΞΙΣ: after removing i and re-inserting at
        // np, everything i depends on must sit before np and everything depending
        // on i must sit at or after np. chironDecode rejects forward references,
        // so this is a decoder requirement, not a preference.
        let ok = true;
        for (const d of dep[i]) { const k = posOf[d]; if ((k > a ? k - 1 : k) >= np) { ok = false; break; } }
        if (ok) for (const u of rdep[i]) { const k = posOf[u]; if ((k > a ? k - 1 : k) < np) { ok = false; break; } }
        if (!ok) continue;
        const rest = order.slice(0, a).concat(order.slice(a + 1));
        const next = rest.slice(0, np).concat([i], rest.slice(np));
        scored.push({ m: modelPrice(next), a, np });
      }
    }
    if (scored.length === 0) break;
    scored.sort((x, y) => x.m - y.m);
    // ---- exactly price the model's shortlist; accept the first real win ----
    let moved = false;
    for (let s = 0; s < Math.min(shortlistSize(), scored.length); s++) {
      if (scored[s].m >= cur + MODEL_SLACK) break;   // the model says none of the rest can win
      const { a, np } = scored[s];
      const i = order[a];
      const rest = order.slice(0, a).concat(order.slice(a + 1));
      const next = rest.slice(0, np).concat([i], rest.slice(np));
      probes++;
      const e0 = Date.now();
      const t2 = exactPrice(next);
      exactMs += Date.now() - e0;
      if (t2 < cur) {
        order = next; refreshPos(); cur = t2; relocations++; moved = true;
        break;
      }
    }
    if (!moved) break;   // steepest descent: no legal move in the complete neighbourhood wins
  }

  if (relocations === 0 || cur >= incumbent.messageTokens) {
    return { applied: false, message: incumbent.message, messageTokens: incumbent.messageTokens,
      decoded: incumbent.decoded,
      notes: `orothesia: ${probes} exact probes, ${relocations} relocations, no gain (${start} -> ${cur}); matrix ${modelMs}ms exact ${exactMs}ms`,
      probes, relocations, modelMs, exactMs };
  }
  const out = head + serialise(order) + tail;
  // Verify with the repository's own decoder before emitting anything.
  const wire = out.slice(out.indexOf(CHIRON_START));
  const dec = chironDecode(wire);
  if (dec !== text) {
    return { applied: false, message: incumbent.message, messageTokens: incumbent.messageTokens,
      decoded: incumbent.decoded,
      notes: `orothesia: decode mismatch after ${relocations} relocations; incumbent kept`,
      probes, relocations, modelMs, exactMs };
  }
  return { applied: true, message: out, messageTokens: cur, decoded: dec,
    notes: `orothesia: ${probes} exact probes, ${relocations} relocations, ${start} -> ${cur}; matrix ${modelMs}ms exact ${exactMs}ms`,
    probes, relocations, modelMs, exactMs };
}
