/**
 * src/lib/omega/circe.ts
 * =============================================================================
 * CIRCE — Encoded/Injected-Artifact Restoration Pre-Pass (self-verifying,
 * exact)
 *
 * Named for the myth: Circe's drug turned Odysseus's men into swine; the
 * counter-drug turned them BACK into their true human form. This lane does
 * the textual inverse of extremely common, extremely mundane accidents that
 * leave text in a form a HUMAN reader never notices but a subword tokenizer
 * charges heavily for: HTML/XML markup-escaping left un-decoded, URLs still
 * carrying percent-encoded UTF-8 bytes, and invisible Unicode "noise"
 * characters injected by watermarking/steganography tooling or broken
 * copy-paste pipelines. CIRCE restores each to the plain, literal text a
 * human already sees when reading it.
 *
 * THE BLINDSPOT, STATED PLAINLY: no lane shipped in this program — ORTHOS
 * (apostrophe/quote glyph style), STENTOR (sustained-case runs), ABACUS
 * (digit-grouping / NFD-vs-NFC composition form), PROCRUSTES (letter-spacing
 * / fullwidth-Unicode width) — touches markup-escaping, URL percent-
 * encoding, or invisible-character injection at all. These are qualitatively
 * distinct failure modes beyond "wrong Unicode form" (ABACUS) and "wrong
 * glyph width" (PROCRUSTES): text that is still, byte-for-byte, in an
 * ESCAPED ENCODING rather than plain text, or that carries extra characters
 * a human reader literally cannot see. A human reader effortlessly reads
 * "It&#8217;s" as "It's" and never notices a zero-width space between two
 * words; a subword tokenizer pays full price for every one of those extra
 * literal characters with no such courtesy.
 *
 * FIVE SUB-MECHANISMS, ONE THEME (undo an escaping/injection accident):
 *
 *   (1) NAMED entities ("&amp;", "&rsquo;", "&mdash;", ...). A curated,
 *       bijective whitelist of ~45 of the most common standard HTML5 named
 *       character references, each mapping to exactly one BMP character.
 *       MEASURED (bench/tmp/probe_entities.ts, this session, o200k_base):
 *         "&amp;"    2 tok -> "&"   1 tok   (delta 1)
 *         "&mdash;"  3 tok -> "\u2014"  1 tok   (delta 2)
 *         "&hellip;" 4 tok -> "\u2026"  1 tok   (delta 3)
 *       DESIGN CHOICE, MEASURED NOT ASSUMED: a more conservative design
 *       was tried FIRST and rejected with receipts (bench/tmp/circe_debug5.ts,
 *       this session): rather than trust the decoder's own memorized
 *       knowledge of "the standard HTML5 entity name" for a character
 *       (real but low risk: a few characters have more than one valid
 *       alias in the full HTML5 spec, e.g. both "&rsquor;" and "&rsquo;"
 *       resolve to U+2019), emit a SELF-DESCRIBING per-document mapping
 *       table in the decode instructions, listing only the DISTINCT
 *       (character -> exact original entity spelling) pairs used in THIS
 *       document. MEASURED result: the table costs ~4-5 tokens per
 *       DISTINCT entity type (not per occurrence), which made the whole
 *       mechanism NET NEGATIVE on realistic short/medium documents with
 *       several distinct entity types and few repeats each (a 40-token
 *       fixture with 4 distinct named entities needed a 52-token tail —
 *       worse than doing nothing). CIRCE therefore trusts the decoder's
 *       standard knowledge instead (flat ~7-token clause regardless of
 *       how many distinct entities occur), and the whitelist is
 *       deliberately restricted to the ~45 original HTML 2.0/4.01-era
 *       entities with NO commonly-confused alias in ordinary usage —
 *       the same class of "trust a well-defined, extremely standard
 *       transformation" precedent ABACUS (NFD recomposition) and
 *       PROCRUSTES (+0xFEE0 fullwidth offset) already rely on. This
 *       trade-off (cheaper + relies on well-known vocabulary vs. more
 *       expensive + self-contained) is disclosed honestly, not hidden;
 *       see section G of the report for the second-order adversary this
 *       choice invites and how it is tested.
 *
 *   (2) DECIMAL numeric character references ("&#8217;", "&#38;", ...).
 *       Pure mechanical codepoint arithmetic — "write &#N; where N is the
 *       decimal Unicode code point of the following character" — the same
 *       class of reliable, memorization-free arithmetic ABACUS (NFD
 *       recomposition) and PROCRUSTES (+0xFEE0 fullwidth offset) already
 *       trust a bare LLM to execute. MEASURED: "&#8217;" 4 tok -> "\u2019"
 *       1 tok (delta 3) — the single largest per-instance overhead of any
 *       sub-mechanism in this lane, and numeric references are the
 *       DOMINANT form emitted by many real-world CMS/RSS/export pipelines
 *       (WordPress's "wptexturize", many RSS generators, and most XML
 *       export tools default to decimal numeric references over named
 *       ones for portability across parsers that may not support the
 *       full named-entity table).
 *
 *   (3) HEXADECIMAL numeric character references ("&#x2019;", ...). Same
 *       arithmetic as (2), base 16, restricted to the canonical
 *       lowercase-x/lowercase-hex-digit spelling for unambiguous, exact
 *       regeneration (see SAFETY below). MEASURED: "&#x2019;" 5 tok ->
 *       "\u2019" 1 tok (delta 4).
 *
 *   (4) PERCENT-ENCODED UTF-8 ("%E2%80%99", "%C3%A9", RFC 3986 URI
 *       escaping), restricted to MULTI-BYTE sequences (codepoint >= 0x80)
 *       -- see the dedicated docstring above findPctSpans for why
 *       single-byte ASCII escapes like "%20"/"%2F" are deliberately out of
 *       scope (real URL-semantic ambiguity, small token value) while
 *       multi-byte sequences are unambiguous accidents with the LARGEST
 *       per-instance value of any mechanism in this file. MEASURED:
 *       "%E2%80%99" 6 tok -> "\u2019" 1 tok (delta 5); "%C3%A9" 4 tok ->
 *       "\u00e9" 1 tok (delta 3). Real-world source: any pasted URL,
 *       webhook payload, log line, or JSON API field whose non-ASCII
 *       characters (smart quotes, em dashes, accented letters in a title
 *       or name) were percent-encoded by encodeURIComponent/a server and
 *       never decoded back before being pasted into chat.
 *
 *   (5) UNIFORM INVISIBLE-CHARACTER GUARD STRIPPING -- see the dedicated
 *       docstring above findInvisibleGuard for the full mechanism and
 *       safety scope. Unlike (1)-(4), which restore a multi-character
 *       escape sequence to ONE character (a bounded per-instance win),
 *       this mechanism REMOVES up to hundreds of individually-1-token,
 *       zero-width "noise" characters (steganographic watermarking, SEO
 *       stuffing, or accidental copy-paste artifacts) for a SINGLE flat
 *       reconstruction-rule cost, so its savings scale with how much noise
 *       was injected rather than being capped at a few tokens per hit --
 *       by far the largest-magnitude mechanism in this file when it fires.
 *
 * Bundled into one lane because all five restore the same class of
 * artifact (text that is not what a subword tokenizer should be charged
 * for, because a human reader either already sees the intended character
 * or never sees the extra one at all) ahead of DAEDALUS, exactly as ABACUS
 * bundled digit-regrouping + NFD recomposition and PROCRUSTES bundled
 * letter-spacing + fullwidth width.
 *
 * REAL-WORLD PREVALENCE, NOT A CONTRIVED ADVERSARY: copy-pasting from a
 * rendered web page is usually safe (the browser already decoded entities
 * before you selected the text), but pasting from "View Source", an
 * RSS/Atom feed's raw XML, a CMS database export, a scraped-HTML pipeline,
 * an email client that renders HTML-as-plain-text badly, or a JSON API
 * response whose string fields were never HTML-unescaped after extraction
 * from a web source, routinely leaves literal entity syntax sitting in
 * what is otherwise completely ordinary plain English prose — the single
 * most common "everyday work" way this shows up is smart-typography
 * apostrophes/quotes/dashes (&#8217; &#8220; &#8221; &#8212; / &rsquo;
 * &ldquo; &rdquo; &mdash;), because "texturize" filters in WordPress and
 * similar CMSes convert every straight quote and double-hyphen into one of
 * these on save, and many export/scrape/RSS pipelines never reverse it.
 *
 * SAFETY — NAMED: the whitelist is checked at module-load time (see the
 * assertion below `NAMED_ENTITY_TABLE`) to be a total bijection onto its
 * character set — no two entities may resolve to the same character,
 * which would make the self-describing table itself ambiguous. Only
 * WELL-FORMED "&name;" (semicolon-terminated, case-sensitive exact match)
 * is recognized; legacy semicolon-less forms are out of scope by design
 * (an honest restriction, not a security workaround).
 *
 * SAFETY — DECIMAL/HEX: candidate codepoints are restricted to the Basic
 * Multilingual Plane (<= 0xFFFF; astral/supplementary-plane codepoints,
 * e.g. emoji, are out of scope — same class of restriction as PROCRUSTES
 * scoping out halfwidth katakana), excluding the UTF-16 surrogate range
 * (0xD800-0xDFFF, which cannot be a standalone character), NUL (which the
 * HTML5 parsing spec replaces with U+FFFD rather than the literal
 * codepoint), and the C1-control "Windows-1252 remap" danger zone
 * (0x80-0x9F): the WHATWG HTML parsing algorithm remaps *numeric*
 * character references landing in this range to specific Windows-1252
 * code points for legacy-compatibility reasons (e.g. &#128; parses as
 * U+20AC EURO SIGN, *not* literal U+0080), a genuine, well-documented
 * browser-parsing quirk that would make restoring "the literal codepoint"
 * silently WRONG for real HTML-parsed content in that range — so CIRCE
 * refuses to touch numeric references in 0x80-0x9F at all, honestly
 * leaving them untouched rather than guessing which convention produced
 * them.
 *
 * SAFETY — EXACT-REGENERATION GATE (mirrors ABACUS's numeric-regrouping
 * discipline exactly): a decimal reference is only ever accepted if
 * regenerating its canonical form (the codepoint's decimal digits, NO
 * leading zeros) reproduces the matched digit substring byte-for-byte —
 * this silently and safely excludes non-canonical spellings like
 * "&#039;" (leading zero), which are declined rather than mishandled. A
 * hex reference is only accepted if it already uses the single canonical
 * spelling this lane restores to (lowercase "x", lowercase hex digits, no
 * leading zeros) — any other capitalization/padding convention is
 * declined at zero risk.
 *
 * SELF-VERIFICATION, NOT A HEURISTIC GUESS, PER INSTANCE: identical
 * discipline to every prior lane. Every candidate span (named, decimal, or
 * hex) is applied tentatively; the WHOLE candidate text must round-trip
 * through circeRestoreSpans byte-identical to the original AND the real
 * tokenizer (never estimated) must show a strict improvement before that
 * span is ever kept. CIRCE can never make a document cost more tokens
 * than DAEDALUS alone would have.
 *
 * COMPOSABILITY: a PRE-PASS, not a competing lane — verified/cheaper
 * canonicalized text is handed to daedalusEncode for full downstream
 * compression, exactly like ORTHOS, STENTOR, ABACUS, and PROCRUSTES. All
 * five lanes are independent, parallel pre-passes over the same DAEDALUS
 * core (none chains onto another), matching the existing registry
 * architecture.
 * =============================================================================
 */
