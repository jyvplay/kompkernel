/**
 * src/lib/omega/stoicheia.ts
 * =============================================================================
 * STOICHEIA-Σ (στοιχεῖα — "elements" / "letters of the alphabet")
 * Universal Unicode Mathematical-Alphanumeric & Styled-Script Restoration Codec
 * (self-verifying, byte-exact, bare-LLM-readable)
 *
 * WHY THIS EXISTS — THE MEASURED BLIND SPOT (o200k_base, live tokenizer,
 * `bench/stoicheia-redteam.ts`):
 * KALLOS restores exactly FOUR of the fourteen Unicode Mathematical
 * Alphanumeric alphabets (Bold, Italic, Monospace, Sans-Serif). Its own
 * docstring names its real-world target as "stylized social media, developer
 * profiles, and AI system prompt templates" — yet the single most common
 * output of the public "fancy text" generators those users rely on is
 * DOUBLE-STRUCK (𝔻𝕠𝕦𝕓𝕝𝕖 𝕊𝕥𝕣𝕦𝕔𝕜), SCRIPT (𝒮𝒸𝓇𝒾𝓅𝓉), FRAKTUR (𝔉𝔯𝔞𝔨𝔱𝔲𝔯),
 * BOLD-ITALIC (𝑩𝒐𝒍𝒅), BOLD-SCRIPT (𝓑𝓸𝓵𝓭), and the three SANS variants —
 * none of which KALLOS touches. Measured this session, a 6-word double-struck
 * heading costs 50 tokens (vs 4 ASCII); KALLOS leaves it at 50. This codec
 * takes it to 7. Independently, math/technical documents copy-pasted from PDFs
 * and Wikipedia contain the "letterlike-symbol" double-struck / Fraktur / script
 * glyphs (ℝ ℂ ℕ ℤ ℚ ℍ 𝔽 ℬ ℱ ℋ …) that live OUTSIDE the contiguous plane
 * blocks and that no codec in this repository currently recovers.
 *
 * GROUNDING (real, published, within the last 50 years):
 *  - Unicode Standard, "Mathematical Alphanumeric Symbols" (U+1D400–U+1D7FF)
 *    and "Letterlike Symbols" (U+2100–U+214F): the exact plane layout and the
 *    reserved-slot exceptions (ℝ ℂ ℕ ℙ ℚ ℤ ℍ for double-struck, etc.).
 *  - Unicode Normalization Forms, UAX #15 (NFKC): every glyph this codec maps
 *    is a *compatibility* decomposition to its ASCII base — used here as the
 *    machine-checked ground truth for the forward table (726/726 verified).
 *  - SilverSpeak (arXiv:2406.11239) & the confusable/"denial-of-spend" analyses
 *    (2026): homoglyph / styled substitution inflates BPE token cost up to 5.2×
 *    with no tokenizer-level defense — this codec is the *compressing* defense.
 *
 * MECHANISM (a faithful generalization of the KALLOS construction):
 *  1. Scan for maximal runs of styled characters drawn from ONE family.
 *  2. Replace each run with `† <familyCode> <asciiText> ‡` where † and ‡ are
 *     each exactly 1 token in o200k_base and familyCode is a single ASCII char.
 *  3. Restore by re-applying the exact per-family codepoint table (including the
 *     Letterlike-Symbol holes) to every ASCII character inside a span.
 *  4. SELF-VERIFICATION GATE: a candidate wire is emitted ONLY IF
 *     stoicheiaDecode(wire) === input byte-for-byte AND the message (inline
 *     contract + wire) is strictly cheaper than the raw input. Otherwise the
 *     codec is a total identity pass-through. Exactness is guaranteed by the
 *     gate, not assumed.
 *  5. BARE-LLM CONTRACT: an inline, self-describing header (only for the
 *     families actually used) lets a fresh GPT-4o / Claude / Gemini / DeepSeek
 *     chat reconstruct the exact styled Unicode with NO system prompt, NO
 *     skills.md, NO tools — a single chat input is sufficient.
 * =============================================================================
 */

import { countTokens, type EncodingName } from './bpe';

/* ---------------------------------------------------------------------------
 * 0. WIRE SENTINELS  (each measured = 1 token in o200k_base)
 * --------------------------------------------------------------------------- */

export const STOICHEIA_OPEN = '\u2020';   // † DAGGER
export const STOICHEIA_CLOSE = '\u2021';  // ‡ DOUBLE DAGGER
export const STOICHEIA_MARK = '\u203B';   // ※ REFERENCE MARK — "STOICHEIA applied" (1 token)
export const STOICHEIA_ESCAPE = '\u00A4';  // ¤ CURRENCY SIGN — "escaped, not applied" (1 token)

