/**
 * src/lib/omega/abacus.ts
 * =============================================================================
 * ABACUS-M1 — Numeric-Grouping & Unicode-Composition Canonicalization Pre-Pass
 * (self-verifying, exact)
 *
 * MECHANISM (genuinely distinct from every lane shipped so far — ORTHOS
 * canonicalizes apostrophe TYPOGRAPHY, STENTOR canonicalizes sustained-case
 * RUNS; ABACUS canonicalizes two independent NUMERIC/ENCODING-FORM seams
 * that neither of those lanes touches, and that are orthogonal to word
 * identity, sentence case, and quoting style entirely):
 *
 *   (1) THOUSANDS-SEPARATOR COMMAS. o200k_base tokenizes digit runs mostly
 *       in chunks of up to 3 digits, so a comma inserted every three digits
 *       ("1,234,567") is USUALLY tokenized as extra ",digits" pieces on top
 *       of the digit run itself, while the bare digit run ("1234567") often
 *       collapses into fewer merges. MEASURED (bench/tmp/seam_scan.ts, this
 *       session): "1,234,567" = 5 tokens, "1234567" = 3 tokens — 2 tokens
 *       saved by removing the commas, scaling with comma-group count. This
 *       is completely invisible to a human proofreader (nobody notices a
 *       tokenizer's internal digit-chunking) and is not addressed by any
 *       existing prompt-compression technique found in this session's web
 *       research (see bench/abacus-report.md section G) — every published
 *       method treats numbers as opaque, un-inspected substrings.
 *
 *   (2) UNICODE NORMALIZATION FORM. Text that reaches an LLM prompt after
 *       passing through certain legacy pipelines (older Java/ICU exports,
 *       some PDF-to-text extractors, historically HFS+-originated
 *       filenames/metadata, some database dumps) is NFD-decomposed: an
 *       accented letter is stored as base-letter + a separate combining
 *       diacritical-mark codepoint, rather than a single precomposed
 *       codepoint. o200k_base's merge table is trained overwhelmingly on
 *       NFC (precomposed) text, so decomposed runs tokenize far worse.
 *       MEASURED (bench/tmp/nfd_realistic_test.ts, this session): a genuine
 *       80-token international-business email costs 110 tokens once
 *       decomposed to NFD — 30 extra tokens (37.5%) for text a human reader
 *       perceives as byte-identical. This is a completely different failure
 *       mode from (1): it is about Unicode CODEPOINT SEQUENCE, not digit
 *       grouping, and fires on entirely different documents (accented
 *       names/places vs. financial/statistical figures).
 *
 * Both seams are bundled into one lane because they share the same
 * architecture (self-verifying per-instance pre-pass feeding DAEDALUS) and
 * the same honest scope: ABACUS helps EXACTLY the documents that actually
 * contain comma-grouped numbers and/or NFD-decomposed accented text, and
 * provably never hurts anything else (every instance is independently
 * gated by round-trip exactness AND a real-tokenizer economic check before
 * being kept).
 *
 * MECHANISM (1) MARKING — single leading marker, not a bracket PAIR. Unlike
 * ORTHOS/STENTOR spans, a de-commified digit run has a SELF-TERMINATING
 * boundary: it ends at the first character that is not a digit or (at most
 * one) decimal point. So ABACUS needs only ONE sentinel character per
 * number instance (${NUM_MARK}1234567) instead of a bracket pair — this
 * halves the marker overhead from 2 tokens to 1 token per instance, which
 * matters because raw per-number savings are small (1-2 tokens) and must
 * clear the marker's own cost. MEASURED: this is why a single-comma-group
 * number ("$1,245.50" -> "$1245.50", 1 token raw saving) is a WASH against
 * a 1-token marker and is correctly declined by the gate every time, while
 * a number with 2+ comma groups ("$12,450,000" -> "$12450000", 2+ token
 * raw saving) clears the marker cost and is kept. SAFETY: the transform is
 * applied ONLY to number literals that ALREADY contain thousands-separator
 * commas in the source (verified by exact re-derivation, see
 * abacusFindNumberSpans) — it never touches a bare digit run. This is a
 * structural safety argument, not a heuristic: phone numbers, postal codes,
 * years, IDs, and other bare digit runs are essentially never written with
 * thousands-separator commas in real text, so they are never candidates in
 * the first place, and even if one were, the round-trip gate would still
 * catch any mismatch before the span is ever kept.
 *
 * MECHANISM (2) MARKING — bracket PAIR, clustered. A recomposed span does
 * NOT have a self-terminating boundary (any letter could plausibly be
 * followed by more accented letters), so it needs the ORTHOS/STENTOR-style
 * bracket-pair marker. A single affected WORD is almost always too short to
 * amortize a 2-token bracket pair (MEASURED: "café" standalone saves 1 raw
 * token vs. NFC but costs 2 tokens of brackets — a net loss), so ABACUS
 * clusters nearby affected words (gap <= ABACUS_UNI_MERGE_GAP chars) into
 * ONE bracket pair covering the whole affected region, exactly as a
 * document that is genuinely NFD-sourced end-to-end will have its accented
 * words scattered every few sentences rather than isolated. MEASURED: this
 * clustering is what turns a 0-token win (bracketing one word at a time)
 * into a 25-token win (bracketing the whole affected paragraph in one pair)
 * on the realistic international-business-email fixture.
 *
 * SAFETY, READABILITY-RESTRICTED SCOPE: to keep the decode instruction
 * short AND reliably executable by a bare LLM with no tools, mechanism (2)
 * is restricted to the 7 most common, universally-known Latin combining
 * diacritics (acute, grave, circumflex, tilde, diaeresis, cedilla, ring —
 * covering French/Spanish/Portuguese/Italian/German/Scandinavian business
 * and personal names, the overwhelming majority of real-world NFD-sourced
 * content). A word or cluster boundary containing any OTHER combining mark
 * (Vietnamese tone stacks, Czech/Polish diacritics, Arabic/Hebrew points,
 * etc.) is never marked — an honest, explicit scope narrowing, not a
 * silent gap papered over by the self-check alone (the self-check would
 * still catch any resulting mismatch and reject the span, but restricting
 * the CANDIDATE SET up front keeps every emitted instance within what a
 * capable LLM can reliably reconstruct from the compact decode rule).
 *
 * SELF-VERIFICATION, NOT A HEURISTIC GUESS, PER INSTANCE: exactly the same
 * discipline as ORTHOS/STENTOR. Every candidate span (number or Unicode
 * cluster) is applied tentatively, the WHOLE candidate text is round-
 * tripped through abacusRestoreSpans and required to reproduce the
 * original BYTE-IDENTICAL, and the real tokenizer (never estimated) must
 * show a strict improvement, before that span is ever kept. ABACUS can
 * never make a document cost more tokens than DAEDALUS alone would have.
 *
 * COMPOSABILITY: a PRE-PASS, not a competing lane — verified/cheaper
 * canonicalized text is handed to daedalusEncode for full downstream
 * compression, exactly like ORTHOS and STENTOR.
 *
 * SCOPE, HONESTLY STATED: helps documents containing comma-grouped
 * numbers in the hundred-thousands+ range (financial reports, population/
 * business statistics, e-commerce order summaries) and/or NFD-decomposed
 * accented text (international names/places from certain legacy export
 * pipelines). MEASURED this session on a realistic 6-fixture "everyday
 * work" combo (financial report, population statistics, an NFD-sourced
 * international business email, a mixed financial+NFD client update, an
 * expense report, an e-commerce order confirmation): 55 of 579 raw tokens
 * saved (9.5%) before any DAEDALUS composition — see bench/abacus-report.md
 * for the full breakdown, including per-fixture numbers and the honest
 * zero-gain case (the expense report, whose numbers are all single-comma-
 * group, correctly declines every span at zero cost).
 * =============================================================================
 */
