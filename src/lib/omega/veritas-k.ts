/**
 * src/lib/omega/veritas-k.ts — VERITAS-K: wide-search VERITAS-R.
 * =============================================================================
 * Same wire, same decoder, same [[VXR sentinel and legend as VERITAS-R. The only change is the search budget
 * spent on the greedy: each step scores up to 100 improving candidates (VERITAS-R: 10) out of up to 3000 trials
 * (VERITAS-R: 300), and refinement gets 40000 exact counts (VERITAS-R: 4000).
 *
 * Gate: the wide budget applies to inputs of at most VERITAS_K_WIDE_MAX_CHARS characters. Larger inputs use the
 * VERITAS-R budget, because each wide step recounts the whole wire and cost grows with size. The gate is a fixed
 * function of the input length, not a comparison between two encodings, so there is no tournament.
 *
 * Measured (o200k one-chat tokens, byte-exact through the shipped decoder): see bench/z36/receipts.
 * Limits: wide-search runtime is up to about 8 s per kilobyte of input on this sandbox. Deterministic: every
 * budget is a count, never wall-clock time.
 * =============================================================================
 */
import type { EncodingName } from './bpe';
import { veritasREncodeWith, DEFAULT_VXR_OPTS, type VeritasRResult, type VxrSearchOptions } from './veritas-r';

export const VERITAS_K_WIDE_MAX_CHARS = 16000;
export const VERITAS_K_WIDE_OPTS: VxrSearchOptions = { poolMax: 240, kImprove: 100, maxTrials: 3000, refineBudget: 40000 };

export interface VeritasKResult extends VeritasRResult {
  mode: 'wide' | 'standard';
}

export function veritasKEncode(text: string, enc: EncodingName = 'o200k_base'): VeritasKResult {
  const wide = text.length <= VERITAS_K_WIDE_MAX_CHARS;
  const r = veritasREncodeWith(text, enc, wide ? VERITAS_K_WIDE_OPTS : DEFAULT_VXR_OPTS);
  return { ...r, mode: wide ? 'wide' : 'standard' };
}
