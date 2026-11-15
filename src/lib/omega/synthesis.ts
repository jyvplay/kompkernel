/**
 * src/lib/omega/synthesis.ts — X117. ΣΥΝΘΕΣΙΣ (synthesis), "a putting together".
 * =============================================================================
 * THE MECHANISM: CROSS-CODEC CONTRACT CSE + SINGLE-PASS ENTAILMENT CONJUNCTION
 * -----------------------------------------------------------------------------
 * X115/X116 compose three independent record-level entailments by NESTING their
 * candidates: ΕΝΑΛΛΑΓΗ (symbolic mode ↔ octal), ΜΗΚΟΣ (symlink size = target byte
 * length), and ΣΥΜΦΥΊΑ (a cross-field template). Nesting is exact, but it pays two
 * costs the reader does not need:
 *
 *   1. CONTRACT REDUNDANCY. Each layer prepends its own key. On ls-l-real the
 *      three keys repeat `Body first.` and carry three separate preambles where
 *      one ordered conjunction says the same thing. The redundant preamble is
 *      48 o200k tokens; the fused key below is 41 on the shipped rule/crc.
 *      The 35–38 token spellings measured in bench/x117/receipts/fusion-ladder*.log
 *      buy their extra tokens by dropping `(1-based)`, `text after`, or `T+`;
 *      those are exactly the clauses X90/X115 paid to keep self-description, so
 *      the shipped fusion keeps them and takes the honest -7.
 *   2. SEARCH REDUNDANCY. Each layer re-enters the whole X74 chain on its
 *      rewritten body, so the same fully-entailed body is priced through several
 *      permutations. The rewrites touch disjoint fields and commute; one pass
 *      presents the same body to the parent frontier once.
 *
 * ΣΥΝΘΕΣΙΣ is not a new wire operator. It is a contract algebra and schedule over
 * three already-shipped, independently verified inverses. The parent frontier sees
 * the fully entailed body; the reader sees ONE key with an explicit expansion
 * order. The emitted key is a macro over the existing keys: parsing it reconstructs
 * the same rule set, marker, CRC, and inverse order, and the module's decoder
 * applies the existing ΣΥΜΦΥΊΑ/ΕΝΑΛΛΑΓΗ/ΜΗΚΟΣ inverses in that order.
 *
 * GREEDY? The ΣΥΜΦΥΊΑ rule selection is the same bounded raw-token greedy hill-climb
 * as X90. The conjunction itself is a total line-local rewrite on its domain. The
 * only admission decision is FIRE/NOT on the measured COMPLETE message.
 *
 * TIME/CPU: CPU-bound. No wall clock enters a decision. The dominant cost is ONE
 * parent-frontier encode of the fully rewritten body, instead of several nested
 * X74 re-entries.
 *
 * SOURCE CITATION (honest). The three entailments are the repository's X90/X115/
 * X116 constructions (POSIX chmod/lstat semantics and cross-field template fitting).
 * Cross-codec contract common-subexpression elimination and single-pass conjunction
 * are original X117 engineering; no paper claims this schedule.
 *
 * GATES
 *   G1 domain      all three rewrites must fire: octal mode exchange, symlink measure,
 *                  and exactly one ΣΥΜΦΥΊΑ tail rule with empty constant prefix.
 *   G2 ambiguity   marker absent; no pre-existing octal-form field; no λ in source.
 *   G3 own inverse ΣΥΜΦΥΊΑ decode (with CRC) → ΕΝΑΛΛΑΓΗ expand → ΜΗΚΟΣ expand
 *                  reproduces the source byte for byte.
 *   G4 composition parent frontier reproduces the fully rewritten body exactly.
 *   G5 strict win  countTokens(fused key + LF + inner.message) < incumbent.
 *   G6 key parse   the fused key parses back to the identical rule/marker/CRC.
 */

import { countTokens, type EncodingName } from './bpe';
import { crc32 } from './aither';
import { tagstackFrontier, type TagstackResult } from './tagstack';
import { enallageRewrite, enallageExpand, enallageDisabled, ENALLAGE_KEY } from './enallage';
import { mekosRewrite, mekosExpand, mekosDisabled, MEKOS_KEY } from './mekos';
import {
  symphyiaFit, symphyiaRewrite, symphyiaContract, symphyiaDecodeWire,
  type SymphyiaRule,
} from './symphyia';

export const SYNTHESIS_NAME = 'ΣΥΝΘΕΣΙΣ';
const MARKERS = '҂჻ᛝ⸙※⁂⁑⸎᚛᚜჻⸙'.split('').concat(['۞', '࿊', '࿉', '᪥', 'ꙮ']);
const MAX_RULES = 6;

