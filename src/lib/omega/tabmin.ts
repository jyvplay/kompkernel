/**
 * ⊞ TABMIN — per-table layout choice between row-major and column-major, over LAKONIKOS.
 * =============================================================================
 *
 * Scope (read this first): this is a TABULAR lane codec. It only changes inputs that are
 * simple rectangular comma-separated tables. Everything else is returned as the LAKONIKOS
 * row arm, byte-identical to LAKONIKOS.
 *
 * What it does
 *   Row arm   : LAKONIKOS(T) unchanged.
 *   Column arm: T is transposed to one line per column (cells joined by ','), then coded with
 *               LAKONIKOS. The reader is given one extra sentence (COLUMN_NOTE) saying that
 *               each line is a column and that row i is the i-th cell of every line.
 *   Choice    : the arm with fewer o200k tokens of the FULL one-chat message (note included).
 *               The column arm is only eligible if its wire decodes back to T exactly.
 *
 * Why this is a two-arm choice and not a predictor: a predictor from cheap table features
 * (cell length, numeric fraction) selected the winning arm on 9 of 31 tables (see the report).
 * The choice therefore runs both arms. This is a tournament over two arms, and the report says so.
 *
 * Guarantees (by construction)
 *   - never more tokens than LAKONIKOS(T) on the same input, because the row arm is LAKONIKOS(T)
 *     and the column arm is only chosen when it is strictly fewer tokens including its note.
 *   - exact: the chosen arm's output is verified by decoding it back (transpose inverse on the
 *     LAKONIKOS decode of the wire) before it is returned; any mismatch falls back to the row arm.
 *
 * Eligibility (otherwise row arm only): text ends with '\n'; no '"' or '\r'; at least 2 rows and
 * at least 2 columns; every row has the same number of comma-separated cells.
 *
 * Disclosed inheritance: LAKONIKOS inherits DAEDALUS's wall-clock budget, so the column arm and
 * the row arm can both depend on machine load. The transposition itself is deterministic.
 */
import { countTokens, type EncodingName } from './bpe';
import { lakonikosEncode, type LakonikosResult } from './lakonikos';
import { chironDecode } from './chiron';

/** Reader note, sent only when the column arm is chosen. Kept short; its cost is counted. */
export const COLUMN_NOTE =
  'Table in column-major form: each line below is one column; row i is cell i of every line, joined by commas.';

export interface TabminResult {
  codec: 'tabmin';
  arm: 'row' | 'column' | 'row-ineligible';
  /** The one-chat message the reader sees (note + LAKONIKOS prompt in the column arm). */
  message: string;
  /** The wire inside the message (for the chosen arm). */
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  messageTokens: number;
  rowMessageTokens: number;
  columnMessageTokens: number | null;
  notes: string;
}

/** Parse a rectangular comma table. Returns null when the input is not eligible. */
export function parseTable(text: string): string[][] | null {
  if (!text.endsWith('\n')) return null;
  if (text.includes('"') || text.includes('\r')) return null;
  const body = text.slice(0, -1);
  const rows = body.split('\n').map(r => r.split(','));
  if (rows.length < 2) return null;
  const w = rows[0].length;
  if (w < 2) return null;
  if (rows.some(r => r.length !== w)) return null;
  return rows;
}

/** Row-major table -> column-major text (one line per column). Exact inverse: untransposeTable. */
export function transposeTable(rows: string[][]): string {
  const w = rows[0].length;
  const lines: string[] = [];
  for (let c = 0; c < w; c++) lines.push(rows.map(r => r[c]).join(','));
  return lines.join('\n') + '\n';
}

/** Inverse of transposeTable. Returns null if the shape is not consistent. */
export function untransposeTable(colText: string): string | null {
  if (!colText.endsWith('\n')) return null;
  const lines = colText.slice(0, -1).split('\n').map(l => l.split(','));
  if (lines.length < 2) return null;
  const n = lines[0].length;
  if (lines.some(l => l.length !== n)) return null;
  const rows: string[] = [];
  for (let i = 0; i < n; i++) rows.push(lines.map(l => l[i]).join(','));
  return rows.join('\n') + '\n';
}

export function tabminEncode(text: string, enc: EncodingName = 'o200k_base'): TabminResult {
  const row: LakonikosResult = lakonikosEncode(text, enc);
  const rowMsg = row.decoderPrompt;
  const rowTokens = row.messageTokens;
  const base = {
    codec: 'tabmin' as const,
    inTokens: row.inTokens,
    rowMessageTokens: rowTokens,
  };

  const rows = parseTable(text);
  if (!rows) {
    return {
      ...base, arm: 'row-ineligible', message: rowMsg, wire: row.wire, decoded: row.decoded,
      exact: row.exact, messageTokens: rowTokens, columnMessageTokens: null,
      notes: 'not an eligible rectangular table; LAKONIKOS row arm',
    };
  }

  const colText = transposeTable(rows);
  const col: LakonikosResult = lakonikosEncode(colText, enc);
  const colBody = col.decoderPrompt;
  const colMessage = COLUMN_NOTE + '\n' + colBody;
  const colTokens = countTokens(colMessage, enc);

  // Verify the column arm end-to-end: decode its wire, untranspose, compare with the input.
  const colDecoded = chironDecode(col.wire);
  const back = untransposeTable(colDecoded);
  const colExact = back === text && col.exact;

  if (colExact && colTokens < rowTokens) {
    return {
      ...base, arm: 'column', message: colMessage, wire: col.wire, decoded: back!, exact: true,
      messageTokens: colTokens, columnMessageTokens: colTokens,
      notes: `column arm ${colTokens} < row ${rowTokens} (note included); ${rows.length} rows x ${rows[0].length} cols`,
    };
  }
  return {
    ...base, arm: 'row', message: rowMsg, wire: row.wire, decoded: row.decoded, exact: row.exact,
    messageTokens: rowTokens, columnMessageTokens: colExact ? colTokens : null,
    notes: colExact ? `row arm ${rowTokens} <= column ${colTokens}` : 'column arm failed verification; row arm',
  };
}
