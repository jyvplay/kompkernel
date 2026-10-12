/**
 * src/lib/omega/ditto.ts
 * =============================================================================
 * DITTO-F1 — per-field "same as the line above" marks for space-separated records (ASCII-only wire).
 * (exact, byte-perfect, self-verified before emission; identity unless it pays)
 *
 * THE GAP (measured in bench/z18/ditto-measure.ts before this codec was written)
 * -----------------------------------------------------------------------------
 * Log and listing records repeat a field value in the SAME POSITION on consecutive
 * lines (a date, a host, a pid, a component name, a mode string). Dictionary and
 * span miners reach repeats through a definition that is paid once; a positional
 * mark needs no definition and is readable on its own. The fields are split on
 * single spaces, so empty fields and runs of spaces are preserved exactly.
 *
 * WIRE
 * -----------------------------------------------------------------------------
 *   line 1   DITTO: ^ = the same field as the same position in the line above; fields are split on single spaces
 *   line 2…  the body. A field that has length >= MIN_LEN and equals the field at the
 *            same index in the ORIGINAL previous line is written as "^".
 * Identity wire: the input unchanged (with an escape header only if the input itself
 * begins with a header line).
 *
 * GATE (all must hold, else identity):
 *   G1  at least one field was marked;
 *   G2  decode(wire) === input (exact);
 *   G3  tokens(wire including the rule line) < tokens(input).
 * Escape: a literal field that begins with '^' is written with one extra leading '^'; the
 * decoder reads a field equal to '^' as a mark, and any other field beginning with '^' as escaped.
 * =============================================================================
 */
import { countTokens, type EncodingName } from './bpe';

export const DITTO_RULE = 'DITTO: ^ = the same field as the same position in the line above; a field that really begins with ^ has one extra ^ in front; fields are split on single spaces';
/** escape header: used only when an identity input itself begins with a header line */
export const DITTO_ESC = 'DITTO: identity';
const MARK = '^';
export const DITTO_MIN_LEN = 3;

export function dittoDecode(wire: string): string {
  if (wire.startsWith(DITTO_ESC + '\n')) return wire.slice(DITTO_ESC.length + 1);
  const head = DITTO_RULE + '\n';
  if (!wire.startsWith(head)) return wire;
  const lines = wire.slice(head.length).split('\n');
  let prev: string[] = [];
  const out: string[] = [];
  for (const line of lines) {
    const f = line.split(' ').map((v, j) => (v === MARK ? (prev[j] ?? '') : v.startsWith(MARK) ? v.slice(1) : v));
    prev = f;
    out.push(f.join(' '));
  }
  return out.join('\n');
}

export interface DittoResult {
  wire: string;
  decoded: string;
  exact: boolean;
  mode: 'ditto' | 'identity';
  marked: number;
  inTokens: number;
  outTokens: number;
}

export function dittoEncode(text: string, enc: EncodingName = 'o200k_base', minLen = DITTO_MIN_LEN): DittoResult {
  const inTokens = countTokens(text, enc);
  const idWire = text.startsWith(DITTO_RULE + '\n') || text.startsWith(DITTO_ESC + '\n') ? DITTO_ESC + '\n' + text : text;
  const identity = (): DittoResult => {
    const outTokens = idWire === text ? inTokens : countTokens(idWire, enc);
    return { wire: idWire, decoded: text, exact: true, mode: 'identity', marked: 0, inTokens, outTokens };
  };
  let prev: string[] = [];
  let marked = 0;
  const body = text.split('\n').map(line => {
    const f = line.split(' ');
    const r = f.map((v, j) => {
      if (v.length >= minLen && j < prev.length && prev[j] === v) { marked++; return MARK; }
      return v.startsWith(MARK) ? MARK + v : v;                                         // escape a literal leading caret
    });
    prev = f;
    return r.join(' ');
  }).join('\n');
  if (marked === 0) return identity();                                                  // G1
  const wire = DITTO_RULE + '\n' + body;
  const decoded = dittoDecode(wire);
  const outTokens = countTokens(wire, enc);
  if (decoded !== text || outTokens >= inTokens) return identity();                     // G2, G3
  return { wire, decoded, exact: true, mode: 'ditto', marked, inTokens, outTokens };
}
