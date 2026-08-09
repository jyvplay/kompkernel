/**
 * src/lib/omega/atom-codec-v3.ts
 * =============================================================================
 * V3 COMPATIBILITY SHIM for prometheus-icdm.ts
 *
 * The Prometheus module (Universal Adaptive Router, Tier 1 evaluation) expects
 * a `omegaXiV3Compress` entry point exposing `packetTokens` and
 * `packetSavingsPct`. Our canonical v3 implementation lives in atom-codec.ts
 * (16-candidate tournament including the three ℵ Aleph pipelines). This shim
 * adapts that API without duplicating any codec logic — same engine, renamed
 * fields, zero behavioural drift.
 * =============================================================================
 */
import {
  omegaXiCompress,
  omegaXiDecode,
  type OmegaXiResult,
} from './atom-codec';
import type { EncodingName } from './bpe';

export interface OmegaXiV3Result extends OmegaXiResult {
  /** Real BPE tokens of the packed wire (== outTokens). */
  packetTokens: number;
  /** Real token savings percentage (== savingsPct). */
  packetSavingsPct: number;
}

export async function omegaXiV3Compress(
  text: string,
  enc: EncodingName,
): Promise<OmegaXiV3Result> {
  const r = await omegaXiCompress(text, enc);
  return { ...r, packetTokens: r.outTokens, packetSavingsPct: r.savingsPct };
}

export async function omegaXiV3Decode(wire: string, enc: EncodingName): Promise<string> {
  return omegaXiDecode(wire, enc);
}
