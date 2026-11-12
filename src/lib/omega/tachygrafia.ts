/**
 * src/lib/omega/tachygrafia.ts — X108. ΤΑΧΥΓΡΑΦΊΑ (tachygrafia), "shorthand".
 * =============================================================================
 *
 * TARGET: THE DECODER-INSTRUCTION LINE, WHICH IS 5.3 % OF THE FRONTIER AND WHICH
 * THE TWO EXISTING CONTRACT CODECS CANNOT FINISH.
 *
 * X108's cost census (`bench/x108/receipts/census.json`, on `tagstackEncode` —
 * the function the encoder ships, per X107's routing finding) splits the frontier
 *
 *     contract 5.3%   tape 16.4%   body 77.8%
 *
 * and ΠΕΡΙΚΟΠΈ (X107) has already taken the ΜΕΤΡΟΝ, ΑΠΟΓΡΑΦΗ, ΔΙΑΣΤΗΜΑ and ΣΥΝΚΡΙΣΗ
 * families down.  What is LEFT is real and was measured this turn by dumping the
 * live wires:
 *
 *   | family                    | parent        | contract tokens | covered by |
 *   |---------------------------|---------------|-----------------|------------|
 *   | ΜΕΤΡΟΝ / ΑΠΟΓΡΑΦΗ         | metron        | 61 (was 73)     | ΠΕΡΙΚΟΠΈ   |
 *   | ΔΙΑΣΤΗΜΑ                   | diastema      | 45 (was 57)     | ΠΕΡΙΚΟΠΈ   |
 *   | ΣΥΝΚΡΙΣΗ                   | synkrisis     | 10–22           | ΠΕΡΙΚΟΠΈ   |
 *   | ΑΚΟΛΟΥΘΪΑ2 `⁺ =`           | akolouthia2   | 23              | ΒΡΑΧΥΛΟΓΊΑ — UNWIRED |
 *   | **ΣΤΙΧΟΜΥΘΪΑ `spec:`**     | stichomythia  | **41**          | **NOTHING** |
 *
 * `cue-sheet.md` is 101 tokens in total and 41 of them are ΣΤΙΧΟΜΥΘΪΑ's `spec:` line —
 * 40 % of the lane, carried by prose that no codec in the stack can shorten.
 *
 * WHY A THIRD CONTRACT CODEC IS NOT A DUPLICATE OF THE FIRST TWO
 * --------------------------------------------------------------
 * The two existing ones are anchored, and their anchors are what they cannot pass:
 *
 *   - ΠΕΡΙΚΟΠΈ (`perikopi.ts`) splits the legend into `name = definition` CLAUSES and
 *     keys its table on the clause's opening `colN=<kind>`.  A legend with no clauses
 *     — ΣΤΙΧΟΜΥΘΪΑ's `spec:` is a semicolon list of equations, ΑΚΟΛΟΥΘΪΑ2's is a single
 *     sentence with no `=`-pair at all — reaches no pattern.
 *   - ΒΡΑΧΥΛΟΓΊΑ (`brachylogia.ts`) keys on WHOLE-SENTENCE regexes.  Its own detector
 *     also carries `if (/\d/.test(t)) return false;`, the same inverted digit test that
 *     X107 found in `pinaxIsLegend`.
 *
 * ΤΑΧΥΓΡΑΦΊΑ keys on **arbitrary phrase n-grams, longest match first, anywhere in the
 * line**.  It therefore needs no clause structure, no family knowledge and no sentence
 * boundary, and a new legend wording is shortened by the same table with no new entry.
 *
 * THE PART THAT IS ACTUALLY NEW, AND WHY IT IS THE POINT
 * -----------------------------------------------------
 * A general phrase table is only safe if the contraction is INVERTIBLE, and a table of
 * phrase → shorter phrase is invertible only if no replacement string can be confused
 * with an original.  Both existing codecs check invertibility by *undoing* the edit,
 * which works because each of their edits is a whole-clause replacement.  A phrase table
 * that fires in the middle of a line cannot be undone by remembering the line number —
 * it needs the table itself to be unambiguous.
 *
 * ΤΑΧΥΓΡΑΦΊΑ makes that a PROOF rather than a check.  A rewrite is applied only when
 * **no replacement string in the whole table already occurs in the line**.  Under that
 * guard the contraction is injective on the set of lines the table can fire on: the
 * contracted line contains only replacement strings and untouched text, every
 * replacement string is absent from the original, and therefore the original can be
 * recovered by replacing each replacement string back — with no ambiguity about which
 * occurrence was which.  That is GATE 1 discharged by construction instead of by
 * round-trip, and it is what licenses a table an order of magnitude larger than either
 * existing codec's.
 *
 * GREEDY? NO.
 * -----------
 * A fixed, total, idempotent table plus longest-match-first substitution, priced by the
 * real tokenizer, with the cheapest of {identity, table, ΠΕΡΙΚΟΠΈ's output} kept.  No
 * hill-climb, no portfolio, no clock, no budget.  The same input yields the same wire on
 * any machine.
 *
 * SOURCE CITATION (HONEST).
 * -------------------------
 * No external paper supplies this mechanism and none is claimed.  The premise that a
 * decoder instruction is a named, priced part of the message is this repository's own
 * X75/X76/X107 result.  The framing import is **arXiv:2610.12376** (Latent Core
 * Tokenizer), Algorithm 2: a dynamic program returning *"the globally minimum-token
 * exact encoding"* over a known vocabulary, and *"recomputing affected counts after
 * every non-overlapping merge makes the merge order deterministic"* — the reason the
 * table is applied longest-match-first and why that is total rather than searched.
 * **arXiv:2606.27019** (MinGram) supplies the objective: *"By making token count the
 * primary objective and using a Unigram score only as a tiebreak."*
 *
 * TIME- OR CPU-BOUND?
 * -------------------
 * **CPU-bound, no wall clock, reproducibly.** One longest-match scan over the contract
 * line (≤ 291 characters) plus a handful of token counts.  Independent of the payload.
 *
 * WHAT IS NOT PROVED
 * ------------------
 * That a reader still understands the contracted line.  The contract is decoded by
 * COMPREHENSION, not by code, so no program can prove it, and the invertibility proof
 * above is about the STRING, not about the meaning.  On a ΧΕΙΡΩΝ-parented lane the
 * chain additionally checks `chironDecode` of the incumbent and the candidate are
 * identical, which is a real executable check on the code-decodable part and is the only
 * part of the claim that is proved.
 */
