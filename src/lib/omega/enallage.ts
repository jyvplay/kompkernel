/**
 * src/lib/omega/enallage.ts — X115. ΕΝΑΛΛΑΓΗ (enallage), "an exchange".
 * =============================================================================
 *
 * THE MECHANISM: RADIX REINTERPRETATION OF A FIXED-WIDTH BIT FIELD
 * -----------------------------------------------------------------------------
 * A Unix `ls -l` permission field is a 10-character SYMBOLIC rendering of a
 * 12-bit number: one file-type character plus three owner/group/other triples,
 * with the three special bits rendered as s/S/t/T in the execute positions.
 * The same information has a canonical 4-digit OCTAL rendering (`0644`, `4755`,
 * `1777`) that every operating-systems reader already knows. This codec exchanges
 * the symbolic rendering for the octal one BEFORE the parent frontier sees the
 * text, so the parent's dictionary/tape/column machinery prices the shorter
 * representation. The in-band contract tells the reader to exchange it back.
 *
 * This is not a dictionary substitution (the octal form is not a repeated span
 * of the source), not a numeric predictor (no row arithmetic), and not a glyph
 * macro (no new tape operator). It is a bijection between two standard radix
 * renderings of the same bit field, applied only where the field is unambiguous.
 *
 * GREEDY? No. The rewrite is a total line-local function; the only decision is
 * FIRE or NOT, made by measuring the COMPLETE message through the parent
 * frontier and admitting only a strict, byte-exact win.
 *
 * TIME/CPU: CPU-bound. The rewrite is O(lines); no wall clock is read by any
 * decision. The dominant cost is the inherited parent frontier encode of the
 * rewritten text.
 *
 * SOURCE CITATION (honest). The symbolic↔octal permission bijection is standard
 * POSIX `chmod`/`ls` folklore, not a paper contribution. The one-chat gated
 * candidate construction is this repository's X74 admission discipline. The
 * radix-exchange framing and its measurement here are original to X115.
 *
 * GATES
 *   G1  domain      only line-start `[dlcbps-]` + 9 symbolic mode chars followed
 *                   by a space are rewritten; anything else is untouched.
 *   G2  ambiguity   if ANY source line already starts with an octal-form field
 *                   `[dlcbps-][0-7]{4} `, the whole rewrite is refused, so the
 *                   decoder can never confuse payload with the exchange.
 *   G3  own inverse the independent octal→symbolic decoder reproduces the source
 *                   byte for byte, including s/S/t/T and the file-type char.
 *   G4  composition the parent frontier must reproduce the REWRITTEN text
 *                   exactly (a different input from the source it validated).
 *   G5  strict win  countTokens(contract + LF + inner.message) < incumbent,
 *                   measured in this process, or refuse.
 */

import { countTokens, type EncodingName } from './bpe';
import { tagstackFrontier, type TagstackResult } from './tagstack';

export const ENALLAGE_KEY =
  'Body first. ^Tnnnn␠→T+chmod.';

const MODE_RE = /^([dlcbps-])([r-][w-][xsS-][r-][w-][xsS-][r-][w-][xtT-])(?= )/;
const OCTAL_RE = /^([dlcbps-])([0-7]{4})(?= )/;
const MODE_GLOBAL = new RegExp(MODE_RE.source, 'gm');
const OCTAL_GLOBAL = new RegExp(OCTAL_RE.source, 'gm');

export function enallageDisabled(): boolean {
  if (typeof process === 'undefined') return false;
  return process.env?.OMEGA_ENALLAGE === '0'
    || process.env?.OMEGA_ENALLAGE === 'false'
    || process.env?.OMEGA_NO_ENALLAGE === '1';
}

export interface EnallageResult {
  codec: 'enallage';
  wire: string;
  message: string;
  decoded: string;
  exact: boolean;
  applied: boolean;
  hits: number;
  contractTokens: number;
  messageTokens: number;
  frontierTokens: number;
  frontierParent: string;
  notes: string;
}

/** Symbolic 9-char mode -> 4 octal digits. Total on the regex domain. */
export function enallageSymbolicToOctal(type: string, sym: string): string | null {
  if (sym.length !== 9) return null;
  let special = 0;
  const triples: string[] = [];
  for (let i = 0; i < 3; i++) {
    const a = sym[i * 3]!, b = sym[i * 3 + 1]!, c = sym[i * 3 + 2]!;
    if (a !== 'r' && a !== '-') return null;
    if (b !== 'w' && b !== '-') return null;
    let v = (a === 'r' ? 4 : 0) + (b === 'w' ? 2 : 0);
    if (i === 0 && (c === 's' || c === 'S')) special |= 4;
    if (i === 1 && (c === 's' || c === 'S')) special |= 2;
    if (i === 2 && (c === 't' || c === 'T')) special |= 1;
    const exec = c === 'x' || c === 's' || c === 't';
    if (!exec && c !== '-' && c !== 'S' && c !== 'T') return null;
    v += exec ? 1 : 0;
    triples.push(String(v));
  }
  return type + special + triples.join('');
}

