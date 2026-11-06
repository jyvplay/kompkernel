/**
 * src/lib/omega/pinax.ts — X76. ΠΊΝΑΞ (pinax), "tablet, table, index".
 * =============================================================================
 *
 * TARGET: THE COMPOSED LEGEND
 * ---------------------------
 * Some frontier parents emit not a sentence but a LEGEND: a single line carrying the
 * whole operator table for the wire, written as English prose with `;` separators. The
 * measured instance is METRON's, on `psql-output.txt`, at **73 tokens of a 244-token
 * message (30 %)**:
 *
 *   "Before ¶ k=v. expand repeatedly Header line = n, sep, col=model; named columns are
 *    dropped from lines and rebuilt; a full n-field line is literal and resets. Drop it.
 *    above=line above, colM=column M of the same line, days/workdays=next date/weekday,
 *    +b=number above+b same width print only."
 *
 * BRACHYLOGIA (X75) contracts a RULES CLAUSE. It cannot touch this line: its substitution
 * table has no entry whose left-hand side matches, by design — a table that fired on
 * unknown prose would be unsafe. PINAX is the codec for this class.
 *
 * THE MECHANISM IS DIFFERENT FROM BRACHYLOGIA'S
 * ---------------------------------------------
 * BRACHYLOGIA shortens a SENTENCE: same sentence, fewer grammatical words. PINAX
 * restructures a TABLE: the legend is already a sequence of `name = definition` pairs; it
 * is only *spelled* as prose. PINAX writes it as what it is — one clause per operator,
 * separated by `;`, with the connectives ("are", "from lines", "and", "of the same line")
 * removed. The operators are untouched; only the connective tissue between them goes.
 *
 *   BRACHYLOGIA:  sentence  ->  terser sentence      (grammar removed)
 *   PINAX:        prose table -> table                 (connectives removed, structure kept)
 *
 * GREEDY? NO.
 * -----------
 * Fixed, ordered, idempotent substitution table — a total function, not a search. No
 * hill-climb over wordings, no portfolio, no clock. The only decision is admit-or-not,
 * made by measurement.
 *
 * VERIFICATION (same discipline as BRACHYLOGIA, and for the same reason)
 * ----------------------------------------------------------------------
 * The contract is decoded by COMPREHENSION, not by code, so no program can prove the
 * reader still understands it. What can be executed is everything else:
 *
 *   GATE 1  INVERTIBILITY — undoing the edit reproduces the frontier message byte-for-byte.
 *   GATE 2  WIRE IMMUNITY — no edited line carries the tape marker §.
 *   GATE 3  DATA GUARD — never edit a line that occurs verbatim in the source.
 *   GATE 4  OPERATOR COVERAGE — every operator named in the original legend must still be
 *           named in the replacement (¶, k=v, expand, repeatedly, n, sep, col, above,
 *           colM, days, workdays, +b, print, only). This is the mechanical proxy for
 *           "it still says the same thing"; it is necessary and not sufficient.
 *   GATE 5  STRICT WIN — the complete message must be strictly smaller.
 *
 * Gates 1-5 are executed on every encode. They are provably NOT sufficient: all five pass
 * on a sentence no reader understands. The residual risk is carried by the same cold-read
 * discipline BRACHYLOGIA established, and is stated rather than assumed.
 *
 * WHAT IS NOT CLAIMED
 * -------------------
 * A small codec. It contracts one legend class on the lanes where that legend appears.
 * It does not touch the data, and it does nothing on a message with no composed legend.
 */

import { countTokens, type EncodingName } from './bpe';
import { tagstackFrontier, type TagstackResult } from './tagstack';
import { CHIRON_START } from './chiron';

export interface PinaxEdit { line: number; before: string; after: string; beforeTokens: number; afterTokens: number; }

export interface PinaxResult {
  codec: 'pinax';
  message: string;
  decoded: string;
  exact: boolean;
  applied: boolean;
  contractBefore: number;
  contractAfter: number;
  edits: PinaxEdit[];
  frontierTokens: number;
  messageTokens: number;
  frontierParent: string;
  notes: string;
}

export interface PinaxRule { re: RegExp; rep: string; requires: string[]; }

/**
 * THE SUBSTITUTION TABLE. Every entry maps one shipped legend wording to a form that
 * names the same operators with fewer connectives. `requires` is the operator set that
 * GATE 4 checks on the replacement.
 */
