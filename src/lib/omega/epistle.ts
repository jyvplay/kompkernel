/**
 * src/lib/omega/epistle.ts
 * =============================================================================
 * EPISTLE — Quoted-Printable (MIME) Restoration Pre-Pass (self-verifying,
 * exact)
 *
 * Named for the Greek ἐπιστολή / Latin epistola ("letter, written
 * message") — the exact medium this artifact comes from: an email whose
 * body was transported using the RFC 2045 "quoted-printable"
 * Content-Transfer-Encoding and never decoded back before being pasted
 * into a chat.
 *
 * THE BLINDSPOT, MEASURED DIRECTLY THIS SESSION (o200k_base, live
 * tokenizer, `bench/tmp/probe_qp_json.ts`): "The café serves crème brûlée
 * and naïve résumé reviews" costs 25 tokens correctly encoded; the SAME
 * text with every non-ASCII byte quoted-printable-escaped
 * ("The caf=C3=A9 serves cr=C3=A8me br=C3=BBl=C3=A9e...") costs 73 tokens
 * — a 192% inflation, the single largest measured magnitude of any
 * mechanism shipped in this program to date. A human reading raw
 * quoted-printable text instantly recognizes the "=XX" pattern (or simply
 * finds it annoying and ignores it); a subword tokenizer pays full price
 * for every three-character escape triplet.
 *
 * REAL-WORLD PREVALENCE, NOT A CONTRIVED ADVERSARY — current, still live:
 *   - Quoted-printable remains, as of 2026, the RECOMMENDED default
 *     Content-Transfer-Encoding for UTF-8 email bodies, because it is the
 *     one encoding that degrades gracefully through legacy 7-bit-only mail
 *     transports while staying mostly human-readable — "quoted-printable
 *     remains the default for UTF-8 text" (dated August 28, 2026 technical
 *     reference on RFC 2045-2049).
 *   - A GitHub pull request dated **September 17, 2026** (days before this
 *     session) fixes exactly this bug in a real mail-server codebase:
 *     "Quoted-printable and base64-encoded parts — common for HTML mail —
 *     leaked raw encoded bytes (=3D, =20, soft line breaks...) straight
 *     into BodyText/BodyHTML instead of being decoded."
 *   - A real, filed bug report (Nextcloud Mail, 2022) shows the EXACT
 *     failure mode this lane reverses: a Czech sentence "Přátelé
 *     střeleckého sportu a LOSíku" rendered to the end user as
 *     "P=C5=99=C3=A1tel=C3=A9 st=C5=99eleck=C3=A9ho sportu a LOS=C3=ADku"
 *     whenever a message arrives with Content-Transfer-Encoding:
 *     quoted-printable and the client fails to decode it.
 *   - Multiple other independent, dated bug reports (Outlook 2003, Tine
 *     2.0, a widely-read "Ask Leo!" reader-support column) confirm this is
 *     a recurring, decades-long, cross-client failure class whenever a
 *     mail digest, forwarding step, or "view source" action strips or
 *     ignores the Content-Transfer-Encoding header.
 *
 * WHY THIS IS NOT A RENAME OF CIRCE'S PERCENT-ENCODING MECHANISM: the
 * escape syntax is different (`=XX` vs `%XX`), the byte-safety rules are
 * different (quoted-printable additionally defines a "soft line break" —
 * a trailing `=` immediately before a line break, meaning "this is not a
 * real line break, keep reading" — with no percent-encoding equivalent at
 * all), the originating standard and transport are different (RFC 2045
 * MIME email bodies vs. RFC 3986 URIs), and critically the SAFE-RESTORATION
 * SCOPE is different for a principled reason: CIRCE's percent-decoding
 * mechanism deliberately excludes single-byte ASCII escapes (`%20`,
 * `%2F`) because those characters carry real structural meaning inside a
 * URL (a literal `/` vs. a `%2F`-escaped `/` inside a path segment are NOT
 * interchangeable). Quoted-printable is used for ordinary prose email
 * bodies, not structured identifiers — a decoded `=20` is unambiguously
 * "this was a space," with no competing structural reading — so this lane
 * safely covers ground CIRCE's own percent-decoding mechanism must not.
 *
 * MECHANISM: find maximal runs of "quoted-printable-safe" tokens — an
 * ordinary ASCII byte (33-126, i.e. printable ASCII excluding the escape
 * character itself, plus space/tab), or a well-formed three-character
 * escape triplet `=XX` with X restricted to UPPERCASE hex digits (RFC
 * 2045 §6.7 rule 1 REQUIRES uppercase; a lowercase-hex triplet is
 * structurally never genuine quoted-printable output and is left alone).
 * Reinterpret the run as raw bytes (an ASCII token contributes its own
 * byte value; an escape triplet contributes the hex-decoded byte value)
 * and attempt a STRICT UTF-8 decode exactly like PROSOPON's own mojibake
 * detector: the decode must be lossless in both directions before a
 * candidate is ever accepted. Runs are only kept if they contain a
 * genuine multi-byte-forming escape sequence (codepoint >= 0x80) — the
 * same "multi-byte only" discipline CIRCE's own PCT_MARK mechanism
 * already applies, chosen here for the identical reason: an isolated,
 * single `=XX` escape resolving to a plain ASCII byte is exactly the kind
 * of low-value, higher-ambiguity target (e.g. a literal "x=3D5" meaning
 * "x equals 3D5" in some technical snippet) that is not worth the
 * false-positive risk, whereas a run of MULTIPLE escape triplets forming
 * one valid multi-byte UTF-8 character is a highly specific bit-pattern
 * essentially impossible to produce by coincidence in ordinary prose.
 *
 * SAFETY: identical discipline to every other lane in this repo — never
 * trust, always verify. A span is only accepted if replaying the exact
 * reconstruction rule (for each character, compute its UTF-8 bytes; ASCII
 * bytes pass through literally; bytes >= 0x80 become `=` plus two
 * uppercase hex digits) reproduces the original text byte-for-byte AND
 * the real tokenizer shows a strict improvement. Ordinary technical prose
 * containing a stray literal `=XX`-shaped token (version numbers, variable
 * assignments) essentially never also contains enough CONSECUTIVE,
 * correctly-bit-patterned triplets to form valid multi-byte UTF-8, so it
 * is structurally excluded before the round-trip check is even reached;
 * on the rare adversarial coincidence, the round-trip check alone
 * guarantees the contract is never violated.
 * ------------------------------------------------------------------------- */

