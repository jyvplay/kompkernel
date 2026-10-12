/**
 * src/lib/omega/dirfold-a.ts
 * =============================================================================
 * DIRFOLD-A1 — same-directory path folding with an ASCII-only marker.
 * (exact, byte-perfect, self-verified before emission; identity unless it pays)
 *
 * Same mechanism as DIRFOLD-D1 (dirfold.ts): a path whose directory equals the
 * directory of the line above is written with the directory removed. The only
 * difference is the marker: '=' instead of '↑', so the whole wire is plain ASCII
 * and stays inside the text-native lane. DIRFOLD-D1 is unchanged and remains
 * the committed codec for the '↑' form.
 *
 * LINE MODEL (identical to DIRFOLD-D1)
 *   segment(line) = text after the last space or tab (the whole line if none).
 *   dir(s)        = s up to and including its last '/' (empty if none or leading only).
 *
 * WIRE
 *   line 1   DIRFOLD-A: =name = the directory of the line above, then name; fields split on spaces and tabs
 *   line 2…  a line whose segment is dir(prev) + name, prev being the ORIGINAL segment of the
 *            line above (name has no '/', dir length >= 4), is written as "=" + name.
 *
 * GATE (all must hold, else identity):
 *   G1  no line's segment begins with '=' (otherwise the marker would be ambiguous; no escape is used);
 *   G2  at least one line was folded;
 *   G3  decode(wire) === input (exact);
 *   G4  tokens(wire including the rule line) < tokens(input).
 * Identity escape: if the input begins with a header line of this codec or of DIRFOLD-D1,
 * the wire is prefixed with DIRFOLD_A_ESC so the decoder never misreads it.
 * =============================================================================
 */
import { countTokens, type EncodingName } from './bpe';

export const DIRFOLD_A_RULE = 'DIRFOLD-A: =name = the directory of the line above, then name; fields split on spaces and tabs';
/** escape header: used only when an identity input itself begins with a header line */
export const DIRFOLD_A_ESC = 'DIRFOLD-A: identity';
const MARK = '=';

function splitSegment(line: string): { head: string; seg: string } {
  const i = Math.max(line.lastIndexOf(' '), line.lastIndexOf('\t'));
  return { head: line.slice(0, i + 1), seg: line.slice(i + 1) };
}
function dirOf(seg: string): string {
  const i = seg.lastIndexOf('/');
  return i <= 0 ? '' : seg.slice(0, i + 1);
}

export function dirfoldADecode(wire: string): string {
  if (wire.startsWith(DIRFOLD_A_ESC + '\n')) return wire.slice(DIRFOLD_A_ESC.length + 1);
  const head = DIRFOLD_A_RULE + '\n';
  if (!wire.startsWith(head)) return wire;
  const lines = wire.slice(head.length).split('\n');
  let prevSeg = '';
  const out: string[] = [];
  for (const line of lines) {
    const { head: h, seg } = splitSegment(line);
    let origSeg = seg;
    if (seg.startsWith(MARK)) {
      origSeg = dirOf(prevSeg) + seg.slice(MARK.length);
      out.push(h + origSeg);
    } else {
      out.push(line);
    }
    prevSeg = origSeg;
  }
  return out.join('\n');
}

export interface DirFoldAResult {
  wire: string;
  decoded: string;
  exact: boolean;
  mode: 'dirfold-a' | 'identity';
  folded: number;
  inTokens: number;
  outTokens: number;
}

export function dirfoldAEncode(text: string, enc: EncodingName = 'o200k_base'): DirFoldAResult {
  const inTokens = countTokens(text, enc);
  const idWire = text.startsWith(DIRFOLD_A_RULE + '\n') || text.startsWith(DIRFOLD_A_ESC + '\n') ? DIRFOLD_A_ESC + '\n' + text : text;
  const identity = (): DirFoldAResult => {
    const outTokens = idWire === text ? inTokens : countTokens(idWire, enc);
    return { wire: idWire, decoded: text, exact: true, mode: 'identity', folded: 0, inTokens, outTokens };
  };
  const lines = text.split('\n');
  if (lines.some(line => splitSegment(line).seg.startsWith(MARK))) return identity();   // G1
  let prevSeg = '';
  let folded = 0;
  const body = lines.map(line => {
    const { head: h, seg } = splitSegment(line);
    const d = dirOf(seg);
    let out = line;
    if (d && d.length >= 4 && d === dirOf(prevSeg) && seg.length > d.length && !seg.slice(d.length).includes('/')) {
      out = h + MARK + seg.slice(d.length);
      folded++;
    }
    prevSeg = seg;
    return out;
  }).join('\n');
  if (folded === 0) return identity();                                                 // G2
  const wire = DIRFOLD_A_RULE + '\n' + body;
  const decoded = dirfoldADecode(wire);
  const outTokens = countTokens(wire, enc);
  if (decoded !== text || outTokens >= inTokens) return identity();                    // G3, G4
  return { wire, decoded, exact: true, mode: 'dirfold-a', folded, inTokens, outTokens };
}