export const PINAX_RULES: readonly PinaxRule[] = [
  { // METRON's composed legend, 73 -> 65 tokens (measured, bench/x76/t11.ts)
    re: /Before ¶ k=v\. expand repeatedly Header line = n, sep, col=model; named columns are dropped from lines and rebuilt; a full n-field line is literal and resets\. Drop it\. above=line above, colM=column M of the same line, days\/workdays=next date\/weekday, \+b=number above\+b same width print only\./g,
    rep: 'Before ¶ k=v, expand repeatedly. Header n,sep,col=model. Named cols: drop, rebuild. Full n-field line: literal, resets, drop. above=line above. colM=col M same line. days/workdays=next date/weekday. +b=above+b same width. print only.',
    requires: ['¶', 'k=v', 'expand', 'repeatedly', 'n', 'sep', 'col=model', 'drop', 'rebuild', 'literal', 'resets', 'above', 'colM', 'days', 'workdays', '+b', 'same width', 'print', 'only'] },
  { // A looser form of the same legend, in case the wire order differs.
    re: /Before ¶ k=v\. expand repeatedly Header line = n, sep, col=model; named columns are dropped from lines and rebuilt; a full n-field line is literal and resets\. Drop it\. above=line above, colM=column M of the same line; ([\s\S]*?) print only\./g,
    rep: 'Before ¶ k=v, expand repeatedly. Header n,sep,col=model. Named cols: drop, rebuild. Full n-field line: literal, resets, drop. above=line above. colM=col M same line. $1 print only.',
    requires: ['¶', 'k=v', 'expand', 'repeatedly', 'col=model', 'above', 'colM', 'print', 'only'] },
];

/** Candidate legend line: long, ends in a full stop, no digits, no tape marker. */
export function pinaxIsLegend(line: string): boolean {
  const t = line.trim();
  if (t.length <= 40) return false;
  if (!/\.$/.test(t)) return false;
  if (/\d/.test(t)) return false;
  if (t.includes(CHIRON_START)) return false;
  // a legend names operators: it contains at least two `=` or `:` definitions
  const defs = (t.match(/[=:]/g) ?? []).length;
  return defs >= 2 && /[a-z]/.test(t);
}

export function pinaxCovers(rep: string, requires: string[]): boolean {
  return requires.every((k) => rep.includes(k));
}

export function pinaxRewrite(message: string, enc: EncodingName, source = ''): { message: string; edits: PinaxEdit[]; before: number; after: number } {
  const srcLines = source === '' ? null : new Set(source.split('\n'));
  const edits: PinaxEdit[] = [];
  let before = 0;
  let after = 0;
  const out = message.split('\n').map((line, i) => {
    if (!pinaxIsLegend(line)) return line;
    if (srcLines && srcLines.has(line)) return line;            // GATE 3
    if (line.includes(CHIRON_START)) return line;               // GATE 2
    const b = countTokens(line, enc);
    let next = line;
    for (const rule of PINAX_RULES) {
      const cand = next.replace(rule.re, rule.rep);
      if (cand === next) continue;
      if (!pinaxCovers(rule.rep, rule.requires)) continue;      // GATE 4
      next = cand;
      break;
    }
    if (next === line) return line;
    const a = countTokens(next, enc);
    if (a >= b) return line;                                     // never keep a loss
    edits.push({ line: i, before: line, after: next, beforeTokens: b, afterTokens: a });
    before += b;
    after += a;
    return next;
  });
  return { message: out.join('\n'), edits, before, after };
}

/** GATE 1 — undo every edit; the frontier message must come back byte-for-byte. */
export function pinaxInvert(contracted: string, edits: PinaxEdit[]): string {
  const lines = contracted.split('\n');
  for (const e of edits) if (lines[e.line] === e.after) lines[e.line] = e.before;
  return lines.join('\n');
}

export function pinaxEncode(
  text: string,
  enc: EncodingName = 'o200k_base',
  frontierFn: (t: string, e: EncodingName) => TagstackResult = tagstackFrontier,
): PinaxResult {
  const frontier: TagstackResult = frontierFn(text, enc);
  const refuse = (notes: string): PinaxResult => ({
    codec: 'pinax', message: frontier.message, decoded: frontier.decoded,
    exact: frontier.decoded === text, applied: false,
    contractBefore: 0, contractAfter: 0, edits: [],
    frontierTokens: frontier.messageTokens, messageTokens: frontier.messageTokens,
    frontierParent: frontier.parentCodec, notes,
  });

  if (frontier.decoded !== text) return refuse('pinax: parent is not exact');

  const rw = pinaxRewrite(frontier.message, enc, text);
  if (rw.edits.length === 0) return refuse('pinax: no legend contracts');

  if (pinaxInvert(rw.message, rw.edits) !== frontier.message) return refuse('pinax: edits are not invertible');
  if (rw.edits.some((e) => e.before.includes(CHIRON_START))) return refuse('pinax: an edit touched a tape line');

  const tokens = countTokens(rw.message, enc);
  if (tokens >= frontier.messageTokens) return refuse(`pinax loses: ${tokens} vs ${frontier.messageTokens}`);

  return {
    codec: 'pinax', message: rw.message, decoded: text, exact: true, applied: true,
    contractBefore: rw.before, contractAfter: rw.after, edits: rw.edits,
    frontierTokens: frontier.messageTokens, messageTokens: tokens,
    frontierParent: frontier.parentCodec,
    notes: `legend ${rw.before}->${rw.after} tok, message ${frontier.messageTokens}->${tokens} (${tokens - frontier.messageTokens})`,
  };
}
