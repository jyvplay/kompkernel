/**
 * src/lib/omega/athroismos.ts
 * =============================================================================
 * ATHROISMOS (ἀθροισμός, "a gathering, an accumulation") — driven-recurrence
 * column elision for delimited tables. X54.
 *
 * THE GAP
 * -----------------------------------------------------------------------------
 * Every dependency this stack can state about a table cell is one of:
 *   same-row    SYLLOGISMOS/TAXIS: y is a function of other fields in its row;
 *   above-only  APOGRAPHE `above`/`int`/`days`: y is the value above (±const);
 *   index       METRON `lin`/`clock`: y is a function of the row index;
 *   copy        APOGRAPHE `col`: y duplicates another field in its row.
 * (APOGRAPHE's predictor type is the complete list — read in X54.)
 * None of them can state the dependency that defines the most-pasted
 * financial table there is — a statement's balance column:
 *
 *      y_i = y_{i-1} + credit_i - debit_i
 *
 * a first-order recurrence DRIVEN by other columns of the same row. The
 * balance digits are fresh on every row, so dictionary codecs pay for them
 * in full (measured X54 probe on a real 241-row statement fixture:
 * AKOLOUTHIA-2 3,198 with the balance vs 2,126 without). Running totals
 * have the same shape everywhere: cumulative counts, YTD columns, odometer
 * readings from trip deltas, inventory-on-hand.
 *
 * MECHANISM
 * -----------------------------------------------------------------------------
 * Detect a column that is an exact running accumulation — one driver with
 * a sign ({y} = previous {y} ± {x}) or two drivers ({y} = previous {y} +
 * {credit} - {debit}) — starting from a constant stated once, all in exact
 * BigInt decimal arithmetic at the columns' uniform scale, plain or
 * German (1.234,56) rendering. Empty driver cells count as 0 (statement
 * convention). Up to ATHROISMOS_MAX_EXCEPTIONS rows may break the chain
 * (real files contain adjustments and planted errors — the X54 headline
 * fixture has exactly one deliberate balance break); each break ships its
 * printed value in the contract and the chain resumes from that printed
 * value. The column is dropped; the reader rebuilds it downwards. The
 * reduced text is coded by the cheapest measured of DAEDALUS /
 * AKOLOUTHIA-2 / APOGRAPHE, and the complete candidate must beat
 * AKOLOUTHIA-2 and APOGRAPHE on the source (necessary condition; both are
 * TAGSTACK runtime-parent members) and then the full TAGSTACK +
 * SIBLING-TEMPLATE frontier strictly, byte-exact — else the measured best
 * parent is returned untouched. A wrong guess can only refuse: acceptance
 * requires the restored text to equal the input byte-for-byte.
 *
 * READER PROTOCOL / HONEST CAVEAT
 * -----------------------------------------------------------------------------
 * Unlike same-row rules, a recurrence makes the reader carry state down
 * the column; an arithmetic slip changes that row's digits (the format
 * stays well-formed, so errors are silent downstream — although a shipped
 * exception row re-anchors the chain). This is the price of the mechanism
 * and it is measured in blind decode receipts, not hidden (bench/x54/).
 *
 * Prior art, honestly: functional and order dependencies are database
 * classics (survey: Kossmann et al., "Data dependencies for query
 * optimization", VLDB Journal 2022, DOI 10.1007/s00778-021-00676-3);
 * FD-based semantic compressors are cited under SYLLOGISMOS. A *driven
 * first-order recurrence* as an elision rule — a sequential (not
 * same-row) arithmetic dependency verified exactly and taught in-band for
 * a stock LLM to re-integrate byte-perfectly — has no paper behind it in
 * this form; citation for the specific mechanism: none. In-stack
 * neighbours: SYLLOGISMOS (same-row), APOGRAPHE/METRON (above/index),
 * HEMERA/HORA (date deltas shipped as payload, not elision).
 *
 * Greedy/search: discovery is exhaustive over the small candidate space
 * (targets × drivers × {cum1±, cum2}) with exact per-row verification and
 * an exception budget; ranking charges the true rendered contract and the
 * true reduced text; whole-input restore arbitrates. Emission is a
 * measured gate. Not greedy in emission; single-drop by construction in
 * v1 (multiple cumulative columns are an extension, as are group resets).
 *
 * Time/CPU: CPU-bound. Planner is polynomial by caps (rows × cols^2 with
 * early abort, ATHROISMOS_MAX_WORK); the inherited parent encodes and the
 * TAGSTACK frontier dominate wall time and have no wrapper-wide cap, so
 * the registry entry is deep-audit-only like SYLLOGISMOS/TAXIS.
 */

