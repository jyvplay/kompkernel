/**
 * src/lib/omega/crasis.ts
 * =============================================================================
 * CRASIS — Punctuation-Boundary Fusion Pre-Pass
 * (byte-perfect, exact-lossless, single-chat-readable, contract in band)
 * -----------------------------------------------------------------------------
 *
 * κρᾶσις — in Greek grammar, the *fusion* of the final vowel of one word with
 * the initial vowel of the next so that the two are written and scanned as one
 * (τὸ ὄνομα → τοὔνομα). The orthography loses a boundary; the reader loses
 * nothing, because the rule that undoes it is fixed and known.
 *
 * THE SEAM
 * -----------------------------------------------------------------------------
 * Every tiktoken-family pre-tokenizer cuts text into chunks of the form
 *
 *     [one optional non-letter character] + [letters]          (a "word")
 *     [optional space] + [punctuation run]                      (a "punct")
 *
 * and BPE never merges across chunks.  So in ordinary prose
 *
 *     "fox. The"   ->   "."  +  " The"      = 2 tokens
 *     "fox.The"    ->   ".The"              = 1 token   (o200k_base, cl100k_base)
 *
 * The vocabulary contains thousands of such *compound* tokens — a single
 * punctuation mark glued to the following word — because they are abundant in
 * web text (".The", ",and", "(the", ":\"", "—and").  Scanning o200k_base
 * (bench/z45/vocab-scan.ts): 4 090 compounds begin with ".", 1 791 with "(",
 * 165 with ",", 66 with '"'.  Removing the ONE space between the mark and the
 * word therefore saves a whole token wherever the compound exists — and it is
 * the only place in the entire BPE where two English words' worth of material
 * can share a token (SuperBPE, Liu et al. 2025, needs a retrained vocabulary
 * to get "superwords"; this uses the superwords that are already there).
 *
 * No other lane in this repository touches this boundary.  The dictionary
 * lanes (CHIRON, ARIADNE, SIBYL, DAEDALUS, ANAMNESIS) move repeated CONTENT;
 * SYNIZESIS re-densifies DIGIT runs; CAESURA canonicalises double spaces and
 * NBSP; none of them removes the single space after a sentence-final mark.
 * The z38/z39/z40/z43 negative-space tables list "whitespace collapse" as
 * dead — that result is for collapsing runs of spaces, which never crosses a
 * compound; the single space *between a mark and a letter* is different
 * because the compound token exists only for that exact shape.
 *
 * WHY IT IS READABLE WITHOUT A LOOK-UP
 * -----------------------------------------------------------------------------
 * The reader is a language model.  "fox.The dog" is not a cipher to it; it is
 * the most common typo on the web, and the model reads it as "fox. The dog"
 * without any instruction.  The one-line contract exists only so that the
 * reproduction is *deterministic* — it names exactly which boundaries were
 * fused so that a byte-exact print is a mechanical rule, not a judgement.
 *
 * THE MECHANISM
 * -----------------------------------------------------------------------------
 * Four rules.  Each rule R has a *fuse site* (where the encoder may delete a
 * space) and an *inverse context* (where the decoder re-inserts one):
 *
 *   P   ". A" -> ".A"    inverse: a capital letter right after . ! ?
 *   C   ", a" -> ",a"    inverse: a lowercase letter right after ,
 *   O   "x (" -> "x("    inverse: ( right after a letter or digit
 *   Q   ': "' -> ':"'    inverse: " right after , . ; :
 *
 * 1. GATE.  A rule is admissible for a message only if the inverse context
 *    does not already occur in the original text (otherwise the decoder would
 *    insert a space the author never wrote).  "e.g.The", "foo(bar)",
 *    "a,b" each disable their rule for the whole message.  With fenced ```
 *    blocks present, a second configuration gates and fuses only outside the
 *    fences, and says so in the contract.
 *
 * 2. PER-SITE EXACT TEST.  Fusion is applied only where the live tokenizer
 *    measures a strict saving on the surrounding whitespace-delimited span.
 *    This matters: ", probability" -> ",probability" COSTS a token (the
 *    space-less "probability" splits), while ", and" -> ",and" saves one.  The
 *    inverse rule is context-only, so the decoder does not need to know which
 *    sites were fused; any subset round-trips.
 *
 * 3. ROUND TRIP.  unfuse(fuse(text)) === text is checked for the whole message
 *    before anything is emitted; a failure drops the configuration.
 *
 * 4. COMPOSE.  The fused text is handed to the shipped frontier dictionary
 *    encoder (DAEDALUS).  Fusion removes tokens the dictionary cannot reach
 *    (one-off sentence boundaries), and the dictionary removes repeats the
 *    fusion cannot reach; the two are nearly additive because a fused boundary
 *    is still a boundary for the repeat finder.
 *
 * 5. CONTRACT.  One line, compiled from the rules actually used, placed first:
 *
 *      Restore missing spaces: after .!? before capitals; after , before lowercase letters.
 *
 *    (16 tokens with the newline for two rules, 11 for one).  The DAEDALUS clause follows
 *    its own wire as usual.  M = tokens(contract) + tokens(wire), counted.
 *
 * 6. IDENTITY GUARD.  The plain frontier message is computed as well; CRASIS
 *    is emitted only when its full message is strictly shorter.  So the lane
 *    is Pareto-superior by construction and the only cost of the guard is time.
 *
 * WHAT IS *NOT* CLAIMED
 * -----------------------------------------------------------------------------
 * - This is a small, general lever, not a large one.  MEASURED on 57 real
 *   documents (129 097 tokens; bench/z45/fuse2.ts): P 254-294, C 324-357,
 *   O 40-61, Q 120-135 tokens before the contract — about 0.6% of mixed
 *   developer text and 2-4% of clean prose.  The one-line contract eats the
 *   gain below roughly 1 000 tokens of prose, where identity is still optimal
 *   and this encoder says so.
 * - Non-English prose with different comma habits (German, Polish, Turkish)
 *   gains nothing from C; the per-site test makes it zero rather than negative.
 * - The reader must apply a context rule when reproducing the text.  The
 *   rule is "insert one space here", the lightest edit a language model can
 *   make, and the contexts are the ones every English writer already treats as
 *   word boundaries.  Exactness is verified by this module's own decoder and
 *   by an independent CPython decoder (bench/z45/crasis_decode.py).
 * =============================================================================
 */

