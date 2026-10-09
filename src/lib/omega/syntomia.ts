/**
 * src/lib/omega/syntomia.ts
 * =============================================================================
 * SYNTOMIA — MINIMAL-SUFFICIENT-CONTRACT CODEC
 * (exact, byte-perfect, single-chat-readable, no system prompt)
 * -----------------------------------------------------------------------------
 *
 * συντομία — the classical rhetorical virtue of concision: saying exactly
 * what is necessary and not one word more.  That is the whole mechanism.
 *
 *
 * THE SEAM
 * -----------------------------------------------------------------------------
 * Every lossless lane in this repository ships its decode rule *inside the
 * message*, because the operator constraint forbids a system prompt.  That
 * rule is a fixed cost, paid once per message, and nobody has ever optimised
 * it.  MEASURED this session (bench/w14-ctr.ts, o200k_base, 16 documents):
 *
 *     METATRON contract, mean over engaged lanes .................. 40.6 tok
 *     range ....................................................... 38 - 49 tok
 *
 * and the CHIRON rules clause verbatim is
 *
 *     "Every new Cyrillic letter before ¶ starts a rule whose text runs to
 *      the next new letter or to ¶. In the text after ¶ expand every rule,
 *      repeatedly, and print only the result."                      = 40 tok
 *
 * Two consequences, both measured:
 *
 *  (1) A FLAT TAX.  On `bench/holdout-work/kb-article.txt` (656 tok of plain
 *      business prose) the incumbent finds a 44-token wire gain and then hands
 *      39 of it back to the contract.  Net saving: 5 tokens, 0.8%.
 *
 *  (2) A GATE THAT FIRES TOO EARLY.  Every lane refuses to compress when its
 *      wire gain is below ITS OWN contract, and emits the raw document.  That
 *      is why `lic-mit` (223 tok), `md-react` (252) and `md-vite` (274) come
 *      back at exactly 0.0% from the entire 170-codec stack — even though an
 *      exact-measurement dictionary search (bench/w14-opt2.ts) finds a
 *      27-token wire gain on md-vite.  The gain exists; the contract eats it.
 *
 * Short documents are the common case in a chat box.  A constant that is
 * larger than the entire achievable gain on a 250-token message is not a
 * rounding error, it is the binding constraint.
 *
 *
 * THE MECHANISM
 * -----------------------------------------------------------------------------
 *  A. CONTRACT MINIMISATION.  A clause-by-clause minimal-complete restatement
 *     of the CHIRON decode contract, measured against the live tokenizer, with
 *     the adaptive op clauses preserved and one new adaptivity: the word
 *     "repeatedly" is emitted only when a rule's text actually contains
 *     another rule's glyph (verified by scanning the tape), because a flat
 *     rule set does not need it.
 *         rules-only, flat tape ..... 40 -> 21 tokens
 *         rules-only, nested tape ... 40 -> 23 tokens
 *     The statement remains complete: it names the script, the delimiter rule,
 *     the scope, the operation and the output discipline.
 *
 *  B. GATE RE-RUN.  The incumbent's accept/decline decision is re-evaluated
 *     against SYNTOMIA's contract instead of its own, which re-admits every
 *     document whose wire gain sits in the 21..40 band.
 *
 *  C. OWN SEARCH FOR THE RE-ADMITTED.  Those documents were never given a
 *     wire at all (the incumbent returns raw), so SYNTOMIA runs its own
 *     dictionary search for them: all maximal repeats from a suffix array,
 *     then a greedy whose every candidate is scored by actually tokenising the
 *     resulting body — no estimated gains.  It emits a plain CHIRON wire.
 *
 *  D. INHERITED CORRECTNESS.  SYNTOMIA never invents a wire grammar.  Every
 *     wire it emits is a CHIRON wire and is decoded by the shipped, already
 *     red-teamed `chironDecode`.  The novelty is entirely in what is *said*
 *     about that wire and in *when* the wire is allowed to be used.
 *
 *  E. TOURNAMENT.  identity / incumbent / re-contracted incumbent / own search
 *     — every arm decoded and byte-compared, cheapest wins.  SYNTOMIA is a
 *     minimum over a set containing the incumbent, so it cannot be worse.
 *
 *
 * WHAT IS *NOT* CLAIMED
 * -----------------------------------------------------------------------------
 * This lane adds no new compression mechanism.  Six were built and measured
 * this session and all of them lost to the incumbent's existing search; the
 * negative results are recorded in bench/syntomia-report.md §D, including the
 * two that looked most promising (in-place appositive binding, and a
 * transposed glyph-run tape).  The honest finding is that the *substitution*
 * frontier in this repository is closed and the *metadata* frontier was never
 * opened.  SYNTOMIA opens it.
 * =============================================================================
 */

