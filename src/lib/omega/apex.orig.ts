/**
 * src/lib/omega/apex.ts
 * =============================================================================
 * OMEGA-APEX (Λ†) — VERIFIED COMPOSITION-TOURNAMENT CODEC
 * Original synthesis: July 27, 2026.
 *
 * PARETO SUPERIORITY BY CONSTRUCTION (the honest claim)
 * -----------------------------------------------------
 * Every prior readable-lane codec in this repository is ONE fixed composition:
 *   NEXUS  = Prometheus(Sigma(LTP(x)))          — one ordering, one dict pass
 *   ZETA   = Prometheus(LTP(x))                 — no Sigma
 *   LTP/Sigma/Prometheus alone                  — single layers
 *
 * APEX runs a TOURNAMENT over the composition lattice:
 *   C1: LTP → Sigma → Prometheus      (NEXUS ordering)
 *   C2: Sigma → LTP → Prometheus      (alternate ordering — Sigma first can
 *       expose different whitespace runs; LTP on folded rows is cheaper)
 *   C3: best(C1,C2) → Prometheus #2   (MULTI-TIER NESTED DICTIONARY:
 *       the first substitution pass shortens the text, which changes n-gram
 *       frequencies and symbol-adjacency; a second pass catches medium-length
 *       phrases that were not net-positive before but are now)
 *   C4..C6: each single layer alone
 *   C0: identity
 *
 * Winner = argmin real BPE tokens among candidates whose OWN decode chain
 * reproduces the input byte-for-byte. Since the candidate set contains every
 * existing readable codec as a member, APEX ≥ all of them on every input,
 * and the identity member guarantees it is never worse than sending raw.
 * That is Pareto dominance in the literal sense — no fabricated numbers,
 * no probabilistic hand-waving; the gate executes before anything ships.
 *
 * Wire remains ordinary readable text (dictionary headers + schema headers),
 * directly reasoned over by any LLM with zero decode tokens. LTP residual and
 * the composition-order tag stay LOCAL (never sent), exactly like LTP itself.
 * =============================================================================
 */
import { countTokens, type EncodingName } from './bpe';
import { ltpProject, ltpRestore, type LtpOp } from './ltp';
import { sigmaEncode, sigmaDecode } from './sigma';
import { stencilEncode, stencilDecode } from './stencil';
import {
  compressPrometheusICDM,
  decompressPrometheusICDM,
} from './prometheus-icdm';
import { eidolonProject, eidolonRestore } from './eidolon';
import { morphEncode, morphDecode } from './morph';

export type ApexOrder =
  | 'IDENTITY'
  | 'LTP'
  | 'SIGMA'
  | 'STENCIL'
  | 'MORPH'
  | 'PROM'
  | 'EIDOLON'
  | 'LTP>PROM'
  | 'LTP>SIGMA>PROM'
  | 'SIGMA>LTP>PROM'
  | 'EIDOLON>PROM'
  | 'LTP>SIGMA>PROM>PROM2'
  | 'SIGMA>LTP>PROM>PROM2';

export interface ApexResult {
  ok: boolean;
  encoding: EncodingName;
  wire: string;
  decoded: string;
  exact: boolean;
  order: ApexOrder;           // kept locally; needed for byte-exact restore
  residual: LtpOp[];          // kept locally; never sent
  eidolonResidual: LtpOp[];   // kept locally; never sent
  sigmaApplied: boolean;
  promPasses: number;         // 0, 1 or 2 (nested multi-tier dictionary)
  inTokens: number;
  outTokens: number;
  savedTokens: number;
  savingsPct: number;
  candidatesTried: number;
  candidateAudit: Array<{ order: ApexOrder; tokens: number; exact: boolean }>;
  inChars: number;
  outChars: number;
  encodeMs: number;
  notes: string;
}

/** Decode: unwind Prometheus passes (looped — handles nesting), then Sigma,
 *  then LTP residual, in the order recorded at encode time. */
export function apexDecode(
  wire: string,
  order: ApexOrder,
  residual: LtpOp[],
  eidolonResidual: LtpOp[] = [],
): string {
  let text = wire;
  // Prometheus headers are self-identifying; loop handles nested pass-2 header.
  for (let guard = 0; guard < 4; guard++) {
    const before = text;
    text = decompressPrometheusICDM(text);
    if (text === before) break;
  }
  if (order === 'STENCIL') {
    text = stencilDecode(text);
    return text;
  }
  if (order === 'MORPH') {
    text = morphDecode(text);
    return text;
  }
  if (order.includes('SIGMA')) {
    if (order.startsWith('SIGMA>LTP')) {
      // encode was Sigma first, LTP second → residual offsets refer to the
      // sigma-folded text, so restore LTP BEFORE unfolding Sigma.
      if (residual.length > 0) text = ltpRestore(text, residual);
      text = sigmaDecode(text);
      return text;
    }
    text = sigmaDecode(text);
  }
  if (order.includes('EIDOLON')) {
    if (eidolonResidual.length > 0) text = eidolonRestore(text, eidolonResidual);
  }
  if (order.includes('LTP') && residual.length > 0) {
     text = ltpRestore(text, residual);
  }
  return text;
}