export function synthesisDisabled(): boolean {
  if (typeof process === 'undefined') return false;
  return process.env?.OMEGA_SYNTHESIS === '0'
    || process.env?.OMEGA_SYNTHESIS === 'false'
    || process.env?.OMEGA_NO_SYNTHESIS === '1';
}

function crcOf(text: string): string {
  return crc32(new TextEncoder().encode(text)).toString(16).padStart(8, '0');
}

export interface SynthesisKeyParts {
  j: number;
  i: number;
  marker: string;
  crc: string;
}

/** The fused key. Clauses are printed in inverse-application order:
 *  ΣΥΜΦΥΊΑ template, then ΕΝΑΛΛΑΓΗ mode exchange, then ΜΗΚΟΣ measure. */
export function synthesisKey(parts: SynthesisKeyParts): string {
  return `Body first. f${parts.j}=f${parts.i}+text after ${parts.marker} (1-based); ^Tnnnn␠→T+chmod; λ=#bytes after ->. crc=${parts.crc}`;
}

/** Parse the fused key back to its parts; null on anything else. */
export function synthesisParseKey(line: string): SynthesisKeyParts | null {
  const m = /^Body first\. f(\d+)=f(\d+)\+text after (.) \(1-based\); \^Tnnnn␠→T\+chmod; λ=#bytes after ->\. crc=([0-9a-f]{8})$/.exec(line);
  if (!m) return null;
  const parts: SynthesisKeyParts = { j: Number(m[1]), i: Number(m[2]), marker: m[3]!, crc: m[4]! };
  if (!Number.isSafeInteger(parts.j) || !Number.isSafeInteger(parts.i) || parts.j < 1 || parts.i < 1) return null;
  // Canonical re-render guards against a non-canonical spelling parsing loosely.
  if (synthesisKey(parts) !== line) return null;
  return parts;
}

function ruleFromParts(parts: SynthesisKeyParts): SymphyiaRule {
  return { j: parts.j, i: parts.i, form: 'tail', A: '', B: '', rows: 0, eligible: 0, distinctSource: 0, est: 0 };
}

/** Exact inverse of the fused layer, given the parent-decoded body. */
export function synthesisDecodeBody(inner: string, parts: SynthesisKeyParts): string {
  const rule = ruleFromParts(parts);
  const afterSym = symphyiaDecodeWire(inner, [rule], parts.marker, parts.crc);
  if (afterSym === null) throw new Error('synthesis: ΣΥΜΦΥΊΑ body/CRC does not satisfy the fused key');
  const afterMode = enallageExpand(afterSym);
  return mekosExpand(afterMode);
}

/** Total message inverse. The parent decoder is the frontier's own reader. */
export function synthesisDecode(message: string, parentDecoder?: (wire: string) => string): string {
  const nl = message.indexOf('\n');
  const key = nl < 0 ? message : message.slice(0, nl);
  const body = nl < 0 ? '' : message.slice(nl + 1);
  const parts = synthesisParseKey(key);
  if (!parts) throw new Error('synthesis: fused key does not parse');
  const inner = parentDecoder ? parentDecoder(body) : body;
  return synthesisDecodeBody(inner, parts);
}

export interface SynthesisResult {
  codec: 'synthesis';
  wire: string;
  message: string;
  decoded: string;
  exact: boolean;
  applied: boolean;
  hits: { mode: number; measure: number; template: number };
  contractTokens: number;
  messageTokens: number;
  frontierTokens: number;
  frontierParent: string;
  crc: string;
  notes: string;
}

/**
 * Encode. `incumbentTokens` is the complete-message cost to beat. When omitted,
 * the parent frontier on the ORIGINAL text is measured (registry use).
 */
