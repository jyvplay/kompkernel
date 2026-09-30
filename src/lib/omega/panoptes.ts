/**
 * src/lib/omega/panoptes.ts
 * =============================================================================
 * PANOPTES (πανόπτης — "all-seeing")
 * Universal Composed-Canonicalization Meta-Pre-Pass (self-verifying, exact)
 *
 * Named for Argus Panoptes ("all-seeing"): where CHIMERA fused five early
 * pre-passes, PANOPTES is the terminal sovereign pre-pass that observes and
 * unifies ALL ELEVEN independent, previously disjoint canonicalization mechanisms
 * in this repository:
 *   1. CIRCE (HTML entities, hex/dec character references, percent encoding, invisible-guard stripping)
 *   2. PROCRUSTES (Letter-spacing destretching, Zenkaku fullwidth dewidening)
 *   3. ABACUS (Thousands-separator comma de-grouping, NFD Latin recomposition)
 *   4. ARITHMOS (Eastern Arabic-Indic, Persian, Devanagari native numeral restoration)
 *   5. KALLOS (Unicode Math Bold, Italic, Monospace, Sans-Serif font restoration)
 *   6. SYNTAGMA (Hangul decomposed Jamo recomposition)
 *   7. PROSOPON (Mojibake wrong-codepage UTF-8 restoration)
 *   8. EPISTLE (Quoted-Printable RFC 2045 MIME restoration)
 *   9. CAESURA (Non-breaking space, narrow no-break space normalization)
 *  10. ORTHOS (Apostrophe typographic canonicalization)
 *  11. STENTOR (ALL-CAPS sustained shout canonicalization)
 * =============================================================================
 */

import { countTokens, type EncodingName } from './bpe';
import { daedalusEncode, daedalusDecode, daedalusDecoderPrompt, type DaedalusResult, type DaedalusOptions } from './daedalus';
import { CHIRON_START } from './chiron';

import { orthosDeSmart, orthosReSmart } from './orthos';
import { stentorTransform, stentorRestoreSpans, SHOUT_OPEN, SHOUT_CLOSE } from './stentor';
import { abacusTransform, abacusRestoreSpans, NUM_MARK, UNI_OPEN, UNI_CLOSE } from './abacus';
import { procrustesTransform, procrustesRestoreSpans, DESTRETCH_MARK, DEWIDE_OPEN, DEWIDE_CLOSE } from './procrustes';
import { circeTransform, circeRestoreSpans, findInvisibleGuard, restoreInvisibleGuard, parseInvisiblePrefix, NAMED_MARK, DEC_MARK, HEX_MARK, PCT_MARK, INV_MARK } from './circe';
import { nbspTransform, nbspRestoreSpans, NBSP_OPEN, NARROW_OPEN, SPAN_CLOSE as CAESURA_SPAN_CLOSE } from './caesura';
import { syntagmaTransform, hangulRestoreSpans, HANGUL_OPEN, HANGUL_CLOSE } from './syntagma';
import { prosoponTransform, mojibakeRestoreSpans, MOJIBAKE_OPEN, MOJIBAKE_CLOSE } from './prosopon';
import { epistleTransform, qpRestoreSpans, QP_OPEN, QP_CLOSE } from './epistle';
import { arithmosTransform, arithmosRestoreSpans, ARABIC_PREFIX, PERSIAN_PREFIX, DEV_PREFIX } from './arithmos';
import { kallosTransform, kallosRestoreSpans, BOLD_OPEN, BOLD_CLOSE, ITALIC_OPEN, ITALIC_CLOSE, MONO_OPEN, MONO_CLOSE, SANS_OPEN, SANS_CLOSE } from './kallos';

export const PANOPTES_MARK = '\u25AC';   // ▬ U+25AC BLACK RECTANGLE — "PANOPTES applied"
export const PANOPTES_ESCAPE = '\u25CB'; // ○ U+25CB WHITE CIRCLE — "escaped, not applied"

function baseDaedalus(text: string, enc: EncodingName, options: DaedalusOptions): DaedalusResult {
  return daedalusEncode(text, enc, options);
}

