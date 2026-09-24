/**
 * LOGOS-Ω — self-referential lexicon codec (cross-referential SLP grammar).
 * =============================================================================
 * WHAT IS ACTUALLY NEW (stated narrowly so it can be attacked)
 * -----------------------------------------------------------------------------
 * Every grammar/dictionary layer in this repository — MOIRA (constituent
 * lattice), NEMESIS (one outer grammar over the MOIRA wire), THEMIS/DIKE/
 * EUPRAXIA/METIS/PROTEUS (framing of those grammars) — and every published
 * lossless prompt codec surveyed (LTSC meta-tokens, arXiv:2506.00307;
 * Dictionary-Encoding+ICL, arXiv:2604.13066) transmits a FLAT dictionary:
 * each meta-token's expansion is a literal string. Two consequences:
 *
 *   1. Shared substrings BETWEEN expansions are paid for again and again
 *      (`"https://api.github.com/users/` and `"url": "https://github.com/`
 *      each transmit `https://` + `github.com` separately).
 *   2. MOIRA explicitly REJECTS any candidate phrase that contains an
 *      already-admitted glyph (the `nested` guard), so no hierarchical
 *      composition is possible inside one level; NEMESIS adds exactly one
 *      more level, over the serialized wire, with full per-rule syntax.
 *
 * LOGOS removes both restrictions at once. Its tape is a list of expansions
 * in which an expansion MAY CONTAIN the symbols of other rules. The encoder
 * mostly creates backward references (expansion i uses symbols j < i), but
 * because it also re-folds phrases inside already-admitted rules, forward
 * references can occur; the decoder's last-to-first substitution pass with
 * in-place expansion of earlier tape entries resolves BOTH kinds, so no
 * topological restriction is needed anywhere. This is a straight-line-program
 * (SLP) / DAG-structured dictionary, not a flat one: shared fragments are
 * defined once and referenced, exactly like addition chains reuse earlier
 * results (the smallest-grammar problem is formally linked to addition
 * chains: an o(log n / log log n) grammar approximation would improve Yao's
 * addition-chain method — see the smallest grammar problem page and
 * Charikar et al., STOC 2002 / IEEE TIT 2005).
 *
 * The decode operation stays inside the reliable regime for an LLM reading
 * one chat message: split a tape at a visible delimiter, look up symbol i in
 * a fixed table printed in the message, and substitute — repeatedly, from
 * the last definition to the first, in the body and in earlier definitions.
 * That is ordinary macro expansion; no offsets, no arithmetic, no external
 * state. The only new instruction versus PROTEUS is "definitions may use
 * earlier definitions, so keep substituting in reverse order".
 *
 * Imported results, restated with the hypotheses actually needed:
 *   · Smallest grammar is NP-hard and hard to approximate within any
 *     constant factor (Charikar et al. 2002/2005); practical grammars are
 *     heuristic. LOGOS therefore never CLAIMS optimality: every admission
 *     decision is scored against the complete live-BPE wire, and the final
 *     candidate must strictly beat the complete PROTEUS result or it is
 *     discarded. Pareto safety is by construction, not by hope.
 *   · "The smallest grammar problem revisited" (arXiv:1908.06428) settles
 *     LZ78's worst-case SLP ratio at Θ((n/log n)^{2/3}) and improves the
 *     Re-Pair lower bound, ruling Re-Pair out as an addition-chain
 *     improvement — hierarchical sharing is the right axis, but it is not
 *     free, which is why LOGOS re-scores the exact wire after every batch.
 *   · Busy Beaver BB(5) = 47,176,870, proved 2024-07-02 by the bbchallenge
 *     collaboration and formally verified in Coq (scottaaronson.blog?p=8088;
 *     wiki.bbchallenge.org; OEIS A060843): massive exact verification is how
 *     a community closes a frontier. LOGOS adopts the same discipline at
 *     codec scale — every rule must carry an exact live-tokenizer
 *     certificate ("decider") before it is admitted, and the round trip is
 *     re-verified before the wire is emitted.
 *   · AlphaGeometry 2 / AlphaProof (Google DeepMind, 2024-2025; AlphaProof
 *     methodology in Nature, Nov 2025): the auxiliary-construction pattern —
 *     introducing objects absent from the problem statement to unlock a
 *     proof, and sharing knowledge across search trees — is isomorphic to
 *     introducing auxiliary nonterminals that appear nowhere in the payload
 *     but let many definitions share one fragment.
 *
 * AI-NATIVE RESOURCE AUDIT (measured, negative results included):
 *   · o200k_base has NO free bigram-packing channel: among 62,500 ordered
 *     pairs of the first 250 one-token Hangul glyphs, exactly ONE is a
 *     single token. Assigning glyphs to force merges is therefore dead;
 *     the delimiter tournament (which is worth ~20 live tokens on the
 *     GitHub-API lane) is the only tokenizer-boundary effect that pays.
 *   · Digit runs tokenize at ~2.5 chars/token, so base-N digit packing into
 *     one-token glyphs (2 chars/token) LOSES; numbers stay literal.
 *   · Folding a phrase that cuts across a BPE merge boundary splits the
 *     merge and can INCREASE the count; exact re-scoring rejects these
 *     candidates automatically (measured: "lida"/"onst " leftovers).
 *
 * WIRES
 * -----------------------------------------------------------------------------
 *   Ω d e₀ d e₁ d … d e_{n-1} 乙 BODY
 *
 *   Ω   = U+03A9, one o200k token, not used as a frame by any lower layer.
 *   d   = one-token visible delimiter; d's membership in one of six fixed
 *         delimiter groups ALSO selects the symbol table. Zero metadata
 *         tokens: the delimiter is load-bearing twice.
 *   eᵢ  = expansion i. May contain the symbols of other rules (backward
 *         references j < i are typical; forward references are legal too).
 *   乙  = tape/body boundary (same sentinel family as METIS/PROTEUS).
 *   BODY= payload with every admitted phrase replaced by its symbol.
 *
 * Decode is total: wrong/absent framing, unknown delimiters, empty tapes,
 * over-long tapes and missing boundaries all return the input unchanged, and
 * non-LOGOS wires delegate to the PROTEUS stack unchanged.
 * =============================================================================
 */
