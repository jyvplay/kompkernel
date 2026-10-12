/**
 * src/lib/omega/padtab2.ts
 * =============================================================================
 * PADTAB2 — column layout with a free tail (exact, byte-perfect, encoder-verified).
 *
 * Generalizes PADTAB (PHALANX-A6). A row = its first f whitespace-separated tokens (the FIXED cells) and, if it has more
 * tokens, a FREE tail: the verbatim text from the start of token f to the end of the line (names with spaces, symlink
 * targets, mount points, descriptions). Fixed cells are aligned by position; the free tail is kept verbatim.
 *
 * BLOCK: a maximal run of consecutive lines with no TAB, no marker character, and at least 2 tokens. Inside a run the
 *        encoder tries f = min(token count) down to 1 and accepts the first f whose re-rendering reproduces every row
 *        byte-for-byte. A header row that aligns differently may be emitted as a plain line before the block (tried
 *        when the whole run fails).
 * COLUMNS: fixed column j is L (token starts at the mode start) or R (token ends at the mode end), whichever the rows
 *        match more often. Overflow: a token that does not fit its field is pushed right, start = max(prevEnd+1, pos).
 *        The free tail starts at max(prevEnd+1, F) where F = mode start of token f over rows that have a tail.
 * WIRE: "<M>T <f> <n> <c_1>,...,<c_f>[,F<pos>]" then n rows. A row = the fixed tokens joined by one space, plus " " and the
 *       tail when the row has one. Tokens contain no space, so split(" ") recovers fixed cells and the verbatim tail.
 * =============================================================================
 */

export const PADTAB2_MARK_CANDIDATES = ['▤', '▥', '▦', '▧', '▨', '▩', '◫', '◨', '◧', '⬚', '⬢', '⬡', '⬣', '⬤'];

export function padPickMark2(text: string): string | null {
  for (const c of PADTAB2_MARK_CANDIDATES) if (!text.includes(c)) return c;
  return null;
}

export interface Tok { t: string; s: number; e: number }

export function tokensOf2(line: string): Tok[] {
  const out: Tok[] = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) out.push({ t: m[0], s: m.index, e: m.index + m[0].length });
  return out;
}

type Col = { a: 'L' | 'R'; p: number };
interface Spec { f: number; cols: Col[]; tailPos: number | null }

/** Render one row: fixed tokens by position, then the verbatim tail (if the row has one). */
export function renderRow2(fixed: string[], tail: string | null, spec: Spec): string {
  let prevEnd = -1;
  const cells: { s: number; t: string }[] = [];
  fixed.forEach((t, j) => {
    const c = spec.cols[j];
    const s = c.a === 'L' ? Math.max(prevEnd + 1, c.p) : Math.max(prevEnd + 1, c.p - t.length);
    cells.push({ s, t });
    prevEnd = s + t.length;
  });
  if (tail !== null) {
    const s = Math.max(prevEnd + 1, spec.tailPos ?? 0);
    cells.push({ s, t: tail });
  }
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

function specFor(rows: Tok[][], lines: string[], f: number): Spec | null {
  const cols: Col[] = [];
  for (let j = 0; j < f; j++) {
    const starts = rows.map((r) => r[j].s), ends = rows.map((r) => r[j].e);
    const ms = mode(starts), me = mode(ends);
    const hitS = starts.filter((x) => x === ms).length, hitE = ends.filter((x) => x === me).length;
    cols.push(hitS >= hitE ? { a: 'L', p: ms } : { a: 'R', p: me });
  }
  const withTail = rows.filter((r) => r.length > f);
  const tailPos = withTail.length > 0 ? mode(withTail.map((r) => r[f].s)) : null;
  const spec: Spec = { f, cols, tailPos };
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const fixed = r.slice(0, f).map((x) => x.t);
    const tail = r.length > f ? lines[i].slice(r[f].s) : null;
    if (renderRow2(fixed, tail, spec) !== lines[i]) return null;
  }
  return spec;
}

