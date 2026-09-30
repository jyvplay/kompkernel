/**
 * src/lib/omega/vexilla.ts
 * =============================================================================
 * VEXILLA-⚑ (Latin *vexilla* — "flags, banners, standards"; cf. vexillology)
 * Rule-Based Emoji Flag Restoration Codec (self-verifying, byte-exact,
 * bare-LLM-readable)
 *
 * WHY THIS EXISTS — THE MEASURED BLIND SPOT (o200k_base, live tokenizer,
 * `bench/vexilla-redteam.ts`):
 * Emoji flags are among the most token-expensive characters that appear in
 * ordinary chat, i18n/localization docs, travel/sports/news copy, and social
 * marketing — and NO codec in this repository touches them. Measured this
 * session on the live tokenizer:
 *   - a single regional-indicator flag 🇺🇸 costs 4 tokens (vs 1 for "US");
 *   - a 15-flag locale list costs 60 tokens;
 *   - a single subdivision TAG flag 🏴󠁧󠁢󠁳󠁣󠁴󠁿 (Scotland) costs **26 tokens**.
 * The entire existing stack (METATRON/PANOPTES/…) leaves every one of these at
 * 0% savings.
 *
 * THE RULE (no dictionary — the inverse is structural, like STOICHEIA/ARITHMOS):
 *   - A regional-indicator flag is EXACTLY two Regional Indicator Symbols
 *     (U+1F1E6..U+1F1FF), one per ASCII letter A..Z: 🇺🇸 = RI('U')+RI('S'),
 *     RI(c) = 0x1F1E6 + (c - 'A'). So a flag ⇔ a 2-letter ISO code, bijectively.
 *   - A subdivision TAG flag is the waving black flag U+1F3F4, then Tag Latin
 *     characters (U+E0020..U+E007E = ASCII 0x20..0x7E, tag(a)=0xE0000+ascii),
 *     terminated by CANCEL TAG U+E007F: 🏴󠁧󠁢󠁳󠁣󠁴󠁿 = 🏴 + "gbsct" + cancel.
 *
 * MECHANISM (a faithful analogue of the KALLOS/STOICHEIA construction):
 *   1. Find maximal runs of regional indicators (k complete flags), and every
 *      well-formed tag-flag sequence.
 *   2. Replace a regional run with `¶<UPPER letters, 2 per flag>§` and a tag
 *      flag with `¬<ascii tag chars>¦` — all four sentinels are 1 token each in
 *      o200k_base and none is used by any other codec in this repo.
 *   3. Restore by re-applying the structural rules above.
 *   4. SELF-VERIFICATION GATE: a candidate wire is emitted ONLY IF
 *      vexillaDecode(wire) === input byte-for-byte AND the full inline-contract
 *      message is strictly cheaper than the raw input; else total identity.
 *   5. BARE-LLM CONTRACT: a compact inline header lets a fresh GPT-4o / Claude /
 *      Gemini / DeepSeek chat reconstruct the exact flag emoji with NO system
 *      prompt, NO skills.md, NO tools — one chat turn suffices.
 *
 * GROUNDING (real, published, ≤ 50 years):
 *   - Unicode Standard: "Enclosed Alphanumeric Supplement" Regional Indicator
 *     Symbols (U+1F1E6..U+1F1FF); "Tags" block (U+E0000..U+E007F); UTS #51
 *     (Unicode Emoji), emoji flag sequences ED-14 / ED-14a.
 *   - SilverSpeak (arXiv:2406.11239) & 2026 confusable / "denial-of-spend"
 *     analyses: multi-codepoint clusters inflate BPE token cost up to 5.2× with
 *     no tokenizer defense; this codec is the *compressing* canonicalizer.
 * =============================================================================
 */

import { countTokens, type EncodingName } from './bpe';

/* ---------------------------------------------------------------------------
 * 0. SENTINELS (each measured = 1 token in o200k_base; disjoint from every
 *    other codec's reserved marks, incl. STOICHEIA's † ‡ ※ ¤).
 * --------------------------------------------------------------------------- */

