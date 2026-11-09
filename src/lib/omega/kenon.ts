/** ΚΕΝΟΝ — kenon: space-aligned tables whose last column is prose.
 *
 *  A NEW INFERENCE STAGE, not a new wire. KANNABOS already rebuilds space-aligned
 *  tables byte-exactly, and its columnar wire is measurably cheaper through the
 *  frontier than the table itself (kubectl 326 -> 306 with the contract included;
 *  receipt `bench/x86/receipts/kenon.json`). What it cannot do is FIND those tables
 *  when the last column holds free text — which is most real command output:
 *
 *      ii  adduser          3.134          all      add and remove users and groups
 *      root  1553  103 13.9 1446072 561224 ?  Rl  17:49  3:14 node dist/...
 *
 *  `kannabosPlan` picks its candidate column counts from the CELL-COUNT HISTOGRAM:
 *  how many maximal non-space runs a line usually carries. On `dpkg -l` that
 *  histogram reads 10:25, 9:25, 8:23, 7:20, 11:18 (measured,
 *  `bench/x86/receipts/gaps.json`) — those are the WORD counts of the Description
 *  column. The true column count, 5, is not in the top three, is never tried, and
 *  KANNABOS reports "no grid plan" on a lane whose geometry is as regular as they
 *  come. ps -ef (vote 5, histogram 8), ps aux (vote 7, histogram 11), ls -la
 *  (vote 3, histogram 9) and psql (vote 3, histogram 11) fail the same way.
 *
 *  ΚΕΝΟΝ asks the geometry instead of the histogram. A column boundary is a GAP
 *  that occurs on almost every line, so every run of two or more spaces casts one
 *  vote for the offset at which the next field begins:
 *
 *      dpkg -l (141 lines)   4:135  34:136  65:136  78:135            ->  k=5
 *      kubectl  (23 lines)   37:23  45:23  57:23  68:23  76:23  92:23 ->  k=7
 *      ps aux   (61 lines)   18:59  23:58  38:37  49:60  54:58  62:59 ->  k=7
 *
 *  Prose in the last column cannot manufacture a boundary: its word gaps land at
 *  offsets that occur once or twice each, far below the support floor. That is the
 *  whole mechanism — one histogram over gap-end offsets, a support floor, and the
 *  resulting column counts handed to machinery that was already exact.
 *
 *  ============================================================================
 *  HONESTY LEDGER, from measurement and not from intent
 *  ============================================================================
 *   - The wire is KANNABOS's, so ΚΕΝΟΝ inherits its byte-exact rebuild, its
 *     separator-safety refusal and its literal-line escape. Nothing here re-derives
 *     padding arithmetic, and nothing here can approximate.
 *   - The contract rides OUTSIDE the frontier stage and costs 50-73 tokens. The gate
 *     below pays it out of the same budget, so a lane switches only when the
 *     columnar wire beats the source by more than the contract. On kubectl that
 *     margin is -20 tokens. On psql, ps-ef and ps aux the transform LOSES through
 *     the frontier (+58, +48, +14) and those lanes are refused, not approximated.
 *   - De-interleaving is therefore not a universal win, and the receipt says so. It
 *     wins where the columns are GENERATED (kubectl's `node-1..node-5`) and where
 *     the source is wide and regular; it loses where every column is high-entropy
 *     prose, because the frontier already compresses those.
 *
 *  ============================================================================
 *  WHAT IS NEW, AGAINST THE LITERATURE
 *  ============================================================================
 *  Column-by-column serialisation for LLM input is published: X. Xiao et al.,
 *  "Cents: Boosting LLMs with Cost-Efficient Sequences" (VLDB 18:4574, 2025),
 *  which writes a table column by column with inter- and intra-column delimiters
 *  because row-major costs more tokens. Inferring fields from the fact that they
 *  recur at the same character offsets is published too: "TWIX: Visual Template
 *  Inference for Data Extraction from Documents" (PACMMOD/SIGMOD 2025,
 *  doi:10.1145/3780105). Neither reads space-aligned CLI output, neither emits a
 *  byte-exact wire, and neither states a gap-support VOTE with a support floor as
 *  the column-count estimator — Cents and TWIX both take the geometry as given or
 *  read it off a rendered page. What is imported here is the inference principle;
 *  no code, no data and no tokenizer behaviour is imported.
 *
 *  ============================================================================
 *  CONTRACT
 *  ============================================================================
 *  Byte-exact or refused, checked in two stages: the frontier must reproduce OUR
 *  message from its own wire (G6a), and the columnar wire must reproduce the source
 *  under that message's own contract (G6b). Not exact, or not strictly cheaper than
 *  the frontier's own answer ⇒ `applied: false` and the frontier is unchanged.
 *
 *  Time/CPU bound: the vote is O(chars) — one regex pass per line, milliseconds.
 *  The grid fit is O(lines × candidate column counts). The gate costs exactly ONE
 *  extra frontier encode, which is the expensive term (2-200 s on the largest real
 *  lanes; measured in `bench/x86/receipts/kenon.json`). No search, no sampling.
 */
