/**
 * src/lib/omega/mekos.ts — X116. ΜΗΚΟΣ (mēkos), "length".
 * =============================================================================
 *
 * THE MECHANISM: MEASURE ENTAILMENT OF A SIBLING FIELD
 * -----------------------------------------------------------------------------
 * In a POSIX long listing, a symbolic link's printed size is not an independent
 * measurement: `lstat(2).st_size` for a symlink is the byte length of the target
 * path stored in the link. The listing also prints that target after ` -> `.
 * Therefore the size cell is a pure function of a sibling cell already present
 * in the same line. ΜΗΚΟΣ replaces that numeric cell with a one-character measure
 * mark and declares the inverse in-band. The parent frontier then prices a
 * representation in which the redundant measure is a constant column, not a
 * scattered set of small integers.
 *
 * This is not a dictionary substitution (the size is not a repeated span), not a
 * numeric predictor (no row-to-row arithmetic), and not a radix exchange (no
 * base conversion). It is an entailment between two fields of the same record:
 * one field is the UTF-8 byte length of another.
 *
 * GREEDY? No. The rewrite is a total line-local function on its domain. The only
 * decision is FIRE/NOT, made by measuring the COMPLETE message through the parent
 * frontier and admitting only a strict, byte-exact win.
 *
 * TIME/CPU: CPU-bound. The rewrite is O(lines); no wall clock is read by any
 * decision. The dominant cost is the inherited parent frontier encode.
 *
 * SOURCE CITATION (honest). POSIX `lstat(2)` / `readlink(2)` semantics: a
 * symlink's st_size is the length of the target path, not including a terminating
 * NUL. Live X116 search corroborated this on Unix & Linux Stack Exchange and
 * recent filesystem bug reports (see bench/x116/research/sources.md). The
 * one-chat gated candidate construction is this repository's X74 discipline; the
 * measure-entailment framing and measurement here are original to X116.
 *
 * GATES
 *   G1 domain      only lines beginning `l` and containing ` -> ` are considered;
 *                  the fifth whitespace cell of the prefix must be a decimal
 *                  integer equal to the UTF-8 byte length of the target.
 *   G2 ambiguity   if the source already contains the measure mark, refuse.
 *   G3 own inverse the independent decoder reproduces the source byte for byte.
 *   G4 composition the parent frontier must reproduce the REWRITTEN text exactly.
 *   G5 strict win  countTokens(contract + LF + inner.message) < incumbent.
 */

import { countTokens, type EncodingName } from './bpe';
import { tagstackFrontier, type TagstackResult } from './tagstack';

export const MEKOS_KEY = 'λ=#bytes after ->.';
export const MEKOS_MARK = 'λ';
const ARROW = ' -> ';

export function mekosDisabled(): boolean {
  if (typeof process === 'undefined') return false;
  return process.env?.OMEGA_MEKOS === '0'
    || process.env?.OMEGA_MEKOS === 'false'
    || process.env?.OMEGA_NO_MEKOS === '1';
}