import { countTokens, type EncodingName } from './bpe';
import { daedalusEncode, daedalusDecode, daedalusDecoderPrompt, type DaedalusResult, type DaedalusOptions } from './daedalus';
import { CHIRON_START } from './chiron';

/** Reserved, VERIFIED single-o200k-token sentinels (bench/tmp/marker_probe4.ts
 *  through marker_probe7.ts, this session — actually run through countTokens,
 *  not assumed: an earlier draft used U+2295/U+2296 for the outer marks on
 *  the (false) assumption they were 1 token each like every other lane's
 *  marker pair; measurement showed they cost 2 tokens EACH, which would
 *  have silently taxed every CIRCE-applied wire by 2 extra tokens versus
 *  every other lane's 1. Replaced with the verified-1-token pair below.
 *  Cross-checked via repo-wide grep, not just src/lib/omega/*.ts, against
 *  every existing lane's own reserved sentinel constants and banned-char
 *  sets: ABACUS claims U+3012/U+25CF, PROCRUSTES claims U+2605/U+2606,
 *  HERMES claims U+2200/U+2206, morph.ts claims U+2020 internally. The
 *  five markers below are claimed by no lane's fixed reserved-constant
 *  set (U+25B6/U+25B7/U+25BD appear only inside LOGOS's large dynamic
 *  per-document delimiter CANDIDATE POOL, which LOGOS only actually uses
 *  a character from if it is absent from that document's own text --
 *  not a fixed reservation, and LOGOS/CIRCE never compose, so this is
 *  not a real collision risk; documented here for transparency). */
