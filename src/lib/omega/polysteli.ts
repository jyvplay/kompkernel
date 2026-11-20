/**
 * src/lib/omega/polysteli.ts — X149. ΠΟΛΥΣΤΗΛΗ (polysteli), "many columns".
 * =============================================================================
 *
 * RELATION TO ΣΤΉΛΗ (X124), AND WHY THIS IS A DIFFERENT MECHANISM
 * ---------------------------------------------------------------
 * ΣΤΉΛΗ fits ONE contiguous offset-sliced block and keeps the LAST FIELD to the
 * end of the line, so any row whose trailing column contains SPACES (an `ls -l`
 * name plus ` -> /lib/...` target, a `ps aux` command) breaks the model: the
 * tail would have to be padded like a field. Measured: `steliTransform`
 * returns NULL on bench/holdout-x41/ls-l-real.txt — the biggest canonical lane
 * at 1310 tokens — and the X149 frontier ships that lane with no grid at all.
 *
 * ΠΟΛΥΣΤΗΛΗ changes the geometry: each of the first K fields must END at a
 * uniform column edge (right-edge tiling — the field is the whitespace token
 * that ends there), and everything after the K-th edge is a VERBATIM TAIL
 * carried through unchanged, spaces included. Padding is reconstructed by
 * right-aligning each field to its edge. Conforming stretches are found inside
 * every blank-line block, so headers, arrow rows and odd rows simply pass
 * through, and several independent grids may exist in one message (the
 * ΠΟΛΥ- part). A row that does not rebuild is never emitted.
 *
 * THE READER (single, local, no dictionary)
 * -----------------------------------------
 *     ॥10,3,5,5,9,4,3:149 rows single-spaced, pad field k to width k, rest verbatim.
 *     drwxr-xr-x 4 root root 128 Jun 15 16:59 ImageMagick-6.9.11
 *
 * For the next R rows: read the first K single-spaced fields (K = number of
 * widths), pad field k with spaces on its LEFT so it ends at the k-th
 * cumulative width edge, then append the remainder of the row after the K-th
 * field VERBATIM, starting with whatever spaces follow it. Nothing else
 * changes; reconstruction is byte-exact. The reader applies the marker to
 * exactly R following rows and refuses (throws) if the text runs out, lies
 * about a width, or omits a field — fail closed.
 *
 * GATES (same discipline as ΣΤΉΛΗ)
 * -------------------------------
 *   G1 a stretch is at least MIN_ROWS rows and removes at least MIN_PAD
 *      padding characters; grids need K ≥ MIN_FIELDS uniform edges
 *   G2 every row is rebuilt from its own fields byte-for-byte BEFORE anything
 *      is emitted; tab/CR rows and a pre-existing ॥ marker refuse the transform
 *   G3 polysteliUndo(polysteliTransform(text)) === text on the whole message
 *   G4 one call to the parent chain on the rewritten text, which must decode
 *      to it exactly
 *   G5 polysteliUndo(parent.decoded) === source
 *   G6 the composed message must be strictly cheaper than the incumbent, or
 *      the incumbent ships unchanged
 *
 * RE-ENTRANCY: the child is priced by the parent chain; IN_POLYSTELI makes the
 * nested call refuse so the child's price contains exactly one level.
 *
 * Opt-out: OMEGA_NO_POLYSTELI=1.
 */
import { countTokens, type EncodingName } from './bpe';
import { tagstackEncode, type TagstackResult } from './tagstack';

const MARKER = '॥';
const MIN_ROWS = 6;
const MIN_PAD = 24;
const MIN_FIELDS = 4;

export interface PolysteliGrid {
  /** per-column widths; field k ends at the cumulative edge of widths[0..k] */
  widths: number[];
  rows: string[][];
  tails: string[];
}

interface Stretch { grid: PolysteliGrid; padMass: number }

