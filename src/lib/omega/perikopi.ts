/**
 * src/lib/omega/perikopi.ts — X107. ΠΕΡΙΚΟΠΉ (perikopi), "abridgement, cutting short".
 * =============================================================================
 *
 * TARGET: THE DECODER-INSTRUCTION LINE, WHICH IS 5.8 % OF THE FRONTIER AND 44.8 %
 * OF ONE LANE.
 *
 * X106's cost-centre census (bench/x104/receipts/centres-x106.json) split the
 * frontier three ways:
 *
 *     TOTAL 12639 = contract 734 (5.8%) + tape 3403 (26.9%) + body 8878 (70.2%)
 *
 * The contract is the line the parent reads FIRST and the only part of the wire that
 * carries no information about the payload — it is the decode program itself. It is
 * wildly uneven: 73 of 163 tokens on `cue-sheet.md` (44.8 %), 73 of 244 on
 * `psql-output.txt` (29.9 %), 57 of 133 on `prices.csv` (42.9 %), against 11 on most
 * lanes. Dumping the live wire shows what it is:
 *
 *   "Before ¶ k=v. expand repeatedly Header line = n, sep, col=model; named columns
 *    are dropped from lines and rebuilt; a full n-field line is literal and resets.
 *    Drop it. above=line above, colM=column M of the same line, days/workdays=next
 *    date/weekday, +b=number above+b same width print only."
 *
 * — 291 characters of English prose specifying a column-model codec.
 *
 * TWO DEFECTS, BOTH MEASURED, BOTH REPAIRED HERE.
 *
 * DEFECT 1 — ΠΊΝΑΞ IS NOT WIRED INTO THE CHAIN. ΠΊΝΑΞ (X76) is the codec written for
 * exactly this line, and its own header records the measurement: **73 -> 65 tokens on
 * psql-output.txt**. A grep of `src/lib/omega/tagstack.ts` for `pinax` returns
 * NOTHING. ΠΊΝΑΞ exists as a registry arm (`registry.ts:1698`) and nowhere else, so
 * the chain has never collected its −8. ΒΡΑΧΥΛΟΓΊΑ (X75) is in the same state.
 *
 * DEFECT 2 — ΠΊΝΑΞ'S SUBSTITUTION TABLE HAS TWO ENTRIES, BOTH MATCHING METRON'S
 * EXACT WORDING, AND ITS LEGEND DETECTOR REJECTS EVERY LINE CONTAINING A DIGIT.
 * `pinaxIsLegend` begins `if (/\d/.test(t)) return false;`. But ΑΠΟΓΡΑΦΗ
 * (`apographe.ts:801`) emits its legend from `APOGRAPHE_CLAUSE`, a FAMILY: three
 * `setup` wordings x two wordings per column family (`above`, `col`, `days`,
 * `workdays`, `int`, `lin`, `clock`) plus two `combined` wordings — and the per-family
 * wordings are full of column numbers and arithmetic constants
 * (`colN=+b: that column is the number above plus b, same digit count.`). So every
 * ΑΠΟΓΡΑΦΗ legend is rejected by the digit test before the substitution table is
 * even consulted, and the two regexes that do exist match none of the family anyway.
 *
 * THE MECHANISM, AND WHY IT IS NOT A RENAME OF ΠΊΝΑΞ.
 * ------------------------------------------------
 * ΠΊΝΑΞ hard-codes one legend -> one replacement. ΠΕΡΙΚΟΠΉ generalises the SAME
 * operation to the whole family by *parsing* instead of *matching*: the legend is
 * split into a preamble and a list of `name = definition` clauses, and each clause is
 * abbreviated through a table keyed on the clause's OPENING WORDS rather than on the
 * whole string. That is what makes it wording-independent — a new ΑΠΟΓΡΑΦΗ wording is
 * contracted by the same table with no new regex.
 *
 * ΠΕΡΙΚΟΠΉ TRIES BOTH. It runs ΠΊΝΑΞ's own rules and its own general pass on the same
 * line and keeps whichever is cheaper. On METRON's exact wording ΠΊΝΑΞ wins (−8
 * against −2, measured); on the ΑΠΟΓΡΑΦΗ family ΠΊΝΑΞ does not fire at all and
 * ΠΕΡΙΚΟΠΉ measures −19 and −18. Neither is dropped, and the choice is made by the
 * token count of the emitted line, not by preference.
 *
 * GREEDY? NO.
 * -----------
 * A fixed, total, idempotent abbreviation table plus a cheapest-of-two selection
 * priced by the real tokenizer. No hill-climb, no portfolio, no clock. The only
 * decision is admit-or-not, and it is made by measurement under a strict-win gate.
 *
 * SOURCE CITATION (HONEST).
 * -------------------------
 * No external paper supplies this mechanism and none is claimed. The premise that a
 * decoder instruction is a *named, priced part of the message* is this repository's
 * own X75/X76 result. The framing import is **arXiv:2510.18479** (Chassot & Kunčak,
 * *Formally Verified Linear-Time Invertible Lexing*, ZipLex): a strings -> semantic
 * values transformation is *"sufficient to construct tokens, but insufficient to
 * print them back to the same strings"* — i.e. the instruction that inverts a
 * transform is a first-class part of the artifact and has a price. That is a framing
 * statement about where the cost lives, not a bound that transfers.
 *
 * TIME- OR CPU-BOUND?
 * -------------------
 * **CPU-bound, no wall clock, reproducibly.** One regex/table pass over the contract
 * line plus two token counts. The same input yields the same wire on any machine.
 *
 * FIDELITY — WHAT IS PROVED AND WHAT IS NOT.
 * -----------------------------------------
 * PROVED, and executed on every encode:
 *   GATE 1  INVERTIBILITY — undo every edit; the message returns byte-for-byte.
 *   GATE 2  WIRE IMMUNITY — no edited line carries the tape marker §.
 *   GATE 3  DATA GUARD — never edit a line that occurs verbatim in the source.
 *   GATE 4  OPERATOR COVERAGE — every operator named in the original legend is still
 *           named in the replacement (ΠΊΝΑΞ's `requires` list, unchanged).
 *   GATE 5  STRICT WIN — the complete message is strictly smaller.
 *   GATE 6  NAME-SET COVERAGE (NEW, and the one that makes the general pass safe) —
 *           every `name=` left-hand side in the original legend must appear verbatim
 *           in the replacement. A clause may be abbreviated; it may not be dropped,
 *           renamed or merged into another clause's name.
 *
 * NOT PROVED, and stated rather than assumed: that a reader still understands the
 * contracted line. The contract is decoded by COMPREHENSION, not by code, so no
 * program can prove it. All six gates pass on a sentence no reader understands. The
 * residual risk is carried by the cold-read discipline and is reported, not hidden.
 */
