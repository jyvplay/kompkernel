/**
 * src/lib/omega/isoskeles.ts
 * =============================================================================
 * ISOSKELES (ἰσοσκελής — "equal-legged", of an isosceles triangle) —
 * symmetric-square (triangle) elision for delimited tables. X56.
 *
 * THE GAP
 * -----------------------------------------------------------------------------
 * Every table-dependency mechanism in the stack is row-local, column-local
 * or one-step: same-row functions (SYLLOGISMOS binary arith, TAXIS),
 * above/index/copy-same-line predictors (APOGRAPHE, METRON), driven
 * recurrences down a column (ATHROISMOS), n-ary sums across a row or down
 * a column (KEPHALAION). No rule reaches *across the diagonal*: in a
 * symmetric square — distance matrices, correlation matrices, adjacency /
 * similarity matrices — the cell at (row i, column j) equals the cell at
 * (row j, column i). That is a 2-D isometry (transpose), expressible by no
 * one-step predictor: APOGRAPHE's `col` copies within the same line, its
 * `above` looks one line up; neither can fetch a value from an arbitrary
 * other row AND other column. Half of such a table is shipped twice.
 *
 * MECHANISM
 * -----------------------------------------------------------------------------
 * Detect a delimited table containing a square block (optional header row,
 * optional single label column, optional all-empty trailing padding
 * columns — the shape pandas `.to_csv()` of a square DataFrame produces,
 * incl. the common trailing empty field). Verify string-exact symmetry
 * cell[i][j] == cell[j][i] for all pairs, allowing ≤ MAX_EXCEPTION_PAIRS
 * mismatched pairs (kept verbatim, never blanked; real matrices carry
 * rounding twins like 0.5 vs 0.50). Blank the strictly-lower triangle in
 * the reduced text; when every diagonal cell is one identical non-empty
 * string ("0" for distances, "1.000000" for correlations), the diagonal
 * is blanked too and the constant is stated once in the contract. The
 * reader refills each blank from its mirror across the diagonal — by
 * row/column *names* when the header names equal the label column in
 * order ("the field in the row named by its column, under the column
 * named by its row"), else by block coordinates. No arithmetic at all:
 * the reader only copies, which is the lowest-risk reader obligation in
 * the table codec family (contrast KEPHALAION sums, ATHROISMOS chains).
 *
 * Whole-input byte-exact restore arbitrates every candidate; the reduced
 * text is coded by the cheapest measured of DAEDALUS / AKOLOUTHIA-2 /
 * APOGRAPHE; the candidate must beat AKOLOUTHIA-2 + APOGRAPHE on the
 * source, then the full TAGSTACK+SIBLING frontier strictly, else the
 * measured best direct parent is returned (house gate construction).
 *
 * Prior art, honestly: storing one triangle of a symmetric matrix is
 * classical numerical practice (BLAS/LAPACK packed storage for symmetric
 * matrices, `UPLO` conventions); distance/correlation matrices are the
 * everyday CSV shape. For detecting string-exact transposition symmetry
 * in an arbitrary delimited file and eliding a triangle under an in-band
 * natural-language mirror rule for a stock LLM reader: no paper stands
 * behind this realization; citation: none.
 *
 * Greedy/search: the shape space is tiny (3 delimiters × header on/off ×
 * label 0/1 × diagonal-constant on/off) and is searched exhaustively;
 * symmetry is verified exactly, pair by pair; candidates are ranked by
 * the true rendered contract + reduced-text token count; emission is the
 * measured frontier gate. Not a greedy heuristic anywhere in the planner.
 *
 * Time/CPU: CPU-bound. Planner is O(rows·cols + n²) under caps (400k
 * chars, n ≤ 500); parents/frontier dominate wall-clock with no
 * wrapper-wide cap, so deep-audit-only.
 */

import { countTokens, type EncodingName } from './bpe';
import { daedalusEncode } from './daedalus';
import { akolouthia2Encode } from './akolouthia2';
import { apographeEncode, apographeDecodeResult } from './apographe';
import { tagstackEncode, type TagstackResult } from './tagstack';
import { siblingTemplateEncode, type SiblingTemplateResult } from './sibling-template';