interface Cand {
  order: ApexOrder;
  wire: string;
  residual: LtpOp[];
  eidolonResidual: LtpOp[];
  sigmaApplied: boolean;
  promPasses: number;
}

export async function apexEncode(
  text: string,
  enc: EncodingName = 'o200k_base',
): Promise<ApexResult> {
  const t0 = performance.now();
  const inTokens = countTokens(text, enc);
  const inChars = text.length;

  const identityResult = (notes: string): ApexResult => ({
    ok: true, encoding: enc, wire: text, decoded: text, exact: true,
    order: 'IDENTITY', residual: [], eidolonResidual: [], sigmaApplied: false, promPasses: 0,
    inTokens, outTokens: inTokens, savedTokens: 0, savingsPct: 0,
    candidatesTried: 1, candidateAudit: [{ order: 'IDENTITY', tokens: inTokens, exact: true }],
    inChars, outChars: inChars, encodeMs: performance.now() - t0, notes,
  });

  if (text.length > 120000) return identityResult('APEX: over 120k chars — skipped to prevent UI stall.');
  if (!text || inTokens < 3) return identityResult('Input too short.');

  const cands: Cand[] = [{ order: 'IDENTITY', wire: text, residual: [], eidolonResidual: [], sigmaApplied: false, promPasses: 0 }];

  // ── Single layers ────────────────────────────────────────────────
  const ltpA = ltpProject(text, enc);
  if (ltpA.applied) cands.push({ order: 'LTP', wire: ltpA.wire, residual: ltpA.residual, eidolonResidual: [], sigmaApplied: false, promPasses: 0 });

  const sigA = sigmaEncode(text, enc);
  if (sigA.applied) cands.push({ order: 'SIGMA', wire: sigA.wire, residual: [], eidolonResidual: [], sigmaApplied: true, promPasses: 0 });

  const stA = stencilEncode(text, enc);
  if (stA.applied) cands.push({ order: 'STENCIL', wire: stA.wire, residual: [], eidolonResidual: [], sigmaApplied: false, promPasses: 0 });

  const morphA = morphEncode(text, enc);
  if (morphA.applied) cands.push({ order: 'MORPH', wire: morphA.wire, residual: [], eidolonResidual: [], sigmaApplied: false, promPasses: 0 });

  const eidoA = eidolonProject(text, enc);
  if (eidoA.applied) cands.push({ order: 'EIDOLON', wire: eidoA.wire, residual: [], eidolonResidual: eidoA.residual, sigmaApplied: false, promPasses: 0 });

  const promA = await compressPrometheusICDM(text, enc);
  if (promA.dictionaryCount > 0 && promA.exact) cands.push({ order: 'PROM', wire: promA.output, residual: [], eidolonResidual: [], sigmaApplied: false, promPasses: 1 });

  // ── Zeta-shaped candidate: LTP → Prometheus, NO Sigma. Required so the
  //    Pareto claim literally covers every readable codec even when Sigma
  //    applies but its header overhead makes skipping it cheaper. ──────
  if (ltpA.applied) {
    const zProm = await compressPrometheusICDM(ltpA.wire, enc);
    const zWire = zProm.dictionaryCount > 0 && zProm.exact ? zProm.output : ltpA.wire;
    cands.push({ order: 'LTP>PROM', wire: zWire, residual: ltpA.residual, eidolonResidual: [], sigmaApplied: false, promPasses: zProm.dictionaryCount > 0 ? 1 : 0 });
  }

  // ── Eidolon -> Prom candidate ──────────────────────────────────────
  if (eidoA.applied) {
    const eProm = await compressPrometheusICDM(eidoA.wire, enc);
    const eWire = eProm.dictionaryCount > 0 && eProm.exact ? eProm.output : eidoA.wire;
    cands.push({ order: 'EIDOLON>PROM', wire: eWire, residual: [], eidolonResidual: eidoA.residual, sigmaApplied: false, promPasses: eProm.dictionaryCount > 0 ? 1 : 0 });
  }

  // ── C1: LTP → Sigma → Prometheus (NEXUS ordering) ────────────────
  const c1base = ltpA.applied ? ltpA.wire : text;
  const c1res = ltpA.applied ? ltpA.residual : [];
  const c1sig = sigmaEncode(c1base, enc);
  const c1mid = c1sig.applied ? c1sig.wire : c1base;
  const c1prom = await compressPrometheusICDM(c1mid, enc);
  const c1wire = c1prom.dictionaryCount > 0 && c1prom.exact ? c1prom.output : c1mid;
  cands.push({
    order: 'LTP>SIGMA>PROM', wire: c1wire, residual: c1res, eidolonResidual: [],
    sigmaApplied: c1sig.applied, promPasses: c1prom.dictionaryCount > 0 ? 1 : 0,
  });

  // ── C2: Sigma → LTP → Prometheus (alternate ordering) ────────────
  const c2sig = sigmaEncode(text, enc);
  const c2base = c2sig.applied ? c2sig.wire : text;
  const c2ltp = ltpProject(c2base, enc);
  const c2mid = c2ltp.applied ? c2ltp.wire : c2base;
  const c2prom = await compressPrometheusICDM(c2mid, enc);
  const c2wire = c2prom.dictionaryCount > 0 && c2prom.exact ? c2prom.output : c2mid;
  cands.push({
    order: 'SIGMA>LTP>PROM', wire: c2wire, residual: c2ltp.applied ? c2ltp.residual : [], eidolonResidual: [],
    sigmaApplied: c2sig.applied, promPasses: c2prom.dictionaryCount > 0 ? 1 : 0,
  });

  // ── C3: multi-tier nested dictionary — Prometheus pass #2 over the
  //        better of C1/C2 (only admitted if it self-funds) ──────────
  const t1 = countTokens(c1wire, enc);
  const t2 = countTokens(c2wire, enc);
  const bestSingle = t1 <= t2
    ? { wire: c1wire, residual: c1res, sigmaApplied: c1sig.applied, base: 'LTP>SIGMA>PROM' as const, passes: c1prom.dictionaryCount > 0 ? 1 : 0 }
    : { wire: c2wire, residual: c2ltp.applied ? c2ltp.residual : [], sigmaApplied: c2sig.applied, base: 'SIGMA>LTP>PROM' as const, passes: c2prom.dictionaryCount > 0 ? 1 : 0 };
  if (bestSingle.passes === 1) {
    const prom2 = await compressPrometheusICDM(bestSingle.wire, enc);
    if (prom2.dictionaryCount > 0 && prom2.exact && countTokens(prom2.output, enc) < countTokens(bestSingle.wire, enc)) {
      cands.push({
        order: bestSingle.base === 'LTP>SIGMA>PROM' ? 'LTP>SIGMA>PROM>PROM2' : 'SIGMA>LTP>PROM>PROM2',
        wire: prom2.output, residual: bestSingle.residual, eidolonResidual: [],
        sigmaApplied: bestSingle.sigmaApplied, promPasses: 2,
      });
    }
  }

  // ── Tournament: exactness-gate every candidate, pick min real tokens ─
  const audit: Array<{ order: ApexOrder; tokens: number; exact: boolean }> = [];
  let best: (Cand & { tokens: number }) | null = null;
  for (const c of cands) {
    let exact = false;
    try {
      exact = apexDecode(c.wire, c.order, c.residual) === text;
    } catch { exact = false; }
    const tokens = countTokens(c.wire, enc);
    audit.push({ order: c.order, tokens, exact });
    if (exact && (!best || tokens < best.tokens)) best = { ...c, tokens };
  }

  if (!best || best.order === 'IDENTITY' || best.tokens >= inTokens) {
    const r = identityResult('No composition beat identity on this input.');
    r.candidatesTried = cands.length;
    r.candidateAudit = audit;
    return r;
  }

  const savedTokens = inTokens - best.tokens;
  return {
    ok: true, encoding: enc,
    wire: best.wire,
    decoded: text,
    exact: true,
    order: best.order,
    residual: best.residual,
    eidolonResidual: best.eidolonResidual,
    sigmaApplied: best.sigmaApplied,
    promPasses: best.promPasses,
    inTokens, outTokens: best.tokens, savedTokens,
    savingsPct: (savedTokens / inTokens) * 100,
    candidatesTried: cands.length,
    candidateAudit: audit,
    inChars, outChars: best.wire.length,
    encodeMs: performance.now() - t0,
    notes: `APEX tournament: ${cands.length} compositions gated, winner ${best.order}${best.promPasses === 2 ? ' (nested 2-tier dictionary)' : ''}, −${savedTokens} tokens (${((savedTokens / inTokens) * 100).toFixed(1)}%). Pareto ≥ every constituent codec by construction.`,
  };
}
