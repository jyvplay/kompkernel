/**
 * src/lib/omega/krasis.ts
 * =============================================================================
 * KRASIS-⊕  (Greek κρᾶσις — "mixing, blending, contraction"; the classical-Greek
 * GRAMMAR term for merging characters/vowels into one, e.g. τὰ + ἀγαθά → τἀγαθά)
 * Unicode Canonical-Composition (NFD→NFC) Restoration Codec
 * (self-verifying · byte-exact · lossless · direct-reasoning · bare-LLM-readable)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE INVISIBLE, MEASURED BLIND SPOT
 * ─────────────────────────────────────────────────────────────────────────────
 * Two byte strings that RENDER IDENTICALLY can tokenize completely differently:
 * canonically DECOMPOSED text (Unicode NFD — base char + separate combining
 * marks, and Hangul syllables split into conjoining jamo) is dramatically more
 * expensive than the COMPOSED (NFC) form, and o200k_base does NOT normalize it
 * away (its normalizer is "none"). Measured on the live tokenizer
 * (o200k_base, `bench/krasis-redteam.ts`):
 *   Korean  "안녕하세요…"   NFC   7 tok  → NFD 101 tok   (~14×)
 *   Korean doc                 NFC  18 tok  → NFD 212 tok   (~12×)
 *   Vietnamese "Tiếng Việt…"   NFC  22 tok  → NFD  54 tok   (~2.5×)
 *   French/Portuguese/…        Δ 6–12 tok per short phrase
 *
 * This is a genuine HIDDEN tax on real users:
 *   - macOS/APFS stores filenames created in Finder as NFD, in the shell as NFC —
 *     "the bytes are different even though they look the same" (HN 35336510).
 *   - Cross-platform file exchange, borg/rsync, linguistic corpora, some IMEs and
 *     PDF extractors all emit NFD. The user cannot SEE it; the tokenizer bills it.
 *   - Korean-tokenizer study (2026): held-out NFD/NFC token ratio ≈ 6.98× for BPE;
 *     o200k / GLM / Meta tokenizers apply no normalizer at all.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE RULE (no dictionary — a STANDARD Unicode algorithm the model knows)
 * ─────────────────────────────────────────────────────────────────────────────
 * NFC (canonical composition) is the exact inverse of NFD on canonically-
 * decomposed input: for such x, NFD(NFC(x)) = x (verified over the whole test
 * battery). The wire stores the COMPOSED (NFC) form — shorter AND more readable —
 * and the decoder re-applies NFD, restoring the exact original bytes.
 *
 * MECHANISM (LYSIS/VEXILLA-style: rule + self-verify, never a claim):
 *   1. Locate the characters that carry a canonical decomposition (combining
 *      marks \p{M}, plus their base char; conjoining Hangul jamo).
 *   2. Form the largest region that survives the round trip and wrap its NFC form
 *      in ‹ … › (both sentinels are 1 token in o200k_base and unused elsewhere).
 *   3. Decode = apply NFD to each region body.
 *   4. SELF-VERIFY GATE: emit a wire ONLY IF krasisDecode(wire) === input byte
 *      for byte AND the contract-inclusive message is strictly cheaper; else
 *      total identity. Savings are therefore never overstated, and already-NFC
 *      text (the common case) is returned untouched.
 *   5. BARE-LLM CONTRACT: a ~10-token inline header (emitted once) states the
 *      NFD rule; no system prompt, no skills.md, no tools.
 *
 * GROUNDING (real, published, ≤ 50 years, NEW this turn):
 *   - Unicode Standard Annex #15 (Unicode Normalization Forms), UAX #15 §1.3
 *     canonical composition/decomposition; Hangul syllable algorithm (§3.12 core).
 *   - nicezic/Korean-tokenizer (2026): 6.98× NFD/NFC BPE ratio; per-tokenizer
 *     normalizer table (o200k = none). HN 35336510; borgbackup #4771 (macOS NFD).
 * =============================================================================
 */

import { countTokens, type EncodingName } from './bpe';

/* --------------------------------------------------------------------------- */
/* 0. SENTINELS — 1 token each in o200k_base; DISJOINT from every other codec's  */
/*    marks (STOICHEIA † ‡ ※ ¤ ; VEXILLA ¶ § ¬ ¦ ° ± ; LYSIS ª º « »).           */
/* --------------------------------------------------------------------------- */

export const KRASIS_MARK = '\u00A8';    // ¨  "KRASIS applied"
export const KRASIS_ESCAPE = '\u00B8';  // ¸  "escaped, not applied"
export const KRASIS_OPEN = '\u2039';    // ‹  region open
export const KRASIS_CLOSE = '\u203A';   // ›  region close