import { countTokens, type EncodingName } from './bpe';
import { kairosEncode, kairosDecode, kairosDecoderPrompt, type KairosResult } from './kairos';
import { proteusEncode, proteusDecode, type ProteusResult } from './proteus';

export const LOGOS_START = 'Ω';
export const LOGOS_BODY_SEPARATOR = '乙';
export const LOGOS_PLACEHOLDER = '\u0001';

/* ---------------------------------------------------------------------------
 * 1. FIXED SYMBOL POOLS (six disjoint ranges, deterministic on both sides)
 * ------------------------------------------------------------------------- */
function scanRange(a: number, b: number, exclude?: string): string[] {
  const out: string[] = [];
  for (let cp = a; cp < b; cp++) {
    const ch = String.fromCharCode(cp);
    if (exclude && exclude.includes(ch)) continue;
    if (countTokens(ch, 'o200k_base') === 1) out.push(ch);
  }
  return out;
}

export const LOGOS_POOL_RANGES: Array<[string, number, number]> = [
  ['hangul', 0xac00, 0xd7a4],
  ['arabic', 0x0600, 0x0700],
  ['cyrillic', 0x0400, 0x0500],
  ['myanmar', 0x1000, 0x10a0],
  ['kana', 0x30a0, 0x3100],
  ['khmer-greek-fullwidth', 0x1780, 0x1800],
];

const LOGOS_POOL_CAPS = [128, 64, 64, 64, 64, 64];