export interface PanoptesComposed {
  finalCandidate: string;
  invGuard: { cp: number; direction: 'before' | 'after' } | null;
  orthosApplied: boolean;
  namedSpans: number;
  decSpans: number;
  hexSpans: number;
  pctSpans: number;
  destretchSpans: number;
  dewideSpans: number;
  numSpans: number;
  uniSpans: number;
  arabicSpans: number;
  persianSpans: number;
  devSpans: number;
  boldSpans: number;
  italicSpans: number;
  monoSpans: number;
  sansSpans: number;
  hangulSpans: number;
  mojibakeSpans: number;
  qpSpans: number;
  nbspSpans: number;
  narrowSpans: number;
  charsShouted: number;
}

function clauseCost(clause: string, enc: EncodingName): number {
  return countTokens('; ' + clause, enc);
}

export function panoptesCompose(text: string, enc: EncodingName): PanoptesComposed {
  let buf = text;

  // 1. Uniform invisible guard
  const invGuard = findInvisibleGuard(buf);
  if (invGuard) buf = invGuard.candidate;

  // 2. STENTOR (ALL-CAPS shouting)
  const beforeStentor = countTokens(buf, enc);
  const sten = stentorTransform(buf, enc);
  const stenGain = beforeStentor - countTokens(sten.candidate, enc);
  const stenCost = sten.charsShouted > 0 ? clauseCost(`${SHOUT_OPEN}..${SHOUT_CLOSE}\u2192uppercase inside, drop brackets`, enc) : 0;
  const keepStentor = sten.charsShouted > 0 && stenGain > stenCost;
  if (keepStentor) buf = sten.candidate;
  const charsShouted = keepStentor ? sten.charsShouted : 0;

  // 3. ORTHOS (De-smart apostrophes)
  const beforeOrthos = countTokens(buf, enc);
  const orthDe = orthosDeSmart(buf);
  const orthosVerified = orthDe !== buf && orthosReSmart(orthDe) === buf;
  const orthosGain = beforeOrthos - countTokens(orthDe, enc);
  const orthosCost = clauseCost(`'\u2192\u2018 if prev is start/space/([{-\u2014\u2013"\u201c'\u2018 else \u2019`, enc);
  const orthosApplied = orthosVerified && orthosGain > orthosCost;
  if (orthosApplied) buf = orthDe;

  // 4. CAESURA (NBSP / Narrow NBSP)
  const beforeCaes = countTokens(buf, enc);
  const caes = nbspTransform(buf, enc);
  const caesGain = beforeCaes - countTokens(caes.candidate, enc);
  const keepCaes = caes.spans.length > 0 && caesGain > 0;
  if (keepCaes) buf = caes.candidate;

  // 5. KALLOS (Math styled typography)
  const beforeKal = countTokens(buf, enc);
  const kal = kallosTransform(buf, enc);
  const kalGain = beforeKal - countTokens(kal.candidate, enc);
  const keepKal = kal.spans.length > 0 && kalGain > 0;
  if (keepKal) buf = kal.candidate;

  // 6. ARITHMOS (Native numerals)
  const beforeArith = countTokens(buf, enc);
  const arith = arithmosTransform(buf, enc);
  const arithGain = beforeArith - countTokens(arith.candidate, enc);
  const keepArith = arith.spans.length > 0 && arithGain > 0;
  if (keepArith) buf = arith.candidate;

  // 7. ABACUS (Thousands commas / NFD)
  const beforeAba = countTokens(buf, enc);
  const aba = abacusTransform(buf, enc);
  const abaGain = beforeAba - countTokens(aba.candidate, enc);
  const keepAba = aba.spans.length > 0 && abaGain > 0;
  if (keepAba) buf = aba.candidate;

  // 8. PROCRUSTES (Destretch / Dewide)
  const beforeProc = countTokens(buf, enc);
  const proc = procrustesTransform(buf, enc);
  const procGain = beforeProc - countTokens(proc.candidate, enc);
  const keepProc = proc.spans.length > 0 && procGain > 0;
  if (keepProc) buf = proc.candidate;

  // 9. SYNTAGMA (Hangul Jamo)
  const beforeSyn = countTokens(buf, enc);
  const syntagma = syntagmaTransform(buf, enc);
  const synGain = beforeSyn - countTokens(syntagma.candidate, enc);
  const keepSyn = syntagma.spans.length > 0 && synGain > 0;
  if (keepSyn) buf = syntagma.candidate;

  // 10. PROSOPON (Mojibake UTF-8)
  const beforePros = countTokens(buf, enc);
  const prosopon = prosoponTransform(buf, enc);
  const prosGain = beforePros - countTokens(prosopon.candidate, enc);
  const keepPros = prosopon.spans.length > 0 && prosGain > 0;
  if (keepPros) buf = prosopon.candidate;

  // 11. EPISTLE (Quoted-printable MIME)
  const beforeEpist = countTokens(buf, enc);
  const epistle = epistleTransform(buf, enc);
  const epistGain = beforeEpist - countTokens(epistle.candidate, enc);
  const keepEpist = epistle.spans.length > 0 && epistGain > 0;
  if (keepEpist) buf = epistle.candidate;

  // 12. CIRCE (HTML entities / percent)
  const beforeCirce = countTokens(buf, enc);
  const circe = circeTransform(buf, enc);
  const circeGain = beforeCirce - countTokens(circe.candidate, enc);
  const keepCirce = circe.spans.length > 0 && circeGain > 0;
  if (keepCirce) buf = circe.candidate;

  return {
    finalCandidate: buf,
    invGuard: invGuard ? { cp: invGuard.cp, direction: invGuard.direction } : null,
    orthosApplied,
    namedSpans: keepCirce ? circe.namedSpans : 0,
    decSpans: keepCirce ? circe.decSpans : 0,
    hexSpans: keepCirce ? circe.hexSpans : 0,
    pctSpans: keepCirce ? circe.pctSpans : 0,
    destretchSpans: keepProc ? proc.destretchSpans : 0,
    dewideSpans: keepProc ? proc.dewideSpans : 0,
    numSpans: keepAba ? aba.numSpans : 0,
    uniSpans: keepAba ? aba.uniSpans : 0,
    arabicSpans: keepArith ? arith.spans.filter(s => s.script === 'arabic').length : 0,
    persianSpans: keepArith ? arith.spans.filter(s => s.script === 'persian').length : 0,
    devSpans: keepArith ? arith.spans.filter(s => s.script === 'devanagari').length : 0,
    boldSpans: keepKal ? kal.spans.filter(s => s.style === 'bold').length : 0,
    italicSpans: keepKal ? kal.spans.filter(s => s.style === 'italic').length : 0,
    monoSpans: keepKal ? kal.spans.filter(s => s.style === 'mono').length : 0,
    sansSpans: keepKal ? kal.spans.filter(s => s.style === 'sans').length : 0,
    hangulSpans: keepSyn ? syntagma.spans.length : 0,
    mojibakeSpans: keepPros ? prosopon.spans.length : 0,
    qpSpans: keepEpist ? epistle.spans.length : 0,
    nbspSpans: keepCaes ? caes.spans.filter(s => s.target === '\u00A0').length : 0,
    narrowSpans: keepCaes ? caes.spans.filter(s => s.target === '\u202F').length : 0,
    charsShouted,
  };
}

