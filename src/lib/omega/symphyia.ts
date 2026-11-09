/**
 * src/lib/omega/symphyia.ts — X90. ΣΥΜΦΥΊΑ (symphyia), "a growing together".
 * =============================================================================
 *
 * THE RELATION, AND WHY NOTHING IN THE STACK FITS IT
 * -----------------------------------------------------------------------------
 * A record is not a list of independent cells. Very often one cell is a TEMPLATE
 * over a SIBLING cell of the same record:
 *
 *     openstack request log   f15 = "/v2/" + f9 + "/servers/detail"
 *     dpkg -l                 f2  = <package> + ":" + f4          (arch qualifies the name)
 *     ls -l symlink           f11 = f9 + ".0.0"
 *     /usr/bin alternatives   f11 = "/etc/alternatives/" + f9
 *
 * The sibling is ALREADY PRINTED one field to the left or right, so the template
 * cell carries almost no new information — but it is never a LITERAL REPEAT, so no
 * dictionary can intern it. That puts it in the one class that has historically
 * paid: redundancy the glyph pool cannot represent. X89 established the boundary of
 * the other class from the opposite side — a post-pass dictionary over the frontier
 * wire refuses 15/15 lanes, because a repeated span there costs less in situ than
 * its isolated token count (the in-situ floor law, `docs/codecs.md` §X89.4).
 *
 * WHAT IS ALREADY TAKEN, STATED PRECISELY, SO THIS IS NOT A RENAME
 * -----------------------------------------------------------------------------
 *   PROSPHYSIS (X74)  the same IDEA, one syntactic shape. Its trigger is
 *                     `ARROW = /^(.* -> )([^\s]+)(.*)$/`, so it fires ONLY on lines
 *                     containing " -> ", relates ONLY the last field before the arrow
 *                     to the symlink target, and admits ONLY the suffix direction
 *                     (`prosphysisRewrite` is called with `ADMITTED = ['suffix']`).
 *                     ΣΥΜΦΥΊΑ subsumes it: any field pair, any of three affix shapes,
 *                     no anchor syntax required.
 *   GNOMON / SYNARTESIS  derive the npm `resolved` URL from the enclosing key and the
 *                     sibling `version` — a genuine template, but the template is
 *                     HARDCODED to `https://registry.npmjs.org/NAME/-/BASE-VERSION.tgz`
 *                     (`gnomon.ts:157`, `synartesis.ts`). ΣΥΜΦΥΊΑ FITS the template
 *                     from the data and knows nothing about npm; it does not fire on
 *                     the npm case, because there the source is the record's KEY on a
 *                     different line, not a sibling field. That limit is stated in §7.
 *   APOGRAPHE / METRON  vertical relations (a cell predicted from the SAME COLUMN of
 *                     the row above). STICHOMYTHIA prints a column from an affine
 *                     program over a number. ANAPHORA (AN1) binds literal repeats in
 *                     place with no header. None of these is a horizontal template.
 *
 * THE THREE FORMS
 * -----------------------------------------------------------------------------
 * With cell[j] = A + cell[i] + B fitted over the record set:
 *   FULL   A and B both constant  ->  field j becomes the marker alone, and the reader
 *                                     rebuilds "A" + field i + "B". Pays T(cell) - 1.
 *   TAIL   A constant, B varies    ->  field j becomes marker+B. Pays T(cell) - T(B) - 1.
 *   HEAD   B constant, A varies    ->  field j becomes A+marker. Pays T(cell) - T(A) - 1.
 * TAIL with A empty is exactly PROSPHYSIS's suffix rewrite; HEAD with B empty is the
 * prefix direction PROSPHYSIS measures and declines to admit.
 *
 * GREEDY? YES, AND ONLY IN THE SELECTION — the same discipline MERISMOS states.
 * -----------------------------------------------------------------------------
 * Candidate generation is a FIXED RULE, not a search: every ordered field pair (j, i)
 * on every record, priced by an exact integer estimate. Selection is a bounded greedy
 * hill-climb over the RAW token count of the rewritten text, each rule kept only if it
 * strictly lowers that count, so the selection cannot lose against the empty rule set.
 * The one frontier call happens once, after the rule set is fixed. Nothing here is
 * re-scored by proxy: the final gate is the measured complete message.
 *
 * TIME-BOUND OR CPU-BOUND?  **CPU-BOUND, AND TAKES NO CLOCK AT ALL.** The fit is
 * O(records x fields^2) integer work with an early stop; it imports no `now()` and no
 * `budgetMs`. Its output is therefore a pure function of the input on any machine,
 * which is the property `clock.ts` exists to protect and the property X89 §2 measured
 * the wall-clock frontier losing (4 of 29 lanes drifting by up to +20 tokens under
 * load). The frontier call it makes inherits the caller's determinism, not its own.
 *
 * GATES — every one runs on every encode; any failure refuses and returns identity.
 *   G1  support      a relation must hold on >= MIN_ROWS records and on >= MIN_FRAC of
 *                    the records that have both fields, so two coincidental lines
 *                    cannot look like a mechanism.
 *   G2  unambiguous  the sibling must occur EXACTLY ONCE inside the target cell; a cell
 *                    containing it twice is skipped, never guessed at.
 *   G3  marker       the marker character is chosen ABSENT from the whole text, and is a
 *                    single o200k token, so one fold costs exactly one token and the
 *                    marker cannot be confused with payload.
 *   G4  acyclic      no admitted rule may read a field that is itself a target, so
 *                    rebuilding needs no fixed-point iteration and cannot loop.
 *   G5  own inverse  decode(encode(text)) === text byte for byte, or refuse.
 *   G6  composition  the frontier must reproduce the REWRITTEN text exactly — that is a
 *                    different input from the source it validated earlier, so the
 *                    composition is checked, not argued (PROSPHYSIS's gate 1b).
 *   G7  strict win   countTokens(complete message) < the incumbent's complete message,
 *                    measured in this process, or refuse.
 *   G8  integrity    CRC-32 of the rebuilt SOURCE TEXT in the contract, verified as the
 *                    LAST step of decode. Bought with the X88 lesson: ΣΥΝΤΆΞΙΣ was 75/75
 *                    byte-exact with zero wrong round trips while 244 of 427 mutations
 *                    decoded SILENTLY WRONG, because a corrupted value is still
 *                    well-formed and every structural gate still passes. A marker whose
 *                    neighbouring digits were edited is exactly that kind of corruption.
 */