import { countTokens, type EncodingName } from './bpe';
import { daedalusEncode } from './daedalus';
import { akolouthia2Encode } from './akolouthia2';
import { apographeEncode, apographeDecodeResult } from './apographe';
import { tagstackEncode, type TagstackResult } from './tagstack';
import { siblingTemplateEncode, type SiblingTemplateResult } from './sibling-template';

export const ATHROISMOS_MAX_CHARS = 400_000;
export const ATHROISMOS_MAX_ROWS = 20_000;
export const ATHROISMOS_MAX_COLS = 40;
export const ATHROISMOS_MIN_DATA_ROWS = 8;
export const ATHROISMOS_MAX_EXCEPTIONS = 3;
export const ATHROISMOS_MAX_WORK = 60_000_000;

// ---------------------------------------------------------------------------
// CSV parsing (single-line records; raw field spans preserved)
// ---------------------------------------------------------------------------

interface CsvRow { fields: string[]; values: string[] }

function splitCsvLine(line: string, delim: string): CsvRow | null {
  const fields: string[] = [];
  const values: string[] = [];
  let i = 0;
  const n = line.length;
  while (true) {
    let j = i;
    let val = '';
    if (line[j] === '"') {
      j++;
      let closed = false;
      while (j < n) {
        if (line[j] === '"') {
          if (line[j + 1] === '"') { val += '"'; j += 2; } else { j++; closed = true; break; }
        } else val += line[j++];
      }
      if (!closed) return null;
    } else {
      while (j < n && line[j] !== delim) val += line[j++];
    }
    fields.push(line.slice(i, j));
    values.push(val);
    if (j >= n) break;
    if (line[j] !== delim) return null;
    i = j + 1;
    if (i === n) { fields.push(''); values.push(''); break; }
  }
  return { fields, values };
}

interface ParsedTable {
  delimiter: string;
  eols: string[];
  rows: CsvRow[]; // includes header at [0]
}

function parseTableFor(text: string, delim: string): ParsedTable | null {
  const rawLines = text.split('\n');
  const rows: CsvRow[] = [];
  const eols: string[] = [];
  for (let li = 0; li < rawLines.length; li++) {
    const isLast = li === rawLines.length - 1;
    let body = rawLines[li]!;
    let eol = isLast ? '' : '\n';
    if (!isLast && body.endsWith('\r')) { body = body.slice(0, -1); eol = '\r\n'; }
    if (isLast && body === '') break;
    if (body.length === 0) return null;
    const row = splitCsvLine(body, delim);
    if (!row) return null;
    rows.push(row);
    eols.push(eol);
  }
  if (rows.length < ATHROISMOS_MIN_DATA_ROWS + 1 || rows.length > ATHROISMOS_MAX_ROWS + 1) return null;
  const cols = rows[0]!.values.length;
  if (cols < 2 || cols > ATHROISMOS_MAX_COLS) return null;
  if (rows.some((r) => r.values.length !== cols)) return null;
  return { delimiter: delim, eols, rows };
}

// ---------------------------------------------------------------------------
// Number styles: plain decimal, or German (1.234,56). Exact BigInt values.
// ---------------------------------------------------------------------------

export type AthroismosStyle = 'plain' | 'de';

interface NumCell { v: bigint; scale: number } // v = value * 10^scale

