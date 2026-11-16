/**
 * src/lib/omega/prokeno.ts — X124. ΠΡΌΚΕΝΟ (prokeno), "the space before".
 * =============================================================================
 *
 * THE JUNCTION, AND WHY IT COSTS A TOKEN
 * --------------------------------------
 * o200k's pre-tokenizer is (approximately)
 *
 *     [^\r\n\p{L}\p{N}]?\p{L}+            a letter run, with ONE optional leading
 *                                         non-letter / non-digit character
 *   | \p{N}{1,3}                          a digit run — with NO leading character
 *   |  ?[^\s\p{L}\p{N}]+[\r\n]*           a punctuation run, with one optional
 *                                         leading SPACE
 *   | \s*[\r\n]+ | \s+(?!\S) | \s+
 *
 * The letter group and the punctuation group both swallow the space in front of
 * them; the digit group does not. So a space is free before a letter and before
 * a punctuation mark, and costs a whole token before a number. Measured on the
 * repository's own counter:
 *
 *     "root root 4096"  ->  ["root", " root", " ", "409", "6"]   5 tokens
 *     "root root4096"   ->  ["root", " root", "409", "6"]        4 tokens
 *     "| id | name |"   ->  ["|", " id", " |", " name", " |"]    5 tokens  (spaces free)
 *     "Nov 12 10:34"    ->  ["Nov", " ", "12", " ", "10", ":", "34"]  7 tokens
 *
 * Every numeric field in a table therefore pays one token for its separator,
 * and nothing in this stack touches it. The existing junction codecs delete a
 * different character:
 *
 *   ΛΈΞΙΣ    the space AFTER a sentence mark in { . , ; : }   (prose orthography)
 *   ΣΤΟΙΧΟΣ  the space after a line-initial # * + - > or 1.   (markdown / lists)
 *   ΨΉΦΟΣ    the punctuation INSIDE a number ("2026-08-14" -> "20260814")
 *   ΑΕΤΌΣ    the same, learned from the document
 *   ΜΟΡΦΉ    shape rules: decimal precision, time zone, grouping, URL scheme,
 *            UUID dashes, hex colours, XML entities
 *
 * None of them removes the space BEFORE a number, because that space is not an
 * orthographic convention — it is an artifact of the tokenizer's own regex, and
 * it is invisible to anyone who has not read that regex. That is the claim to
 * novelty here, and it is the reason the win exists at all.
 *
 * THE RULE IS A FUNCTION OF ONE CHARACTER
 * ---------------------------------------
 * After elision the reader sees, for each number, exactly one character in
 * front of it, and has to decide "was there a space?". So the encoder chooses a
 * SET S of preceding characters:
 *
 *     c in S, "c 4"      ->  "c4"                 one token saved
 *     c in S, "c4"       ->  "c" + MARK + "4"     a danger, marked; the reader
 *                                                 restores "c4" and no space
 *     c not in S         ->  untouched
 *
 * Two constraints fall out of the tokenizer and out of invertibility:
 *
 *   1. A number directly after a NUMBER is never elided: the two runs would
 *      merge into one and no reader can re-split them ("12 10:34" -> "1210:34"
 *      is not recoverable). Those sites are left alone, which is also exactly
 *      what keeps the raw-level measurements in bench/x124/numspace.ts (the
 *      naive global rule, delta +659 over 29 lanes) from being a real result:
 *      most of its "saving" was merged digit runs.
 *   2. A number at line start needs no space, and says so once in the contract.
 *
 * A punctuation mark adjacent to another punctuation mark is ONE o200k token
 * (the punctuation group is a RUN), so marking a danger whose preceding
 * character is punctuation is free; marking one whose preceding character is a
 * letter costs a token. That asymmetry is why the per-class greedy below and the
 * global rule disagree so sharply, and it is measured, not assumed.
 *
 * WHY THIS IS NOT ΛΈΞΙΣ GENERALIZED
 * ---------------------------------
 * ΛΈΞΙΣ's junction is a fact about English: a sentence mark is followed by
 * exactly one space. Its danger set is "a sentence mark with no space after it"
 * (J. L., 3.14, file.ts), and it neutralises dangers by REPLACING the mark.
 * Here the junction is a fact about the tokenizer, the danger set is "a number
 * with no space before it" (libfoo.so.1, x86_64, 1.2.3-4), and a danger cannot
 * be neutralised by replacing anything, because the character in front of the
 * number carries the text's own meaning — so it is MARKED with an inserted
 * sentinel instead. Different junction, different direction, different danger
 * handling, and a different reason the junction exists.
 *
 * COMPOSITION AND GATES
 * ---------------------
 * The transform runs on the SOURCE, before the parent prices it, so whatever
 * the stack can do to "root4096" is measured rather than assumed. The reader
 * applies the junction AFTER expanding the rules (the contract says so), which
 * is what makes adjacencies created by a rule boundary safe.
 *
 *   G1 no elidable site, or the greedy finds no class worth its contract -> refuse
 *   G2 the mark must be one token and absent from the source
 *   G3 prokenoUndo(transform(text)) === text, on the transformed text itself
 *   G4 one frontier call on the transformed text; it must decode to it byte-exactly
 *   G5 prokenoUndo(frontier.decoded) === source
 *   G6 countTokens(contract + "\n" + frontier.message) must be STRICTLY smaller
 *      than the incumbent, which is the complete-message price the caller
 *      already paid for this text
 *
 * Opt-out: OMEGA_NO_PROKENO=1.
 */