import { countTokens, type EncodingName } from './bpe';
import { tagstackFrontier, type TagstackResult } from './tagstack';
import { crc32 } from './aither';

/** CRC-32 of the SOURCE TEXT, as 8 lowercase hex digits. Same construction as
 *  `syntaxis.ts:185`. Over the text, not over the wire, because what must survive
 *  corruption is the thing the reader is being handed back. */
function crcOf(text: string): string {
  return crc32(new TextEncoder().encode(text)).toString(16).padStart(8, '0');
}

/** The codec's name, used in receipts and docs. NOT printed in the contract: spelling it
 *  in Greek costs several tokens the message cannot spare (see symphyiaContract). */
export const NAME = 'ΣΥΜΦΥΊΑ';

/** Field counts, support thresholds. Deliberately conservative: a relation that fires
 *  on four records is a coincidence until the measured message says otherwise. */
const MIN_ROWS = 4;
const MIN_FRAC = 0.6;
const FULL_FRAC = 0.9;
/** Floor on how constant ONE affix may be for its form to be considered. Below the 0.9 the
 *  'full' form still demands, because the rewrite tests the affix per row and skips rows
 *  that do not match it, so a partly-constant affix is still profitable on the rows where
 *  it holds. 0.6 is the same floor G1 uses for support. */
const MIN_FORM_FRAC = 0.6;
/** G9 — a relation whose SOURCE cell barely varies is refused. Measured, not chosen
 *  freely: openstack-loghub-26's f15 = "/v2/" + f9 + "/servers/detail" holds on 15
 *  records and f9 (the tenant UUID) takes ONE distinct value across them, so f15 is a
 *  LITERAL REPEAT and the frontier already owns it — F(rewrite) came back 896, exactly
 *  F(original), for a 291-token raw win, and the contract then made the message lose
 *  968 vs 896. dpkg-l-full's f2 = <name> + ":" + f4 is the same shape with f4 the
 *  constant "amd64": refused at 2310 vs 2262. Those two frontier calls cost 111 s and
 *  499 s; this gate refuses both in about 3 ms. The law it encodes generalises X89's
 *  in-situ floor from the target side to the SOURCE side: a template over a constant
 *  sibling is not a template, it is a repeat, and repeats are dictionary territory. */
const MIN_DISTINCT_SOURCE = 3;
/* The threshold is BRACKETED BY MEASUREMENT, not chosen freely (same discipline as the
 * X89 size gate, which sits between a verified-sufficient 6 751 chars and a
 * verified-insufficient 10 692). bench/x90/_g9.ts lists every relation reaching G1
 * support with G9 disabled and its distinct-source count:
 *   distinctSource 1  agent-history f12<-f6 and f17<-f14, ps-aux-real f16<-f14
 *                     -- the source is a CONSTANT, so the target is a constant too and
 *                     ELLEIPSIS/APOGRAPHE already own it. Refused, never frontier-tested.
 *   distinctSource 2  openstack f15<-f9 -- MEASURED INSUFFICIENT. A 291-token raw win
 *                     produced F(rewrite) = 896 = F(original) EXACTLY: zero frontier gain,
 *                     because with the source constant the target is a literal repeat the
 *                     dictionary already interns. The contract then made it lose 968 vs 896,
 *                     which cost 111 s of frontier time to discover.
 *   distinctSource 4  dpkg-l-full f2<-f4 -- MEASURED SUFFICIENT: F(rewrite) 2240 against
 *                     F(original) 2262, a real -22 at the frontier.
 *   distinctSource 57 ls-l-real f11<-f9 -- measured -42 against the gate.
 * So 2 is verified insufficient and 4 verified sufficient, and the gate sits between them.
 * No relation in this corpus has exactly 3 distinct source values, so the boundary value
 * itself is UNTESTED; that is stated rather than papered over. */