const RESERVED = new Set<string>([KRASIS_MARK, KRASIS_ESCAPE, KRASIS_OPEN, KRASIS_CLOSE]);

export const KRASIS_SYSTEM_PROMPT =
  'KRASIS-⊕: byte-exact lossless decompressor. Drop a leading ¨. For each region ' +
  '‹…› apply Unicode NFD (canonical decomposition) to the region body — split each ' +
  'precomposed accented letter into base + combining marks, and each Hangul syllable ' +
  'into conjoining jamo. Text outside regions, and pure-ASCII, is literal and unchanged.';

/* --------------------------------------------------------------------------- */
/* 1. AFFECTED-INDEX DETECTION (candidate discovery; the gate guarantees safety) */
/* --------------------------------------------------------------------------- */

const COMBINING = /\p{M}/u; // Mn/Mc/Me — nonspacing/spacing/enclosing marks

// Conjoining Hangul jamo blocks (NFD of a Hangul syllable produces these).
function isJamo(cp: number): boolean {
  return (cp >= 0x1100 && cp <= 0x11FF) || (cp >= 0xA960 && cp <= 0xA97F) || (cp >= 0xD7B0 && cp <= 0xD7FF);
}

/** Boolean map: index participates in a canonical decomposition we can compose. */
function affectedMap(text: string): boolean[] {
  const n = text.length;
  const aff = new Array<boolean>(n).fill(false);
  for (let i = 0; i < n; i++) {
    const ch = text[i];
    const cp = text.codePointAt(i)!;
    if (COMBINING.test(ch)) {
      aff[i] = true;
      if (i > 0) aff[i - 1] = true; // the base the mark attaches to (may be ASCII 'e')
      // if the base is the low half of a surrogate pair, include the high half too
      if (i > 1) { const prev = text.codePointAt(i - 2); if (prev !== undefined && prev > 0xFFFF) aff[i - 2] = true; }
    } else if (isJamo(cp)) {
      aff[i] = true;
    }
  }
  return aff;
}

/* --------------------------------------------------------------------------- */
/* 2. REGION ASSEMBLY  (prefer the largest round-tripping region)               */
/* --------------------------------------------------------------------------- */

interface Region { start: number; end: number; }

function composeRegion(text: string, r: Region): string { return text.slice(r.start, r.end).normalize('NFC'); }

/** True iff wrapping this region is byte-exact (NFD of its NFC body === original). */
function roundTrips(text: string, r: Region): boolean {
  const body = composeRegion(text, r);
  // a body must not contain a structural sentinel (would corrupt parsing)
  for (const ch of body) if (RESERVED.has(ch)) return false;
  return body.normalize('NFD') === text.slice(r.start, r.end);
}

function maximalRuns(aff: boolean[]): Region[] {
  const runs: Region[] = [];
  let i = 0;
  while (i < aff.length) {
    if (!aff[i]) { i++; continue; }
    let j = i;
    while (j < aff.length && aff[j]) j++;
    runs.push({ start: i, end: j });
    i = j;
  }
  return runs;
}

function transform(text: string, enc: EncodingName): { candidate: string; regions: Region[] } {
  const aff = affectedMap(text);
  const first = aff.indexOf(true);
  if (first === -1) return { candidate: text, regions: [] };
  const last = aff.lastIndexOf(true);
  const baseTok = countTokens(text, enc);

  // Attempt 1: ONE big region [first, last] — captures uniformly-NFD docs and
  // accented prose with ASCII words interleaved in a single marker pair.
  const big: Region = { start: first, end: last + 1 };
  if (roundTrips(text, big)) {
    const cand = applyRegions(text, [big]);
    if (countTokens(cand, enc) < baseTok) return { candidate: cand, regions: [big] };
  }

  // Attempt 2: per-maximal-run regions (mixed precomposed + decomposed input),
  // each gated on round trip and real token reduction.
  const accepted: Region[] = [];
  let working = baseTok;
  for (const run of maximalRuns(aff)) {
    if (!roundTrips(text, run)) continue;
    const trial = [...accepted, run];
    const cand = applyRegions(text, trial);
    const t = countTokens(cand, enc);
    if (t < working) { accepted.push(run); working = t; }
  }
  if (accepted.length === 0) return { candidate: text, regions: [] };
  return { candidate: applyRegions(text, accepted), regions: accepted };
}

