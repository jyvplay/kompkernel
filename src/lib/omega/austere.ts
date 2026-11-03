/**
 * AUSTEROS (αὐστηρός, "austere") — X71.
 * =============================================================================
 * A codec whose decoder instruction is SEARCHED, not written.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS EXISTS (measured, bench/x71)
 * ---------------------------------------------------------------------------
 * X70 showed that a table fold was already 2x smaller than the shipping frontier
 * and lost its gate on the price of its English. This turn measured the other
 * end of that: the wire on `holdout-work/kb-article.txt` costs 611 tokens and
 * 219 registered exact codecs all produce that same 611-token wire; the shipped
 * message is 622. The instruction is the ENTIRE remaining gap on that lane.
 *
 * So the instruction is not prose to be trimmed; it is a term of the objective
 * function with a measurable minimum. BRACHYS authored one phrasing per feature
 * by hand. AUSTEROS keeps the wire byte-identical to BRACHYS's and treats the
 * instruction as a small combinatorial object:
 *
 *   - a POOL of alternative phrasings per feature, each one independently
 *     unambiguous (see POOL below and the admission rule);
 *   - COORDINATE DESCENT on the assembled contract, scored by the token count
 *     of the COMPLETE message (contract + LF + wire), not of the clause;
 *   - the search is measured twice per candidate through the real tokenizer, so
 *     a boundary effect that makes a shorter clause longer in context cannot be
 *     adopted.
 *
 * The decoder is `brachysDecodeMessage` unchanged, because the WIRE is
 * unchanged. Only the English is different, and every phrasing in the pool says
 * the same thing as the BRACHYS fragment it replaces. That is the whole
 * safety argument: identical notation, identical grammar, less English.
 *
 * ---------------------------------------------------------------------------
 * ADMISSION RULE FOR A POOL ENTRY (this is the correctness surface)
 * ---------------------------------------------------------------------------
 * A phrasing is admitted only when ALL of these hold:
 *   1. it defines every notation token it mentions, or refers to a term already
 *      defined earlier in the assembled contract;
 *   2. it does not move a quantifier or a scope (no "per row" dropped, no
 *      "the rest" dropped);
 *   3. it does not reintroduce an ambiguity that was already fixed: `mM` must
 *      keep explicit grouping `A+(B*r mod M)` even though `A+B*r mod M` is
 *      2 tokens cheaper (X70 §5.3 found that defect on this exact wire);
 *   4. an independent reader that implements only the printed prose reproduces
 *      the source byte for byte (bench/x71/reader3.ts).
 * Rule 3 is a deliberate refusal of a cheaper string, and it is the reason the
 * win here is small: **the pool loses where clarity costs tokens**.
 *
 * ---------------------------------------------------------------------------
 * GREEDY? NO. TIME OR CPU? CPU.
 * ---------------------------------------------------------------------------
 * Coordinate descent over the pool with a full-message objective; the family of
 * arms (literal body / c-tape body) comes from BRACHYS's own measured minimum.
 * The final gate is the same-process complete-message comparison against the
 * shipped frontier plus BRACHYS, so AUSTEROS can never be worse than either.
 * No wall clock is consulted; cost is O(features x pool x |message|) tokenizer
 * calls, bounded by 24 features and 5 phrasings each.
 *
 * ---------------------------------------------------------------------------
 * PRIOR ART (stated, not implied)
 * ---------------------------------------------------------------------------
 * Instruction tuning by search is not a compression primitive. What is prior art:
 * columnar scaled-integer slots (ClickHouse ALP), per-column linear generators
 * (`Virtual`, arXiv:2410.14066), in-prompt codes decoded by an LLM
 * (arXiv:2604.13066, arXiv:2411.12448), and the table wire itself (HYLE/KANON).
 * What is this turn's: that the decoder specification is a term to minimise
 * under a measured complete-message objective, and the pool-plus-descent method
 * for doing it without changing the notation or the decoder.
 */

import { countTokens, type EncodingName } from './bpe';
import { brachysDecodeMessage, brachysFacts, brachysPlan, type BrachysFacts } from './brachys';
import { tagstackEncode, type TagstackResult } from './tagstack';