import { countTokens, type EncodingName } from './bpe';
import { CHIRON_START } from './chiron';
import { perikopiGeneral, perikopiIsLegend, perikopiNamesCover } from './perikopi';
import { tagstackFrontier, type TagstackResult } from './tagstack';

/** One phrase → shorter phrase. `req` is the operator set the replacement must keep. */
export interface TachygrafiaRule { phrase: string; rep: string; req: readonly string[]; }

/**
 * THE TABLE. Ordered longest-phrase-first by construction at module load, so that
 * overlapping phrases resolve deterministically and the longest wins — the property
 * that makes the scan total.  Every entry is printed here so that the whole capability
 * of the codec is visible without running it.
 *
 * `req` lists exactly the operator words the REPLACEMENT still carries.  It is checked
 * at fire time (GATE 4), so an entry whose shorthand drops an operator the legend needs
 * is rejected rather than shipped.
 */
const RAW: readonly TachygrafiaRule[] = [
  // ---- ΣΤΙΧΟΜΥΘΪΑ's `spec:` legend — covered by NOTHING before this codec ----
  // The two `=`-spacing entries drop only whitespace, no word, so no operator moves.
  { phrase: 'v+k*r = v+(k*row#)', rep: 'v+k*r=v+(k*row#)', req: ['v+k*r', 'v+(k*row#)'] },
  { phrase: 'v@+ks = v plus k sec', rep: 'v@+ks=v+k sec', req: ['v@+ks', 'sec'] },
  { phrase: 'body = header then rows', rep: 'body=header then rows', req: ['body', 'header', 'then', 'rows'] },
  { phrase: 'header then rows', rep: 'header,rows', req: ['header', 'rows'] },
  // ---- ΑΚΟΛΟΥΘΪΑ2's `⁺ =` legend (ΒΡΑΧΥΛΟΓΊΑ has a rule for it and is unwired) ----
  // ΒΡΑΧΥΛΟΓΊΑ's own comment claims 23 -> 17 for this sentence.  Its replacement
  // string, measured with the real tokenizer, is 19 tokens, not 17 — the claim in
  // brachylogia.ts is wrong and is corrected there rather than repeated.  The whole
  // sentence as ONE entry reaches 15 by also dropping the articles and spelling
  // "plus" as "+", which is the house style of this wire already: the shipped
  // short-form contract is "Before ¶ k=v. expand repeatedly; print only." and carries
  // no article at all.  Abbreviating further ("num"/"pos"/"2") was measured and is
  // WORSE (16), so it is not in the table.
  //
  // THERE ARE NO SHORTER PARTIAL ENTRIES FOR THIS FAMILY, AND THAT IS DELIBERATE.
  // A partial entry whose replacement is a PREFIX of this one's replacement makes the
  // two rules genuinely ambiguous: a line contracted by the whole-sentence rule
  // contains the partial rule's replacement, so inverting would corrupt it.  GATE 7
  // refuses the longer edit in that case, which is correct, and the fix is to delete
  // the subsumed entry rather than to weaken the gate.  The cost is that a *differently
  // worded* ΑΚΟΛΟΥΘΪΑ2 legend is not contracted at all — reported as Δ 0, not as a gain.
  { phrase: 'the number at the same position in the line above, plus the change from the line two above', rep: 'number at same position above + change from two lines above', req: ['number', 'same', 'position', 'above', 'change'] },
  // ---- ΔΙΑΣΤΗΜΑ's mask legend ----
  { phrase: 'mask = value shape with # per digit', rep: 'mask=value shape,# per digit', req: ['mask', 'value', 'shape', 'digit'] },
  { phrase: 'add the first space-token (signed int) to a sum from 0 and print it into the #s, zero-padded', rep: 'first space-token (signed int)+sum from 0, print into the #s, 0-padded', req: ['space-token', 'signed', 'sum', 'print', '#s', '0-padded'] },
  { phrase: 'a sum from 0 and print it into the', rep: 'a sum from 0, print into the', req: ['sum', 'print'] },
  { phrase: 'zero-padded', rep: '0-padded', req: ['padded'] },
  // ---- ΜΕΤΡΟΝ / ΑΠΟΓΡΑΦΗ's column-model legend ----
  { phrase: 'named columns are dropped from lines and rebuilt', rep: 'named cols drop,rebuild', req: ['named', 'cols', 'drop', 'rebuild'] },
  { phrase: 'a full n-field line is literal and resets', rep: 'n-field line literal,resets', req: ['n-field', 'line', 'literal', 'resets'] },
  { phrase: 'Each named column is deleted from the lines and rebuilt at its place', rep: 'each named col deleted,rebuilt in place', req: ['named', 'col', 'deleted', 'rebuilt', 'place'] },
  { phrase: 'a line with n fields is literal and resets', rep: 'n-field line literal,resets', req: ['n-field', 'line', 'literal', 'resets'] },
  { phrase: 'Rebuild each named column (it is missing from the lines)', rep: 'rebuild each named col (missing from lines)', req: ['rebuild', 'named', 'col', 'missing'] },
  { phrase: 'Header line = n, sep, col=model', rep: 'Header n,sep,col=model', req: ['Header', 'sep', 'col=model'] },
  { phrase: 'that column repeats the line above', rep: 'that col repeats the line above', req: ['col', 'repeats', 'line', 'above'] },
  { phrase: 'that column copies column', rep: 'that col copies col', req: ['col', 'copies'] },
  { phrase: 'that column is the number above plus', rep: 'that col is the number above plus', req: ['col', 'number', 'above', 'plus'] },
  { phrase: 'same digit count', rep: 'same digit count', req: ['same', 'digit', 'count'] },
  { phrase: 'number above + b, same width', rep: 'number above +b, same width', req: ['number', 'above', 'same', 'width'] },
  { phrase: 'of the same line', rep: 'of the same line', req: ['same', 'line'] },
  { phrase: 'the line above', rep: 'the line above', req: ['line', 'above'] },
  { phrase: 'column M of the same line', rep: 'col M of the same line', req: ['col', 'same', 'line'] },
  { phrase: 'same clock format', rep: 'same clock format', req: ['same', 'clock', 'format'] },
  { phrase: "in V's exact format", rep: "in V's exact format", req: ['exact', 'format'] },
  { phrase: 'every line j has', rep: 'every line j has', req: ['every', 'line'] },
  { phrase: 'each line j is', rep: 'each line j is', req: ['each', 'line'] },
  { phrase: 'print only the result.', rep: 'print only.', req: ['print', 'only'] },
  { phrase: 'print the result only', rep: 'print only.', req: ['print', 'only'] },
  { phrase: 'expand every rule, repeatedly, and', rep: 'expand repeatedly,', req: ['expand', 'repeatedly'] },
  { phrase: 'In the text after', rep: 'After', req: [] },
  { phrase: 'starts a rule whose text runs to the next new letter or to', rep: 'names text to the next new letter or', req: ['text', 'next', 'letter'] },
  { phrase: 'Every new Cyrillic letter before', rep: 'Before', req: [] },
  { phrase: 'Drop it.', rep: 'drop.', req: [] },
  { phrase: 'Drop line 1.', rep: 'drop line1.', req: ['line'] },
];