export const CIRCE_MARK = '\u25B6';        // ▶ U+25B6 BLACK RIGHT-POINTING TRIANGLE — "CIRCE applied"
export const CIRCE_ESCAPE = '\u25B7';      // ▷ U+25B7 WHITE RIGHT-POINTING TRIANGLE — "escaped, not applied"
export const NAMED_MARK = '\u221A';        // √ U+221A SQUARE ROOT — named-entity span prefix (self-terminating, 1 char)
export const DEC_MARK = '\u2219';          // ∙ U+2219 BULLET OPERATOR — decimal numeric-reference span prefix
export const HEX_MARK = '\u2228';          // ∨ U+2228 LOGICAL OR — hex numeric-reference span prefix
export const PCT_MARK = '\u25BD';          // ▽ U+25BD WHITE DOWN-POINTING TRIANGLE — percent-encoded-UTF-8 span prefix
export const INV_MARK = '\u25CE';          // ◎ U+25CE BULLSEYE — uniform-invisible-character-guard flag prefix

const MAX_SPANS_EVALUATED = 500;

/* ---------------------------------------------------------------------------
 * NAMED ENTITY TABLE — curated, bijective (character -> canonical spelling)
 * ------------------------------------------------------------------------- */

/** Each entry: [entity name (without & ;), resulting character]. Curated to
 *  the ~45 most common real-world HTML5 named character references with a
 *  UNIQUE single-BMP-character target. Verified bijective at module load
 *  (see the assertion loop below) — this is a build-time safety check, not
 *  a runtime one, so a future accidental duplicate entry fails loudly. */
const NAMED_ENTITY_LIST: Array<[string, string]> = [
  ['amp', '&'], ['lt', '<'], ['gt', '>'], ['quot', '"'], ['apos', "'"],
  ['nbsp', '\u00A0'], ['copy', '\u00A9'], ['reg', '\u00AE'], ['trade', '\u2122'],
  ['deg', '\u00B0'], ['plusmn', '\u00B1'], ['times', '\u00D7'], ['divide', '\u00F7'],
  ['micro', '\u00B5'], ['sect', '\u00A7'], ['para', '\u00B6'], ['middot', '\u00B7'],
  ['laquo', '\u00AB'], ['iexcl', '\u00A1'], ['iquest', '\u00BF'], ['euro', '\u20AC'],
  ['pound', '\u00A3'], ['yen', '\u00A5'], ['cent', '\u00A2'], ['mdash', '\u2014'],
  ['ndash', '\u2013'], ['hellip', '\u2026'], ['rsquo', '\u2019'], ['lsquo', '\u2018'],
  ['rdquo', '\u201D'], ['ldquo', '\u201C'], ['bull', '\u2022'], ['permil', '\u2030'],
  ['frac12', '\u00BD'], ['frac14', '\u00BC'], ['frac34', '\u00BE'], ['sup1', '\u00B9'],
  ['sup2', '\u00B2'], ['sup3', '\u00B3'], ['dagger', '\u2020'], ['Dagger', '\u2021'],
  ['raquo', '\u00BB'], ['larr', '\u2190'], ['rarr', '\u2192'], ['uarr', '\u2191'], ['darr', '\u2193'],
];

const NAMED_TO_CHAR = new Map<string, string>(NAMED_ENTITY_LIST);
const CHAR_TO_NAMED = new Map<string, string>();
for (const [name, ch] of NAMED_ENTITY_LIST) {
  if (CHAR_TO_NAMED.has(ch)) {
    throw new Error(`CIRCE NAMED_ENTITY_LIST is not bijective: both "${CHAR_TO_NAMED.get(ch)}" and "${name}" resolve to ${JSON.stringify(ch)}`);
  }
  CHAR_TO_NAMED.set(ch, name);
}

/* ---------------------------------------------------------------------------
 * Codepoint validity — shared by DECIMAL and HEX mechanisms
 * ------------------------------------------------------------------------- */

