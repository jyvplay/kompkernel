/**
 * src/lib/omega/padtab.ts
 * =============================================================================
 * PADTAB — absolute column layout for tabular ops text (exact, byte-perfect, encoder-verified).
 *
 * WHY: tools such as ps, df, free, and ls -l pad columns with runs of spaces. Those runs cost tokens and carry only
 * the column positions. Measured as an UPPER BOUND (lossy: collapse runs of 2+ spaces, not a codec): A5 tokens -9%
 * overall on real ops outputs, -15% to -23% on ps, df, free, and ls -l.
 *
 * BLOCK: a maximal run of consecutive lines (a) without TAB and without the marker character, and (b) each with the
 *        same k >= 2 non-space tokens. Blocks of at least 2 lines are candidates.
 * COLUMNS: column j is L (left, at the mode of token starts) or R (right, at the mode of token ends), whichever the rows match more often.
 *        every row's token ends at the same column, it is R (right) at that end. Else the block is rejected.
 * HEADER: "<M>T <k> <n> <col>,<col>,..."  where <col> = L<start> or R<end> (absolute character positions).
 * ROWS:   n rows, each token joined by one space (tokens contain no space, so k tokens split back exactly). The decoder places each token at its absolute position (L: starts there,
 *        R: ends there) on a line of spaces. The encoder re-renders the block and accepts it only if every row matches
 *        the original byte-for-byte. Other lines are unchanged. M is a visible character absent from the input.
 * =============================================================================
 */

export const PADTAB_MARK_CANDIDATES = ['▤', '▥', '▦', '▧', '▨', '▩', '◫', '◨', '◧', '⬚', '⬢', '⬡', '⬣', '⬤'];

export function padPickMark(text: string): string | null {
  for (const c of PADTAB_MARK_CANDIDATES) if (!text.includes(c)) return c;
  return null;
}

interface Tok { t: string; s: number; e: number }

export function tokensOf(line: string): Tok[] {
  const out: Tok[] = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) out.push({ t: m[0], s: m.index, e: m.index + m[0].length });
  return out;
}

type Col = { a: 'L' | 'R'; p: number };

/**
 * Render one row from its tokens and the column specification. Left column: token starts at its fixed column p.
 * Right column: token ends at p, but never overlaps the previous token (start = max(prevEnd + 1, p - len)),
 * which reproduces overflow rows (a value wider than its field pushes the token right).
 */
export function renderRow(toks: string[], cols: Col[]): string {
  let prevEnd = -1;
  const cells: { s: number; t: string }[] = [];
  toks.forEach((t, j) => {
    const start = cols[j].a === 'L' ? Math.max(prevEnd + 1, cols[j].p) : Math.max(prevEnd + 1, cols[j].p - t.length);
    cells.push({ s: start, t });
    prevEnd = start + t.length;
  });
  const end = Math.max(0, ...cells.map((c) => c.s + c.t.length));
  const arr: string[] = new Array(end).fill(' ');
  for (const c of cells) for (let i = 0; i < c.t.length; i++) arr[c.s + i] = c.t[i];
  return arr.join('');
}

function mode(xs: number[]): number {
  const c = new Map<number, number>();
  for (const x of xs) c.set(x, (c.get(x) ?? 0) + 1);
  let best = xs[0], bc = -1;
  for (const [x, n] of c) if (n > bc || (n === bc && x < best)) { best = x; bc = n; }
  return best;
}

export function tryBlock(lines: string[], mark: string): { header: string; rows: string[] } | null {
  const rows = lines.map(tokensOf);
  const k = rows[0].length;
  const cols: Col[] = [];
  for (let j = 0; j < k; j++) {
    const starts = rows.map((r) => r[j].s), ends = rows.map((r) => r[j].e);
    const ms = mode(starts), me = mode(ends);
    const hitS = starts.filter((x) => x === ms).length, hitE = ends.filter((x) => x === me).length;
    cols.push(hitS >= hitE ? { a: 'L', p: ms } : { a: 'R', p: me });
  }
  if (!lines.every((ln, i) => renderRow(rows[i].map((x) => x.t), cols) === ln)) return null;
  const spec = cols.map((c) => c.a + c.p).join(',');
  return { header: `${mark}T ${k} ${lines.length} ${spec}`, rows: rows.map((r) => r.map((x) => x.t).join(' ')) };
}

function eligible(line: string, mark: string): boolean {
  return !line.includes('\t') && !line.includes(mark);
}

export function padEncode(text: string, mark: string): string {
  const lines = text.split('\n');
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const ln = lines[i];
    const k = tokensOf(ln).length;
    if (!eligible(ln, mark) || k < 2) { out.push(ln); i++; continue; }
    let j = i + 1;
    while (j < lines.length && eligible(lines[j], mark) && tokensOf(lines[j]).length === k) j++;
    const block = lines.slice(i, j);
    const enc = block.length >= 2 ? tryBlock(block, mark) : null;
    if (enc) { out.push(enc.header, ...enc.rows); i = j; continue; }
    // A header row may align differently from the data rows: emit it as a plain line and try the data rows.
    if (block.length >= 3) {
      const enc2 = tryBlock(block.slice(1), mark);
      if (enc2) { out.push(block[0], enc2.header, ...enc2.rows); i = j; continue; }
    }
    out.push(...block);
    i = j;
  }
  return out.join('\n');
}

export function padDecode(text: string, mark: string): string {
  const lines = text.split('\n');
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const ln = lines[i];
    if (!ln.startsWith(mark)) { out.push(ln); i++; continue; }
    if (!ln.startsWith(mark + 'T ')) throw new Error('padtab: marker line is not a block header');
    const parts = ln.slice(mark.length).split(' ');
    const k = Number(parts[1]), n = Number(parts[2]);
    const cols: Col[] = parts[3].split(',').map((c) => ({ a: c[0] as 'L' | 'R', p: Number(c.slice(1)) }));
    if (cols.length !== k) throw new Error('padtab: column count mismatch');
    const rows = lines.slice(i + 1, i + 1 + n).map((r) => r.split(' '));
    if (rows.length !== n || rows.some((r) => r.length !== k)) throw new Error('padtab: block shape mismatch');
    for (const r of rows) out.push(renderRow(r, cols));
    i += 1 + n;
  }
  return out.join('\n');
}
