/**
 * SYSTOLE (συστολή — "a drawing together, a contraction").
 *
 * X41. Every codec in this stack harvests redundancy: a dictionary amortises a
 * glossary entry over many occurrences, a run-length rule amortises a count
 * over many repeats, a shape rule amortises a clause over many matches. They
 * all share one precondition, that the thing removed must be REPEATED, because
 * repetition is the only way a rule has so far been able to pay for itself.
 *
 * SYSTOLE removes something that is not repeated at all. It removes the
 * separators inside structured numbers, and it can pay for each removal
 * individually, because the separator's position is not stored anywhere — it is
 * IMPLIED by the shape of the number.
 *
 * THE MEASUREMENT THAT MOTIVATED IT
 * ----------------------------------------------------------------------------
 * A pre-tokeniser accounting over the corpus (`bench/x41/diag.ts`) found that on
 * the two CSV lanes, 37–38 % of all raw tokens live inside digit runs longer
 * than three digits, and that BPE merges buy nothing there: vix has 3,408
 * pre-tokens and 3,412 tokens, one token per pre-token. That is the signature of
 * a hard floor rather than of a modelling failure, and the floor comes from the
 * o200k_base pre-tokeniser rule
 *
 *     \p{N}{1,3}
 *
 * which cuts every digit run every three characters. BPE merges never cross a
 * pre-token boundary, so "2026" is irreducibly two tokens, no matter how often
 * it occurs. Every separator sitting inside a structured number buys its own
 * pre-token on top of that:
 *
 *     "2026-09-30T07:59:52.6403938810"  ->  17 pre-tokens
 *     "20260930T0759526403938810"       ->  10 pre-tokens
 *
 * and most of the seven saved are not the five removed separators; they are the
 * DIGIT RUNS REGROUPING. "2026|09|30" costs four pre-tokens as three runs and
 * three as one run, because the three-digit cut lands differently once the
 * barriers are gone. Nothing is lost: a separator's position is a function of
 * the shape, the shape is stated once in the clause, and the digits are all
 * still there.
 *
 * WHY THIS IS NOT THE ELISION THAT ALREADY EXISTS
 * ----------------------------------------------------------------------------
 * ELLEIPSIS removes a CONSTANT — a literal repeated substring at a fixed field
 * position — and can only fire where a value repeats. SYSTOLE removes a
 * separator from numbers that may never repeat at all: on aapl every price is
 * unique, and 240 of them still give up a separator each. The two mechanisms are
 * orthogonal and compose.
 *
 * THE CONSTRAINT THAT SHAPES IT: THE READER MUST COUNT
 * ----------------------------------------------------------------------------
 * Restoring a separator means counting to a position inside a digit string, and
 * a language model counting to forty digits is a failure waiting to happen. Two
 * limits follow directly from that, and both are chosen for the reader rather
 * than for the compression ratio:
 *
 *   1. WIDTH CAP. Templates wider than SYSTOLE_MAX_DIGITS are refused. Screen 1
 *      measured what this costs: treating "," as a separator merges a whole CSV
 *      row into one template and shows −1,512 raw on vix, but the stripped form
 *      is a forty-digit blob. That measurement is refused on principle, not on
 *      arithmetic.
 *
 *   2. ONE TEMPLATE PER DIGIT COUNT. The reader identifies which template to
 *      apply by the length of the digit run it is looking at, so two shipped
 *      templates must not strip to the same length. On vix, dates ("4-2-2") and
 *      prices ("2.6") both strip to eight digits, and only one can ship: the
 *      prices, at 504 occurrences against 126, even though the dates would have
 *      paid 378. Paying 378 to keep an instruction unambiguous is the whole
 *      point — a saving the reader cannot act on is not a saving.
 *
 * A third guard is enforced mechanically rather than by argument: after
 * stripping, every maximal digit run whose length equals a shipped template's
 * digit count must be one that this transform produced. If the document
 * contains an eight-digit number of its own and we strip dates to eight digits,
 * the reader cannot tell them apart, and the template set is rejected outright.
 *
 * INVERTIBILITY
 * ----------------------------------------------------------------------------
 * `systoleUndo(systoleApply(text, T), T) === text` is verified before anything
 * ships. Separator removal is only unambiguous because the runs matched are
 * maximal over digits-and-separators, so a stripped run always stays a maximal
 * digit run in the output; the check exists to catch the case where that
 * reasoning is wrong rather than to illustrate it.
 *
 * COMPOSITION
 * ----------------------------------------------------------------------------
 * SYSTOLE is applied INSIDE PERITROPE: the text is contracted first, then
 * PERITROPE's character auction runs on the contracted text and prices its
 * exchanges against the real token count. Decoding therefore undoes PERITROPE
 * first and restores the separators afterwards. Doing it the other way round
 * does not work — if PERITROPE moves "-" onto something else first, the
 * contraction rule no longer matches anything.
 *
 * Greedy: no for template selection (every template is priced on the real token
 * count of the text it produces, and the saving is measured, not estimated) and
 * no for the parent gate (the full message is encoded twice and the worse one is
 * discarded). It is a greedy SET COVER over templates in one respect: templates
 * are considered in order of measured saving and a template that collides with
 * an already-chosen digit count is skipped rather than substituted.
 *
 * Time and CPU bound: yes. Template detection is a single regex pass with one
 * tokenization per candidate shape. The expensive part is that the parent gate
 * needs a second full PERITROPE encode of the contracted text, so encode time
 * roughly doubles on lanes where the transform looks viable; a cheap raw-saving
 * pre-filter (SYSTOLE_MIN_RAW) skips the second encode entirely on lanes where
 * it cannot possibly pay, which is most of them.
 */
