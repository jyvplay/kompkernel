/**
 * src/lib/omega/brachylogia.ts — X75. ΒΡΑΧΥΛΟΓΊΑ (brachylogia), "brevity of speech".
 * =============================================================================
 *
 * THE MEASUREMENT THIS CODEC IS BUILT ON (bench/x75/t12.ts, t14.ts, t15.ts)
 * -------------------------------------------------------------------------
 * Ask the shipped frontier where its tokens are, on its own lanes. On the lanes where
 * the CHIRON glyph tape fires, the decoder instruction the message carries is the LONG
 * form and it dominates:
 *
 *     df -h             171-token message, 62 tokens of instruction  (36 %)
 *     metrics.tsv       210-token message, 62 tokens of instruction  (30 %)
 *     kubectl get pods  326-token message, 62 tokens of instruction  (19 %)
 *
 * Of that 62, the rules clause alone is 39 tokens:
 *
 *     "Every new Cyrillic letter before ¶ starts a rule whose text runs to the next
 *      new letter or to ¶. In the text after ¶ expand every rule, repeatedly, and
 *      print only the result."
 *
 * SYNTOMIA wrote a shorter phrasing of the same rule; measured here it is 24 tokens and
 * it still does not reach these lanes, because the composed path these lanes take does
 * not route its contract through SYNTOMIA's rewrite. That is a gap between two shipped
 * codecs, not a missing idea.
 *
 * A CORRECTED SCOPE, AND THE NUMBER THAT OVERTURNED THE FIRST DRAFT
 * -----------------------------------------------------------------
 * The first draft of this file claimed "14 % of the gate is the decoder's own prose",
 * from an audit that selected any line longer than 40 characters ending in a full stop.
 * That selector cannot tell an INSTRUCTION from English DATA, so it counted
 * kb-article (388), llm-answer (158) and code-ts (147) as instruction when they are the
 * documents being compressed. The audit was rerun over all 29 lanes with the tape and
 * its contract identified structurally (bench/x75/t12.ts, receipts/contract-audit.json):
 *
 *     long CHIRON rules clause    3 / 29 lanes   (df-h, metrics.tsv, kubectl)
 *     metron legend, 73 tokens    2 / 29 lanes   (psql-output, cue-sheet)
 *     short ~11-token contract   22 / 29 lanes   (the synkrisis majority)
 *     no instruction detected     2 / 29 lanes
 *
 * So the instruction is NOT the general lever the first draft assumed: on 22 of 29
 * lanes the parent already pays ~11 tokens and there is nothing to win. This codec is
 * therefore a LANE-TARGETED gain of -18 tokens on 3 of 29 lanes (-54 on the 12 639-token
 * gate, 0.4 %), and it is stated that way rather than as a general one. The honest
 * reading: it removes 10.5 % of df-h's message, 8.6 % of metrics.tsv's and 5.5 % of
 * kubectl's, and does nothing anywhere else. The remaining 86 % of the gate is DATA on
 * every lane, and no amount of contract editing touches it.
 *
 * THE MECHANIC: THE INSTRUCTION IS A NAMED PART OF THE MESSAGE
 * ------------------------------------------------------------
 * Every codec here treats the decoder instruction as a CONSTANT: authored once, quoted
 * verbatim, paid in full. Even the ones that optimise it (BRACHYS searches a contract
 * algebra, AUSTEROS searches English phrasings, SYNTOMIA restates it minimally) optimise
 * it as a string in isolation, and none asks what this codec asks:
 *
 *     does the instruction have to arrive as PROSE, or can it arrive as a NOTATION
 *     for prose?
 *
 * BRACHYLOGIA rewrites the instruction in a notation that means what it says — every
 * load-bearing element kept, English grammar dropped:
 *
 *     39 tok  Every new Cyrillic letter before ¶ starts a rule whose text runs to the
 *             next new letter or to ¶. In the text after ¶ expand every rule,
 *             repeatedly, and print only the result.
 *     25 tok  Before ¶ a new Cyrillic letter names text to the next new letter or ¶.
 *             After ¶ expand repeatedly; print only.
 *
 * Kept: which characters name a rule (a NEW Cyrillic letter), where the tape ends (¶),
 * how far a name's text runs (to the next new letter or ¶), where expansion applies
 * (after ¶), that it recurses (repeatedly), what to emit (print only). Dropped:
 * "starts a rule whose text runs to the", "In the text", "every rule", "and print only
 * the result".
 *
 * GREEDY? NO — AND THE REASON IS THE INTERESTING PART
 * ---------------------------------------------------
 * The rewrite is a FIXED, ORDERED, IDEMPOTENT SUBSTITUTION TABLE: a total function on
 * the contract text, not a search and not coordinate descent. The only decision is
 * admit-or-not, and it is made by measurement, not by hill-climbing over wordings.
 *
 * The reason a search is not used here is that a search over English needs an objective,
 * and there is no program in this repository that can score "an LLM still reads this the
 * same way". This is the load-bearing honesty of the codec:
 *
 *     THE DECODER FOR THE CONTRACT IS A LANGUAGE MODEL, NOT A PROCEDURE.
 *
 * The wire is decoded by code (`akolouthia2Decode`, `chironDecode`, …) and that code CAN
 * be executed to check the wire. The contract is decoded by the reader's comprehension,
 * and there is no executable proxy for comprehension. So this codec does NOT pretend to
 * verify comprehension with a program. It verifies exactly three things mechanically —
 * the wire is untouched, the edit is invertible, and the message is strictly smaller —
 * and it pushes the one thing that cannot be checked mechanically to an EMPIRICAL test
 * that is actually performed (see VERIFICATION below).
 *
 * VERIFICATION (what is checked, and by what)
 * -------------------------------------------
 *   GATE 1  INVERTIBILITY. Undoing every edit on the contracted message reproduces the
 *           frontier's message byte-for-byte. This is executed, every time.
 *   GATE 2  WIRE IMMUNITY. No edited line contains the tape marker §. Executed.
 *   GATE 3  DATA GUARD. A line is only edited if it does not occur verbatim in the
 *           source document — an instruction is text the DECODER emits, data is text the
 *           SOURCE contains. Executed.
 *   GATE 4  ELEMENT COVERAGE. Each rule carries the keyword set its replacement must
 *           contain (¶, Cyrillic, expand, repeatedly, print, only, new, letter, next).
 *           Executed. This is the mechanical proxy for "it still says the same thing".
 *   GATE 5  STRICT WIN. The complete contracted message must be strictly smaller.
 *           Executed.
 *   GATE 6  COLD READ. A held-out document the operator has not seen this turn is
 *           contracted, and the message is decoded from the message ALONE, with no
 *           system prompt, no skills file, and no access to the source. This is the only
 *           gate that can fail the way this codec can actually fail, so it is the one
 *           that decides admission. bench/x75/REPORT.md records it.
 *
 * Gates 1-5 are necessary and provably not sufficient. Gate 6 is the admission test.
 *
 * PRIOR ART, STATED NOT IMPLIED
 * -----------------------------
 * The idea that an instruction should be compressed like data belongs to others and is
 * recent: CompactPrompt (arXiv:2510.18043) compresses prompt text with n-gram
 * dictionaries, ProCut (EMNLP 2025 industry) prunes prompt segments by attribution, and
 * the efficient-prompting survey (arXiv:2404.01077) catalogues the family. All compress
 * MEANING and are therefore lossy; LLMLingua-style token pruning is lossy for the same
 * reason. This codec's subject is narrower than any of them — the decoder instruction of
 * a self-describing message — and it is lossless BY CONSTRUCTION: the wire is untouched,
 * so the bytes are untouched. In this repository the ancestors are BRACHYS (X70),
 * AUSTEROS (X71) and SYNTOMIA: they optimise a contract they author; BRACHYLOGIA
 * optimises the contract the parent already emitted, at the parent's own report level,
 * without touching the parent's wire.
 *
 * WHAT IS NOT CLAIMED
 * -------------------
 * Nothing for a message whose instruction is already minimal (the 22-lane synkrisis
 * majority) and nothing for a message with no instruction at all. It does not touch the
 * data, which is ~86 % of every lane. Its measured scope is 3 of 29 lanes.
 */