const PLAIN_RE = /^-?(\d+)(?:\.(\d+))?$/;
const DE_GROUPED_RE = /^-?(\d{1,3}(?:\.\d{3})+)(?:,(\d+))?$/;
const DE_PLAIN_RE = /^-?(\d+)(?:,(\d+))?$/;

function parseStyled(s: string, style: AthroismosStyle, grouped: boolean): NumCell | null {
  if (style === 'plain') {
    const m = PLAIN_RE.exec(s);
    if (!m) return null;
    const frac = m[2] ?? '';
    const mag = BigInt(m[1] + frac);
    return { v: s.startsWith('-') ? -mag : mag, scale: frac.length };
  }
  const m = (grouped ? DE_GROUPED_RE : DE_PLAIN_RE).exec(s) ?? (!grouped ? null : DE_PLAIN_RE.exec(s));
  if (!m) return null;
  const intDigits = m[1]!.replace(/\./g, '');
  const frac = m[2] ?? '';
  const mag = BigInt(intDigits + frac);
  return { v: s.startsWith('-') ? -mag : mag, scale: frac.length };
}

function renderStyled(v: bigint, scale: number, style: AthroismosStyle, grouped: boolean): string {
  const neg = v < 0n;
  const a = (neg ? -v : v).toString().padStart(scale + 1, '0');
  let intPart = scale === 0 ? a : a.slice(0, a.length - scale);
  const fracPart = scale === 0 ? '' : a.slice(a.length - scale);
  if (style === 'de' && grouped) {
    intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }
  const sep = style === 'de' ? ',' : '.';
  return (neg ? '-' : '') + intPart + (scale === 0 ? '' : sep + fracPart);
}

/** Parse a whole column of values under a candidate style; uniform scale required. */
function parseColumn(
  values: string[], style: AthroismosStyle, grouped: boolean, allowEmpty: boolean,
): { cells: (bigint | null)[]; scale: number } | null {
  const cells: (bigint | null)[] = [];
  let scale = -1;
  for (const s of values) {
    if (s === '') {
      if (!allowEmpty) return null;
      cells.push(null);
      continue;
    }
    const c = parseStyled(s, style, grouped);
    if (!c) return null;
    if (scale === -1) scale = c.scale;
    if (c.scale !== scale) return null;
    cells.push(c.v);
  }
  if (scale === -1) return null;
  return { cells, scale };
}

// ---------------------------------------------------------------------------
// Recurrence spec
// ---------------------------------------------------------------------------

export interface AthroismosRule {
  kind: 'cum1' | 'cum2';
  /** finished-table field index (0-based) of the dropped column */
  col: number;
  /** the dropped column's header cell value (needed to rebuild the header) */
  headerName: string;
  /** cum1: the single driver column (finished-table index) and its sign */
  d1?: number;
  s1?: 1 | -1;
  /** cum2: plus driver and minus driver (finished-table indices) */
  plus?: number;
  minus?: number;
  /** running value before the first data row, rendered */
  startText: string;
  /** data-row indices (0-based) whose printed value replaces the computed one */
  exceptions: { row: number; text: string }[];
}

export interface AthroismosSpec {
  v: 1;
  delimiter: string;
  style: AthroismosStyle;
  grouped: boolean;
  rule: AthroismosRule;
  scale: number;
}

export interface AthroismosPlan {
  spec: AthroismosSpec;
  reducedText: string;
  contract: string;
  estMessagesTokensSaved: number;
}

interface Candidate {
  rule: AthroismosRule;
  startV: bigint;
}