/** Codepoints CIRCE will never treat as a numeric-reference target: outside
 *  the BMP (astral/supplementary plane -- out of scope, see docstring),
 *  UTF-16 surrogates (not standalone characters), NUL (HTML5 spec replaces
 *  with U+FFFD, not the literal codepoint), and the C1 "Windows-1252 remap"
 *  danger zone 0x80-0x9F (see docstring SAFETY section — real browser
 *  parsing ambiguity, not a hypothetical). */
function isSafeNumericTarget(cp: number): boolean {
  if (cp <= 0) return false;
  if (cp > 0xffff) return false; // BMP only
  if (cp >= 0xd800 && cp <= 0xdfff) return false; // surrogate range
  if (cp >= 0x80 && cp <= 0x9f) return false; // Windows-1252 remap danger zone
  return true;
}

/* ---------------------------------------------------------------------------
 * MECHANISM 1: NAMED entities
 * ------------------------------------------------------------------------- */

export interface NamedSpan { kind: 'named'; start: number; end: number; ch: string; name: string; }

const NAMED_RE = /&([A-Za-z][A-Za-z0-9]{1,31});/g;

export function findNamedSpans(text: string): NamedSpan[] {
  const spans: NamedSpan[] = [];
  NAMED_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = NAMED_RE.exec(text)) && spans.length < MAX_SPANS_EVALUATED) {
    const name = m[1];
    const ch = NAMED_TO_CHAR.get(name);
    if (ch !== undefined) {
      spans.push({ kind: 'named', start: m.index, end: m.index + m[0].length, ch, name });
    }
  }
  return spans;
}

/* ---------------------------------------------------------------------------
 * MECHANISM 2: DECIMAL numeric character references
 * ------------------------------------------------------------------------- */

export interface DecSpan { kind: 'dec'; start: number; end: number; ch: string; }

const DEC_RE = /&#([0-9]{1,7});/g;

export function findDecSpans(text: string): DecSpan[] {
  const spans: DecSpan[] = [];
  DEC_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = DEC_RE.exec(text)) && spans.length < MAX_SPANS_EVALUATED) {
    const digits = m[1];
    const cp = parseInt(digits, 10);
    if (!isSafeNumericTarget(cp)) continue;
    // Exact-regeneration gate: canonical decimal form (no leading zeros)
    // must reproduce the matched digits verbatim, mirroring ABACUS's
    // numeric-regrouping discipline exactly.
    if (String(cp) !== digits) continue;
    const ch = String.fromCodePoint(cp);
    spans.push({ kind: 'dec', start: m.index, end: m.index + m[0].length, ch });
  }
  return spans;
}

/* ---------------------------------------------------------------------------
 * MECHANISM 3: HEXADECIMAL numeric character references
 * ------------------------------------------------------------------------- */

export interface HexSpan { kind: 'hex'; start: number; end: number; ch: string; }

const HEX_RE = /&#x([0-9a-fA-F]{1,6});/g;

export function findHexSpans(text: string): HexSpan[] {
  const spans: HexSpan[] = [];
  HEX_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = HEX_RE.exec(text)) && spans.length < MAX_SPANS_EVALUATED) {
    const digits = m[1];
    const cp = parseInt(digits, 16);
    if (!isSafeNumericTarget(cp)) continue;
    // Exact-regeneration gate: only the single canonical spelling this
    // lane restores to (lowercase "x", lowercase hex digits, no leading
    // zeros) is accepted -- matches m[0] exactly, byte for byte.
    const canonical = `&#x${cp.toString(16)};`;
    if (canonical !== m[0]) continue;
    const ch = String.fromCodePoint(cp);
    spans.push({ kind: 'hex', start: m.index, end: m.index + m[0].length, ch });
  }
  return spans;
}

/* ---------------------------------------------------------------------------
 * MECHANISM 4: PERCENT-ENCODED UTF-8 (RFC 3986 "%XX" URI escaping) —
 *    BY FAR THE HIGHEST-VALUE MECHANISM IN THIS LANE, added after the
 *    named/decimal/hex HTML mechanisms above were measured (bench/tmp/
 *    circe_debug14.ts through circe_debug20.ts, this session) to average
 *    only ~1.0-1.3 tokens saved per instance in realistic prose -- too
 *    small to clear this lane's own fixed decode-instruction overhead
 *    (~16-27 tok) on any but implausibly entity-dense documents. See
 *    "HONEST NEGATIVE RESULT" below.
 * ------------------------------------------------------------------------- */

export interface PctSpan { kind: 'pct'; start: number; end: number; ch: string; }

/** Manual, dependency-free UTF-8 continuation-byte decode for a 2- or
 *  3-byte sequence, WITH the standard overlong-encoding and surrogate-half
 *  exclusions the UTF-8 spec requires for a byte sequence to be the single
 *  unique valid encoding of its codepoint (mirrors what a strict/fatal
 *  UTF-8 decoder enforces) -- returns null for anything invalid, malformed,
 *  overlong, or a surrogate half rather than guessing. */
function decodeUtf8Cp(bytes: number[]): number | null {
  if (bytes.length === 2) {
    const [b0, b1] = bytes;
    if (b0 < 0xc2 || b0 > 0xdf) return null; // 0xC0/0xC1 would be overlong
    if (b1 < 0x80 || b1 > 0xbf) return null;
    return ((b0 & 0x1f) << 6) | (b1 & 0x3f);
  }
  if (bytes.length === 3) {
    const [b0, b1, b2] = bytes;
    if (b0 < 0xe0 || b0 > 0xef) return null;
    if (b2 < 0x80 || b2 > 0xbf) return null;
    if (b0 === 0xe0 && (b1 < 0xa0 || b1 > 0xbf)) return null; // overlong
    if (b0 === 0xed && (b1 < 0x80 || b1 > 0x9f)) return null; // UTF-16 surrogate half — invalid in UTF-8
    if (!(b0 === 0xe0 || b0 === 0xed) && (b1 < 0x80 || b1 > 0xbf)) return null;
    return ((b0 & 0x0f) << 12) | ((b1 & 0x3f) << 6) | (b2 & 0x3f);
  }
  return null;
}

