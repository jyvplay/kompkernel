/**
 * AMPHORA — DAEDALUS ∥ CHIRON exact-gated minimum.
 *
 * Why this codec exists (measured, see bench/z10/):
 *   DAEDALUS runs only its predicted ARIADNE/SIBYL arm(s). ARIADNE's span-limited parse
 *   returns identity ("no framing pays") on long English prose such as micromatch/README.md
 *   (10,846 o200k tokens). CHIRON's full-span macro search on the same text gives 6,859
 *   one-chat tokens (−36.8%), exact. On the 43-file holdout DAEDALUS is better in total
 *   (33,596 vs 34,575 for CHIRON), so CHIRON is not a replacement; it is a second arm.
 *
 * Construction:
 *   1. Run DAEDALUS (wall-clock budget, inherited) and CHIRON (deterministic KAIROS
 *      work-unit budget, so the CHIRON arm does not depend on machine load).
 *   2. Keep only candidates whose decoded text is byte-identical to the input AND whose wire
 *      decodes with the shared CHIRON reader (`chironDecode`).
 *   3. Return the candidate with the smallest one-chat message (contract + wire).
 *      Ties go to DAEDALUS, the incumbent. If no candidate beats identity, return identity.
 *
 * Reader contract: both arms emit CHIRON-family wires, so the reader prompt is the same
 * CHIRON decoder prompt (`chironDecoderPrompt`) used by the incumbents. No system prompt
 * is needed beyond that prompt.
 *
 * Honest limits:
 *   - This is a two-arm minimum, i.e. a tournament of two exact encoders. It is not a new
 *     grammar. Its gain is confined to inputs where DAEDALUS falls back to raw and CHIRON
 *     does not (long prose). It is not a new frontier on the short holdout.
 *   - Latency is the sum of both arms. The DAEDALUS arm is wall-clock budgeted; its output
 *     can vary with machine load. The CHIRON arm is deterministic.
 */
import { countTokens, type EncodingName } from './bpe';
import { daedalusEncode, type DaedalusResult } from './daedalus';
import { chironEncode, chironDecode, chironDecoderPrompt, KAIROS_WORK_UNITS, type ChironResult } from './chiron';

export interface AmphoraResult {
  codec: 'amphora';
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  messageTokens: number;
  outTokens: number;
  decoderPrompt: string;
  winner: 'daedalus' | 'chiron' | 'identity';
  candidates: Array<{ arm: 'daedalus' | 'chiron'; messageTokens: number; exact: boolean; mode: string }>;
  ms: number;
  notes: string;
}

export interface AmphoraOptions {
  daedalusBudgetMs?: number;
  /** Deterministic CHIRON work units; default KAIROS_WORK_UNITS (32M, reproduces CHIRON's 26 s result). */
  chironWorkUnits?: number;
}

export function amphoraEncode(text: string, enc: EncodingName = 'o200k_base', options: AmphoraOptions = {}): AmphoraResult {
  const started = Date.now();
  const inTokens = countTokens(text, enc);

  const cands: Array<{ arm: 'daedalus' | 'chiron'; wire: string; M: number; exact: boolean; mode: string; prompt: string }> = [];

  const d: DaedalusResult = daedalusEncode(text, enc, options.daedalusBudgetMs !== undefined ? { budgetMs: options.daedalusBudgetMs } : {});
  const dExact = d.decoded === text && chironDecode(d.wire) === text;
  cands.push({ arm: 'daedalus', wire: d.wire, M: d.messageTokens, exact: dExact, mode: d.mode, prompt: d.decoderPrompt });

  const c: ChironResult = chironEncode(text, enc, { workUnits: options.chironWorkUnits ?? KAIROS_WORK_UNITS });
  const cExact = c.decoded === text && chironDecode(c.wire) === text;
  cands.push({ arm: 'chiron', wire: c.wire, M: c.messageTokens, exact: cExact, mode: c.mode ?? 'chiron', prompt: c.decoderPrompt ?? chironDecoderPrompt(c.wire) });

  const ok = cands.filter(x => x.exact);
  // Smallest one-chat message; ties to DAEDALUS (listed first, and sort is stable).
  ok.sort((a, b) => a.M - b.M);
  const best = ok[0];

  if (!best || best.M >= inTokens) {
    // Identity fallback: the reader gets the raw text (no framing pays).
    return {
      codec: 'amphora', wire: text, decoded: text, exact: true, inTokens, messageTokens: inTokens, outTokens: inTokens,
      decoderPrompt: text, winner: 'identity',
      candidates: cands.map(x => ({ arm: x.arm, messageTokens: x.M, exact: x.exact, mode: x.mode })),
      ms: Date.now() - started,
      notes: `identity: no arm beats raw ${inTokens} (daedalus ${d.messageTokens}${dExact ? '' : ' NOT EXACT'}, chiron ${c.messageTokens}${cExact ? '' : ' NOT EXACT'})`,
    };
  }

  const outTokens = countTokens(best.wire, enc);
  return {
    codec: 'amphora',
    wire: best.wire,
    decoded: chironDecode(best.wire),
    exact: true,
    inTokens,
    messageTokens: best.M,
    outTokens,
    decoderPrompt: best.prompt,
    winner: best.arm,
    candidates: cands.map(x => ({ arm: x.arm, messageTokens: x.M, exact: x.exact, mode: x.mode })),
    ms: Date.now() - started,
    notes: `winner ${best.arm} (${best.M} tok) vs daedalus ${d.messageTokens}${dExact ? '' : ' NOT EXACT'} vs chiron ${c.messageTokens}${cExact ? '' : ' NOT EXACT'}; raw ${inTokens}`,
  };
}
