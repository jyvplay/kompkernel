/**
 * ⟟ STATHMOS — fixed-width decimal columns: trailing zeros removed, restored from a one-line header (X17).
 * =============================================================================
 * MECHANISM (what is new in this stack; the families it sits next to are listed in docs/codec-abbreviations.md):
 *   A delimited table (comma-separated, optional CRLF line ends) is transformed only where a column is
 *   FIXED-WIDTH: every data cell of the column is a decimal number with exactly D fraction digits (D >= 1).
 *   Trailing zeros of those cells are removed (and the '.' when the fraction becomes empty). A first line
 *       @dp D1,D2,...,Dk [crlf]
 *   records D per column (0 = column untouched) and the line ending. The header row of the table is never changed.
 *   Restore: every decimal-column cell is padded back to exactly D fraction digits. Exact by construction, since
 *   the column is fixed-width; the encoder also decodes its own output and compares byte for byte.
 *
 * WHY: exports and logs with fixed precision (sensor data, prices at 6 decimals, timing tables) spend
 *   tokens on zero runs ("17.240000" is 4 o200k tokens, "17.24" is 3). The DAEDALUS rules do not remove
 *   them, because the zero runs differ per cell.
 *
 * GATE: the encoder returns the cheaper of (a) LAKONIKOS-D on the raw text and (b) LAKONIKOS-D on the transformed
 *   text, plus the restore sentence. (b) is taken only when it is strictly cheaper, so STATHMOS never costs more
 *   than LAKONIKOS-D. Disclosed: both branches use the DAEDALUS-D wire, which has a wall-clock budget
 *   (constant under OMEGA_DET=1).
 *
 * ESCAPE: an input that begins with the header marker or the raw marker is sent as "@raw\n" + text, so the
 *   decoder can tell the two cases apart without ambiguity.
 *
 * DECODE: chironDecode(wire); if the result begins with "@dp " it is restored; if it begins with "@raw\n" the
 *   marker is removed; otherwise it is returned as is.
 */
import { countTokens, type EncodingName } from './bpe';
import { chironDecode } from './chiron';
import { lakonikosDualEncode } from './lakonikos-d';

export const STATHMOS_MARK = '@dp ';
export const STATHMOS_RAW = '@raw\n';
/** the restore sentence appended to the decoder message; the only extra contract text of this codec */
export const STATHMOS_CONTRACT =
  'Line 1 (@dp) gives the decimal count of each column (0 = none; crlf = CRLF line ends). Drop that line, then pad each decimal cell of a counted column with zeros to its count.';

const FIXED = /^-?\d+\.\d+$/;

export interface StathmosForward { text: string; dp: number[]; crlf: boolean }

/** Forward transform. Returns null when no column is fixed-width (or the input is an escape case). */
export function stathmosForward(input: string): StathmosForward | null {
  if (input.startsWith(STATHMOS_MARK) || input.startsWith(STATHMOS_RAW)) return null;
  const lines = input.split('\n');
  const trailingNL = lines.length > 0 && lines[lines.length - 1] === '';
  const body = trailingNL ? lines.slice(0, -1) : lines;
  if (body.length < 2) return null;
  const crlf = body.every(l => l.endsWith('\r'));
  const strip = (l: string) => (crlf ? l.slice(0, -1) : l);
  const rows = body.map(l => strip(l).split(','));
  const ncol = Math.max(...rows.map(r => r.length));
  const data = rows.slice(1);
  const dp: number[] = [];
  for (let c = 0; c < ncol; c++) {
    const first = data[0]?.[c];
    let D = 0;
    if (first !== undefined && FIXED.test(first)) D = first.split('.')[1].length;
    let ok = D >= 1;
    for (const r of data) {
      if (!ok) break;
      const v = r[c];
      if (v === undefined || !FIXED.test(v) || v.split('.')[1].length !== D) ok = false;
    }
    dp.push(ok ? D : 0);
  }
  if (dp.every(d => d === 0)) return null;
  const outRows = rows.map((r, i) => (i === 0 ? r : r.map((v, c) => {
    if (dp[c] === 0) return v;
    const s = v.replace(/0+$/, '');
    return s.endsWith('.') ? s.slice(0, -1) : s;
  })));
  const lineEnd = crlf ? '\r' : '';
  const outLines = [STATHMOS_MARK + dp.join(',') + (crlf ? ' crlf' : ''), ...outRows.map(r => r.join(',') + lineEnd)];
  return { text: outLines.join('\n') + (trailingNL ? '\n' : ''), dp, crlf };
}