export const STOICHEIA_SYSTEM_PROMPT =
  'STOICHEIA-Σ: You are a byte-exact lossless decompressor. For every span written ' +
  '†X…‡, render the enclosed ASCII letters/digits as Unicode Mathematical Alphanumeric ' +
  'glyphs of style X and delete the two daggers; all other characters are literal.';

/* ---------------------------------------------------------------------------
 * 1. FAMILY TABLE  (machine-verified against NFKC: bench/stoicheia-redteam.ts)
 * --------------------------------------------------------------------------- */

interface Family {
  code: string;   // single ASCII selector char, unique
  name: string;   // human/contract label
  U: number;      // base codepoint for 'A'
  L: number;      // base codepoint for 'a'
  D?: number;     // base codepoint for '0' (undefined if the family has no styled digits)
}

// Order matters only for the deterministic contract listing.
export const STOICHEIA_FAMILIES: Record<string, Family> = {
  bold:         { code: 'b', name: 'bold',              U: 0x1D400, L: 0x1D41A, D: 0x1D7CE },
  italic:       { code: 't', name: 'italic',            U: 0x1D434, L: 0x1D44E },
  boldItalic:   { code: 'x', name: 'bold-italic',       U: 0x1D468, L: 0x1D482 },
  script:       { code: 'c', name: 'script',            U: 0x1D49C, L: 0x1D4B6 },
  boldScript:   { code: 'C', name: 'bold-script',       U: 0x1D4D0, L: 0x1D4EA },
  fraktur:      { code: 'f', name: 'fraktur',           U: 0x1D504, L: 0x1D51E },
  doubleStruck: { code: 'd', name: 'double-struck',     U: 0x1D538, L: 0x1D552, D: 0x1D7D8 },
  boldFraktur:  { code: 'F', name: 'bold-fraktur',      U: 0x1D56C, L: 0x1D586 },
  sans:         { code: 's', name: 'sans-serif',        U: 0x1D5A0, L: 0x1D5BA, D: 0x1D7E2 },
  sansBold:     { code: 'S', name: 'sans-bold',         U: 0x1D5D4, L: 0x1D5EE, D: 0x1D7EC },
  sansItalic:   { code: 'z', name: 'sans-italic',       U: 0x1D608, L: 0x1D622 },
  sansBoldItal: { code: 'Z', name: 'sans-bold-italic',  U: 0x1D63C, L: 0x1D656 },
  mono:         { code: 'm', name: 'monospace',         U: 0x1D670, L: 0x1D68A, D: 0x1D7F6 },
};

// Letterlike-Symbol holes: family -> ascii char -> the actual assigned codepoint.
const HOLES: Record<string, Record<string, number>> = {
  italic:       { h: 0x210E },
  script:       { B: 0x212C, E: 0x2130, F: 0x2131, H: 0x210B, I: 0x2110, L: 0x2112, M: 0x2133, R: 0x211B, e: 0x212F, g: 0x210A, o: 0x2134 },
  fraktur:      { C: 0x212D, H: 0x210C, I: 0x2111, R: 0x211C, Z: 0x2128 },
  doubleStruck: { C: 0x2102, H: 0x210D, N: 0x2115, P: 0x2119, Q: 0x211A, R: 0x211D, Z: 0x2124 },
};

const CODE_TO_FAMILY = new Map<string, string>(
  Object.entries(STOICHEIA_FAMILIES).map(([k, v]) => [v.code, k]),
);

/** Reverse map (styled codepoint -> { family, ascii }), built once from the table. */
const CLASSIFY = new Map<number, { family: string; ascii: string }>();
(function buildClassify() {
  const push = (fam: string, ch: string) => {
    const cp = styledCodepoint(fam, ch);
    if (cp >= 0 && !CLASSIFY.has(cp)) CLASSIFY.set(cp, { family: fam, ascii: ch });
  };
  for (const fam of Object.keys(STOICHEIA_FAMILIES)) {
    for (let c = 65; c <= 90; c++) push(fam, String.fromCharCode(c));
    for (let c = 97; c <= 122; c++) push(fam, String.fromCharCode(c));
    if (STOICHEIA_FAMILIES[fam].D !== undefined) for (let c = 48; c <= 57; c++) push(fam, String.fromCharCode(c));
  }
})();

/** ascii char + family -> exact styled codepoint (holes honored). -1 if unmappable. */
export function styledCodepoint(family: string, ch: string): number {
  const f = STOICHEIA_FAMILIES[family];
  if (!f) return -1;
  const hole = HOLES[family]?.[ch];
  if (hole !== undefined) return hole;
  const c = ch.charCodeAt(0);
  if (c >= 65 && c <= 90) return f.U + (c - 65);
  if (c >= 97 && c <= 122) return f.L + (c - 97);
  if (c >= 48 && c <= 57 && f.D !== undefined) return f.D + (c - 48);
  return -1;
}