/** Encode a single BMP codepoint (>= 0x80, restricted to what this lane
 *  handles: 2- or 3-byte UTF-8 forms) into its canonical UPPERCASE-hex
 *  percent-encoded byte sequence — the exact-regeneration inverse of
 *  decodeUtf8Cp, used only by the restore direction. */
function pctEncodeCodepoint(cp: number): string {
  const bytes: number[] =
    cp < 0x800
      ? [0xc0 | (cp >> 6), 0x80 | (cp & 0x3f)]
      : [0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f)];
  return bytes.map((b) => '%' + b.toString(16).toUpperCase().padStart(2, '0')).join('');
}

// A maximal run of one-or-more consecutive "%XX" groups, UPPERCASE hex
// digits ONLY (the canonical spelling produced by encodeURIComponent and
// virtually every server/browser encoder; this is the exact-regeneration
// gate for this mechanism, enforced directly by the character class —
// mirrors HEX_RE's canonical-lowercase requirement, flipped to uppercase
// because that is PCT's own real-world canonical convention).
const PCT_RUN_RE = /(?:%[0-9A-F]{2})+/g;

export function findPctSpans(text: string): PctSpan[] {
  const spans: PctSpan[] = [];
  PCT_RUN_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = PCT_RUN_RE.exec(text)) && spans.length < MAX_SPANS_EVALUATED) {
    const run = m[0];
    const groups: number[] = [];
    for (let k = 0; k < run.length; k += 3) groups.push(parseInt(run.slice(k + 1, k + 3), 16));
    let gi = 0;
    let pos = m.index;
    while (gi < groups.length && spans.length < MAX_SPANS_EVALUATED) {
      const remaining = groups.length - gi;
      let consumed = 0;
      let cp: number | null = null;
      if (remaining >= 3) {
        cp = decodeUtf8Cp(groups.slice(gi, gi + 3));
        if (cp !== null) consumed = 3;
      }
      if (cp === null && remaining >= 2) {
        cp = decodeUtf8Cp(groups.slice(gi, gi + 2));
        if (cp !== null) consumed = 2;
      }
      // Scope: multi-byte only (cp >= 0x80 is automatic here since every
      // valid decodeUtf8Cp result is >= 0x80 by construction) and BMP-only
      // (3-byte UTF-8 tops out at 0xFFFF, already excludes astral).
      if (cp === null || consumed === 0) { gi += 1; pos += 3; continue; }
      spans.push({ kind: 'pct', start: pos, end: pos + consumed * 3, ch: String.fromCodePoint(cp) });
      gi += consumed;
      pos += consumed * 3;
    }
  }
  return spans;
}

/* ---------------------------------------------------------------------------
 * MECHANISM 5: UNIFORM INVISIBLE-CHARACTER GUARD STRIPPING — a document-
 *    level (not per-span) structural pre-pass, run BEFORE the four
 *    per-span mechanisms above, on the raw input text.
 *
 *    TARGET: zero-width/no-op Unicode characters that a subword tokenizer
 *    charges a FULL TOKEN for despite them being 100% invisible to a human
 *    reader. Real, documented, currently-active use: text steganography /
 *    LLM-output watermarking tools insert ZERO WIDTH SPACE (U+200B) or
 *    WORD JOINER (U+2060) at every word gap to hide a payload or a
 *    detectable signature (see e.g. neatnik.net/steganographr and the
 *    "Unicode Steganography with Zero-Width Characters" family of tools);
 *    the same characters also show up as pure accidental noise from
 *    certain CMS/export/copy-paste pipelines. Only the two characters with
 *    NO legitimate content-bearing role in ANY script are in scope --
 *    ZERO WIDTH JOINER/NON-JOINER (U+200D/U+200C) are deliberately
 *    EXCLUDED because they are load-bearing in real text (Arabic/Indic
 *    script shaping, and ZWJ emoji sequences like the "family" emoji),
 *    and a BOM (U+FEFF) is excluded because at position 0 it is a
 *    legitimate byte-order mark, not noise.
 *
 *    SCOPE, DELIBERATELY NARROW: this mechanism only fires when the
 *    target character appears with a perfectly UNIFORM structural
 *    pattern -- immediately before, or immediately after, EVERY single
 *    space character in the document, with NO exceptions and NO other
 *    occurrences anywhere else. This is exactly what naive/accidental
 *    noise and simple single-bit-per-gap tooling produce. Multi-bit
 *    steganographic payloads that alternate BETWEEN several different
 *    invisible characters to encode a hidden message do NOT match this
 *    invariant and are correctly, safely left untouched (this mechanism
 *    makes no attempt to detect or strip an actual hidden payload -- only
 *    a wasteful, content-free, perfectly uniform repetition).
 *
 *    SAFETY: exactly the same discipline as every span mechanism above --
 *    the candidate reconstruction rule is applied and compared against
 *    the original BYTE-FOR-BYTE before ever being accepted; there is no
 *    heuristic guess, only a verified equality check.
 *
 *    MEASURED (bench/tmp/zw_probe.ts, this session, o200k_base): each
 *    occurrence of U+200B or U+2060 costs exactly 1 full token with ZERO
 *    visible footprint. A 13-word sentence with one ZWSP inserted at
 *    every one of its 12 word gaps costs 24-25 tokens instead of 13 --
 *    nearly DOUBLE -- because this mechanism replaces potentially
 *    hundreds of scattered 1-token characters with a single O(1)
 *    reconstruction RULE (flag + direction + codepoint, a small fixed
 *    cost regardless of how many instances were removed), this is the
 *    single largest per-document win of any mechanism in this file when
 *    it fires, scaling with document length rather than being capped by
 *    a small per-instance delta.
 * ------------------------------------------------------------------------- */