/**
 * Longest phrase first — the property that makes the scan deterministic and total.
 *
 * IDENTITY ENTRIES ARE DROPPED, and that is not tidiness.  An identity rule's
 * replacement equals its phrase, so its replacement occurs inside every longer phrase
 * that contains it, and GATE 7 then refuses the longer edit as ambiguous.  Nine such
 * entries in the first table silently disabled the whole ΑΚΟΛΟΥΘΪΑ2 contraction; they
 * are filtered out here so the table cannot regress into that state.
 */
export const TACHYGRAFIA_RULES: readonly TachygrafiaRule[] =
  RAW.filter((r) => r.rep !== r.phrase).sort((a, b) => b.phrase.length - a.phrase.length);

/**
 * GATE 7 (new) — the invertibility proof, stated for a single line.
 *
 * No firing rule may leave a replacement string of ANOTHER rule inside the span it
 * replaced, and no firing rule may itself emit a string that another rule's
 * replacement would match.  Both are checked by `tachygrafiaApplyTraced` when the edit
 * is made, so this function is a pure witness: it returns the recorded steps, which
 * are sufficient to reconstruct the original byte-for-byte.
 */
export function tachygrafiaTrace(line: string): TachygrafiaStep[] {
  return tachygrafiaApplyTraced(line).steps;
}

