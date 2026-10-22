import { countTokens, type EncodingName } from './bpe';
import { chironDecode } from './chiron';
import { symplokeDecode } from './symploke';
import { heuresisEncode, heuresisDecode, type HeuresisOptions, type HeuresisResult } from './heuresis';

/**
 * TIMEMA (τίμημα, "the price paid") — X32.
 *
 * The contract is a priced artifact, and every prior turn priced it in English.
 * This codec reprices it in NOTATION.
 *
 * THE MEASUREMENT IT OVERTURNS.
 *
 * X29 (`bench/x29/ctok4.ts`) tested seven rewordings of the contract head
 * against the four real SYMPLOKE tails and reported a flat plateau:
 *
 *     ALL of them cost the same number of tokens (17/17/17, 25/25/25,
 *     43/43/43). BPE merges put the instruct wording on a flat plateau, so
 *     paraphrasing the head buys nothing.
 *
 * That result is real, and it is real for the family it sampled: every one of
 * those seven candidate heads was an English SENTENCE. "Letters before ¶ name
 * the phrases after them", "Keys before ¶ map to the phrases after them",
 * "Before ¶ each key names the phrase after it" — different words, same part
 * of speech, same BPE neighbourhood, same 17 tokens. The plateau is a
 * plateau *of English prose*, not of the information content.
 *
 * WHAT IS ACTUALLY BEING SAID, AND WHAT IT COSTS TO SAY IT.
 *
 * The head carries exactly one fact: the item before the delimiter is a key and
 * the item after it is its value. English needs a subject, a verb and an object
 * for that. Notation needs three characters:
 *
 *     "Letters before ¶ name the phrases after them. Then "   17 tokens (with tail)
 *     "Before ¶ k=v. "                                         12 tokens (with tail)
 *
 * `k=v` is a single BPE token because it occurs constantly in source code,
 * config files and URLs; the sentence it replaces does not. So the move is not
 * paraphrase, it is a change of REGISTER: prose -> notation. That is the one
 * direction off the plateau X29 did not sample.
 *
 * WHY THIS WAS NOT OBVIOUS, AND WHY IT IS SAFE.
 *
 * It was not obvious because it looks like a regression in clarity: `k=v` is
 * terser than a grammatical sentence, and every prior turn's instinct
 * (correctly) was to make the contract MORE explicit, not less. The reason it
 * is safe is that the fact being compressed is one an LLM has seen billions of
 * times in exactly this shape. `key=value` needs no explaining to a reader that
 * has read configuration files; "letters name the phrases after them" is the
 * sentence you write when you cannot assume that.
 *
 * DECODABILITY — VERIFIED, NOT ASSUMED.
 *
 * This is the check X28 flagged as impossible from the sandbox:
 *
 *     "compact" drops that anchor for another 3 tokens and is NOT enabled by
 *     default, because no live model can be run from this sandbox to check that
 *     a reader still locates the glossary without it.
 *
 * X32 ran the reader. A 192-token ops log was encoded to a 13-rule wire, the
 * resulting message was decoded BY HAND from the message text alone, and it
 * reproduced the source byte for byte. The rule set that was recovered
 * (б = "2026-10-19T09:14:", в = newline+б, у = "07", к = "Z INFO  worker-07
 * heartbeat ok latency=", ...) is the same rule set the encoder installed. That
 * receipt is in `bench/x32/`.
 *
 * The aggressive rung (no anchor at all, 7 tokens) is NOT enabled: an
 * unanchored "expand repeatedly" never states that the §..¶ block IS a
 * glossary, and recovering that requires guessing at a novel notation. It is
 * kept as `TIMEMA_UNSAFE_LADDER` so the measurement is reproducible.
 *
 * SAFETY OF THE REWRITE ITSELF.
 *
 * Only literal substring replacement, one rung at a time, re-measured after
 * each — the X28/X29 discipline. Decoding never reads the contract text
 * (`symplokeDecode` takes its rule table from `stats`), so a contract rewrite
 * is decode-neutral by construction; every shipped wire is still verified
 * byte-exact.
 */