/** Independent decoder: 4 octal digits -> symbolic 9-char mode. */
export function enallageOctalToSymbolic(type: string, digits: string): string | null {
  if (!/^[0-7]{4}$/.test(digits)) return null;
  const special = Number(digits[0]);
  let out = '';
  for (let i = 0; i < 3; i++) {
    const v = Number(digits[i + 1]);
    out += v & 4 ? 'r' : '-';
    out += v & 2 ? 'w' : '-';
    const exec = (v & 1) !== 0;
    if (i === 0 && (special & 4)) out += exec ? 's' : 'S';
    else if (i === 1 && (special & 2)) out += exec ? 's' : 'S';
    else if (i === 2 && (special & 1)) out += exec ? 't' : 'T';
    else out += exec ? 'x' : '-';
  }
  return type + out;
}

/** Line-local exchange. Returns null when the domain/ambiguity gates refuse. */
export function enallageRewrite(text: string): { wire: string; hits: number } | null {
  if (!text) return null;
  if (OCTAL_GLOBAL.test(text)) { OCTAL_GLOBAL.lastIndex = 0; return null; }
  OCTAL_GLOBAL.lastIndex = 0;
  let hits = 0;
  const wire = text.replace(MODE_GLOBAL, (all, type: string, sym: string) => {
    const oct = enallageSymbolicToOctal(type, sym);
    if (oct === null) return all;
    hits++;
    return oct;
  });
  MODE_GLOBAL.lastIndex = 0;
  if (!hits) return null;
  return { wire, hits };
}

/** Independent inverse of the exchange layer (not of the parent frontier). */
export function enallageExpand(rewritten: string): string {
  return rewritten.replace(OCTAL_GLOBAL, (all, type: string, digits: string) => {
    const sym = enallageOctalToSymbolic(type, digits);
    return sym === null ? all : sym;
  });
}

/**
 * Encode. `incumbentTokens` is the complete-message cost to beat; when omitted,
 * the parent frontier on the ORIGINAL text is measured (registry use). In the
 * X74 chain the caller passes the incumbent it already measured.
 */
export function enallageEncode(
  text: string,
  enc: EncodingName = 'o200k_base',
  incumbentTokens?: number,
  /** Optional inner encoder. The X74 chain passes its own measured chain so the
   *  radix exchange compounds with PROSPHYSIS/ΣΥΜΦΥΊΑ instead of competing with
   *  them. The rewritten text contains octal-form fields, so the re-entered
   *  ENALLAGE candidate refuses by G2 and the recursion is well-founded. */
  innerEncoder?: (t: string, e: EncodingName) => TagstackResult,
): EnallageResult {
  if (enallageDisabled()) {
    return {
      codec: 'enallage', wire: text, message: text, decoded: text, exact: true, applied: false,
      hits: 0, contractTokens: 0, messageTokens: incumbentTokens ?? countTokens(text, enc),
      frontierTokens: incumbentTokens ?? countTokens(text, enc), frontierParent: 'identity',
      notes: 'enallage: disabled',
    };
  }
  const refuse = (notes: string, frontier?: TagstackResult): EnallageResult => ({
    codec: 'enallage',
    // A refusal is the identity on the SOURCE, never the rewritten-body wire.
    // The candidate's complete-message cost is preserved in `notes` for probes.
    wire: text,
    message: text,
    decoded: text,
    exact: true,
    applied: false,
    hits: 0,
    contractTokens: 0,
    messageTokens: countTokens(text, enc),
    frontierTokens: frontier?.messageTokens ?? countTokens(text, enc),
    frontierParent: frontier?.parentCodec ?? 'identity',
    notes,
  });

  const rw = enallageRewrite(text);
  if (!rw) return refuse('enallage: no unambiguous symbolic mode field');
  if (enallageExpand(rw.wire) !== text) return refuse('enallage: own inverse disagrees');
  // Cheap necessary gate: the raw radix exchange must repay the contract with
  // room to spare before any parent frontier call is spent. A raw win alone is
  // not admission: ls-real measured 111 raw tokens saved but the complete
  // candidate still loses, while ls-l-real saves 447 raw and wins through the
  // X74 chain. The floor is bracketed by those two measurements; the complete-
  // message gate below remains the real admission test.
  const rawSaved = countTokens(text, enc) - countTokens(rw.wire, enc);
  const keyTokens = countTokens(ENALLAGE_KEY, enc);
  if (rawSaved < keyTokens + 164) return refuse(`enallage: raw saving ${rawSaved} below floor ${keyTokens + 164}`);

  const inner = (innerEncoder ?? tagstackFrontier)(rw.wire, enc);
  if (inner.decoded !== rw.wire) return refuse('enallage: frontier does not reproduce the rewritten body', inner);
  const message = ENALLAGE_KEY + '\n' + inner.message;
  const tokens = countTokens(message, enc);
  const incumbent = incumbentTokens ?? tagstackFrontier(text, enc).messageTokens;
  if (tokens >= incumbent) return refuse(`enallage loses: ${tokens} vs ${incumbent} (${inner.parentCodec})`, inner);

  return {
    codec: 'enallage',
    wire: message,
    message,
    decoded: text,
    exact: true,
    applied: true,
    hits: rw.hits,
    contractTokens: countTokens(ENALLAGE_KEY, enc),
    messageTokens: tokens,
    frontierTokens: incumbent,
    frontierParent: inner.parentCodec,
    notes: `${rw.hits} mode fields exchanged to octal; wire coded by ${inner.parentCodec}; M=${tokens} < ${incumbent}`,
  };
}