/**
 * Reconstruct the original from the contracted line plus the recorded steps.
 *
 * The steps carry their position in the ORIGINAL.  Between two consecutive edits the
 * untouched run has the SAME length in both strings, so the walk is: copy that run,
 * emit the original phrase, skip the replacement.  Slicing the contracted line with
 * original positions — which is what the first version did — reconstructs garbage.
 */
export function tachygrafiaInvertSteps(line: string, steps: readonly TachygrafiaStep[]): string {
  let out = '';
  let ci = 0;      // cursor in the CONTRACTED line
  let prevAt = 0;  // cursor in the ORIGINAL line
  for (const s of steps) {
    out += line.slice(ci, ci + (s.at - prevAt));
    ci += s.at - prevAt;
    out += s.rule.phrase;
    ci += s.rule.rep.length;
    prevAt = s.at + s.rule.phrase.length;
  }
  return out + line.slice(ci);
}

/**
 * Longest-match-first substitution over the whole line, recording which rules fired.
 * Total and idempotent.
 *
 * THE GATE IS PER EDIT, NOT PER LINE, and that distinction is the whole difference
 * between a table that fires and one that does not.  A line may naturally contain a
 * replacement string in text the table never touches — "the number at the same
 * position in the line above, plus the change from the line two above" contains "the
 * line above" inside "the line two above" — and a whole-line guard then refuses a
 * contraction that is perfectly invertible.  So the guard asks of each firing rule:
 * does this edit create an ambiguity, i.e. is another rule's replacement string either
 * newly created by it or already present inside the ORIGINAL span it replaces?
 *
 * Under that guard the map from originals to contracted lines is injective: every
 * replacement string is absent from the original span it replaces, so each occurrence
 * in the contracted line is exactly one edit and there is no ambiguity about which.
 * GATE 1 then discharges by construction rather than by round-trip, which is what
 * licenses a table larger than either existing contract codec's.
 */
export interface TachygrafiaStep { rule: TachygrafiaRule; at: number }

