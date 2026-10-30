import { countTokens, type EncodingName } from './bpe';
import { akolouthia2Encode } from './akolouthia2';
import { apographeEncode, apographeDecodeResult } from './apographe';
import { daedalusEncode } from './daedalus';
import { siblingTemplateEncode, type SiblingTemplateResult } from './sibling-template';
import { tagstackEncode, type TagstackResult } from './tagstack';

/**
 * src/lib/omega/eirmos.ts
 * =============================================================================
 * EIRMOS (εἱρμός, "a stringing-together, a chain") — string-template
 * (concatenation) column elision for delimited tables. X60.
 *
 * THE GAP
 * -----------------------------------------------------------------------------
 * The stack already has raw string concatenation in SYLLOGISMOS
 * (literal pieces + up to two sibling fields), whole-field case transforms,
 * and object-property templates in PARADEIGMA. EIRMOS does NOT claim those
 * genera as new. The missing in-stack operation is a CONCATENATION whose
 * INDIVIDUAL source slots have their own transforms — for example
 * lowercase-initial(first) + lowercase(last) — with 1–3 slots, bounded
 * seed segmentation and row-level exception repair, for delimited tables.
 * No prior table codec composes substring/case transforms inside a
 * multi-source concatenation slot. Examples of the operator language:
 *
 *     full_name = {first_name} + " " + {last_name}                 (old concat genus)
 *     email     = lowercase {first} + "." + lowercase {last} + "@acme.com"
 *     username  = lowercase-initial {first} + lowercase {last}       (new composition)
 *     display   = first2 {given} + ". " + {middle} + " " + {family}
 *
 * Thus the novelty claim is the per-slot transformable string transducer
 * and its exact table-elision realization, not generic concatenation.
 *
 *
 * MECHANISM
 * -----------------------------------------------------------------------------
 * For each target column, candidate sources are prefiltered by a substring
 * test on sampled rows (some transform of the source value must occur in
 * the target value), then ordered tuples of <=3 candidate sources are fit
 * constructively: a bounded segmentation search over seed rows proposes
 * (transforms, literals) skeletons, and a skeleton is accepted only if it
 * reproduces the target on EVERY row (<=3 exception rows ship verbatim).
 * Literals may not contain `"` or newlines (contract quotability);
 * case transforms are restricted to columns whose cased characters are
 * all ASCII (an LLM's notion of "lowercase" must coincide with the
 * encoder's). A pure identity copy is refused (APOGRAPHE `col` owns
 * duplicates) and a single-source transform-only template over a
 * <=64-distinct source is refused (SYLLOGISMOS lookup owns it). <=4
 * drops; sources are never dropped. The contract states each template
 * once with {name} field references and defines only the transforms used.
 * The reduced table is coded by the measured-cheapest exact parent;
 * emission requires beating the same-source TAGSTACK+SIBLING frontier
 * strictly with byte-exact restore, else the measured best parent of the
 * source is returned (house gate, as in SYLLOGISMOS/ZYGON/BATHMOS).
 *
 * Prior art: the FITTING genus is FlashFill-style string-transformation
 * synthesis from examples (Gulwani, POPL 2011; BlinkFill and successors),
 * built to fill spreadsheet cells in place. For fitting a template in
 * order to ELIDE the column and teach the template in-band for one-chat
 * LLM regeneration under whole-message token pricing, honestly none.
 * =============================================================================
 */

export const EIRMOS_MAX_CHARS = 400_000;
export const EIRMOS_MAX_ROWS = 20_000;
export const EIRMOS_MAX_COLS = 64;
export const EIRMOS_MIN_DATA_ROWS = 12;
export const EIRMOS_MAX_DROPS = 4;
export const EIRMOS_MAX_EXCEPTIONS = 3;
export const EIRMOS_MAX_WORK = 60_000_000;

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
  rows: CsvRow[];
}