import { countTokens, type EncodingName } from './bpe';
import {
  CHIRON_START, CHIRON_SEP, CHIRON_REP, CHIRON_LIST, CHIRON_SCRIPTS,
  chironDecode, chironOpsUsed, chironParseTape, chironInScript,
} from './chiron';
import { metatronEncode } from './metatron';

/* ---------------------------------------------------------------------------
 * 0. MINIMAL-COMPLETE CONTRACT
 * ------------------------------------------------------------------------- */

/**
 * The rules clause.  Compare with CHIRON's 40-token original quoted in the
 * header.  Every element of the original is preserved:
 *   - which characters are rule names        -> "{letter}"
 *   - where the tape is                      -> "before ¶"
 *   - how entries are delimited              -> "runs to the next new letter or ¶"
 *   - the scope of expansion                 -> "after ¶"
 *   - recursion, only when the tape nests    -> "repeatedly"
 *   - output discipline                      -> "print only the result"
 */
/**
 * Is the generic wording "foreign letter" sound for this wire?
 *
 * RED-TEAM FINDING (bench/syntomia_decode.py, this session).  "foreign letter"
 * is NOT always equivalent to CHIRON's script-named label, for two reasons the
 * independent CPython reader exposed:
 *
 *  (a) if the SOURCE document itself contains non-Latin characters, a reader
 *      cannot tell a rule name from source content.  md-vite.txt (emoji) broke
 *      here.
 *  (b) CHIRON's glyph pools are CODE-POINT RANGES, so they contain Devanagari
 *      combining marks, which are not letters in any reader's sense.  The
 *      aapl-2014.csv wire broke here.
 *
 * Both are checked exactly at encode time.  When either fails the clause falls
 * back to CHIRON's script-named label, which is still shortened in phrasing.
 */
export function genericWordingIsSound(wire: string, source: string): boolean {
  for (const ch of source) if ((ch.codePointAt(0) ?? 0) >= 0x0180) return false;
  if (!wire.startsWith(CHIRON_START)) return false;
  const k = wire.indexOf(CHIRON_SEP);
  if (k < 0) return false;
  const tape = wire.slice(1, k);
  if (!tape.length) return false;
  const sc = scriptOfChar(tape[0]);
  if (!sc) return false;
  const rules = chironParseTape(tape, sc);
  if (!rules) return false;
  for (const r of rules) if (!/^\p{L}$/u.test(r.glyph)) return false;
  return true;
}

export function syntomiaRulesClause(_letterLabel: string, nested: boolean): string {
  // MEASURED (bench/w14-clause.ts, bench/w14-clause2.ts, o200k_base):
  //   CHIRON names the script, and the polyglot label alone
  //   ("Greek, Hebrew, Armenian, Georgian, Thai or Indic letter") costs 12
  //   tokens, pushing that clause to 48.  "foreign letter" costs 2 and is
  //   just as unambiguous: in a wire whose body is English/ASCII, the rule
  //   names are the only non-English characters present.
  //   CHIRON clause  38 (most scripts) / 48 (polyglot)
  //   SYNTOMIA       24 flat / 25 nested
  const who = _letterLabel ? _letterLabel : 'foreign letter';
  return nested
    ? `Before ${CHIRON_SEP} a new ${who} labels text up to the next new letter. After ${CHIRON_SEP} expand all repeatedly; print result only.`
    : `Before ${CHIRON_SEP} a new ${who} labels text up to the next new letter. After ${CHIRON_SEP} expand all; print result only.`;
}