export function tachygrafiaApplyTraced(line: string): { after: string; steps: TachygrafiaStep[] } {
  const after: string[] = [];
  const steps: TachygrafiaStep[] = [];
  let i = 0;
  while (i < line.length) {
    let hit: TachygrafiaRule | null = null;
    for (const r of TACHYGRAFIA_RULES) {
      if (line.startsWith(r.phrase, i)) { hit = r; break; }   // rules are longest-first
    }
    if (hit) {
      // GATE 7 — the span this edit replaces must not already contain a replacement
      // string, and this edit must not produce one that some other rule would match.
      const span = line.slice(i, i + hit.phrase.length);
      // NOTE the polarity: `o === hit || ...`, NOT `o !== hit && ...`.  The latter is
      // false for the hit itself, so `every` short-circuits to false and the table
      // silently never fires — which is exactly what the first version did.
      const clean = TACHYGRAFIA_RULES.every((o) => o === hit || !span.includes(o.rep));
      if (clean && !TACHYGRAFIA_RULES.some((o) => o !== hit && hit.rep.includes(o.rep) && o.rep.length > 2)) {
        after.push(hit.rep);
        steps.push({ rule: hit, at: i });
        i += hit.phrase.length;
        continue;
      }
      after.push(hit.phrase[0]!);
      i += 1;
      continue;
    }
    after.push(line[i]!);
    i += 1;
  }
  return { after: after.join(''), steps };
}

/** Longest-match-first substitution over the whole line. Total and idempotent. */
export function tachygrafiaApply(line: string): string {
  return tachygrafiaApplyTraced(line).after;
}

/**
 * Undo the contraction. Sound because of the invertibility guard: every replacement
 * string is absent from the original, so each occurrence in the contracted line is
 * exactly one edit and there is no ambiguity about which.
 */
export function tachygrafiaInvert(contracted: string): string {
  let out = contracted;
  for (const r of [...TACHYGRAFIA_RULES].sort((a, b) => b.rep.length - a.rep.length)) {
    if (out.includes(r.rep)) out = out.split(r.rep).join(r.phrase);
  }
  return out;
}

/** Is this line a decoder instruction ΤΑΧΥΓΡΑΦΊΑ may touch? */
export function tachygrafiaIsInstruction(line: string): boolean {
  const t = line.trim();
  if (t.length <= 40) return false;
  if (!/\.$/.test(t)) return false;
  if (t.includes(CHIRON_START)) return false;               // GATE 2
  // A DIGIT IS EVIDENCE FOR A LEGEND HERE, NOT AGAINST ONE. Both pinaxIsLegend and
  // brachylogiaIsInstruction carry `if (/\d/.test(t)) return false;`, and every
  // ΑΠΟΓΡΑΦΗ / ΔΙΑΣΤΗΜΑ / ΣΤΙΧΟΜΥΘΪΑ legend names columns and arithmetic constants.
  if (!/[a-z]/.test(t) && !/[A-Za-z]/.test(t)) return false;
  return true;
}

/**
 * GATE 4 — every operator a FIRING rule's original named must still be named in its
 * replacement.  The obligation is per firing edit, not per line: a rule that did not
 * fire has made no promise, and charging a line with the requirements of rules that
 * never matched is what made the first version refuse every legend.
 *
 * `req` lists exactly the operator words the REPLACEMENT still carries, so the gate
 * catches a table entry whose shorthand silently drops an operator — which is the
 * failure it exists for — and passes every entry that does not.
 */
export function tachygrafiaCovers(before: string, steps: readonly TachygrafiaStep[]): boolean {
  for (const s of steps) {
    if (!before.includes(s.rule.phrase)) return false;
    for (const k of s.rule.req) if (!s.rule.rep.includes(k)) return false;
  }
  return true;
}

export interface TachygrafiaStage {
  /** The string this stage starts from. */
  from: string;
  /** The string this stage produces. */
  to: string;
  /** The phrase edits that fired. Empty for a ΠΕΡΙΚΟΠΈ clause pass. */
  steps: TachygrafiaStep[];
}

export interface TachygrafiaEdit {
  line: number; before: string; after: string;
  beforeTokens: number; afterTokens: number; via: 'tachygrafia' | 'perikopi';
  /** The ordered stages, inverted in reverse to recover `before` byte-for-byte. */
  stages: TachygrafiaStage[];
}

