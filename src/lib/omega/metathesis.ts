/* ===========================================================================
 * METATHESIS (μετάθεσις, "transposition") — X19.
 *
 * THE OBSERVATION
 * ---------------
 * Grammar compression (ARIADNE / CHIRON) mines repeated substrings over the
 * whole text, so in theory the ORDER of the values should not matter: a value
 * that repeats is found wherever it sits. In practice it matters a great deal,
 * because what the grammar can *say* cheaply is not only the dictionary entry
 * but the SEQUENCE of references. Row-major, every row interleaves five
 * different value distributions — a date, four prices, a volume — so adjacent
 * references never repeat and every row is spelled out. Column-major, each
 * column is a long run of same-distribution values and, when a table carries
 * near-constant columns, whole columns become repeatable blocks.
 *
 * That is a different axis from every codec in this repository. DENDRON-S
 * factors shared PREFIXES of a line; ELLEIPSIS/ANKYRA delete a CONSTANT that
 * sits at a fixed position; AKOLOUTHIA-2 elides a number that continues an
 * arithmetic progression. None of them reorders. METATHESIS is the only
 * operator here that changes the ORDER of the payload and hands the reader a
 * permutation to undo, and it is the only one whose saving grows with the
 * homogeneity of a column rather than with the repetition of a literal.
 *
 * WHAT IS SHIPPED
 * ---------------
 * A table is a run of lines that split into the same number of cells, either
 * on one literal delimiter (`,` `\t` `|` `;`) or on column-aligned whitespace
 * (a character position at which every line holds a space is a gap). If the
 * table is rectangular and has at least MIN_ROWS rows and MIN_COLS columns,
 * the encoder also builds the column-major transpose:
 *
 *     a,b,c          a  d
 *     d,e,f    ->    b  e
 *                    c  f
 *
 * i.e. the concatenation of the columns, each column written as one line per
 * row, in column order. One sentence tells the reader the shape, the join
 * (the delimiter, or the column widths and their alignment) and the order.
 *
 * The transform is a bijection on the bytes — the encoder verifies
 * untranspose(transpose(x)) === x before it will consider it — and the whole
 * thing is gated on measured one-chat M against the best arm on the untouched
 * text, so M is never worse than the arm it sits on.
 *
 * No skills file, no system prompt, no tool call: the sentence is English, the
 * wire below it is ordinary CHIRON, and the reader already has the CHIRON
 * contract from the arm it chooses.
 * ========================================================================= */

import { countTokens, type EncodingName } from './bpe';
import { chironDecode } from './chiron';
import { lakonikosDualEncode } from './lakonikos-d';
import { densEncode, densDecode } from './dendrons';
import { akolouthia2Encode, akolouthia2Decode } from './akolouthia2';

/** Escape prefix: a payload that already starts with it is passed through whole. */
export const METATHESIS_RAW = '@raw\n';

export const MIN_ROWS = 6;
export const MIN_COLS = 2;

/** Delimiters tried, in this order. Cheapest contract first. */
export const METATHESIS_DELIMS = [',', '\t', '|', ';'] as const;

export type MetathesisJoin =
  | { kind: 'delim'; delim: string }
  | { kind: 'width'; widths: number[]; align: ('L' | 'R')[]; lead: number }
  | { kind: 'gap'; widths: number[]; align: ('L' | 'R')[]; lead: number };

export interface MetathesisTable {
  /** delimiter-join or fixed-width-join description of the layout */
  join: MetathesisJoin;
  rows: number;
  cols: number;
  /** the transposed (column-major) text */
  transposed: string;
  /**
   * 'perCell'   — one line per cell: rows*cols lines, column after column.
   * 'perColumn' — one line per column: cols lines, each holding the column's
   *               cells joined by the delimiter. Only for delimiter tables.
   */
  form: 'perCell' | 'perColumn';
}

/* ---------------------------------------------------------------------------
 * Table detection and transposition.
 * ------------------------------------------------------------------------- */

/**
 * Split the body into cells on a literal delimiter.
 * Returns null unless the table is rectangular (every line the same width)
 * and every cell is free of the delimiter (which is true by construction).
 */