/**
 * GLYPH LETTERISATION.  Re-assign any rule name that is not a Unicode letter
 * (CHIRON's pools are code-point ranges and admit combining marks) to a fresh
 * in-script letter.  Pure 1:1 character substitution on the wire; the result
 * is re-decoded and byte-compared before use.
 */
export function letteriseGlyphs(wire: string, enc: EncodingName): string | null {
  if (!wire.startsWith(CHIRON_START)) return null;
  const k = wire.indexOf(CHIRON_SEP);
  if (k < 0) return null;
  const tape = wire.slice(1, k);
  if (!tape.length) return null;
  const sc = scriptOfChar(tape[0]);
  if (!sc) return null;
  const rules = chironParseTape(tape, sc);
  if (!rules) return null;
  const bad = rules.filter((r) => !/^\p{L}$/u.test(r.glyph));
  if (!bad.length) return null;
  const used = new Set<string>([...wire]);
  const pool = glyphPool(enc, sc.name).filter((g) => /^\p{L}$/u.test(g) && !used.has(g));
  if (pool.length < bad.length) return null;
  let out = wire;
  bad.forEach((r, i) => { out = out.split(r.glyph).join(pool[i]); });
  return out;
}

export function syntomiaNoRulesClause(): string {
  return `Print the text after ${CHIRON_SEP} unchanged.`;
}

/** Does any rule text contain another rule's glyph?  Only then is "repeatedly" needed. */
export function tapeIsNested(wire: string): boolean {
  if (!wire.startsWith(CHIRON_START)) return false;
  const k = wire.indexOf(CHIRON_SEP);
  if (k < 0) return false;
  const tape = wire.slice(1, k);
  if (!tape.length) return false;
  const sc = scriptOfChar(tape[0]);
  if (!sc) return false;
  const rules = chironParseTape(tape, sc);
  if (!rules) return true;                       // unknown -> be conservative
  const glyphs = new Set(rules.map((r) => r.glyph));
  for (const r of rules) for (const ch of r.raw) if (glyphs.has(ch)) return true;
  return false;
}

export function scriptOfChar(ch: string) {
  const cp = ch.codePointAt(0);
  if (cp === undefined) return null;
  for (const s of CHIRON_SCRIPTS) if (chironInScript(s, cp)) return s;
  return null;
}

/**
 * The full minimal contract for a given CHIRON wire.  Op clauses are carried
 * over from CHIRON verbatim where they are already terse, shortened where the
 * live tokenizer says a shorter wording is equivalent and complete.
 */
export function syntomiaContract(wire: string, source?: string): string {
  const u = chironOpsUsed(wire);
  const generic = source !== undefined && genericWordingIsSound(wire, source);
  const letter = generic ? '' : (u.script ?? CHIRON_SCRIPTS[0]).label;
  const cl: string[] = [];
  cl.push(u.rules ? syntomiaRulesClause(letter, tapeIsNested(wire)) : syntomiaNoRulesClause());
  // op clauses: same semantics, measured-shorter wording
  //   rep       8 -> 7      rep+fill 31 -> 23
  //   range    10 -> 9      split    12 -> 12     both 19 -> 18
  if (u.rep) {
    cl.push(u.fill
      ? `${CHIRON_REP}btn = t n times; letters after n are lists, copy i takes item i of each, cycling.`
      : `${CHIRON_REP}btn = t n times.`);
  }
  if (u.range && u.split) cl.push(`${CHIRON_LIST}a..b = a to b, else the char after ${CHIRON_LIST} splits the items.`);
  else if (u.range) cl.push(`${CHIRON_LIST}a..b = a to b.`);
  else if (u.split) cl.push(`In a list the char right after ${CHIRON_LIST} splits the items.`);
  return cl.join(' ');
}

