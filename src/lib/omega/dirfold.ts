/**
 * src/lib/omega/dirfold.ts
 * =============================================================================
 * DIRFOLD-D1 — same-directory path folding for listings, by a one-line in-message rule.
 * (exact, byte-perfect, self-verified before emission; identity unless it pays)
 *
 * THE GAP (measured; bench/z17)
 * -----------------------------------------------------------------------------
 * Sorted path listings (find, git ls-files, ls -R, archive listings) repeat the
 * same directory prefix on consecutive lines. Each repeat costs tokens. The
 * frontier codecs (AMPHORA et al.) remove many repeats with grammar glyphs, but
 * their output is glyph-dense and hard for a reader to decode; this lane is a
 * readable alternative, measured both alone and stacked on AMPHORA.
 *
 * LINE MODEL
 * -----------------------------------------------------------------------------
 * The "segment" of a line is the text after its last space or tab (the whole line
 * if there is none). A segment is a path when it contains a '/' that is not its
 * last character. dir(s) is s up to and including its last '/'.
 *
 * WIRE
 * -----------------------------------------------------------------------------
 *   line 1   DIRFOLD: ↑ = the same directory as the line above; the file name follows
 *   line 2…  the body. A line whose segment is dir(prev) + name, where prev is the
 *            ORIGINAL segment of the line above and name contains no '/', is written
 *            with that segment replaced by "↑" + name. Every other line is unchanged.
 * Identity wire: the input unchanged (also used when the input contains '↑' or '\r').
 *
 * GATE (all must hold, else identity):
 *   G1  the input contains no '↑' and no '\r';
 *   G2  at least one line was folded;
 *   G3  decode(wire) === input (exact);
 *   G4  tokens(wire) < tokens(input).
 * =============================================================================
 */
import { countTokens, type EncodingName } from './bpe';

export const DIRFOLD_RULE = 'DIRFOLD: ↑ = the same directory as the line above; the file name follows';
/** escape header: used only when an identity input itself begins with a header line */
export const DIRFOLD_ESC = 'DIRFOLD: identity';
const MARK = '↑';

/** segment of a line: text after the last space or tab (whole line if none). */
function splitSegment(line: string): { head: string; seg: string } {
  const i = Math.max(line.lastIndexOf(' '), line.lastIndexOf('\t'));
  return { head: line.slice(0, i + 1), seg: line.slice(i + 1) };
}
function dirOf(seg: string): string {
  const i = seg.lastIndexOf('/');
  return i <= 0 ? '' : seg.slice(0, i + 1);
}

export function dirfoldDecode(wire: string): string {
  if (wire.startsWith(DIRFOLD_ESC + '\n')) return wire.slice(DIRFOLD_ESC.length + 1);
  const head = DIRFOLD_RULE + '\n';
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

export interface DirFoldResult {
  wire: string;
  decoded: string;
  exact: boolean;
  mode: 'dirfold' | 'identity';
  folded: number;
  inTokens: number;
  outTokens: number;
}

export function dirfoldEncode(text: string, enc: EncodingName = 'o200k_base'): DirFoldResult {
  const inTokens = countTokens(text, enc);
  const idWire = text.startsWith(DIRFOLD_RULE + '\n') || text.startsWith(DIRFOLD_ESC + '\n') ? DIRFOLD_ESC + '\n' + text : text;
  const identity = (folded = 0): DirFoldResult => {
    const outTokens = idWire === text ? inTokens : countTokens(idWire, enc);
    return { wire: idWire, decoded: text, exact: true, mode: 'identity', folded, inTokens, outTokens };
  };
  if (text.includes(MARK) || text.includes('\r')) return identity();                  // G1 (identity via idWire)
  const lines = text.split('\n');
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
  const wire = DIRFOLD_RULE + '\n' + body;
  const decoded = dirfoldDecode(wire);
  const outTokens = countTokens(wire, enc);
  if (decoded !== text || outTokens >= inTokens) return identity();                    // G3, G4
  return { wire, decoded, exact: true, mode: 'dirfold', folded, inTokens, outTokens };
}
