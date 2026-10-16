/**
 * ⟡ LAKONIKOS-D — the DAEDALUS-D wire with the LAKONIKOS terse decoder contract (X16).
 * =============================================================================
 * Composition, not a new mechanism:
 *   - wire: daedalusDualEncode (DAEDALUS-D: dual-tokenizer glyph pool; same wire and decoder as DAEDALUS);
 *   - contract: lakonikosDecoderPrompt (the rules sentence is shortened; repeat and list clauses are verbatim).
 * Gate: the wire must decode byte-identically through chironDecode and the shortened prompt must be
 * produced from the same wire; otherwise the codec returns the identity (raw text, no contract).
 *
 * Why this exists: LAKONIKOS was measured only on the plain DAEDALUS wire (bench/lakonikos-report-2026-10-10.md).
 * The DAEDALUS-D wire is the frontier entry on most prose lanes, so the contract saving is re-measured against
 * that frontier in X16 (bench/x16/receipts/leaders-x16.tsv).
 *
 * Token accounting: messageTokens = o200k (and cl100k) tokens of the full prompt (contract + wire).
 * Disclosed: the wire comes from the DAEDALUS-D encoder, which has a wall-clock budget (OMEGA_DET=1 makes the
 * clock constant for measurement runs).
 */
import { countTokens, type EncodingName } from './bpe';
import { daedalusDualEncode } from './daedalus-dual';
import { lakonikosDecoderPrompt } from './lakonikos';
import { chironDecode, chironDecoderPrompt } from './chiron';

export interface LakonikosDResult {
  codec: 'lakonikos-d';
  wire: string;
  /** the full message to hand to a model: shortened decoder contract with the wire embedded */
  decoderPrompt: string;
  decoded: string;
  exact: boolean;
  mode: 'daedalus' | 'raw';
  inTokens: Record<'o200k_base' | 'cl100k_base', number>;
  messageTokens: Record<'o200k_base' | 'cl100k_base', number>;
  /** the same message with the unshortened DAEDALUS-D contract, for the saving */
  messageTokensDualOld: Record<'o200k_base' | 'cl100k_base', number>;
  winningArm: string;
  notes: string;
}

export function lakonikosDualEncode(text: string, enc: EncodingName = 'o200k_base'): LakonikosDResult {
  const d = daedalusDualEncode(text, enc);
  const inTok = d.inTokens;
  if (d.mode !== 'daedalus') {
    return {
      codec: 'lakonikos-d', wire: text, decoderPrompt: '', decoded: text, exact: true, mode: 'raw',
      inTokens: inTok, messageTokens: inTok, messageTokensDualOld: inTok,
      winningArm: d.winningArm, notes: 'identity: DAEDALUS-D did not pay',
    };
  }
  const oldPrompt = chironDecoderPrompt(d.wire);
  if (oldPrompt !== d.decoderPrompt) throw new Error('LAKONIKOS-D: DAEDALUS-D prompt is not chironDecoderPrompt(wire)');
  const prompt = lakonikosDecoderPrompt(d.wire);
  const decoded = chironDecode(d.wire);
  const exact = decoded === text;
  if (!exact) {
    return {
      codec: 'lakonikos-d', wire: text, decoderPrompt: '', decoded: text, exact: true, mode: 'raw',
      inTokens: inTok, messageTokens: inTok, messageTokensDualOld: inTok,
      winningArm: d.winningArm, notes: 'identity: wire failed the chironDecode round trip',
    };
  }
  const tokens = { o200k_base: countTokens(prompt, 'o200k_base'), cl100k_base: countTokens(prompt, 'cl100k_base') };
  return {
    codec: 'lakonikos-d', wire: d.wire, decoderPrompt: prompt, decoded, exact: true, mode: 'daedalus',
    inTokens: inTok, messageTokens: tokens, messageTokensDualOld: d.messageTokens,
    winningArm: d.winningArm,
    notes: `arm=${d.winningArm}; o200k ${d.messageTokens.o200k_base}->${tokens.o200k_base}; cl100k ${d.messageTokens.cl100k_base}->${tokens.cl100k_base}`,
  };
}