/**
 * GENERIC CONTRACT REWRITE.
 *
 * Not every incumbent wire is a plain CHIRON wire — METATRON's composed arms
 * append their own legend to CHIRON's clause, e.g.
 *     "...print only the result.; ◈→###; ◇→##; ☑→- [x]; ☐→- [ ]"
 * (63 tokens on bench/holdout-work/llm-answer.md).  This pass rewrites the
 * ENGLISH only; the wire is untouched, so decode semantics are bit-identical
 * by construction.  Each rewrite is a hand-authored paraphrase of the clause
 * it replaces, and the result is measured, never assumed.
 *
 *   CHIRON rules clause        38-48  ->  24 / 25
 *   "; X→Y; X→Y" legend list   24     ->  19   (per four entries)
 *   ×btn / …a..b op clauses    8-31   ->  7-23
 */
const CHIRON_RULES_RE =
  /Every new [^.]{0,80}? before ¶ starts a rule whose text runs to the next new letter or to ¶\. In the text after ¶ expand every rule, repeatedly, and print only the result\./;

export function syntomiaRewriteContract(contract: string, nested: boolean, label = ''): string {
  let c = contract;
  c = c.replace(CHIRON_RULES_RE, syntomiaRulesClause(label, nested));
  c = c.replace(`${CHIRON_REP}btn: t written n times. Any letters after n are lists; in copy i the k-th b is item i of list k, cycling.`,
                `${CHIRON_REP}btn = t n times; letters after n are lists, copy i takes item i of each, cycling.`);
  c = c.replace(`${CHIRON_REP}btn: t written n times.`, `${CHIRON_REP}btn = t n times.`);
  c = c.replace(`${CHIRON_LIST}a..b = integers a to b. Otherwise the character after ${CHIRON_LIST} separates the items.`,
                `${CHIRON_LIST}a..b = a to b, else the char after ${CHIRON_LIST} splits the items.`);
  c = c.replace(`${CHIRON_LIST}a..b = integers a to b.`, `${CHIRON_LIST}a..b = a to b.`);
  c = c.replace(`In a list the character right after ${CHIRON_LIST} separates the items.`,
                `In a list the char right after ${CHIRON_LIST} splits the items.`);
  // "; X→Y; X→Y" legend tail -> " X=Y X=Y"
  if (/;\s*\S+→/.test(c)) c = c.replace(/;\s*(\S+?)→/g, ' $1=');
  return c.replace(/\s+$/, '');
}

/**
 * LEGEND FUSION.
 *
 * METATRON's composed "structure-*" arms emit a CHIRON wire plus their own
 * trailing legend in the English contract:
 *     "...print only the result.; ◈→###; ◇→##; ☑→- [x]; ☐→- [ ]"
 * That tail is 24 tokens of contract describing four substitutions that are
 * *already* expressible as ordinary CHIRON rules.  Fusing them into the tape
 * removes the tail entirely and leaves one 24-token contract instead of 63.
 * The wire changes (new glyphs), so the result is re-decoded and byte-compared
 * before it is allowed to compete.
 */
