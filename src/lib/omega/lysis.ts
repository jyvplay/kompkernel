/**
 * src/lib/omega/lysis.ts
 * =============================================================================
 * LYSIS-λ  (Greek λύσις — "a loosening, releasing, dissolution")
 * Escape-Sequence / Character-Reference Resolution Codec
 * (self-verifying · byte-exact · lossless · direct-reasoning · bare-LLM-readable)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE MEASURED, DOCUMENTED BLIND SPOT
 * ─────────────────────────────────────────────────────────────────────────────
 * Every existing codec in this repo operates on RENDERED Unicode (styled
 * alphabets, numerals, flags, ligatures…). None of them touch ESCAPE SEQUENCES —
 * the ASCII spellings of non-ASCII characters that dominate real ops / API /
 * i18n payloads and "hybrid prompt-output" prose:
 *
 *   - JSON `\uXXXX`  (json.dumps ensure_ascii=True — Python's DEFAULT)
 *   - HTML numeric character references `&#233;`, `&#8217;`
 *
 * These are catastrophically token-expensive. Measured on the live tokenizer
 * (o200k_base, `bench/lysis-redteam.ts`):
 *   `\u00e9`→é           4 tok → 1   (Δ3)
 *   `\ud83d\ude00`→😀     7 tok → 1   (Δ6)
 *   `&#8217;`→’          4 tok → 1   (Δ3)
 * and on real payloads: a Python `json.dumps` API body 49→22 tok (−55% before
 * the one-time contract); a Japanese i18n strings file 55→17 (−69%).
 *
 * This is not a toy. Real 2026 field reports of the SAME inflation:
 *   - QuantumNous/new-api PR #7369 & issue #7368 (Sep 2026): a 7,800-char Chinese
 *     payload costs 5,847 tok as `ensure_ascii=False` vs 31,515 tok as
 *     `ensure_ascii=True` — a 5.39× lossless-recoverable blow-up.
 *   - OpenAI dev-community (Feb 2026): the OpenAI backend forces ensure_ascii-style
 *     escaping on multi-tool-call messages → 10–15× bloat on KR/JA/ZH.
 *   - dacli #303 (Sep 2026): "ü is one or two tokens, while \u00fc is several".
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE RULE (no dictionary — the inverse is a closed-form transform LLMs know)
 * ─────────────────────────────────────────────────────────────────────────────
 * A `\uXXXX` escape is, by definition, the ASCII spelling of a code point
 * (surrogate pairs for astral). The inverse of "spell every non-ASCII char as
 * \uXXXX" is EXACTLY `json.dumps(…, ensure_ascii=True)` — a transform every
 * frontier LLM performs deterministically. Likewise `&#N;` ⇔ code point N.
 *
 * MECHANISM (VEXILLA/STOICHEIA-style: rule + self-verify, never a claim):
 *   1. Parse the input honoring backslash-escapes, so `\\u0041` (escaped
 *      backslash + literal "u0041") is NOT mistaken for an escape.
 *   2. Find maximal regions that contain ≥1 escape of one scheme and NO literal
 *      non-ASCII char (a literal non-ASCII would break the re-escape round trip).
 *   3. Decode the escapes in each region to their characters (surrogate pairs
 *      combined; delimiter code points left spelled-out) and wrap the region in
 *      `«J … »` (JSON) / `«H … »` (HTML). The wire is SHORTER **and more
 *      readable** (café, not caf\u00e9).
 *   4. Decode re-applies the scheme rule: inside a region, spell every non-ASCII
 *      code point back to the scheme form; everything else is literal.
 *   5. SELF-VERIFY GATE: emit a wire ONLY IF lysisDecode(wire) === input byte
 *      for byte AND the contract-inclusive message is strictly cheaper; else
 *      total identity. Savings are therefore never overstated.
 *   6. BARE-LLM CONTRACT: a ~12-token inline header (emitted once, only for the
 *      schemes present) lets a fresh chat reconstruct the exact bytes with NO
 *      system prompt, NO skills.md, NO tools.
 *
 * GROUNDING (real, published, ≤ 50 years, NEW this turn):
 *   - RFC 8259 (JSON) §7; ECMA-404. WHATWG HTML — numeric character references.
 *   - QuantumNous/new-api #7368/#7369 (2026); OpenAI dev-community 1375117 (2026);
 *     docToolchain/dacli #303 (2026): quantified 5–15× ensure_ascii inflation.
 * =============================================================================
 */

import { countTokens, type EncodingName } from './bpe';

/* --------------------------------------------------------------------------- */
/* 0. SENTINELS — each measured = 1 token in o200k_base and DISJOINT from every  */
/*    other codec's marks (STOICHEIA † ‡ ※ ¤ ; VEXILLA ¶ § ¬ ¦ ° ±).            */
/* --------------------------------------------------------------------------- */