export interface PanoptesResult extends DaedalusResult {
  codec2: 'panoptes';
  panoptesWinner: string;
  panoptesApplied: boolean;
  panoptesStagesFired: number;
}

function panoptesTailInstruction(meta: PanoptesComposed): string {
  const clauses: string[] = [];
  if (meta.invGuard) {
    const dir = meta.invGuard.direction === 'before' ? 'before' : 'after';
    clauses.push(`U+${meta.invGuard.cp.toString(16).padStart(4, '0')} inserted ${dir} every space`);
  }
  if (meta.charsShouted > 0) clauses.push(`${SHOUT_OPEN}..${SHOUT_CLOSE}\u2192uppercase inside, drop brackets`);
  if (meta.orthosApplied) clauses.push(`'\u2192\u2018 if prev is start/space/([{-\u2014\u2013"\u201c'\u2018 else \u2019`);
  if (meta.nbspSpans > 0) clauses.push(`${NBSP_OPEN}..${CAESURA_SPAN_CLOSE}: space\u2192NBSP, drop marks`);
  if (meta.narrowSpans > 0) clauses.push(`${NARROW_OPEN}..${CAESURA_SPAN_CLOSE}: space\u2192narrow-NBSP(U+202F), drop marks`);
  if (meta.qpSpans > 0) clauses.push(`${QP_OPEN}..${QP_CLOSE}: char\u2192utf8 bytes, byte<=7F\u2192ascii else\u2192"="+uppercase hex, drop marks`);
  if (meta.mojibakeSpans > 0) clauses.push(`${MOJIBAKE_OPEN}..${MOJIBAKE_CLOSE}: char\u2192utf8 bytes as win1252/latin1, drop marks`);
  if (meta.hangulSpans > 0) clauses.push(`${HANGUL_OPEN}..${HANGUL_CLOSE}: NFD decompose Hangul syllables, drop marks`);
  if (meta.boldSpans > 0) clauses.push(`${BOLD_OPEN}..${BOLD_CLOSE}: ascii\u2192math bold, drop marks`);
  if (meta.italicSpans > 0) clauses.push(`${ITALIC_OPEN}..${ITALIC_CLOSE}: ascii\u2192math italic, drop marks`);
  if (meta.monoSpans > 0) clauses.push(`${MONO_OPEN}..${MONO_CLOSE}: ascii\u2192math mono, drop marks`);
  if (meta.sansSpans > 0) clauses.push(`${SANS_OPEN}..${SANS_CLOSE}: ascii\u2192math sans, drop marks`);
  if (meta.arabicSpans > 0) clauses.push(`${ARABIC_PREFIX} followed by ascii digits\u21920x0660+d, drop ${ARABIC_PREFIX}`);
  if (meta.persianSpans > 0) clauses.push(`${PERSIAN_PREFIX} followed by ascii digits\u21920x06F0+d, drop ${PERSIAN_PREFIX}`);
  if (meta.devSpans > 0) clauses.push(`${DEV_PREFIX} followed by ascii digits\u21920x0966+d, drop ${DEV_PREFIX}`);
  if (meta.numSpans > 0) clauses.push(`${NUM_MARK} followed by digits\u2192thousands commas`);
  if (meta.uniSpans > 0) clauses.push(`${UNI_OPEN}..${UNI_CLOSE}\u2192NFD, drop brackets`);
  if (meta.destretchSpans > 0) clauses.push(`${DESTRETCH_MARK} followed by run\u2192space-separate`);
  if (meta.dewideSpans > 0) clauses.push(`${DEWIDE_OPEN}..${DEWIDE_CLOSE}\u2192+0xFEE0 fullwidth, drop brackets`);
  if (meta.namedSpans > 0) clauses.push(`${NAMED_MARK}X\u2192HTML entity for X`);
  if (meta.decSpans > 0) clauses.push(`${DEC_MARK}X\u2192&#codepoint(X)`);
  if (meta.hexSpans > 0) clauses.push(`${HEX_MARK}X\u2192&#x(hex of X)`);
  if (meta.pctSpans > 0) clauses.push(`${PCT_MARK}X\u2192UTF8 %-encode X uppercase`);

  const body = clauses.length > 0 ? clauses.join('; ') + '.' : '';
  return `Drop leading ${PANOPTES_MARK}/${PANOPTES_ESCAPE}, decode rest as above. ${body}`;
}