const MIN_SIB_LEN = 2;
const MAX_FIELDS = 24;
const MAX_RULES = 6;
const MAX_RECORDS = 20_000;

/** Marker candidates, in preference order. All are single o200k_base tokens and all are
 *  absent from ordinary ASCII ops output; G3 re-checks absence against the actual text,
 *  and re-checks the one-token property rather than trusting this list. Mathematical
 *  brackets are NOT here on purpose: X88 measured U+27E6/U+27E7 at three tokens each. */
const MARKERS = '҂჻ᛝ⸙※⁂⁑⸎᚛᚜჻⸙'.split('').concat(['۞', '࿊', '࿉', '᪥', 'ꙮ']);

export type SymphyiaForm = 'full' | 'tail' | 'head';

export interface SymphyiaRule {
  /** 1-based target field index */
  j: number;
  /** 1-based source (sibling) field index */
  i: number;
  form: SymphyiaForm;
  /** constant prefix, present for 'full' and 'tail' */
  A: string;
  /** constant suffix, present for 'full' and 'head' */
  B: string;
  rows: number;
  eligible: number;
  /** G9: distinct values the SOURCE cell takes across the rows the relation holds on */
  distinctSource: number;
  /** estimated raw-token gain, charged once for the rule text */
  est: number;
}

export interface SymphyiaResult {
  codec: 'symphyia';
  wire: string;
  message: string;
  decoded: string;
  exact: boolean;
  applied: boolean;
  rules: SymphyiaRule[];
  rewritten: number;
  contractTokens: number;
  messageTokens: number;
  frontierTokens: number;
  frontierParent: string;
  crc: string;
  notes: string;
}

/* ------------------------------------------------------------------ parsing */

interface Field { text: string; start: number; end: number; }

/** Split one line into 1-based whitespace fields WITH their byte spans, so a rewrite
 *  touches only field text and every separator survives untouched. That is what makes
 *  byte-exactness structural rather than something to be hoped for. */
function fieldsOf(line: string): Field[] {
  const out: Field[] = [];
  const n = line.length;
  let k = 0;
  while (k < n) {
    while (k < n && /\s/.test(line[k])) k++;
    if (k >= n) break;
    const s = k;
    while (k < n && !/\s/.test(line[k])) k++;
    out.push({ text: line.slice(s, k), start: s, end: k });
  }
  return out;
}

function indexOfOnce(hay: string, needle: string): number {
  const a = hay.indexOf(needle);
  if (a < 0) return -1;
  if (hay.indexOf(needle, a + 1) >= 0) return -1;   // G2: ambiguous placement
  return a;
}

/* ------------------------------------------------------------------ the fit */

/** Enumerate every ordered field pair on every record and fit constant affixes.
 *  Pure integer work: no tokenizer call, no clock. */