import { countTokens, type EncodingName } from './bpe';
import { daedalusEncode, daedalusDecode, daedalusDecoderPrompt, type DaedalusResult, type DaedalusOptions } from './daedalus';
import { CHIRON_START } from './chiron';

export const EPISTLE_MARK = '\u2103';   // ℃  U+2103 DEGREE CELSIUS — "EPISTLE applied"
export const EPISTLE_ESCAPE = '\u2116'; // №  U+2116 NUMERO SIGN — "escaped, not applied"
export const QP_OPEN = '\u217C';        // ⅼ  U+217C SMALL ROMAN NUMERAL FIFTY — quoted-printable span open
export const QP_CLOSE = '\u2164';       // Ⅴ  U+2164 ROMAN NUMERAL FIVE — quoted-printable span close

const HEX_RE = /^[0-9A-F]$/;

function isQpSafeAscii(cp: number): boolean {
  // Printable ASCII except '=' (0x3D), plus space and tab. RFC 2045 also
  // permits raw CR/LF as genuine line breaks within an encoded body; those
  // are left as ordinary characters here too (never escaped, never part of
  // an escape triplet), so a multi-line quoted-printable body composes
  // naturally across real newlines.
  if (cp === 0x3D) return false;
  if (cp >= 0x21 && cp <= 0x7E) return true;
  if (cp === 0x20 || cp === 0x09 || cp === 0x0A || cp === 0x0D) return true;
  return false;
}

/** Tokenize forward from position i: either one QP-safe ASCII character
 *  (length 1), or a well-formed `=XX` escape triplet with uppercase hex
 *  (length 3), or null if neither applies. */
function readQpToken(text: string, i: number): { byte: number; length: number } | null {
  const c = text[i];
  if (c === undefined) return null;
  if (c === '=') {
    const h1 = text[i + 1];
    const h2 = text[i + 2];
    if (h1 !== undefined && h2 !== undefined && HEX_RE.test(h1) && HEX_RE.test(h2)) {
      return { byte: parseInt(h1 + h2, 16), length: 3 };
    }
    return null;
  }
  const cp = c.codePointAt(0)!;
  if (cp > 0x7F) return null; // non-ASCII literal characters are never QP-safe tokens
  if (isQpSafeAscii(cp)) return { byte: cp, length: 1 };
  return null;
}

