/**
 * ANTISTROPHE (ἀντιστροφή — "a turning back", the counter-movement that
 * answers the strophe).
 *
 * X39. Every codec in this stack harvests REDUNDANCY: a dictionary amortises a
 * glossary entry over many occurrences, a run-length rule amortises a count
 * over many repeats, a shape rule amortises a clause over many matches. All of
 * them share one structural precondition — the thing being compressed must
 * OCCUR MORE THAN ONCE.
 *
 * X38 measured what that leaves behind, and it is not small. On two prose lanes
 * the wire body is 74–88% distinct words: 254 of 319 word types on kb-article
 * occur exactly once, and not one hapax is within a single-character edit of
 * any word occurring three or more times. That mass is unreachable by every
 * mechanism above, because there is nothing to amortise against.
 *
 * But "occurs once" is not the same as "costs what it must". Consider a file
 * path in a git-numstat listing:
 *
 *     src/omega/anadiplosis.ts      11 tokens
 *     src_omega_anadiplosis.ts       5 tokens
 *
 * The two strings carry the same information and the second is a bijection of
 * the first, but o200k_base prices them differently by more than a factor of
 * two. The reason is not compression, it is the MERGE TABLE: byte-level BPE
 * learned `src_omega_anadiplosis` because snake_case identifiers are
 * everywhere in its training corpus, and it never learned a merge across `/`
 * because paths are a small fraction of English text. A slash is a structural
 * character in the document and a rare one in the training distribution, so
 * every path pays a token for every segment boundary plus a token for the
 * slash.
 *
 * That is TOKENIZATION WASTE, and it is orthogonal to redundancy. It is
 * invisible to a dictionary — the path occurs once, so no glossary entry can
 * ever pay for itself — and it is invisible to every codec in this stack.
 *
 * WHAT THIS CODEC DOES
 * ---------------------------------------------------------------------------
 * ANTISTROPHE exchanges two characters of the source before the stack ever
 * sees it, and asks the reader to exchange them back afterwards:
 *
 *     encode:  wire  = STACK( swap(text) )
 *     decode:  text  = swap( STACK⁻¹(wire) )
 *
 * A swap is an involution and a bijection on the character set, so it is
 * exactly invertible with no escape convention, no sentinel and no absence
 * requirement. That is what makes it usable where substitution is not, and
 * screen 3 (bench/x39/screen3.ts) measured precisely why the distinction
 * matters: mapping a frequent delimiter onto a character ABSENT from the
 * document is also unambiguous, but it loses on every lane, because the
 * rarity that guarantees the decoder can tell the two apart is the same rarity
 * that stops BPE from having learned any merge for it. git-numstat pays +370
 * tokens for the absent-target substitution that the swap delivers at −408.
 *
 * The pair is not chosen by intuition. ANTISTROPHE runs a MEASURED auction:
 * every pair in a structure-preserving pool is applied, the resulting text is
 * tokenized, and the cheapest wins. It ships only when the measured full
 * message — stack output plus the clause that states the exchange — is strictly
 * smaller than the parent's. So it is a strict superset of OURA in the same
 * way EUTELEIA is a strict superset of ANADIPLOSIS: OURA is ANTISTROPHE with
 * the auction disabled.
 *
 * WHY THE POOL IS RESTRICTED
 * ---------------------------------------------------------------------------
 * The unconstrained search (bench/x39/screen4.ts) finds much larger numbers
 * and they are refused, for two reasons that are separate and both real.
 *
 *   1. Swapping WITH NEWLINE is the single biggest win on nearly every lane —
 *      git-numstat prices `0 <-> \n` at −503 — and it destroys the line
 *      structure of the document. That breaks every downstream structural
 *      codec in this stack, all of which read the tape line-wise or
 *      field-wise, and it makes the tape unreadable, which costs the reader
 *      the language prior it needs in order to place the glossary glyphs.
 *   2. Swapping a DIGIT for a punctuation mark — vix prices `0 <-> ,` at −442 —
 *      turns every number in the document into punctuation and back. The
 *      result is a bijection and it is garbage to read.
 *
 * Both are lossless and both are refused, because this stack's binding
 * constraint is that a bare language model decodes the message from one chat
 * box. The pool is therefore punctuation, symbols, space and tab: characters
 * whose exchange leaves every word, every number and every line break
 * exactly where it was. Under that restriction the honest numbers are
 * −408 raw on git-numstat, −166 on find-listing, −131 on npm-ls, and roughly
 * zero on prose. This codec does not move prose and says so.
 *
 * EXTERNAL CONTEXT, INCLUDING THE PART THAT CUTS AGAINST THIS
 * ---------------------------------------------------------------------------
 * Repricing a serialization for a tokenizer is a known move. TOON
 * (Token-Oriented Object Notation, toon-format/toon) claims 30–60% fewer
 * tokens than JSON by declaring keys once and streaming tabular rows, and
 * arXiv 2603.03306 (February 2026) benchmarks it against plain and
 * constrained-decoding JSON. The caution is equally real and is recorded here
 * rather than omitted: a 9,649-experiment study by Damon McMillan across 11
 * models, four formats and schemas from 10 to 10,000 tables (February 2026,
 * reported at usewire.io) found TOON costing 38% MORE tokens at the schemas
 * tested, with no statistically significant effect of format on aggregate
 * accuracy (chi-squared 2.45, p = 0.484), attributing the discrepancy to the
 * tokenizer's merge tables and the model's fluency, both downstream of
 * training data. Format-level token savings measured on fixed datasets are
 * exactly the kind of result that reverses under distribution shift. The
 * difference here is that ANTISTROPHE does not have a fixed opinion about
 * which format is cheaper — it measures the pair on the document in front of
 * it and ships nothing when the measurement says no.
 *
 * A second caution is more specific to the mechanism. R-BPE (EMNLP 2025,
 * aclanthology.org/2025.emnlp-main.1169) observes that BPE defines tokens by
 * ranked, recursive merges and that this produces "non-deterministic, and
 * thus impractical, behavior with arbitrary token substitutions." That is a
 * fair description of what this codec relies on, and it is why every decision
 * here is made by measuring the tokenized result rather than by predicting it
 * from a model of the merge table. Related recent work on the same substrate:
 * arXiv 2608.00582 (the merge-ordering problem — a token can exist in the
 * vocabulary yet be strict-unreachable under rank-ordered merges, a failure
 * mode called ill-tokenization), arXiv 2504.00178 (Boundless BPE, which
 * measures Rényi efficiency falling 9% from train to held-out corpora —
 * direct evidence that tokenizer efficiency is distribution-dependent),
 * arXiv 2608.02376 (BPE ids are not frequency-ordered, and re-ranking them
 * recovers most of an entropy coder's ratio at ~7× the decode speed), and
 * arXiv 2608.00837 (Pruned BPE).
 *
 * Greedy: no — every pair in the pool is scored on the real token count of the
 * text it produces, and every clause on the real contract it splices into, and
 * the transform ships only when the measured full message is strictly smaller
 * than the parent's. Time and CPU bound: yes, the auction is one tokenization
 * per candidate pair (528 pairs for a 33-character pool), which measured 2 s
 * on the 46 KB git-numstat lane, and only the winning pair is carried through
 * the stack.
 */