export function symphyiaFit(text: string): { rules: SymphyiaRule[]; lines: string[]; fields: Field[][] } {
  const lines = text.split('\n');
  const fields = lines.map(fieldsOf);
  const n = Math.min(fields.length, MAX_RECORDS);
  /** Per candidate pair: how many rows hold the relation, and for each modal affix value
   *  how many CHARACTERS that form would remove. Pricing on characters removed is what
   *  makes the three forms comparable; pricing on the target cell's own size is not, and
   *  that mistake is measured in this file's history -- it credited 'head' with deleting a
   *  cell it actually mostly keeps. */
  interface Aff { n: number; removed: number; }
  const acc = new Map<string, { rows: number; eligible: number; ab: Map<string, Aff>; aOnly: Map<string, Aff>; bOnly: Map<string, Aff>; tChars: number; src: Set<string> }>();
  const bump = (m: Map<string, Aff>, k: string, removed: number) => { const e = m.get(k); if (e) { e.n++; e.removed += removed; } else m.set(k, { n: 1, removed }); };
  for (let r = 0; r < n; r++) {
    const f = fields[r];
    if (f.length < 2 || f.length > MAX_FIELDS) continue;
    for (let j = 0; j < f.length; j++) for (let i = 0; i < f.length; i++) {
      if (i === j) continue;
      const key = `${j + 1}<-${i + 1}`;
      let e = acc.get(key);
      if (!e) { e = { rows: 0, eligible: 0, ab: new Map(), aOnly: new Map(), bOnly: new Map(), tChars: 0, src: new Set<string>() }; acc.set(key, e); }
      const t = f[j].text, s = f[i].text;
      if (s.length < MIN_SIB_LEN || t.length <= s.length) continue;
      e.eligible++;
      e.src.add(s);                                          // G9: how much does the SIBLING vary?
      const at = indexOfOnce(t, s);
      if (at < 0) continue;
      const A = t.slice(0, at), B = t.slice(at + s.length);
      e.rows++; e.tChars += t.length;
      // 'full' removes the whole cell; 'tail' removes A + sibling (the cell keeps the
      // varying tail); 'head' removes sibling + B (the cell keeps the varying head).
      bump(e.ab, A + '\u0000' + B, t.length);
      bump(e.aOnly, A, A.length + s.length);
      bump(e.bOnly, B, s.length + B.length);
    }
  }
  const rules: SymphyiaRule[] = [];
  for (const [key, e] of acc) {
    if (e.rows < MIN_ROWS || e.rows < MIN_FRAC * e.eligible) continue;      // G1
    if (e.src.size < MIN_DISTINCT_SOURCE) continue;                         // G9
    const [j, i] = key.split('<-').map(Number);
    const top = (m: Map<string, Aff>) => [...m.entries()].sort((a, b) => b[1].n - a[1].n || (a[0] < b[0] ? -1 : 1))[0];
    const tab = top(e.ab), ta = top(e.aOnly), tb = top(e.bOnly);
    const fAB = tab[1].n / e.rows, fA = ta[1].n / e.rows, fB = tb[1].n / e.rows;
    /* PRICE ALL THREE FORMS AND TAKE THE MOST VALUABLE ONE THAT MEETS THE BAR.
     * Selecting on constancy alone is a real bug, measured: on ls-la-usrbin the tail is
     * constant ("/etc/alternatives/") on only 74% of rows, below FULL_FRAC, so the old
     * selector fell through to the HEAD form whose constant part is the empty string --
     * a form that saves nothing, because the varying prefix is what the marker replaces.
     * The rewrite already tests the affix per row and leaves non-matching rows alone, so a
     * form constant on only 74% of rows still rewrites those 74% profitably. Gain, not
     * constancy, is the right objective; constancy is a floor (MIN_FORM_FRAC), not a goal.
     * 'full' keeps the higher bar because it asserts BOTH affixes. */
    const cands: Array<{ form: SymphyiaForm; A: string; B: string; rows: number; frac: number; removed: number }> = [];
    if (fAB >= FULL_FRAC) { const z = tab[0].indexOf('\u0000'); cands.push({ form: 'full', A: tab[0].slice(0, z), B: tab[0].slice(z + 1), rows: tab[1].n, frac: fAB, removed: tab[1].removed }); }
    if (fA >= MIN_FORM_FRAC) cands.push({ form: 'tail', A: ta[0], B: '', rows: ta[1].n, frac: fA, removed: ta[1].removed });
    if (fB >= MIN_FORM_FRAC) cands.push({ form: 'head', A: '', B: tb[0], rows: tb[1].n, frac: fB, removed: tb[1].removed });
    if (!cands.length) continue;
    /** Characters removed -> tokens saved, at o200k's ~4 chars/token for ASCII, less one
     *  token per rewritten field for the marker. A PROXY used only to rank forms and to
     *  decide whether to try a rule at all; G7 decides on measured tokens. */
    const price = (c: typeof cands[number]) => c.removed / 4 - c.rows;
    cands.sort((a, b) => price(b) - price(a) || b.frac - a.frac);
    const best = cands[0];
    if (price(best) <= 0) continue;
    rules.push({ j, i, form: best.form, A: best.A, B: best.B, rows: best.rows, eligible: e.eligible, distinctSource: e.src.size, est: Math.round(price(best)) });
  }
  rules.sort((a, b) => b.est - a.est || a.j - b.j || a.i - b.i);
  return { rules, lines, fields };
}

/* ------------------------------------------------------------------ contract */

/** Affix escaping. An affix is arbitrary payload text, so it can contain a double quote --
 *  and a contract that prints `"a"b"` is not merely unparseable, it is AMBIGUOUS: a reader
 *  cannot tell where the affix ends. G10 caught this on the round trip; the fix is to escape
 *  on the way out and unescape on the way in, so the printed contract always denotes exactly
 *  one rule set. Plausible in real data: a JSON-ish lane whose constant affix is `"name":`. */