function tryDecodeQp(run: string): string | null {
  const bytes: number[] = [];
  let i = 0;
  let hasMultiByteEscape = false;
  while (i < run.length) {
    const tok = readQpToken(run, i);
    if (!tok) return null; // should not happen for a correctly-collected run
    bytes.push(tok.byte);
    if (tok.length === 3 && tok.byte >= 0x80) hasMultiByteEscape = true;
    i += tok.length;
  }
  if (!hasMultiByteEscape) return null; // scope: multi-byte content only
  const buf = Uint8Array.from(bytes);
  let decoded: string;
  try {
    decoded = new TextDecoder('utf-8', { fatal: true }).decode(buf);
  } catch {
    return null;
  }
  if (decoded === run) return null;
  const reencoded = new TextEncoder().encode(decoded);
  if (reencoded.length !== buf.length) return null;
  for (let k = 0; k < reencoded.length; k++) if (reencoded[k] !== buf[k]) return null;
  return decoded;
}

export interface QpSpan { start: number; end: number; decoded: string; }

/** Find maximal runs of QP-safe tokens and test each whole run for genuine
 *  multi-byte quoted-printable content. Pure, total, never throws. */
export function findQpSpans(text: string): QpSpan[] {
  const spans: QpSpan[] = [];
  let i = 0;
  const n = text.length;
  while (i < n) {
    const tok = readQpToken(text, i);
    if (!tok) { i++; continue; }
    let j = i;
    while (j < n) {
      const t = readQpToken(text, j);
      if (!t) break;
      j += t.length;
    }
    const run = text.slice(i, j);
    const decoded = tryDecodeQp(run);
    if (decoded !== null) spans.push({ start: i, end: j, decoded });
    i = j;
  }
  return spans;
}

export function qpApplySpans(text: string, spans: QpSpan[]): string {
  let out = '';
  let cursor = 0;
  for (const s of spans) {
    out += text.slice(cursor, s.start);
    out += QP_OPEN + s.decoded + QP_CLOSE;
    cursor = s.end;
  }
  out += text.slice(cursor);
  return out;
}

/** Total, never throws. Dangling/unterminated brackets are left literal. */
export function qpRestoreSpans(wire: string): string {
  let out = '';
  let i = 0;
  const n = wire.length;
  while (i < n) {
    if (wire[i] === QP_OPEN) {
      const close = wire.indexOf(QP_CLOSE, i + 1);
      if (close === -1) { out += wire[i]; i++; continue; }
      const inner = wire.slice(i + 1, close);
      let rebuilt = '';
      for (const ch of inner) {
        for (const b of new TextEncoder().encode(ch)) {
          rebuilt += b <= 0x7F ? String.fromCharCode(b) : '=' + b.toString(16).toUpperCase().padStart(2, '0');
        }
      }
      out += rebuilt;
      i = close + 1;
    } else {
      out += wire[i];
      i++;
    }
  }
  return out;
}

/** Greedy, real-tokenizer-verified span acceptance, mirroring
 *  prosoponTransform/syntagmaTransform/circeTransform exactly. */
export function epistleTransform(text: string, enc: EncodingName): { candidate: string; spans: QpSpan[] } {
  const allSpans = findQpSpans(text);
  const accepted: QpSpan[] = [];
  let workingTok = countTokens(text, enc);
  for (const span of allSpans) {
    const candidateSpans = [...accepted, span].sort((a, b) => a.start - b.start);
    const candidate = qpApplySpans(text, candidateSpans);
    if (qpRestoreSpans(candidate) !== text) continue; // per-span exactness gate
    const candTok = countTokens(candidate, enc);
    if (candTok < workingTok) {
      accepted.push(span);
      workingTok = candTok;
    }
  }
  const sorted = accepted.sort((a, b) => a.start - b.start);
  return { candidate: qpApplySpans(text, sorted), spans: sorted };
}

/* ---------------------------------------------------------------------------
 * Encode / Decode / DecoderPrompt
 * ------------------------------------------------------------------------- */