/** Pool 5 also folds in Greek (minus the Ω frame) and fullwidth forms. */
export const LOGOS_POOLS: string[][] = [
  scanRange(0xac00, 0xd7a4).slice(0, LOGOS_POOL_CAPS[0]),
  scanRange(0x0600, 0x0700).slice(0, LOGOS_POOL_CAPS[1]),
  scanRange(0x0400, 0x0500).slice(0, LOGOS_POOL_CAPS[2]),
  scanRange(0x1000, 0x10a0).slice(0, LOGOS_POOL_CAPS[3]),
  scanRange(0x30a0, 0x3100).slice(0, LOGOS_POOL_CAPS[4]),
  [
    ...scanRange(0x1780, 0x1800),
    ...scanRange(0x0370, 0x0400, LOGOS_START),
    ...scanRange(0xff00, 0xfff0),
  ].slice(0, LOGOS_POOL_CAPS[5]),
];

/* ---------------------------------------------------------------------------
 * 2. FIXED DELIMITER UNIVERSE (visible one-token chars outside every pool
 *    range and outside every lower-layer frame sentinel), split into six
 *    groups; group i selects pool i. Load-bearing twice, zero extra tokens.
 * ------------------------------------------------------------------------- */
const DELIM_CANDIDATES =
  `!"#$%&'()*+,-./:;<=>?@[\\]^\`{|}~` +
  `¡¢£¤¥¦§¨©ª«¬®¯°±²³´µ¶·¸¹º»¼½¾¿×÷` +
  `†‡•…‰′″‹›‼` +
  `←↑→↓⇒∞≈≤≥≫` +
  `─━│┃├┣═║╗╝▀▄█▋░▒▓■□▪▫▬▲△▶▷►▼▽○◎●★☆` +
  `々〇〈〉《》「」『』【】〔〕〖〜、。` +
  `①②③④⑤℃№™∆`;

function buildDelimGroups(): string[][] {
  const inAnyPool = (ch: string) => LOGOS_POOLS.some(p => p.includes(ch));
  const banned = new Set([LOGOS_START, LOGOS_BODY_SEPARATOR, '※', 'κ', '◊', '◇', '◆', '⬡', '⬢', '⬣', '⬤', '⬥', '甲', '\u0001']);
  const all: string[] = [];
  for (const ch of DELIM_CANDIDATES) {
    if (banned.has(ch) || inAnyPool(ch)) continue;
    if (countTokens(ch, 'o200k_base') === 1 && !all.includes(ch)) all.push(ch);
  }
  const groups: string[][] = [[], [], [], [], [], []];
  for (let i = 0; i < all.length; i++) groups[i % 6].push(all[i]);
  return groups;
}

export const LOGOS_DELIM_GROUPS = buildDelimGroups();
export const LOGOS_DELIM_UNIVERSE = LOGOS_DELIM_GROUPS.flat();

export function logosPoolForDelim(d: string): number {
  for (let i = 0; i < LOGOS_DELIM_GROUPS.length; i++) if (LOGOS_DELIM_GROUPS[i].includes(d)) return i;
  return -1;
}

/* ---------------------------------------------------------------------------
 * 3. INDUCTION — exact-cost cross-referential grammar with restarts
 * ------------------------------------------------------------------------- */

export interface LogosResult extends ProteusResult {
  logosRules?: number;
  logosDelimiter?: string;
  logosPool?: number;
  logosVariant?: string;
}

interface XrGrammar { rules: string[]; body: string; tokens: number; }

function xrRender(rules: string[], body: string): string {
  return LOGOS_START + LOGOS_PLACEHOLDER + rules.join(LOGOS_PLACEHOLDER) + LOGOS_BODY_SEPARATOR + body;
}

function enumerateParts(parts: string[], maxLen: number): Map<string, number> {
  const counts = new Map<string, number>();
  for (const part of parts) {
    for (let len = 2; len <= Math.min(maxLen, part.length); len++) {
      for (let at = 0; at + len <= part.length; at++) {
        const phrase = part.slice(at, at + len);
        counts.set(phrase, (counts.get(phrase) ?? 0) + 1);
      }
    }
  }
  return counts;
}