const escAffix = (t: string) => t.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
const unescAffix = (t: string) => { let o = ''; for (let k = 0; k < t.length; k++) { if (t[k] === '\\' && k + 1 < t.length) { o += t[k + 1]; k++; continue; } o += t[k]; } return o; };
/** Read a quoted affix starting at `from`; returns its UNESCAPED value and the index after
 *  the closing quote, or null if there is no well-formed quoted string there. */
function readQuoted(t: string, from: number): { val: string; end: number } | null {
  if (t[from] !== '"') return null;
  let k = from + 1, out = '';
  while (k < t.length) {
    if (t[k] === '\\' && k + 1 < t.length) { out += t[k + 1]; k += 2; continue; }
    if (t[k] === '"') return { val: out, end: k + 1 };
    out += t[k]; k++;
  }
  return null;
}

/**
 * THE CONTRACT, AND WHY IT LOOKS LIKE THIS. Priced in bench/x90/receipts/contract-ladder.json:
 * on ls-l-real the two rewrites are equally good (F 1364 for this arm against 1363 for
 * PROSPHYSIS, one token apart on a 1394-token message), so the whole deficit against the
 * shipped number was CONTRACT TAX -- 70 tokens here against PROSPHYSIS's 31-token key.
 * Break-even is 29. Three things made the original expensive and all three are removed:
 *   - it named the codec in Greek (ΣΥΜΦΥΊΑ costs several tokens; the house style is `X74.`)
 *   - it defined BOTH T and H even when only one form was in use, and printed `""+` for an
 *     empty affix
 *   - it explained a general field-numbering convention in prose instead of stating it once
 * Each rule is now emitted in ITS OWN FORM with the affixes it actually has, the marker's
 * meaning is inlined (`text after ${marker}`) so no symbol is left undefined, and `1-based`
 * is stated because the alternative -- letting the reader guess the indexing base -- is the
 * one ambiguity that would silently bind the rule to the wrong field. Measured at 23 tokens
 * for a single tail rule, which is 8 cheaper than PROSPHYSIS's key WHILE STILL CARRYING the
 * CRC that PROSPHYSIS's key does not; the CRC itself prices at 7 tokens (ladder L4 22 vs
 * L4-noCrc 15), and it is kept because X88 measured 244 of 427 mutations decoding silently
 * wrong on an arm whose round trips were all byte-exact.
 */
export function symphyiaContract(rules: SymphyiaRule[], marker: string, crc: string): string {
  const q = (t: string) => (t === '' ? '' : `"${escAffix(t)}" + `);
  const qB = (t: string) => (t === '' ? '' : ` + "${escAffix(t)}"`);
  const body = rules.map((r) => {
    // 'full' collapses the WHOLE field to the marker, so unlike the other two forms its rule
    // text would not otherwise contain the marker at all -- and a contract that never names
    // the character it uses is not self-describing. G10 (contract round trip) caught exactly
    // this on a path no lane in the corpus exercises: openstack's and agent-history's 'full'
    // relations were both refused by G9 before ever reaching a message. Stating it as
    // `<marker> in f{j} = ...` reads as "a marker appearing in field j means the field is".
    if (r.form === 'full') return `${marker} in f${r.j} = ${q(r.A)}f${r.i}${qB(r.B)}`;
    if (r.form === 'tail') return `f${r.j} = ${q(r.A)}f${r.i} + text after ${marker}`;
    return `f${r.j} = text before ${marker} + f${r.i}${qB(r.B)}`;
  }).join('; ');
  // Two measured decisions, both priced in bench/x90/receipts/contract-ladder.json:
  //  - `(1-based)` rather than `Fields 1-based.` saves two tokens for the same statement.
  //  - `Body first.` costs three and is KEPT. The shipped message carries TWO instruction
  //    lines -- this one, then the inner frontier's own contract (`Before ¶ k=v. expand
  //    repeatedly; print only.`) -- and the body between them has its whitespace replaced by
  //    glyphs, so field-splitting it BEFORE the inner decode yields the wrong fields. The CRC
  //    makes that mistake fail closed rather than wrong, but a reader who cannot tell which
  //    instruction applies first cannot read the message, and "directly readable with no
  //    system prompt" is the claim this codec has to honour. PROSPHYSIS pays the same three
  //    tokens for the same reason (`X74. Body first. Then ...`).
  return `X90. Body first. ${body} (1-based). crc=${crc}`;
}

/* ------------------------------------------------------------------ rewrite */

interface Applied { line: string; count: number; }

/** Apply the rule set. At most one rule per field, and G4 guarantees a rule never reads
 *  a field another rule rewrote, so one left-to-right pass is total. */
