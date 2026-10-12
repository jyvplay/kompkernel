/**
 * src/lib/omega/wrapcanon.ts
 * =============================================================================
 * WRAPCANON — lossless removal of hard line-wraps in prose (exact, byte-perfect, encoder-verified).
 *
 * WHY: a hard line break costs its own token, and the word after it loses its joining space; the joined
 * " word" is usually one token. Measured as an UPPER BOUND (lossy join of every wrap newline, not a codec):
 * A3 tokens -4.1% to -7.2% on hard-wrapped Linux/git documentation. The lossless codec keeps whatever cannot be
 * re-derived.
 *
 * FORMAT (width W >= 1, KEEP = a visible character absent from the input)
 *   Paragraph = maximal run of non-empty lines. Blank lines are unchanged.
 *   Encoder, multi-line paragraph: if its lines equal greedyWrap(join(lines, " "), W), emit the joined line.
 *            otherwise emit the lines unchanged (the decoder never touches multi-line paragraphs).
 *   Encoder, single-line paragraph: if its length > W, emit KEEP + line (the decoder then leaves it alone).
 *            otherwise emit it unchanged.
 *   Decoder: a single-line paragraph starting with KEEP has KEEP removed. A single-line paragraph longer than W
 *            is greedily wrapped at W. Everything else is unchanged.
 *   W = 0 is the identity escape (no change, no KEEP marks).
 *   greedyWrap: words are separated by single spaces; fill a line while len(line) + 1 + len(word) <= W.
 *   The encoder checks decode(encode(text)) === text and returns null if the check fails.
 * =============================================================================
 */

export const WRAP_KEEP_CANDIDATES = ['¶', '⁂', '※', '⸪'];

export function greedyWrap(s: string, W: number): string[] {
  const words = s.split(' ');
  const out: string[] = [];
  let cur = '';
  for (const w of words) {
    if (cur === '') cur = w;
    else if (cur.length + 1 + w.length <= W) cur += ' ' + w;
    else { out.push(cur); cur = w; }
  }
  out.push(cur);
  return out;
}

export function wrapPickKeep(text: string): string | null {
  for (const c of WRAP_KEEP_CANDIDATES) if (!text.includes(c)) return c;
  return null;
}

export function wrapEncode(text: string, W: number, keep: string): string | null {
  if (W === 0) return text;
  const lines = text.split('\n');
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    if (lines[i] === '') { out.push(''); i++; continue; }
    let j = i;
    while (j < lines.length && lines[j] !== '') j++;
    const para = lines.slice(i, j);
    if (para.length === 1) {
      out.push(para[0].length > W ? keep + para[0] : para[0]);
    } else {
      const joined = para.join(' ');
      const canon = greedyWrap(joined, W);
      const ok = canon.length === para.length && canon.every((l, k) => l === para[k]);
      if (ok) out.push(joined); else out.push(...para);
    }
    i = j;
  }
  const enc = out.join('\n');
  return wrapDecode(enc, W, keep) === text ? enc : null;
}

export function wrapDecode(text: string, W: number, keep: string): string {
  if (W === 0) return text;
  const lines = text.split('\n');
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    if (lines[i] === '') { out.push(''); i++; continue; }
    let j = i;
    while (j < lines.length && lines[j] !== '') j++;
    if (j - i === 1) {
      const l = lines[i];
      if (l.startsWith(keep)) out.push(l.slice(keep.length));
      else if (l.length > W) out.push(...greedyWrap(l, W));
      else out.push(l);
    } else {
      out.push(...lines.slice(i, j));
    }
    i = j;
  }
  return out.join('\n');
}