import { countTokens, type EncodingName } from './bpe';
import { daedalusEncode, daedalusDecode, daedalusDecoderPrompt, type DaedalusResult, type DaedalusOptions } from './daedalus';
import { CHIRON_START } from './chiron';

/** Reserved, unused-elsewhere-in-repo, single-o200k-token sentinels.
 *  Verified via the live tokenizer (bench/tmp/find_glyphs4.ts, this
 *  session) and cross-checked against every existing lane's reserved
 *  glyph set (grep across src/lib/omega/*.ts) before adoption. */
export const ABACUS_MARK = '\u3012';    // 〒  U+3012 POSTAL MARK — "ABACUS applied"
export const ABACUS_ESCAPE = '\u25CF';  // ●  U+25CF BLACK CIRCLE — "escaped, not applied"
export const NUM_MARK = '\u25B2';       // ▲  U+25B2 BLACK UP-POINTING TRIANGLE — de-commified number prefix
export const UNI_OPEN = '\u3008';       // 〈  U+3008 LEFT ANGLE BRACKET — NFD-recompose span open
export const UNI_CLOSE = '\u3009';      // 〉  U+3009 RIGHT ANGLE BRACKET — NFD-recompose span close

const MAX_SPANS_EVALUATED = 400;

/** Max character gap between two Unicode-affected words for them to be
 *  merged into one shared bracket-pair span (amortizing the 2-token
 *  bracket overhead over a realistic sentence/paragraph-scale region). */