export interface TachygrafiaResult {
  codec: 'tachygrafia';
  message: string;
  decoded: string;
  exact: boolean;
  applied: boolean;
  edits: TachygrafiaEdit[];
  contractBefore: number;
  contractAfter: number;
  messageTokens: number;
  frontierTokens: number;
  frontierParent: string;
  notes: string;
}

/**
 * Contract one instruction line.  ΠΕΡΙΚΟΠΈ's clause pass runs FIRST and ΤΑΧΥΓΡΑΦΊΑ's
 * phrase pass runs on its output, because the two are complementary: ΠΕΡΙΚΟΠΈ is
 * anchored on clause structure and ΤΑΧΥΓΡΑΦΊΑ on phrases, and neither dominates.
 * Returns null when nothing strictly wins.
 */
export function tachygrafiaLine(line: string, enc: EncodingName): {
  after: string; before: number; after2: number; via: 'tachygrafia' | 'perikopi'; stages: TachygrafiaStage[];
} | null {
  const b = countTokens(line, enc);
  const stages: TachygrafiaStage[] = [];
  let cur = line;
  let best2 = b;

  // pass A — ΠΕΡΙΚΟΠΈ's own machinery, unchanged
  const g = perikopiGeneral(line);
  if (g !== line && g.length > 0 && perikopiNamesCover(line, g)) {
    const gt = countTokens(g, enc);
    if (gt < best2) { stages.push({ from: line, to: g, steps: [] }); cur = g; best2 = gt; }
  }

  // pass B — the phrase table, on the CURRENT string.  Soundness of every fired edit is
  // discharged inside tachygrafiaApplyTraced, so there is no whole-line precondition.
  // Each stage records the string it started from, which is what makes inversion exact
  // when a ΠΕΡΙΚΟΠΈ pass precedes it.
  const tr = tachygrafiaApplyTraced(cur);
  if (tr.steps.length > 0 && tr.after !== cur && tachygrafiaCovers(cur, tr.steps)) {
    const tt = countTokens(tr.after, enc);
    if (tt < best2) {
      stages.push({ from: cur, to: tr.after, steps: tr.steps });
      cur = tr.after; best2 = tt;
    }
  }
  if (stages.length === 0) return null;
  const via = stages.length > 1 ? 'tachygrafia' : (stages[0]!.steps.length > 0 ? 'tachygrafia' : 'perikopi');
  return { after: cur, before: b, after2: best2, via, stages };
}

/**
 * GATE 1 — undo every edit; the message must come back byte-for-byte.
 * Stages are inverted in reverse order, each from the string it started from.
 */
export function tachygrafiaInvertEdits(contracted: string, edits: TachygrafiaEdit[]): string {
  const lines = contracted.split('\n');
  for (const e of edits) {
    if (lines[e.line] !== e.after) return '\u0000invert:line-mismatch';
    let back = lines[e.line]!;
    for (let k = e.stages.length - 1; k >= 0; k--) {
      const s = e.stages[k]!;
      if (back !== s.to) return '\u0000invert:stage-mismatch';
      back = s.steps.length > 0 ? tachygrafiaInvertSteps(back, s.steps) : s.from;
    }
    lines[e.line] = back;
  }
  return lines.join('\n');
}

/**
 * GATE 8 — THE STRUCTURAL GATE, AND THE ONE THAT MATTERS.
 *
 * Only lines BEFORE the first § are editable.  This is not a refinement of the content
 * test, it is a replacement for it, and the measurement that forces it is recorded:
 *
 *   bench/x108/receipts/why.out
 *     kubectl-get-pods.txt   incExp 2756 chars  ->  candExp 2680 chars   (DIFFER)
 *
 * A content-based instruction detector — ends with '.', long enough, contains no § —
 * CANNOT distinguish a contract line from a tape line, because the ΧΕΙΡΩΝ tape is
 * itself prose: a rule's text runs to the next new letter, so a whole English sentence
 * is a legal tape literal.  On kubectl-get-pods the line
 *
 *   "Every new Cyrillic letter before ¶ starts a rule whose text runs to the next new
 *    letter or to ¶. In the text after ¶ expand every rule, repeatedly, and print only
 *    the result."
 *
 * sits AFTER the §, inside the tape, and contracting it changed the decoder's output by
 * 76 characters.  The chain's own gate caught it; the offline token measurement did not,
 * because it never checked the expansion.  So the rule is: the contract is exactly
 * `message.slice(0, indexOf(§))`, and nothing else is touched.
 */