import { countTokens, type EncodingName } from './bpe';
import { tagstackFrontier, type TagstackResult } from './tagstack';
import { CHIRON_START } from './chiron';

export interface BrachylogiaEdit { line: number; before: string; after: string; beforeTokens: number; afterTokens: number; }

export interface BrachylogiaResult {
  codec: 'brachylogia';
  message: string;
  decoded: string;
  exact: boolean;
  applied: boolean;
  contractBefore: number;
  contractAfter: number;
  clausesRewritten: number;
  edits: BrachylogiaEdit[];
  frontierTokens: number;
  messageTokens: number;
  frontierParent: string;
  notes: string;
}

export interface BrachylogiaRule {
  /** matched in the contract text */
  re: RegExp;
  /** its contraction */
  rep: string;
  /**
   * ELEMENT COVERAGE. The tokens the replacement MUST contain. This is the mechanical
   * proxy for "the sentence still says the same thing": it cannot show comprehension,
   * but it can and does reject a rewrite that quietly drops the recursion, the tape
   * terminator, or the alphabet restriction.
   */
  requires: string[];
}

/**
 * THE SUBSTITUTION TABLE. Fixed, ordered (longest form first), idempotent, and printed
 * so that every sentence this codec can emit is visible here without running it.
 */
export const BRACHYLOGIA_RULES: readonly BrachylogiaRule[] = [
  { // 39 -> 25 tokens, measured in bench/x75/t15.ts
    re: /Every new Cyrillic letter before ¶ starts a rule whose text runs to the next new letter or to ¶\. In the text after ¶ expand every rule, repeatedly, and print only the result\./g,
    rep: 'Before ¶ a new Cyrillic letter names text to the next new letter or ¶. After ¶ expand repeatedly; print only.',
    requires: ['¶', 'Cyrillic', 'new', 'letter', 'next', 'expand', 'repeatedly', 'print', 'only'] },
  { re: /Every new Cyrillic letter before ¶ starts a rule whose text runs to the next new letter or to ¶\. In the text after ¶ expand every rule, and print only the result\./g,
    rep: 'Before ¶ a new Cyrillic letter names text to the next new letter or ¶. After ¶ expand; print only.',
    requires: ['¶', 'Cyrillic', 'new', 'letter', 'next', 'expand', 'print', 'only'] },
  { // SYNTOMIA's minimal form -> the same canonical 25-token target
    re: /Before ¶ a new foreign letter labels text up to the next new letter\. After ¶ expand all repeatedly; print result only\./g,
    rep: 'Before ¶ a new Cyrillic letter names text to the next new letter or ¶. After ¶ expand repeatedly; print only.',
    requires: ['¶', 'Cyrillic', 'new', 'letter', 'next', 'expand', 'repeatedly', 'print', 'only'] },
  { re: /Before ¶ a new foreign letter labels text up to the next new letter\. After ¶ expand all; print result only\./g,
    rep: 'Before ¶ a new Cyrillic letter names text to the next new letter or ¶. After ¶ expand; print only.',
    requires: ['¶', 'Cyrillic', 'new', 'letter', 'next', 'expand', 'print', 'only'] },
  { // X108 CORRECTION — this comment claimed "23 -> 17".  The replacement string
    // below, measured with the real o200k_base tokenizer, is 19 tokens, not 17
    // (bench/x108/t2.mjs).  The rule is kept and the claim is corrected rather than
    // repeated.  "at the same position" KEPT: ⁺ is a column marker and dropping the
    // column reference would be ambiguous in a table with several numeric columns.
    // ΤΑΧΥΓΡΑΦΊΑ (X108) reaches 16 on the same sentence by also dropping the articles.
    re: /^⁺ = the number at the same position in the line above, plus the change from the line two above\.$/gm,
    rep: '⁺ = the number at the same position above, plus its change from two lines above.',
    requires: ['⁺', '=', 'same', 'position', 'above', 'change', 'two'] },
  // fragments last, so the long forms above win when both apply
  { re: /print only the result\./g, rep: 'print only.', requires: ['print', 'only'] },
  { re: /print the result only\./g, rep: 'print only.', requires: ['print', 'only'] },
];