export function symphyiaRewrite(text: string, rules: SymphyiaRule[], marker: string): { wire: string; rewritten: number } {
  if (!rules.length) return { wire: text, rewritten: 0 };
  const byTarget = new Map<number, SymphyiaRule>();
  for (const r of rules) byTarget.set(r.j, r);
  let rewritten = 0;
  const out = text.split('\n').map((line): Applied => {
    const f = fieldsOf(line);
    if (f.length < 2) return { line, count: 0 };
    let count = 0;
    const pieces: string[] = [];
    let at = 0;
    for (let k = 0; k < f.length; k++) {
      const fld = f[k];
      const r = byTarget.get(k + 1);
      pieces.push(line.slice(at, fld.start));
      at = fld.end;
      if (!r) { pieces.push(fld.text); continue; }
      const s = f[r.i - 1];
      if (!s) { pieces.push(fld.text); continue; }
      const p = indexOfOnce(fld.text, s.text);
      if (p < 0) { pieces.push(fld.text); continue; }
      const A = fld.text.slice(0, p), B = fld.text.slice(p + s.text.length);
      let cell: string | null = null;
      if (r.form === 'full' && A === r.A && B === r.B) cell = marker;
      else if (r.form === 'tail' && A === r.A) cell = marker + B;
      else if (r.form === 'head' && B === r.B) cell = A + marker;
      if (cell === null) { pieces.push(fld.text); continue; }
      pieces.push(cell); count++;
    }
    pieces.push(line.slice(at));
    return { line: pieces.join(''), count };
  });
  rewritten = out.reduce((a, r) => a + r.count, 0);
  return { wire: out.map((r) => r.line).join('\n'), rewritten };
}

/* ------------------------------------------------------- contract parser */

export interface SymphyiaContractParts { rules: SymphyiaRule[]; marker: string; crc: string; }

/**
 * PARSE THE CONTRACT BACK OUT OF A MESSAGE'S FIRST LINE. This exists for two reasons and
 * the second is the important one.
 *
 * 1. `tagstackDecode` has to invert an X90 message, and the only thing it is given is the
 *    message -- the rules are not carried alongside it as data. Without this, the arm would
 *    ship messages the stack's own decoder cannot read: `admit()` only checks the
 *    ENCODE-side claim `cand.decoded === text`, so a missing inverse is invisible to the
 *    gate and fatal to the reader. That is the silent-wrong class X88 paid to learn.
 *
 * 2. It is the executable form of the claim that the contract is SELF-DESCIBING. A reader
 *    with no system prompt, no skills.md and no access to this repository must be able to
 *    do what this function does using only the printed line. `bench/x90/coldread.py` is an
 *    independent implementation of the same grammar in a second language; if the two agree
 *    byte for byte on the corpus, the contract really does carry the whole decoder, which is
 *    the property ctxfold's July 2026 changelog reports models losing when a fold factors
 *    data rather than syntax.
 *
 * Returns null rather than guessing on anything it cannot parse exactly.
 */