export const LYSIS_MARK = '\u00AA';    // ª  "LYSIS applied"
export const LYSIS_ESCAPE = '\u00BA';  // º  "escaped, not applied"
export const LYSIS_OPEN = '\u00AB';    // «  region open (followed by scheme letter)
export const LYSIS_CLOSE = '\u00BB';   // »  region close

// Code points that must never appear *literally* in a decoded region body
// (they are structural). Escapes resolving to these are left spelled-out.
const RESERVED_CP = new Set<number>([0x00AA, 0x00BA, 0x00AB, 0x00BB]);

export const LYSIS_SYSTEM_PROMPT =
  'LYSIS-λ: byte-exact lossless decompressor. Drop a leading ª. For each region ' +
  '«J…» re-escape every non-ASCII character as a JSON \\uXXXX escape (surrogate ' +
  'pairs for code points above U+FFFF, lowercase hex); for each region «H…» ' +
  're-escape every non-ASCII character as an HTML decimal reference &#N;. Text ' +
  'outside regions, and all ASCII inside regions, is literal and unchanged.';

/* --------------------------------------------------------------------------- */
/* 1. SCHEME RE-ESCAPE RULES (the decode-side transforms)                       */
/* --------------------------------------------------------------------------- */

function reEscapeJson(body: string): string {
  let out = '';
  for (const ch of body) {
    const cp = ch.codePointAt(0)!;
    if (cp < 0x80) { out += ch; continue; }
    if (cp <= 0xFFFF) { out += '\\u' + cp.toString(16).padStart(4, '0'); continue; }
    const v = cp - 0x10000;
    out += '\\u' + (0xD800 + (v >> 10)).toString(16).padStart(4, '0');
    out += '\\u' + (0xDC00 + (v & 0x3FF)).toString(16).padStart(4, '0');
  }
  return out;
}

function reEscapeHtml(body: string): string {
  let out = '';
  for (const ch of body) {
    const cp = ch.codePointAt(0)!;
    out += cp < 0x80 ? ch : '&#' + cp.toString(10) + ';';
  }
  return out;
}

/* --------------------------------------------------------------------------- */
/* 2. PARSE + REGION DISCOVERY (encode side). Total; never throws.              */
/* --------------------------------------------------------------------------- */

type Scheme = 'J' | 'H';

/** An atom of the source stream, honoring backslash-escape boundaries. */
interface Atom {
  raw: string;          // exact source bytes of the atom
  esc: Scheme | null;   // which scheme this atom is a foldable escape of (else null)
  cp: number | null;    // code point if this is a resolvable escape
  literalNonAscii: boolean;
}

const HEX4 = /^[0-9a-fA-F]{4}$/;

function parseAtoms(text: string): Atom[] {
  const atoms: Atom[] = [];
  let i = 0;
  const n = text.length;
  while (i < n) {
    const c = text[i];

    // JSON \uXXXX (with backslash-escape awareness)
    if (c === '\\' && i + 1 < n) {
      if (text[i + 1] === 'u' && i + 6 <= n && HEX4.test(text.slice(i + 2, i + 6))) {
        const cp = parseInt(text.slice(i + 2, i + 6), 16);
        atoms.push({ raw: text.slice(i, i + 6), esc: 'J', cp, literalNonAscii: false });
        i += 6; continue;
      }
      // any other backslash pair (\\ \" \/ \n \t \b \f \r …) — literal 2-char atom
      atoms.push({ raw: text.slice(i, i + 2), esc: null, cp: null, literalNonAscii: false });
      i += 2; continue;
    }

    // HTML numeric decimal reference &#N;
    if (c === '&' && text[i + 1] === '#' && text[i + 2] >= '0' && text[i + 2] <= '9') {
      let j = i + 2;
      while (j < n && text[j] >= '0' && text[j] <= '9') j++;
      if (j < n && text[j] === ';' && j - (i + 2) <= 7) {
        const cp = parseInt(text.slice(i + 2, j), 10);
        if (cp >= 0 && cp <= 0x10FFFF) {
          atoms.push({ raw: text.slice(i, j + 1), esc: 'H', cp, literalNonAscii: false });
          i = j + 1; continue;
        }
      }
    }

    // ordinary character (may be astral)
    const cpFull = text.codePointAt(i)!;
    const w = cpFull > 0xFFFF ? 2 : 1;
    atoms.push({ raw: text.slice(i, i + w), esc: null, cp: null, literalNonAscii: cpFull >= 0x80 });
    i += w;
  }
  return atoms;
}

interface Region { startAtom: number; endAtom: number; scheme: Scheme; }

