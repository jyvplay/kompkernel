/**
 * src/lib/omega/stoichothetes.ts
 * =============================================================================
 * X128 — ΣΤΟΙΧΟΘΈΤΗΣ (stoichothetes, "one who sets type in columns"):
 *        ALIGNMENT-AWARE FIXED-WIDTH COLUMNAR BLOCKS.
 *
 * WHY THIS IS NOT ΣΤΉΛΗ AND NOT ΚΑΝΏΝ.
 *
 * ΣΤΉΛΗ (steli.ts) turns fixed-offset table rows into single-spaced rows plus a
 * geometry marker, but `sliceRow` does `const f = seg.trim()` and
 * `steliRebuildRow` then writes the field back at the absolute offset, so every
 * cell is emitted LEFT-aligned inside its column. Its offset candidates also come
 * from `startsOf`, which only reports a column start after TWO OR MORE spaces.
 * A right-aligned numeric column — what `ps aux`, `ls -l`, `free -m`, `dpkg -l`
 * and `kubectl get` use for essentially every number — is therefore outside
 * ΣΤΉΛΗ's model, and `steliTransform` returns null on them.
 *
 * ΚΑΝΏΝ (kanon.ts) is a different thing: a GATE over HYLE's fold lattice that
 * takes HYLE's table folds (T, G, A) with a fixed DAEDALUS arm. It is a
 * frontier PARENT, so it competes and wins on ~10 of 80 files. ΣΤΟΙΧΟΘΈΤΗΣ is
 * a pure PRE-TRANSFORM on the source text, so it composes with whatever arm the
 * frontier then picks, and it targets the one geometry ΣΤΉΛΗ cannot express.
 *
 * THE MODEL. A row is
 *
 *     row = slot_0 ++ slot_1 ++ ... ++ slot_{n-1} ++ tail
 *     slot_j = pad(field_ij, w_j, a_j)      a_j in { L (pad right), R (pad left) }
 *
 * The tail is the remainder of the line and keeps its own spacing, so the last
 * column may contain spaces (the COMMAND column of `ps aux` does). The marker
 * line carries the geometry and the row count and IS the reader's contract, so
 * there is no second English sentence to pay for.
 *
 * WHY THE SOLVER CANNOT BE WRONG. `a_j` is not guessed: column j is 'L' only if
 * every row of the block starts that field at the same offset, and 'R' only if
 * every row ends it at the same offset; otherwise the block is rejected. Widths
 * come from the gap equations, and — the load-bearing step — every candidate
 * block is rebuilt with `kanonRebuildRow` and compared to the original line
 * CHARACTER BY CHARACTER before it is accepted, and `stoichothetesTransform`
 * re-checks the whole text with its own inverse before returning. The width
 * solver is free to be heuristic: a bad width fails the byte comparison and the
 * block is simply not taken, so a mistake can cost compression, never fidelity.
 * ----------------------------------------------------------------------------
 */

import { countTokens } from './bpe';

export type StAlign = 'L' | 'R';
export interface StCol { w: number; a: StAlign }
export interface StBlock {
  start: number; rows: number; cols: StCol[]; tail: boolean; padMass: number;
}

const MARKERS = ['‡', '¤', '¥', '¦', '¨', 'ª', '«', '¬', '¯', '°'];
export const ST_MIN_ROWS = 3;
export const ST_MIN_PAD = 12;
export const ST_MAX_COLS = 14;

/** Non-space runs of a line, with the offset each one starts and ends at. */
function fieldsOf(line: string): { f: string[]; s: number[]; e: number[] } {
  const f: string[] = []; const s: number[] = []; const e: number[] = [];
  let p = 0;
  while (p < line.length) {
    while (p < line.length && (line[p] === ' ' || line[p] === '\t')) p++;
    if (p >= line.length) break;
    const a = p;
    while (p < line.length && line[p] !== ' ' && line[p] !== '\t') p++;
    f.push(line.slice(a, p)); s.push(a); e.push(p);
  }
  return { f, s, e };
}

/** The reader's rebuild: pad field j to width w_j with alignment a_j, append tail. */
export function stRebuildRow(fields: string[], w: number[], a: StAlign[], tail: boolean): string {
  let out = '';
  const k = fields.length;
  const n = tail ? k - 1 : k;
  for (let j = 0; j < n; j++) {
    const f = fields[j] ?? '';
    const width = w[j] ?? f.length;
    if (a[j] === 'R') { for (let q = f.length; q < width; q++) out += ' '; out += f; }
    else { out += f; for (let q = f.length; q < width; q++) out += ' '; }
  }
  if (tail) out += fields[k - 1] ?? '';
  return out;
}

/**
 * Try to fit `n` padded columns plus a tail over lines[start .. start+rows).
 * Null whenever the model does not reproduce every line byte for byte.
 */