import { countTokens, type EncodingName } from './bpe';
import {
  ouraEncode, ouraDecode,
  type OuraResult,
} from './oura';

/**
 * The structure-preserving pool: punctuation, symbols, space and tab.
 *
 * Excluded on principle, with the measured price of the exclusion recorded in
 * the header: newline (breaks line structure and every downstream codec) and
 * alphanumerics (turn words and numbers into unreadable noise).
 */
export const ANTISTROPHE_POOL: string[] =
  (' !"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~').split('').concat(['\t']);

/** A pair must move at least this much of the document to be worth pricing. */
export const ANTISTROPHE_MIN_COUNT = 20;
/** Hard cap on the auction, so a large document cannot dominate encode time. */
export const ANTISTROPHE_MAX_PAIRS = 600;

export type AntistrophePair = [string, string];

/** Exchange two characters. An involution: applying it twice is the identity. */
export function antistropheSwap(text: string, a: string, b: string): string {
  const p1 = '\u0001';
  const p2 = '\u0002';
  return text.split(a).join(p1).split(b).join(p2).split(p1).join(b).split(p2).join(a);
}

export function antistrophePairsFor(text: string): AntistrophePair[] {
  const present = new Set<string>();
  for (const ch of text) present.add(ch);
  const pool = ANTISTROPHE_POOL.filter(
    (c) => present.has(c) && (text.split(c).length - 1) >= ANTISTROPHE_MIN_COUNT);
  const out: AntistrophePair[] = [];
  for (let i = 0; i < pool.length; i++) {
    for (let j = i + 1; j < pool.length; j++) {
      out.push([pool[i], pool[j]]);
      if (out.length >= ANTISTROPHE_MAX_PAIRS) return out;
    }
  }
  return out;
}

