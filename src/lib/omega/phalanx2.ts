/**
 * src/lib/omega/phalanx2.ts
 * =============================================================================
 * PHALANX-P2 — PHALANX-P1 with the shared-prefix stage KOINE-K1 inserted before VERITAS-VX.
 * (exact, byte-perfect, self-verified end to end; identity unless it pays)
 *
 *   stage 1  UUIDFOLD-U2   canonical lowercase UUIDs -> 32 uppercase digits (only when cheaper)
 *   stage 2  DIRFOLD-A1    same-directory path folding, ASCII marker '='
 *   stage 3  DITTO-F1      same-field-as-the-line-above marks, ASCII marker '^'
 *   stage 3b KOINE-K1      shared-prefix field folding vs the line above, ASCII marker '&k:'   [NEW]
 *   stage 4  VERITAS-VX    ASCII-keyed phrase dictionary
 *
 * STAGE 3b GATE (the only new rule; it is one decision, not a tournament)
 *   KOINE-K1 is kept only if VERITAS applied to the KOINE wire is strictly smaller (o200k tokens)
 *   than VERITAS applied to the DITTO wire. KOINE alone is not enough: measured in
 *   bench/z20/koine-sweep.receipt.txt, folds that lower the line's own cost can break
 *   VERITAS phrase matches downstream (openstack, git-numstat). The gate looks at the stage
 *   that actually follows it.
 *
 * MEASURED: bench/z20/ (receipts). A file that KOINE does not improve is byte-identical to P1
 * after stage 3, and every file's final wire is never larger than P1's.
 *
 * DECODE (single chat, no skill, no system prompt; every stage announces itself)
 *   Read the wire's rule lines from the outside in: VERITAS (restore phrases), then KOINE
 *   (restore '&k:' fields from the line above, which is already decoded), then DITTO ('^'),
 *   then DIRFOLD-A ('='), then UUIDFOLD (dashes). A stage whose rule line is absent did not apply.
 * =============================================================================
 */
import { countTokens, type EncodingName } from './bpe';
import { uuidfoldEncode, uuidfoldDecode } from './uuidfold';
import { dirfoldAEncode, dirfoldADecode } from './dirfold-a';
import { dittoEncode, dittoDecode } from './ditto';
import { veritasEncode, veritasDecode } from './veritas';
import { koineEncode, koineDecode, koineIdentityWire, KOINE_MIN_K } from './koine';

/** decode that never throws: null means 'this wire is not decodable', so the caller must escape */
function safeDecode(w: string): string | null {
  try { return phalanx2Decode(w); } catch { return null; }
}

export const PHALANX2_ESC = 'PHALANX-P2: identity';

export function phalanx2Decode(wire: string): string {
  if (wire.startsWith(PHALANX2_ESC + '\n')) return wire.slice(PHALANX2_ESC.length + 1);
  let t = wire;
  t = veritasDecode(t);
  t = koineDecode(t);
  t = dittoDecode(t);
  t = dirfoldADecode(t);
  t = uuidfoldDecode(t);
  return t;
}

export interface Phalanx2Result {
  wire: string;
  decoded: string;
  exact: boolean;
  mode: 'phalanx2' | 'identity';
  koineKept: boolean;
  inTokens: number;
  outTokens: number;
  stageTokens: number[];
}

export function phalanx2Encode(text: string, enc: EncodingName = 'o200k_base', minK = KOINE_MIN_K): Phalanx2Result {
  const inTokens = countTokens(text, enc);
  const u = uuidfoldEncode(text, enc).wire;
  const da = dirfoldAEncode(u, enc).wire;
  const ti = dittoEncode(da, enc).wire;
  // KOINE gate: keep the KOINE stage only if the VERITAS output of the KOINE wire is strictly smaller
  const vWithout = veritasEncode(ti, enc).wire;
  const koine = koineEncode(ti, enc, minK);
  const vWith = koine.mode === 'koine' ? veritasEncode(koine.wire, enc).wire : vWithout;
  const koineKept = koine.mode === 'koine' && countTokens(vWith, enc) < countTokens(vWithout, enc);
  // when KOINE is off, the stage input is the DITTO wire in its identity form (escaped if KOINE would misread it)
  const kWire = koineKept ? koine.wire : koineIdentityWire(ti);
  const v = koineKept ? vWith : vWithout;
  const w = v;
  const stageTokens = [countTokens(u, enc), countTokens(da, enc), countTokens(ti, enc), countTokens(kWire, enc), countTokens(w, enc)];
  const decoded = safeDecode(w);
  const outTokens = countTokens(w, enc);
  if (decoded !== text || outTokens >= inTokens) {
    const needsEsc = text.startsWith(PHALANX2_ESC + '\n') || safeDecode(text) !== text;
    const idWire = needsEsc ? PHALANX2_ESC + '\n' + text : text;
    const idTok = needsEsc ? countTokens(idWire, enc) : inTokens;
    return { wire: idWire, decoded: text, exact: true, mode: 'identity', koineKept: false, inTokens, outTokens: idTok, stageTokens };
  }
  return { wire: w, decoded: decoded as string, exact: true, mode: 'phalanx2', koineKept, inTokens, outTokens, stageTokens };
}