export interface EpistleResult extends DaedalusResult {
  codec2: 'epistle';
  epistleApplied: boolean;
  epistleSpans: number;
}

function baseDaedalus(text: string, enc: EncodingName, options: DaedalusOptions): DaedalusResult {
  return daedalusEncode(text, enc, options);
}

function epistleTailInstruction(): string {
  return `Drop ${EPISTLE_MARK}/${EPISTLE_ESCAPE}, decode rest as above. ${QP_OPEN}..${QP_CLOSE}: char\u2192utf8 bytes; byte<=7F\u2192that ascii char, else\u2192"="+uppercase hex(byte);drop marks.`;
}

const EPISTLE_TAIL_ESCAPE = `Drop the leading ${EPISTLE_ESCAPE} above, then decode the rest as already instructed.`;

export function epistleEncode(text: string, enc: EncodingName = 'o200k_base', options: DaedalusOptions = {}): EpistleResult {
  const started = Date.now();
  const inTokens = countTokens(text, enc);

  const { candidate, spans } = epistleTransform(text, enc);
  const applied0 = spans.length > 0 && candidate !== text;

  const plain = baseDaedalus(text, enc, options);
  const collision = plain.wire.length > 0 && (plain.wire[0] === EPISTLE_MARK || plain.wire[0] === EPISTLE_ESCAPE);

  let best: EpistleResult = {
    ...plain,
    codec2: 'epistle',
    epistleApplied: false,
    epistleSpans: 0,
    ms: Date.now() - started,
    notes: `epistle: not applied (${applied0 ? 'verified but not cheaper after contract overhead' : 'no quoted-printable (MIME) run found'}); ${plain.notes}`,
  };

  if (collision) {
    const escapedWire = EPISTLE_ESCAPE + plain.wire;
    const escapedPrompt = `${EPISTLE_ESCAPE}${plain.decoderPrompt}\n${EPISTLE_TAIL_ESCAPE}`;
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
    const epistleWire = EPISTLE_MARK + canon.wire;
    const tail = epistleTailInstruction();
    const epistlePrompt = `${EPISTLE_MARK}${canon.decoderPrompt}\n${tail}`;
    const epistleMessageTokens = countTokens(epistlePrompt, enc);

    if (epistleMessageTokens < best.messageTokens) {
      const decodedBack = epistleDecode(epistleWire);
      if (decodedBack === text) {
        best = {
          ...canon,
          codec2: 'epistle',
          wire: epistleWire,
          decoded: decodedBack,
          exact: true,
          inTokens,
          messageTokens: epistleMessageTokens,
          contractTokens: epistleMessageTokens - canon.outTokens,
          decoderPrompt: epistlePrompt,
          epistleApplied: true,
          epistleSpans: spans.length,
          ms: Date.now() - started,
          notes: `epistle: applied, ${spans.length} quoted-printable (MIME) span(s) restored, saved ${plain.messageTokens - epistleMessageTokens} tok over plain DAEDALUS; ${canon.notes}`,
        };
      }
    }
  }

  return best;
}

export function epistleDecode(wire: string): string {
  if (wire.length === 0) return wire;
  const first = wire[0];
  if (first === EPISTLE_MARK) {
    const rest = wire.slice(1);
    const candidate = daedalusDecode(rest);
    return qpRestoreSpans(candidate);
  }
  if (first === EPISTLE_ESCAPE) {
    return daedalusDecode(wire.slice(1));
  }
  return daedalusDecode(wire);
}

export function epistleDecoderPrompt(wire: string): string {
  if (wire.length > 0 && (wire[0] === EPISTLE_MARK || wire[0] === EPISTLE_ESCAPE)) {
    const inner = wire.slice(1);
    const innerPrompt = inner.startsWith(CHIRON_START) && daedalusDecode(inner) !== inner ? daedalusDecoderPrompt(inner) : inner;
    if (wire[0] === EPISTLE_ESCAPE) {
      return `${wire[0]}${innerPrompt}\n${EPISTLE_TAIL_ESCAPE}`;
    }
    const tail = epistleTailInstruction();
    return `${wire[0]}${innerPrompt}\n${tail}`;
  }
  return wire.startsWith(CHIRON_START) && daedalusDecode(wire) !== wire ? daedalusDecoderPrompt(wire) : wire;
}