const PANOPTES_TAIL_ESCAPE = `Drop the leading ${PANOPTES_ESCAPE} above, then decode the rest as already instructed.`;

export function panoptesEncode(text: string, enc: EncodingName = 'o200k_base', options: DaedalusOptions = {}): PanoptesResult {
  const started = Date.now();
  const inTokens = countTokens(text, enc);

  const plainRaw = baseDaedalus(text, enc, options);
  const collision = plainRaw.wire.length > 0 && (plainRaw.wire[0] === PANOPTES_MARK || plainRaw.wire[0] === PANOPTES_ESCAPE);
  const plain = collision ? {
    ...plainRaw,
    wire: PANOPTES_ESCAPE + plainRaw.wire,
    decoderPrompt: `${PANOPTES_ESCAPE}${plainRaw.decoderPrompt}\n${PANOPTES_TAIL_ESCAPE}`,
    messageTokens: countTokens(`${PANOPTES_ESCAPE}${plainRaw.decoderPrompt}\n${PANOPTES_TAIL_ESCAPE}`, enc),
  } : plainRaw;

  let best: PanoptesResult = {
    ...plain,
    codec2: 'panoptes',
    panoptesWinner: 'plain',
    panoptesApplied: false,
    panoptesStagesFired: 0,
    ms: Date.now() - started,
    notes: `panoptes: not applied; ${plainRaw.notes}`,
  };

  // The unified composed pipeline:
  const meta = panoptesCompose(text, enc);
  const stagesFired = [
    meta.charsShouted > 0, meta.orthosApplied, meta.nbspSpans > 0 || meta.narrowSpans > 0,
    meta.qpSpans > 0, meta.mojibakeSpans > 0, meta.hangulSpans > 0,
    meta.boldSpans > 0 || meta.italicSpans > 0 || meta.monoSpans > 0 || meta.sansSpans > 0,
    meta.arabicSpans > 0 || meta.persianSpans > 0 || meta.devSpans > 0,
    meta.numSpans > 0 || meta.uniSpans > 0,
    meta.destretchSpans > 0 || meta.dewideSpans > 0,
    meta.namedSpans > 0 || meta.decSpans > 0 || meta.hexSpans > 0 || meta.pctSpans > 0,
    meta.invGuard !== null,
  ].filter(Boolean).length;

  if (meta.finalCandidate !== text || meta.invGuard) {
    const canon = baseDaedalus(meta.finalCandidate, enc, options);
    const orthosFlag = meta.orthosApplied ? '1' : '0';
    const invPrefix = meta.invGuard ? `${INV_MARK}${meta.invGuard.direction === 'before' ? 'b' : 'a'}${meta.invGuard.cp.toString(16).padStart(4, '0')}` : '';
    const bodyWire = PANOPTES_MARK + orthosFlag + canon.wire;
    const composedWire = invPrefix + bodyWire;
    const tail = panoptesTailInstruction(meta);
    const bodyPrompt = `${PANOPTES_MARK}${orthosFlag}${canon.decoderPrompt}\n${tail}`;
    const composedPrompt = invPrefix + bodyPrompt;
    const composedMessageTokens = countTokens(composedPrompt, enc);

    if (composedMessageTokens < best.messageTokens) {
      const decodedBack = panoptesDecode(composedWire);
      if (decodedBack === text) {
        best = {
          ...canon,
          codec2: 'panoptes',
          wire: composedWire,
          decoded: decodedBack,
          exact: true,
          inTokens,
          messageTokens: composedMessageTokens,
          contractTokens: composedMessageTokens - canon.outTokens,
          decoderPrompt: composedPrompt,
          panoptesWinner: 'composed',
          panoptesApplied: true,
          panoptesStagesFired: stagesFired,
          ms: Date.now() - started,
          notes: `panoptes: composed pipeline applied, ${stagesFired} mechanism-families fired together, saved ${plain.messageTokens - composedMessageTokens} tok over plain DAEDALUS; ${canon.notes}`,
        };
      }
    }
  }

  return best;
}