import { countTokens, type EncodingName } from './bpe';
import { peritropeEncode, peritropeDecode, type PeritropePair } from './peritrope';

/** Separators considered implied-by-shape. ',' is deliberately excluded. */
export const SYSTOLE_SEPS: string[] = ['.', ':', ';', '-'];
/**
 * Widest template the reader is asked to restore by counting. Fourteen digits
 * is about where counting stops being reliable for a model working from a chat
 * box; the forty-digit row template measured on vix is refused here.
 */
export const SYSTOLE_MAX_DIGITS = 14;
/** Narrowest run worth a template: "1.2" would need a two-digit restore. */
export const SYSTOLE_MIN_DIGITS = 3;
/** A shape must occur this often to be worth a clause. */
export const SYSTOLE_MIN_COUNT = 3;
/**
 * Cheap pre-filter. If the measured saving on the RAW text is below this, the
 * second full parent encode is never run: the clause alone costs 12 tokens and
 * the stack attenuates raw savings severely, so a small raw saving has never
 * once survived the gate.
 */
export const SYSTOLE_MIN_RAW = 20;
/** Hard cap on distinct templates shipped, bounding both clause and risk. */
export const SYSTOLE_MAX_TEMPLATES = 3;

export interface SystoleTemplate {
  /** e.g. "4-2-2": digit-group sizes separated by the literal separators. */
  shape: string;
  /** total digits; the reader identifies the template by this */
  digits: number;
  /** occurrences in the source */
  count: number;
}

/**
 * A structured numeric run: digits, then one or more (separator, digits) pairs.
 *
 * Only ADJACENT DIGITS are excluded by the lookarounds. An adjacent separator is
 * fine, and excluding it was a bug that cost the single largest finding of the
 * turn: in "2026-09-30T07:59:52.6403938810" the time "07:59:52" is followed by
 * ".", and refusing it there meant find-listing showed only the date template.
 * After stripping the colons the dot still separates the two runs, so the
 * stripped form is still a maximal digit run, which is the property that makes
 * the transform invertible.
 */
const RUN = /(?<![\p{N}])\p{N}+(?:[.:;\-]\p{N}+)+(?![\p{N}])/gu;
const SEPSET = new Set(SYSTOLE_SEPS);

/**
 * Every run the transform will consider, left to right.
 *
 * A maximal run that is wider than the reader can count is TRIMMED from the
 * right at separator boundaries until it fits, and scanning resumes after the
 * trimmed run. Without this the 16-digit "07:59:52.6403938810" would be refused
 * wholesale and the six-digit "07:59:52" inside it would never be seen. Trimming
 * at a separator (rather than at an arbitrary digit) keeps the remainder
 * separated from what follows, so maximality survives.
 */