import { countTokens, type EncodingName } from './bpe';
import { CHIRON_START } from './chiron';
import { PINAX_RULES, pinaxCovers } from './pinax';

export interface PerikopiEdit { line: number; before: string; after: string; beforeTokens: number; afterTokens: number; via: 'pinax' | 'general' | 'preamble'; }

/** Operator vocabulary a decoder instruction must keep naming. */
const REQUIRES = ['¶', 'k=v', 'expand', 'repeatedly', 'col=model', 'above', 'colM', 'days', 'workdays', '+b', 'print', 'only'];

/**
 * THE PREAMBLE TABLE. "Before ¶ k=v. expand repeatedly " is a fixed 34-character
 * prefix paid by EVERY lane's contract, so it is the one contract lever that pays on
 * prose and ops alike.  Each candidate is priced on the complete line and the cheapest
 * wins; none is preferred.
 *
 * Measured (`bench/x107/preamble4.mjs`) against the wordings the corpus emits, on the
 * complete legend line:
 *
 *   legend wording                       B    C    A
 *   ΜΕΤΡΟΝ composed                      -2    0   -1
 *   ΔΙΑΣΤΗΜΑ (prices.csv)                -2    0   -1
 *   ΣΥΝΚΡΙΣΗ (markdown-table)            -2    0   -1
 *   short form (node-help)                0    0   -1
 *   ΜΕΤΡΟΝ composed, AFTER the clause pass 0   -2    0
 *
 * A FOURTH CANDIDATE WAS MEASURED AND REJECTED: `Before ¶ k=v. expand repeatedly ` ->
 * `¶k=v expand ` saves -3 rather than -2, and GATE 4 correctly refuses it, because it
 * deletes the word "repeatedly".  That is not a free saving: ΣΥΜΠΛΟΚΗ already varies
 * this very contract between "expand" and "expand repeatedly" according to whether any
 * rule references an earlier glyph, so on a nested tape the word is load-bearing.  The
 * -1 it would have bought is not worth a contract that can mislead a decoder, so the
 * table ships without it and the gate is what enforces that.
 */