/** Inverse of the transform. Returns null if the text does not begin with the header. */
export function stathmosRestore(t: string): string | null {
  if (!t.startsWith(STATHMOS_MARK)) return null;
  const lines = t.split('\n');
  const trailingNL = lines.length > 0 && lines[lines.length - 1] === '';
  const body = trailingNL ? lines.slice(0, -1) : lines;
  const parts = body[0].slice(STATHMOS_MARK.length).split(' ');
  const dp = parts[0].split(',').map(Number);
  const crlf = parts[1] === 'crlf';
  const lineEnd = crlf ? '\r' : '';
  const rows = body.slice(1).map((l, i) => {
    const cells = (crlf && l.endsWith('\r') ? l.slice(0, -1) : l).split(',');
    if (i === 0) return cells.join(',') + lineEnd; // CSV header row: never changed
    const out = cells.map((v, c) => {
      const D = dp[c] ?? 0;
      if (D === 0 || v === '') return v;
      const m = /^(-?\d+)(?:\.(\d*))?$/.exec(v);
      if (!m) return v;
      return m[1] + '.' + (m[2] ?? '').padEnd(D, '0');
    });
    return out.join(',') + lineEnd;
  });
  return rows.join('\n') + (trailingNL ? '\n' : '');  // the @dp header line is dropped
}

/** Decoder: the one-chat reading of a STATHMOS wire, exactly as a reader must perform it. */
export function stathmosDecode(wire: string): string {
  const d = chironDecode(wire);
  if (d.startsWith(STATHMOS_MARK)) {
    const r = stathmosRestore(d);
    if (r === null) throw new Error('STATHMOS: header present but restore failed');
    return r;
  }
  if (d.startsWith(STATHMOS_RAW)) return d.slice(STATHMOS_RAW.length);
  return d;
}

export interface StathmosResult {
  codec: 'stathmos';
  wire: string;
  /** the full message: decoder contract with the wire embedded (plus the restore sentence when transformed) */
  message: string;
  decoded: string;
  exact: boolean;
  mode: 'raw' | 'stathmos';
  transformed: boolean;
  dp: number[];
  messageTokens: Record<'o200k_base' | 'cl100k_base', number>;
  /** the LAKONIKOS-D message on the raw text (the base the gate compares to) */
  baseTokens: Record<'o200k_base' | 'cl100k_base', number>;
  inTokens: Record<'o200k_base' | 'cl100k_base', number>;
  notes: string;
}

export function stathmosEncode(text: string, enc: EncodingName = 'o200k_base'): StathmosResult {
  const guarded = text.startsWith(STATHMOS_MARK) || text.startsWith(STATHMOS_RAW);
  const rawIn = guarded ? STATHMOS_RAW + text : text;
  const base = lakonikosDualEncode(rawIn, enc);
  const inTokens = { o200k_base: countTokens(text, 'o200k_base'), cl100k_base: countTokens(text, 'cl100k_base') };
  const baseTokens = base.messageTokens;
  const baseOut: StathmosResult = {
    codec: 'stathmos', wire: base.wire, message: base.decoderPrompt || rawIn, decoded: text,
    exact: stathmosDecode(base.wire) === text, mode: 'raw', transformed: false, dp: [],
    messageTokens: baseTokens, baseTokens, inTokens,
    notes: `identity-of-STATHMOS (LAKONIKOS-D ${base.mode}); guard=${guarded}`,
  };
  const fw = stathmosForward(text);
  if (!fw) return baseOut;
  const tr = lakonikosDualEncode(fw.text, enc);
  if (tr.mode !== 'daedalus') return baseOut;
  const message = tr.decoderPrompt + '\n' + STATHMOS_CONTRACT;
  const trTokens = { o200k_base: countTokens(message, 'o200k_base'), cl100k_base: countTokens(message, 'cl100k_base') };
  if (trTokens[enc] >= baseTokens[enc]) return baseOut;
  const exact = stathmosDecode(tr.wire) === text;
  if (!exact) return baseOut;
  return {
    codec: 'stathmos', wire: tr.wire, message, decoded: text, exact: true, mode: 'stathmos',
    transformed: true, dp: fw.dp, messageTokens: trTokens, baseTokens, inTokens,
    notes: `dp=${fw.dp.join(',')}${fw.crlf ? ' crlf' : ''}; LAKONIKOS-D raw ${baseTokens.o200k_base} -> stathmos ${trTokens.o200k_base} (o200k)`,
  };
}