function tableOnDelim(body: string[], delim: string): { rows: string[][]; cols: number } | null {
  if (delim === '\n') return null;
  const rows: string[][] = [];
  for (const line of body) if (line.length > 0) rows.push(line.split(delim));
  if (rows.length < MIN_ROWS) return null;
  const cols = rows[0]!.length;
  if (cols < MIN_COLS) return null;
  for (const r of rows) if (r.length !== cols) return null;
  return { rows, cols };
}

/**
 * Column-aligned whitespace table: a character position at which EVERY line
 * holds a space (or that lies past the end of every line) is a gap; the cells
 * are the maximal non-gap runs. Returns null unless the result is rectangular
 * (every line has the same number of cells) and every line's last cell is
 * non-empty, which is what makes the padding on restore unambiguous.
 */
function tableOnGap(body: string[], _gapMode = true): { rows: string[][]; cols: number; widths: number[]; align: ('L' | 'R')[]; lead: number } | null {
  const lines = body.filter((l) => l.length > 0);
  if (lines.length < MIN_ROWS) return null;
  let maxLen = 0;
  for (const l of lines) if (l.length > maxLen) maxLen = l.length;
  if (maxLen === 0) return null;

  // a position is a gap if no line has a non-space there
  const gap = new Array<boolean>(maxLen).fill(true);
  for (const l of lines) for (let p = 0; p < l.length; p++) if (l[p] !== ' ') gap[p] = false;

  // maximal non-gap runs are the columns
  const spans: Array<[number, number]> = [];
  for (let p = 0; p < maxLen; p++) {
    if (gap[p]) continue;
    let q = p;
    while (q + 1 < maxLen && !gap[q + 1]) q++;
    spans.push([p, q]);
    p = q;
  }
  const cols = spans.length;
  if (cols < MIN_COLS) return null;

  const rows: string[][] = [];
  for (const l of lines) {
    const cells = spans.map(([a, b]) => l.slice(a, b + 1));
    // the last cell must be non-empty, else trailing padding is ambiguous
    if (cells[cols - 1]!.trim() === '') return null;
    rows.push(cells);
  }

  // every column must be consistently aligned, and the join must reproduce the
  // original spacing: check that each column's cells, padded, rebuild the line
  const widths: number[] = [];
  const align: ('L' | 'R')[] = [];
  let lead = spans[0]![0];
  for (let c = 0; c < cols; c++) {
    const w = spans[c]![1] - spans[c]![0] + 1;
    if (c > 0 && spans[c]![0] !== (spans[c - 1]![1] + 1)) return null;
    widths.push(w);
    let left = true;
    let right = true;
    for (const r of rows) {
      if (r[c]!.length && r[c]![0] !== ' ') left = false;
      if (r[c]!.length && r[c]![r[c]!.length - 1] !== ' ') right = false;
    }
    // a column whose cells are all blank is not representable this way
    if (!left && !right) return null;
    align.push(left ? 'L' : 'R');
  }
  return { rows, cols, widths, align, lead: spans[0]![0] };
}


/**
 * Column-aligned whitespace table, general form: split every line on runs of
 * spaces/tabs; require the same token count everywhere, no trailing
 * whitespace, and then require each column to be consistently left-aligned
 * (every token starts at the same offset) or right-aligned (every token ends
 * at the same offset). Working back from the last column — which is taken
 * verbatim, so it must be left-aligned — that fixes every field boundary, so
 * the padding on restore is unambiguous and byte-exact.
 */