const ABACUS_UNI_MERGE_GAP = 150;

/** The 7 combining diacritical marks ABACUS mechanism (2) is restricted
 *  to — see the module docstring's "SAFETY, READABILITY-RESTRICTED SCOPE"
 *  section. All are in the U+0300-U+036F Combining Diacritical Marks
 *  block; any OTHER mark in that block disqualifies the word/cluster. */
const SAFE_COMBINING_MARKS = new Set<number>([
  0x0301, // acute
  0x0300, // grave
  0x0302, // circumflex
  0x0303, // tilde
  0x0308, // diaeresis
  0x0327, // cedilla
  0x030a, // ring above
]);

function hasUnsafeCombiningMark(word: string): boolean {
  for (const ch of word) {
    const cp = ch.codePointAt(0)!;
    if (cp >= 0x0300 && cp <= 0x036f && !SAFE_COMBINING_MARKS.has(cp)) return true;
  }
  return false;
}

/* ---------------------------------------------------------------------------
 * MECHANISM 1: thousands-separator comma canonicalization
 * ------------------------------------------------------------------------- */

export interface NumSpan {
  kind: 'num';
  start: number;
  end: number;
  digits: string; // integer+optional-decimal digits with commas stripped
}

/** Standard Western thousands grouping: insert a comma every 3 digits from
 *  the right of the integer part. Pure, deterministic, total. */
export function abacusRegroup(integerPart: string): string {
  let out = '';
  let count = 0;
  for (let i = integerPart.length - 1; i >= 0; i--) {
    out = integerPart[i] + out;
    count++;
    if (count % 3 === 0 && i !== 0) out = ',' + out;
  }
  return out;
}

// 1-3 leading digits, then one-or-more ",ddd" groups, optional ".ddd" tail.
const NUM_RE = /\b\d{1,3}(?:,\d{3})+(?:\.\d+)?\b/g;

/** Find number literals that ALREADY use thousands-separator commas in the
 *  source, verified by exact re-derivation (regrouping the stripped digits
 *  must reproduce the matched substring verbatim) before ever being
 *  treated as a candidate. Never touches a bare digit run. */
export function abacusFindNumberSpans(text: string): NumSpan[] {
  const spans: NumSpan[] = [];
  let m: RegExpExecArray | null;
  NUM_RE.lastIndex = 0;
  while ((m = NUM_RE.exec(text))) {
    if (spans.length >= MAX_SPANS_EVALUATED) break;
    const matched = m[0];
    const digits = matched.replace(/,/g, '');
    const dot = digits.indexOf('.');
    const intPart = dot === -1 ? digits : digits.slice(0, dot);
    const fracPart = dot === -1 ? '' : digits.slice(dot);
    if (abacusRegroup(intPart) + fracPart === matched) {
      spans.push({ kind: 'num', start: m.index, end: m.index + matched.length, digits });
    }
  }
  return spans;
}

/* ---------------------------------------------------------------------------
 * MECHANISM 2: NFD-decomposed Unicode recomposition (clustered)
 * ------------------------------------------------------------------------- */

export interface UniSpan {
  kind: 'uni';
  start: number;
  end: number;
}