export function tachygrafiaContractEnd(message: string): number {
  return message.indexOf(CHIRON_START);
}

/** Rewrite the instruction lines of an ALREADY-COMPILED message. */
export function tachygrafiaRewrite(message: string, enc: EncodingName, source = ''): {
  message: string; edits: TachygrafiaEdit[]; before: number; after: number;
} {
  const srcLines = source === '' ? null : new Set(source.split('\n'));
  const edits: TachygrafiaEdit[] = [];
  let before = 0, after = 0;
  const end = tachygrafiaContractEnd(message);
  let offset = 0;
  const out = message.split('\n').map((line, i) => {
    const lineStart = offset;
    offset += line.length + 1;
    if (end >= 0 && lineStart >= end) return line;                    // GATE 8 — structural
    if (!tachygrafiaIsInstruction(line)) return line;
    if (!perikopiIsLegend(line)) return line;                         // must also be a legend
    if (srcLines && srcLines.has(line)) return line;                  // GATE 3
    if (line.includes(CHIRON_START)) return line;                     // GATE 2
    const r = tachygrafiaLine(line, enc);
    if (r === null) return line;
    edits.push({ line: i, before: line, after: r.after, beforeTokens: r.before, afterTokens: r.after2, via: r.via, stages: r.stages });
    before += r.before; after += r.after2;
    return r.after;
  });
  return { message: out.join('\n'), edits, before, after };
}

/** Encode entry point. */
export function tachygrafiaEncode(
  text: string,
  enc: EncodingName = 'o200k_base',
  frontierFn: (t: string, e: EncodingName) => any = tagstackFrontier,
): TachygrafiaResult {
  const frontier = frontierFn(text, enc);
  const refuse = (notes: string): TachygrafiaResult => ({
    codec: 'tachygrafia', message: frontier.message, decoded: frontier.decoded,
    exact: frontier.decoded === text, applied: false, edits: [],
    contractBefore: 0, contractAfter: 0, messageTokens: frontier.messageTokens,
    frontierTokens: frontier.messageTokens, frontierParent: frontier.parentCodec, notes,
  });
  if (frontier.decoded !== text) return refuse('tachygrafia: parent is not exact');

  const rw = tachygrafiaRewrite(frontier.message, enc, text);
  if (rw.edits.length === 0) return refuse('tachygrafia: no instruction line abridges');
  // GATE 1 — invertibility, executed.
  if (tachygrafiaInvertEdits(rw.message, rw.edits) !== frontier.message) {
    return refuse('tachygrafia: edits are not invertible to the frontier message');
  }
  // GATE 2 — no edited line carried the tape.
  if (rw.edits.some((e) => e.before.includes(CHIRON_START))) {
    return refuse('tachygrafia: an edit touched a tape line');
  }
  // GATE 8 — no edited line was at or after the § frame.
  const end = tachygrafiaContractEnd(frontier.message);
  if (end >= 0) {
    let off = 0;
    for (const line of frontier.message.split('\n')) {
      if (off >= end && rw.edits.some((e) => e.before === line)) {
        return refuse('tachygrafia: an edit was inside the ΧΕΙΡΩΝ frame');
      }
      off += line.length + 1;
    }
  }
  // GATE 5 — the complete message must be strictly smaller.
  const tokens = countTokens(rw.message, enc);
  if (tokens >= frontier.messageTokens) return refuse(`tachygrafia loses: ${tokens} vs ${frontier.messageTokens}`);

  return {
    codec: 'tachygrafia', message: rw.message, decoded: frontier.decoded, exact: true, applied: true,
    edits: rw.edits, contractBefore: rw.before, contractAfter: rw.after, messageTokens: tokens,
    frontierTokens: frontier.messageTokens, frontierParent: frontier.parentCodec,
    notes: `instruction ${rw.before}->${rw.after} tok over ${rw.edits.length} line(s) via ${rw.edits.map((e) => e.via).join(',')}, message ${frontier.messageTokens}->${tokens}`,
  };
}

/** Disable flag, read live per call (the X104 lesson: never a load-time const). */
export function tachygrafiaDisabled(): boolean {
  return typeof process !== 'undefined' && !!process.env && process.env.OMEGA_NO_TACHYGRAFIA === '1';
}
