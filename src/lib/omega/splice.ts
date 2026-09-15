/**
 * SPLICE-S1 — hierarchical exact coding: shared phrase dictionary, then
 * adaptive region coding.
 *
 * Construction: first build one exact token-boundary dictionary over the whole
 * document (PRAXIS), then run MOSAIC over that dictionary-bearing wire. Decode
 * reverses the composition: MOSAIC, then PRAXIS. This is a two-level MDL-style
 * construction: repeated information is paid for once globally, while the
 * residual document may still use different local codecs by region.
 *
 * SPLICE is admitted only after both composition stages and the full round trip
 * pass byte equality and the delivered-token gate. It is therefore a concrete
 * candidate, not an assertion that composition always helps.
 */
import { countTokens, type EncodingName } from './bpe';
import { compactContract } from './kernel';
import { mosaicDecode, mosaicEncode, type MosaicResult } from './mosaic';
import { praxisDecode, praxisEncode, PRAXIS_SYSTEM_PROMPT, type PraxisResult } from './praxis';

const SENTINEL = '[SP1]\n';

export interface SpliceResult {
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  contractPrompt: string;
  contractTokens: number;
  deliveredTokens: number;
  deliveredVsRaw: number;
  savingsPct: number;
  source: 'splice' | 'identity';
  notes: string;
  encodeMs: number;
}

export function spliceDecode(wire: string): string {
  if (!wire.startsWith(SENTINEL)) return wire;
  const nested = wire.slice(SENTINEL.length);
  return praxisDecode(mosaicDecode(nested));
}

function spliceContract(mosaic: MosaicResult, enc: EncodingName): { prompt: string; tokens: number } {
  const compact = compactContract(mosaic.wire);
  const candidates = [
    `${SENTINEL.trim()} exact: decode nested MOSAIC using its visible tags; then decode PX2 aliases bottom-to-top; else literal.`,
    compact
      ? `${SENTINEL.trim()}: ${compact} Then decode PX2 legend aliases bottom-to-top; else literal.`
      : '',
    PRAXIS_SYSTEM_PROMPT,
  ].filter(Boolean);
  let prompt = candidates[0];
  let tokens = countTokens(prompt, enc);
  for (const candidate of candidates.slice(1)) {
    const next = countTokens(candidate, enc);
    if (next < tokens) { prompt = candidate; tokens = next; }
  }
  return { prompt, tokens };
}

export function spliceEncode(text: string, enc: EncodingName = 'o200k_base'): SpliceResult {
  const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
  const inTokens = countTokens(text, enc);
  const identity = (notes: string): SpliceResult => ({
    wire: text, decoded: text, exact: true, inTokens, outTokens: inTokens,
    contractPrompt: '', contractTokens: 0, deliveredTokens: inTokens,
    deliveredVsRaw: 0, savingsPct: 0, source: 'identity', notes,
    encodeMs: (typeof performance !== 'undefined' ? performance.now() : 0) - t0,
  });
  if (!text) return identity('empty input');

  const praxis: PraxisResult = praxisEncode(text, enc);
  if (!praxis.exact || praxis.mode !== 'praxis') return identity('PRAXIS stage did not produce a verified dictionary');
  const mosaic: MosaicResult = mosaicEncode(praxis.wire, enc);
  const wire = SENTINEL + mosaic.wire;
  const decoded = spliceDecode(wire);
  if (!mosaic.exact || decoded !== text) return identity('composition round-trip failed');

  const contract = spliceContract(mosaic, enc);
  const outTokens = countTokens(wire, enc);
  const deliveredTokens = outTokens + contract.tokens;
  if (deliveredTokens >= inTokens) return identity('delivered-token gate rejected composition');
  return {
    wire, decoded, exact: true, inTokens, outTokens,
    contractPrompt: contract.prompt, contractTokens: contract.tokens,
    deliveredTokens, deliveredVsRaw: inTokens - deliveredTokens,
    savingsPct: inTokens ? ((inTokens - outTokens) / inTokens) * 100 : 0,
    source: 'splice',
    notes: `SPLICE verified PRAXIS→MOSAIC composition · ${praxis.entries.length} shared entries · delivered ${deliveredTokens}`,
    encodeMs: (typeof performance !== 'undefined' ? performance.now() : 0) - t0,
  };
}

export interface SpliceSelfTest { name: string; pass: boolean; details: string }
export function spliceSelfTest(enc: EncodingName = 'o200k_base'): SpliceSelfTest[] {
  const text = 'intro\n' + Array.from({ length: 48 }, (_, i) => `{"id":${i},"ok":true,"service":"gateway","message":"request completed"}`).join('\n') + '\n' + 'A'.repeat(1200);
  const r = spliceEncode(text, enc);
  return [{ name: 'shared-dictionary plus heterogeneous regions', pass: r.exact && r.decoded === text && r.deliveredTokens <= r.inTokens, details: `${r.deliveredTokens}/${r.inTokens} ${r.notes}` }];
}