export function systoleRuns(text: string): Array<{ at: number; len: number; s: string }> {
  const out: Array<{ at: number; len: number; s: string }> = [];
  let from = 0;
  for (;;) {
    RUN.lastIndex = from;
    const m = RUN.exec(text);
    if (!m) break;
    const at = m.index;
    let s = m[0];
    // trim at separator boundaries until the digit count is countable
    while (systoleDigits(systoleShapeOf(s)) > SYSTOLE_MAX_DIGITS) {
      const cuts = [...s].map((c, i) => (SEPSET.has(c) ? i : -1)).filter((i) => i > 0);
      if (!cuts.length) { s = ''; break; }
      s = s.slice(0, cuts[cuts.length - 1]);
    }
    if (!s) { from = at + m[0].length; continue; }
    if (systoleDigits(systoleShapeOf(s)) >= SYSTOLE_MIN_DIGITS) {
      out.push({ at, len: s.length, s });
      from = at + s.length;
    } else {
      from = at + m[0].length;
    }
  }
  return out;
}

function isDigit(ch: string): boolean { return /\p{N}/u.test(ch); }

/** "2026-09-30" -> "4-2-2" */
export function systoleShapeOf(s: string): string {
  let out = '', n = 0;
  for (const ch of s) {
    if (isDigit(ch)) n++;
    else { if (n) { out += String(n); n = 0; } out += ch; }
  }
  if (n) out += String(n);
  return out;
}

/** "4-2-2" -> 8 */
export function systoleDigits(shape: string): number {
  let d = 0, n = '';
  for (const ch of shape) {
    if (isDigit(ch)) n += ch;
    else { if (n) { d += Number(n); n = ''; } }
  }
  if (n) d += Number(n);
  return d;
}

/** "4-2-2" -> "####-##-##"  (each run of digits in a shape is a COUNT) */
export function systoleRender(shape: string): string {
  return shape.replace(/\p{N}+/gu, (m) => '#'.repeat(Number(m)));
}

const stripRun = (s: string) => [...s].filter((c) => !SEPSET.has(c)).join('');

/**
 * Find every candidate template, priced on the real token count.
 * Returns shapes sorted by measured saving, descending.
 */
export function systoleFind(
  text: string, enc: EncodingName,
): Array<SystoleTemplate & { save: number; sample: string }> {
  const groups = new Map<string, { n: number; ws: number; ns: number; sample: string }>();
  for (const r of systoleRuns(text)) {
    const s = r.s;
    const shape = systoleShapeOf(s);
    const digits = systoleDigits(shape);
    if (digits < SYSTOLE_MIN_DIGITS || digits > SYSTOLE_MAX_DIGITS) continue;
    const st = stripRun(s);
    let g = groups.get(shape);
    if (!g) { g = { n: 0, ws: 0, ns: 0, sample: s }; groups.set(shape, g); }
    g.n++; g.ws += countTokens(s, enc); g.ns += countTokens(st, enc);
  }
  const out: Array<SystoleTemplate & { save: number; sample: string }> = [];
  for (const [shape, g] of groups) {
    if (g.n < SYSTOLE_MIN_COUNT) continue;
    const save = g.ws - g.ns;
    if (save <= 0) continue;
    out.push({ shape, digits: systoleDigits(shape), count: g.n, save, sample: g.sample });
  }
  out.sort((a, b) => b.save - a.save);
  return out;
}

/**
 * Pick the shipped set: best-first, skipping anything whose digit count is
 * already taken. One template per digit count is what lets the reader identify
 * a stripped run by its length alone.
 */