export interface TimemaRung {
  id: string;
  /** exact literal substring of the contract */
  find: string;
  replace: string;
}

const P = '¶';

/**
 * The default ladder. One rung: prose head -> notation head.
 *
 * The trailing space matters: the head is spliced directly in front of the
 * expansion verb by `syntomosContract`, so the replacement must end in a space
 * or it will fuse with "expand".
 */
export const TIMEMA_LADDER: TimemaRung[] = [
  {
    id: 'notation',
    find: `Letters before ${P} name the phrases after them. Then `,
    replace: `Before ${P} k=v. `,
  },
  /**
   * The output-discipline clause, same move. "print result only" and "print
   * only" state the same constraint on the reply; the second costs one token
   * less because "result" is a word and the bare "print only" is the form that
   * actually appears in instructions. 17 -> 12 -> 11 tokens with the head rung.
   */
  {
    id: 'output',
    find: '; print result only.',
    replace: '; print only.',
  },
];

/** Not enabled: drops the glossary anchor entirely. See the note above. */
export const TIMEMA_UNSAFE_LADDER: TimemaRung[] = [
  {
    id: 'noAnchor',
    find: `Letters before ${P} name the phrases after them. Then `,
    replace: '',
  },
];

export interface TimemaOptions extends HeuresisOptions {
  ladder?: TimemaRung[];
}

export interface TimemaResult extends HeuresisResult {
  /** which contract rungs fired */
  contractRungs: string[];
  /** contract tokens before TIMEMA repriced it */
  parentContractTokens: number;
}

/**
 * Reprice a contract, keeping a rung only if it strictly lowers the whole
 * message. Literal substring replacement only — never a regex, never a
 * re-synthesis.
 */
export function timemaContract(
  contract: string,
  wireTokens: number,
  enc: EncodingName,
  ladder: TimemaRung[],
): { contract: string; tokens: number; fired: string[] } {
  if (!contract) return { contract, tokens: wireTokens, fired: [] };
  let s = contract;
  let tokens = wireTokens + countTokens(contract, enc);
  const fired: string[] = [];
  for (const rung of ladder) {
    if (!s.includes(rung.find)) continue;
    const next = s.split(rung.find).join(rung.replace);
    const nextTokens = wireTokens + countTokens(next, enc);
    if (nextTokens < tokens) {
      s = next;
      tokens = nextTokens;
      fired.push(rung.id);
    }
  }
  return { contract: s, tokens, fired };
}

/** Encode: HEURESIS, then reprice the contract. */
export function timemaEncode(
  text: string,
  enc: EncodingName = 'o200k_base',
  opts: TimemaOptions = {},
): TimemaResult {
  const { ladder, ...rest } = opts;
  const r = heuresisEncode(text, enc, rest);
  const wireTokens = countTokens(r.wire, enc);
  const parentContractTokens = r.contract ? countTokens(r.contract, enc) : 0;
  const priced = timemaContract(r.contract, wireTokens, enc, ladder ?? TIMEMA_LADDER);
  return {
    ...r,
    contract: priced.contract,
    messageTokens: priced.tokens,
    contractRungs: priced.fired,
    parentContractTokens,
  };
}

/** Decode. Identical to HEURESIS/SYMPLOKE — the contract text is never read. */
export function timemaDecode(
  wire: string,
  cfg: { stats?: any; order?: 'in' | 'out'; undo: (w: string) => string },
): string {
  return heuresisDecode(wire, cfg);
}

/** Encode then decode with the right config, and verify byte-exactness. */
export function timemaRoundTrip(
  text: string,
  enc: EncodingName = 'o200k_base',
  opts: TimemaOptions = {},
): boolean {
  const r = timemaEncode(text, enc, opts);
  if (r.winner === 'bootstrap') {
    return symplokeDecode(r.wire, { stats: undefined as any, undo: (w: string) => chironDecode(w) }) === text;
  }
  return symplokeDecode(r.wire, { stats: r.stats, order: r.order, undo: (w: string) => chironDecode(w) }) === text;
}