export function symphyiaParseContract(line: string): SymphyiaContractParts | null {
  if (!line.startsWith('X90.')) return null;
  const crcM = / crc=([0-9a-f]{8})$/.exec(line);
  if (!crcM) return null;
  const crc = crcM[1];
  let mid = line.slice(4, line.length - crcM[0].length);
  if (!mid.startsWith(' Body first. ')) return null;
  mid = mid.slice(' Body first. '.length);
  if (!mid.endsWith(' (1-based).')) return null;
  mid = mid.slice(0, -' (1-based).'.length);

  const qAt = readQuoted;
  const rules: SymphyiaRule[] = [];
  let marker = '';
  for (const rawPart of mid.split('; ')) {
    // a 'full' rule leads with the marker it uses: `<marker> in f{j} = ...`
    let part = rawPart;
    const lead = /^(.+?) in (f\d+ = .+)$/.exec(part);
    if (lead) {
      if ([...lead[1]].length !== 1) return null;
      if (marker && marker !== lead[1]) return null;
      marker = lead[1];
      part = lead[2];
    }
    const m = /^f(\d+) = (.+)$/.exec(part);
    if (!m) return null;
    const j = Number(m[1]);
    let rhs = m[2];
    let form: SymphyiaForm, A = '', B = '';
    const afterIdx = rhs.indexOf(' + text after ');
    const beforeIdx = rhs.indexOf('text before ');
    if (afterIdx >= 0) {
      form = 'tail';
      const mk = rhs.slice(afterIdx + ' + text after '.length);
      if ([...mk].length !== 1) return null;
      if (marker && marker !== mk) return null;
      marker = mk;
      rhs = rhs.slice(0, afterIdx);
      if (rhs.startsWith('"')) { const q = qAt(rhs, 0); if (!q) return null; A = q.val; rhs = rhs.slice(q.end); if (!rhs.startsWith(' + ')) return null; rhs = rhs.slice(3); }
    } else if (beforeIdx >= 0) {
      form = 'head';
      if (!rhs.startsWith('text before ')) return null;
      const rest = rhs.slice('text before '.length);
      const sp = rest.indexOf(' + f');
      if (sp < 0) return null;
      const mk = rest.slice(0, sp);
      if ([...mk].length !== 1) return null;
      if (marker && marker !== mk) return null;
      marker = mk;
      rhs = rest.slice(sp + 3);
      const tailM = /^ \+ "(.*)"$/.exec(rhs.replace(/^(f\d+)/, '$1'));
      const fi = /^f(\d+)/.exec(rhs);
      if (!fi) return null;
      const afterF = rhs.slice(fi[0].length);
      if (afterF !== '') {
        if (!afterF.startsWith(' + ')) return null;
        const qb = readQuoted(afterF, 3);
        if (!qb || qb.end !== afterF.length) return null;
        B = qb.val;
      }
      void tailM;
      rules.push({ j, i: Number(fi[1]), form, A, B, rows: 0, eligible: 0, distinctSource: 0, est: 0 });
      continue;
    } else {
      form = 'full';
      if (rhs.startsWith('"')) { const q = qAt(rhs, 0); if (!q) return null; A = q.val; rhs = rhs.slice(q.end); if (!rhs.startsWith(' + ')) return null; rhs = rhs.slice(3); }
      // the trailing affix, if any: find the LAST well-formed quoted tail, scanning back so
      // an escaped quote inside it cannot be mistaken for the close
      for (let cut = rhs.length - 3; cut >= 0; cut--) {
        if (rhs[cut] !== '"' || cut < 3 || rhs.slice(cut - 3, cut) !== ' + ') continue;
        const qb = readQuoted(rhs, cut);
        if (qb && qb.end === rhs.length) { B = qb.val; rhs = rhs.slice(0, cut - 3); break; }
      }
    }
    const fi = /^f(\d+)$/.exec(rhs);
    if (!fi) return null;
    rules.push({ j, i: Number(fi[1]), form, A, B, rows: 0, eligible: 0, distinctSource: 0, est: 0 });
  }
  if (!rules.length || !marker) return null;
  return { rules, marker, crc };
}

/** Round trip the contract itself: the printed line must parse back to the rules that made
 *  it, or the message is not self-describing and must not ship. */
export function symphyiaContractRoundTrips(rules: SymphyiaRule[], marker: string, crc: string): boolean {
  const back = symphyiaParseContract(symphyiaContract(rules, marker, crc));
  if (!back || back.marker !== marker || back.crc !== crc || back.rules.length !== rules.length) return false;
  // Compare only the affixes the FORM actually uses. 'tail' fixes A and leaves B to the
  // payload; 'head' fixes B and leaves A; 'full' fixes both. A rule carrying a stray affix
  // its form ignores (which the fit never produces, but a caller could) is not a different
  // rule, and refusing it would be a spurious G10 failure rather than a real one.
  return back.rules.every((r, k) => {
    const o = rules[k];
    if (r.j !== o.j || r.i !== o.i || r.form !== o.form) return false;
    if (r.form !== 'head' && r.A !== o.A) return false;
    if (r.form !== 'tail' && r.B !== o.B) return false;
    return true;
  });
}

/* ------------------------------------------------------------------ decode */

/** The total inverse. Returns null on anything malformed rather than approximating: a
 *  marker with no sibling, a rule referencing an absent field, a failed CRC. */
export function symphyiaDecodeWire(wire: string, rules: SymphyiaRule[], marker: string, crc: string): string | null {
  const byTarget = new Map<number, SymphyiaRule>();
  for (const r of rules) {
    if (byTarget.has(r.j)) return null;
    byTarget.set(r.j, r);
  }
  for (const r of rules) if (byTarget.has(r.i)) return null;              // G4, re-checked on decode
  const out = wire.split('\n').map((line) => {
    if (!line.includes(marker)) return line;
    const f = fieldsOf(line);
    const pieces: string[] = [];
    let at = 0;
    for (let k = 0; k < f.length; k++) {
      const fld = f[k];
      pieces.push(line.slice(at, fld.start));
      at = fld.end;
      const t = fld.text;
      const m = t.indexOf(marker);
      if (m < 0) { pieces.push(t); continue; }
      const r = byTarget.get(k + 1);
      if (!r) return null;                                                // marker with no rule
      const s = f[r.i - 1];
      if (!s) return null;
      const H = t.slice(0, m), T = t.slice(m + marker.length);
      let full: string;
      if (r.form === 'full') { if (t !== marker) return null; full = r.A + s.text + r.B; }
      else if (r.form === 'tail') { if (H !== '') return null; full = r.A + s.text + T; }
      else { if (T !== '') return null; full = H + s.text + r.B; }
      pieces.push(full);
    }
    pieces.push(line.slice(at));
    return pieces.join('');
  });
  if (out.some((l) => l === null)) return null;
  const text = out.join('\n');
  if (crcOf(text) !== crc) return null;   // G8, last
  return text;
}

