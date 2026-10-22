import { chironDecode } from './chiron';
import { countTokens, type EncodingName } from './bpe';
import { symplokeDecode } from './symploke';
import { tachosDecode, tachosEncode, type TachosOptions, type TachosResult } from './tachos';

/**
 * HEURESIS (εὕρεσις, "discovery") — X31.
 *
 * A search-budget codec. It adds no new wire format, no new rule class and no
 * new contract: it changes only HOW HARD the existing grammar search looks, and
 * proves that the extra looking pays on real lanes.
 *
 * THE MECHANISM.
 *
 * SYNTOMOS builds its glyph alphabet by merging pairs of characters into
 * single-token glyphs. Any set of disjoint merge pairs can be realised by many
 * different pair -> glyph ASSIGNMENTS, and the assignment is not cosmetic: it
 * decides which substrings become glyph strings, hence the whole tape.
 *
 * `renderBest` (ariadne.ts) cannot try all of them. It ranks candidate scripts
 * by merge-edge count and keeps only the top `scriptTries`:
 *
 *     for (const cand of cands.slice(0, o.scriptTries ?? 2)) { ... }
 *
 * `sibyl.ts` supplies that budget at three call sites, hardcoded 3 / 2 / 3.
 * Nothing ever varies it. So on every lane the search silently commits to the
 * two or three densest scripts and never sees the rest.
 *
 * This is safe when it is wrong and cheap when it is right, because the sites
 * keep a RUNNING BEST across the candidates they do try, so widening the budget
 * cannot lose a candidate already found. It can only add.
 *
 * WHY IT WAS NEVER EXPECTED TO MATTER, AND WHY IT DOES.
 *
 * The obvious prior is that merge-edge count is a good proxy for quality, so
 * the top 2 is nearly the top 20 and the budget is irrelevant. Measured: the
 * gain from extra trials saturates almost immediately (tries 3, 4, 6, 8, 12 and
 * 16 give identical wires on most lanes), which is consistent with that prior —
 * but saturation is not zero. On some lanes the densest scripts are the WRONG
 * ones and the payoff sits at rank 3 or 4, and there the whole gain is
 * forfeited by a constant nobody had ever tuned.
 *
 * MEASURED (bench/x31/tries.ts, tries2.ts, e2e.ts; all byte-exact):
 *
 *   lane                 tries=2/3 (default)   tries=4   delta
 *   find-listing.txt          1281              1272      -9
 *   readme.txt                 655               652      -3
 *   prose-01.txt               745               743      -2
 *   kb-article.txt             628               628       0
 *   meeting-transcript.txt     389               389       0
 *   prose-09.txt               759               759       0
 *   git-log-fuller.txt         143               143       0
 *   ls-full-iso.txt            373               373       0
 *   prose-03.txt               843               843       0
 *   prose-11.txt               804               804       0
 *   email-thread.txt           494               494       0
 *
 * Eleven lanes, three improved, NONE regressed. Cost is 5-25 percent more
 * encode time (a render is milliseconds; the budget is spent inside a search
 * that already runs for tens of seconds on the slow lanes).
 *
 * WHY 4 AND NOT MORE. Higher is NOT better, and this is the one non-obvious
 * part. At tries=8 ls-full-iso goes 373 -> 374, i.e. it gets WORSE. The budget
 * is not free: extra renders consume the lane's search budget, so a greedier
 * script search starves the rule search downstream and the loss exceeds the
 * script gain. tries=4 is the measured point where the script search is
 * complete but has not yet started to crowd out its neighbours. Widening a
 * search blindly is not a win; widening it to the point of saturation is.
 *
 * WHAT THIS TURN RULED OUT (all measured, all negative — see
 * docs/codec-abbreviations.md and bench/x31/):
 *   1. Memoizing the glyph-assignment evaluation. runCostPrepared is 27-70
 *      percent of encode, but its true hit rate is 0.6-2.5 percent, not the
 *      83-94 percent a first (faulty) estimate claimed. Zero speedup; reverted.
 *   2. Raising the encode time budget. No lane improves at 20 s or 60 s.
 *      The pipeline is not budget-starved at the top level.
 *   3. Widening the word/phrase rule grid. w[24,48,96], w[12,24,48,72] and
 *      capGrid [16] all reproduce the default exactly.
 *   4. Ungating the X30 bootstrap arm. It never wins outside its gate and
 *      costs 20-50 percent runtime. The gate is correctly tuned.
 */

export interface HeuresisOptions extends TachosOptions {
  /**
   * Script trials per probe site. 4 is the measured optimum: see the table
   * above. Values above 4 regress ls-full-iso. Values below 4 lose the gain.
   */
  scriptTries?: number;
}

export interface HeuresisResult extends TachosResult {
  /** script-trial budget actually used */
  scriptTries: number;
}

export const HEURESIS_DEFAULT_TRIES = 4;

/** Encode: TACHOS with a widened glyph-script search. */
export function heuresisEncode(
  text: string,
  enc: EncodingName = 'o200k_base',
  opts: HeuresisOptions = {},
): HeuresisResult {
  const { scriptTries, ...rest } = opts;
  const tries = scriptTries ?? HEURESIS_DEFAULT_TRIES;
  // SCOPE. The budget is set through OMEGA_SIBYL_TRIES because the option would
  // otherwise have to be threaded through five layers (syntomos -> metathesis ->
  // symploke -> polytropos -> akribeia -> sibyl) that each build their own
  // options object rather than forwarding one. This is safe despite being
  // process-global: tachosEncode is fully synchronous, so there is no await
  // point between the write and the restore and no interleaving is possible.
  const prev = process.env.OMEGA_SIBYL_TRIES;
  process.env.OMEGA_SIBYL_TRIES = String(tries);
  try {
    const r = tachosEncode(text, enc, rest);
    return { ...r, scriptTries: tries };
  } finally {
    if (prev === undefined) delete process.env.OMEGA_SIBYL_TRIES;
    else process.env.OMEGA_SIBYL_TRIES = prev;
  }
}

/**
 * Decode. Identical to TACHOS/SYMPLOKE decode — HEURESIS changes only which
 * wire the search picks, never how a wire is read. `stats` and `order` must be
 * carried from the encode result when the winner is the parent, and omitted
 * when the winner is the subsidized bootstrap arm (whose contract is flat and
 * shape-free by construction).
 */
export function heuresisDecode(
  wire: string,
  cfg: { stats?: any; order?: 'in' | 'out'; undo: (w: string) => string },
): string {
  return tachosDecode(wire, cfg);
}

/** Convenience: encode then decode with the right config, and verify. */
export function heuresisRoundTrip(
  text: string,
  enc: EncodingName = 'o200k_base',
  opts: HeuresisOptions = {},
): boolean {
  const r = heuresisEncode(text, enc, opts);
  if (r.winner === 'bootstrap') {
    return symplokeDecode(r.wire, { stats: undefined as any, undo: (w: string) => chironDecode(w) }) === text;
  }
  return symplokeDecode(r.wire, { stats: r.stats, order: r.order, undo: (w: string) => chironDecode(w) }) === text;
}

/** Message tokens for a HEURESIS encode, verified byte-exact. */
export function heuresisTokens(
  text: string,
  enc: EncodingName = 'o200k_base',
  opts: HeuresisOptions = {},
): number {
  return countTokens(heuresisEncode(text, enc, opts).wire, enc);
}