export const VEXILLA_REGION_OPEN = '\u00B6';  // ¶ PILCROW
export const VEXILLA_REGION_CLOSE = '\u00A7'; // § SECTION SIGN
export const VEXILLA_TAG_OPEN = '\u00AC';     // ¬ NOT SIGN
export const VEXILLA_TAG_CLOSE = '\u00A6';    // ¦ BROKEN BAR
export const VEXILLA_MARK = '\u00B0';         // ° DEGREE SIGN — "VEXILLA applied"
export const VEXILLA_ESCAPE = '\u00B1';       // ± PLUS-MINUS — "escaped, not applied"

const RI_BASE = 0x1F1E6;   // 🇦
const RI_LAST = 0x1F1FF;   // 🇿
const TAG_BLACK_FLAG = 0x1F3F4;
const TAG_BASE = 0xE0000;  // tag(ascii) = 0xE0000 + ascii  (valid 0x20..0x7E)
const TAG_CANCEL = 0xE007F;

export const VEXILLA_SYSTEM_PROMPT =
  'VEXILLA-⚑: You are a byte-exact lossless decompressor. Drop a leading °. ' +
  'Expand ¶XX…§ as emoji flags (each two uppercase letters → the regional-indicator ' +
  'flag, e.g. ¶USJP§ → 🇺🇸🇯🇵) and ¬abc¦ as a subdivision tag flag (🏴 + those letters, ' +
  'e.g. ¬gbsct¦ → 🏴󠁧󠁢󠁳󠁣󠁴󠁿). All other characters are literal.';

function riFor(letter: string): number { return RI_BASE + (letter.charCodeAt(0) - 65); }
function isRegionalCp(cp: number): boolean { return cp >= RI_BASE && cp <= RI_LAST; }
function regionalLetter(cp: number): string { return String.fromCharCode(65 + (cp - RI_BASE)); }

/* ---------------------------------------------------------------------------
 * 1. SPAN DISCOVERY / APPLY / RESTORE  (total functions, never throw)
 * --------------------------------------------------------------------------- */

export interface VexillaSpan {
  start: number;              // JS (UTF-16) index
  end: number;
  kind: 'region' | 'tag';
  payload: string;           // ASCII letters
}

export function findVexillaSpans(text: string): VexillaSpan[] {
  const spans: VexillaSpan[] = [];
  let i = 0;
  const n = text.length;
  while (i < n) {
    const cp = text.codePointAt(i);
    if (cp === undefined) break;
    const w = cp > 0xFFFF ? 2 : 1;

    // Tag flag: black flag + tag latin+ + cancel
    if (cp === TAG_BLACK_FLAG) {
      let j = i + w;
      let payload = '';
      let ok = false;
      while (j < n) {
        const t = text.codePointAt(j);
        if (t === undefined) break;
        if (t === TAG_CANCEL) { ok = payload.length > 0; j += t > 0xFFFF ? 2 : 1; break; }
        if (t >= 0xE0020 && t <= 0xE007E) { payload += String.fromCharCode(t - TAG_BASE); j += 2; continue; }
        break; // malformed tag sequence
      }
      if (ok) { spans.push({ start: i, end: j, kind: 'tag', payload }); i = j; continue; }
    }

    // Regional flag run: maximal run of regional indicators, taken in pairs
    if (isRegionalCp(cp)) {
      let j = i;
      const letters: string[] = [];
      while (j < n) {
        const r = text.codePointAt(j);
        if (r === undefined || !isRegionalCp(r)) break;
        letters.push(regionalLetter(r));
        j += 2;
      }
      const pairs = Math.floor(letters.length / 2);
      if (pairs >= 1) {
        const usedLetters = letters.slice(0, pairs * 2);
        spans.push({ start: i, end: i + pairs * 2 * 2, kind: 'region', payload: usedLetters.join('') });
        i = i + pairs * 2 * 2; // 2 code units per RI, 2 RI per flag
        continue;
      }
    }

    i += w;
  }
  return spans;
}