/**
 * Greedy exact-cost admission over repeated substrings of the tape AND the
 * body, where candidate phrases may contain earlier symbols. Every candidate
 * is scored by re-tokenizing the complete wire; only strict improvements are
 * committed. A backward-deletion pass (with dense ordinal remap) removes
 * rules that stopped paying, and admission restarts while deletion unlocks.
 */
function induceXrGrammar(
  input: string,
  pool: string[],
  opts: { maxRules: number; maxLen: number; verifyK: number; tokenRank: boolean },
): XrGrammar | null {
  if (input.includes(LOGOS_PLACEHOLDER) || input.includes(LOGOS_BODY_SEPARATOR)) return null;
  let body = input;
  const rules: string[] = [];
  let best = countTokens(xrRender(rules, body), 'o200k_base');
  const base = best;

  for (let cycle = 0; cycle < 5; cycle++) {
    // --- admission: each committed rule consumes the next pool ordinal ---
    let stalled = false;
    while (!stalled && rules.length < Math.min(opts.maxRules, pool.length)) {
      if (input.includes(pool[rules.length])) { stalled = true; break; }
      const counts = enumerateParts([...rules, body], Math.min(opts.maxLen, Math.floor(input.length / 2)));
      let cands = [...counts.entries()]
        .filter(([, c]) => c >= 2)
        .map(([phrase, c]) => ({ phrase, c, bound: c * (phrase.length - 1) - phrase.length - 2 }))
        .sort((a, b) => b.bound - a.bound || b.phrase.length - a.phrase.length)
        .slice(0, opts.tokenRank ? 4096 : opts.verifyK);
      if (opts.tokenRank) {
        cands = cands
          .map(x => ({ ...x, tb: x.c * (countTokens(x.phrase, 'o200k_base') - 1) - countTokens(x.phrase, 'o200k_base') }))
          .sort((a, b) => b.tb - a.tb || b.phrase.length - a.phrase.length)
          .slice(0, opts.verifyK);
      }
      let appliedAny = false;
      for (const { phrase } of cands) {
        if (rules.length >= Math.min(opts.maxRules, pool.length)) break;
        if (input.includes(pool[rules.length])) break;
        const g = pool[rules.length];
        const nextRules = [...rules.map(r => r.split(phrase).join(g)), phrase];
        const nextBody = body.split(phrase).join(g);
        const t = countTokens(xrRender(nextRules, nextBody), 'o200k_base');
        if (t < best) {
          rules.length = 0; rules.push(...nextRules);
          body = nextBody; best = t; appliedAny = true;
        }
      }
      if (!appliedAny) stalled = true;
    }

    // --- backward deletion with dense ordinal remap (keeps DAG order) ---
    let deleted = false, changed = true;
    while (changed && rules.length) {
      changed = false;
      for (let i = 0; i < rules.length; i++) {
        const g = pool[i], expansion = rules[i];
        const rs2: string[] = [], keep: number[] = [];
        for (let j = 0; j < rules.length; j++) {
          if (j === i) continue;
          rs2.push(rules[j].split(g).join(expansion)); keep.push(j);
        }
        const b2 = body.split(g).join(expansion);
        const t = countTokens(xrRender(rs2, b2), 'o200k_base');
        if (t < best) {
          const remap = new Map<string, string>();
          keep.forEach((oldJ, newI) => remap.set(pool[oldJ], pool[newI]));
          const remapStr = (s: string) => {
            let out = '';
            for (const ch of s) out += remap.get(ch) ?? ch;
            return out;
          };
          rules.length = 0; rules.push(...rs2.map(remapStr));
          body = [...b2].map(ch => remap.get(ch) ?? ch).join('');
          best = t; changed = true; deleted = true; break;
        }
      }
    }
    if (!deleted) break;
  }

  if (!rules.length || best >= base) return null;
  return { rules, body, tokens: best };
}