/* ------------------------------------------------------------------ encode */

/**
 * @param incumbentTokens the complete-message cost to beat. The X90 chain passes the
 *        incumbent it already holds, which is why this candidate costs ONE frontier call
 *        and not two; when omitted (standalone, or as a registry arm) the frontier is
 *        measured here so G7 still has something to compare against.
 */
export function symphyiaEncode(text: string, enc: EncodingName = 'o200k_base', incumbentTokens: number | null = null): SymphyiaResult {
  const refuse = (notes: string, frontier?: TagstackResult): SymphyiaResult => ({
    codec: 'symphyia',
    wire: frontier ? frontier.message : text,
    message: frontier ? frontier.message : text,
    decoded: frontier ? frontier.decoded : text,
    exact: frontier ? frontier.decoded === text : true,
    applied: false, rules: [], rewritten: 0, contractTokens: 0,
    messageTokens: frontier ? frontier.messageTokens : countTokens(text, enc),
    frontierTokens: frontier ? frontier.messageTokens : countTokens(text, enc),
    frontierParent: frontier ? frontier.parentCodec : 'identity',
    crc: '', notes,
  });

  // The fit is pure CPU work and runs BEFORE any frontier call, so on the great majority
  // of lanes this candidate costs microseconds and cannot slow the stack down.
  const fit = symphyiaFit(text);
  if (!fit.rules.length) return refuse('symphyia: no cross-field template relation reaches support');

  const marker = MARKERS.find((g) => !text.includes(g) && countTokens(g, enc) === 1);   // G3
  if (!marker) return refuse('symphyia: no single-token marker absent from the text');

  const baseRaw = countTokens(text, enc);
  // bounded greedy hill-climb on the RAW count: a rule is kept only if the rewritten text
  // is strictly cheaper, so the selection cannot lose against the empty rule set
  const chosen: SymphyiaRule[] = [];
  const targets = new Set<number>();
  let bestRaw = baseRaw;
  for (const r of fit.rules) {
    if (chosen.length >= MAX_RULES) break;
    if (targets.has(r.j) || targets.has(r.i)) continue;                    // G4: one rule per field, acyclic
    const trial = chosen.concat([r]);
    const w = symphyiaRewrite(text, trial, marker);
    if (w.rewritten === 0) continue;
    const contract = symphyiaContract(trial, marker, '00000000');
    const raw = countTokens(contract + '\n' + w.wire, enc);
    if (raw >= bestRaw) continue;
    bestRaw = raw; chosen.push(r); targets.add(r.j); targets.add(r.i);
  }
  if (!chosen.length) return refuse('symphyia: no rule set lowered the raw count');

  const rw = symphyiaRewrite(text, chosen, marker);
  const crc = crcOf(text);
  const contract = symphyiaContract(chosen, marker, crc);
  if (!symphyiaContractRoundTrips(chosen, marker, crc)) return refuse('symphyia: G10 contract does not parse back to its own rules');  // G10
  if (symphyiaDecodeWire(rw.wire, chosen, marker, crc) !== text) return refuse('symphyia: G5 own inverse disagrees');  // G5

  // One frontier call, on the REWRITTEN text, so the entailment compounds with whatever
  // the stack already does on this lane — PROSPHYSIS's composition, not a parallel wire.
  const inner = tagstackFrontier(rw.wire, enc);
  if (inner.decoded !== rw.wire) return refuse('symphyia: G6 frontier does not reproduce the rewritten body', inner);   // G6
  const message = `${contract}\n${inner.message}`;
  const tokens = countTokens(message, enc);

  let incumbent = incumbentTokens;
  let frontierRef: TagstackResult | undefined = inner;
  if (incumbent === null) {
    const f = tagstackFrontier(text, enc);
    incumbent = f.messageTokens; frontierRef = f;
  }
  if (tokens >= incumbent) {
    return refuse(`symphyia: G7 loses ${tokens} vs ${incumbent}`, frontierRef);                                          // G7
  }
  return {
    codec: 'symphyia', wire: message, message, decoded: text, exact: true, applied: true,
    rules: chosen, rewritten: rw.rewritten,
    contractTokens: countTokens(contract, enc),
    messageTokens: tokens, frontierTokens: incumbent,
    frontierParent: inner.parentCodec, crc,
    notes: `${chosen.length} templates over ${rw.rewritten} fields (${chosen.map((r) => `f${r.j}=${r.form}<-f${r.i}`).join(',')}); wire coded by ${inner.parentCodec}`,
  };
}
