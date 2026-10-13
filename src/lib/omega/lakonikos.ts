/**
 * ⟡ LAKONIKOS — DAEDALUS wire with a terse decoder contract (same wire, same decoder).
 *
 * What it changes: only the English decoder contract the reader is given. The rules sentence
 *   "Every new <L> before ¶ starts a rule whose text runs to the next new letter or to ¶.
 *    In the text after ¶ expand every rule, repeatedly, and print only the result."
 * is replaced by the equivalent-semantics sentence
 *   "New <word> before ¶ starts a rule to the next new <word> or ¶. After ¶, expand rules
 *    recursively; print only the result."
 * (<word> = the script label without " letter", e.g. "Hangul").
 *
 * What it does not change: the wire is produced by daedalusEncode unchanged, and it is decoded by
 * chironDecode unchanged. Other contract clauses (repeat / list ops) are kept verbatim. If the old
 * rules sentence is absent from the generated prompt, the function throws rather than guessing.
 *
 * Token accounting: messageTokens = o200k tokens of the full decoder prompt (contract + wire),
 * the same accounting DAEDALUS uses. Because the wire is identical, LAKONIKOS is never more
 * tokens than DAEDALUS on the same input, and it is fewer whenever the rules clause is present.
 *
 * Disclosed inheritance: the wire comes from daedalusEncode, which has a wall-clock budget, so
 * its output can depend on machine load exactly as DAEDALUS does.
 */
import { countTokens, type EncodingName } from './bpe';
import { daedalusEncode, type DaedalusResult } from './daedalus';
import {
  chironDecode,
  chironDecoderPrompt,
  chironOpsUsed,
  CHIRON_SCRIPTS,
  CHIRON_SEP,
} from './chiron';

export type LakonikosResult = DaedalusResult & { contractTokensOld: number; messageTokensOld: number };

/** The decoder prompt with the terse rules sentence. Pure function of the wire. */
export function lakonikosDecoderPrompt(wire: string): string {
  const old = chironDecoderPrompt(wire);
  const u = chironOpsUsed(wire);
  const label = (u.script ?? CHIRON_SCRIPTS[0]).label; // e.g. "Hangul letter"
  const word = label.replace(/ letter$/, '');
  const oldRules =
    `Every new ${label} before ${CHIRON_SEP} starts a rule whose text runs to the next new letter or to ${CHIRON_SEP}. ` +
    `In the text after ${CHIRON_SEP} expand every rule, repeatedly, and print only the result.`;
  const newRules =
    `New ${word} before ${CHIRON_SEP} starts a rule to the next new ${word} or ${CHIRON_SEP}. ` +
    `After ${CHIRON_SEP}, expand rules recursively; print only the result.`;
  if (!old.includes(oldRules)) throw new Error('LAKONIKOS: rules sentence not found in chironDecoderPrompt');
  return old.replace(oldRules, newRules);
}

export function lakonikosEncode(text: string, enc: EncodingName = 'o200k_base'): LakonikosResult {
  const d = daedalusEncode(text, enc);
  const messageTokensOld = d.messageTokens;
  // Raw / identity fallback: no contract is shipped, nothing to change.
  if (d.mode === 'raw' || d.wire === text) {
    return { ...d, contractTokensOld: d.contractTokens, messageTokensOld };
  }
  const prompt = lakonikosDecoderPrompt(d.wire);
  const decoded = chironDecode(d.wire);
  const messageTokens = countTokens(prompt, enc);
  const contractTokens = messageTokens - d.outTokens;
  const exact = decoded === text;
  return {
    ...d,
    decoded,
    exact,
    decoderPrompt: prompt,
    messageTokens,
    contractTokens,
    savingsPct: d.inTokens ? Math.round((1 - messageTokens / d.inTokens) * 1000) / 10 : 0,
    notes: `${d.notes}; LAKONIKOS terse contract ${contractTokens} tok (DAEDALUS ${d.contractTokens})`,
    contractTokensOld: d.contractTokens,
    messageTokensOld,
  };
}