/**
 * Clause wordings. EUTELEIA's lesson: the clause is spliced in front of a
 * sentence that already exists, so its price is the price of the JUNCTION, not
 * of the clause in isolation. Every wording is scored by measuring the exact
 * contract it produces and the cheapest wins.
 */
export const ANTISTROPHE_CLAUSE_TEMPLATES: string[] = [
  'Then swap {A} and {B}.',
  'Then exchange {A} and {B}.',
  'Then in the result swap {A} and {B}.',
  'In the result, {A} and {B} are exchanged.',
  'Then swap {A} and {B} in the result.',
];

/**
 * How a character is NAMED in the clause, as opposed to how it is displayed in
 * a receipt.
 *
 * This distinction is load-bearing and was measured, not assumed. The winning
 * pair on every ops lane is space and slash, and the cheapest wording that
 * emits the characters literally is "Then swap   /." — in which one of the two
 * characters to exchange is an invisible space. That is four tokens and it is
 * useless: a reader looking at a single chat message cannot see the character
 * it is being asked to swap. Naming it costs one more token
 * ("Then swap space and /." is 5) and makes the instruction readable, so the
 * cheap wording is refused. A saving that the reader cannot act on is not a
 * saving.
 */
export function antistropheName(c: string): string {
  if (c === ' ') return 'space';
  if (c === '\t') return 'tab';
  if (c === '\n') return 'newline';
  return c;
}

export function antistropheClausesFor(a: string, b: string): string[] {
  const na = antistropheName(a);
  const nb = antistropheName(b);
  return ANTISTROPHE_CLAUSE_TEMPLATES
    .map((t) => t.replace('{A}', na).replace('{B}', nb));
}

/** The sentence the clause splices in front of. */
const CONTRACT_TAIL = 'print only.';

/** Price a clause as the junction it actually creates. */
export function antistropheClauseTokens(
  contract: string, clause: string, enc: EncodingName,
): number {
  if (!contract.endsWith(CONTRACT_TAIL)) return countTokens(' ' + clause, enc);
  const head = contract.slice(0, contract.length - CONTRACT_TAIL.length);
  return countTokens(head + clause + ' ' + CONTRACT_TAIL, enc) - countTokens(contract, enc);
}

export interface AntistropheResult extends OuraResult {
  antistrophe: boolean;
  /** the pair that was exchanged, null when the transform did not fire */
  antistrophePair: AntistrophePair | null;
  /** the clause that states the exchange, '' when it did not fire */
  antistropheClause: string;
  /** tokens won against OURA */
  antistropheGain: number;
  /** how many pairs the auction priced */
  antistrophePairs: number;
}

/**
 * Human-readable form of a character, for notes and receipts.
 *
 * A SPACE renders as ␠, not as an underscore. An earlier revision rendered it
 * as `_`, and that silently mislabelled every receipt in this repository: the
 * pair reported as `_<->/` was in fact space<->slash. The underscore form is
 * also the thing that made the cheapest clause look safe when it was not.
 */
export function antistropheShow(c: string): string {
  if (c === ' ') return '␠';
  if (c === '\t') return '\\t';
  if (c === '\n') return '\\n';
  return c;
}

/**
 * Encode. Auction the pair pool on the real token count, carry the winner
 * through the stack, price the clause against the exact contract, and ship
 * only when the measured full message is strictly smaller than the parent's.
 */