/* ---------------------------------------------------------------------------
 * 2. SPAN DISCOVERY / APPLY / RESTORE  (total functions, never throw)
 * --------------------------------------------------------------------------- */

export interface StoicheiaSpan {
  start: number;   // JS string index (UTF-16)
  end: number;
  family: string;
  asciiText: string;
}

export function findStoicheiaSpans(text: string): StoicheiaSpan[] {
  const spans: StoicheiaSpan[] = [];
  let i = 0;
  const n = text.length;
  while (i < n) {
    const cp0 = text.codePointAt(i);
    if (cp0 === undefined) break;
    const c0 = CLASSIFY.get(cp0);
    if (!c0) { i += cp0 > 0xFFFF ? 2 : 1; continue; }
    const family = c0.family;
    const start = i;
    let asciiText = '';
    let j = i;
    while (j < n) {
      const cp = text.codePointAt(j);
      if (cp === undefined) break;
      const c = CLASSIFY.get(cp);
      if (!c || c.family !== family) break;
      asciiText += c.ascii;
      j += cp > 0xFFFF ? 2 : 1;
    }
    spans.push({ start, end: j, family, asciiText });
    i = j;
  }
  return spans;
}

export function stoicheiaApplySpans(text: string, spans: StoicheiaSpan[]): string {
  let out = '';
  let cursor = 0;
  for (const s of spans) {
    out += text.slice(cursor, s.start);
    out += STOICHEIA_OPEN + STOICHEIA_FAMILIES[s.family].code + s.asciiText + STOICHEIA_CLOSE;
    cursor = s.end;
  }
  out += text.slice(cursor);
  return out;
}

/** Total inverse. A `†` that is not a well-formed span is emitted verbatim. */
export function stoicheiaRestoreSpans(wire: string): string {
  let out = '';
  let i = 0;
  const n = wire.length;
  while (i < n) {
    const ch = wire[i];
    if (ch === STOICHEIA_OPEN) {
      const code = wire[i + 1];
      const family = code !== undefined ? CODE_TO_FAMILY.get(code) : undefined;
      const close = wire.indexOf(STOICHEIA_CLOSE, i + 2);
      if (!family || close === -1) { out += ch; i++; continue; }
      const inner = wire.slice(i + 2, close);
      // A well-formed span body is pure [A-Za-z0-9] and every char must map.
      let ok = inner.length > 0;
      let rebuilt = '';
      for (const c of inner) {
        const cp = styledCodepoint(family, c);
        if (cp < 0) { ok = false; break; }
        rebuilt += String.fromCodePoint(cp);
      }
      if (!ok) { out += ch; i++; continue; }
      out += rebuilt;
      i = close + 1;
    } else {
      out += ch;
      i++;
    }
  }
  return out;
}

/* ---------------------------------------------------------------------------
 * 3. GREEDY, REAL-TOKENIZER-VERIFIED SPAN ACCEPTANCE
 * --------------------------------------------------------------------------- */

function transform(text: string, enc: EncodingName): { candidate: string; spans: StoicheiaSpan[] } {
  const all = findStoicheiaSpans(text);
  if (all.length === 0) return { candidate: text, spans: [] };

  // Fast path: apply everything; keep if it round-trips and is cheaper.
  const full = stoicheiaApplySpans(text, all);
  if (stoicheiaRestoreSpans(full) === text && countTokens(full, enc) < countTokens(text, enc)) {
    return { candidate: full, spans: all };
  }

  // Otherwise accept spans greedily only while they keep improving the count.
  const accepted: StoicheiaSpan[] = [];
  let workingTok = countTokens(text, enc);
  for (const span of all) {
    const trial = [...accepted, span].sort((a, b) => a.start - b.start);
    const cand = stoicheiaApplySpans(text, trial);
    if (stoicheiaRestoreSpans(cand) !== text) continue;
    const t = countTokens(cand, enc);
    if (t < workingTok) { accepted.push(span); workingTok = t; }
  }
  return { candidate: stoicheiaApplySpans(text, accepted.sort((a, b) => a.start - b.start)), spans: accepted };
}

/* ---------------------------------------------------------------------------
 * 4. INLINE BARE-LLM CONTRACT  (only lists the families actually present)
 * --------------------------------------------------------------------------- */

function contractFor(spans: StoicheiaSpan[]): string {
  const used = new Set(spans.map((s) => s.family));
  const clauses = Object.keys(STOICHEIA_FAMILIES)
    .filter((f) => used.has(f))
    .map((f) => `${STOICHEIA_FAMILIES[f].code}=${STOICHEIA_FAMILIES[f].name}`);
  return `Σ decode: drop leading ${STOICHEIA_MARK}; each ${STOICHEIA_OPEN}X…${STOICHEIA_CLOSE} → render inner ASCII as ` +
    `Unicode math style X and delete the daggers (${clauses.join(', ')}); all else literal.`;
}