function tableOnFixed(body: string[]): { rows: string[][]; cols: number; widths: number[]; align: ('L' | 'R')[]; lead: number } | null {
  const lines = body.filter((l) => l.length > 0);
  if (lines.length < MIN_ROWS) return null;

  const parsed: Array<{ toks: string[]; a: number[]; b: number[]; lead: number }> = [];
  for (const l of lines) {
    if (/[ \t]$/.test(l)) return null;               // trailing whitespace is ambiguous
    const toks: string[] = [];
    const a: number[] = [];
    const b: number[] = [];
    let p = 0;
    while (p < l.length && (l[p] === ' ' || l[p] === '\t')) p++;
    const lead = p;
    while (p < l.length) {
      while (p < l.length && (l[p] === ' ' || l[p] === '\t')) p++;
      if (p >= l.length) break;
      const st = p;
      while (p < l.length && l[p] !== ' ' && l[p] !== '\t') p++;
      toks.push(l.slice(st, p));
      a.push(st);
      b.push(p - 1);
    }
    if (toks.length === 0) return null;
    parsed.push({ toks, a, b, lead });
  }
  const cols = parsed[0]!.toks.length;
  if (cols < MIN_COLS) return null;
  for (const q of parsed) {
    if (q.toks.length !== cols) return null;
    if (q.lead !== parsed[0]!.lead) return null;
  }

  const align: ('L' | 'R')[] = [];
  const A: number[] = [];
  const E: number[] = [];
  const maxlen: number[] = [];
  for (let c = 0; c < cols; c++) {
    const starts = parsed.map((q) => q.a[c]!);
    const ends = parsed.map((q) => q.b[c]!);
    const lens = parsed.map((q) => q.toks[c]!.length);
    const sameStart = starts.every((v) => v === starts[0]);
    const sameEnd = ends.every((v) => v === ends[0]);
    if (sameStart) { align.push('L'); A.push(starts[0]!); E.push(ends[0]!); }
    else if (sameEnd) { align.push('R'); A.push(Math.min(...starts)); E.push(ends[0]!); }
    else return null;
    maxlen.push(Math.max(...lens));
  }
  // the last column carries no padding, so it must be left-aligned
  if (align[cols - 1] !== 'L') return null;

  // Field k occupies [F_k, F_k+W_k) and is followed by exactly one space, so
  // W_k = F_{k+1} - F_k - 1. A left-aligned column starts at its field start;
  // a right-aligned column must end exactly one space before the next field.
  const F: number[] = new Array(cols).fill(0);
  F[cols - 1] = A[cols - 1]!;
  for (let c = cols - 2; c >= 0; c--) {
    if (align[c] === 'L') F[c] = A[c]!;
    else {
      if (E[c]! !== F[c + 1]! - 2) return null;
      F[c] = F[c + 1]! - 1 - maxlen[c]!;
    }
  }
  if (F[0]! !== parsed[0]!.lead) return null;
  const widths: number[] = [];
  for (let c = 0; c < cols - 1; c++) {
    const w = F[c + 1]! - F[c]! - 1;
    if (w < maxlen[c]!) return null;
    widths.push(w);
  }

  const join: MetathesisJoin = { kind: 'width', widths, align, lead: parsed[0]!.lead };
  for (let i = 0; i < parsed.length; i++) {
    if (joinRow(parsed[i]!.toks, join) !== lines[i]) return null;
  }
  return { rows: parsed.map((q) => q.toks), cols, widths, align, lead: parsed[0]!.lead };
}

/** Column-major transpose. `rows` is row-major cells. */
function transposeRows(rows: string[][]): string[] {
  const out: string[] = [];
  const cols = rows[0]!.length;
  for (let c = 0; c < cols; c++) for (const r of rows) out.push(r[c]!);
  return out;
}

/** Rebuild the row-major lines from the flat column-major list. */
function untransposeFlat(flat: string[], rows: number, cols: number): string[][] {
  const out: string[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: string[] = [];
    for (let c = 0; c < cols; c++) row.push(flat[c * rows + r]!);
    out.push(row);
  }
  return out;
}

function joinRow(cells: string[], join: MetathesisJoin): string {
  if (join.kind === 'delim') return cells.join(join.delim);
  let s = ' '.repeat(join.lead);
  const last = cells.length - 1;
  for (let c = 0; c < cells.length; c++) {
    const cell = cells[c]!;
    if (c === last) { s += cell; break; }
    const w = join.widths[c] ?? cell.length;
    const pad = ' '.repeat(Math.max(0, w - cell.length));
    s += (join.align[c] ?? 'L') === 'L' ? cell + pad : pad + cell;
    s += ' ';
  }
  return s;
}