export function syntomiaFuseLegend(
  wire: string, contract: string, enc: EncodingName, source?: string,
): { wire: string; contract: string } | null {
  if (!wire.startsWith(CHIRON_START)) return null;
  const k = wire.indexOf(CHIRON_SEP);
  if (k < 0) return null;
  const pairs: Array<[string, string]> = [];
  const re = /;\s*(\S+?)→((?:(?!;\s*\S+?→)[\s\S])*)/g;
  let m: RegExpExecArray | null;
  let firstAt = -1;
  while ((m = re.exec(contract)) !== null) {
    if (firstAt < 0) firstAt = m.index;
    pairs.push([m[1], m[2]]);
  }
  if (!pairs.length || firstAt < 0) return null;

  const tape = wire.slice(1, k);
  const body = wire.slice(k + 1);
  const sc = tape.length ? scriptOfChar(tape[0]) : null;
  if (!sc) return null;
  const used = new Set<string>([...wire]);
  const pool = glyphPool(enc, sc.name).filter((g) => !used.has(g));
  if (pool.length < pairs.length) return null;

  let newTape = tape;
  let newBody = body;
  let pi = 0;
  for (const [sigil, text] of pairs) {
    if (!newBody.includes(sigil) && !newTape.includes(sigil)) continue;
    if (text.length === 0) return null;
    // a rule text containing an unused in-script glyph would break tape parsing
    if ([...text].some((c) => { const sx = scriptOfChar(c); return !!sx && sx.name === sc.name; })) return null;
    const g = pool[pi++];
    newTape += g + text;
    newBody = newBody.split(sigil).join(g);
    newTape = newTape.split(sigil).join(g);
  }
  if (pi === 0) return null;
  const w = CHIRON_START + newTape + CHIRON_SEP + newBody;
  const head = contract.slice(0, firstAt).replace(/\s+$/, '');
  const genericOk = source !== undefined && genericWordingIsSound(w, source);
  return { wire: w, contract: syntomiaRewriteContract(head, tapeIsNested(w),
    genericOk ? '' : ((chironOpsUsed(w).script ?? CHIRON_SCRIPTS[0]).label)) };
}

export function syntomiaDecoderPrompt(wire: string): string {
  return wire + '\n' + syntomiaContract(wire);
}

/** SYNTOMIA emits CHIRON wires; correctness is inherited, not re-derived. */
export const syntomiaDecode = chironDecode;

/* ---------------------------------------------------------------------------
 * 1. OWN SEARCH — for documents the incumbent declines outright
 *
 * Suffix array -> LCP -> every maximal repeat, then a greedy in which each
 * candidate is scored by actually re-tokenising the body it would produce.
 * No estimated gains anywhere: a naive gain model (bench/w14-optdict.ts) was
 * built first and made every lane WORSE, because substituting a glyph destroys
 * merges in the surrounding text that a length-based estimate cannot see.
 * ------------------------------------------------------------------------- */

function suffixArray(s: string): number[] {
  const n = s.length;
  const sa = Array.from({ length: n }, (_, i) => i);
  let rank = new Int32Array(n);
  for (let i = 0; i < n; i++) rank[i] = s.charCodeAt(i);
  const tmp = new Int32Array(n);
  for (let k = 1; k < 2 * n; k <<= 1) {
    const cmp = (a: number, b: number) => {
      if (rank[a] !== rank[b]) return rank[a] - rank[b];
      const ra = a + k < n ? rank[a + k] : -1;
      const rb = b + k < n ? rank[b + k] : -1;
      return ra - rb;
    };
    sa.sort(cmp);
    tmp[sa[0]] = 0;
    for (let i = 1; i < n; i++) tmp[sa[i]] = tmp[sa[i - 1]] + (cmp(sa[i - 1], sa[i]) < 0 ? 1 : 0);
    rank.set(tmp);
    if (rank[sa[n - 1]] === n - 1) break;
  }
  return sa;
}

function lcpArray(s: string, sa: number[]): number[] {
  const n = s.length;
  const rank = new Int32Array(n);
  const lcp = new Array<number>(n).fill(0);
  for (let i = 0; i < n; i++) rank[sa[i]] = i;
  let h = 0;
  for (let i = 0; i < n; i++) {
    if (rank[i] > 0) {
      const j = sa[rank[i] - 1];
      while (i + h < n && j + h < n && s[i + h] === s[j + h]) h++;
      lcp[rank[i]] = h;
      if (h > 0) h--;
    } else h = 0;
  }
  return lcp;
}