export function vexillaApplySpans(text: string, spans: VexillaSpan[]): string {
  let out = '';
  let cursor = 0;
  for (const s of spans) {
    out += text.slice(cursor, s.start);
    out += s.kind === 'region'
      ? VEXILLA_REGION_OPEN + s.payload + VEXILLA_REGION_CLOSE
      : VEXILLA_TAG_OPEN + s.payload + VEXILLA_TAG_CLOSE;
    cursor = s.end;
  }
  out += text.slice(cursor);
  return out;
}

/** Total inverse over span bodies. Malformed markers are emitted verbatim. */
export function vexillaRestoreSpans(wire: string): string {
  let out = '';
  let i = 0;
  const n = wire.length;
  while (i < n) {
    const ch = wire[i];
    if (ch === VEXILLA_REGION_OPEN) {
      const close = wire.indexOf(VEXILLA_REGION_CLOSE, i + 1);
      if (close === -1) { out += ch; i++; continue; }
      const inner = wire.slice(i + 1, close);
      if (inner.length >= 2 && inner.length % 2 === 0 && /^[A-Z]+$/.test(inner)) {
        let rebuilt = '';
        for (const c of inner) rebuilt += String.fromCodePoint(riFor(c));
        out += rebuilt; i = close + 1; continue;
      }
      out += ch; i++; continue;
    }
    if (ch === VEXILLA_TAG_OPEN) {
      const close = wire.indexOf(VEXILLA_TAG_CLOSE, i + 1);
      if (close === -1) { out += ch; i++; continue; }
      const inner = wire.slice(i + 1, close);
      // Tag payload is printable ASCII (0x20..0x7E) but never a bare sentinel.
      let ok = inner.length > 0;
      for (const c of inner) { const cc = c.charCodeAt(0); if (cc < 0x20 || cc > 0x7E) { ok = false; break; } }
      if (ok) {
        let rebuilt = String.fromCodePoint(TAG_BLACK_FLAG);
        for (const c of inner) rebuilt += String.fromCodePoint(TAG_BASE + c.charCodeAt(0));
        rebuilt += String.fromCodePoint(TAG_CANCEL);
        out += rebuilt; i = close + 1; continue;
      }
      out += ch; i++; continue;
    }
    out += ch; i++;
  }
  return out;
}

/* ---------------------------------------------------------------------------
 * 2. GREEDY, REAL-TOKENIZER-VERIFIED SPAN ACCEPTANCE
 * --------------------------------------------------------------------------- */

function transform(text: string, enc: EncodingName): { candidate: string; spans: VexillaSpan[] } {
  const all = findVexillaSpans(text);
  if (all.length === 0) return { candidate: text, spans: [] };

  const full = vexillaApplySpans(text, all);
  if (vexillaRestoreSpans(full) === text && countTokens(full, enc) < countTokens(text, enc)) {
    return { candidate: full, spans: all };
  }

  const accepted: VexillaSpan[] = [];
  let workingTok = countTokens(text, enc);
  for (const span of all) {
    const trial = [...accepted, span].sort((a, b) => a.start - b.start);
    const cand = vexillaApplySpans(text, trial);
    if (vexillaRestoreSpans(cand) !== text) continue;
    const t = countTokens(cand, enc);
    if (t < workingTok) { accepted.push(span); workingTok = t; }
  }
  return { candidate: vexillaApplySpans(text, accepted.sort((a, b) => a.start - b.start)), spans: accepted };
}

/* ---------------------------------------------------------------------------
 * 3. INLINE BARE-LLM CONTRACT  (only lists the kinds actually present)
 * --------------------------------------------------------------------------- */