export function antistropheEncode(
  text: string,
  enc: EncodingName = 'o200k_base',
  opts: any = {},
): AntistropheResult {
  const parent = ouraEncode(text, enc, opts);
  const plain: AntistropheResult = {
    ...parent, antistrophe: false, antistrophePair: null, antistropheClause: '',
    antistropheGain: 0, antistrophePairs: 0,
  };
  if (opts.antistrophe === false) return plain;
  if (!text.length || text.length > 400_000) return plain;

  const pairs = (opts.antistrophePairs ?? antistrophePairsFor(text)) as AntistrophePair[];
  if (!pairs.length) return { ...plain, antistrophePairs: 0 };

  const base = countTokens(text, enc);

  // --- 1. auction: score every pair on the text it actually produces ---
  let ranked: Array<{ pair: AntistrophePair; raw: number }> = [];
  for (const [a, b] of pairs) {
    const raw = countTokens(antistropheSwap(text, a, b), enc) - base;
    if (raw < 0) ranked.push({ pair: [a, b], raw });
  }
  if (!ranked.length) return { ...plain, antistrophePairs: pairs.length };
  ranked.sort((x, y) => x.raw - y.raw);

  // Only the head of the list can repay a full encode. Two is enough: the
  // ranking is by measured raw delta, and the full-stack measurement below is
  // what actually decides.
  const TRIALS = opts.antistropheTrials ?? 2;
  for (const { pair } of ranked.slice(0, TRIALS)) {
    const [a, b] = pair;
    let swapped: string;
    try { swapped = antistropheSwap(text, a, b); } catch { continue; }

    let r: OuraResult;
    try { r = ouraEncode(swapped, enc, opts); } catch { continue; }

    const contract: string = (r as any).contract ?? '';
    let clause = '';
    let clauseTok = Infinity;
    for (const c of antistropheClausesFor(a, b)) {
      const t = antistropheClauseTokens(contract, c, enc);
      if (t < clauseTok) { clauseTok = t; clause = c; }
    }
    const total = r.messageTokens + clauseTok;
    if (total >= parent.messageTokens) continue;

    return {
      ...r,
      contract: contract.endsWith(CONTRACT_TAIL)
        ? contract.slice(0, contract.length - CONTRACT_TAIL.length) + clause + ' ' + CONTRACT_TAIL
        : contract + ' ' + clause,
      messageTokens: total,
      antistrophe: true,
      antistrophePair: pair,
      antistropheClause: clause,
      antistropheGain: parent.messageTokens - total,
      antistrophePairs: pairs.length,
    };
  }
  return { ...plain, antistrophePairs: pairs.length };
}

/** Decode: undo the exchange last, after the stack has finished. */
export function antistropheDecode(
  wire: string,
  cfg: { stats?: any; order?: 'in' | 'out'; undo: (w: string) => string },
  opts: {
    alphabet?: string; marker?: string; marker2?: string; group?: any; framing?: any;
    ouraShape?: { sep: string; suf: number[]; minLen: number; k?: number } | null;
    ouraMode?: 'mark' | 'plain' | 'lead'; ouraSentinel?: string;
    antistrophePair?: [string, string] | null;
  } = {},
): string {
  const expanded = ouraDecode(wire, cfg, opts);
  const pair = opts.antistrophePair;
  if (!pair) return expanded;
  return antistropheSwap(expanded, pair[0], pair[1]);
}

/** Encode, decode, verify byte-exactness. */
export function antistropheRoundTrip(
  text: string,
  enc: EncodingName = 'o200k_base',
  opts: any = {},
): boolean {
  const r = antistropheEncode(text, enc, opts);
  if (!r.antistrophe) return true; // parent already round-trips
  const mid = ouraDecode(r.wire, {
    stats: r.stats, order: r.order,
    undo: r.parent === 'identity' ? (w: string) => w : (opts.undo ?? ((w: string) => w)),
  }, {
    alphabet: r.alphabet, marker: r.marker, marker2: r.marker2,
    group: r.syncopeGroup, framing: r.framing,
    ouraShape: r.ouraShape, ouraMode: r.ouraMode, ouraSentinel: r.ouraSentinel,
  });
  return antistropheSwap(mid, r.antistrophePair![0], r.antistrophePair![1]) === text;
}