import { countTokens, type EncodingName } from './bpe';
import { tagstackFrontier, type TagstackResult } from './tagstack';

/** Marks are tried in order; the first one absent from the text wins. */
const MARKS = ['~', '^', '`', '¢', '£', '¤', '¥', '§', '¨', '©', 'ª', '«', '¬', '®', '¯', '°', '±', '²', '³', '´'];

export const PROKENO_LETTER = 'LETTER';

const isDigit = (c: string): boolean => c >= '0' && c <= '9';

/**
 * The repository's payloads are ASCII ops text with occasional Latin-1 and
 * Greek/Cyrillic; `isLetter` is deliberately the tokenizer's own class
 * (\p{L}), approximated over the ranges that actually occur, because the
 * junction's cost is decided by that class and not by ours.
 */
function isLetter(c: string): boolean {
  if (c >= 'a' && c <= 'z') return true;
  if (c >= 'A' && c <= 'Z') return true;
  const cp = c.codePointAt(0);
  if (cp === undefined) return false;
  return (cp >= 0x00c0 && cp <= 0x024f)   // Latin-1 supplement + extended A/B
    || (cp >= 0x0370 && cp <= 0x03ff)     // Greek
    || (cp >= 0x0400 && cp <= 0x04ff);    // Cyrillic
}

export type ProkenoKind = 'elide' | 'danger' | 'skip';

export interface ProkenoSite {
  /** index in the source of the first digit of the run */
  at: number;
  /** the character the reader will see in front of the number after elision */
  cls: string;
  kind: ProkenoKind;
}

/**
 * Every start of a digit run, classified by what precedes it.
 *
 * `elide`  — a single space in front, and the character before that space is
 *            neither a space nor a digit, so removing the space leaves an
 *            unambiguous `c + number` adjacency.
 * `danger` — no space in front and the preceding character is not a newline,
 *            so the reader would wrongly insert one.
 * `skip`   — line start, or a digit in front (the runs would merge), or two or
 *            more spaces in front (not a single-space junction).
 */
export function prokenoSites(text: string): ProkenoSite[] {
  const out: ProkenoSite[] = [];
  for (let i = 0; i < text.length; i++) {
    if (!isDigit(text[i])) continue;
    const prev = i > 0 ? text[i - 1] : '';
    if (isDigit(prev)) continue;                      // not the start of a run
    if (prev === '' || prev === '\n' || prev === '\r') {
      out.push({ at: i, cls: 'NL', kind: 'skip' });
      continue;
    }
    if (prev === ' ' || prev === '\t') {
      const before = i > 1 ? text[i - 2] : '';
      if (before === ' ' || before === '\t' || isDigit(before) || before === '' || before === '\n' || before === '\r') {
        out.push({ at: i, cls: 'WS', kind: 'skip' });
        continue;
      }
      out.push({ at: i, cls: isLetter(before) ? PROKENO_LETTER : 'P:' + before, kind: 'elide' });
      continue;
    }
    out.push({ at: i, cls: isLetter(prev) ? PROKENO_LETTER : 'P:' + prev, kind: 'danger' });
  }
  return out;
}