import { countTokens, type EncodingName } from './bpe';
import {
  kannabosClause,
  kannabosRunMarker,
  kannabosDecode,
  kannabosLines,
  kannabosPlan,
  type KannabosPlan,
} from './kannabos';
import { tagstackFrontier, type TagstackResult } from './tagstack';

export interface KenonResult {
  codec: 'kenon';
  /** the complete message a reader receives: contract line, then the columnar wire */
  message: string;
  decoded: string;
  exact: boolean;
  applied: boolean;
  frontierTokens: number;
  messageTokens: number;
  frontierParent: string;
  notes: string;
  /** column counts the vote proposed, and the one KANNABOS accepted */
  k?: number[];
  cols?: number;
  rows?: number;
  literals?: number;
  bounds?: number[];
  support?: number[];
  clauseTokens?: number;
  wireTokens?: number;
  delta?: number;
}

/** G1 floor: a grid with fewer rows than this cannot amortise a contract. */
export const KENON_MIN_LINES = 6;
/** G1 ceiling: keep the vote's cost linear and bounded. */
const KENON_MAX_COLS = 18;
/** G2 floor: a boundary must occur on at least this fraction of the lines. */
const KENON_SUPPORT = 0.6;
/** G2 floor, permissive reading of the same vote. */
const KENON_SUPPORT_LOOSE = 0.4;
/** G2 absolute floor: three lines is the least that can vote at all. */
const KENON_MIN_SUPPORT = 3;

/**
 * Vote for column boundaries.
 *
 * A run of >=2 spaces ending at offset `e` means: on this line a field begins at
 * `e`. Offsets that almost every line votes for are column boundaries; offsets that
 * a handful of lines vote for are word gaps inside prose. The support floor is a
 * fraction of the line count with an absolute minimum, so a 7-line table and a
 * 600-line table are held to the same standard.
 */
export function kenonBounds(
  text: string,
  support = KENON_SUPPORT,
): { bounds: number[]; support: number[]; lines: number; minSup: number } | null {
  const body = text.endsWith('\n') ? text.slice(0, -1) : text;
  const lines = body.split('\n');
  if (lines.length < KENON_MIN_LINES) return null;
  const hist = new Map<number, number>();
  for (const l of lines) {
    const re = /( {2,})/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(l)) !== null) {
      const e = m.index + m[1].length;
      hist.set(e, (hist.get(e) ?? 0) + 1);
    }
  }
  const minSup = Math.max(KENON_MIN_SUPPORT, Math.ceil(lines.length * support));
  const bounds = [...hist.entries()]
    .filter(([, n]) => n >= minSup)
    .map(([o]) => o)
    .sort((a, b) => a - b);
  return { bounds, support: bounds.map((b) => hist.get(b)!), lines: lines.length, minSup };
}

/**
 * The column counts the vote implies.
 *
 * Two thresholds rather than one: a boundary whose support sits just under the
 * strict floor — a column blank on a few rows, or a right-aligned column whose
 * values touch the padding — still bounds a real column, so the permissive count is
 * offered as well. A strict vote with two or more boundaries also admits one column
 * FEWER, because the widest gap may be intra-column padding rather than a separator.
 * KANNABOS keeps whichever of these fits and refuses the lane if none does; the list
 * is deliberately short because every candidate costs a full grid fit.
 */
export function kenonCandidateK(text: string): { k: number[]; bounds: number[]; support: number[] } {
  const strict = kenonBounds(text, KENON_SUPPORT);
  const loose = kenonBounds(text, KENON_SUPPORT_LOOSE);
  const k = new Set<number>();
  for (const v of [strict, loose]) {
    if (v && v.bounds.length >= 1 && v.bounds.length + 1 <= KENON_MAX_COLS) k.add(v.bounds.length + 1);
  }
  if (strict && strict.bounds.length >= 2) k.add(strict.bounds.length);
  return { k: [...k].sort((a, b) => a - b), bounds: strict?.bounds ?? [], support: strict?.support ?? [] };
}

/**
 * Plan and contract, without paying for a frontier encode. Cheap enough to screen
 * with: this is the half a receipt can run over a hundred lanes in seconds.
 */