function tryBlock2(lines: string[], mark: string): { header: string; rows: string[] } | null {
  const rows = lines.map(tokensOf2);
  const minCount = Math.min(...rows.map((r) => r.length));
  for (let f = minCount; f >= 1; f--) {
    const spec = specFor(rows, lines, f);
    if (!spec) continue;
    const wireRows = rows.map((r, i) => {
      const fixed = r.slice(0, f).map((x) => x.t);
      const tail = r.length > f ? lines[i].slice(r[f].s) : null;
      return tail === null ? fixed.join(' ') : fixed.join(' ') + ' ' + tail;
    });
    const specStr = spec.cols.map((c) => c.a + c.p).join(',') + (spec.tailPos !== null ? ',F' + spec.tailPos : '');
    return { header: `${mark}T ${f} ${lines.length} ${specStr}`, rows: wireRows };
  }
  return null;
}

/** Emit one run: the whole run if it is a block, else each same-token-count segment (first-row exception allowed). */
function emitRun(run: string[], mark: string, out: string[]): void {
  const whole = tryBlock2(run, mark);
  if (whole) { out.push(whole.header, ...whole.rows); return; }
  // First-row exception (a header or a summary line such as "total N"): emit it plain and block the rest as one run.
  if (run.length >= 3) {
    const rest = tryBlock2(run.slice(1), mark);
    if (rest) { out.push(run[0], rest.header, ...rest.rows); return; }
  }
  let a = 0;
  while (a < run.length) {
    const k = tokensOf2(run[a]).length;
    let b = a + 1;
    while (b < run.length && tokensOf2(run[b]).length === k) b++;
    const seg = run.slice(a, b);
    const whole2 = seg.length >= 2 ? tryBlock2(seg, mark) : null;
    if (whole2) { out.push(whole2.header, ...whole2.rows); }
    else if (seg.length >= 3) {
      const rest = tryBlock2(seg.slice(1), mark);
      if (rest) out.push(seg[0], rest.header, ...rest.rows); else out.push(...seg);
    } else out.push(...seg);
    a = b;
  }
}

export function padEncode2(text: string, mark: string): string {
  const lines = text.split('\n');
  const out: string[] = [];
  const eligible = (l: string) => !l.includes('\t') && !l.includes(mark) && tokensOf2(l).length >= 2;
  let i = 0;
  while (i < lines.length) {
    if (!eligible(lines[i])) { out.push(lines[i]); i++; continue; }
    let j = i + 1;
    while (j < lines.length && eligible(lines[j])) j++;
    const block = lines.slice(i, j);
    emitRun(block, mark, out);
    i = j;
  }
  return out.join('\n');
}

export function padDecode2(text: string, mark: string): string {
  const lines = text.split('\n');
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const ln = lines[i];
    if (!ln.startsWith(mark)) { out.push(ln); i++; continue; }
    if (!ln.startsWith(mark + 'T ')) throw new Error('padtab2: marker line is not a block header');
    const parts = ln.slice(mark.length).split(' ');
    const f = Number(parts[1]), n = Number(parts[2]);
    const specParts = parts[3].split(',');
    const cols: Col[] = specParts.slice(0, f).map((c) => ({ a: c[0] as 'L' | 'R', p: Number(c.slice(1)) }));
    const tailEntry = specParts[f];
    const tailPos = tailEntry !== undefined && tailEntry.startsWith('F') ? Number(tailEntry.slice(1)) : null;
    const spec: Spec = { f, cols, tailPos };
    const rowsRaw = lines.slice(i + 1, i + 1 + n);
    if (rowsRaw.length !== n) throw new Error('padtab2: block shape mismatch');
    for (const r of rowsRaw) {
      const pieces = r.split(' ');
      if (pieces.length < f) throw new Error('padtab2: row has fewer cells than the block');
      const fixed = pieces.slice(0, f);
      const tail = pieces.length > f ? pieces.slice(f).join(' ') : null;
      out.push(renderRow2(fixed, tail, spec));
    }
    i += 1 + n;
  }
  return out.join('\n');
}