function parseTable(text: string, delim: string, minDataRows: number, minCols: number): ParsedTable | null {
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
  if (rows.length < minDataRows + 1 || rows.length > EIRMOS_MAX_ROWS + 1) return null;
  const cols = rows[0]!.values.length;
  if (cols < minCols || cols > EIRMOS_MAX_COLS) return null;
  if (rows.some((r) => r.values.length !== cols)) return null;
  return { delimiter: delim, eols, rows };
}

// ---------------------------------------------------------------------------
// Number styles (plain / German), exact scaled BigInt — house template
// ---------------------------------------------------------------------------


export type EirmosTransform = 'id' | 'lower' | 'upper' | 'capfirst' | 'initial' | 'initial-lower' | 'initial-upper' | 'first2' | 'first3';

export type EirmosPart =
  | { kind: 'lit'; text: string }
  | { kind: 'src'; col: number; tf: EirmosTransform };

export interface EirmosDrop {
  col: number;
  name: string;
  parts: EirmosPart[];
  // [0-based data row, raw target field text], verbatim
  exceptions: [number, string][];
}

export interface EirmosSpec {
  delimiter: string;
  drops: EirmosDrop[];
}

export interface EirmosPlan {
  spec: EirmosSpec;
  reducedText: string;
  contract: string;
}

const TRANSFORMS: EirmosTransform[] = ['id', 'lower', 'upper', 'capfirst', 'initial', 'initial-lower', 'initial-upper', 'first2', 'first3'];
const CASE_TRANSFORMS = new Set<EirmosTransform>(['lower', 'upper', 'capfirst', 'initial-lower', 'initial-upper']);

export function eirmosApplyTransform(tf: EirmosTransform, v: string): string {
  // The contract's "character" is a Unicode code point, not a UTF-16 code
  // unit. Array.from preserves astral symbols as one character, matching a
  // normal LLM/Python reader; ASCII-only case guards handle case semantics.
  const chars = Array.from(v);
  switch (tf) {
    case 'id': return v;
    case 'lower': return v.toLowerCase();
    case 'upper': return v.toUpperCase();
    case 'capfirst': return chars.length ? chars[0]!.toUpperCase() + chars.slice(1).join('') : v;
    case 'initial': return chars[0] ?? '';
    case 'initial-lower': return (chars[0] ?? '').toLowerCase();
    case 'initial-upper': return (chars[0] ?? '').toUpperCase();
    case 'first2': return chars.slice(0, 2).join('');
    case 'first3': return chars.slice(0, 3).join('');
  }
}

function renderTemplate(parts: EirmosPart[], rowVals: (col: number) => string): string {
  let out = '';
  for (const p of parts) out += p.kind === 'lit' ? p.text : eirmosApplyTransform(p.tf, rowVals(p.col));
  return out;
}

function literalEligible(s: string): boolean {
  return s.length <= 40 && !s.includes('"') && !s.includes('\n') && !s.includes('\r') && !s.includes('\\');
}

/**
 * Segmentation search for ONE row: enumerate skeletons
 * lit0 F1(s1) lit1 F2(s2) ... litk matching target exactly, for the ordered
 * source tuple `srcs` with per-source value lists `vals` (raw). Bounded.
 */