export function kenonPlanOnly(text: string, enc: EncodingName = 'o200k_base'): {
  plan: KannabosPlan; clause: string; k: number[]; bounds: number[]; support: number[];
} | null {
  if (!text.length) return null;
  if (kannabosLines(text).length < KENON_MIN_LINES) return null;
  const vote = kenonCandidateK(text);
  if (!vote.k.length) return null;
  let plan: KannabosPlan | null = null;
  try { plan = kannabosPlan(text, enc, vote.k); } catch { plan = null; }
  if (!plan) return null;
  // G4: soundness before measurement. The same check KANNABOS makes of itself.
  if (kannabosDecode(plan.text) !== text) return null;
  const clause = kenonClause(plan);
  // G5: the contract must be exactly one line, because the reader finds the wire by
  // taking everything after the first newline.
  if (!clause || clause.includes('\n') || clause.includes('\r')) return null;
  return { plan, clause, k: vote.k, bounds: vote.bounds, support: vote.support };
}

/**
 * ΚΕΝΟΝ's contract line.
 *
 * `kannabosClause` is the measured-tersest wording in the stack — four clearer
 * phrasings cost 94–123 tokens against its 59 (`bench/x42/clause.ts`), and every one
 * of those tokens comes out of the same budget as the data, so the wording is reused
 * verbatim. One thing is corrected: it hard-codes the run marker as `*`, while the
 * wire uses whichever marker KANNABOS found absent from the source. A reader told
 * `v*count` who then meets `ii§35` has been misinformed about the only rule that
 * distinguishes a repeated value from a literal one. G5b: when the plan uses runs at
 * all, the marker named in the contract must be the marker in the wire.
 */
export function kenonClause(plan: KannabosPlan): string {
  const clause = kannabosClause(plan);
  const marker = kannabosRunMarker();
  if (marker === '*') return clause;
  if (!plan.codecs.some((c) => c.split(':')[1]?.startsWith('r'))) return clause;
  return clause.replace('v*count', `v${marker}count`);
}

/** Decode OUR message — contract line, then columnar wire — back to the source. */
export function kenonDecode(message: string): string {
  const i = message.indexOf('\n');
  if (i < 0) return message;
  return kannabosDecode(message.slice(i + 1));
}

export function kenonEncode(
  text: string,
  enc: EncodingName = 'o200k_base',
  frontierFn: (t: string, e: EncodingName) => TagstackResult = tagstackFrontier,
): KenonResult {
  const identity = frontierFn(text, enc);
  const base = {
    codec: 'kenon' as const,
    message: text,
    decoded: text,
    exact: true,
    applied: false,
    frontierTokens: identity.messageTokens,
    messageTokens: identity.messageTokens,
    frontierParent: identity.parentCodec,
  };
  if (!identity.exact) return { ...base, exact: false, notes: 'refused: frontier is not byte-exact on this lane' };

  const vote = kenonCandidateK(text);
  if (!vote.k.length) return { ...base, notes: 'refused: no gap boundary met the support floor (G2)' };

  const got = kenonPlanOnly(text, enc);
  if (!got) {
    return { ...base, k: vote.k, bounds: vote.bounds, support: vote.support,
      notes: 'refused: no byte-exact grid for the voted column counts (G3/G4/G5)' };
  }
  const { plan, clause } = got;
  const message = `${clause}\n${plan.text}`;

  // G7 — the cost of the message is NOT countTokens(message). The message is read by
  // a frontier that re-encodes it, so the honest cost is frontierFn(contract + wire).
  // This is where a naive implementation goes wrong: measured with countTokens every
  // lane below refuses (the wire is longer than the source in raw tokens), yet
  // measured through the frontier kubectl wins by 20 tokens.
  const r = frontierFn(message, enc);
  const clauseTokens = countTokens(clause, enc);
  const wireTokens = countTokens(plan.text, enc);
  const shape = {
    k: got.k, cols: plan.cols, rows: plan.rows, literals: plan.literals,
    bounds: got.bounds, support: got.support, clauseTokens, wireTokens,
    delta: r.messageTokens - identity.messageTokens,
  };

  // G6a: the frontier must hand our message back byte-for-byte.
  // G6b: under that message's own contract the wire must rebuild the source.
  const exact = r.exact && r.decoded === message && kenonDecode(message) === text;
  if (!exact) {
    return { ...base, ...shape, exact: false, messageTokens: r.messageTokens,
      notes: 'refused: two-stage round trip failed (G6)' };
  }
  if (r.messageTokens >= identity.messageTokens) {
    return { ...base, ...shape, messageTokens: r.messageTokens,
      notes: `refused: no strict win — ${r.messageTokens} vs frontier ${identity.messageTokens} (G7)` };
  }

  return { ...base, ...shape, applied: true, message, decoded: text, exact: true,
    messageTokens: r.messageTokens, notes: `kenon: k=${plan.cols} bounds=[${got.bounds.join(',')}]` };
}