/** Delimiter tournament within the pool's group; the delimiter may not occur
 *  in any expansion (the body is never split, so body occurrences are fine). */
function frameGrammar(poolIdx: number, xr: XrGrammar): { wire: string; tokens: number; delim: string } | null {
  let bestD = '', bestT = Infinity;
  for (const d of LOGOS_DELIM_GROUPS[poolIdx]) {
    if (xr.rules.some(r => r.includes(d))) continue;
    const t = countTokens(LOGOS_START + d + xr.rules.join(d) + LOGOS_BODY_SEPARATOR + xr.body, 'o200k_base');
    if (t < bestT) { bestT = t; bestD = d; }
  }
  if (!bestD) return null;
  return { wire: LOGOS_START + bestD + xr.rules.join(bestD) + LOGOS_BODY_SEPARATOR + xr.body, tokens: bestT, delim: bestD };
}

/* ---------------------------------------------------------------------------
 * 4. DECODE — total, and executable by an LLM from this message alone
 * ------------------------------------------------------------------------- */
export async function logosDecode(wire: string): Promise<string> {
  if (!wire.startsWith(LOGOS_START)) return proteusDecode(wire);
  if (wire.length < LOGOS_START.length + 1) return wire;
  const d = wire[LOGOS_START.length];
  const poolIdx = logosPoolForDelim(d);
  if (poolIdx < 0) return wire;
  const pool = LOGOS_POOLS[poolIdx];
  const boundary = wire.indexOf(LOGOS_BODY_SEPARATOR, LOGOS_START.length + 1);
  if (boundary < 0) return wire;
  const tape = wire.slice(LOGOS_START.length + 1, boundary);
  if (!tape) return wire;
  const rules = tape.split(d);
  if (rules.length > pool.length) return wire;
  let body = wire.slice(boundary + LOGOS_BODY_SEPARATOR.length);
  // Reverse-order macro expansion: symbol i is replaced by expansion i in the
  // body and in every earlier expansion (definitions may use definitions).
  for (let i = rules.length - 1; i >= 0; i--) {
    const g = pool[i];
    body = body.split(g).join(rules[i]);
    for (let j = 0; j < i; j++) rules[j] = rules[j].split(g).join(rules[i]);
  }
  return kairosDecode(body);
}

/* ---------------------------------------------------------------------------
 * 5. ENCODE — dual-ranking tournament, exact Pareto gate against PROTEUS
 * ------------------------------------------------------------------------- */
const UPPER_LAYER_FRAMES = ['⬥', '⬤', '⬣', '⬢', '⬡', '◆\n', '◇\n', '◊\n'];