function fitN(lines: string[], start: number, rows: number, n: number, tail: boolean): StBlock | null {
  const P: { f: string[]; s: number[]; e: number[] }[] = [];
  for (let i = 0; i < rows; i++) {
    const p = fieldsOf(lines[start + i]!);
    // `n` padded columns are needed; with a tail the row must have more than n runs.
    if (p.f.length < n + (tail ? 1 : 0)) return null;
    P.push(p);
  }
  const a: StAlign[] = new Array(n);
  for (let j = 0; j < n; j++) {
    let sEq = true, eEq = true;
    for (let i = 1; i < rows; i++) {
      if (P[i]!.s[j] !== P[0]!.s[j]) sEq = false;
      if (P[i]!.e[j] !== P[0]!.e[j]) eEq = false;
    }
    if (sEq) a[j] = 'L'; else if (eEq) a[j] = 'R'; else return null;
  }
  const w: number[] = new Array(n).fill(-1);
  const maxLen = (j: number) => { let m = 0; for (let i = 0; i < rows; i++) m = Math.max(m, P[i]!.f[j]!.length); return m; };
  const gap = (i: number, j: number) => P[i]!.s[j + 1]! - P[i]!.e[j]!;
  for (let j = 0; j < n - 1; j++) {
    if (a[j] === 'L' && a[j + 1] === 'L') {
      const c = gap(0, j) + P[0]!.f[j]!.length;
      for (let i = 0; i < rows; i++) if (gap(i, j) + P[i]!.f[j]!.length !== c) return null;
      if (c < maxLen(j)) return null;
      w[j] = c;
    } else if (a[j] === 'R' && a[j + 1] === 'R') {
      const c = gap(0, j) + P[0]!.f[j + 1]!.length;
      for (let i = 0; i < rows; i++) if (gap(i, j) + P[i]!.f[j + 1]!.length !== c) return null;
      if (c < maxLen(j + 1)) return null;
      w[j + 1] = c;
    } else if (a[j] === 'L') {              // L then R: give column j its tightest width
      const wj = maxLen(j);
      const c = gap(0, j) + P[0]!.f[j + 1]!.length - (wj - P[0]!.f[j]!.length);
      for (let i = 0; i < rows; i++) {
        if (gap(i, j) + P[i]!.f[j + 1]!.length - (wj - P[i]!.f[j]!.length) !== c) return null;
      }
      if (c < maxLen(j + 1)) return null;
      w[j] = wj; w[j + 1] = c;
    } else {                                 // R then L: neither side pads, so no gap
      for (let i = 0; i < rows; i++) if (gap(i, j) !== 0) return null;
      if (w[j] < 0) w[j] = maxLen(j);
    }
  }
  for (let j = 0; j < n; j++) if (w[j] < 0) w[j] = maxLen(j);

  // Last padded column: the tail (when present) must begin at one fixed offset.
  if (tail) {
    const t0 = P[0]!.s[n]!;
    for (let i = 1; i < rows; i++) if (P[i]!.s[n] !== t0) return null;
    let S = 0;
    for (let j = 0; j < n - 1; j++) S += w[j]!;
    const want = t0 - S;
    if (want < maxLen(n - 1)) return null;
    if (w[n - 1]! >= 0 && w[n - 1] !== want) return null;
    w[n - 1] = want;
  }

  let padMass = 0;
  const wv = w.map((x) => x);
  const av = a.slice();
  for (let i = 0; i < rows; i++) {
    const flds = P[i]!.f.slice(0, n);
    if (tail) flds.push(lines[start + i]!.slice(P[i]!.s[n]!));
    if (stRebuildRow(flds, wv, av, tail) !== lines[start + i]!) return null;
    padMass += lines[start + i]!.length - P[i]!.f.slice(0, n).join(' ').length
      - (tail ? lines[start + i]!.slice(P[i]!.s[n]!).length : 0)
      - (tail ? 1 : 0);
  }
  return { start, rows, cols: w.map((x, j) => ({ w: x, a: a[j]! })), tail, padMass };
}

/** Best block over `lines`, scored by whitespace characters reclaimed. */
export function stFit(lines: string[]): StBlock | null {
  let best: StBlock | null = null;
  for (let start = 0; start < lines.length; start++) {
    const maxRows = Math.min(lines.length - start, 400);
    for (let rows = ST_MIN_ROWS; rows <= maxRows; rows++) {
      const probe = fieldsOf(lines[start + rows - 1]!);
      const maxN = Math.min(ST_MAX_COLS, probe.f.length);
      for (let n = 2; n <= maxN; n++) {
        for (const tail of [true, false]) {
          const b = fitN(lines, start, rows, n, tail);
          if (b && b.padMass >= ST_MIN_PAD && (!best || b.padMass > best.padMass)) best = b;
        }
      }
    }
  }
  return best;
}

function pickMarker(text: string): string | null {
  for (const m of MARKERS) if (!text.includes(m) && countTokens(m, 'o200k_base') === 1) return m;
  return null;
}