// Minimal, kind-scoped inline contract. No ⚑/"decode:" preamble and no live
// flag-emoji examples (a single tag-flag example alone would cost ~26 tokens
// and defeat the codec). The ° drop is implied by the leading sentinel; a
// bare LLM reads the ¶..§ / ¬..¦ equations directly. Measured (o200k_base):
// region clause ~10 tok, tag clause ~11 tok, emitted only for kinds present.
function contractFor(spans: VexillaSpan[]): string {
  const kinds = new Set(spans.map((s) => s.kind));
  const clauses: string[] = [];
  if (kinds.has('region')) clauses.push(`${VEXILLA_REGION_OPEN}..${VEXILLA_REGION_CLOSE}=flags,2 letters each`);
  if (kinds.has('tag')) clauses.push(`${VEXILLA_TAG_OPEN}..${VEXILLA_TAG_CLOSE}=🏴+tag-latin flag`);
  return clauses.join('; ');
}

/* ---------------------------------------------------------------------------
 * 4. ENCODE / DECODE
 * --------------------------------------------------------------------------- */

export interface VexillaResult {
  codec: 'vexilla';
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;        // wire body only
  messageTokens: number;    // inline contract + wire — honest single-chat cost
  contractTokens: number;
  savingsPct: number;
  applied: boolean;
  spans: number;
  regionSpans: number;
  tagSpans: number;
  decoderPrompt: string;
  notes: string;
  ms: number;
}

export function vexillaEncode(text: string, enc: EncodingName = 'o200k_base'): VexillaResult {
  const started = Date.now();
  const inTokens = countTokens(text, enc);

  const identity = (reason: string): VexillaResult => {
    const collision = text.length > 0 && (text[0] === VEXILLA_MARK || text[0] === VEXILLA_ESCAPE);
    const wire = collision ? VEXILLA_ESCAPE + text : text;
    const messageTokens = collision ? countTokens(wire, enc) : inTokens;
    return {
      codec: 'vexilla', wire, decoded: text, exact: true, inTokens,
      outTokens: messageTokens, messageTokens, contractTokens: 0, savingsPct: 0,
      applied: false, spans: 0, regionSpans: 0, tagSpans: 0, decoderPrompt: '',
      notes: `vexilla: not applied (${reason})`, ms: Date.now() - started,
    };
  };

  if (text.length === 0) return identity('empty input');

  const { candidate, spans } = transform(text, enc);
  if (spans.length === 0 || candidate === text) return identity('no emoji flag sequence found');

  const wire = VEXILLA_MARK + candidate;
  if (vexillaDecode(wire) !== text) return identity('span verification failed — passthrough for exactness');

  const contract = contractFor(spans);
  const message = contract + '\n' + wire;
  const messageTokens = countTokens(message, enc);
  if (messageTokens >= inTokens) return identity('verified but inline contract overhead not amortized on this input');

  let regionSpans = 0, tagSpans = 0;
  for (const s of spans) (s.kind === 'region' ? regionSpans++ : tagSpans++);

  return {
    codec: 'vexilla', wire, decoded: text, exact: true, inTokens,
    outTokens: countTokens(wire, enc), messageTokens,
    contractTokens: countTokens(contract + '\n', enc),
    savingsPct: inTokens > 0 ? ((inTokens - messageTokens) / inTokens) * 100 : 0,
    applied: true, spans: spans.length, regionSpans, tagSpans, decoderPrompt: contract,
    notes: `vexilla: applied, ${regionSpans} regional-flag run(s) + ${tagSpans} tag flag(s) restored; message ${messageTokens} vs raw ${inTokens} tok (saved ${inTokens - messageTokens})`,
    ms: Date.now() - started,
  };
}

/** Total decoder. Only a MARK-prefixed wire is transformed; ESCAPE is stripped. */
export function vexillaDecode(wire: string): string {
  if (wire.length === 0) return wire;
  if (wire[0] === VEXILLA_MARK) return vexillaRestoreSpans(wire.slice(1));
  if (wire[0] === VEXILLA_ESCAPE) return wire.slice(1);
  return wire;
}

export function vexillaDecoderPrompt(wire: string): string {
  if (wire.length === 0 || wire[0] !== VEXILLA_MARK) return '';
  const spans = findVexillaSpans(vexillaRestoreSpans(wire.slice(1)));
  return spans.length > 0 ? contractFor(spans) : contractFor([{ start: 0, end: 0, kind: 'region', payload: '' }]);
}