/** Full split of `text` into (leading lines, table body rows, trailing lines). */
function splitBody(text: string): { lead: string[]; body: string[]; trail: string[] } | null {
  const lines = text.split('\n');
  const last = lines[lines.length - 1] === '' ? 1 : 0;
  const body = lines.slice(0, lines.length - last);
  return { lead: [], body, trail: last ? [''] : [] };
}

/* ---------------------------------------------------------------------------
 * The contract: one English sentence the reader applies after the arm decode.
 * ------------------------------------------------------------------------- */

export function metathesisContract(t: MetathesisTable): string {
  const { rows } = t;
  if (t.form === 'perColumn') {
    const d = t.join.kind === 'delim'
      ? (t.join.delim === '\t' ? 'a tab' : t.join.delim === '|' ? '"|"' : t.join.delim === ';' ? '";"' : '","')
      : '","';
    return `Column-major, one line per column; row i = cell i of every line, joined with ${d}. Undo after decoding.`;
  }
  if (t.join.kind === 'delim') {
    const d = t.join.delim === '\t' ? 'a tab' : t.join.delim === '|' ? '"|"' : t.join.delim === ';' ? '";"' : '","';
    return `Column-major, ${rows} lines per column; row i = line i of each block, joined with ${d}. Undo after decoding.`;
  }
  const w = t.join.widths.join('/');
  const right = t.join.align
    .slice(0, t.join.widths.length)
    .map((x, i) => (x === 'R' ? i + 1 : 0))
    .filter((i) => i > 0);
  const a = right.length ? `, col${right.join(',')} right` : ', all left';
  return (
    `Column-major, ${rows} lines/column; row i = line i of every block; widths ${w}${a}, ` +
    `1 space between, last bare. Undo after decoding.`
  );
}

/* ---------------------------------------------------------------------------
 * Plan: find the cheapest transposition that is an exact bijection.
 * ------------------------------------------------------------------------- */

export interface MetathesisPlan {
  join: MetathesisJoin;
  rows: number;
  cols: number;
  form: 'perCell' | 'perColumn';
  transposed: string;
  contract: string;
  contractTokens: number;
}

function realJoinKindIsWidth(join: MetathesisJoin): boolean { return join.kind !== 'delim'; }

function buildTable(text: string, join: MetathesisJoin, form: 'perCell' | 'perColumn'): MetathesisTable | null {
  const sp = splitBody(text);
  if (!sp) return null;
  const parsed =
    join.kind === 'delim' ? tableOnDelim(sp.body, join.delim)
    : join.kind === 'width' && join.widths.length === 0 ? tableOnFixed(sp.body)
    : tableOnGap(sp.body, join.kind === 'gap');
  if (!parsed) return null;
  const rows = parsed.rows.length;
  const cols = parsed.cols;
  const flat = transposeRows(parsed.rows);
  // rebuild and verify byte-exactness
  // the join that actually describes this table: the placeholder carries only
  // the kind, the detector supplies the geometry
  const geo = parsed as { widths?: number[]; align?: ('L' | 'R')[]; lead?: number };
  if (form === 'perColumn' && realJoinKindIsWidth(join)) return null;
  const realJoin: MetathesisJoin =
    geo.widths && geo.widths.length
      ? { kind: 'width', widths: geo.widths, align: geo.align ?? [], lead: geo.lead ?? 0 }
      : join;
  const rebuilt = untransposeFlat(flat, rows, cols).map((r) => joinRow(r, realJoin));
  const expect = sp.body.filter((l) => l.length > 0);
  if (rebuilt.length !== expect.length) return null;
  for (let i = 0; i < rebuilt.length; i++) if (rebuilt[i] !== expect[i]) return null;
  let transposed: string;
  if (form === 'perCell') {
    transposed = flat.join('\n') + (sp.trail.length ? '\n' : '');
  } else {
    const colLines: string[] = [];
    for (let c = 0; c < cols; c++) colLines.push(parsed.rows.map((r) => r[c]!).join((realJoin as { delim?: string }).delim ?? ','));
    transposed = colLines.join('\n') + (sp.trail.length ? '\n' : '');
  }
  return { join: realJoin, rows, cols, transposed, form };
}