export interface MekosResult {
  codec: 'mekos';
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

/** Line-local measure entailment. Returns null when domain/ambiguity gates refuse. */
export function mekosRewrite(text: string): { wire: string; hits: number } | null {
  if (!text || text.includes(MEKOS_MARK)) return null;
  const final = text.endsWith('\n');
  const lines = (final ? text.slice(0, -1) : text).split('\n');
  let hits = 0;
  const out = lines.map(line => {
    if (!line.startsWith('l')) return line;
    const a = line.indexOf(ARROW);
    if (a < 0) return line;
    const target = line.slice(a + ARROW.length);
    const prefix = line.slice(0, a);
    const cells = [...prefix.matchAll(/\S+/g)];
    if (cells.length < 5) return line;
    const size = cells[4]!;
    if (!/^\d+$/.test(size[0])) return line;
    if (Number(size[0]) !== Buffer.byteLength(target, 'utf8')) return line;
    hits++;
    const at = size.index ?? 0;
    return prefix.slice(0, at) + MEKOS_MARK + prefix.slice(at + size[0].length) + line.slice(a);
  });
  if (!hits) return null;
  return { wire: out.join('\n') + (final ? '\n' : ''), hits };
}

/** Independent inverse of the measure layer (not of the parent frontier). */
export function mekosExpand(rewritten: string): string {
  const final = rewritten.endsWith('\n');
  const lines = (final ? rewritten.slice(0, -1) : rewritten).split('\n');
  const out = lines.map(line => {
    const a = line.indexOf(ARROW);
    if (a < 0) return line;
    const target = line.slice(a + ARROW.length);
    const prefix = line.slice(0, a);
    const at = prefix.indexOf(MEKOS_MARK);
    if (at < 0) return line;
    // The encoder emits exactly one mark in the prefix; refuse to guess otherwise.
    if (prefix.indexOf(MEKOS_MARK, at + MEKOS_MARK.length) >= 0) return line;
    return prefix.slice(0, at) + Buffer.byteLength(target, 'utf8') + prefix.slice(at + MEKOS_MARK.length) + line.slice(a);
  });
  return out.join('\n') + (final ? '\n' : '');
}

export function mekosEncode(
  text: string,
  enc: EncodingName = 'o200k_base',
  incumbentTokens?: number,
  innerEncoder?: (t: string, e: EncodingName) => TagstackResult,
): MekosResult {
  if (mekosDisabled()) {
    return {
      codec: 'mekos', wire: text, message: text, decoded: text, exact: true, applied: false,
      hits: 0, contractTokens: 0, messageTokens: incumbentTokens ?? countTokens(text, enc),
      frontierTokens: incumbentTokens ?? countTokens(text, enc), frontierParent: 'identity',
      notes: 'mekos: disabled',
    };
  }
  const refuse = (notes: string, frontier?: TagstackResult): MekosResult => ({
    codec: 'mekos', wire: text, message: text, decoded: text, exact: true, applied: false,
    hits: 0, contractTokens: 0, messageTokens: countTokens(text, enc),
    frontierTokens: frontier?.messageTokens ?? countTokens(text, enc),
    frontierParent: frontier?.parentCodec ?? 'identity', notes,
  });

  const rw = mekosRewrite(text);
  if (!rw) return refuse('mekos: no unambiguous symlink measure field');
  if (mekosExpand(rw.wire) !== text) return refuse('mekos: own inverse disagrees');
  const rawSaved = countTokens(text, enc) - countTokens(rw.wire, enc);
  const keyTokens = countTokens(MEKOS_KEY, enc);
  // Cheap necessary gate. The complete-message gate below is the real test.
  if (rawSaved < keyTokens + 16) return refuse(`mekos: raw saving ${rawSaved} below floor ${keyTokens + 16}`);

  const inner = (innerEncoder ?? tagstackFrontier)(rw.wire, enc);
  if (inner.decoded !== rw.wire) return refuse('mekos: frontier does not reproduce the rewritten body', inner);
  const decoded = mekosExpand(inner.decoded);
  if (decoded !== text) return refuse('mekos: composed inverse disagrees', inner);
  const message = MEKOS_KEY + '\n' + inner.message;
  const tokens = countTokens(message, enc);
  const incumbent = incumbentTokens ?? tagstackFrontier(text, enc).messageTokens;
  if (tokens >= incumbent) return refuse(`mekos loses: ${tokens} vs ${incumbent} (${inner.parentCodec})`, inner);

  return {
    codec: 'mekos', wire: message, message, decoded, exact: true, applied: true,
    hits: rw.hits, contractTokens: keyTokens, messageTokens: tokens,
    frontierTokens: incumbent, frontierParent: inner.parentCodec,
    notes: `${rw.hits} symlink size fields entailed by target length; wire coded by ${inner.parentCodec}; M=${tokens} < ${incumbent}`,
  };
}