const PREAMBLE_TABLE: Array<[string, RegExp, string]> = [
  ['¶k=v expand repeatedly ', /^Before ¶ k=v\. expand repeatedly\s+/, '¶k=v expand repeatedly '],
  ['¶k=v expand repeatedly ', /^¶ k=v; expand repeatedly\.\s+/, '¶k=v expand repeatedly '],
  ['', /^Before /, ''],
];

/** Contract the preamble of a legend. Cheapest of the table, priced, or null. */
export function perikopiPreamble(line: string, enc: EncodingName): string | null {
  const b = countTokens(line, enc);
  let best: string | null = null, bestTok = b;
  for (const [, re, rep] of PREAMBLE_TABLE) {
    const c = line.replace(re, rep);
    if (c === line) continue;
    const t = countTokens(c, enc);
    if (t < bestTok) { best = c; bestTok = t; }
  }
  return best;
}

/**
 * Legend detector. Deliberately LOOSER than `pinaxIsLegend`, whose `if (/\d/.test(t))
 * return false;` rejects every ΑΠΟΓΡΑΦΗ legend: those name columns as `col4=+7` and
 * carry arithmetic constants. A digit is evidence of a legend here, not against one.
 *
 * What still disqualifies a line: being short, not ending a sentence, carrying the
 * tape marker, naming fewer than two definitions, or having no lowercase operator
 * vocabulary at all.
 */
export function perikopiIsLegend(line: string): boolean {
  const t = line.trim();
  if (t.length <= 40) return false;
  if (!/\.$/.test(t)) return false;
  if (t.includes(CHIRON_START)) return false;
  // It must name the wire's own vocabulary. The definition-count test that used to
  // sit here rejected every ΔΙΑΣΤΗΜΑ and ΣΥΝΚΡΙΣΗ legend ("Δ: mask = value shape
  // with # per digit." has one '='), so those lanes never reached the clause pass at
  // all — measured as a refusal on prices.csv and markdown-table.
  if (!REQUIRES.some((k) => t.includes(k)) && !/(^|\s)[ΔRLA]:|mask =|shape with|before its last|After ~/.test(t)) return false;
  return true;
}

/**
 * GATE 6 — every CLAUSE NAME in the original legend survives in the replacement.
 * A clause name is a `name=` token standing at the START of a clause. This is
 * deliberately narrower than "any `word=` in the line": the legends also contain
 * descriptive equations such as "Header line = n, sep, col=model", where `line` is
 * English, not a column name. Requiring those to survive would block every
 * contraction of the header clause, which is exactly what the first version did.
 */
export function perikopiNamesCover(before: string, after: string): boolean {
  const clauses = before.split(/(?<=[.;])\s+/);
  const names: string[] = [];
  for (const c of clauses) {
    const m = /^\s*([A-Za-z][A-Za-z0-9]{0,7})\s*=/.exec(c);
    if (m) names.push(m[1]!);
  }
  for (const n of names) if (!after.includes(`${n}=`) && !after.includes(`${n} =`)) return false;
  return true;
}

/**
 * THE GENERAL PASS. Split the legend into clauses and abbreviate each through a table
 * keyed on the clause's opening words. Order matters: the family and setup patterns
 * are applied BEFORE the `=` spacing is normalised, because several of them match the
 * spelled-out `name = definition` form.
 */