export async function logosEncode(text: string, enc: EncodingName = 'o200k_base'): Promise<LogosResult> {
  const proteus = await proteusEncode(text, enc);
  const fallback = (note: string): LogosResult => ({
    ...proteus, mode: `logos:${proteus.mode}`,
    notes: `${proteus.notes}; LOGOS ${note}`, logosRules: 0,
  });
  if (enc !== 'o200k_base') return fallback('encoding fallback (o200k_base only)');

  // If every layer above KAIROS fell back, the PROTEUS wire IS the kairos wire
  // (kairosDecode passes non-kairos text through unchanged, so this is safe
  // even for adversarially framed raw text). Otherwise re-derive the base.
  const upperFired = UPPER_LAYER_FRAMES.some(f => proteus.wire.startsWith(f));
  const kairos: KairosResult = upperFired ? await kairosEncode(text, enc) : ({ ...proteus } as KairosResult);
  const base = kairos.wire;

  if (base.length < 16 || base.length > 65536 || base.includes(LOGOS_BODY_SEPARATOR) || base.includes(LOGOS_PLACEHOLDER))
    return fallback('structural fallback');

  const poolIdx = LOGOS_POOLS.findIndex(p => p.length >= 4 && !base.includes(p[0]));
  if (poolIdx < 0) return fallback('glyph-pool exhaustion fallback');
  const pool = LOGOS_POOLS[poolIdx];

  const big = base.length > 30000;
  const opts = { maxRules: Math.min(pool.length, 128), maxLen: big ? 64 : 140, verifyK: big ? 192 : 512 };
  const variants: Array<{ xr: XrGrammar; variant: string }> = [];
  const v1 = induceXrGrammar(base, pool, { ...opts, tokenRank: false });
  if (v1) variants.push({ xr: v1, variant: 'char-ranked' });
  if (base.length <= 20000) {
    const v2 = induceXrGrammar(base, pool, { ...opts, tokenRank: true });
    if (v2) variants.push({ xr: v2, variant: 'token-ranked' });
  }

  let bestWire: string | null = null, bestTokens = Infinity, bestDelim = '', bestVariant = '', bestRules = 0;
  for (const { xr, variant } of variants) {
    const framed = frameGrammar(poolIdx, xr);
    if (!framed || framed.tokens >= bestTokens) continue;
    bestWire = framed.wire; bestTokens = framed.tokens;
    bestDelim = framed.delim; bestVariant = variant; bestRules = xr.rules.length;
  }

  if (!bestWire || bestTokens >= proteus.outTokens)
    return fallback('exact-cost fallback');

  const decoded = await logosDecode(bestWire);
  if (decoded !== text)
    return fallback('round-trip fallback');

  return {
    ...proteus,
    wire: bestWire, decoded, exact: decoded === text, outTokens: bestTokens,
    savingsPct: proteus.inTokens ? Math.round((1 - bestTokens / proteus.inTokens) * 1000) / 10 : 0,
    mode: 'logos:self-referential-lexicon',
    regimes: [...(proteus.regimes ?? []), 'self-referential-lexicon'],
    notes: `LOGOS ${bestRules}-rule cross-referential SLP over the KAIROS wire (${bestVariant}, pool ${LOGOS_POOL_RANGES[poolIdx][0]}, delimiter '${bestDelim}'); ${proteus.outTokens - bestTokens} tokens beyond PROTEUS`,
    logosRules: bestRules, logosDelimiter: bestDelim, logosPool: poolIdx, logosVariant: bestVariant,
  };
}

/* ---------------------------------------------------------------------------
 * 6. DECODER PROMPT — everything the model needs in ONE user message
 * ------------------------------------------------------------------------- */
export function logosDecoderPrompt(wire?: string): string {
  const tables = LOGOS_DELIM_GROUPS.map((group, i) => {
    const glyphs = LOGOS_POOLS[i].join('');
    return `delimiter in [${group.join('')}] → symbols: ${glyphs}`;
  }).join('\n');
  return `Decode this LOGOS-Ω payload in this same user message. The wire starts with Ω. The single character right after Ω is the delimiter d. Find the first 乙 after it: everything between d and 乙 is the definition tape, everything after 乙 is the body. Split the tape at every d; the pieces are expansions e0, e1, e2, … in order. The delimiter d selects one fixed ordered symbol table from the list below: expansion ei corresponds to the i-th symbol of that table (counting from the left, i = 0 first). Definitions are self-referential: an expansion may contain the symbols of other definitions (earlier or later on the tape). Process the expansions from LAST to FIRST: at step i, replace every occurrence of symbol i by expansion i, both in the body and inside every earlier expansion (expansions with index less than i). Later steps will resolve any symbols that remain. After all symbols are processed, the body is a complete KAIROS-Ω wire: execute the complete KAIROS instructions below to finish. Delimiter characters inside the tape are framing, not text. Preserve every other character exactly and output only the reconstruction. No system prompt, skills.md, plugin, tool, prior turn, or external dictionary is available.

SYMBOL TABLES (delimiter group → ordered symbols; expansion i ↔ symbol i, counted from 0)
${tables}

${kairosDecoderPrompt()}${wire ? `\n\nLOGOS PAYLOAD\n${wire}` : ''}`;
}
