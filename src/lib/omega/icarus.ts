/**
 * ICARUS — deterministic, latency-first routing for the CHIRON wire language.
 *
 * DAEDALUS runs a portfolio whose grammar arms can consume seconds. ICARUS uses
 * only input features and a fixed work configuration: no wall-clock cutoffs,
 * randomness, shared state, or speculative second arm. The wire and one-chat
 * decoder contract are unchanged, so readers need no ICARUS-specific knowledge.
 *
 * This is deliberately a speed Pareto lane, not a claim of universal size
 * dominance. Every result is gated against identity by ariadneEncode itself.
 */
import type { EncodingName } from './bpe';
import { ariadneEncode, type AriadneOptions, type AriadneResult } from './ariadne';
import { daedalusFeatures, type Features } from './daedalus';

export interface IcarusOptions extends Pick<AriadneOptions, 'noBlocks' | 'sep'> {
  /** Fixed candidate cap. Keeping this explicit preserves reproducibility. */
  topK?: number;
}

export interface IcarusResult extends Omit<AriadneResult, 'codec'> {
  codec: 'icarus';
  route: 'tiny' | 'structured' | 'prose';
  features: Features;
}

export function icarusRoute(f: Features): IcarusResult['route'] {
  if (f.tokens < 300) return 'tiny';
  if (f.punctPct > 18) return 'structured';
  return 'prose';
}

/** Deterministic O(n) route followed by exactly one deterministic grammar arm. */
export function icarusEncode(
  text: string,
  enc: EncodingName = 'o200k_base',
  options: IcarusOptions = {},
): IcarusResult {
  const features = daedalusFeatures(text, enc);
  const route = icarusRoute(features);
  // The measured DAEDALUS ablation found span 12 best for structured/prose
  // inputs. Tiny inputs retain the incumbent span because setup rarely pays.
  const maxSpan = route === 'tiny' ? 24 : 12;
  const result = ariadneEncode(text, enc, {
    maxSpan,
    levels: 6,
    topK: options.topK ?? 8000,
    noBlocks: options.noBlocks,
    sep: options.sep,
  });
  return {
    ...result,
    codec: 'icarus',
    route,
    features,
    notes: `ICARUS ${route} route; one deterministic arm; ${result.notes}`,
  };
}