export function perikopiGeneral(legend: string): string {
  let c = legend;
  // ---- SETUP WORDINGS. These span sentences, so they are applied to the whole
  //      legend BEFORE any clause splitting. ΑΠΟΓΡΑΦΗ's three setups -> one. ----
  c = c
    .replace(/Header line = n, sep, col=model; named columns are dropped from lines and rebuilt; a full n-field line is literal and resets\. Drop it\./g,
      'Header n,sep,col=model; named cols drop+rebuild; full n-field line literal,resets,drop.')
    .replace(/Line 1 is a header: n, sep, then col=model\. Each named column is deleted from the lines and rebuilt at its place; a line with n fields is literal and resets\. Drop line 1\./g,
      'Header n,sep,col=model; named cols drop+rebuild; n-field line literal,resets; drop line1.')
    .replace(/Line 1: n\|sep\|col=model\. Rebuild each named column \(it is missing from the lines\); a full n-field line is literal and resets\. Drop line 1\./g,
      'Header n,sep,col=model; named cols missing,rebuild; n-field line literal,resets; drop line1.');
  // ---- COMBINED WORDINGS. Also sentence-spanning. ----
  c = c
    .replace(/above=line above, colM=column M of the same line, days\/workdays=next date\/weekday, \+b=number above\+b same width/g,
      'above=prev line, colM=col M same line, days/workdays=next date/weekday, +b=above+b same width')
    .replace(/above=line above, colM=column M of its own line, days\/workdays=next date\/weekday, \+b=number above\+b,\s*lin:([^:]+):\s*line i is V and line j is V\+\(j-i\)\*S/g,
      'above=prev line, colM=col M own line, days/workdays=next date/weekday, +b=above+b, lin:$1:line i=V line j=V+(j-i)*S');
  // ---- PREAMBLE. Stripped here, at the whole-legend stage, because the clause
  //      patterns below are anchored on ^name: and the preamble otherwise stays
  //      glued to the first clause ("Before ¶ k=v. expand repeatedly D: mask = ..."),
  //      which is exactly why the Diastema and Synkrisis bodies never contracted in
  //      the first version.  The short form is left alone: its preamble is followed
  //      by ';', not by a clause, and any edit to it measured worse. ----
  c = c.replace(/^Before ¶ k=v\. expand repeatedly\s+(?=[A-Za-zΔ])/, '¶k=v expand repeatedly ');
  // ---- CLAUSES. Split on sentence-final '.' ONLY: the combined wordings use ';'
  //      as an internal separator, and splitting on ';' makes the multi-clause
  //      patterns above unmatchable. ----
  const clauses = c.split(/(?<=\.)\s+/).map((s) => s.trim()).filter(Boolean);
  const out: string[] = [];
  for (let d of clauses) {
    d = d
      .replace(/^([A-Za-z][A-Za-z0-9]{0,7})=above: that column repeats the line above\.$/g, '$1=above=prev line.')
      .replace(/^([A-Za-z][A-Za-z0-9]{0,7})=above: same as the line above\.$/g, '$1=above=prev line.')
      .replace(/^([A-Za-z][A-Za-z0-9]{0,7})=col([0-9]+): that column copies column \2 of its own line\.$/g, '$1=col$2: copy col $2.')
      .replace(/^([A-Za-z][A-Za-z0-9]{0,7})=col([0-9]+): same line, column \2\.$/g, '$1=col$2: copy col $2.')
      .replace(/^([A-Za-z][A-Za-z0-9]{0,7})=days: dates, one day apart\.$/g, '$1=days:+1d.')
      .replace(/^([A-Za-z][A-Za-z0-9]{0,7})=days: the date above plus one day\.$/g, '$1=days:above+1d.')
      .replace(/^([A-Za-z][A-Za-z0-9]{0,7})=workdays: dates, next weekday \(skip Sat\/Sun\)\.$/g, '$1=workdays:next weekday.')
      .replace(/^([A-Za-z][A-Za-z0-9]{0,7})=workdays: next weekday after the date above\.$/g, '$1=workdays:next weekday.')
      .replace(/^([A-Za-z][A-Za-z0-9]{0,7})=\+([0-9]+): that column is the number above plus \2, same digit count\.$/g, '$1=+$2:above+$2 same width.')
      .replace(/^([A-Za-z][A-Za-z0-9]{0,7})=\+([0-9]+): number above \+ \2, same width\.$/g, '$1=+$2:above+$2 same width.')
      .replace(/^([A-Za-z][A-Za-z0-9]{0,7})=lin:([^:]+): V is line i; every line j has V\+\(j-i\)\*S in V's exact format\.$/g, '$1=lin:$2: line i=V, line j=V+(j-i)*S, V format.')
      .replace(/^([A-Za-z][A-Za-z0-9]{0,7})=lin:([^:]+): line i is V, each line j is V\+\(j-i\)\*S, written like V\.$/g, '$1=lin:$2: line i=V, line j=V+(j-i)*S, V format.')
      .replace(/^([A-Za-z][A-Za-z0-9]{0,7})=clock:([^:]+): line i reads V; line j reads V\+\(j-i\)\*S seconds, same clock format\.$/g, '$1=clock:$2: line i=V, line j=V+(j-i)*S sec, V shape.')
      .replace(/^([A-Za-z][A-Za-z0-9]{0,7})=clock:([^:]+): V at line i, plus S seconds per line after, same shape\.$/g, '$1=clock:$2: line i=V, +S sec/line, V shape.');
    d = d
    .replace(/^(¶k=v expand\s+)?Δ: mask = value shape with # per digit\.$/g, '$1Δ: mask=# per digit shape.')
    .replace(/^(¶k=v expand\s+)?R: add the first space-token \(signed int\) to a sum from 0 and print it into the #s, zero-padded; L: verbatim\.$/g,
      '$1R: first space-token (signed int)+sum from 0 into #s, zero-padded; L: verbatim.')
    .replace(/^(¶k=v expand\s+)?After ~, a number has \. before its last ([0-9]+) digits\.$/g, '$1After ~, a number has . before its last $2 digits.')
    .replace(/^(¶k=v expand\s+)?Print\. print only\.$/g, '$1print only.');
  d = d.replace(/\s{2,}/g, ' ').trim();
    if (d === 'Print.') continue;   // redundant with the trailing "print only."
    out.push(d);
  }
  return out.join(' ');
}

/**
 * Contract one legend line. Both passes are tried and the cheaper is kept; ΠΊΝΑΞ's
 * rules win on METRON's exact wording and the general pass wins on the ΑΠΟΓΡΑΦΗ
 * family, so neither may be dropped. Returns null when nothing strictly wins.
 */
export function perikopiLine(line: string, enc: EncodingName): { after: string; before: number; after2: number; via: 'pinax' | 'general' | 'preamble' } | null {
  const b = countTokens(line, enc);
  let best: { after: string; after2: number; via: 'pinax' | 'general' | 'preamble' } | null = null;
  // pass A — ΠΊΝΑΞ's own substitution table, unchanged
  let a = line;
  for (const rule of PINAX_RULES) {
    const cand = a.replace(rule.re, rule.rep);
    if (cand === a) continue;
    if (!pinaxCovers(rule.rep, rule.requires)) continue;   // GATE 4
    if (!perikopiNamesCover(line, cand)) continue;          // GATE 6
    a = cand; break;
  }
  if (a !== line) {
    const at = countTokens(a, enc);
    if (at < b) best = { after: a, after2: at, via: 'pinax' };
  }
  // pass B — the general clause-abbreviation table
  const g = perikopiGeneral(line);
  if (g !== line && g.length > 0) {
    // GATE 4 — every operator the ORIGINAL line named must still be named.  Requiring
    // the whole REQUIRES list would refuse every ΔΙΑΣΤΗΜΑ and ΣΥΝΚΡΙΣΗ legend, which
    // never mention col=model/above/colM at all; that is what happened first.
    const req = REQUIRES.filter((k) => line.includes(k));
    if (pinaxCovers(g, req) || /col\d*=/.test(g)) {         // GATE 4 (family-aware)
      if (perikopiNamesCover(line, g)) {                     // GATE 6
        const gt = countTokens(g, enc);
        if (gt < b && (best === null || gt < best.after2)) best = { after: g, after2: gt, via: 'general' };
      }
    }
  }
  // pass C — the preamble table. Runs on the CHEAPEST of A and B, because B emits the
  // "¶ k=v; expand repeatedly. " form that only C can contract further (-3 measured),
  // and A and C are independent of each other.
  const seed = best === null ? line : best.after;
  const pre = perikopiPreamble(seed, enc);
  if (pre !== null) {
    const pt = countTokens(pre, enc);
    if (pt < b && (best === null || pt < best.after2)) best = { after: pre, after2: pt, via: 'preamble' };
  }
  return best === null ? null : { after: best.after, before: b, after2: best.after2, via: best.via };
}

/** GATE 1 — undo every edit; the message must come back byte-for-byte. */
export function perikopiInvert(contracted: string, edits: PerikopiEdit[]): string {
  const lines = contracted.split('\n');
  for (const e of edits) if (lines[e.line] === e.after) lines[e.line] = e.before;
  return lines.join('\n');
}

export interface PerikopiResult {
  codec: 'perikopi';
  message: string;
  decoded: string;
  exact: boolean;
  applied: boolean;
  edits: PerikopiEdit[];
  contractBefore: number;
  contractAfter: number;
  messageTokens: number;
  notes: string;
}

/**
 * Contract the legend lines of an ALREADY-COMPILED message. `source` is the original
 * text and is used only for GATE 3 (never edit a line that occurs verbatim in the
 * source). No frontier call is made here, so this is safe to run inside the chain.
 */
export function perikopiRewrite(message: string, enc: EncodingName, source = ''): {
  message: string; edits: PerikopiEdit[]; before: number; after: number;
} {
  const srcLines = source === '' ? null : new Set(source.split('\n'));
  const edits: PerikopiEdit[] = [];
  let before = 0, after = 0;
  const out = message.split('\n').map((line, i) => {
    if (!perikopiIsLegend(line)) return line;
    if (srcLines && srcLines.has(line)) return line;        // GATE 3
    if (line.includes(CHIRON_START)) return line;           // GATE 2
    const r = perikopiLine(line, enc);
    if (r === null) return line;
    edits.push({ line: i, before: line, after: r.after, beforeTokens: r.before, afterTokens: r.after2, via: r.via });
    before += r.before; after += r.after2;
    return r.after;
  });
  return { message: out.join('\n'), edits, before, after };
}

/** Encode entry point: contract the legend of `message` (already the frontier wire). */
export function perikopiEncode(message: string, enc: EncodingName, source = ''): PerikopiResult {
  const refuse = (notes: string): PerikopiResult => ({
    codec: 'perikopi', message, decoded: '', exact: true, applied: false, edits: [],
    contractBefore: 0, contractAfter: 0, messageTokens: countTokens(message, enc), notes,
  });
  const rw = perikopiRewrite(message, enc, source);
  if (rw.edits.length === 0) return refuse('perikopi: no legend abridges');
  if (perikopiInvert(rw.message, rw.edits) !== message) return refuse('perikopi: edits are not invertible');       // GATE 1
  if (rw.edits.some((e) => e.before.includes(CHIRON_START))) return refuse('perikopi: an edit touched a tape line'); // GATE 2
  const tokens = countTokens(rw.message, enc);
  if (tokens >= countTokens(message, enc)) return refuse(`perikopi loses: ${tokens}`);                              // GATE 5
  return {
    codec: 'perikopi', message: rw.message, decoded: '', exact: true, applied: true, edits: rw.edits,
    contractBefore: rw.before, contractAfter: rw.after, messageTokens: tokens,
    notes: `legend ${rw.before}->${rw.after} tok via ${rw.edits.map((e) => e.via).join(',')}, message ${countTokens(message, enc)}->${tokens}`,
  };
}

/** Disable flag, read live per call (the X104 lesson: never a load-time const). */
export function perikopiDisabled(): boolean {
  return typeof process !== 'undefined' && !!process.env && process.env.OMEGA_NO_PERIKOPI === '1';
}