/** every repeated substring of length [minLen, maxLen] with its occurrence count */
export function maximalRepeats(s: string, maxLen = 80, minLen = 3, minCount = 2): Map<string, number> {
  const out = new Map<string, number>();
  const n = s.length;
  if (n < 8) return out;
  const sa = suffixArray(s);
  const lcp = lcpArray(s, sa);
  const stack: Array<{ len: number; cnt: number }> = [];
  for (let i = 1; i <= n; i++) {
    const h = i < n ? Math.min(lcp[i], maxLen) : 0;
    let cnt = 1;
    while (stack.length && stack[stack.length - 1].len > h) {
      const top = stack.pop()!;
      cnt += top.cnt;
      if (top.len >= minLen && cnt >= minCount) {
        const sub = s.substr(sa[i - 1], top.len);
        // never cut a surrogate pair: a half-emoji inside a rule text decodes
        // correctly in UTF-16 but is unreadable to any code-point-based reader
        // (found by bench/syntomia_decode.py on md-vite.txt)
        const c0 = sub.charCodeAt(0), cz = sub.charCodeAt(sub.length - 1);
        const cut = (c0 >= 0xdc00 && c0 <= 0xdfff) || (cz >= 0xd800 && cz <= 0xdbff);
        if (!cut) { const prev = out.get(sub) ?? 0; if (cnt > prev) out.set(sub, cnt); }
      }
    }
    if (h >= minLen) stack.push({ len: h, cnt });
  }
  return out;
}

/** one-token glyph pool for a given script, scanned against the live tokenizer */
const poolCache = new Map<string, string[]>();
function glyphPool(enc: EncodingName, scriptName: string): string[] {
  const key = scriptName + ':' + enc;
  const hit = poolCache.get(key);
  if (hit) return hit;
  const sc = CHIRON_SCRIPTS.find((s) => s.name === scriptName) ?? CHIRON_SCRIPTS[2];
  const out: string[] = [];
  const spans = sc.ranges ?? [[sc.lo, sc.hi] as [number, number]];
  for (const [a, b] of spans) {
    for (let cp = a; cp < b; cp++) {
      const ch = String.fromCodePoint(cp);
      if (countTokens(ch, enc) === 1) out.push(ch);
    }
  }
  poolCache.set(key, out);
  return out;
}

export interface OwnSearchResult { wire: string; rules: number; ms: number }

/**
 * Exact-measurement greedy.  `topK` candidates per round are re-tokenised in
 * full; everything else is pruned by an optimistic bound, so the pruning can
 * never discard the true optimum of the round by more than the bound's slack.
 */
export function syntomiaSearch(
  text: string,
  enc: EncodingName,
  opts: { maxRules?: number; topK?: number; budgetMs?: number; scriptName?: string } = {},
): OwnSearchResult | null {
  const t0 = Date.now();
  const maxRules = opts.maxRules ?? 96;
  const topK = opts.topK ?? 110;
  const budgetMs = opts.budgetMs ?? 2500;
  const scriptName = opts.scriptName ?? 'cyrillic';
  const pool = glyphPool(enc, scriptName).filter((g) => !text.includes(g));
  if (pool.length === 0) return null;
  if (text.includes(CHIRON_START) || text.includes(CHIRON_SEP)) return null;

  const T = (s: string) => countTokens(s, enc);
  let body = text;
  let bodyTok = T(body);
  const rules: Array<{ g: string; s: string }> = [];

  for (let r = 0; r < maxRules; r++) {
    if (Date.now() - t0 > budgetMs) break;
    const g = pool[r];
    if (!g) break;
    const cands = [...maximalRepeats(body).entries()]
      .map(([s, c]) => ({ s, c, est: (c - 1) * T(s) - 1 }))
      .filter((x) => x.est > 0)
      .sort((a, b) => b.est - a.est)
      .slice(0, topK);
    let best: { s: string; net: number; nb: string; nbTok: number } | null = null;
    for (const c of cands) {
      if (c.s.includes(g)) continue;
      const nb = body.split(c.s).join(g);
      const nbTok = T(nb);
      const net = (bodyTok - nbTok) - T(g + c.s);
      if (net > 0 && (!best || net > best.net)) best = { s: c.s, net, nb, nbTok };
    }
    if (!best || best.net < 1) break;
    body = best.nb;
    bodyTok = best.nbTok;
    rules.push({ g, s: best.s });
  }
  if (rules.length === 0) return null;
  const wire = CHIRON_START + rules.map((x) => x.g + x.s).join('') + CHIRON_SEP + body;
  return { wire, rules: rules.length, ms: Date.now() - t0 };
}