export function panoptesDecode(wire: string): string {
  if (wire.length === 0) return wire;
  const inv = parseInvisiblePrefix(wire);
  const body = inv ? inv.rest : wire;

  let decoded: string;
  if (body[0] === PANOPTES_ESCAPE) {
    decoded = daedalusDecode(body.slice(1));
  } else if (body[0] === PANOPTES_MARK) {
    const orthosFlag = body[1];
    const rest = body.slice(2);
    decoded = daedalusDecode(rest);
    // Reverse in exact opposite order of application
    decoded = stentorRestoreSpans(decoded);
    if (orthosFlag === '1') decoded = orthosReSmart(decoded);
    decoded = nbspRestoreSpans(decoded);
    decoded = kallosRestoreSpans(decoded);
    decoded = arithmosRestoreSpans(decoded);
    decoded = abacusRestoreSpans(decoded);
    decoded = procrustesRestoreSpans(decoded);
    decoded = hangulRestoreSpans(decoded);
    decoded = mojibakeRestoreSpans(decoded);
    decoded = qpRestoreSpans(decoded);
    decoded = circeRestoreSpans(decoded);
  } else {
    decoded = daedalusDecode(body);
  }

  if (inv) decoded = restoreInvisibleGuard(decoded, inv.cp, inv.direction);
  return decoded;
}