/** Is this line candidate instruction prose? (Tape lines are excluded by §.) */
export function brachylogiaIsInstruction(line: string): boolean {
  const t = line.trim();
  if (t.length <= 24) return false;
  if (!/\.$/.test(t)) return false;
  if (/\d/.test(t)) return false;
  // A contract line may legitimately MENTION ¶ (the rules clause says where the tape
  // ends), so ¶ is not the discriminator — the tape marker § is.
  if (t.includes(CHIRON_START)) return false;
  return /[a-z]/.test(t);
}

/** GATE 4 — does the replacement still carry every element the rule requires? */
export function brachylogiaCovers(rep: string, requires: string[]): boolean {
  return requires.every((k) => rep.includes(k));
}

/**
 * Contract the instruction lines of a message and nothing else. Purely mechanical;
 * every admission decision is made by the gates in `brachylogiaEncode`.
 */
export function brachylogiaRewrite(
  message: string,
  enc: EncodingName,
  source = '',
): { message: string; edits: BrachylogiaEdit[]; before: number; after: number } {
  const srcLines = source === '' ? null : new Set(source.split('\n'));
  const edits: BrachylogiaEdit[] = [];
  let before = 0;
  let after = 0;
  const out = message.split('\n').map((line, i) => {
    if (!brachylogiaIsInstruction(line)) return line;
    if (srcLines && srcLines.has(line)) return line;           // GATE 3 — data guard
    if (line.includes(CHIRON_START)) return line;              // GATE 2 — wire immunity
    const b = countTokens(line, enc);
    let next = line;
    for (const rule of BRACHYLOGIA_RULES) {
      const candidate = next.replace(rule.re, rule.rep);
      if (candidate === next) continue;
      if (!brachylogiaCovers(rule.rep, rule.requires)) continue; // GATE 4
      next = candidate;
    }
    if (next === line) return line;
    const a = countTokens(next, enc);
    if (a >= b) return line;                                    // never keep a loss
    edits.push({ line: i, before: line, after: next, beforeTokens: b, afterTokens: a });
    before += b;
    after += a;
    return next;
  });
  return { message: out.join('\n'), edits, before, after };
}