/* ---------------------------------------------------------------------------
 * 5. ENCODE / DECODE
 * --------------------------------------------------------------------------- */

export interface StoicheiaResult {
  codec: 'stoicheia';
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;        // tokens of the wire body only
  messageTokens: number;    // tokens of (inline contract + wire) — the honest single-chat cost
  contractTokens: number;
  savingsPct: number;       // vs inTokens, using messageTokens
  applied: boolean;
  spans: number;
  familyCounts: Record<string, number>;
  decoderPrompt: string;
  notes: string;
  ms: number;
}

export function stoicheiaEncode(text: string, enc: EncodingName = 'o200k_base'): StoicheiaResult {
  const started = Date.now();
  const inTokens = countTokens(text, enc);

  // Non-applied path. A top-level ESCAPE guards the rare case where the raw
  // input itself begins with a reserved MARK/ESCAPE sentinel, so that
  // stoicheiaDecode is a true left-inverse on every input.
  const identity = (reason: string): StoicheiaResult => {
    const collision = text.length > 0 && (text[0] === STOICHEIA_MARK || text[0] === STOICHEIA_ESCAPE);
    const wire = collision ? STOICHEIA_ESCAPE + text : text;
    const messageTokens = collision ? countTokens(wire, enc) : inTokens;
    return {
      codec: 'stoicheia',
      wire,
      decoded: text,
      exact: true,
      inTokens,
      outTokens: messageTokens,
      messageTokens,
      contractTokens: 0,
      savingsPct: 0,
      applied: false,
      spans: 0,
      familyCounts: {},
      decoderPrompt: '',
      notes: `stoicheia: not applied (${reason})`,
      ms: Date.now() - started,
    };
  };

  if (text.length === 0) return identity('empty input');

  const { candidate, spans } = transform(text, enc);
  if (spans.length === 0 || candidate === text) {
    return identity('no styled Unicode alphabet run found');
  }

  // Applied wire is MARK + candidate; decode only ever transforms marked wires.
  const wire = STOICHEIA_MARK + candidate;
  if (stoicheiaDecode(wire) !== text) return identity('span verification failed — passthrough for exactness');

  const contract = contractFor(spans);
  const message = contract + '\n' + wire;
  const messageTokens = countTokens(message, enc);
  const wireTokens = countTokens(wire, enc);
  const contractTokens = countTokens(contract + '\n', enc);

  // Honest gate: only ship if the FULL single-chat message beats the raw input.
  if (messageTokens >= inTokens) {
    return identity('verified but inline contract overhead not amortized on this input');
  }

  const familyCounts: Record<string, number> = {};
  for (const s of spans) familyCounts[s.family] = (familyCounts[s.family] ?? 0) + 1;
  const summary = Object.entries(familyCounts).map(([f, c]) => `${c} ${STOICHEIA_FAMILIES[f].name}`).join(', ');

  return {
    codec: 'stoicheia',
    wire,
    decoded: text,
    exact: true,
    inTokens,
    outTokens: wireTokens,
    messageTokens,
    contractTokens,
    savingsPct: inTokens > 0 ? ((inTokens - messageTokens) / inTokens) * 100 : 0,
    applied: true,
    spans: spans.length,
    familyCounts,
    decoderPrompt: contract,
    notes: `stoicheia: applied, ${spans.length} styled span(s) (${summary}) restored; message ${messageTokens} vs raw ${inTokens} tok (saved ${inTokens - messageTokens})`,
    ms: Date.now() - started,
  };
}

/**
 * Total decoder used by the registry / router. Only a wire the encoder marked
 * with STOICHEIA_MARK is transformed; a leading ESCAPE is stripped; everything
 * else (including raw text containing literal daggers) is returned verbatim.
 */
export function stoicheiaDecode(wire: string): string {
  if (wire.length === 0) return wire;
  if (wire[0] === STOICHEIA_MARK) return stoicheiaRestoreSpans(wire.slice(1));
  if (wire[0] === STOICHEIA_ESCAPE) return wire.slice(1);
  return wire;
}

export function stoicheiaDecoderPrompt(wire: string): string {
  const spans: StoicheiaSpan[] = [];
  let i = wire.length > 0 && wire[0] === STOICHEIA_MARK ? 1 : 0;
  while (i < wire.length) {
    if (wire[i] === STOICHEIA_OPEN) {
      const code = wire[i + 1];
      const fam = code !== undefined ? CODE_TO_FAMILY.get(code) : undefined;
      const close = wire.indexOf(STOICHEIA_CLOSE, i + 2);
      if (fam && close !== -1) { spans.push({ start: i, end: close + 1, family: fam, asciiText: '' }); i = close + 1; continue; }
    }
    i++;
  }
  return spans.length > 0 ? contractFor(spans) : '';
}