/** Find maximal clusters of Unicode-decomposed content: word-level runs
 *  whose NFC form differs from the source AND whose only combining marks
 *  are in SAFE_COMBINING_MARKS, merged with neighboring such words when the
 *  gap between them is small enough to be worth sharing one bracket pair.
 *  A word containing an UNSAFE combining mark is a hard cluster boundary —
 *  it is never absorbed into a span, keeping every emitted span's content
 *  within the documented, LLM-reliable decode rule. */
export function abacusFindUniClusters(text: string): UniSpan[] {
  const WORD_RE = /\S+/g;
  const affected: Array<[number, number]> = [];
  let m: RegExpExecArray | null;
  while ((m = WORD_RE.exec(text))) {
    const w = m[0];
    if (hasUnsafeCombiningMark(w)) continue; // hard boundary; never a candidate
    if (w.normalize('NFC') !== w) affected.push([m.index, m.index + w.length]);
  }
  if (affected.length === 0) return [];
  const clusters: Array<[number, number]> = [];
  let [cs, ce] = affected[0];
  for (let i = 1; i < affected.length; i++) {
    const [s, e] = affected[i];
    if (s - ce <= ABACUS_UNI_MERGE_GAP) {
      ce = e;
    } else {
      clusters.push([cs, ce]);
      [cs, ce] = [s, e];
    }
  }
  clusters.push([cs, ce]);
  return clusters.slice(0, MAX_SPANS_EVALUATED).map(([start, end]) => ({ kind: 'uni' as const, start, end }));
}

/* ---------------------------------------------------------------------------
 * Combined apply / restore / self-verifying transform
 * ------------------------------------------------------------------------- */

export type AbacusSpan = NumSpan | UniSpan;

export function abacusApplySpans(text: string, spans: AbacusSpan[]): string {
  let out = '';
  let last = 0;
  for (const s of spans) {
    out += text.slice(last, s.start);
    if (s.kind === 'num') {
      out += NUM_MARK + s.digits;
    } else {
      out += UNI_OPEN + text.slice(s.start, s.end).normalize('NFC') + UNI_CLOSE;
    }
    last = s.end;
  }
  out += text.slice(last);
  return out;
}

/** Reverse direction: EXACTLY what the decoder runs. Pure, total, single
 *  left-to-right pass; unmatched/dangling markers are left as-is rather
 *  than throwing. A bare LLM can execute this by hand exactly as specified
 *  in ABACUS_TAIL_INSTRUCTION below. */
export function abacusRestoreSpans(wire: string): string {
  let out = '';
  let i = 0;
  const n = wire.length;
  while (i < n) {
    if (wire[i] === NUM_MARK) {
      let j = i + 1;
      while (j < n && (/[0-9]/.test(wire[j]) || (wire[j] === '.' && /[0-9]/.test(wire[j + 1] ?? '')))) j++;
      const digits = wire.slice(i + 1, j);
      const dot = digits.indexOf('.');
      const intPart = dot === -1 ? digits : digits.slice(0, dot);
      const fracPart = dot === -1 ? '' : digits.slice(dot);
      out += abacusRegroup(intPart) + fracPart;
      i = j;
    } else if (wire[i] === UNI_OPEN) {
      const close = wire.indexOf(UNI_CLOSE, i + 1);
      if (close === -1) { out += wire[i]; i++; continue; }
      out += wire.slice(i + 1, close).normalize('NFD');
      i = close + 1;
    } else {
      out += wire[i];
      i++;
    }
  }
  return out;
}

/** Greedy, real-tokenizer-verified span acceptance: for each candidate span
 *  (in original-text order, numbers and Unicode clusters interleaved by
 *  position), tentatively add it to the accepted set and keep it ONLY if
 *  (a) round-tripping through abacusRestoreSpans reproduces the original
 *  text byte-for-byte AND (b) the whole-document token count (measured,
 *  never estimated) strictly decreases. Mirrors stentorTransform's
 *  discipline exactly. */