export function metathesisPlan(text: string, enc: EncodingName = 'o200k_base'): MetathesisPlan[] {
  if (text.startsWith(METATHESIS_RAW)) return [];
  const best: MetathesisPlan[] = [];
  for (const join of [
    ...METATHESIS_DELIMS.map((d): MetathesisJoin => ({ kind: 'delim', delim: d })),
    { kind: 'width', widths: [], align: [], lead: 0 } as MetathesisJoin,   // fixed-offset columns
    { kind: 'gap', widths: [], align: [], lead: 0 } as unknown as MetathesisJoin,
  ]) {
    for (const form of ['perCell', 'perColumn'] as const) {
      let t: MetathesisTable | null;
      try { t = buildTable(text, join, form); } catch { t = null; }
      if (!t) continue;
      const contract = metathesisContract(t);
      const contractTokens = countTokens(contract, enc);
      best.push({ join: t.join, rows: t.rows, cols: t.cols, form: t.form, transposed: t.transposed, contract, contractTokens });
    }
  }
  return best;
}

/** Undo the transposition. `t` is the column-major text, i.e. the arm's decode. */
export function metathesisUndo(t: string, plan: MetathesisPlan): string {
  const lines = t.split('\n');
  const last = lines[lines.length - 1] === '' ? 1 : 0;
  const body = lines.slice(0, lines.length - last);
  if (plan.form === 'perColumn') {
    if (body.length !== plan.cols) return t;
    const d = (plan.join as { delim?: string }).delim ?? ',';
    const cols = body.map((l) => l.split(d));
    for (const c of cols) if (c.length !== plan.rows) return t;
    const rowsOut: string[][] = [];
    for (let r = 0; r < plan.rows; r++) rowsOut.push(cols.map((c) => c[r]!));
    return rowsOut.map((r) => joinRow(r, plan.join)).join('\n') + (last ? '\n' : '');
  }
  const flat = body;
  if (flat.length !== plan.rows * plan.cols) return t;
  const rows = untransposeFlat(flat, plan.rows, plan.cols).map((r) => joinRow(r, plan.join));
  return rows.join('\n') + (last ? '\n' : '');
}

/* ---------------------------------------------------------------------------
 * Arms and the whole-message gate.
 * ------------------------------------------------------------------------- */

interface ArmOut {
  wire: string;
  message: string;
  decode: () => string;
  armState?: string;
  tokens: number;
}

const ARMS: Array<{ name: string; encode: (t: string, enc: EncodingName) => ArmOut }> = [
  {
    name: 'lkd',
    encode: (t, enc) => {
      const r = lakonikosDualEncode(t, enc);
      return { wire: r.wire, message: r.decoderPrompt || t, decode: () => chironDecode(r.wire), tokens: r.messageTokens[enc] };
    },
  },
  {
    name: 'dens',
    encode: (t, enc) => {
      const r = densEncode(t, enc, {});
      return { wire: r.wire, message: r.decoderPrompt, decode: () => densDecode(r.wire), tokens: r.messageTokens };
    },
  },
  {
    name: 'ak2',
    encode: (t, enc) => {
      const r = akolouthia2Encode(t, enc);
      return { wire: r.wire, message: r.decoderPrompt, decode: () => akolouthia2Decode(r.wire, r.arm), armState: r.arm, tokens: r.messageTokens };
    },
  },
];

export interface MetathesisResult {
  codec: 'metathesis';
  wire: string;
  /** the full message: arm contract + wire, plus the METATHESIS sentence when taken */
  message: string;
  decoded: string;
  exact: boolean;
  mode: 'raw' | 'metathesis';
  arm: string;
  armState?: string;
  plan: MetathesisPlan | null;
  messageTokens: number;
  baseTokens: number;
  inTokens: number;
  notes: string;
}

/** The reader's own decode of a METATHESIS message: arm decode, then untranspose. */
export function metathesisDecode(wire: string, arm: string, plan: MetathesisPlan | null, armState?: string): string {
  const t =
    arm === 'dens' ? densDecode(wire)
    : arm === 'ak2' ? akolouthia2Decode(wire, (armState as 'progression' | 'identity') ?? 'progression')
    : chironDecode(wire);
  return plan ? metathesisUndo(t, plan) : t;
}