export function systoleChoose(
  text: string, enc: EncodingName,
): Array<SystoleTemplate & { save: number; sample: string }> {
  const all = systoleFind(text, enc);
  const chosen: Array<SystoleTemplate & { save: number; sample: string }> = [];
  const used = new Set<number>();

  // Two rules, both discovered by watching a naive version lose most of the
  // gain, and both are about the reader rather than the ratio.
  //
  //  SKIP, do not truncate. A template that cannot be read back is skipped, not
  //  allowed to end the list. Truncating from the end threw away
  //  find-listing's date template (8 digits, 360 raw) along with its time
  //  template (6 digits, 360 raw) merely because the six-digit size column
  //  collides with the latter.
  //
  //  ITERATE TO A FIXED POINT. Ambiguity is not monotone in the template set,
  //  so a single pass is wrong. On aapl the date template "4-2-2" is ambiguous
  //  ON ITS OWN, because the decimal part of "77.44539475" then survives as a
  //  native eight-digit run -- but it is perfectly readable once the price
  //  template "2.8" is shipped too, since that same run becomes part of a
  //  ten-digit one. A single best-first pass rejects the date and keeps 201 of
  //  915 available raw tokens; the fixed point keeps all 915.
  //  A WEAK TEMPLATE MUST NOT CLAIM A SLOT A STRONGER ONE IS STILL REACHING
  //  FOR. Ambiguity is not monotone, so a candidate that fails on the first
  //  pass may succeed on the second -- but only if its digit count is still
  //  free. On aapl, "2.6" (8 digits, 6 raw tokens) claimed the eight-digit slot
  //  in pass 1 while "4-2-2" (8 digits, 720 raw tokens) was still pending its
  //  second chance, and the result was 201 instead of 915. So a shape may only
  //  claim a count when no higher-saving shape of that same count is still
  //  unplaced.
  let added = true;
  while (added && chosen.length < SYSTOLE_MAX_TEMPLATES) {
    added = false;
    for (const t of all) {
      if (used.has(t.digits)) continue;
      if (chosen.length >= SYSTOLE_MAX_TEMPLATES) break;
      const blocked = all.some((u) =>
        u.digits === t.digits && u.save > t.save &&
        !chosen.includes(u));
      if (blocked) continue;
      if (!systoleUnambiguous(text, [...chosen, t])) continue;
      used.add(t.digits); chosen.push(t); added = true;
    }
  }
  return chosen;
}

/** Remove the separators from every run matching a shipped template. */
export function systoleApply(text: string, templates: SystoleTemplate[]): string {
  if (!templates.length) return text;
  const shapes = new Set(templates.map((t) => t.shape));
  let out = '';
  let last = 0;
  for (const r of systoleRuns(text)) {
    if (!shapes.has(systoleShapeOf(r.s))) continue;
    out += text.slice(last, r.at) + stripRun(r.s);
    last = r.at + r.len;
  }
  return out + text.slice(last);
}

/** Re-insert the separators by position. */
export function systoleUndo(text: string, templates: SystoleTemplate[]): string {
  if (!templates.length) return text;
  const byLen = new Map<number, string>();
  for (const t of templates) byLen.set(t.digits, t.shape);
  const RUNS = /\p{N}+/gu;
  let out = '';
  let last = 0;
  for (const m of text.matchAll(RUNS)) {
    const shape = byLen.get(m[0].length);
    if (!shape) continue;
    const at = m.index ?? 0;
    let rebuilt = '', i = 0;
    for (const part of shape.match(/\p{N}+|[^\p{N}]/gu) ?? []) {
      if (isDigit(part[0])) { rebuilt += m[0].slice(i, i + Number(part)); i += Number(part); }
      else rebuilt += part;
    }
    if (i !== m[0].length) continue;          // defensive: shape does not fit
    out += text.slice(last, at) + rebuilt;
    last = at + m[0].length;
  }
  return out + text.slice(last);
}

/**
 * Ambiguity guard. The reader identifies a stripped run by its digit count, so
 * after stripping, the number of maximal digit runs of that length must equal
 * the number we produced. Any surplus is a run the reader cannot classify.
 */
export function systoleUnambiguous(text: string, templates: SystoleTemplate[]): boolean {
  if (!templates.length) return true;
  const stripped = systoleApply(text, templates);
  if (systoleUndo(stripped, templates) !== text) return false;   // hard invertibility
  const want = new Map<number, number>();
  for (const t of templates) want.set(t.digits, (want.get(t.digits) ?? 0) + t.count);
  const got = new Map<number, number>();
  for (const m of stripped.matchAll(/\p{N}+/gu)) {
    const L = m[0].length;
    if (want.has(L)) got.set(L, (got.get(L) ?? 0) + 1);
  }
  for (const [d, w] of want) if ((got.get(d) ?? 0) !== w) return false;
  return true;
}

