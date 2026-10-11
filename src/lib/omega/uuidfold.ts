/**
 * src/lib/omega/uuidfold.ts
 * =============================================================================
 * UUIDFOLD-U2 — canonical UUIDs written as 32 UPPERCASE hex digits, restored by
 * a one-line in-message rule. Exact, byte-perfect, self-verified before emission.
 *
 * THE GAP (measured, not assumed; bench/z16/id-cost-probe.ts, o200k_base)
 * -----------------------------------------------------------------------------
 * A canonical UUID is 36 characters: 32 hex digits and four dashes. The dashes
 * cost tokens. Over the 24 distinct canonical UUIDs in bench/holdout-ops,
 * bench/holdout and bench/z11:
 *   as written (lowercase, dashed)   23.21 tokens / UUID
 *   dashes removed, lowercase        18.33 tokens / UUID
 *   dashes removed, UPPERCASE        18.38 tokens / UUID   <- used here
 *   spaces for dashes                23.08 (no gain);  grouped by 4: 26.13 (worse)
 * Saving: about 4.9 tokens per canonical UUID (21%).
 *
 * WHY UPPERCASE (a measured design decision, not a style choice)
 * -----------------------------------------------------------------------------
 * Real ops logs also contain NATIVE dashless 32-digit lowercase IDs (OpenStack
 * project ids: bench/holdout-ops/openstack-loghub-26.log has 32 of them next to
 * 36 dashed request ids). A lowercase dashless rule would corrupt those. Folding
 * to UPPERCASE digits keeps the two classes disjoint: the decoder restores only
 * uppercase 32-digit runs and leaves lowercase runs alone. No per-item markers.
 *
 * WIRE
 * -----------------------------------------------------------------------------
 *   line 1   UUIDFOLD: 32 uppercase hex digits = lowercase UUID; dashes after digits 8 12 16 20
 *   line 2…  the body: the input, with each canonical LOWERCASE dashed UUID
 *            replaced by its 32 digits in uppercase, no dashes.
 * Identity wire: the input unchanged. If the input starts with "UUIDFOLD:", the
 * identity wire is "UUIDFOLD: off\n" + input (so the decoder never misreads it).
 *
 * GATE (all must hold, else identity):
 *   G1  at least one canonical lowercase dashed UUID in the input;
 *   G2  the input has no uppercase 32-digit run (the decoder would restore it);
 *   G3  decode(wire) === input (exact);
 *   G4  tokens(wire) < tokens(input)  (the rule line must pay for itself).
 * =============================================================================
 */
import { countTokens, type EncodingName } from './bpe';

export const UUIDFOLD_RULE = 'UUIDFOLD: 32 uppercase hex digits with a letter A-F = lowercase UUID; dashes after digits 8 12 16 20';
const OFF = 'UUIDFOLD: off';

// canonical lowercase dashed UUID, not glued to an alphanumeric neighbour
const UUID_RE = /(?<![0-9A-Za-z])([0-9a-f]{8})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{12})(?![0-9A-Za-z])/g;
// the folded form: 32 uppercase hex digits as a maximal run
const FOLDED_RE = /(?<![0-9A-Za-z])([0-9A-F]{8})([0-9A-F]{4})([0-9A-F]{4})([0-9A-F]{4})([0-9A-F]{12})(?![0-9A-Za-z])/g;
const UPPER32_ANY_RE = /(?<![0-9A-Za-z])[0-9A-F]{32}(?![0-9A-Za-z])/g;

export interface UuidFoldResult {
  wire: string;
  decoded: string;
  exact: boolean;
  mode: 'uuidfold' | 'identity';
  uuids: number;
  inTokens: number;
  outTokens: number;
}

export function uuidfoldDecode(wire: string): string {
  if (wire.startsWith(OFF + '\n')) return wire.slice(OFF.length + 1);
  const head = UUIDFOLD_RULE + '\n';
  if (!wire.startsWith(head)) return wire;
  const body = wire.slice(head.length);
  return body.replace(FOLDED_RE, (m, a, b, c, d, e) => {
    if (!/[A-F]/.test(m)) return m;   // digit-only runs are never folded, so they are left alone
    return `${String(a).toLowerCase()}-${String(b).toLowerCase()}-${String(c).toLowerCase()}-${String(d).toLowerCase()}-${String(e).toLowerCase()}`;
  });
}

export function uuidfoldEncode(text: string, enc: EncodingName = 'o200k_base'): UuidFoldResult {
  const inTokens = countTokens(text, enc);
  const uuids = [...text.matchAll(UUID_RE)].length;
  const identity = (): UuidFoldResult => {
    const wire = text.startsWith('UUIDFOLD:') ? OFF + '\n' + text : text;
    return { wire, decoded: uuidfoldDecode(wire), exact: uuidfoldDecode(wire) === text, mode: 'identity', uuids, inTokens, outTokens: countTokens(wire, enc) };
  };
  if (uuids === 0) return identity();                              // G1
  // G2: a bare uppercase run that the decoder would restore (contains A-F) makes folding ambiguous
  if ([...text.matchAll(UPPER32_ANY_RE)].some(m => /[A-F]/.test(m[0]))) return identity();
  const body = text.replace(UUID_RE, (m, a, b, c, d, e) => {
    const up = (a + b + c + d + e).toUpperCase();
    return /[A-F]/.test(up) ? up : m;   // digit-only UUIDs stay dashed (decoder would not restore them)
  });
  const wire = UUIDFOLD_RULE + '\n' + body;
  const decoded = uuidfoldDecode(wire);
  const outTokens = countTokens(wire, enc);
  if (decoded !== text || outTokens >= inTokens) return identity();  // G3, G4
  return { wire, decoded, exact: true, mode: 'uuidfold', uuids, inTokens, outTokens };
}