/** Apply the transform for the class set `classes`. */
export function prokenoTransform(text: string, classes: Set<string>, mark: string, options: ProkenoPlanOptions = {}): string {
  if (!classes.size) return text;
  const sites = prokenoSites(text);
  if (!sites.length) return text;
  const uniq = options.uniqueOnly ? uniqueSites(text, sites) : null;
  const drop = new Set<number>();
  const ins = new Map<number, string>();
  for (const s of sites) {
    if (s.kind === 'skip' || !classes.has(s.cls)) continue;
    if (s.kind === 'elide') { if (uniq && !uniq.has(s.at)) continue; drop.add(s.at - 1); }
    else ins.set(s.at, mark);
  }
  if (!drop.size && !ins.size) return text;
  let out = '';
  for (let i = 0; i < text.length; i++) {
    const pre = ins.get(i);
    if (pre !== undefined) out += pre;
    if (drop.has(i)) continue;
    out += text[i];
  }
  return out;
}

/**
 * The reader's inverse. Applied to the EXPANDED text, not to the wire: a rule
 * boundary can create an adjacency that did not exist in the source, and the
 * contract tells the reader to expand first and then restore the junction.
 */
export function prokenoUndo(text: string, classes: Set<string>, mark: string): string {
  if (!classes.size) return text;
  // ONE pass, not two. A two-pass undo (strip the marks, then insert spaces)
  // is wrong and the self-test catches it: after the mark is stripped, the
  // number is once again preceded by the very character that says "there was a
  // space here" ("x~86" -> "x86" -> the second pass inserts a space), so the
  // marked sites have to be remembered while the marks are being removed.
  let out = '';
  let suppressed = false;
  for (let j = 0; j < text.length; j++) {
    const ch = text[j];
    if (ch === mark && j + 1 < text.length && isDigit(text[j + 1])) {
      suppressed = true;
      continue;                       // drop the mark; the number gets no space
    }
    if (isDigit(ch)) {
      const prev = j > 0 ? text[j - 1] : '';
      const startsRun = !isDigit(prev);
      if (startsRun && !suppressed && prev !== '' && prev !== '\n' && prev !== '\r' && prev !== ' ' && prev !== '\t') {
        const cls = isLetter(prev) ? PROKENO_LETTER : 'P:' + prev;
        if (classes.has(cls)) out += ' ';
      }
      suppressed = false;
    } else {
      suppressed = false;
    }
    out += ch;
  }
  return out;
}

export interface ProkenoPlan {
  classes: string[];
  mark: string;
  elided: number;
  marked: number;
  text: string;
  rawBefore: number;
  rawAfter: number;
}

/** Human-readable name of a class, for the contract. */
function className(cls: string): string {
  if (cls === PROKENO_LETTER) return 'a letter';
  if (cls.startsWith('P:')) return `"${cls.slice(2)}"`;
  return cls;
}

export function prokenoContract(classes: string[], mark: string): string {
  const list = classes.length === 1 ? className(classes[0])
    : classes.slice(0, -1).map(className).join(', ') + ' or ' + className(classes[classes.length - 1]);
  return `Space before a number that follows ${list}, not at line start or after a number; ${mark} = no space.`;
}

export function prokenoParseContract(contract: string): { classes: string[]; mark: string } | null {
  const m = contract.match(/^Space before a number that follows (.+?), not at line start or after a number; (.) = no space\.$/);
  if (!m) return null;
  const classes: string[] = [];
  for (const part of m[1].split(/, | or /)) {
    const q = part.match(/^"(.+)"$/);
    if (q) classes.push('P:' + q[1]);
    else if (part === 'a letter') classes.push(PROKENO_LETTER);
    else return null;
  }
  return { classes, mark: m[2] };
}

/**
 * A junction the parent's grammar can absorb is worth nothing: " 4096" priced
 * once as a rule costs the same as "4096" priced once. What survives is the
 * junction in a context the grammar cannot reuse, so the plan may count only
 * the sites whose neighbourhood is unique in the text. The measument that
 * motivates this is in `bench/x124/prokeno-e2e.ts`: on `psql-output` the raw
 * count drops by 72 and the complete message drops by 4, because almost every
 * "| 1 |" in that file is the same string.
 */