function segmentRow(
  target: string,
  srcs: number[],
  vals: string[],
  caseOk: boolean[],
  cap: number,
): EirmosPart[][] {
  const out: EirmosPart[][] = [];
  const k = srcs.length;
  const rec = (idx: number, pos: number, acc: EirmosPart[]): void => {
    if (out.length >= cap) return;
    if (idx === k) {
      const tail = target.slice(pos);
      if (literalEligible(tail)) {
        out.push(tail ? [...acc, { kind: 'lit', text: tail }] : [...acc]);
      }
      return;
    }
    const raw = vals[idx]!;
    for (const tf of TRANSFORMS) {
      if (CASE_TRANSFORMS.has(tf) && !caseOk[idx]) continue;
      const piece = eirmosApplyTransform(tf, raw);
      if (piece.length === 0) continue; // seed rows keep sources non-empty; a zero piece is ambiguous
      // iterate occurrences of piece at or after pos (bounded)
      let from = pos;
      let tries = 0;
      for (;;) {
        const at = target.indexOf(piece, from);
        if (at < 0 || tries++ >= 6) break;
        const lit = target.slice(pos, at);
        if (literalEligible(lit)) {
          const next: EirmosPart[] = [...acc];
          if (lit) next.push({ kind: 'lit', text: lit });
          next.push({ kind: 'src', col: srcs[idx]!, tf });
          rec(idx + 1, at + piece.length, next);
          if (out.length >= cap) return;
        }
        from = at + 1;
      }
    }
  };
  rec(0, 0, []);
  return out;
}

interface FitOutcome { drop: EirmosDrop }

