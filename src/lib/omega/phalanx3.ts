/**
 * src/lib/omega/phalanx3.ts
 * =============================================================================
 * PHALANX-P3 — PHALANX-P2 plus RECALL-R1 (same-column recall, window 16) before VERITAS-VX.
 * (exact, byte-perfect, self-verified end to end; identity unless it pays)
 *
 *   stage 1   UUIDFOLD-U2   canonical lowercase UUIDs -> 32 uppercase digits (only when cheaper)
 *   stage 2   DIRFOLD-A1    same-directory path folding, marker '='
 *   stage 3   DITTO-F1      same-field-as-the-line-above marks, marker '^'
 *   stage 3b  KOINE-K1      shared-prefix folding vs the line above, marker '&k:'      [gated on VERITAS]
 *   stage 3c  RECALL-R1     same-field recall d lines up (d = 1..16), marker '@d'      [gated on VERITAS]  NEW
 *   stage 4   VERITAS-VX    ASCII-keyed phrase dictionary
 *
 * GATES (one downstream-aware check per optional stage; no candidate-codec comparison)
 *   K kept iff VERITAS(K-wire) < VERITAS(DITTO-wire).
 *   R kept iff VERITAS(R-wire) < VERITAS(stage-input of R), where the stage-input of R is the K-wire if K
 *   was kept, else the DITTO-wire.
 * DECODE (single chat, no skill, no system prompt; every stage announces itself)
 *   Read the rule lines from the outside in: VERITAS, RECALL ('@d'), KOINE ('&k:'), DITTO ('^'),
 *   DIRFOLD-A ('='), UUIDFOLD. A stage whose rule line is absent did not apply.
 * =============================================================================
 */
import { countTokens, type EncodingName } from './bpe';
import { uuidfoldEncode, uuidfoldDecode } from './uuidfold';
import { dirfoldAEncode, dirfoldADecode } from './dirfold-a';
import { dittoEncode, dittoDecode } from './ditto';
import { veritasEncode, veritasDecode } from './veritas';
import { koineEncode, koineDecode, koineIdentityWire, KOINE_MIN_K } from './koine';
import { recallEncode, recallDecode, recallIdentityWire } from './recall';

export const PHALANX3_ESC = 'PHALANX-P3: identity';

export function phalanx3Decode(wire: string): string {
  if (wire.startsWith(PHALANX3_ESC + '\n')) return wire.slice(PHALANX3_ESC.length + 1);
  let t = veritasDecode(wire);
  t = recallDecode(t);
  t = koineDecode(t);
  t = dittoDecode(t);
  t = dirfoldADecode(t);
  t = uuidfoldDecode(t);
  return t;
}

function safeDecode(w: string): string | null {
  try { return phalanx3Decode(w); } catch { return null; }
}

export interface Phalanx3Result {
  wire: string;
  decoded: string;
  exact: boolean;
  mode: 'phalanx3' | 'identity';
  koineKept: boolean;
  recallKept: boolean;
  inTokens: number;
  outTokens: number;
}

export function phalanx3Encode(text: string, enc: EncodingName = 'o200k_base', minK = KOINE_MIN_K): Phalanx3Result {
  const inTokens = countTokens(text, enc);
  const u = uuidfoldEncode(text, enc).wire;
  const da = dirfoldAEncode(u, enc).wire;
  const ti = dittoEncode(da, enc).wire;

  // K gate (downstream = VERITAS)
  const vT = veritasEncode(ti, enc).wire;
  const k = koineEncode(ti, enc, minK);
  const kKept = k.mode === 'koine' && countTokens(veritasEncode(k.wire, enc).wire, enc) < countTokens(vT, enc);
  const kIn = kKept ? k.wire : koineIdentityWire(ti);
  const vK = kKept ? veritasEncode(k.wire, enc).wire : vT;

  // R gate (downstream = VERITAS)
  const r = recallEncode(kIn, enc);
  const rKept = r.mode === 'recall' && countTokens(veritasEncode(r.wire, enc).wire, enc) < countTokens(vK, enc);
  const rIn = rKept ? r.wire : recallIdentityWire(kIn);
  const v = rKept ? veritasEncode(r.wire, enc).wire : vK;

  const decoded = safeDecode(v);
  const outTokens = countTokens(v, enc);
  if (decoded !== text || outTokens >= inTokens) {
    const needsEsc = text.startsWith(PHALANX3_ESC + '\n') || safeDecode(text) !== text;
    const idWire = needsEsc ? PHALANX3_ESC + '\n' + text : text;
    const idTok = needsEsc ? countTokens(idWire, enc) : inTokens;
    return { wire: idWire, decoded: text, exact: true, mode: 'identity', koineKept: false, recallKept: false, inTokens, outTokens: idTok };
  }
  void rIn;
  return { wire: v, decoded: decoded as string, exact: true, mode: 'phalanx3', koineKept: kKept, recallKept: rKept, inTokens, outTokens };
}