export const ISOSKELES_MAX_CHARS = 400_000;
export const ISOSKELES_MIN_N = 6;
export const ISOSKELES_MAX_N = 500;
export const ISOSKELES_MAX_EXCEPTION_PAIRS = 6;

// ---------------------------------------------------------------------------
// CSV-lite parsing (single-line records; raw spans preserved)
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

interface ParsedTable { delimiter: string; eols: string[]; rows: CsvRow[] }

function parseTable(text: string, delim: string): ParsedTable | null {
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
  if (rows.length < ISOSKELES_MIN_N || rows.length > ISOSKELES_MAX_N + 1) return null;
  const cols = rows[0]!.values.length;
  if (cols < ISOSKELES_MIN_N || cols > ISOSKELES_MAX_N + 2) return null;
  if (rows.some((r) => r.values.length !== cols)) return null;
  return { delimiter: delim, eols, rows };
}

// ---------------------------------------------------------------------------
// Spec + restore
// ---------------------------------------------------------------------------

export interface IsoskelesSpec {
  v: 1;
  delimiter: string;
  header: boolean;
  labelCols: 0 | 1;
  trailingPad: number;
  n: number;
  diagConst: string | null;
  exceptionPairs: number;
}

export interface IsoskelesPlan {
  spec: IsoskelesSpec;
  reducedText: string;
  contract: string;
}

function renderRows(table: ParsedTable, cells: string[][]): string {
  let out = '';
  for (let r = 0; r < table.rows.length; r++) {
    out += cells[r]!.join(table.delimiter) + table.eols[r]!;
  }
  return out;
}

export function isoskelesRestore(text: string, spec: IsoskelesSpec): string | null {
  const table = parseTable(text, spec.delimiter);
  if (!table) return null;
  const firstRow = spec.header ? 1 : 0;
  const L = spec.labelCols;
  if (table.rows.length !== firstRow + spec.n) return null;
  const cells = table.rows.map((r) => [...r.fields]);
  const val = (r: number, c: number) => table.rows[r]!.values[c]!;
  for (let i = 0; i < spec.n; i++) {
    for (let j = 0; j < i; j++) {
      const r = firstRow + i;
      const c = L + j;
      if (val(r, c) === '') {
        cells[r]![c] = table.rows[firstRow + j]!.fields[L + i]!;
      }
    }
    if (spec.diagConst !== null) {
      const r = firstRow + i;
      const c = L + i;
      if (val(r, c) === '') cells[r]![c] = spec.diagConst;
    }
  }
  return renderRows(table, cells);
}

// ---------------------------------------------------------------------------
// Planner
// ---------------------------------------------------------------------------

function delimWord(d: string): string {
  return d === ',' ? 'comma-separated' : d === ';' ? 'semicolon-separated' : 'tab-separated';
}