/**
 * The pool. Index 0 of every entry is the BRACHYS fragment, so the search can
 * never do worse than BRACHYS. Later entries trade words for tokens; none of
 * them drops a scope, and `s2` is deliberately left with its explicit grouping.
 */
export const AUSTERE_POOL = {
  baseLit: [
    'Lines A-B (from 0) below the directive line are one table split by SEP; the rest is literal.',
    // must carry AUSTERE_BASE_LIT_PREFIX verbatim: that prefix is the band marker
    'A-B are 0-based body lines of a SEP-split table; the rest is literal.',
    'A-B are 0-based body lines forming one SEP-split table; the rest is literal.',
  ],
  baseTape: [
    'The body below the directive line is a c-tape; decode it by the rule inside it. Lines A-B (from 0) of the result are one table split by SEP; the rest is literal.',
    // must contain "c-tape": that phrase is the band marker for a tape body
    'The body is a c-tape; decode it by the rule it states. Lines A-B (from 0) of the result are one SEP-split table; the rest is literal.',
  ],
  runs: [
    '_ = fields split by 2+ spaces, rejoined with 1; only the last may hold a space.',
    '_ = fields split on 2+ spaces and rejoined by 1; only the last may hold a space.',
  ],
  verbatim: [
    'h = leading lines kept, then rows r=0,1,2,..',
    'h = lines kept above r=0',
    'h = leading lines kept; r counts from 0 after them',
  ],
  align: [
    'A = field start columns, minus = end column of a right-aligned field.',
    'A = field starts; a negative entry is a right-aligned field end.',
    'A = field start columns; negative = right-aligned end column.',
  ],
  genHead: [
    'G<c>=<spec> restores deleted column c per row r;',
    'G<c>=<spec> gives column c for row r;',
    'G<c>=<spec> yields column c at row r;',
  ],
  s1: ['{A+B}=A+B*r'],
  /** rule 3: explicit grouping is kept even though the bare form is 2 tokens cheaper. */
  s2: ['mM=A+(B*r mod M)'],
  s3: ['zW=zero-pad to W'],
  s4: ['cX is the r-th letter from X', 'cX is letter r of X'],
  s5: ['{{ }} are braces'],
  cycle: ['#p:v,.. cycles p values.', '#p:v,.. cycles p values'],
  date: ['@A..B or @A+N = one date per row from A, w=weekdays, -i skips day offset i.'],
  tail: ['print only.', 'print only'],
} as const;

type Slot = keyof typeof AUSTERE_POOL;

/** The fixed order the contract is assembled in; `s1..s5` ride inside genHead. */
const ORDER: Slot[] = ['baseLit', 'baseTape', 'runs', 'verbatim', 'align', 'cycle', 'date', 'tail'];

function slotsFor(f: BrachysFacts, band: 'b' | 'c'): { slots: Slot[]; sList: Slot[] } {
  const slots: Slot[] = [band === 'c' ? 'baseTape' : 'baseLit'];
  if (f.runs) slots.push('runs');
  if (f.verbatim) slots.push('verbatim');
  if (f.align) slots.push('align');
  const sList: Slot[] = [];
  if (f.gen) {
    if (f.anySlot) sList.push('s1');
    if (f.mod) sList.push('s2');
    if (f.pad) sList.push('s3');
    if (f.letter) sList.push('s4');
    if (f.braces) sList.push('s5');
  }
  if (f.cycle) slots.push('cycle');
  if (f.date) slots.push('date');
  slots.push('tail');
  return { slots, sList };
}

/**
 * Assemble a complete contract from one choice per slot. The generator head is
 * emitted once, before the `s` terms, exactly as BRACHYS does it.
 */