/** Right-edge tile fit: field k is the token ENDING at the k-th uniform edge. */
function fitStretch(lines: string[]): Stretch | null {
  const parsed: [string, number, number][][] = [];
  for (const l of lines) {
    if (l.includes('\t') || l.includes('\r')) return null;
    const f: [string, number, number][] = [];
    const re = /\S+/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(l))) f.push([m[0], m.index, m.index + m[0].length]);
    if (!f.length || f[0]![1] !== 0) return null;     // margin-zero grids only
    parsed.push(f);
  }
  const n = Math.min(...parsed.map((f) => f.length));
  if (n < MIN_FIELDS) return null;
  const ends: number[] = [];
  for (let c = 0; c < n; c++) {
    const set = new Set(parsed.map((f) => f[c]![2]));
    if (set.size !== 1) break;
    ends.push(parsed[0]![c]![2]);
  }
  if (ends.length < MIN_FIELDS) return null;
  const widths: number[] = [];
  let prev = 0;
  for (const e of ends) { widths.push(e - prev); prev = e; }
  const rows: string[][] = [], tails: string[] = [];
  let padMass = 0;
  for (const [i, f] of parsed.entries()) {
    if (f.length < ends.length) return null;
    const row: string[] = [];
    for (let c = 0; c < ends.length; c++) {
      const t = f[c]!;
      if (t[2] !== ends[c]!) return null;             // row breaks the tile
      row.push(t[0]);
    }
    for (let c = 0; c < ends.length; c++) padMass += widths[c]! - row[c]!.length;
    const tail = lines[i]!.slice(ends[ends.length - 1]!);
    if (tail.length && !/\s/.test(tail[0]!)) return null;
    rows.push(row); tails.push(tail);
  }
  if (padMass < MIN_PAD) return null;
  return { grid: { widths, rows, tails }, padMass };
}

export function polysteliRebuildRow(fields: string[], tail: string, widths: number[]): string | null {
  let out = '';
  for (let c = 0; c < widths.length; c++) {
    const f = fields[c];
    if (f === undefined || f.length > widths[c]!) return null;
    out += ' '.repeat(widths[c]! - f.length) + f;
  }
  return out + tail;
}

export function polysteliTransform(text: string): { text: string; markers: string[] } | null {
  if (text.includes(MARKER)) return null;
  const lines = text.split('\n');
  const markers: string[] = [];
  const out: string[] = [];
  let i = 0, changed = false;
  while (i < lines.length) {
    if (!lines[i]!.length) { out.push(lines[i]!); i++; continue; }
    let j = i;
    while (j < lines.length && lines[j]!.length) j++;
    const block = lines.slice(i, j);
    // conforming stretches inside the block: rows whose first K fields sit on
    // the block's uniform edges; other rows pass through untouched
    let s = 0;
    while (s < block.length) {
      const probe = fitStretch(block.slice(s));
      if (!probe) { out.push(block[s]!); s++; continue; }
      if (probe.grid.rows.length >= MIN_ROWS) {
        const marker = `${MARKER}${probe.grid.widths.join(',')}:${probe.grid.rows.length} rows single-spaced, pad field k to width k, rest verbatim.`;
        if (polysteliParseMarker(marker) === null) throw new Error('ΠΟΛΥΣΤΗΛΗ: emitted marker does not parse');
        markers.push(marker);
        out.push(marker);
        for (const [idx, f] of probe.grid.rows.entries()) {
          const rebuilt = polysteliRebuildRow(f, probe.grid.tails[idx]!, probe.grid.widths);
          if (rebuilt === null || rebuilt !== block[s + idx]!) throw new Error('ΠΟΛΥΣΤΗΛΗ: rebuild disagreement');
          // Emit the compact fields, not `rebuilt`: the latter is the
          // original padded row and made the previous transform a no-op.
          // Keep the tail exactly, including its original leading whitespace.
          out.push(f.join(' ') + probe.grid.tails[idx]!);
        }
        changed = true;
        s += probe.grid.rows.length;
      } else { out.push(block[s]!); s++; }
    }
    i = j;
  }
  if (!changed) return null;
  return { text: out.join('\n'), markers };
}

const RE_MARKER =
  /^(.)(\d+(?:,\d+)+):(\d+) rows single-spaced, pad field k to width k, rest verbatim\.$/;

export function polysteliParseMarker(line: string): { marker: string; widths: number[]; rows: number } | null {
  const m = RE_MARKER.exec(line);
  if (!m) return null;
  const widths = m[2]!.split(',').map(Number);
  const rows = Number(m[3]);
  // Bound untrusted in-band metadata before any repeat() allocation.
  if (widths.some((w) => !Number.isSafeInteger(w) || w <= 0 || w > 400_000)) return null;
  if (widths.reduce((a, b) => a + b, 0) > 400_000) return null;
  if (!Number.isSafeInteger(rows) || rows < 1 || rows > 400_000) return null;
  return { marker: m[1]!, widths, rows };
}