/* ---------------------------------------------------------------------------
 * 2. ENCODER
 * ------------------------------------------------------------------------- */

export interface SyntomiaResult {
  codec: 'syntomia';
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  messageTokens: number;
  contractTokens: number;
  decoderPrompt: string;
  savingsPct: number;
  winner: string;
  /** contract tokens the incumbent would have paid for the same wire */
  incumbentContract: number;
  rules: number;
  readmitted: boolean;
  ms: number;
  notes: string;
}

export interface SyntomiaOptions {
  budgetMs?: number;
  /** skip the incumbent arm (ablation harness) */
  bare?: boolean;
  /**
   * Pre-computed incumbent result.  METATRON's search is wall-clock budgeted
   * and therefore non-deterministic; passing its result in makes the
   * comparison exact rather than two independent draws.
   */
  incumbent?: { wire: string; decoded: string; messageTokens: number; decoderPrompt: string };
}

interface Arm { name: string; wire: string; contract: string; tokens: number; decoded: string }

export function syntomiaEncode(
  text: string,
  enc: EncodingName = 'o200k_base',
  options: SyntomiaOptions = {},
): SyntomiaResult {
  const t0 = Date.now();
  const T = (s: string) => countTokens(s, enc);
  const inTokens = T(text);
  const budgetMs = options.budgetMs ?? 2500;

  const base = (): SyntomiaResult => ({
    codec: 'syntomia', wire: text, decoded: text, exact: true,
    inTokens, outTokens: inTokens, messageTokens: inTokens, contractTokens: 0,
    decoderPrompt: text, savingsPct: 0, winner: 'identity', incumbentContract: 0,
    rules: 0, readmitted: false, ms: Date.now() - t0, notes: 'identity',
  });
  if (text.length < 16) return base();

  const arms: Arm[] = [{ name: 'identity', wire: text, contract: '', tokens: inTokens, decoded: text }];
  let incumbentContract = 0;
  let readmitted = false;
  let ruleCount = 0;

  // --- arm: the incumbent, untouched -------------------------------------
  let incumbentWire: string | null = null;
  if (!options.bare) {
    try {
      const m = options.incumbent ?? metatronEncode(text, enc, { budgetMs });
      if (m.decoded === text) {
        incumbentContract = m.messageTokens - T(m.wire);
        const rawContract = m.decoderPrompt.slice(m.wire.length).replace(/^\n/, '');
        arms.push({
          name: 'metatron', wire: m.wire, contract: rawContract,
          tokens: m.messageTokens, decoded: m.decoded,
        });
        // same wire, same semantics, shorter English
        const genericOk = genericWordingIsSound(m.wire, text);
        const rew = syntomiaRewriteContract(rawContract, tapeIsNested(m.wire),
          genericOk ? '' : ((chironOpsUsed(m.wire).script ?? CHIRON_SCRIPTS[0]).label));
        if (rew !== rawContract) {
          arms.push({
            name: 'rewrite', wire: m.wire, contract: rew,
            tokens: T(m.wire) + T(rew), decoded: m.decoded,
          });
        }
        // fold a composed arm's trailing legend into the CHIRON tape
        try {
          const fused = syntomiaFuseLegend(m.wire, rawContract, enc, text);
          if (fused && chironDecode(fused.wire) === text) {
            arms.push({
              name: 'fuse', wire: fused.wire, contract: fused.contract,
              tokens: T(fused.wire) + T(fused.contract), decoded: text,
            });
          }
        } catch { /* arm unavailable */ }
        if (m.wire.startsWith(CHIRON_START) && chironDecode(m.wire) === text) incumbentWire = m.wire;
      }
    } catch { /* arm unavailable */ }
  }

  // --- arm: the same wire, minimal contract -------------------------------
  if (incumbentWire) {
    const c = syntomiaContract(incumbentWire, text);
    arms.push({ name: 'recontract', wire: incumbentWire, contract: c, tokens: T(incumbentWire) + T(c), decoded: text });
    // make the generic wording sound by renaming mark-glyphs to letter-glyphs
    try {
      const lw = letteriseGlyphs(incumbentWire, enc);
      if (lw && chironDecode(lw) === text) {
        const lc = syntomiaContract(lw, text);
        arms.push({ name: 'letterise', wire: lw, contract: lc, tokens: T(lw) + T(lc), decoded: text });
      }
    } catch { /* arm unavailable */ }
  }

  // --- arm: own search, gated at the minimal contract ----------------------
  // Only worth the time when the incumbent declined or barely won.
  const bestSoFar = Math.min(...arms.map((a) => a.tokens));
  // Run our own search whenever the incumbent is within one old-contract of
  // declining — that is exactly the band its gate throws away.
  if (bestSoFar > inTokens - 50 && text.length < 200_000) {
    for (const scriptName of ['cyrillic', 'polyglot']) {
      let own: OwnSearchResult | null = null;
      try { own = syntomiaSearch(text, enc, { budgetMs: Math.max(500, budgetMs), scriptName }); } catch { own = null; }
      if (!own) continue;
      if (chironDecode(own.wire) !== text) continue;
      const c = syntomiaContract(own.wire, text);
      const tok = T(own.wire) + T(c);
      arms.push({ name: 'search:' + scriptName, wire: own.wire, contract: c, tokens: tok, decoded: text });
      if (tok < inTokens && bestSoFar >= inTokens) { readmitted = true; ruleCount = own.rules; }
    }
  }

  // Each arm's exactness was established when it was built (the incumbent
  // reports its own verified decode; our arms are checked against chironDecode
  // at construction).  Re-deriving it here with chironDecode would silently
  // drop every incumbent wire that is not a CHIRON wire.
  const valid = arms.filter((a) => a.decoded === text);
  valid.sort((a, b) => a.tokens - b.tokens || a.wire.length - b.wire.length);
  const win = valid[0];
  const wireTok = T(win.wire);

  if (win.wire !== text && win.name.startsWith('search')) {
    const k = win.wire.indexOf(CHIRON_SEP);
    const tape = k > 0 ? win.wire.slice(1, k) : '';
    const sc = tape ? scriptOfChar(tape[0]) : null;
    const rs = sc ? chironParseTape(tape, sc) : null;
    ruleCount = rs ? rs.length : ruleCount;
  }

  return {
    codec: 'syntomia',
    wire: win.wire,
    decoded: win.decoded,
    exact: true,
    inTokens,
    outTokens: wireTok,
    messageTokens: win.tokens,
    contractTokens: win.tokens - wireTok,
    decoderPrompt: win.contract ? win.wire + '\n' + win.contract : win.wire,
    savingsPct: inTokens ? ((inTokens - win.tokens) / inTokens) * 100 : 0,
    winner: win.name,
    incumbentContract,
    rules: ruleCount,
    readmitted: readmitted && win.name.startsWith('search'),
    ms: Date.now() - t0,
    notes: `winner=${win.name}; contract ${win.tokens - wireTok} vs incumbent ${incumbentContract}`
      + (readmitted && win.name.startsWith('search') ? '; RE-ADMITTED (incumbent declined this document)' : ''),
  };
}

export const SYNTOMIA_SYSTEM_PROMPT =
  'SYNTOMIA emits CHIRON wires with a minimal-complete decode contract. The contract travels in the message; no system prompt is required.';