export function stMarkerLine(marker: string, b: StBlock): string {
  const geom = b.cols.map((c) => `${c.w}${c.a === 'R' ? 'R' : 'l'}`).join(',');
  const t = b.tail ? ' the last field takes the rest of the line,' : '';
  return `${marker}${geom}:${b.rows} rows single-spaced, re-pad each field to its width (CAPS means pad on the left).${t}`;
}

export function stParseMarker(line: string): { marker: string; cols: StCol[]; rows: number; tail: boolean } | null {
  for (const marker of MARKERS) {
    if (!line.startsWith(marker)) continue;
    const m = /^(\d+[lR](?:,\d+[lR])*):(\d+) rows/.exec(line.slice(marker.length));
    if (!m) continue;
    const cols = m[1]!.split(',').map((t) => ({ w: parseInt(t, 10), a: (t.endsWith('R') ? 'R' : 'L') as StAlign }));
    const rows = parseInt(m[2]!, 10);
    if (!cols.length || !Number.isFinite(rows) || rows < 1) continue;
    return { marker, cols, rows, tail: /takes the rest of the line/.test(line) };
  }
  return null;
}

function splitRow(row: string, k: number, tail: boolean): string[] {
  const out: string[] = [];
  let p = 0;
  for (let j = 0; j < k - 1; j++) {
    const sp = row.indexOf(' ', p);
    if (sp < 0) { out.push(row.slice(p)); return out; }
    out.push(row.slice(p, sp)); p = sp + 1;
  }
  out.push(row.slice(p));
  return out;
}

/**
 * Rewrite the best blocks into a marker line plus single-spaced rows.
 * Returns null when nothing fits or when the inverse does not round-trip.
 */
export function stoichothetesTransform(text: string): { text: string; blocks: number; padMass: number } | null {
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const marker = pickMarker(text);
  if (!marker) return null;
  let lines = text.split(eol);
  let blocks = 0, padMass = 0;
  for (let guard = 0; guard < 6; guard++) {
    const b = stFit(lines);
    if (!b) break;
    const out: string[] = lines.slice(0, b.start);
    out.push(stMarkerLine(marker, b));
    for (let i = b.start; i < b.start + b.rows; i++) {
      const p = fieldsOf(lines[i]!);
      const n = b.cols.length;
      const head = p.f.slice(0, n).join(' ');
      const rest = b.tail ? lines[i]!.slice(p.s[n]!) : '';
      out.push(b.tail ? `${head} ${rest}` : head);
    }
    for (let i = b.start + b.rows; i < lines.length; i++) out.push(lines[i]!);
    lines = out; blocks++; padMass += b.padMass;
  }
  if (!blocks) return null;
  const joined = lines.join(eol);
  if (stoichothetesUndo(joined) !== text) return null;   // self-check before anyone sees it
  return { text: joined, blocks, padMass };
}

/**
 * X128 gate. ΣΤΟΙΧΟΘΈΤΗΣ is OFF BY DEFAULT because it is NOT PARETO-SUPERIOR:
 * it reclaims whitespace on the source text (kubectl-get-pods −88 raw tokens,
 * df-h +54, psql +8, ps-aux +32) but every one of those lanes then compresses
 * WORSE through the frontier (kubectl +24, psql +38, df-h +83), because the
 * dictionary already recovers aligned space runs as shared rules and the
 * geometry marker is paid on top. Measured end-to-end on the real stack, not
 * estimated: see bench/x126/receipts/x128-stoichothetes.log. It ships behind
 * `OMEGA_STOICHOTHETES=1` so the negative result is reproducible and so the
 * mechanism can be re-measured if the frontier ever stops catching space runs.
 */
export function stoichothetesDisabled(): boolean {
  if (typeof process === 'undefined') return true;
  return process.env?.OMEGA_STOICHOTHETES !== '1'
    || process.env?.OMEGA_NO_STOICHOTHETES === '1';
}

/** The reader's inverse: drop each marker and re-pad the rows that follow it. */
export function stoichothetesUndo(text: string): string {
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  let lines = text.split(eol);
  for (let guard = 0; guard < 6; guard++) {
    let hit = -1, parsed: ReturnType<typeof stParseMarker> = null;
    for (let i = 0; i < lines.length && hit < 0; i++) {
      const p = stParseMarker(lines[i]!);
      if (p) { hit = i; parsed = p; }
    }
    if (hit < 0 || !parsed) break;
    const w = parsed!.cols.map((c) => c.w);
    const a = parsed!.cols.map((c) => c.a);
    const out: string[] = lines.slice(0, hit);
    const n = Math.min(parsed!.rows, lines.length - hit - 1);
    for (let r = 0; r < n; r++) {
      const k = parsed!.cols.length + (parsed!.tail ? 1 : 0);
      out.push(stRebuildRow(splitRow(lines[hit + 1 + r]!, k, parsed!.tail), w, a, parsed!.tail));
    }
    for (let q = hit + 1 + n; q < lines.length; q++) out.push(lines[q]!);
    lines = out;
  }
  return lines.join(eol);
}