function applyRegions(text: string, regions: Region[]): string {
  const sorted = [...regions].sort((a, b) => a.start - b.start);
  let out = '';
  let cursor = 0;
  for (const r of sorted) {
    out += text.slice(cursor, r.start);
    out += KRASIS_OPEN + composeRegion(text, r) + KRASIS_CLOSE;
    cursor = r.end;
  }
  out += text.slice(cursor);
  return out;
}

/* --------------------------------------------------------------------------- */
/* 3. RESTORE (decode). Total; NFD applied to region bodies only.               */
/* --------------------------------------------------------------------------- */

export function restoreWireBody(wire: string): string {
  let out = '';
  let i = 0;
  const n = wire.length;
  while (i < n) {
    const ch = wire[i];
    if (ch === KRASIS_OPEN) {
      const close = wire.indexOf(KRASIS_CLOSE, i + 1);
      if (close === -1) { out += ch; i++; continue; }
      out += wire.slice(i + 1, close).normalize('NFD');
      i = close + 1; continue;
    }
    out += ch; i++;
  }
  return out;
}

/* --------------------------------------------------------------------------- */
/* 4. INLINE BARE-LLM CONTRACT (~10 tok, emitted once)                          */
/* --------------------------------------------------------------------------- */

function contract(): string {
  return `${KRASIS_OPEN}..${KRASIS_CLOSE}=apply Unicode NFD (decompose)`;
}

/* --------------------------------------------------------------------------- */
/* 5. ENCODE / DECODE                                                           */
/* --------------------------------------------------------------------------- */

export interface KrasisResult {
  codec: 'krasis';
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;        // wire body only
  messageTokens: number;    // inline contract + wire — honest single-chat cost
  contractTokens: number;
  savingsPct: number;
  applied: boolean;
  regions: number;
  composedChars: number;    // audit: code points removed by composition
  decoderPrompt: string;
  notes: string;
  ms: number;
}

export function krasisEncode(text: string, enc: EncodingName = 'o200k_base'): KrasisResult {
  const started = Date.now();
  const inTokens = countTokens(text, enc);

  const identity = (reason: string): KrasisResult => {
    const collision = text.length > 0 && (text[0] === KRASIS_MARK || text[0] === KRASIS_ESCAPE);
    const wire = collision ? KRASIS_ESCAPE + text : text;
    const messageTokens = collision ? countTokens(wire, enc) : inTokens;
    return {
      codec: 'krasis', wire, decoded: text, exact: true, inTokens,
      outTokens: messageTokens, messageTokens, contractTokens: 0, savingsPct: 0,
      applied: false, regions: 0, composedChars: 0, decoderPrompt: '',
      notes: `krasis: not applied (${reason})`, ms: Date.now() - started,
    };
  };

  if (text.length === 0) return identity('empty input');

  const { candidate, regions } = transform(text, enc);
  if (regions.length === 0 || candidate === text) return identity('no composable NFD region found');

  const wire = KRASIS_MARK + candidate;
  if (krasisDecode(wire) !== text) return identity('region verification failed — passthrough for exactness');

  const c = contract();
  const message = c + '\n' + wire;
  const messageTokens = countTokens(message, enc);
  if (messageTokens >= inTokens) return identity('verified but inline contract overhead not amortized on this input');

  // exact code-point delta removed by composition (audit only)
  let composedChars = 0;
  for (const r of regions) composedChars += [...text.slice(r.start, r.end)].length - [...composeRegion(text, r)].length;

  return {
    codec: 'krasis', wire, decoded: text, exact: true, inTokens,
    outTokens: countTokens(wire, enc), messageTokens,
    contractTokens: countTokens(c + '\n', enc),
    savingsPct: inTokens > 0 ? ((inTokens - messageTokens) / inTokens) * 100 : 0,
    applied: true, regions: regions.length, composedChars, decoderPrompt: c,
    notes: `krasis: applied, ${regions.length} NFD region(s), ${composedChars} combining code point(s) composed; message ${messageTokens} vs raw ${inTokens} tok (saved ${inTokens - messageTokens})`,
    ms: Date.now() - started,
  };
}

/** Total decoder. Only a MARK-prefixed wire is transformed; ESCAPE is stripped. */
export function krasisDecode(wire: string): string {
  if (wire.length === 0) return wire;
  if (wire[0] === KRASIS_MARK) return restoreWireBody(wire.slice(1));
  if (wire[0] === KRASIS_ESCAPE) return wire.slice(1);
  return wire;
}

export function krasisDecoderPrompt(wire: string): string {
  if (wire.length === 0 || wire[0] !== KRASIS_MARK || !wire.includes(KRASIS_OPEN)) return '';
  return contract();
}