function bestArm(text: string, enc: EncodingName): { wire: string; message: string; tokens: number; arm: string; armState?: string } | null {
  let best: { wire: string; message: string; tokens: number; arm: string; armState?: string } | null = null;
  for (const a of ARMS) {
    try {
      const r = a.encode(text, enc);
      if (r.decode() !== text) continue;
      if (!best || r.tokens < best.tokens) best = { wire: r.wire, message: r.message, tokens: r.tokens, arm: a.name, armState: r.armState };
    } catch { /* arm failed on this input */ }
  }
  return best;
}

export function metathesisEncode(text: string, enc: EncodingName = 'o200k_base'): MetathesisResult {
  const inTokens = countTokens(text, enc);
  const rawIn = text.startsWith(METATHESIS_RAW) ? text : text;
  const base = bestArm(rawIn, enc);
  if (!base) {
    return {
      codec: 'metathesis', wire: rawIn, message: rawIn, decoded: text, exact: true, mode: 'raw', arm: 'none',
      plan: null, messageTokens: inTokens, baseTokens: inTokens, inTokens,
      notes: 'identity: no arm produced an exact wire',
    };
  }
  const out = (over: Partial<MetathesisResult> = {}): MetathesisResult => ({
    codec: 'metathesis', wire: base!.wire, message: base!.message, decoded: text, exact: true, mode: 'raw',
    arm: base!.arm, armState: base!.armState, plan: null, messageTokens: base!.tokens,
    baseTokens: base!.tokens, inTokens,
    notes: `identity (best raw arm ${base!.arm}, ${base!.tokens} tok)`, ...over,
  });

  let plans: MetathesisPlan[] = [];
  try { plans = metathesisPlan(text, enc); } catch { plans = []; }
  if (!plans.length) return out({ notes: 'no rectangular table found; ' + out({}).notes });

  // every candidate must be a bijection on this text, checked in isolation,
  // before it is allowed to compete on measured one-chat M
  const tried: string[] = [];
  let best: { wire: string; message: string; tokens: number; arm: string; armState?: string; plan: MetathesisPlan } | null = null;
  for (const plan of plans) {
    if (metathesisUndo(plan.transposed, plan) !== text) { tried.push(`${plan.form}/${plan.join.kind}: not bijective`); continue; }
    let cand: { wire: string; message: string; tokens: number; arm: string; armState?: string } | null = null;
    for (const a of ARMS) {
      try {
        const r = a.encode(plan.transposed, enc);
        if (metathesisUndo(r.decode(), plan) !== text) continue;
        const message = r.message + '\n' + plan.contract;
        const tokens = countTokens(message, enc);
        if (!cand || tokens < cand.tokens) cand = { wire: r.wire, message, tokens, arm: a.name, armState: r.armState };
      } catch { /* skip */ }
    }
    if (!cand) { tried.push(`${plan.form}/${plan.join.kind}: no exact arm`); continue; }
    tried.push(`${plan.form}/${plan.join.kind}/${plan.rows}x${plan.cols}: ${cand.tokens}`);
    if (!best || cand.tokens < best.tokens) best = { ...cand, plan };
  }
  if (!best) return out({ notes: `no transposition decoded exactly [${tried.join('; ')}]; ` + out({}).notes });
  if (best.tokens >= base.tokens) {
    return out({ notes: `transpositions [${tried.join('; ')}] all >= raw ${base.tokens}; ` + out({}).notes });
  }
  const plan = best.plan;
  return {
    codec: 'metathesis', wire: best.wire, message: best.message, decoded: text, exact: true, mode: 'metathesis',
    arm: best.arm, armState: best.armState, plan, messageTokens: best.tokens, baseTokens: base.tokens, inTokens,
    notes: `arm=${best.arm}; form=${plan.form}; table ${plan.rows}x${plan.cols} join=${plan.join.kind}; contract=${plan.contractTokens}; [${tried.join('; ')}]; ${base.tokens} -> ${best.tokens}`,
  };
}

/** Escape hatch for a payload that literally begins with the raw marker. */
export function metathesisEscape(text: string): string {
  return text.startsWith(METATHESIS_RAW) ? METATHESIS_RAW + text : text;
}