function makeContract(table: ParsedTable, spec: IsoskelesSpec): string {
  const firstRow = spec.header ? 1 : 0;
  const L = spec.labelCols;
  const f0 = L + 1;
  const f1 = L + spec.n;
  let named = false;
  if (spec.header && L === 1) {
    const hdrNames = table.rows[0]!.values.slice(L, L + spec.n);
    const labels = table.rows.slice(firstRow).map((r) => r.values[0]!);
    named = hdrNames.length === spec.n
      && hdrNames.every((h, i) => h === labels[i] && h.length > 0 && h.length <= 40 && !/[{}"]/.test(h))
      && new Set(hdrNames).size === spec.n;
  }
  const diagClause = spec.diagConst !== null
    ? ` A blank field on the diagonal (row name equal to column name${named ? '' : ', block row equal to block column'}) is "${spec.diagConst}".`
    : '';
  if (named) {
    return `ISOSKELES: after decoding below, in the ${delimWord(spec.delimiter)} table: fields ${f0} to ${f1} form a symmetric square whose row names (field 1) and column names (header) are identical in the same order. Fill each blank field inside that square with its mirror across the diagonal: the value in the row named by the blank's column, under the column named by the blank's row.${diagClause} Change nothing else.`;
  }
  const rowWord = spec.header ? 'data rows' : 'rows';
  return `ISOSKELES: after decoding below, in the ${delimWord(spec.delimiter)} table: the square block of fields ${f0} to ${f1} across ${rowWord} 1 to ${spec.n} is symmetric. Fill each blank field inside the block with its mirror across the block's main diagonal: the blank at block row r, block column c takes the value at block row c, block column r.${diagClause} Change nothing else.`;
}

export function isoskelesPlan(text: string, enc: EncodingName): IsoskelesPlan | null {
  if (text.length === 0 || text.length > ISOSKELES_MAX_CHARS) return null;
  let best: IsoskelesPlan | null = null;
  let bestScore = Infinity;
  for (const delim of [',', ';', '\t']) {
    const table = parseTable(text, delim);
    if (!table) continue;
    const arity = table.rows[0]!.values.length;
    // trailing columns empty in every row (values and raw fields)
    let trailingPad = 0;
    for (let c = arity - 1; c >= 0; c--) {
      if (table.rows.every((r) => r.values[c] === '')) trailingPad++;
      else break;
    }
    for (const header of [true, false]) {
      for (const labelCols of [1, 0] as const) {
        const firstRow = header ? 1 : 0;
        const n = table.rows.length - firstRow;
        if (n < ISOSKELES_MIN_N || n > ISOSKELES_MAX_N) continue;
        if (arity - labelCols - trailingPad !== n) continue;
        const L = labelCols;
        const val = (r: number, c: number) => table.rows[r]!.values[c]!;
        // block cells must be unquoted (raw field === value) to be blanked safely
        let clean = true;
        for (let i = 0; i < n && clean; i++) {
          for (let j = 0; j < n; j++) {
            const row = table.rows[firstRow + i]!;
            if (row.fields[L + j] !== row.values[L + j]) { clean = false; break; }
          }
        }
        if (!clean) continue;
        const pairs = (n * (n - 1)) / 2;
        const exceptions = new Set<string>();
        for (let i = 0; i < n; i++) {
          for (let j = 0; j < i; j++) {
            if (val(firstRow + i, L + j) !== val(firstRow + j, L + i)) exceptions.add(i + ',' + j);
          }
        }
        if (exceptions.size > ISOSKELES_MAX_EXCEPTION_PAIRS) continue;
        if (exceptions.size * 20 > pairs) continue; // ≥95% of pairs must be symmetric
        const diagVals = Array.from({ length: n }, (_, i) => val(firstRow + i, L + i));
        const diagSame = diagVals.every((v) => v === diagVals[0]) ? diagVals[0]! : null;
        const diagOptions: (string | null)[] = diagSame !== null && diagSame !== '' && !/["{}]/.test(diagSame) && diagSame.length <= 24
          ? [diagSame, null] : [null];
        for (const diagConst of diagOptions) {
          const cells = table.rows.map((r) => [...r.fields]);
          for (let i = 0; i < n; i++) {
            for (let j = 0; j < i; j++) {
              if (!exceptions.has(i + ',' + j)) cells[firstRow + i]![L + j] = '';
            }
            if (diagConst !== null) cells[firstRow + i]![L + i] = '';
          }
          const spec: IsoskelesSpec = {
            v: 1, delimiter: delim, header, labelCols, trailingPad, n, diagConst,
            exceptionPairs: exceptions.size,
          };
          const reducedText = renderRows(table, cells);
          if (isoskelesRestore(reducedText, spec) !== text) continue;
          const contract = makeContract(table, spec);
          const score = countTokens(contract, enc) + countTokens(reducedText, enc);
          if (score < bestScore) {
            bestScore = score;
            best = { spec, reducedText, contract };
          }
        }
      }
    }
    if (best) break;
  }
  return best;
}

// ---------------------------------------------------------------------------
// Measured parents + frontier gate (house construction)
// ---------------------------------------------------------------------------

export interface IsoskelesResult {
  codec: 'isoskeles';
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
    throw new Error('ISOSKELES AKOLOUTHIA-2 parent did not reconstruct or its reported cost disagreed');
  }
  return { wire: parent.wire, message: parent.decoderPrompt, decoded: parent.decoded, messageTokens: directTokens, parentCodec: 'akolouthia2', parentCosts: { akolouthia2: directTokens } };
}

function measuredDaedalus(text: string, enc: EncodingName): MeasureParent {
  const parent = daedalusEncode(text, enc);
  const directTokens = countTokens(parent.decoderPrompt, enc);
  if (!parent.exact || parent.decoded !== text || directTokens !== parent.messageTokens) {
    throw new Error('ISOSKELES DAEDALUS parent did not reconstruct or its reported cost disagreed');
  }
  return { wire: parent.wire, message: parent.decoderPrompt, decoded: parent.decoded, messageTokens: directTokens, parentCodec: 'daedalus', parentCosts: { daedalus: directTokens } };
}

function measuredApographe(text: string, enc: EncodingName): MeasureParent {
  const parent = apographeEncode(text, enc);
  const decoded = apographeDecodeResult(parent);
  const message = ((parent as any).contract ? (parent as any).contract + '\n' : '') + parent.wire;
  const directTokens = countTokens(message, enc);
  if (decoded !== text) throw new Error('ISOSKELES APOGRAPHE parent did not reconstruct');
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
): { tokens: number; tagstack: TagstackResult; sibling: SiblingTemplateResult; comparison: string } {
  const tagstack = tagstackEncode(text, enc);
  const sibling = siblingTemplateEncode(text, enc, tagstack);
  if (tagstack.decoded !== text || sibling.decoded !== text) throw new Error('ISOSKELES frontier parent did not reconstruct');
  const frontierTokens = Math.min(...Object.values(tagstack.frontierCosts));
  const tagTokens = countTokens(tagstack.message, enc);
  const siblingTokens = countTokens(sibling.message, enc);
  if (tagstack.messageTokens !== tagTokens) throw new Error('ISOSKELES TAGSTACK reported cost disagreed');
  if (sibling.messageTokens !== siblingTokens) throw new Error('ISOSKELES SIBLING reported cost disagreed');
  return {
    tokens: Math.min(frontierTokens, tagTokens, siblingTokens),
    tagstack,
    sibling,
    comparison: 'strict complete-message TAGSTACK runtime-parent set plus SIBLING-TEMPLATE',
  };
}

export function isoskelesEncode(text: string, enc: EncodingName = 'o200k_base'): IsoskelesResult {
  const started = Date.now();
  const inTokens = countTokens(text, enc);
  const plan = isoskelesPlan(text, enc);
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
  ): IsoskelesResult => {
    const parent = measuredFallback();
    return {
      codec: 'isoskeles',
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
    return fallbackResult(null, null, null, false, precheckParentTokens, 'necessary-condition frontier-member precheck only', 'no symmetric square block was found; returned the measured best direct parent');
  }

  const candidateParent = bestMeasuredParent(plan.reducedText, enc);
  const candidateMessage = plan.contract + '\n' + candidateParent.message;
  const candidateDecoded = isoskelesRestore(candidateParent.decoded, plan.spec);
  const candidateTokens = countTokens(candidateMessage, enc);
  const candidateExact = candidateDecoded === text;

  if (!candidateExact || candidateTokens >= precheckParentTokens) {
    return fallbackResult(candidateTokens, candidateExact, candidateParent, false, precheckParentTokens, 'necessary-condition frontier-member precheck only', 'the ISOSKELES candidate did not strictly beat every necessary frontier-member parent, so the full frontier was not measured');
  }

  const frontier = frontierEncode(text, enc);
  if (candidateTokens >= frontier.tokens) {
    return fallbackResult(candidateTokens, candidateExact, candidateParent, true, frontier.tokens, frontier.comparison, 'the ISOSKELES candidate did not beat the full measured frontier; returned the measured best direct parent');
  }

  return {
    codec: 'isoskeles',
    wire: candidateParent.wire,
    message: candidateMessage,
    decoded: candidateDecoded,
    exact: candidateExact,
    inTokens,
    precheckParentTokens,
    parentTokens: frontier.tokens,
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
    notes: `blanked lower triangle of a symmetric ${plan.spec.n}x${plan.spec.n} block (diag=${plan.spec.diagConst ?? 'kept'}, exception pairs=${plan.spec.exceptionPairs}); complete-message M=${candidateTokens} < same-source frontier M=${frontier.tokens}`,
    ms: Date.now() - started,
  };
}