/** Maximal runs with ≥1 foldable escape of a single scheme and no literal non-ASCII. */
function findRegions(atoms: Atom[]): Region[] {
  const regions: Region[] = [];
  let i = 0;
  while (i < atoms.length) {
    const a = atoms[i];
    if (a.esc && !a.literalNonAscii) {
      const scheme = a.esc;
      let j = i;
      let sawEscape = false;
      while (j < atoms.length) {
        const b = atoms[j];
        if (b.literalNonAscii) break;                 // literal non-ASCII breaks the region
        if (b.esc && b.esc !== scheme) break;         // a different scheme breaks the region
        if (b.esc === scheme) sawEscape = true;
        j++;
      }
      if (sawEscape) regions.push({ startAtom: i, endAtom: j, scheme });
      i = j > i ? j : i + 1;
      continue;
    }
    i++;
  }
  return regions;
}

/** Build the decoded body of a region (escapes → chars; delimiter cps left spelled). */
function decodeRegionBody(atoms: Atom[], r: Region): string {
  let body = '';
  let k = r.startAtom;
  while (k < r.endAtom) {
    const a = atoms[k];
    if (a.esc === r.scheme && a.cp !== null) {
      // JSON high surrogate + following low surrogate → astral char
      if (r.scheme === 'J' && a.cp >= 0xD800 && a.cp <= 0xDBFF && k + 1 < r.endAtom) {
        const nx = atoms[k + 1];
        if (nx.esc === 'J' && nx.cp !== null && nx.cp >= 0xDC00 && nx.cp <= 0xDFFF) {
          const astral = 0x10000 + ((a.cp - 0xD800) << 10) + (nx.cp - 0xDC00);
          if (!RESERVED_CP.has(astral)) { body += String.fromCodePoint(astral); k += 2; continue; }
        }
      }
      if (RESERVED_CP.has(a.cp)) { body += a.raw; k++; continue; }  // keep spelled-out
      // lone surrogate (no pair) — keep spelled-out to stay well-formed
      if (a.cp >= 0xD800 && a.cp <= 0xDFFF) { body += a.raw; k++; continue; }
      body += String.fromCodePoint(a.cp); k++; continue;
    }
    body += a.raw; k++;
  }
  return body;
}

/* --------------------------------------------------------------------------- */
/* 3. TRANSFORM (real-tokenizer-verified, greedy region acceptance)             */
/* --------------------------------------------------------------------------- */

function buildWireBody(text: string, atoms: Atom[], regions: Region[]): string {
  // atom index → source char offset
  const offsets: number[] = [];
  let off = 0;
  for (const a of atoms) { offsets.push(off); off += a.raw.length; }
  offsets.push(off);

  let out = '';
  let cursor = 0;
  for (const r of regions) {
    out += text.slice(cursor, offsets[r.startAtom]);
    out += LYSIS_OPEN + r.scheme + decodeRegionBody(atoms, r) + LYSIS_CLOSE;
    cursor = offsets[r.endAtom];
  }
  out += text.slice(cursor);
  return out;
}

function transform(text: string, enc: EncodingName): { candidate: string; regions: Region[]; schemes: Set<Scheme> } {
  const atoms = parseAtoms(text);
  const all = findRegions(atoms);
  if (all.length === 0) return { candidate: text, regions: [], schemes: new Set() };

  // Try full set first; fall back to greedy per-region acceptance (all gated on
  // exact round trip + real token reduction).
  const full = buildWireBody(text, atoms, all);
  const baseTok = countTokens(text, enc);
  if (restoreWireBody(full) === text && countTokens(full, enc) < baseTok) {
    return { candidate: full, regions: all, schemes: new Set(all.map((r) => r.scheme)) };
  }

  const accepted: Region[] = [];
  let workingTok = baseTok;
  for (const r of all) {
    const trial = [...accepted, r].sort((a, b) => a.startAtom - b.startAtom);
    const cand = buildWireBody(text, atoms, trial);
    if (restoreWireBody(cand) !== text) continue;
    const t = countTokens(cand, enc);
    if (t < workingTok) { accepted.push(r); workingTok = t; }
  }
  const cand = buildWireBody(text, atoms, accepted.sort((a, b) => a.startAtom - b.startAtom));
  return { candidate: cand, regions: accepted, schemes: new Set(accepted.map((r) => r.scheme)) };
}

/* --------------------------------------------------------------------------- */
/* 4. RESTORE (decode side). Total; delimiter chars cannot occur in a body.     */
/* --------------------------------------------------------------------------- */

export function restoreWireBody(wire: string): string {
  let out = '';
  let i = 0;
  const n = wire.length;
  while (i < n) {
    const ch = wire[i];
    if (ch === LYSIS_OPEN && i + 1 < n && (wire[i + 1] === 'J' || wire[i + 1] === 'H')) {
      const scheme = wire[i + 1] as Scheme;
      const close = wire.indexOf(LYSIS_CLOSE, i + 2);
      if (close === -1) { out += ch; i++; continue; }
      const body = wire.slice(i + 2, close);
      out += scheme === 'J' ? reEscapeJson(body) : reEscapeHtml(body);
      i = close + 1; continue;
    }
    out += ch; i++;
  }
  return out;
}