export function panoptesDecoderPrompt(wire: string): string {
  if (wire.length === 0) return wire;
  const inv = parseInvisiblePrefix(wire);
  const invPrefixText = inv ? wire.slice(0, 6) : '';
  const body = inv ? inv.rest : wire;

  if (body[0] === PANOPTES_ESCAPE) {
    const inner = body.slice(1);
    const innerPrompt = inner.startsWith(CHIRON_START) && daedalusDecode(inner) !== inner ? daedalusDecoderPrompt(inner) : inner;
    return `${invPrefixText}${body[0]}${innerPrompt}\n${PANOPTES_TAIL_ESCAPE}`;
  }
  if (body[0] === PANOPTES_MARK) {
    const orthosFlag = body[1];
    const inner = body.slice(2);
    const innerPrompt = inner.startsWith(CHIRON_START) && daedalusDecode(inner) !== inner ? daedalusDecoderPrompt(inner) : inner;
    const decodedInner = daedalusDecode(inner);
    const meta: PanoptesComposed = {
      finalCandidate: '',
      invGuard: inv ? { cp: inv.cp, direction: inv.direction } : null,
      orthosApplied: orthosFlag === '1',
      namedSpans: decodedInner.includes(NAMED_MARK) ? 1 : 0,
      decSpans: decodedInner.includes(DEC_MARK) ? 1 : 0,
      hexSpans: decodedInner.includes(HEX_MARK) ? 1 : 0,
      pctSpans: decodedInner.includes(PCT_MARK) ? 1 : 0,
      destretchSpans: decodedInner.includes(DESTRETCH_MARK) ? 1 : 0,
      dewideSpans: decodedInner.includes(DEWIDE_OPEN) ? 1 : 0,
      numSpans: decodedInner.includes(NUM_MARK) ? 1 : 0,
      uniSpans: decodedInner.includes(UNI_OPEN) ? 1 : 0,
      arabicSpans: decodedInner.includes(ARABIC_PREFIX) ? 1 : 0,
      persianSpans: decodedInner.includes(PERSIAN_PREFIX) ? 1 : 0,
      devSpans: decodedInner.includes(DEV_PREFIX) ? 1 : 0,
      boldSpans: decodedInner.includes(BOLD_OPEN) ? 1 : 0,
      italicSpans: decodedInner.includes(ITALIC_OPEN) ? 1 : 0,
      monoSpans: decodedInner.includes(MONO_OPEN) ? 1 : 0,
      sansSpans: decodedInner.includes(SANS_OPEN) ? 1 : 0,
      hangulSpans: decodedInner.includes(HANGUL_OPEN) ? 1 : 0,
      mojibakeSpans: decodedInner.includes(MOJIBAKE_OPEN) ? 1 : 0,
      qpSpans: decodedInner.includes(QP_OPEN) ? 1 : 0,
      nbspSpans: decodedInner.includes(NBSP_OPEN) ? 1 : 0,
      narrowSpans: decodedInner.includes(NARROW_OPEN) ? 1 : 0,
      charsShouted: decodedInner.includes(SHOUT_OPEN) ? 1 : 0,
    };
    const tail = panoptesTailInstruction(meta);
    return `${invPrefixText}${PANOPTES_MARK}${orthosFlag}${innerPrompt}\n${tail}`;
  }

  return wire.startsWith(CHIRON_START) && daedalusDecode(wire) !== wire ? daedalusDecoderPrompt(wire) : wire;
}