export function abacusTransform(
  text: string,
  enc: EncodingName,
): { candidate: string; spans: AbacusSpan[]; numSpans: number; uniSpans: number } {
  const allSpans: AbacusSpan[] = [...abacusFindNumberSpans(text), ...abacusFindUniClusters(text)].sort(
    (a, b) => a.start - b.start,
  );
  const accepted: AbacusSpan[] = [];
  let workingTok = countTokens(text, enc);
  for (const span of allSpans) {
    const candidateSpans = [...accepted, span].sort((a, b) => a.start - b.start);
    let overlap = false;
    for (let k = 0; k < candidateSpans.length - 1; k++) {
      if (candidateSpans[k].end > candidateSpans[k + 1].start) { overlap = true; break; }
    }
    if (overlap) continue;
    const candidate = abacusApplySpans(text, candidateSpans);
    if (abacusRestoreSpans(candidate) !== text) continue; // per-span exactness gate
    const candTok = countTokens(candidate, enc);
    if (candTok < workingTok) {
      accepted.push(span);
      workingTok = candTok;
    }
  }
  const sorted = accepted.sort((a, b) => a.start - b.start);
  const candidate = abacusApplySpans(text, sorted);
  return {
    candidate,
    spans: sorted,
    numSpans: sorted.filter((s) => s.kind === 'num').length,
    uniSpans: sorted.filter((s) => s.kind === 'uni').length,
  };
}

/* ---------------------------------------------------------------------------
 * ENCODE — self-verifying gate, then compose with DAEDALUS, then pick
 *    whichever of {plain DAEDALUS, ABACUS+DAEDALUS} costs fewer real BPE
 *    tokens end to end (wire + decoder prompt).
 * ------------------------------------------------------------------------- */

export interface AbacusResult extends DaedalusResult {
  codec2: 'abacus';
  abacusApplied: boolean;
  abacusNumSpans: number;
  abacusUniSpans: number;
}

export const ABACUS_SYSTEM_PROMPT = `ABACUS-M1 is a lossless numeric-grouping & Unicode-composition canonicalization pre-pass in front of DAEDALUS. No skills.md or external tool is required when the instructions in the same user message are followed.`;

const ABACUS_NUM_CLAUSE = `after each ${NUM_MARK} insert commas every 3 digits from the right (before any decimal point), delete ${NUM_MARK}`;
const ABACUS_UNI_CLAUSE = `inside each ${UNI_OPEN}...${UNI_CLOSE}, convert accented letters to Unicode NFD (base letter + combining accent mark), delete the brackets`;

/** Adaptive tail instruction: includes ONLY the restoration clause(s) for
 *  the mechanism(s) actually used in this wire. Since STENTOR/ORTHOS-style
 *  fixed contract text is a real per-message cost that must be amortized
 *  by the savings it unlocks, a document that only triggers mechanism (1)
 *  should never pay for mechanism (2)'s explanation, and vice versa.
 *  MEASURED (bench/tmp/abacus_overhead.ts): full tail (both clauses) 65
 *  tok, number-only 39 tok, unicode-only 42 tok. */
function abacusTailInstruction(hasNum: boolean, hasUni: boolean): string {
  const clauses = [hasNum && ABACUS_NUM_CLAUSE, hasUni && ABACUS_UNI_CLAUSE].filter(Boolean) as string[];
  const body = clauses.length > 0 ? `If ${ABACUS_MARK}: ${clauses.join('; ')}.` : '';
  return `Drop leading ${ABACUS_MARK}/${ABACUS_ESCAPE}, decode rest as above.${body ? ' ' + body : ''}`;
}

/** Cheaper tail instruction for the rare sentinel-collision escape path,
 *  where neither restoration step is ever needed. */
const ABACUS_TAIL_ESCAPE = `Drop the leading ${ABACUS_ESCAPE} above, then decode the rest as already instructed.`;

function baseDaedalus(text: string, enc: EncodingName, options: DaedalusOptions): DaedalusResult {
  return daedalusEncode(text, enc, options);
}

