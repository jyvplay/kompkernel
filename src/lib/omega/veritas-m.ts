/**
 * src/lib/omega/veritas-m.ts — VERITAS-M: merge-aware VERITAS-R.
 * =============================================================================
 * Same VXR wire and decoder as VERITAS-R and VERITAS-K. Three search changes, each measured separately (bench/z37):
 *
 *   1. Look-past (forceSteps = 40). When the greedy has no improving step, take the best non-improving step
 *      and keep the lowest-count state of the whole trajectory. Alone: about 0 tokens. Needed for (3).
 *   2. Cyrillic key pool. Single-token Cyrillic keys go first, so adjacent keys can form o200k merges. Alone: ~0.
 *   3. Key-swap hill-climb (swapPass). Exchange the keys of two used entries; keep a swap only if the exact count
 *      drops AND the wire decodes back to the input (header nesting depends on key order; 20-60% of swaps fail
 *      decoding on the test files and are rejected).
 *
 * Why these three together: DAEDALUS (the frontier member) gets many short rules whose keys merge into shorter
 * token runs. VERITAS-R adds a rule only if it improves the exact count alone, so it stops at 13-28 rules.
 * Look-past plus key merging make the extra rules pay; the swap pass then tunes which keys sit next to each other.
 *
 * Gate: the full search runs for inputs of at most VERITAS_M_WIDE_MAX_CHARS characters. Larger inputs use the
 * VERITAS-R default budget. The gate is a fixed function of input length, not a comparison between encodings.
 * Every budget is a count, never wall-clock time.
 *
 * Measured runtime (bench/z37/receipts, 2-core sandbox, partly run concurrently): wide mode up to 137 s (9.7 KB);
 * standard mode up to 219 s (56 KB api.md). Expect these to be slower on a loaded machine.
 *
 * Measured result (151 files, all byte-exact): NOT Pareto-superior. Total +9.5% over min(DAEDALUS, A10) and +10.4%
 * when the 20 files on which DAEDALUS falls back to identity are excluded. Smaller than the frontier on 16 of 151 files.
 * ==============================================================================
 */
import type { EncodingName } from './bpe';
import { veritasREncodeWith, DEFAULT_VXR_OPTS, type VeritasRResult, type VxrSearchOptions } from './veritas-r';

export const VERITAS_M_WIDE_MAX_CHARS = 10000;
export const VERITAS_M_WIDE_OPTS: VxrSearchOptions = {
  poolMax: 240, kImprove: 100, maxTrials: 3000, refineBudget: 40000,
  forceSteps: 40, pool: 'cyrillic', swapPass: true,
};

export interface VeritasMResult extends VeritasRResult {
  mode: 'wide' | 'standard';
}

export function veritasMEncode(text: string, enc: EncodingName = 'o200k_base'): VeritasMResult {
  const wide = text.length <= VERITAS_M_WIDE_MAX_CHARS;
  const r = veritasREncodeWith(text, enc, wide ? VERITAS_M_WIDE_OPTS : DEFAULT_VXR_OPTS);
  return { ...r, mode: wide ? 'wide' : 'standard' };
}