/** Undo: markers name the exact rows that follow them; everything else is literal. */
export function polysteliUndo(text: string): string {
  if (text.length > 400_000) throw new Error('ΠΟΛΥΣΤΗΛΗ: input too large');
  const lines = text.split('\n');
  const out: string[] = [];
  let outputSize = 0;
  const append = (line: string): void => {
    outputSize += line.length + (out.length ? 1 : 0);
    if (outputSize > 400_000) throw new Error('ΠΟΛΥΣΤΗΛΗ: output too large');
    out.push(line);
  };
  for (let i = 0; i < lines.length; i++) {
    const mk = polysteliParseMarker(lines[i]!);
    if (!mk || mk.marker !== MARKER) {
      if (lines[i]!.startsWith(MARKER)) throw new Error('ΠΟΛΥΣΤΗΛΗ: invalid marker');
      append(lines[i]!); continue;
    }
    if (i + mk.rows >= lines.length) throw new Error('ΠΟΛΥΣΤΗΛΗ: marker claims more rows than exist');
    for (let r = 0; r < mk.rows; r++) {
      const line = lines[i + 1 + r]!;
      const re = /\S+/g;
      let end = -1;
      const fields: string[] = [];
      for (let c = 0; c < mk.widths.length; c++) {
        const m = re.exec(line);
        if (!m) throw new Error('ΠΟΛΥΣΤΗΛΗ: row has fewer fields than the marker names');
        fields.push(m[0]);
        end = m.index + m[0].length;
      }
      const tail = line.slice(end);
      const predictedSize = mk.widths.reduce((a, b) => a + b, 0) + tail.length;
      if (outputSize + (out.length ? 1 : 0) + predictedSize > 400_000)
        throw new Error('ΠΟΛΥΣΤΗΛΗ: output too large');
      const rebuilt = polysteliRebuildRow(fields, tail, mk.widths);
      if (rebuilt === null) throw new Error('ΠΟΛΥΣΤΗΛΗ: field overflows its width');
      append(rebuilt);
    }
    i += mk.rows;
  }
  return out.join('\n');
}

/** True while a ΠΟΛΥΣΤΗΛΗ encode is inside its own parent-chain call. */
let IN_POLYSTELI = false;

/**
 * DEFAULT-OFF. The X149 implementation emitted padded rows and its opt-in
 * kubectl run returned 316 rather than 300. The difference was observed, but
 * clock interference was not isolated as its cause and the claimed all-lanes
 * comparison was incomplete. X150 repairs the transform; the repaired arm needs
 * fresh end-to-end and native-readability tests before default admission.
 * OMEGA_POLYSTELI=1 opts into the experiment.
 */
export function polysteliDisabled(): boolean {
  if (typeof process === 'undefined') return true;
  if (process.env?.OMEGA_POLYSTELI === '1') return false;
  return process.env?.OMEGA_NO_POLYSTELI !== '0';
}

export interface PolysteliResult {
  codec: 'polysteli';
  applied: boolean;
  message: string;
  decoded: string;
  exact: boolean;
  messageTokens: number;
  frontierTokens: number;
  notes: string;
  frontier?: TagstackResult;
}

function refuse(why: string, frontierTokens: number, notes?: string): PolysteliResult {
  return { codec: 'polysteli', applied: false, message: '', decoded: '', exact: false,
    messageTokens: frontierTokens, frontierTokens, notes: notes ?? why };
}

/**
 * Compose ΠΟΛΥΣΤΗΛΗ with the parent chain: transform, price by the parent,
 * undo, verify byte-exactness at every layer, admit only on strict gain.
 */