/** GATE 1 — undo every edit; the frontier's message must come back byte-for-byte. */
export function brachylogiaInvert(contracted: string, edits: BrachylogiaEdit[]): string {
  const lines = contracted.split('\n');
  for (const e of edits) if (lines[e.line] === e.after) lines[e.line] = e.before;
  return lines.join('\n');
}

/**
 * `frontierFn` is injectable so the gate can measure BRACHYLOGIA on whatever the
 * shipped stack actually is (the X74 chain, `tagstackEncode`) rather than on the bare
 * frontier it was developed against. Defaulting to `tagstackFrontier` keeps the module
 * usable standalone; every gate below is run against the injected frontier.
 */
export function brachylogiaEncode(
  text: string,
  enc: EncodingName = 'o200k_base',
  frontierFn: (t: string, e: EncodingName) => TagstackResult = tagstackFrontier,
): BrachylogiaResult {
  const frontier: TagstackResult = frontierFn(text, enc);
  const refuse = (notes: string): BrachylogiaResult => ({
    codec: 'brachylogia', message: frontier.message, decoded: frontier.decoded,
    exact: frontier.decoded === text, applied: false,
    contractBefore: 0, contractAfter: 0, clausesRewritten: 0, edits: [],
    frontierTokens: frontier.messageTokens, messageTokens: frontier.messageTokens,
    frontierParent: frontier.parentCodec, notes,
  });

  if (frontier.decoded !== text) return refuse('brachylogia: parent is not exact');

  const rw = brachylogiaRewrite(frontier.message, enc, text);
  if (rw.edits.length === 0) return refuse('brachylogia: no instruction clause contracts');

  // GATE 1 — invertibility, executed.
  if (brachylogiaInvert(rw.message, rw.edits) !== frontier.message) {
    return refuse('brachylogia: edits are not invertible to the frontier message');
  }
  // GATE 2 — no edited line carried the tape.
  if (rw.edits.some((e) => e.before.includes(CHIRON_START))) {
    return refuse('brachylogia: an edit touched a tape line');
  }
  // GATE 5 — the complete message must be strictly smaller.
  const tokens = countTokens(rw.message, enc);
  if (tokens >= frontier.messageTokens) return refuse(`brachylogia loses: ${tokens} vs ${frontier.messageTokens}`);

  return {
    codec: 'brachylogia', message: rw.message, decoded: text, exact: true, applied: true,
    contractBefore: rw.before, contractAfter: rw.after, clausesRewritten: rw.edits.length,
    edits: rw.edits, frontierTokens: frontier.messageTokens, messageTokens: tokens,
    frontierParent: frontier.parentCodec,
    notes: `${rw.edits.length} clause(s), instruction ${rw.before}->${rw.after} tok, message ${frontier.messageTokens}->${tokens} (${tokens - frontier.messageTokens})`,
  };
}