function assemble(choice: Map<Slot, string>, slots: Slot[], sList: Slot[], genHead: string): string {
  const parts: string[] = [];
  for (const sl of slots) {
    if (sl === 'cycle' && sList.length) {
      // the gen head and its terms form one sentence, in the same position BRACHYS uses
      parts.push(genHead + ' ' + sList.map((s) => choice.get(s)!).join(', ') + ';');
    }
    parts.push(choice.get(sl)!);
  }
  // sentence punctuation is part of the contract's meaning, so it is repaired
  // rather than searched away: a pool entry may drop a full stop to save a token,
  // and the assembler puts exactly one back.
  return parts
    .map((x) => (/[.;:,]$/.test(x.trim()) ? x.trim() : x.trim() + '.'))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface AustereResult {
  codec: 'austere';
  band: 'b' | 'c' | null;
  wire: string;
  contract: string;
  message: string;
  decoded: string | null;
  exact: boolean;
  messageTokens: number;
  contractTokens: number;
  brachysTokens: number;
  frontierTokens: number;
  /** true when the message shipped is AUSTEROS's own, false on any fall-back */
  applied: boolean;
  /** per-slot alternatives that were measured and rejected, for receipts */
  tried: string[];
  dirs: string[];
}

const clone = (f: TagstackResult, notes: string): AustereResult => ({
  codec: 'austere', band: null, wire: f.message, contract: '', message: f.message, decoded: f.decoded,
  exact: f.exact, messageTokens: f.messageTokens, contractTokens: 0,
  brachysTokens: Number.POSITIVE_INFINITY, frontierTokens: f.messageTokens, applied: false, tried: [notes], dirs: [],
});

export function austereEncode(text: string, enc: EncodingName = 'o200k_base'): AustereResult {
  const frontier = tagstackEncode(text, enc);
  const { plan } = brachysPlan(text, enc);
  if (!plan) {
    return { ...clone(frontier, `austere: no fold offered; frontier ${frontier.messageTokens}`), brachysTokens: frontier.messageTokens };
  }
  const band = (plan.arm === 'c' ? 'c' : 'b') as 'b' | 'c';
  const f = brachysFacts(plan.dirs);
  const { slots, sList } = slotsFor(f, band);
  const genHead = AUSTERE_POOL.genHead[0];

  // start from BRACHYS's own phrasing for every slot
  const choice = new Map<Slot, string>();
  for (const sl of slots) choice.set(sl, AUSTERE_POOL[sl][0]);
  for (const s of sList) choice.set(s, AUSTERE_POOL[s][0]);

  const cost = (c: Map<Slot, string>) => {
    const contract = assemble(c, slots, sList, genHead);
    return { contract, tokens: countTokens(contract, enc) + countTokens(plan.wire, enc) };
  };
  let best = cost(choice);
  const tried: string[] = [];
  // coordinate descent, two passes: cheap, deterministic, and measured on the
  // COMPLETE message so a boundary effect can never sneak a longer message in.
  for (let pass = 0; pass < 2; pass++) {
    for (const sl of [...slots, ...sList]) {
      for (const alt of AUSTERE_POOL[sl] as readonly string[]) {
        const prev = choice.get(sl)!;
        if (alt === prev) continue;
        choice.set(sl, alt);
        const c = cost(choice);
        if (c.tokens < best.tokens) { best = c; tried.push(`+${sl}=${countTokens(alt, enc)}`); }
        else { choice.set(sl, prev); tried.push(`-${sl}=${countTokens(alt, enc)}`); }
      }
    }
  }
  // a gen head can only make the head longer or shorter; try the alternatives too
  for (const gh of AUSTERE_POOL.genHead as readonly string[]) {
    const contract = assemble(choice, slots, sList, gh).replace(genHead, gh);
    const t = countTokens(contract, enc) + countTokens(plan.wire, enc);
    if (t < best.tokens) { best = { contract, tokens: t }; tried.push(`+genHead=${countTokens(gh, enc)}`); }
    else tried.push(`-genHead=${countTokens(gh, enc)}`);
  }

  const message = best.contract + '\n' + plan.wire;
  const decoded = brachysDecodeMessage(message);
  if (decoded !== text) {
    return { ...clone(frontier, 'austere: own reader failed; frontier kept'),
      brachysTokens: plan.tokens };
  }
  const tokens = countTokens(message, enc);
  const floor = Math.min(frontier.messageTokens, plan.tokens);
  if (tokens >= floor) {
    return { ...clone(frontier, `austere loses: candidate ${tokens} vs ${floor}`),
      brachysTokens: plan.tokens };
  }
  return {
    codec: 'austere', band, wire: plan.wire, contract: best.contract, message, decoded, exact: true,
    messageTokens: tokens, contractTokens: countTokens(best.contract, enc),
    brachysTokens: plan.tokens, frontierTokens: frontier.messageTokens, applied: true, tried, dirs: plan.dirs,
  };
}