function fitTuple(
  tgt: number,
  srcs: number[],
  dataVals: string[][],
  header: string[],
  caseOkByCol: boolean[],
  distinctByCol: number[],
  work: { n: number },
): FitOutcome | null {
  const R = dataVals[tgt]!.length;
  const caseOk = srcs.map((c) => caseOkByCol[c]!);
  // seed rows: all sources non-empty and target non-empty
  const seeds: number[] = [];
  for (let i = 0; i < R && seeds.length < 6; i++) {
    if (dataVals[tgt]![i]!.length === 0) continue;
    if (srcs.every((c) => dataVals[c]![i]!.length > 0)) seeds.push(i);
  }
  if (seeds.length < 2) return null;
  // candidates from up to 3 seed rows (union: an exception row may sit
  // among the seeds, including the first), then keep skeletons matching
  // all but at most one seed; full verification below is the arbiter
  const byKey = new Map<string, EirmosPart[]>();
  for (let si = 0; si < Math.min(3, seeds.length); si++) {
    const i = seeds[si]!;
    for (const parts of segmentRow(dataVals[tgt]![i]!, srcs, srcs.map((c) => dataVals[c]![i]!), caseOk, 48)) {
      byKey.set(JSON.stringify(parts), parts);
    }
  }
  let cands = [...byKey.values()].filter((parts) => {
    let miss = 0;
    for (const i of seeds) {
      if (renderTemplate(parts, (c) => dataVals[c]![i]!) !== dataVals[tgt]![i] && ++miss > 1) return false;
    }
    return true;
  });
  for (const parts of cands) {
    // ownership refusals
    const srcParts = parts.filter((p): p is Extract<EirmosPart, { kind: 'src' }> => p.kind === 'src');
    const hasLit = parts.some((p) => p.kind === 'lit');
    if (srcParts.length === 1 && !hasLit) {
      const sp = srcParts[0]!;
      // semantic copy check: a case transform that changes nothing on ANY
      // row (e.g. lowercase over already-lowercase values) is a duplicate
      // column in disguise, whatever its label — APOGRAPHE owns those
      if (dataVals[sp.col]!.every((v) => eirmosApplyTransform(sp.tf, v) === v)) continue;
      if (distinctByCol[sp.col]! <= 64) continue; // lookup territory: SYLLOGISMOS owns
    }
    // full verification
    const exceptions: [number, string][] = [];
    let bad = 0;
    for (let i = 0; i < R; i++) {
      work.n += parts.length;
      if (work.n > EIRMOS_MAX_WORK) return null;
      const got = renderTemplate(parts, (c) => dataVals[c]![i]!);
      if (got !== dataVals[tgt]![i]) {
        bad++;
        if (bad > EIRMOS_MAX_EXCEPTIONS) break;
        const ev = dataVals[tgt]![i]!;
        // exception values must stay unambiguous inside the contract sentence
        if (/[",\[\]\n\r]/.test(ev) || ev === '(empty)') { bad = EIRMOS_MAX_EXCEPTIONS + 1; break; }
        exceptions.push([i, ev]);
      }
    }
    if (bad > EIRMOS_MAX_EXCEPTIONS) continue;
    if (bad === R) continue;
    return { drop: { col: tgt, name: header[tgt]!, parts, exceptions } };
  }
  return null;
}

function buildReduced(table: ParsedTable, spec: EirmosSpec): string {
  const dropped = new Set(spec.drops.map((d) => d.col));
  return table.rows.map((r, li) =>
    r.fields.filter((_, ci) => !dropped.has(ci)).join(spec.delimiter) + table.eols[li]!,
  ).join('');
}

function renderFieldSimple(value: string, delim: string): string {
  if (value.includes(delim) || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

export function eirmosRestore(reducedText: string, spec: EirmosSpec): string {
  const table = parseTable(reducedText, spec.delimiter, 1, 1);
  if (!table) throw new Error('EIRMOS: reduced text does not parse');
  const R = table.rows.length - 1;
  const droppedSorted = [...spec.drops].sort((a, b) => a.col - b.col);
  const insertedBefore = (finishedCol: number): number =>
    droppedSorted.filter((d) => d.col < finishedCol).length;
  // compute all dropped columns from the REDUCED table first
  const computed = new Map<number, string[]>();
  for (const drop of droppedSorted) {
    const vals: string[] = [];
    const exc = new Map(drop.exceptions);
    for (let i = 0; i < R; i++) {
      if (exc.has(i)) { vals.push(exc.get(i)!); continue; }
      vals.push(renderTemplate(drop.parts, (finishedCol) => {
        const redIdx = finishedCol - insertedBefore(finishedCol);
        return table.rows[i + 1]!.values[redIdx]!;
      }));
    }
    computed.set(drop.col, vals);
  }
  const outRows: string[] = [];
  for (let li = 0; li < table.rows.length; li++) {
    const fields = [...table.rows[li]!.fields];
    for (const drop of droppedSorted) {
      const at = drop.col;
      const raw = li === 0
        ? renderFieldSimple(drop.name, spec.delimiter)
        : renderFieldSimple(computed.get(drop.col)![li - 1]!, spec.delimiter);
      fields.splice(at, 0, raw);
    }
    outRows.push(fields.join(spec.delimiter) + table.eols[li]!);
  }
  return outRows.join('');
}

function delimName(d: string): string {
  return d === ',' ? 'comma' : d === '\t' ? 'tab' : d === ';' ? 'semicolon' : 'pipe';
}

function colRef(header: string[], col: number): string {
  const name = header[col]!;
  const clean = name.length > 0 && !/[{},;|\t\"\n\r\\]/.test(name);
  const unique = header.filter((h) => h === name).length === 1;
  return clean && unique ? `{${name}}` : `field ${col + 1}`;
}

const TF_CONTRACT: Record<EirmosTransform, (ref: string) => string> = {
  id: (r) => r,
  lower: (r) => `lowercase ${r}`,
  upper: (r) => `UPPERCASE ${r}`,
  capfirst: (r) => `capfirst ${r}`,
  initial: (r) => `initial ${r}`,
  'initial-lower': (r) => `lowercase-initial ${r}`,
  'initial-upper': (r) => `UPPERCASE-initial ${r}`,
  first2: (r) => `first2 ${r}`,
  first3: (r) => `first3 ${r}`,
};

const TF_DEFS: Partial<Record<EirmosTransform, string>> = {
  lower: 'lowercase {x} = {x} with every letter made lowercase',
  upper: 'UPPERCASE {x} = {x} with every letter made uppercase',
  capfirst: 'capfirst {x} = {x} with its first character made uppercase, the rest unchanged',
  initial: 'initial {x} = the first character of {x}',
  'initial-lower': 'lowercase-initial {x} = the first character of {x} made lowercase',
  'initial-upper': 'UPPERCASE-initial {x} = the first character of {x} made uppercase',
  first2: 'first2 {x} = the first 2 Unicode code points of {x} (fewer if {x} is shorter)',
  first3: 'first3 {x} = the first 3 Unicode code points of {x} (fewer if {x} is shorter)',
};

function buildContract(table: ParsedTable, spec: EirmosSpec): string {
  const header = table.rows[0]!.values;
  const usedTf = new Set<EirmosTransform>();
  const items = spec.drops.map((d) => {
    const namePart = d.name ? ` "${d.name}"` : ' (empty name)';
    const expr = d.parts.map((p) => {
      if (p.kind === 'lit') return `"${p.text}"`;
      usedTf.add(p.tf);
      return TF_CONTRACT[p.tf](colRef(header, p.col));
    }).join(' + ');
    const exc = d.exceptions.length
      ? ` [except ${d.exceptions.map(([r, f]) => `data row ${r + 1} = ${f === '' ? '(empty)' : f}`).join(', ')}]`
      : '';
    return `field ${d.col + 1}${namePart}: ${expr}${exc}`;
  });
  const defs = [...usedTf].filter((t) => TF_DEFS[t]).map((t) => TF_DEFS[t]!).join('; ');
  return `EIRMOS: after decoding below, in the ${delimName(spec.delimiter)}-separated table insert as header field and value in every row: ${items.join('; ')}. `
    + `{x} means that row's decoded {x}; + joins text pieces end to end; quoted pieces are literal text${defs ? `; ${defs}` : ''}. Change nothing else.`;
}

export function eirmosPlan(text: string, enc: EncodingName = 'o200k_base'): EirmosPlan | null {
  if (text.length > EIRMOS_MAX_CHARS) return null;
  for (const delim of [',', '\t', ';', '|']) {
    const table = parseTable(text, delim, EIRMOS_MIN_DATA_ROWS, 2);
    if (!table) continue;
    const nRows = table.rows.length;
    if (nRows - 1 > EIRMOS_MAX_ROWS) continue;
    const C = table.rows[0]!.fields.length;
    if (C > EIRMOS_MAX_COLS) continue;
    const header = table.rows[0]!.values;
    const R = nRows - 1;
    const dataVals: string[][] = [];
    for (let c = 0; c < C; c++) dataVals.push(table.rows.slice(1).map((r) => r.values[c]!));
    const distinctByCol = dataVals.map((v) => new Set(v).size);
    // case transforms require all cased characters ASCII (LLM/tool agreement)
    const caseOkByCol = dataVals.map((vals) => vals.every((v) => !/[^\x00-\x7F]/.test(v) || !/\p{L}/u.test(v.replace(/[\x00-\x7F]/g, ''))));
    const work = { n: 0 };
    const fits: EirmosDrop[] = [];
    // candidate sources per target via sampled substring test
    const sampleIdx: number[] = [];
    for (let i = 0; i < R && sampleIdx.length < 40; i += Math.max(1, Math.floor(R / 40))) sampleIdx.push(i);
    for (let tgt = 0; tgt < C && fits.length < 12; tgt++) {
      if (work.n > EIRMOS_MAX_WORK) break;
      if (distinctByCol[tgt]! < 2) continue; // constant: KOLUMN/APOGRAPHE territory
      const avgLen = dataVals[tgt]!.reduce((a, v) => a + v.length, 0) / R;
      if (avgLen < 2) continue; // too small to ever pay for a contract
      const candSrc: number[] = [];
      for (let s = 0; s < C; s++) {
        if (s === tgt) continue;
        let hits = 0, tot = 0;
        for (const i of sampleIdx) {
          const sv = dataVals[s]![i]!;
          const tv = dataVals[tgt]![i]!;
          if (sv.length === 0 || tv.length === 0) continue;
          tot++;
          work.n += 1;
          if (TRANSFORMS.some((tf) => {
            if (CASE_TRANSFORMS.has(tf) && !caseOkByCol[s]) return false;
            const piece = eirmosApplyTransform(tf, sv);
            return piece.length > 0 && tv.includes(piece);
          })) hits++;
        }
        if (tot >= 6 && hits >= Math.ceil(0.9 * tot)) candSrc.push(s);
      }
      if (candSrc.length === 0) continue;
      // ordered tuples: singles, pairs, triples over at most 6 candidates
      const cand = candSrc.slice(0, 6);
      const tuples: number[][] = [];
      for (const a of cand) tuples.push([a]);
      for (const a of cand) for (const b of cand) if (b !== a) tuples.push([a, b]);
      for (const a of cand) for (const b of cand) for (const c of cand) {
        if (b !== a && c !== a && c !== b) tuples.push([a, b, c]);
      }
      for (const tuple of tuples) {
        const fit = fitTuple(tgt, tuple, dataVals, header, caseOkByCol, distinctByCol, work);
        if (fit) { fits.push(fit.drop); break; }
        if (work.n > EIRMOS_MAX_WORK) break;
      }
    }
    if (fits.length === 0) continue;
    // greedy admission by true contract+reduced token score; sources protected
    const base: EirmosSpec = { delimiter: delim, drops: [] };
    const score = (spec: EirmosSpec): number =>
      countTokens(buildContract(table, spec), enc) + countTokens(buildReduced(table, spec), enc);
    const srcOf = (d: EirmosDrop): number[] =>
      d.parts.filter((p): p is Extract<EirmosPart, { kind: 'src' }> => p.kind === 'src').map((p) => p.col);
    let curScore = countTokens(text, enc);
    const accepted: EirmosDrop[] = [];
    const protected_ = new Set<number>();
    const sorted = [...fits].sort((a, b) => a.col - b.col);
    for (const d of sorted) {
      if (accepted.length >= EIRMOS_MAX_DROPS) break;
      if (protected_.has(d.col)) continue;
      if (accepted.some((a) => srcOf(a).includes(d.col))) continue;
      const trial: EirmosSpec = { delimiter: delim, drops: [...accepted, d] };
      if (trial.drops.some((a) => srcOf(d).includes(a.col))) continue;
      const s = score(trial);
      if (s < curScore - 0) { // strictly better than current raw score
        if (eirmosRestore(buildReduced(table, trial), trial) !== text) continue;
        accepted.push(d);
        for (const sc of srcOf(d)) protected_.add(sc);
        curScore = s;
      }
    }
    if (accepted.length === 0) continue;
    const spec: EirmosSpec = { delimiter: delim, drops: accepted.sort((a, b) => a.col - b.col) };
    const reducedText = buildReduced(table, spec);
    if (eirmosRestore(reducedText, spec) !== text) continue;
    return { spec, reducedText, contract: buildContract(table, spec) };
  }
  return null;
}

export interface EirmosResult {
  codec: 'eirmos';
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
  if (!parent.exact || parent.decoded !== text) {
    // inexact parents are not lossless bars: price them as identity so the
    // gate never throws and never crowns a lossy message (X58 ewf lane)
    const idTokens = countTokens(text, enc);
    return { wire: text, message: text, decoded: text, messageTokens: idTokens, parentCodec: 'identity', parentCosts: { akolouthia2: idTokens } };
  }
  if (directTokens !== parent.messageTokens) {
    throw new Error('EIRMOS AKOLOUTHIA-2 parent reported cost disagreed');
  }
  return { wire: parent.wire, message: parent.decoderPrompt, decoded: parent.decoded, messageTokens: directTokens, parentCodec: 'akolouthia2', parentCosts: { akolouthia2: directTokens } };
}

function measuredDaedalus(text: string, enc: EncodingName): MeasureParent {
  const parent = daedalusEncode(text, enc);
  const directTokens = countTokens(parent.decoderPrompt, enc);
  if (!parent.exact || parent.decoded !== text) {
    const idTokens = countTokens(text, enc);
    return { wire: text, message: text, decoded: text, messageTokens: idTokens, parentCodec: 'identity', parentCosts: { daedalus: idTokens } };
  }
  if (directTokens !== parent.messageTokens) {
    throw new Error('EIRMOS DAEDALUS parent reported cost disagreed');
  }
  return { wire: parent.wire, message: parent.decoderPrompt, decoded: parent.decoded, messageTokens: directTokens, parentCodec: 'daedalus', parentCosts: { daedalus: directTokens } };
}

function measuredApographe(text: string, enc: EncodingName): MeasureParent {
  const parent = apographeEncode(text, enc);
  const decoded = apographeDecodeResult(parent);
  const message = ((parent as any).contract ? (parent as any).contract + '\n' : '') + parent.wire;
  const directTokens = countTokens(message, enc);
  if (decoded !== text) {
    const idTokens = countTokens(text, enc);
    return { wire: text, message: text, decoded: text, messageTokens: idTokens, parentCodec: 'identity', parentCosts: { apographe: idTokens } };
  }
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
  if (tagstack.decoded !== text || sibling.decoded !== text) throw new Error('EIRMOS frontier parent did not reconstruct');
  const frontierTokens = Math.min(...Object.values(tagstack.frontierCosts));
  const tagTokens = countTokens(tagstack.message, enc);
  const siblingTokens = countTokens(sibling.message, enc);
  if (tagstack.messageTokens !== tagTokens) throw new Error('EIRMOS TAGSTACK reported cost disagreed');
  if (sibling.messageTokens !== siblingTokens) throw new Error('EIRMOS SIBLING reported cost disagreed');
  return {
    tokens: Math.min(frontierTokens, tagTokens, siblingTokens),
    tagstack,
    sibling,
    comparison: 'strict complete-message TAGSTACK runtime-parent set plus SIBLING-TEMPLATE',
  };
}

export function eirmosEncode(text: string, enc: EncodingName = 'o200k_base'): EirmosResult {
  const started = Date.now();
  const inTokens = countTokens(text, enc);
  const plan = eirmosPlan(text, enc);
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
  ): EirmosResult => {
    const parent = measuredFallback();
    return {
      codec: 'eirmos',
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
    return fallbackResult(null, null, null, false, precheckParentTokens, 'necessary-condition frontier-member precheck only', 'no string-template drop was found; returned the measured best direct parent');
  }

  const candidateParent = bestMeasuredParent(plan.reducedText, enc);
  const candidateMessage = plan.contract + '\n' + candidateParent.message;
  const candidateDecoded = eirmosRestore(candidateParent.decoded, plan.spec);
  const candidateTokens = countTokens(candidateMessage, enc);
  const candidateExact = candidateDecoded === text;

  if (!candidateExact || candidateTokens >= precheckParentTokens) {
    return fallbackResult(candidateTokens, candidateExact, candidateParent, false, precheckParentTokens, 'necessary-condition frontier-member precheck only', 'the EIRMOS candidate did not strictly beat every necessary frontier-member parent, so the full frontier was not measured');
  }

  const frontier = frontierEncode(text, enc);
  if (candidateTokens >= frontier.tokens) {
    return fallbackResult(candidateTokens, candidateExact, candidateParent, true, frontier.tokens, frontier.comparison, 'the EIRMOS candidate did not beat the full measured frontier; returned the measured best direct parent');
  }

  const shape = plan.spec.drops.map((d) => `f${d.col + 1}(tpl${d.parts.length})`).join(',');
  return {
    codec: 'eirmos',
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
    notes: `dropped string-template columns (${shape}); complete-message M=${candidateTokens} < same-source frontier M=${frontier.tokens}`,
    ms: Date.now() - started,
  };
}