/**
 * The clause. Cheapest measured form (`bench/x41/screen3.ts`): a bare
 * "digits:shape" list costs 12 tokens for one template and 19 for two, against
 * 18/21 for a full sentence and 26/38 for spelled-out worked examples. Both the
 * count and the shape are given, because the count is how the reader recognises
 * a run and the shape is what it does to it.
 */
export function systoleClauseFor(templates: SystoleTemplate[]): string {
  if (!templates.length) return '';
  // NO TRAILING PERIOD, and that is a readability fix rather than a saving.
  // The clause is spliced in front of " print only.", so a written-out form
  // "8:####-##-##." leaves a reader to decide whether the final dot is the
  // sentence terminator or a fourth separator, and the two readings differ by a
  // character on every date in the file. Ending on the shape and letting
  // " print only." terminate the sentence makes the boundary a space.
  //
  // ',' is excluded from SYSTOLE_SEPS partly for this reason too: it is also
  // the list separator inside this clause, and a shape containing a comma would
  // be unparseable here rather than merely awkward to count.
  return 'Restore separators: ' +
    templates.map((t) => `${t.digits}:${systoleRender(t.shape)}`).join(', ');
}

export interface SystoleResult {
  wire: string;
  messageTokens: number;
  contract?: string;
  systole: boolean;
  systoleTemplates: SystoleTemplate[];
  systoleGain: number;
  systoleRawSave: number;
  [k: string]: any;
}

/**
 * Encode. SYSTOLE wraps PERITROPE: contract, then let PERITROPE's auction price
 * its exchanges against the contracted text.
 */
export function systoleEncode(
  text: string,
  enc: EncodingName,
  opts: Record<string, any> = {},
): SystoleResult {
  const parent: any = peritropeEncode(text, enc, opts);
  const plain: SystoleResult = {
    ...parent, systole: false, systoleTemplates: [], systoleGain: 0, systoleRawSave: 0,
  };
  if (opts.systole === false) return plain;

  const chosen = systoleChoose(text, enc);
  const rawSave = chosen.reduce((s, t) => s + t.save, 0);
  if (rawSave < SYSTOLE_MIN_RAW) return { ...plain, systoleRawSave: rawSave };

  // Drop templates until the transform is unambiguous AND invertible.
  let templates = chosen.slice();
  while (templates.length && !systoleUnambiguous(text, templates)) {
    templates = templates.slice(0, templates.length - 1);
  }
  if (!templates.length) return { ...plain, systoleRawSave: rawSave };

  let contracted: string;
  try { contracted = systoleApply(text, templates); } catch { return { ...plain, systoleRawSave: rawSave }; }
  if (contracted === text) return { ...plain, systoleRawSave: rawSave };

  let r: any;
  try { r = peritropeEncode(contracted, enc, opts); } catch { return { ...plain, systoleRawSave: rawSave }; }

  const contract: string = (r as any).contract ?? '';
  const clause = systoleClauseFor(templates);
  const clauseTok = countTokens(' ' + clause + ' print only.', enc)
    - countTokens(' print only.', enc);
  const total = r.messageTokens + clauseTok;
  if (total >= parent.messageTokens) return { ...plain, systoleRawSave: rawSave };

  const tail = 'print only.';
  return {
    ...r,
    contract: contract.endsWith(tail)
      ? contract.slice(0, contract.length - tail.length) + clause + ' ' + tail
      : contract + ' ' + clause,
    messageTokens: total,
    systole: true,
    systoleTemplates: templates,
    systoleGain: parent.messageTokens - total,
    systoleRawSave: rawSave,
  };
}

/** Decode: undo PERITROPE, then restore the separators. */
export function systoleDecode(
  wire: string,
  cfg: { stats?: any; order?: 'in' | 'out'; undo: (w: string) => string },
  opts: {
    alphabet?: string; marker?: string; marker2?: string; group?: any; framing?: any;
    ouraShape?: { sep: string; suf: number[]; minLen: number; k?: number } | null;
    ouraMode?: 'mark' | 'plain' | 'lead'; ouraSentinel?: string;
    antistrophePair?: [string, string] | null;
    peritropePairs?: PeritropePair[];
    systoleTemplates?: SystoleTemplate[];
  } = {},
): string {
  const mid = peritropeDecode(wire, cfg, opts);
  const t = opts.systoleTemplates;
  if (!t || !t.length) return mid;
  return systoleUndo(mid, t);
}