function uniqueSites(text: string, sites: ProkenoSite[]): Set<number> {
  const seen = new Map<string, number>();
  const WIN = 10;
  for (const st of sites) {
    if (st.kind !== 'elide') continue;
    let end = st.at;
    while (end < text.length && isDigit(text[end])) end++;
    const start = Math.max(0, st.at - WIN - 1);
    const key = text.slice(start, end);
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  const keep = new Set<number>();
  for (const st of sites) {
    if (st.kind !== 'elide') continue;
    let end = st.at;
    while (end < text.length && isDigit(text[end])) end++;
    const start = Math.max(0, st.at - WIN - 1);
    if ((seen.get(text.slice(start, end)) ?? 0) === 1) keep.add(st.at);
  }
  return keep;
}

export interface ProkenoPlanOptions {
  /** count only junctions whose neighbourhood is unique in the text */
  uniqueOnly?: boolean;
  maxRounds?: number;
}

/**
 * Choose the class set by bounded greedy ascent on the RAW token count, which
 * is the same two-stage shape ΣΥΜΦΥΊΑ uses: a cheap raw objective picks the
 * plan, and one frontier call prices it. Every class is tried once per round and
 * the best improving one is kept, so the result is a local optimum of the raw
 * objective over the (small) power set of observed classes.
 */
export function prokenoPlan(text: string, enc: EncodingName = 'o200k_base', options: ProkenoPlanOptions = {}): ProkenoPlan | null {
  const maxRounds = options.maxRounds ?? 12;
  const sites = prokenoSites(text);
  if (!sites.length) return null;
  const uniq = options.uniqueOnly ? uniqueSites(text, sites) : null;
  const byClass = new Map<string, { e: number; d: number }>();
  for (const s of sites) {
    if (s.kind === 'skip') continue;
    if (uniq && s.kind === 'elide' && !uniq.has(s.at)) continue;
    const b = byClass.get(s.cls) ?? { e: 0, d: 0 };
    if (s.kind === 'elide') b.e++; else b.d++;
    byClass.set(s.cls, b);
  }
  const candidates = [...byClass.entries()]
    .filter(([, v]) => v.e > 0)
    .sort((a, b) => (b[1].e - b[1].d) - (a[1].e - a[1].d))
    .slice(0, maxRounds);
  if (!candidates.length) return null;
  const mark = MARKS.find((m) => !text.includes(m) && countTokens(m, enc) === 1);
  if (!mark) return null;

  const rawBefore = countTokens(text, enc);
  const chosen: string[] = [];
  const set = new Set<string>();
  let bestText = text;
  let bestRaw = rawBefore;
  for (let round = 0; round < candidates.length; round++) {
    let pick: string | null = null;
    let pickText = bestText;
    let pickRaw = bestRaw;
    for (const [cls] of candidates) {
      if (set.has(cls)) continue;
      const t = new Set(set); t.add(cls);
      const cand = prokenoTransform(text, t, mark, options);
      const raw = countTokens(cand, enc);
      if (raw < pickRaw) { pickRaw = raw; pick = cls; pickText = cand; }
    }
    if (pick === null) break;
    set.add(pick); chosen.push(pick);
    bestText = pickText; bestRaw = pickRaw;
  }
  if (!chosen.length) return null;
  const sites2 = prokenoSites(text);
  let elided = 0, marked = 0;
  for (const s of sites2) {
    if (s.kind === 'skip' || !set.has(s.cls)) continue;
    if (s.kind === 'elide') elided++; else marked++;
  }
  return { classes: chosen, mark, elided, marked, text: bestText, rawBefore, rawAfter: bestRaw };
}

export interface ProkenoResult {
  codec: 'prokeno';
  applied: boolean;
  /** the complete one-chat message: contract + "\n" + parent message */
  message: string;
  decoded: string;
  exact: boolean;
  messageTokens: number;
  frontierTokens: number;
  contractTokens: number;
  classes: string[];
  mark: string;
  elided: number;
  marked: number;
  notes: string;
  frontier?: TagstackResult;
}

export function prokenoDisabled(): boolean {
  return typeof process !== 'undefined' && !!process.env && process.env.OMEGA_NO_PROKENO === '1';
}

/**
 * Encode. The incumbent is the caller's complete-message price for this text;
 * when it is null we buy one with a frontier call on the source.
 */
export function prokenoEncode(
  text: string,
  enc: EncodingName = 'o200k_base',
  incumbentTokens: number | null = null,
): ProkenoResult {
  const refuse = (notes: string, frontier?: TagstackResult): ProkenoResult => ({
    codec: 'prokeno', applied: false,
    message: frontier ? frontier.message : text,
    decoded: frontier ? frontier.decoded : text,
    exact: frontier ? frontier.decoded === text : true,
    messageTokens: frontier ? frontier.messageTokens : countTokens(text, enc),
    frontierTokens: frontier ? frontier.messageTokens : countTokens(text, enc),
    contractTokens: 0, classes: [], mark: '', elided: 0, marked: 0,
    notes, frontier,
  });

  if (prokenoDisabled()) return refuse('disabled (OMEGA_NO_PROKENO=1)');
  if (!text.length || text.length > 400_000) return refuse('length out of range');

  let plan: ProkenoPlan | null = null;
  try {
    plan = prokenoPlan(text, enc, { uniqueOnly: true });
  } catch {
    return refuse('plan threw');
  }
  if (!plan) return refuse('no elidable space-before-number junction');

  const set = new Set(plan.classes);
  // G3 — the transform is invertible on its own output, before any parent sees it.
  try {
    if (prokenoUndo(plan.text, set, plan.mark) !== text) return refuse('G3 own inverse disagrees');
  } catch {
    return refuse('G3 undo threw');
  }

  // G4/G5 — one frontier call on the rewritten text.
  let inner: TagstackResult;
  try {
    inner = tagstackFrontier(plan.text, enc);
  } catch {
    return refuse('frontier threw');
  }
  if (inner.decoded !== plan.text) return refuse('G4 frontier does not reproduce the rewritten text', inner);
  let decoded: string;
  try {
    decoded = prokenoUndo(inner.decoded, set, plan.mark);
  } catch {
    return refuse('G5 undo threw', inner);
  }
  if (decoded !== text) return refuse('G5 undo(frontier output) !== source', inner);

  const contract = prokenoContract(plan.classes, plan.mark);
  if (prokenoParseContract(contract) === null) return refuse('contract does not parse back', inner);
  const message = `${contract}\n${inner.message}`;
  const messageTokens = countTokens(message, enc);

  let incumbent = incumbentTokens;
  let frontierRef: TagstackResult | undefined = inner;
  if (incumbent === null) {
    const f = tagstackFrontier(text, enc);
    incumbent = f.messageTokens; frontierRef = f;
  }
  if (messageTokens >= incumbent) {
    return refuse(`G6 loses ${messageTokens} vs ${incumbent} (raw ${plan.rawBefore}->${plan.rawAfter})`, frontierRef);
  }
  return {
    codec: 'prokeno', applied: true, message, decoded, exact: true,
    messageTokens, frontierTokens: incumbent,
    contractTokens: countTokens(contract, enc),
    classes: plan.classes, mark: plan.mark, elided: plan.elided, marked: plan.marked,
    notes: `ΠΡΌΚΕΝΟ ${plan.classes.join('+')} mark=${plan.mark} elided ${plan.elided} marked ${plan.marked} ` +
      `raw ${plan.rawBefore}->${plan.rawAfter}; M ${incumbent}->${messageTokens}; wire by ${(inner as any).parentCodec ?? 'frontier'}`,
    frontier: inner,
  };
}

/** Round-trip and contract-parse assertions over the repository's own lanes. */
export function prokenoSelfTest(enc: EncodingName = 'o200k_base'): { pass: number; fail: number; log: string[] } {
  const log: string[] = [];
  let pass = 0, fail = 0;
  const check = (name: string, cond: boolean): void => {
    if (cond) { pass++; log.push(`ok   ${name}`); } else { fail++; log.push(`FAIL ${name}`); }
  };
  const cases = [
    'root root 4096 Nov 12 10:34 libfoo.so.1\n',
    'a 1 b 2 c3 d 4\n',
    'no numbers here at all\n',
    '1 2 3 4 5\n',
    'x86_64 libfoo2 1.2.3-4 v1.2\n',
    '| 1 | 2 | 3 |\n',
    '4096\t4097  4098\n',
    '',
  ];
  for (const src of cases) {
    const sites = prokenoSites(src);
    const byClass = new Map<string, Set<string>>();
    for (const s of sites) {
      if (s.kind === 'skip') continue;
      const k = byClass.get(s.cls) ?? new Set<string>();
      k.add(s.kind); byClass.set(s.cls, k);
    }
    for (const cls of byClass.keys()) {
      const t = prokenoTransform(src, new Set([cls]), '~');
      check(`undo(${JSON.stringify(src).slice(0, 24)}, ${cls})`, prokenoUndo(t, new Set([cls]), '~') === src);
    }
    // never elide across a digit boundary
    let ok = true;
    for (const s of sites) if (s.kind === 'elide' && s.at >= 2 && isDigit(src[s.at - 2])) ok = false;
    check(`no digit-run merge ${JSON.stringify(src).slice(0, 18)}`, ok);
  }
  const c = prokenoContract([PROKENO_LETTER, 'P:|'], '~');
  const p = prokenoParseContract(c);
  check('contract parses back', !!p && p.mark === '~' && p.classes.length === 2 && p.classes[0] === PROKENO_LETTER && p.classes[1] === 'P:|');
  check('mark is one token', countTokens('~', enc) === 1);
  return { pass, fail, log };
}