export function abacusEncode(text: string, enc: EncodingName = 'o200k_base', options: DaedalusOptions = {}): AbacusResult {
  const started = Date.now();
  const inTokens = countTokens(text, enc);

  const { candidate, spans, numSpans, uniSpans } = abacusTransform(text, enc);
  const applied0 = spans.length > 0 && candidate !== text;

  const plain = baseDaedalus(text, enc, options);
  const collision = plain.wire.length > 0 && (plain.wire[0] === ABACUS_MARK || plain.wire[0] === ABACUS_ESCAPE);

  // Common case (no collision, no beneficial span found): reuse DAEDALUS's
  // own wire/decoderPrompt/messageTokens verbatim. Zero bytes, zero tokens
  // of ABACUS overhead when ABACUS does not apply.
  let best: AbacusResult = {
    ...plain,
    codec2: 'abacus',
    abacusApplied: false,
    abacusNumSpans: 0,
    abacusUniSpans: 0,
    ms: Date.now() - started,
    notes: `abacus: not applied (${applied0 ? 'verified but not cheaper after contract overhead' : 'no beneficial number/unicode span found'}); ${plain.notes}`,
  };

  if (collision) {
    const escapedWire = ABACUS_ESCAPE + plain.wire;
    const escapedPrompt = `${ABACUS_ESCAPE}${plain.decoderPrompt}\n${ABACUS_TAIL_ESCAPE}`;
    best = {
      ...best,
      wire: escapedWire,
      decoderPrompt: escapedPrompt,
      messageTokens: countTokens(escapedPrompt, enc),
      contractTokens: countTokens(escapedPrompt, enc) - plain.outTokens,
    };
  }

  if (applied0) {
    const canon = baseDaedalus(candidate, enc, options);
    const abacusWire = ABACUS_MARK + canon.wire;
    const tail = abacusTailInstruction(numSpans > 0, uniSpans > 0);
    const abacusPrompt = `${ABACUS_MARK}${canon.decoderPrompt}\n${tail}`;
    const abacusMessageTokens = countTokens(abacusPrompt, enc);

    if (abacusMessageTokens < best.messageTokens) {
      const decodedBack = abacusDecode(abacusWire);
      if (decodedBack === text) {
        best = {
          ...canon,
          codec2: 'abacus',
          wire: abacusWire,
          decoded: decodedBack,
          exact: true,
          inTokens,
          messageTokens: abacusMessageTokens,
          contractTokens: abacusMessageTokens - canon.outTokens,
          decoderPrompt: abacusPrompt,
          abacusApplied: true,
          abacusNumSpans: numSpans,
          abacusUniSpans: uniSpans,
          ms: Date.now() - started,
          notes: `abacus: applied, ${numSpans} number span(s)/${uniSpans} unicode cluster(s) canonicalized, saved ${plain.messageTokens - abacusMessageTokens} tok over plain DAEDALUS; ${canon.notes}`,
        };
      }
    }
  }

  return best;
}

/* ---------------------------------------------------------------------------
 * DECODE — total dispatch on the first character; unambiguous by
 *    construction (see the collision branch in abacusEncode above, and
 *    bench/abacus-redteam.ts's totality/adversarial gates).
 * ------------------------------------------------------------------------- */

export function abacusDecode(wire: string): string {
  if (wire.length === 0) return wire;
  const first = wire[0];
  if (first === ABACUS_MARK) {
    const rest = wire.slice(1);
    const candidate = daedalusDecode(rest);
    return abacusRestoreSpans(candidate);
  }
  if (first === ABACUS_ESCAPE) {
    const rest = wire.slice(1);
    return daedalusDecode(rest);
  }
  return daedalusDecode(wire);
}

/** Given a COMPLETE abacus wire (as produced by abacusEncode: optionally
 *  prefixed with ABACUS_MARK or ABACUS_ESCAPE), returns the full,
 *  self-contained, single-message text a bare LLM needs. Mirrors the exact
 *  construction abacusEncode uses internally. */
export function abacusDecoderPrompt(wire: string): string {
  if (wire.length > 0 && (wire[0] === ABACUS_MARK || wire[0] === ABACUS_ESCAPE)) {
    const inner = wire.slice(1);
    const innerPrompt = inner.startsWith(CHIRON_START) && daedalusDecode(inner) !== inner
      ? daedalusDecoderPrompt(inner)
      : inner;
    const tail = wire[0] === ABACUS_MARK
      ? abacusTailInstruction(inner.includes(NUM_MARK), inner.includes(UNI_OPEN))
      : ABACUS_TAIL_ESCAPE;
    return `${wire[0]}${innerPrompt}\n${tail}`;
  }
  return wire.startsWith(CHIRON_START) && daedalusDecode(wire) !== wire ? daedalusDecoderPrompt(wire) : wire;
}