/** Fit a recurrence for target column t. cells are scaled bigints (target scale). */
function fitRecurrence(
  target: (bigint | null)[], drivers: { col: number; cells: (bigint | null)[] }[],
  t: number, render: (v: bigint) => string, work: { n: number },
): Candidate[] {
  const out: Candidate[] = [];
  const ys = target as bigint[];
  const R = ys.length;
  const val = (cells: (bigint | null)[], i: number): bigint => cells[i] ?? 0n;

  const trial = (
    kind: 'cum1' | 'cum2', terms: { col: number; sign: 1 | -1; cells: (bigint | null)[] }[],
  ): Candidate | null => {
    const step = (i: number): bigint => {
      let ssum = 0n;
      for (const tm of terms) ssum += BigInt(tm.sign) * val(tm.cells, i);
      return ssum;
    };
    const startV = ys[0]! - step(0);
    let prev = startV;
    const exceptions: { row: number; text: string }[] = [];
    let moves = 0;
    for (let i = 0; i < R; i++) {
      work.n++;
      if (work.n > ATHROISMOS_MAX_WORK) return null;
      const st = step(i);
      if (st !== 0n) moves++;
      const pred = prev + st;
      if (pred !== ys[i]!) {
        exceptions.push({ row: i, text: render(ys[i]!) });
        if (exceptions.length > ATHROISMOS_MAX_EXCEPTIONS) return null;
      }
      prev = ys[i]!;
    }
    if (moves < 3) return null; // degenerate: drivers don't move the chain
    const distinct = new Set(ys.map((v) => v.toString()));
    if (distinct.size < 3) return null;
    const rule: AthroismosRule = kind === 'cum1'
      ? { kind, col: t, headerName: '', d1: terms[0]!.col, s1: terms[0]!.sign, startText: render(startV), exceptions }
      : { kind, col: t, headerName: '', plus: terms[0]!.col, minus: terms[1]!.col, startText: render(startV), exceptions };
    return { rule, startV };
  };

  for (const d of drivers) {
    if (d.col === t) continue;
    for (const sign of [1, -1] as const) {
      const c = trial('cum1', [{ col: d.col, sign, cells: d.cells }]);
      if (c) out.push(c);
    }
  }
  for (const dPlus of drivers) {
    if (dPlus.col === t) continue;
    for (const dMinus of drivers) {
      if (dMinus.col === t || dMinus.col === dPlus.col) continue;
      const c = trial('cum2', [
        { col: dPlus.col, sign: 1, cells: dPlus.cells },
        { col: dMinus.col, sign: -1, cells: dMinus.cells },
      ]);
      if (c) out.push(c);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Contract
// ---------------------------------------------------------------------------

function delimName(d: string): string {
  return d === ',' ? 'comma' : d === '\t' ? 'tab' : d === ';' ? 'semicolon' : 'pipe';
}

function buildContract(
  table: ParsedTable, spec: AthroismosSpec,
): string {
  const { rule } = spec;
  const header = table.rows[0]!.values;
  const ref = (col: number): string => {
    const name = header[col]!;
    if (name !== '' && !/[{}"]/.test(name) && header.filter((x) => x === name).length === 1) return `{${name}}`;
    return `field ${col + 1}`;
  };
  const tgtName = header[rule.col]!;
  const tgtDesc = tgtName !== '' && !/["]/.test(tgtName)
    ? `"${tgtName}" as field ${rule.col + 1}`
    : `a field as field ${rule.col + 1}`;
  const formula = rule.kind === 'cum1'
    ? `running value ${rule.s1 === 1 ? '+' : '-'} ${ref(rule.d1!)}`
    : `running value + ${ref(rule.plus!)} - ${ref(rule.minus!)}`;
  const exc = rule.exceptions.length
    ? `; except ${rule.exceptions
        .map((e) => `data row ${e.row + 1} = ${e.text}`)
        .join(', ')} (continue running from each printed exception value)`
    : '';
  const decNote = spec.scale === 0 ? 'as an integer' : `with exactly ${spec.scale} decimals`;
  const styleNote = spec.style === 'de'
    ? ` Numbers are German format (1.234,56: dot-grouped thousands, comma point); compute and write in that format.`
    : '';
  return `ATHROISMOS: after decoding below, insert ${tgtDesc} of the header and each row of the ${delimName(spec.delimiter)}-separated table: hold a running value, ${rule.startText} before data row 1; each row's inserted value = ${formula} (empty field = 0), written ${decNote}, and becomes the running value for the next row${exc}. {x} means that row's decoded {x}.${styleNote} Change nothing else.`;
}

// ---------------------------------------------------------------------------
// Reduced text / restore
// ---------------------------------------------------------------------------

function buildReduced(table: ParsedTable, dropCol: number): string {
  const out: string[] = [];
  for (let r = 0; r < table.rows.length; r++) {
    const row = table.rows[r]!;
    out.push(row.fields.filter((_, j) => j !== dropCol).join(table.delimiter) + table.eols[r]);
  }
  return out.join('');
}

/** Recompute the dropped column from the reduced table. Returns finished rows' values. */
function computeColumn(
  reduced: ParsedTable, spec: AthroismosSpec,
): string[] | null {
  const { rule } = spec;
  const fullCols = reduced.rows[0]!.values.length + 1;
  // map finished-table index -> reduced index
  const ridx = (c: number): number => (c < rule.col ? c : c - 1);
  const driverCols = rule.kind === 'cum1'
    ? [{ c: ridx(rule.d1!), sign: BigInt(rule.s1!) }]
    : [{ c: ridx(rule.plus!), sign: 1n }, { c: ridx(rule.minus!), sign: -1n }];
  const R = reduced.rows.length - 1;
  if (R < 1 || fullCols < 2) return null;
  const startCell = parseStyled(rule.startText, spec.style, spec.grouped);
  if (!startCell || startCell.scale !== spec.scale) return null;
  let prev = startCell.v;
  const exc = new Map(rule.exceptions.map((e) => [e.row, e.text]));
  const out: string[] = [];
  for (let i = 0; i < R; i++) {
    const row = reduced.rows[i + 1]!.values;
    let step = 0n;
    for (const d of driverCols) {
      const s = row[d.c]!;
      if (s === '') continue;
      const cell = parseStyled(s, spec.style, spec.grouped);
      if (!cell || cell.scale !== spec.scale) return null;
      step += d.sign * cell.v;
    }
    let v = prev + step;
    let text: string;
    const ex = exc.get(i);
    if (ex !== undefined) {
      const cell = parseStyled(ex, spec.style, spec.grouped);
      if (!cell || cell.scale !== spec.scale) return null;
      text = ex;
      v = cell.v;
    } else {
      text = renderStyled(v, spec.scale, spec.style, spec.grouped);
    }
    out.push(text);
    prev = v;
  }
  return out;
}

export function athroismosRestore(reducedText: string, spec: AthroismosSpec): string {
  const reduced = parseTableForLenient(reducedText, spec.delimiter);
  if (!reduced) throw new Error('ATHROISMOS reduced text is not a parseable table');
  const vals = computeColumn(reduced, spec);
  if (!vals) throw new Error('ATHROISMOS recurrence could not be evaluated');
  const { rule } = spec;
  const out: string[] = [];
  const headerName = rule.headerName;
  for (let r = 0; r < reduced.rows.length; r++) {
    const fields = [...reduced.rows[r]!.fields];
    const insertVal = r === 0 ? renderFieldSimple(headerName, spec.delimiter) : vals[r - 1]!;
    fields.splice(rule.col, 0, insertVal);
    out.push(fields.join(spec.delimiter) + reduced.eols[r]);
  }
  return out.join('');
}

function renderFieldSimple(value: string, delim: string): string {
  if (value.includes(delim) || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

/** Restore-side parse: like parseTableFor but tolerates a 1-column reduced table. */
function parseTableForLenient(text: string, delim: string): ParsedTable | null {
  const rawLines = text.split('\n');
  const rows: CsvRow[] = [];
  const eols: string[] = [];
  for (let li = 0; li < rawLines.length; li++) {
    const isLast = li === rawLines.length - 1;
    let body = rawLines[li]!;
    let eol = isLast ? '' : '\n';
    if (!isLast && body.endsWith('\r')) { body = body.slice(0, -1); eol = '\r\n'; }
    if (isLast && body === '') break;
    if (body.length === 0) return null;
    const row = splitCsvLine(body, delim);
    if (!row) return null;
    rows.push(row);
    eols.push(eol);
  }
  if (rows.length < 2) return null;
  const cols = rows[0]!.values.length;
  if (cols < 1) return null;
  if (rows.some((r) => r.values.length !== cols)) return null;
  return { delimiter: delim, eols, rows };
}

// ---------------------------------------------------------------------------
// Planner
// ---------------------------------------------------------------------------

export function athroismosPlan(text: string, enc: EncodingName = 'o200k_base'): AthroismosPlan | null {
  if (text.length === 0 || text.length > ATHROISMOS_MAX_CHARS) return null;
  const work = { n: 0 };
  let best: AthroismosPlan | null = null;
  let bestScore = Infinity;

  for (const delim of [',', '\t', ';', '|']) {
    const table = parseTableFor(text, delim);
    if (!table) continue;
    const header = table.rows[0]!.values;
    const nCols = header.length;
    const dataVals: string[][] = [];
    for (let c = 0; c < nCols; c++) dataVals.push(table.rows.slice(1).map((r) => r.values[c]!));

    // candidate styles for this table
    const styleCands: { style: AthroismosStyle; grouped: boolean }[] = [{ style: 'plain', grouped: false }];
    if (delim !== ',') styleCands.push({ style: 'de', grouped: true }, { style: 'de', grouped: false });

    for (const { style, grouped } of styleCands) {
      // parse numeric columns under this style, grouped by their scale:
      // a candidate's target and drivers must share one scale, but unrelated
      // numeric columns at other scales must not poison the style.
      interface NumCol { col: number; cells: (bigint | null)[]; scale: number; asTarget: boolean }
      const numCols: NumCol[] = [];
      for (let c = 0; c < nCols; c++) {
        const asDriver = parseColumn(dataVals[c]!, style, grouped, true);
        if (!asDriver) continue;
        const asTarget = parseColumn(dataVals[c]!, style, grouped, false);
        numCols.push({ col: c, cells: asDriver.cells, scale: asDriver.scale, asTarget: !!asTarget });
      }
      const scales = [...new Set(numCols.map((x) => x.scale))];
      for (const tableScale of scales) {
        const drivers = numCols.filter((x) => x.scale === tableScale).map((x) => ({ col: x.col, cells: x.cells }));
        const targets = numCols.filter((x) => x.scale === tableScale && x.asTarget);
        if (targets.length === 0 || drivers.length === 0) continue;
        const render = (v: bigint): string => renderStyled(v, tableScale, style, grouped);
        for (const tg of targets) {
          // every target cell must re-render exactly under this style
          let ok = true;
          for (let i = 0; i < tg.cells.length; i++) {
            if (render(tg.cells[i]!) !== dataVals[tg.col]![i]) { ok = false; break; }
          }
          if (!ok) continue;
          const cands = fitRecurrence(tg.cells, drivers, tg.col, render, work);
          if (work.n > ATHROISMOS_MAX_WORK) return best;
          for (const cand of cands) {
            const rule = cand.rule;
            rule.headerName = header[rule.col]!;
            const spec: AthroismosSpec = { v: 1, delimiter: delim, style, grouped, rule, scale: tableScale };
            const reducedText = buildReduced(table, rule.col);
            let restored: string;
            try { restored = athroismosRestore(reducedText, spec); } catch { continue; }
            if (restored !== text) continue;
            const contract = buildContract(table, spec);
            const score = countTokens(contract, enc) + countTokens(reducedText, enc);
            const origScore = countTokens(text, enc);
            if (score < bestScore) {
              bestScore = score;
              best = { spec, reducedText, contract, estMessagesTokensSaved: origScore - score };
            }
          }
        }
      }
    }
    if (best) break; // one delimiter paradigm per plan
  }
  return best;
}

// ---------------------------------------------------------------------------
// Measured parents + frontier gate (house construction)
// ---------------------------------------------------------------------------

export interface AthroismosResult {
  codec: 'athroismos';
  wire: string;
  message: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  precheckParentTokens: number;
  parentTokens: number;
  messageTokens: number;
  parentCodec: string;
  parentCosts: Record<string, number>;
  fullFrontierMeasured: boolean;
  applied: boolean;
  candidateTokens: number | null;
  candidateExact: boolean | null;
  candidateParentTokens: number | null;
  candidateParentCodec: string | null;
  candidateParentCosts: Record<string, number> | null;
  comparison: string;
  notes: string;
  ms: number;
}

interface MeasureParent {
  wire: string;
  message: string;
  decoded: string;
  messageTokens: number;
  parentCodec: string;
  parentCosts: Record<string, number>;
}

function measuredAkolouthia2(text: string, enc: EncodingName): MeasureParent {
  const parent = akolouthia2Encode(text, enc);
  const directTokens = countTokens(parent.decoderPrompt, enc);
  if (!parent.exact || parent.decoded !== text || directTokens !== parent.messageTokens) {
    throw new Error('ATHROISMOS AKOLOUTHIA-2 parent did not reconstruct or its reported cost disagreed');
  }
  return { wire: parent.wire, message: parent.decoderPrompt, decoded: parent.decoded, messageTokens: directTokens, parentCodec: 'akolouthia2', parentCosts: { akolouthia2: directTokens } };
}

function measuredDaedalus(text: string, enc: EncodingName): MeasureParent {
  const parent = daedalusEncode(text, enc);
  const directTokens = countTokens(parent.decoderPrompt, enc);
  if (!parent.exact || parent.decoded !== text || directTokens !== parent.messageTokens) {
    throw new Error('ATHROISMOS DAEDALUS parent did not reconstruct or its reported cost disagreed');
  }
  return { wire: parent.wire, message: parent.decoderPrompt, decoded: parent.decoded, messageTokens: directTokens, parentCodec: 'daedalus', parentCosts: { daedalus: directTokens } };
}

function measuredApographe(text: string, enc: EncodingName): MeasureParent {
  const parent = apographeEncode(text, enc);
  const decoded = apographeDecodeResult(parent);
  const message = ((parent as any).contract ? (parent as any).contract + '\n' : '') + parent.wire;
  const directTokens = countTokens(message, enc);
  if (decoded !== text) throw new Error('ATHROISMOS APOGRAPHE parent did not reconstruct');
  return { wire: parent.wire, message, decoded, messageTokens: directTokens, parentCodec: 'apographe', parentCosts: { apographe: directTokens } };
}

function bestMeasuredParent(text: string, enc: EncodingName): MeasureParent {
  const candidates = [measuredDaedalus(text, enc), measuredAkolouthia2(text, enc), measuredApographe(text, enc)];
  candidates.sort((a, b) => a.messageTokens - b.messageTokens);
  const costs: Record<string, number> = {};
  for (const c of candidates) Object.assign(costs, c.parentCosts);
  return { ...candidates[0]!, parentCosts: costs };
}

function frontierEncode(
  text: string,
  enc: EncodingName,
): { tokens: number; decoded: string; tagstack: TagstackResult; sibling: SiblingTemplateResult; comparison: string } {
  const tagstack = tagstackEncode(text, enc);
  const sibling = siblingTemplateEncode(text, enc, tagstack);
  if (tagstack.decoded !== text || sibling.decoded !== text) throw new Error('ATHROISMOS frontier parent did not reconstruct');
  const frontierTokens = Math.min(...Object.values(tagstack.frontierCosts));
  const tagTokens = countTokens(tagstack.message, enc);
  const siblingTokens = countTokens(sibling.message, enc);
  if (tagstack.messageTokens !== tagTokens) throw new Error('ATHROISMOS TAGSTACK reported cost disagreed');
  if (sibling.messageTokens !== siblingTokens) throw new Error('ATHROISMOS SIBLING reported cost disagreed');
  const tokens = Math.min(frontierTokens, tagTokens, siblingTokens);
  return {
    tokens,
    decoded: text,
    tagstack,
    sibling,
    comparison: 'strict complete-message TAGSTACK runtime-parent set plus SIBLING-TEMPLATE',
  };
}

export function athroismosEncode(text: string, enc: EncodingName = 'o200k_base'): AthroismosResult {
  const started = Date.now();
  const inTokens = countTokens(text, enc);
  const plan = athroismosPlan(text, enc);
  const sourceAkolouthia2 = measuredAkolouthia2(text, enc);
  const sourceApographe = measuredApographe(text, enc);
  const precheckParentTokens = Math.min(sourceAkolouthia2.messageTokens, sourceApographe.messageTokens);
  const measuredFallback = (): MeasureParent => {
    const sourceDaedalus = measuredDaedalus(text, enc);
    const all = [sourceAkolouthia2, sourceApographe, sourceDaedalus].sort((a, b) => a.messageTokens - b.messageTokens);
    const costs: Record<string, number> = {};
    for (const c of all) Object.assign(costs, c.parentCosts);
    return { ...all[0]!, parentCosts: costs };
  };
  const fallbackResult = (
    candidateTokens: number | null,
    candidateExact: boolean | null,
    candidateParent: MeasureParent | null,
    fullFrontierMeasured: boolean,
    parentTokensForResult: number,
    comparison: string,
    notes: string,
  ): AthroismosResult => {
    const parent = measuredFallback();
    return {
      codec: 'athroismos',
      wire: parent.wire,
      message: parent.message,
      decoded: parent.decoded,
      exact: parent.decoded === text,
      inTokens,
      precheckParentTokens,
      parentTokens: parentTokensForResult,
      messageTokens: parent.messageTokens,
      parentCodec: parent.parentCodec,
      parentCosts: parent.parentCosts,
      fullFrontierMeasured,
      applied: false,
      candidateTokens,
      candidateExact,
      candidateParentTokens: candidateParent?.messageTokens ?? null,
      candidateParentCodec: candidateParent?.parentCodec ?? null,
      candidateParentCosts: candidateParent?.parentCosts ?? null,
      comparison,
      notes,
      ms: Date.now() - started,
    };
  };

  if (!plan) {
    return fallbackResult(null, null, null, false, precheckParentTokens, 'necessary-condition frontier-member precheck only', 'no exact driven-recurrence drop was found; returned the measured best direct parent');
  }

  const candidateParent = bestMeasuredParent(plan.reducedText, enc);
  const candidateMessage = plan.contract + '\n' + candidateParent.message;
  const candidateDecoded = athroismosRestore(candidateParent.decoded, plan.spec);
  const candidateTokens = countTokens(candidateMessage, enc);
  const candidateExact = candidateDecoded === text;

  if (!candidateExact || candidateTokens >= precheckParentTokens) {
    return fallbackResult(
      candidateTokens,
      candidateExact,
      candidateParent,
      false,
      precheckParentTokens,
      'necessary-condition frontier-member precheck only',
      'the ATHROISMOS candidate did not strictly beat every necessary frontier-member parent, so the full frontier was not measured',
    );
  }

  const frontier = frontierEncode(text, enc);
  const frontierTokens = frontier.tokens;
  if (candidateTokens >= frontierTokens) {
    return fallbackResult(
      candidateTokens,
      candidateExact,
      candidateParent,
      true,
      frontierTokens,
      frontier.comparison,
      'the ATHROISMOS candidate did not beat the full measured frontier; returned the measured best direct parent',
    );
  }

  return {
    codec: 'athroismos',
    wire: candidateParent.wire,
    message: candidateMessage,
    decoded: candidateDecoded,
    exact: candidateExact,
    inTokens,
    precheckParentTokens,
    parentTokens: frontierTokens,
    messageTokens: candidateTokens,
    parentCodec: candidateParent.parentCodec,
    parentCosts: candidateParent.parentCosts,
    fullFrontierMeasured: true,
    applied: true,
    candidateTokens,
    candidateExact,
    candidateParentTokens: candidateParent.messageTokens,
    candidateParentCodec: candidateParent.parentCodec,
    candidateParentCosts: candidateParent.parentCosts,
    comparison: frontier.comparison,
    notes: `dropped 1 driven-recurrence column (${plan.spec.rule.kind}); complete-message M=${candidateTokens} < same-source frontier M=${frontierTokens}`,
    ms: Date.now() - started,
  };
}