export function synthesisEncode(
  text: string,
  enc: EncodingName = 'o200k_base',
  incumbentTokens?: number,
  /** Optional inner encoder. The X74 chain passes its own measured chain so the
   *  fused body compounds with the wire-level glyph optimizations (ἸΣΟΜΟΡΦΊΑ /
   *  ΜΕΤΑΤΑΞΙΣ) exactly as the nested ΕΝΑΛΛΑΓΗ/ΜΗΚΟΣ/ΣΥΜΦΥΊΑ path does. Pricing
   *  the body through the BASE frontier alone measured +12 tokens on ls-l-real
   *  (X118 A/B): the nested path optimizes the same tape, the base path does not.
   *  The rewritten body has octal modes / λ / template marks already, so the
   *  re-entered ΣΥΝΘΕΣΙΣ candidate refuses by G1 and the recursion is well-founded. */
  innerEncoder?: (t: string, e: EncodingName) => TagstackResult,
): SynthesisResult {
  const refuse = (notes: string, frontier?: TagstackResult): SynthesisResult => ({
    codec: 'synthesis', wire: text, message: text, decoded: text, exact: true,
    applied: false, hits: { mode: 0, measure: 0, template: 0 }, contractTokens: 0,
    messageTokens: countTokens(text, enc),
    frontierTokens: frontier?.messageTokens ?? countTokens(text, enc),
    frontierParent: frontier?.parentCodec ?? 'identity', crc: '', notes,
  });
  if (synthesisDisabled()) return refuse('synthesis: disabled');
  if (enallageDisabled()) return refuse('synthesis: ΕΝΑΛΛΑΓΗ constituent disabled');
  if (mekosDisabled()) return refuse('synthesis: ΜΗΚΟΣ constituent disabled');

  // The three rewrites touch disjoint fields. Apply the two line-local radix/measure
  // exchanges first, then fit the cross-field template on that body, exactly as the
  // nested X116 chain would see it at its innermost ΣΥΜΦΥΊΑ call.
  const mode = enallageRewrite(text);
  if (!mode) return refuse('synthesis: no unambiguous symbolic mode field');
  const measure = mekosRewrite(mode.wire);
  if (!measure) return refuse('synthesis: no unambiguous symlink measure field');
  const pre = measure.wire;

  const fit = symphyiaFit(pre);
  if (!fit.rules.length) return refuse('synthesis: no cross-field template relation reaches support');
  const marker = MARKERS.find(g => !pre.includes(g) && countTokens(g, enc) === 1);
  if (!marker) return refuse('synthesis: no single-token marker absent from the body');

  // X90's bounded greedy selection, priced on raw tokens with a placeholder CRC.
  const chosen: SymphyiaRule[] = [];
  const targets = new Set<number>();
  let bestRaw = countTokens(pre, enc);
  for (const r of fit.rules) {
    if (chosen.length >= MAX_RULES) break;
    if (targets.has(r.j) || targets.has(r.i)) continue;
    const trial = chosen.concat([r]);
    const w = symphyiaRewrite(pre, trial, marker);
    if (w.rewritten === 0) continue;
    const contract = symphyiaContract(trial, marker, '00000000');
    const raw = countTokens(contract + '\n' + w.wire, enc);
    if (raw >= bestRaw) continue;
    bestRaw = raw; chosen.push(r); targets.add(r.j); targets.add(r.i);
  }
  // v1 ships the one-rule tail shape that the fused key can state without affixes.
  if (chosen.length !== 1 || chosen[0]!.form !== 'tail' || chosen[0]!.A !== '') {
    return refuse('synthesis: rule set is not the single empty-prefix tail shape');
  }
  const rule = chosen[0]!;
  const rw = symphyiaRewrite(pre, chosen, marker);
  const crc = crcOf(pre);
  const parts: SynthesisKeyParts = { j: rule.j, i: rule.i, marker, crc };
  const key = synthesisKey(parts);
  if (synthesisParseKey(key) === null) return refuse('synthesis: G6 fused key does not parse canonically');

  // G3 own inverse on the rewritten body before any frontier call.
  let own: string;
  try { own = synthesisDecodeBody(rw.wire, parts); } catch { return refuse('synthesis: G3 own inverse threw'); }
  if (own !== text) return refuse('synthesis: G3 own inverse disagrees');

  const inner = (innerEncoder ?? tagstackFrontier)(rw.wire, enc);
  if (inner.decoded !== rw.wire) return refuse('synthesis: G4 frontier does not reproduce the rewritten body', inner);
  const message = key + '\n' + inner.message;
  const tokens = countTokens(message, enc);
  const incumbent = incumbentTokens ?? tagstackFrontier(text, enc).messageTokens;
  if (tokens >= incumbent) return refuse(`synthesis: G5 loses ${tokens} vs ${incumbent}`, inner);

  // G4 composed inverse through the actual inner decoded body.
  let decoded: string;
  try { decoded = synthesisDecodeBody(inner.decoded, parts); } catch { return refuse('synthesis: composed inverse threw', inner); }
  if (decoded !== text) return refuse('synthesis: composed inverse disagrees', inner);

  return {
    codec: 'synthesis', wire: message, message, decoded, exact: true, applied: true,
    hits: { mode: mode.hits, measure: measure.hits, template: rw.rewritten },
    contractTokens: countTokens(key, enc), messageTokens: tokens,
    frontierTokens: incumbent, frontierParent: inner.parentCodec, crc,
    notes: `fused key over ${mode.hits} mode fields, ${measure.hits} measure fields, ${rw.rewritten} template fields; wire coded by ${inner.parentCodec}; M=${tokens} < ${incumbent}`,
  };
}

/** Re-export the nested keys for receipts/dispatch tests. */
export { ENALLAGE_KEY, MEKOS_KEY };