import { countTokens, type EncodingName } from './bpe';
import { daedalusEncode, daedalusDecode, daedalusDecoderPrompt, type DaedalusResult, type DaedalusOptions } from './daedalus';

/* ---------------------------------------------------------------------------
 * 0. RULES
 * ------------------------------------------------------------------------- */

export type CrasisRuleId = 'P' | 'C' | 'O' | 'Q';

interface CrasisRule {
  id: CrasisRuleId;
  /** the single space the encoder may delete (global, zero-width context) */
  site: RegExp;
  /** the context in which the decoder inserts a space (global, zero-width) */
  inverse: RegExp;
  /** contract fragment: "after X before Y" */
  clause: string;
}

const RULES: readonly CrasisRule[] = [
  { id: 'P', site: /(?<=[.!?]) (?=[A-Z])/g, inverse: /(?<=[.!?])(?=[A-Z])/g, clause: 'after .!? before capitals' },
  { id: 'C', site: /(?<=,) (?=[a-z])/g, inverse: /(?<=,)(?=[a-z])/g, clause: 'after , before lowercase letters' },
  { id: 'O', site: /(?<=[A-Za-z0-9]) (?=\()/g, inverse: /(?<=[A-Za-z0-9])(?=\()/g, clause: 'after letters or digits before (' },
  { id: 'Q', site: /(?<=[,.;:]) (?=")/g, inverse: /(?<=[,.;:])(?=")/g, clause: 'after ,.;: before "' },
];

const BY_ID: ReadonlyMap<CrasisRuleId, CrasisRule> = new Map(RULES.map(r => [r.id, r]));
const BY_CLAUSE: ReadonlyMap<string, CrasisRule> = new Map(RULES.map(r => [r.clause, r]));

export const CRASIS_HEAD = 'Restore missing spaces: ';
export const CRASIS_HEAD_FENCED = 'Outside ``` blocks, restore missing spaces: ';
/** emitted only when a plain wire's first line would itself parse as a header */
export const CRASIS_NOOP = 'Restore missing spaces: nowhere.';

export function crasisHeader(rules: readonly CrasisRuleId[], fenced: boolean): string {
  if (!rules.length) return CRASIS_NOOP;
  return (fenced ? CRASIS_HEAD_FENCED : CRASIS_HEAD) + rules.map(id => BY_ID.get(id)!.clause).join('; ') + '.';
}

export interface CrasisHeader { rules: CrasisRuleId[]; fenced: boolean }

export function parseCrasisHeader(line: string): CrasisHeader | null {
  if (line === CRASIS_NOOP) return { rules: [], fenced: false };
  let fenced = false, rest: string;
  if (line.startsWith(CRASIS_HEAD_FENCED)) { fenced = true; rest = line.slice(CRASIS_HEAD_FENCED.length); }
  else if (line.startsWith(CRASIS_HEAD)) rest = line.slice(CRASIS_HEAD.length);
  else return null;
  if (!rest.endsWith('.')) return null;
  const rules: CrasisRuleId[] = [];
  for (const c of rest.slice(0, -1).split('; ')) {
    const r = BY_CLAUSE.get(c);
    if (!r || rules.includes(r.id)) return null;
    rules.push(r.id);
  }
  return rules.length ? { rules, fenced } : null;
}

/* ---------------------------------------------------------------------------
 * 1. SEGMENTATION — fenced code blocks are left untouched in the fenced
 *    configuration.  A line whose first non-blank characters are ``` or ~~~
 *    toggles code mode and is itself code.  Encoder and decoder share this.
 * ------------------------------------------------------------------------- */

interface Segment { s: string; code: boolean }

export function crasisSegments(text: string, fenced: boolean): Segment[] {
  if (!fenced) return [{ s: text, code: false }];
  const out: Segment[] = [];
  let code = false, buf = '';
  for (const line of text.split(/(?<=\n)/)) {
    if (/^ {0,3}(```|~~~)/.test(line)) {
      if (buf) out.push({ s: buf, code });
      buf = '';
      out.push({ s: line, code: true });
      code = !code;
      continue;
    }
    buf += line;
  }
  if (buf) out.push({ s: buf, code });
  return out;
}

/* ---------------------------------------------------------------------------
 * 2. DECODER SIDE — the inverse is context-only, so it is a plain regex pass.
 * ------------------------------------------------------------------------- */

export function crasisUnfuse(text: string, rules: readonly CrasisRuleId[], fenced: boolean): string {
  if (!rules.length) return text;
  let out = '';
  for (const seg of crasisSegments(text, fenced)) {
    if (seg.code) { out += seg.s; continue; }
    let s = seg.s;
    for (const id of rules) s = s.replace(BY_ID.get(id)!.inverse, ' ');
    out += s;
  }
  return out;
}

/* ---------------------------------------------------------------------------
 * 3. ENCODER SIDE
 * ------------------------------------------------------------------------- */

/** whitespace-delimited span around index i (pre-tokenizer chunks never cross it except by a leading space, which is identical in both variants) */
function spanAround(s: string, i: number): [number, number] {
  let a = i; while (a > 0 && !/\s/.test(s[a - 1])) a--;
  let b = i + 1; while (b < s.length && !/\s/.test(s[b])) b++;
  return [a, b];
}

interface FuseStats { sites: number; fused: number; gain: number }

/**
 * Delete the space at every site of `rule` in `s` where the live tokenizer
 * measures a strict local saving.  Context-only inverse => any subset is safe.
 */
function fuseRule(s: string, rule: CrasisRule, enc: EncodingName, cache: Map<string, number>, stats: FuseStats): string {
  let out = '', last = 0;
  rule.site.lastIndex = 0;
  let m: RegExpExecArray | null;
  const delta = (span: string, k: number): number => {
    const key = span;
    let d = cache.get(key);
    if (d === undefined) {
      const without = span.slice(0, k) + span.slice(k + 1);
      d = countTokens(span, enc) - countTokens(without, enc);
      cache.set(key, d);
    }
    return d;
  };
  while ((m = rule.site.exec(s))) {
    const i = m.index;                 // index of the space
    stats.sites++;
    const [a, b] = spanAround(s, i);
    const d = delta(s.slice(a, b), i - a);
    if (d > 0) {
      out += s.slice(last, i);
      last = i + 1;
      stats.fused++;
      stats.gain += d;
    }
    rule.site.lastIndex = i + 1;
  }
  return out + s.slice(last);
}

export interface CrasisPlan {
  fenced: boolean;
  rules: CrasisRuleId[];
  fused: string;
  /** tokens saved on the plain text, before any dictionary and before the contract */
  gain: number;
  sites: number;
  fusedSites: number;
  headerTokens: number;
}

/**
 * Build the best fusion plan for one configuration.  Returns null when no
 * rule is admissible or nothing was fused.
 */
export function crasisPlan(text: string, enc: EncodingName, fenced: boolean, allow: readonly CrasisRuleId[] = ['P', 'C', 'O', 'Q']): CrasisPlan | null {
  const segs = crasisSegments(text, fenced);
  if (fenced && !segs.some(sg => sg.code)) return null;
  const cache = new Map<string, number>();
  // per-rule admissibility and stand-alone gain (sites of different rules are disjoint, so gains add)
  const cands: { rule: CrasisRule; st: FuseStats }[] = [];
  let sites = 0;
  for (const rule of RULES) {
    if (!allow.includes(rule.id)) continue;
    // GATE: the inverse context must be absent from every prose segment of the ORIGINAL text
    let blocked = false;
    for (let k = 0; k < segs.length && !blocked; k++) {
      if (segs[k].code) continue;
      rule.inverse.lastIndex = 0;
      if (rule.inverse.test(segs[k].s)) blocked = true;
    }
    if (blocked) continue;
    const st: FuseStats = { sites: 0, fused: 0, gain: 0 };
    for (const sg of segs) if (!sg.code) fuseRule(sg.s, rule, enc, cache, st);
    sites += st.sites;
    if (st.fused > 0) cands.push({ rule, st });
  }
  if (!cands.length) return null;
  // choose the subset whose stand-alone gain minus its own header cost is largest
  let best: { ids: CrasisRuleId[]; net: number; header: number } | null = null;
  for (let mask = 1; mask < 1 << cands.length; mask++) {
    const ids = cands.filter((_, i) => mask & (1 << i)).map(c => c.rule.id);
    const gain = cands.filter((_, i) => mask & (1 << i)).reduce((a, c) => a + c.st.gain, 0);
    const header = countTokens(crasisHeader(ids, fenced) + '\n', enc);
    const net = gain - header;
    if (!best || net > best.net) best = { ids, net, header };
  }
  if (!best || best.net <= 0) return null;
  // apply the chosen rules in canonical order and verify the round trip on the whole message
  const chosen = RULES.filter(r => best!.ids.includes(r.id));
  let fusedSites = 0;
  const parts = segs.map(sg => {
    if (sg.code) return sg.s;
    let s = sg.s;
    for (const rule of chosen) { const st: FuseStats = { sites: 0, fused: 0, gain: 0 }; s = fuseRule(s, rule, enc, cache, st); fusedSites += st.fused; }
    return s;
  });
  const fused = parts.join('');
  const rules = chosen.map(r => r.id);
  if (crasisUnfuse(fused, rules, fenced) !== text) return null;      // round trip or nothing
  const gain = countTokens(text, enc) - countTokens(fused, enc);
  if (gain <= best.header) return null;
  return { fenced, rules, fused, gain, sites, fusedSites, headerTokens: best.header };
}

export interface CrasisResult extends DaedalusResult {
  codec2: 'crasis';
  crasisApplied: boolean;
  crasisRules: CrasisRuleId[];
  crasisFenced: boolean;
  /** tokens the fusion alone saved on the plain text */
  crasisGain: number;
  crasisSites: number;
  crasisFusedSites: number;
  /** M of the plain frontier message that was beaten (or kept) */
  plainMessageTokens: number;
}

export interface CrasisOptions extends DaedalusOptions {
  /** rules the encoder may use (default all four) */
  rules?: CrasisRuleId[];
  /**
   * Compute the plain frontier message as well and keep whichever is
   * shorter (default true).  With false, CRASIS is emitted whenever the
   * fusion gain exceeds the header cost — one encoder run instead of two.
   */
  guard?: boolean;
}

function firstLine(s: string): string {
  const k = s.indexOf('\n');
  return k < 0 ? s : s.slice(0, k);
}

function plainResult(text: string, enc: EncodingName, plain: DaedalusResult, started: number, note: string): CrasisResult {
  let r: CrasisResult = {
    ...plain, codec2: 'crasis', crasisApplied: false, crasisRules: [], crasisFenced: false, crasisGain: 0, crasisSites: 0, crasisFusedSites: 0,
    plainMessageTokens: plain.messageTokens, ms: Date.now() - started, notes: `crasis: not applied (${note}); ${plain.notes}`,
  };
  // the plain wire must not be mistaken for a CRASIS wire by the decoder
  if (parseCrasisHeader(firstLine(plain.wire))) {
    const wire = CRASIS_NOOP + '\n' + plain.wire;
    const decoderPrompt = CRASIS_NOOP + '\n' + plain.decoderPrompt;
    const messageTokens = countTokens(decoderPrompt, enc);
    r = { ...r, wire, decoderPrompt, decoded: crasisDecode(wire), exact: crasisDecode(wire) === text, messageTokens, contractTokens: messageTokens - countTokens(wire, enc) + countTokens(CRASIS_NOOP + '\n', enc), outTokens: countTokens(wire, enc), notes: r.notes + '; no-op header added (payload looked like a header)' };
  }
  return r;
}

export function crasisEncode(text: string, enc: EncodingName = 'o200k_base', options: CrasisOptions = {}): CrasisResult {
  const started = Date.now();
  const { rules: allow = ['P', 'C', 'O', 'Q'], guard = true, ...dopts } = options;
  const inTokens = countTokens(text, enc);

  // 1-3. plans for both configurations; keep the one with the best net plain gain
  const plans = [crasisPlan(text, enc, false, allow), crasisPlan(text, enc, true, allow)].filter((p): p is CrasisPlan => !!p);
  plans.sort((a, b) => (b.gain - b.headerTokens) - (a.gain - a.headerTokens));
  const plan = plans[0];

  const plain = guard || !plan || plan.gain <= plan.headerTokens ? daedalusEncode(text, enc, dopts) : null;
  if (!plan) return plainResult(text, enc, plain!, started, 'no admissible rule fused anything');
  if (plan.gain <= plan.headerTokens) return plainResult(text, enc, plain!, started, `fusion saved ${plan.gain} < header ${plan.headerTokens}`);

  // 4-5. compose with the frontier dictionary encoder on the fused text
  const inner = daedalusEncode(plan.fused, enc, dopts);
  const header = crasisHeader(plan.rules, plan.fenced);
  const wire = header + '\n' + inner.wire;
  const decoderPrompt = header + '\n' + inner.decoderPrompt;
  const decoded = crasisDecode(wire);
  const exact = decoded === text;
  const messageTokens = countTokens(decoderPrompt, enc);
  const outTokens = countTokens(wire, enc);

  // 6. identity guard: never longer than the plain frontier message
  if (!exact || (plain && messageTokens >= plain.messageTokens)) {
    const why = !exact ? 'composed wire failed the round trip' : `composed M ${messageTokens} >= plain M ${plain!.messageTokens}`;
    return plainResult(text, enc, plain ?? daedalusEncode(text, enc, dopts), started, why);
  }
  const plainM = plain ? plain.messageTokens : inTokens;
  return {
    ...inner, codec2: 'crasis', wire, decoded, exact, inTokens, outTokens, messageTokens,
    contractTokens: messageTokens - outTokens + countTokens(header + '\n', enc),
    decoderPrompt, savingsPct: inTokens ? (1 - messageTokens / inTokens) * 100 : 0,
    crasisApplied: true, crasisRules: plan.rules, crasisFenced: plan.fenced, crasisGain: plan.gain, crasisSites: plan.sites, crasisFusedSites: plan.fusedSites,
    plainMessageTokens: plainM, ms: Date.now() - started,
    notes: `crasis: rules ${plan.rules.join('')}${plan.fenced ? ' (outside fences)' : ''} fused ${plan.fusedSites}/${plan.sites} sites, saved ${plan.gain} tok before the dictionary, header ${plan.headerTokens}; M ${messageTokens} vs plain ${plain ? plain.messageTokens : 'n/a (unguarded)'}; ${inner.notes}`,
  };
}

/* ---------------------------------------------------------------------------
 * 4. DECODER / PROMPT
 * ------------------------------------------------------------------------- */

export function crasisDecode(wire: string): string {
  const k = wire.indexOf('\n');
  const head = parseCrasisHeader(k < 0 ? wire : wire.slice(0, k));
  if (!head) return daedalusDecode(wire);
  const inner = k < 0 ? '' : wire.slice(k + 1);
  return crasisUnfuse(daedalusDecode(inner), head.rules, head.fenced);
}

/** DAEDALUS prompt for a wire that may be a plain identity payload */
function innerPrompt(inner: string): string {
  return daedalusDecode(inner) !== inner ? daedalusDecoderPrompt(inner) : inner;
}

export function crasisDecoderPrompt(wire: string): string {
  const k = wire.indexOf('\n');
  const head = parseCrasisHeader(k < 0 ? wire : wire.slice(0, k));
  if (!head) return innerPrompt(wire);
  const inner = k < 0 ? '' : wire.slice(k + 1);
  return wire.slice(0, k + 1) + innerPrompt(inner);
}
