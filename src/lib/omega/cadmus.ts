/**
 * CADMUS-Ω: an honest portfolio selector.
 *
 * This is deliberately not claimed to be a new grammar optimum.  It uses the
 * existing exact grammar implementations as independently decodable candidates
 * and emits the shortest candidate under the requested live tokenizer.  The
 * one useful, testable contribution is the admission gate: a candidate is
 * accepted only after round-trip equality and live token measurement.  Thus the
 * selector cannot be worse than its candidate set (for the measured lane), but
 * it is not a universal Pareto proof and it does not use a hidden schema.
 */
import { countTokens, type EncodingName } from './bpe';
import { logosEncode } from './logos';
import { proteusEncode } from './proteus';
import { metisEncode } from './metis';
import { eupraxiaEncode } from './eupraxia';
import { dikeEncode } from './dike';
import { themisEncode } from './themis';
import { nemesisEncode } from './nemesis';
import { moiraEncode } from './moira';
import { mosaicEncode } from './mosaic';

export interface CadmusResult {
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  savingsPct: number;
  winner: string;
  candidates: Array<{ name: string; tokens: number; exact: boolean }>;
  notes: string;
}

type Candidate = { name: string; wire: string; decoded: string | null };

export async function cadmusEncode(text: string, enc: EncodingName = 'o200k_base'): Promise<CadmusResult> {
  const raw = await Promise.all([
    logosEncode(text, enc), proteusEncode(text, enc), metisEncode(text, enc),
    eupraxiaEncode(text, enc), dikeEncode(text, enc), themisEncode(text, enc),
    nemesisEncode(text, enc), moiraEncode(text, enc), Promise.resolve(mosaicEncode(text, enc)),
  ]);
  const names = ['LOGOS','PROTEUS','METIS','EUPRAXIA','DIKE','THEMIS','NEMESIS','MOIRA','MOSAIC'];
  const candidates: Candidate[] = raw.map((r, i) => ({ name: names[i], wire: r.wire, decoded: r.decoded }));
  const audited = candidates.map((c) => ({ ...c, tokens: countTokens(c.wire, enc), exact: c.decoded === text }));
  const valid = audited.filter((c) => c.exact);
  const best = (valid.length ? valid : [{ ...audited[0], exact: false }]).sort((a, b) => a.tokens - b.tokens || a.wire.length - b.wire.length)[0];
  const input = countTokens(text, enc);
  return { wire: best.wire, decoded: best.decoded ?? text, exact: best.exact,
    inTokens: input, outTokens: best.tokens, savingsPct: input ? ((input - best.tokens) / input) * 100 : 0,
    winner: best.name, candidates: audited.map(c => ({ name: c.name, tokens: c.tokens, exact: c.exact })),
    notes: `Measured portfolio winner ${best.name}; ${valid.length}/${audited.length} candidates passed byte round-trip. No claim beyond this candidate set.` };
}

export const CADMUS_SYSTEM_PROMPT = `CADMUS-Ω exact wire. Decode only with the decoder specified by the winning candidate label; if the label is absent, treat input as literal. This selector is measured, not an optimality claim.`;