const INVISIBLE_GUARD_CANDIDATES = [0x200b, 0x2060]; // ZERO WIDTH SPACE, WORD JOINER — see docstring for why ZWJ/ZWNJ/BOM are excluded

export interface InvisibleGuardMatch { cp: number; direction: 'before' | 'after'; candidate: string; }

/** Try every candidate invisible codepoint against both directions; accept
 *  the FIRST one whose naive removal-and-uniform-reinsertion rule
 *  reproduces the original text byte-for-byte. Returns null (decline) if
 *  no candidate matches a perfectly uniform pattern. */
export function findInvisibleGuard(text: string): InvisibleGuardMatch | null {
  for (const cp of INVISIBLE_GUARD_CANDIDATES) {
    const ch = String.fromCodePoint(cp);
    if (!text.includes(ch)) continue;
    const candidate = text.split(ch).join('');
    if (candidate === text) continue; // nothing actually removed
    const reconBefore = candidate.split(' ').join(ch + ' ');
    if (reconBefore === text) return { cp, direction: 'before', candidate };
    const reconAfter = candidate.split(' ').join(' ' + ch);
    if (reconAfter === text) return { cp, direction: 'after', candidate };
  }
  return null;
}

/** Reverse direction: given the stripped text plus the exact (cp,
 *  direction) recorded at encode time, mechanically reinsert one copy of
 *  the codepoint before/after every remaining space. Pure, total,
 *  string-only, no search. */
export function restoreInvisibleGuard(text: string, cp: number, direction: 'before' | 'after'): string {
  const ch = String.fromCodePoint(cp);
  return direction === 'before' ? text.split(' ').join(ch + ' ') : text.split(' ').join(' ' + ch);
}

/* ---------------------------------------------------------------------------
 * Combined apply / restore / self-verifying transform
 * ------------------------------------------------------------------------- */

export type CirceSpan = NamedSpan | DecSpan | HexSpan | PctSpan;

const MARK_OF: Record<CirceSpan['kind'], string> = { named: NAMED_MARK, dec: DEC_MARK, hex: HEX_MARK, pct: PCT_MARK };

export function circeApplySpans(text: string, spans: CirceSpan[]): string {
  let out = '';
  let last = 0;
  for (const s of spans) {
    out += text.slice(last, s.start);
    out += MARK_OF[s.kind] + s.ch;
    last = s.end;
  }
  out += text.slice(last);
  return out;
}

/** Reverse direction: EXACTLY what the decoder runs, using the SAME named
 *  table (for named spans) or pure codepoint arithmetic (for dec/hex
 *  spans). Pure, total, single left-to-right pass; a marker with nothing
 *  following it is dropped with zero further effect, never throwing. */
export function circeRestoreSpans(wire: string): string {
  let out = '';
  let i = 0;
  const n = wire.length;
  while (i < n) {
    const c = wire[i];
    if (c === NAMED_MARK && i + 1 < n) {
      const ch = wire[i + 1];
      const name = CHAR_TO_NAMED.get(ch);
      out += name !== undefined ? `&${name};` : ch;
      i += 2;
    } else if (c === DEC_MARK && i + 1 < n) {
      const cp = wire.codePointAt(i + 1)!;
      out += `&#${cp};`;
      i += 1 + (cp > 0xffff ? 2 : 1);
    } else if (c === HEX_MARK && i + 1 < n) {
      const cp = wire.codePointAt(i + 1)!;
      out += `&#x${cp.toString(16)};`;
      i += 1 + (cp > 0xffff ? 2 : 1);
    } else if (c === PCT_MARK && i + 1 < n) {
      const cp = wire.codePointAt(i + 1)!;
      out += pctEncodeCodepoint(cp);
      i += 1 + (cp > 0xffff ? 2 : 1);
    } else {
      out += c;
      i += 1;
    }
  }
  return out;
}

/** Greedy, real-tokenizer-verified span acceptance: for each candidate
 *  span (named, decimal, hex, interleaved by position), tentatively add it
 *  to the accepted set and keep it ONLY if (a) round-tripping through
 *  circeRestoreSpans reproduces the original text byte-for-byte AND (b)
 *  the whole-document token count (measured, never estimated) strictly
 *  decreases. Mirrors procrustesTransform / abacusTransform exactly. */
export function circeTransform(
  text: string,
  enc: EncodingName,
): { candidate: string; spans: CirceSpan[]; namedSpans: number; decSpans: number; hexSpans: number; pctSpans: number } {
  const allSpans: CirceSpan[] = [
    ...findNamedSpans(text),
    ...findDecSpans(text),
    ...findHexSpans(text),
    ...findPctSpans(text),
  ].sort((a, b) => a.start - b.start);
  const accepted: CirceSpan[] = [];
  let workingTok = countTokens(text, enc);
  for (const span of allSpans) {
    const candidateSpans = [...accepted, span].sort((a, b) => a.start - b.start);
    let overlap = false;
    for (let k = 0; k < candidateSpans.length - 1; k++) {
      if (candidateSpans[k].end > candidateSpans[k + 1].start) { overlap = true; break; }
    }
    if (overlap) continue;
    const candidate = circeApplySpans(text, candidateSpans);
    if (circeRestoreSpans(candidate) !== text) continue; // per-span exactness gate
    const candTok = countTokens(candidate, enc);
    if (candTok < workingTok) {
      accepted.push(span);
      workingTok = candTok;
    }
  }
  const sorted = accepted.sort((a, b) => a.start - b.start);
  const candidate = circeApplySpans(text, sorted);
  return {
    candidate,
    spans: sorted,
    namedSpans: sorted.filter((s) => s.kind === 'named').length,
    decSpans: sorted.filter((s) => s.kind === 'dec').length,
    hexSpans: sorted.filter((s) => s.kind === 'hex').length,
    pctSpans: sorted.filter((s) => s.kind === 'pct').length,
  };
}