export function polysteliEncode(
  text: string,
  enc: EncodingName = 'o200k_base',
  options: { incumbent?: number; inner?: (t: string, e: EncodingName) => TagstackResult } = {},
): PolysteliResult {
  const innerFn = options.inner ?? ((t: string, e: EncodingName) => tagstackEncode(t, e));
  let baseTokens = options.incumbent ?? 0;
  if (options.incumbent === undefined) baseTokens = innerFn(text, enc).messageTokens;
  if (polysteliDisabled()) return refuse('disabled (OMEGA_NO_POLYSTELI=1)', baseTokens);
  if (IN_POLYSTELI) return refuse('re-entrancy guard', baseTokens);
  if (!text.length || text.length > 400_000) return refuse('length out of range', baseTokens);

  let tr: ReturnType<typeof polysteliTransform> = null;
  try { tr = polysteliTransform(text); } catch (e) { return refuse(`transform threw: ${String(e).slice(0, 80)}`, baseTokens); }
  if (!tr) return refuse('no uniform-edge grid stretch with a tail', baseTokens);

  try {
    if (polysteliUndo(tr.text) !== text) return refuse('G3 own inverse disagrees', baseTokens);
  } catch (e) {
    // A marker can push an otherwise eligible input over the inverse's size
    // cap. An untrusted transform must fail closed before parent execution.
    return refuse(`G3 undo threw: ${String(e).slice(0, 80)}`, baseTokens);
  }

  let inner: TagstackResult;
  IN_POLYSTELI = true;
  try { inner = innerFn(tr.text, enc); } catch { return refuse('parent chain threw', baseTokens); } finally { IN_POLYSTELI = false; }
  if (inner.decoded !== tr.text) return refuse('G4 parent does not reproduce the rewritten text', baseTokens);
  let decoded = '';
  try { decoded = polysteliUndo(inner.decoded); } catch (e) { return refuse(`G5 undo threw on parent output: ${String(e).slice(0, 80)}`, baseTokens); }
  if (decoded !== text) return refuse('G5 undo(parent output) !== source', baseTokens);

  const message = inner.message;
  const messageTokens = countTokens(message, enc);
  if (messageTokens >= baseTokens) {
    return refuse(`G6 loses ${messageTokens} vs ${baseTokens}`, baseTokens,
      `ΠΟΛΥΣΤΗΛΗ refused: M ${messageTokens} >= incumbent ${baseTokens}`);
  }
  return {
    codec: 'polysteli', applied: true, message, decoded, exact: true,
    messageTokens, frontierTokens: baseTokens,
    notes: `ΠΟΛΥΣΤΗΛΗ ${tr.markers.length} grid(s); M ${baseTokens}->${messageTokens}`,
    frontier: inner,
  };
}

export function polysteliSelfTest(enc: EncodingName = 'o200k_base'): { pass: number; fail: number; log: string[] } {
  const log: string[] = [];
  let pass = 0, fail = 0;
  const check = (name: string, cond: boolean): void => {
    if (cond) { pass++; log.push(`ok   ${name}`); } else { fail++; log.push(`FAIL ${name}`); }
  };
  const row = (size: string, tail: string): string => `drwxr-xr-x   2 root  root  ${size}   ${tail}\n`;
  const table = 'PERMS   LINK OWNER GRP  SIZE\n'
    + row('60', 'alpha beta gamma') + row('496', 'file.o') + row('128', 'dir with spaces')
    + row('60', 'audit') + row('128', 'engines-3') + row('60', 'bfd-plugins')
    + row('4096', 'cryptsetup') + row('60', 'e2fsprogs');
  const tr = polysteliTransform(table);
  check('header passes through, rows fit', !!tr && tr.text.split('\n')[1]!.startsWith(MARKER) && tr.markers.length === 1);
  if (tr) {
    check('undo round-trip', polysteliUndo(tr.text) === table);
    check('marker parses', polysteliParseMarker(tr.markers[0]!) !== null);
  }
  check('rejects pre-existing marker', polysteliTransform(`${MARKER}1,2:6 rows single-spaced, pad field k to width k, rest verbatim.\n`) === null);
  check('rejects tab rows', polysteliTransform('a  b  c  d\ttail\n'.repeat(8)) === null);
  const short = 'a  b  c  d tail\n'.repeat(3);
  const trShort = polysteliTransform(short);
  check('runs under MIN_ROWS refused', !trShort || polysteliUndo(trShort.text) === short);
  const fake = `${MARKER}1,1,1,1:1 rows single-spaced, pad field k to width k, rest verbatim.\naa b c d e\n`;
  let threw = false;
  try { polysteliUndo(fake); } catch { threw = true; }
  check('lying marker fails closed', threw);
  const truncated = `${MARKER}1,1,1,1:9 rows single-spaced, pad field k to width k, rest verbatim.\na b c d e\n`;
  threw = false;
  try { polysteliUndo(truncated); } catch { threw = true; }
  check('row-count lie fails closed', threw);
  const widths = polysteliParseMarker(`${MARKER}3,4,5,6:1 rows single-spaced, pad field k to width k, rest verbatim.`)!.widths;
  check('rebuild pads to edges', polysteliRebuildRow(['ab', 'cd', 'ef', 'g'], ' tail', widths) === ' ab  cd   ef     g tail');
  check('overflow rebuild is null', polysteliRebuildRow(['toolongfield', 'b', 'c', 'd'], '', widths) === null);
  check('marker token is one token', countTokens(MARKER, enc) === 1);
  return { pass, fail, log };
}