/* --------------------------------------------------------------------------- */
/* 5. INLINE BARE-LLM CONTRACT (scheme-scoped, ~12 tok, emitted once)           */
/* --------------------------------------------------------------------------- */

function contractFor(schemes: Set<Scheme>): string {
  const clauses: string[] = [];
  if (schemes.has('J')) clauses.push(`${LYSIS_OPEN}J${LYSIS_CLOSE}non-ASCII→\\uXXXX`);
  if (schemes.has('H')) clauses.push(`${LYSIS_OPEN}H${LYSIS_CLOSE}non-ASCII→&#N;`);
  return clauses.join('; ');
}

/* --------------------------------------------------------------------------- */
/* 6. ENCODE / DECODE                                                           */
/* --------------------------------------------------------------------------- */

export interface LysisResult {
  codec: 'lysis';
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
  jsonRegions: number;
  htmlRegions: number;
  escapesFolded: number;
  decoderPrompt: string;
  notes: string;
  ms: number;
}

export function lysisEncode(text: string, enc: EncodingName = 'o200k_base'): LysisResult {
  const started = Date.now();
  const inTokens = countTokens(text, enc);

  const identity = (reason: string): LysisResult => {
    const collision = text.length > 0 && (text[0] === LYSIS_MARK || text[0] === LYSIS_ESCAPE);
    const wire = collision ? LYSIS_ESCAPE + text : text;
    const messageTokens = collision ? countTokens(wire, enc) : inTokens;
    return {
      codec: 'lysis', wire, decoded: text, exact: true, inTokens,
      outTokens: messageTokens, messageTokens, contractTokens: 0, savingsPct: 0,
      applied: false, regions: 0, jsonRegions: 0, htmlRegions: 0, escapesFolded: 0,
      decoderPrompt: '', notes: `lysis: not applied (${reason})`, ms: Date.now() - started,
    };
  };

  if (text.length === 0) return identity('empty input');

  const { candidate, regions, schemes } = transform(text, enc);
  if (regions.length === 0 || candidate === text) return identity('no foldable escape region found');

  const wire = LYSIS_MARK + candidate;
  if (lysisDecode(wire) !== text) return identity('region verification failed — passthrough for exactness');

  const contract = contractFor(schemes);
  const message = contract + '\n' + wire;
  const messageTokens = countTokens(message, enc);
  if (messageTokens >= inTokens) return identity('verified but inline contract overhead not amortized on this input');

  // count folded escapes (audit only)
  let escapesFolded = 0;
  const atoms = parseAtoms(text);
  for (const r of regions) for (let k = r.startAtom; k < r.endAtom; k++) if (atoms[k].esc === r.scheme) escapesFolded++;
  let jsonRegions = 0, htmlRegions = 0;
  for (const r of regions) (r.scheme === 'J' ? jsonRegions++ : htmlRegions++);

  return {
    codec: 'lysis', wire, decoded: text, exact: true, inTokens,
    outTokens: countTokens(wire, enc), messageTokens,
    contractTokens: countTokens(contract + '\n', enc),
    savingsPct: inTokens > 0 ? ((inTokens - messageTokens) / inTokens) * 100 : 0,
    applied: true, regions: regions.length, jsonRegions, htmlRegions, escapesFolded,
    decoderPrompt: contract,
    notes: `lysis: applied, ${jsonRegions} JSON + ${htmlRegions} HTML region(s), ${escapesFolded} escape(s) resolved; message ${messageTokens} vs raw ${inTokens} tok (saved ${inTokens - messageTokens})`,
    ms: Date.now() - started,
  };
}

/** Total decoder. Only a MARK-prefixed wire is transformed; ESCAPE is stripped. */
export function lysisDecode(wire: string): string {
  if (wire.length === 0) return wire;
  if (wire[0] === LYSIS_MARK) return restoreWireBody(wire.slice(1));
  if (wire[0] === LYSIS_ESCAPE) return wire.slice(1);
  return wire;
}

export function lysisDecoderPrompt(wire: string): string {
  if (wire.length === 0 || wire[0] !== LYSIS_MARK) return '';
  const schemes = new Set<Scheme>();
  const body = wire.slice(1);
  for (let i = 0; i < body.length; i++) {
    if (body[i] === LYSIS_OPEN && (body[i + 1] === 'J' || body[i + 1] === 'H')) schemes.add(body[i + 1] as Scheme);
  }
  return contractFor(schemes);
}