/* ---------------------------------------------------------------------------
 * ENCODE — self-verifying gate, then compose with DAEDALUS, then pick
 *    whichever of {plain DAEDALUS, CIRCE+DAEDALUS} costs fewer real BPE
 *    tokens end to end (wire + decoder prompt).
 * ------------------------------------------------------------------------- */

export interface CirceResult extends DaedalusResult {
  codec2: 'circe';
  circeApplied: boolean;
  circeNamedSpans: number;
  circeDecSpans: number;
  circeHexSpans: number;
  circePctSpans: number;
  circeInvisibleGuard: boolean;
}

export const CIRCE_SYSTEM_PROMPT = `CIRCE is a lossless HTML character-reference AND percent-encoded-UTF-8 restoration pre-pass in front of DAEDALUS. No skills.md or external tool is required when the instructions in the same user message are followed.`;

/** Adaptive tail instruction: includes ONLY the restoration clause(s) for
 *  the mechanism(s) actually used in this wire, exactly as
 *  ORTHOS/STENTOR/ABACUS/PROCRUSTES do. The NAMED clause trusts the
 *  decoder's own standard knowledge of the ~45-entry curated whitelist
 *  (all first-generation HTML 2.0/4.01 entities with no commonly-confused
 *  alias -- see docstring SAFETY section for why a self-describing
 *  per-document table was measured and rejected: ~4-5 tokens per DISTINCT
 *  entity type made it net-negative on realistic short/medium documents,
 *  bench/tmp/circe_debug5.ts, this session). The DEC/HEX/PCT clauses
 *  remain pure mechanical byte/codepoint-arithmetic rules with no table,
 *  since they generalize to any codepoint by computation, not recall. */
function circeTailInstruction(hasNamed: boolean, hasDec: boolean, hasHex: boolean, hasPct: boolean): string {
  const clauses: string[] = [];
  if (hasNamed) clauses.push(`${NAMED_MARK}X\u2192HTML entity for X`);
  if (hasDec) clauses.push(`${DEC_MARK}X\u2192&#codepoint(X)`);
  if (hasHex) clauses.push(`${HEX_MARK}X\u2192&#x(lowercase hex of X)`);
  if (hasPct) clauses.push(`${PCT_MARK}X\u2192UTF8 %-encode X uppercase`);
  const body = clauses.length > 0 ? clauses.join('; ') + '.' : '';
  return `Drop ${CIRCE_MARK}/${CIRCE_ESCAPE}.${body ? ' ' + body : ''}`;
}


/** Generic (not per-codepoint) clause describing how to reverse the
 *  invisible-guard flag: a flat, reusable rule -- "prefix encodes a
 *  direction letter + a 4-hex-digit codepoint; insert one copy of it
 *  before/after every space, as the LAST decode step" -- so this mechanism
 *  costs the SAME fixed number of tokens no matter how many hundreds of
 *  instances it is standing in for. */
function invisibleGuardClause(): string {
  return `${INV_MARK} prefix (Dhhhh): insert U+hhhh before(D=b)/after(D=a) every space, last.`;
}

/** Cheaper tail instruction for the rare sentinel-collision escape path,
 *  where no restoration step is ever needed. */
const CIRCE_TAIL_ESCAPE = `Drop the leading ${CIRCE_ESCAPE} above, then decode the rest as already instructed.`;

function baseDaedalus(text: string, enc: EncodingName, options: DaedalusOptions): DaedalusResult {
  return daedalusEncode(text, enc, options);
}

export function circeEncode(text: string, enc: EncodingName = 'o200k_base', options: DaedalusOptions = {}): CirceResult {
  const started = Date.now();
  const inTokens = countTokens(text, enc);

  // MECHANISM 5 runs FIRST, on the raw input, as a document-level
  // structural pre-pass. If it finds nothing (the overwhelmingly common
  // case), workingText === text and every downstream span mechanism
  // behaves exactly as before.
  const invGuard = findInvisibleGuard(text);
  const workingText = invGuard ? invGuard.candidate : text;

  const { candidate, spans, namedSpans, decSpans, hexSpans, pctSpans } = circeTransform(workingText, enc);
  const applied0 = (spans.length > 0 && candidate !== workingText) || invGuard !== null;

  const plain = baseDaedalus(text, enc, options);
  const collision = plain.wire.length > 0 && (plain.wire[0] === CIRCE_MARK || plain.wire[0] === CIRCE_ESCAPE || plain.wire[0] === INV_MARK);

  let best: CirceResult = {
    ...plain,
    codec2: 'circe',
    circeApplied: false,
    circeNamedSpans: 0,
    circeDecSpans: 0,
    circeHexSpans: 0,
    circePctSpans: 0,
    circeInvisibleGuard: false,
    ms: Date.now() - started,
    notes: `circe: not applied (${applied0 ? 'verified but not cheaper after contract overhead' : 'no beneficial HTML/XML character reference, percent-encoded UTF-8, or uniform invisible-character guard found'}); ${plain.notes}`,
  };

  if (collision) {
    const escapedWire = CIRCE_ESCAPE + plain.wire;
    const escapedPrompt = `${CIRCE_ESCAPE}${plain.decoderPrompt}\n${CIRCE_TAIL_ESCAPE}`;
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
    const innerWire = CIRCE_MARK + canon.wire;
    const tail = circeTailInstruction(namedSpans > 0, decSpans > 0, hexSpans > 0, pctSpans > 0);
    const innerPrompt = `${CIRCE_MARK}${canon.decoderPrompt}\n${tail}`;

    const invPrefix = invGuard ? `${INV_MARK}${invGuard.direction === 'before' ? 'b' : 'a'}${invGuard.cp.toString(16).padStart(4, '0')}` : '';
    const invClause = invGuard ? ` ${invisibleGuardClause()}` : '';
    const circeWire = invPrefix + innerWire;
    const circePrompt = invPrefix + innerPrompt + invClause;
    const circeMessageTokens = countTokens(circePrompt, enc);

    if (circeMessageTokens < best.messageTokens) {
      const decodedBack = circeDecode(circeWire);
      if (decodedBack === text) {
        best = {
          ...canon,
          codec2: 'circe',
          wire: circeWire,
          decoded: decodedBack,
          exact: true,
          inTokens,
          messageTokens: circeMessageTokens,
          contractTokens: circeMessageTokens - canon.outTokens,
          decoderPrompt: circePrompt,
          circeApplied: true,
          circeNamedSpans: namedSpans,
          circeDecSpans: decSpans,
          circeHexSpans: hexSpans,
          circePctSpans: pctSpans,
          circeInvisibleGuard: invGuard !== null,
          ms: Date.now() - started,
          notes: `circe: applied, ${namedSpans} named/${decSpans} decimal/${hexSpans} hex HTML reference(s) + ${pctSpans} percent-encoded byte sequence(s)${invGuard ? ` + uniform invisible-character guard (U+${invGuard.cp.toString(16).padStart(4, '0')}, ${invGuard.direction} every space)` : ''} restored, saved ${plain.messageTokens - circeMessageTokens} tok over plain DAEDALUS; ${canon.notes}`,
        };
      }
    }
  }

  return best;
}

