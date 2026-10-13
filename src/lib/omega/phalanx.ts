/**
 * src/lib/omega/phalanx.ts
 * =============================================================================
 * PHALANX-P1 — a fixed four-stage, text-native pipeline for records and listings.
 * (exact, byte-perfect, self-verified end to end; identity unless it pays)
 *
 *   stage 1  UUIDFOLD-U2   canonical lowercase UUIDs -> 32 uppercase digits (only when cheaper)
 *   stage 2  DIRFOLD-A1    same-directory path folding, ASCII marker '='
 *   stage 3  DITTO-F1      same-field-as-the-line-above marks, ASCII marker '^'
 *   stage 4  VERITAS-VX    ASCII-keyed phrase dictionary
 *
 * WHY THIS ORDER (measured in bench/z19/stack-probe.receipt.txt)
 *   The positional stages (2, 3) run first, while the text still has its record
 *   structure; the dictionary (4) runs last, on the already-folded text, so it sees
 *   the remaining repeats. Stages 2 and 3 never hurt VERITAS on the ops files they
 *   were measured on, except DITTO on npm-ls (see the receipt for the exact number).
 *
 * POLICY
 *   Every stage is applied with its OWN gate (identity if that stage does not pay on its
 *   input). There is no arm comparison: the pipeline is one fixed path, not a tournament.
 *   The whole chain is accepted only if the full inverse, run in reverse, reproduces the
 *   input and the final wire has fewer o200k tokens than the input.
 *
 * DECODE (single chat, no skill, no system prompt; the wire is self-describing)
 *   Read the wire's stage headers from the outside in: VERITAS first (restore phrases),
 *   then DITTO (restore '^' fields from the line above), then DIRFOLD-A (restore '=' paths
 *   from the line above), then UUIDFOLD (restore dashes). Each stage's rule line is in its own
 *   header; a stage whose header is absent did not apply.
 * =============================================================================
 */
import { countTokens, type EncodingName } from './bpe';
import { uuidfoldEncode, uuidfoldDecode } from './uuidfold';
import { dirfoldAEncode, dirfoldADecode } from './dirfold-a';
import { dittoEncode, dittoDecode } from './ditto';
import { veritasEncode, veritasDecode } from './veritas';

interface Stage { name: string; enc: (s: string) => string; dec: (s: string) => string }
export const PHALANX_STAGES: Stage[] = [
  { name: 'uuidfold', enc: s => uuidfoldEncode(s, 'o200k_base').wire, dec: uuidfoldDecode },
  { name: 'dirfold-a', enc: s => dirfoldAEncode(s, 'o200k_base').wire, dec: dirfoldADecode },
  { name: 'ditto', enc: s => dittoEncode(s, 'o200k_base').wire, dec: dittoDecode },
  { name: 'veritas', enc: s => veritasEncode(s, 'o200k_base').wire, dec: veritasDecode },
];

export const PHALANX_ESC = 'PHALANX: identity';

export function phalanxDecode(wire: string): string {
  if (wire.startsWith(PHALANX_ESC + '\n')) return wire.slice(PHALANX_ESC.length + 1);
  let t = wire;
  for (let i = PHALANX_STAGES.length - 1; i >= 0; i--) t = PHALANX_STAGES[i].dec(t);
  return t;
}

export interface PhalanxResult {
  wire: string;
  decoded: string;
  exact: boolean;
  mode: 'phalanx' | 'identity';
  inTokens: number;
  outTokens: number;
  stageTokens: number[];
}

export function phalanxEncode(text: string, enc: EncodingName = 'o200k_base'): PhalanxResult {
  const inTokens = countTokens(text, enc);
  let w = text;
  const stageTokens: number[] = [];
  for (const s of PHALANX_STAGES) {
    w = s.enc(w);
    stageTokens.push(countTokens(w, enc));
  }
  const decoded = phalanxDecode(w);
  const outTokens = countTokens(w, enc);
  if (decoded !== text || outTokens >= inTokens) {
    // identity: the raw text, escaped only if the decoder would otherwise alter it
    const needsEsc = text.startsWith(PHALANX_ESC + '\n') || phalanxDecode(text) !== text;
    const idWire = needsEsc ? PHALANX_ESC + '\n' + text : text;
    const idTok = needsEsc ? countTokens(idWire, enc) : inTokens;
    return { wire: idWire, decoded: text, exact: true, mode: 'identity', inTokens, outTokens: idTok, stageTokens };
  }
  return { wire: w, decoded, exact: true, mode: 'phalanx', inTokens, outTokens, stageTokens };
}