/* ---------------------------------------------------------------------------
 * DECODE — total dispatch on the first character; unambiguous by
 *    construction (see the collision branch in circeEncode above, and
 *    bench/circe-redteam.ts's totality/adversarial gates).
 * ------------------------------------------------------------------------- */

/** Parse a leading "INV_MARK + direction('b'|'a') + 4 lowercase hex
 *  digits" prefix, if present. Total, never throws: any malformed
 *  near-match (wrong length, bad hex, bad direction letter) is simply
 *  treated as "no prefix" and left as ordinary text for downstream
 *  decoding, exactly the same non-throwing discipline as every other
 *  parse in this file. */
export function parseInvisiblePrefix(wire: string): { cp: number; direction: 'before' | 'after'; rest: string } | null {
  if (wire.length < 6 || wire[0] !== INV_MARK) return null;
  const dch = wire[1];
  if (dch !== 'b' && dch !== 'a') return null;
  const hex = wire.slice(2, 6);
  if (!/^[0-9a-f]{4}$/.test(hex)) return null;
  return { cp: parseInt(hex, 16), direction: dch === 'b' ? 'before' : 'after', rest: wire.slice(6) };
}

export function circeDecode(wire: string): string {
  if (wire.length === 0) return wire;
  const inv = parseInvisiblePrefix(wire);
  const body = inv ? inv.rest : wire;
  const decodedBody = ((): string => {
    if (body.length === 0) return body;
    const first = body[0];
    if (first === CIRCE_MARK) {
      const rest = body.slice(1);
      const candidate = daedalusDecode(rest);
      return circeRestoreSpans(candidate);
    }
    if (first === CIRCE_ESCAPE) {
      const rest = body.slice(1);
      return daedalusDecode(rest);
    }
    return daedalusDecode(body);
  })();
  return inv ? restoreInvisibleGuard(decodedBody, inv.cp, inv.direction) : decodedBody;
}

/** Given a COMPLETE circe wire (as produced by circeEncode: optionally
 *  prefixed with an invisible-guard flag, then CIRCE_MARK or
 *  CIRCE_ESCAPE), returns the full, self-contained, single-message text a
 *  bare LLM needs. Mirrors the exact construction circeEncode uses
 *  internally. */
export function circeDecoderPrompt(wire: string): string {
  const inv = parseInvisiblePrefix(wire);
  const invPrefixText = inv ? wire.slice(0, 6) : '';
  const body = inv ? inv.rest : wire;

  if (body.length > 0 && (body[0] === CIRCE_MARK || body[0] === CIRCE_ESCAPE)) {
    const inner = body.slice(1);
    const innerPrompt = inner.startsWith(CHIRON_START) && daedalusDecode(inner) !== inner
      ? daedalusDecoderPrompt(inner)
      : inner;
    if (body[0] === CIRCE_ESCAPE) {
      const escTail = inv ? `${CIRCE_TAIL_ESCAPE} ${invisibleGuardClause()}` : CIRCE_TAIL_ESCAPE;
      return `${invPrefixText}${body[0]}${innerPrompt}\n${escTail}`;
    }
    const hasNamed = inner.includes(NAMED_MARK);
    const hasDec = inner.includes(DEC_MARK);
    const hasHex = inner.includes(HEX_MARK);
    const hasPct = inner.includes(PCT_MARK);
    const tail = circeTailInstruction(hasNamed, hasDec, hasHex, hasPct);
    const fullTail = inv ? `${tail} ${invisibleGuardClause()}` : tail;
    return `${invPrefixText}${body[0]}${innerPrompt}\n${fullTail}`;
  }
  if (inv) {
    // Invisible-guard flag present but no per-span markers at all (rare:
    // the guard alone was worth applying with no other restoration).
    const innerPrompt = body.startsWith(CHIRON_START) && daedalusDecode(body) !== body ? daedalusDecoderPrompt(body) : body;
    return `${invPrefixText}${innerPrompt}\n${invisibleGuardClause()}`;
  }
  return wire.startsWith(CHIRON_START) && daedalusDecode(wire) !== wire ? daedalusDecoderPrompt(wire) : wire;
}
