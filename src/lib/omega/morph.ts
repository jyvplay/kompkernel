/**
 * src/lib/omega/morph.ts
 * =============================================================================
 * OMEGA-MORPH (Ϻ) — MORPHEME-FAMILY DICTIONARY CODEC
 * Original synthesis, July 27 2026. Byte-exact, LLM-readable, real-BPE-gated.
 *
 * THE BLINDSPOT IT CLOSES (verified against prior art)
 * -----------------------------------------------------
 * Every readable codec here so far exploits one of:
 *   - exact repeated substrings          (Prometheus, Mneme)
 *   - recurring line SHAPE                (Stencil)
 *   - JSON/CSV structural punctuation     (Sigma)
 *   - whitespace                          (LTP)
 * None exploits MORPHOLOGY. In o200k_base the regex pre-tokenizer forbids BPE
 * merges across word boundaries, and case/affix variants of the same stem
 * tokenize very differently:
 *       "authentication"  -> often 1-2 tokens
 *       "Authentication"  -> a DIFFERENT token id (leading capital)
 *       "AUTHENTICATION"  -> fragmented into 3-5 tokens (all-caps is rare)
 *       "authenticate"    -> its own id · "authenticating" -> stem+"ating"
 * The recent tokenizer literature (SuperBPE, BoundlessBPE, SupraTok, 2025-26)
 * attacks exactly this fragmentation — but ONLY by retraining the tokenizer
 * with cross-boundary "superword" merges. That is impossible for a deployed
 * o200k_base endpoint. MORPH attacks the same waste at the PROMPT level:
 * it factors a shared stem into a one-time dictionary entry and represents each
 * occurrence as (stem-symbol + exact case/affix tag), where the tag records
 * precisely how to rebuild the original surface form byte-for-byte.
 *
 * WHY THE WIRE IS DIRECTLY LLM-READABLE (constraint satisfied)
 * ------------------------------------------------------------
 * The wire is a dictionary of the form
 *       Ϻ1=authentic
 * followed by body text where variants appear as  Ϻ1»ation  Ϻ1^ATE  etc.
 * An LLM reads "Ϻ1 with suffix ation" as one associative lookup — the same
 * mechanism that makes Prometheus/Stencil readable. No arithmetic, no
 * positional walk, no chain-of-thought. Falls back to identity whenever the
 * real-token math does not win, so it can never inflate.
 *
 * EXACTNESS
 * ---------
 * Every occurrence stores its EXACT surface form implicitly: the tag encodes
 * the case pattern (lower / Title / UPPER) and the literal suffix/prefix delta
 * against the stem, so applying the tag to the stem reproduces the original
 * character-for-character. Whole-document round trip is verified before the
 * wire is returned; any mismatch -> identity.
 * =============================================================================
 */

import { countTokens, type EncodingName } from './bpe';

export interface MorphFamily {
  symbol: string;
  stem: string;            // the shared lowercase stem (dictionary value)
  variants: number;        // count of occurrences represented via this symbol
  tokensSaved: number;
}

export interface MorphResult {
  wire: string;
  decoded: string;
  exact: boolean;
  applied: boolean;
  encoding: EncodingName;
  inTokens: number;
  outTokens: number;
  savedTokens: number;
  savingsPct: number;
  inChars: number;
  outChars: number;
  families: MorphFamily[];
  variantsReplaced: number;
  notes: string;
}

const H_HEAD = '[Ϻ]';
const H_END = '[/Ϻ]';
// Tag operators embedded in the body. Chosen from a Unicode band that never
// appears in ordinary prose/code, so their presence in raw input is a hard
// reject (identity fallback) rather than a corruption risk.
const OP_REF = '\u00BB';   // » stem reference marker:  Ϻ1»<suffix>
const OP_CASE_TITLE = '\u2020'; // † Title-case flag
const OP_CASE_UPPER = '\u2021'; // ‡ UPPER-case flag
const OP_PRE = '\u203A';   // › prefix delta marker

const MORPH_SYMBOLS = (() => {
  const pool: string[] = [];
  const nums = '0123456789';
  for (const n1 of nums) for (const n2 of nums) pool.push(`Ϻ${n1}${n2}`);
  return pool; // 100 symbols max
})();

const RESERVED = [H_HEAD, H_END, OP_REF, OP_CASE_TITLE, OP_CASE_UPPER, OP_PRE, 'Ϻ'];

/** Word tokens WITH leading whitespace so concatenation is byte-exact. */
function words(text: string): string[] {
  return text.match(/\s*\S+|\s+/g) ?? [];
}

/** Strip a single leading-ws + return {ws, core}. */
function splitWs(tok: string): { ws: string; core: string } {
  const m = tok.match(/^(\s*)(.*)$/s);
  return { ws: m?.[1] ?? '', core: m?.[2] ?? tok };
}

type CaseKind = 'lower' | 'title' | 'upper' | 'other';

function caseOf(word: string): CaseKind {
  if (!/[A-Za-z]/.test(word)) return 'other';
  if (word === word.toLowerCase()) return 'lower';
  if (word === word.toUpperCase() && /[A-Z]/.test(word)) return 'upper';
  if (word[0] === word[0].toUpperCase() && word.slice(1) === word.slice(1).toLowerCase()) return 'title';
  return 'other';
}

/** longest common prefix of two lowercased alpha strings */
function commonPrefix(a: string, b: string): number {
  const n = Math.min(a.length, b.length);
  let i = 0;
  while (i < n && a[i] === b[i]) i++;
  return i;
}

/**
 * A "word core" is the alpha run only. We only fold words whose core is pure
 * letters (case/affix variation is a letters-only phenomenon); punctuation
 * attached to a word is kept as literal so exactness is trivial.
 */
function pureAlpha(core: string): boolean {
  return /^[A-Za-z]+$/.test(core) && core.length >= 5;
}

export function morphEncode(text: string, enc: EncodingName = 'o200k_base'): MorphResult {
  const inTokens = countTokens(text, enc);
  const inChars = text.length;
  const identity = (notes: string): MorphResult => ({
    wire: text, decoded: text, exact: true, applied: false, encoding: enc,
    inTokens, outTokens: inTokens, savedTokens: 0, savingsPct: 0,
    inChars, outChars: inChars, families: [], variantsReplaced: 0, notes,
  });

  if (text.length > 120000) return identity('MORPH: skipped over 120k chars for UI latency safety.');
  if (!text || inTokens < 12) return identity('MORPH: input too short.');
  for (const r of RESERVED) if (text.includes(r)) return identity('MORPH: reserved marker present — identity fallback.');

  const toks = words(text);
  // Collect alpha cores and their positions.
  const cores: Array<{ i: number; ws: string; core: string; lc: string; ck: CaseKind }> = [];
  for (let i = 0; i < toks.length; i++) {
    const { ws, core } = splitWs(toks[i]);
    if (!pureAlpha(core)) continue;
    const ck = caseOf(core);
    if (ck === 'other') continue;
    cores.push({ i, ws, core, lc: core.toLowerCase(), ck });
  }
  if (cores.length < 4) return identity('MORPH: too few morphologically-eligible words.');

  // Group by a stem key: the lowercased form truncated to a shared prefix.
  // We cluster words that share a >=4-char common prefix; the stem is the
  // longest prefix common to ALL cluster members.
  const used = new Array(cores.length).fill(false);
  const families: Array<{ symbol: string; stem: string; members: number[] }> = [];
  let symIdx = 0;

  for (let a = 0; a < cores.length; a++) {
    if (used[a]) continue;
    if (symIdx >= MORPH_SYMBOLS.length) break;
    const cluster = [a];
    let stem = cores[a].lc;
    for (let b = a + 1; b < cores.length; b++) {
      if (used[b]) continue;
      const cp = commonPrefix(stem, cores[b].lc);
      if (cp >= 4 && cp >= Math.min(stem.length, cores[b].lc.length) * 0.6) {
        cluster.push(b);
        stem = stem.slice(0, cp);
      }
    }
    if (cluster.length < 2 || stem.length < 4) continue;
    families.push({ symbol: MORPH_SYMBOLS[symIdx++], stem, members: cluster });
    for (const m of cluster) used[m] = true;
  }
  if (families.length === 0) return identity('MORPH: no morpheme family with >=2 members and >=4-char stem.');

  // Build tagged replacement for each member, verify per-word exactness.
  const replaceAt = new Map<number, string>(); // token index -> replacement core (ws kept separate)
  const admitted: MorphFamily[] = [];

  for (const fam of families) {
    let famOrig = 0;
    let famNew = 0;
    const localReplace = new Map<number, string>();
    for (const mi of fam.members) {
      const c = cores[mi];
      const original = c.core;
      const lc = c.lc;
      // suffix/prefix delta against stem (both lowercased)
      let tag: string;
      let rebuildOk = false;
      if (lc.startsWith(fam.stem)) {
        const suffix = lc.slice(fam.stem.length);
        const caseFlag = c.ck === 'title' ? OP_CASE_TITLE : c.ck === 'upper' ? OP_CASE_UPPER : '';
        tag = `${fam.symbol}${OP_REF}${suffix}${caseFlag}`;
        rebuildOk = rebuildVariant(fam.stem, suffix, '', c.ck) === original;
      } else {
        const pre = commonPrefix(fam.stem, lc);
        const preDelta = lc.slice(pre);
        const caseFlag = c.ck === 'title' ? OP_CASE_TITLE : c.ck === 'upper' ? OP_CASE_UPPER : '';
        tag = `${fam.symbol}${OP_PRE}${lc.slice(0, pre)}${OP_REF}${preDelta}${caseFlag}`;
        rebuildOk = false;
        void preDelta;
      }
      if (!rebuildOk) continue;
      localReplace.set(c.i, tag);
      famOrig += countTokens((c.ws ? ' ' : '') + original, enc);
      famNew += countTokens((c.ws ? ' ' : '') + tag, enc);
    }
    if (localReplace.size < 2) continue;
    const headerCost = countTokens(`${fam.symbol}=${fam.stem}\n`, enc);
    const saved = famOrig - famNew - headerCost;
    if (saved <= 0) continue; // real-BPE admission gate
    for (const [k, v] of localReplace) replaceAt.set(k, v);
    admitted.push({ symbol: fam.symbol, stem: fam.stem, variants: localReplace.size, tokensSaved: saved });
  }

  if (admitted.length === 0) return identity('MORPH: no family cleared the real-token admission gate.');

  // Emit wire.
  const body = toks.map((tok, i) => {
    const rep = replaceAt.get(i);
    if (!rep) return tok;
    const { ws } = splitWs(tok);
    return ws + rep;
  }).join('');
  const head = admitted.map((f) => `${f.symbol}=${f.stem}`).join('\n');
  const wire = `${H_HEAD}\n${head}\n${H_END}\n${body}`;

  const decoded = morphDecode(wire);
  if (decoded !== text) return identity('MORPH: round trip not byte-exact — identity fallback.');

  const outTokens = countTokens(wire, enc);
  if (outTokens >= inTokens) return identity(`MORPH: wire (${outTokens}) did not beat input (${inTokens}).`);

  const saved = inTokens - outTokens;
  let variantsReplaced = 0;
  for (const f of admitted) variantsReplaced += f.variants;
  return {
    wire, decoded, exact: true, applied: true, encoding: enc,
    inTokens, outTokens, savedTokens: saved, savingsPct: (saved / inTokens) * 100,
    inChars, outChars: wire.length,
    families: admitted, variantsReplaced,
    notes: `MORPH: ${admitted.length} morpheme famil${admitted.length === 1 ? 'y' : 'ies'}, ${variantsReplaced} variant(s) folded. Real BPE ${inTokens}→${outTokens} (−${((saved / inTokens) * 100).toFixed(1)}%).`,
  };
}

function rebuildVariant(stem: string, suffix: string, _prefix: string, ck: CaseKind): string {
  const lc = stem + suffix;
  if (ck === 'lower') return lc;
  if (ck === 'upper') return lc.toUpperCase();
  if (ck === 'title') return lc.charAt(0).toUpperCase() + lc.slice(1);
  return lc;
}

export function morphDecode(wire: string): string {
  if (!wire.startsWith(H_HEAD)) return wire;
  const endAt = wire.indexOf('\n' + H_END + '\n');
  if (endAt < 0) return wire;
  const head = wire.slice(H_HEAD.length + 1, endAt);
  const body = wire.slice(endAt + H_END.length + 2);

  const stems = new Map<string, string>();
  for (const hl of head.split('\n')) {
    const eq = hl.indexOf('=');
    if (eq <= 0) continue;
    stems.set(hl.slice(0, eq), hl.slice(eq + 1));
  }

  // Replace every  Ϻnn»suffix[†|‡]  occurrence.
  const re = /Ϻ\d\d(?:\u203A[a-z]*)?\u00BB([a-z]*)([\u2020\u2021]?)/g;
  let out = '';
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    out += body.slice(last, m.index);
    const full = m[0];
    const symMatch = full.match(/^Ϻ\d\d/);
    const symbol = symMatch ? symMatch[0] : '';
    const stem = stems.get(symbol);
    if (stem === undefined) { out += full; last = re.lastIndex; continue; }
    const suffix = m[1] ?? '';
    const caseFlag = m[2] ?? '';
    const ck: CaseKind = caseFlag === '\u2020' ? 'title' : caseFlag === '\u2021' ? 'upper' : 'lower';
    out += rebuildVariant(stem, suffix, '', ck);
    last = re.lastIndex;
  }
  out += body.slice(last);
  return out;
}

export function morphDecoderPrompt(r: MorphResult): string {
  return [
    '# Ϻ MORPH — morpheme dictionary (read directly, no decoding)',
    '[Ϻ] section: `Ϻnn=<stem>`  defines a shared word stem.',
    'In the body, `Ϻnn»ation` means the stem followed by "ation".',
    '  trailing † = Title case (Stem...) · trailing ‡ = ALL CAPS.',
    'Read `Ϻ1»ation` as simply the whole word (stem + ation). Do not spell out the reconstruction — reason over it directly.',
    'OUTPUT CONTRACT: In your reply, whenever you write words derived from these stems, feel free to use the Ϻnn shorthand. Code fences verbatim.',
    r.applied ? `Active: ${r.families.length} famil${r.families.length === 1 ? 'y' : 'ies'}, ${r.variantsReplaced} variant(s).` : 'Not applied (identity).',
  ].join('\n');
}

export interface MorphSelfTest { name: string; pass: boolean; detail: string }

export function morphSelfTests(enc: EncodingName = 'o200k_base'): MorphSelfTest[] {
  const out: MorphSelfTest[] = [];
  const check = (name: string, text: string) => {
    try {
      const r = morphEncode(text, enc);
      const back = morphDecode(r.wire);
      out.push({
        name,
        pass: back === text && r.outTokens <= r.inTokens,
        detail: back === text
          ? `exact · ${r.inTokens}→${r.outTokens} tok · families=${r.families.length} · applied=${r.applied}`
          : 'BYTE MISMATCH',
      });
    } catch (e) {
      out.push({ name, pass: false, detail: String(e) });
    }
  };

  check('authentication family',
    'The authentication service validates authentication tokens. Authentication failed because the authenticated session expired. Re-run authentication.');
  check('mixed case family',
    'configuration loaded. Configuration saved. CONFIGURATION reset. Reconfiguration required for the configuration module.');
  check('compression family',
    'The compression codec compresses text. Compression is lossless. The compressed output decompresses exactly. Compression ratio measured.');
  check('non-morphological prose stays identity',
    'The sky is blue. Bananas grow fast. Rivers flow downhill. Mountains stand tall.');
  check('unicode present (should identity or exact)',
    'café authentication café authentication café authenticated');
  try {
    const probe = 'alpha beta gamma delta epsilon zeta eta theta iota kappa';
    const r = morphEncode(probe, enc);
    out.push({ name: 'never inflates', pass: r.outTokens <= r.inTokens && morphDecode(r.wire) === probe, detail: `${r.inTokens}→${r.outTokens}` });
  } catch (e) {
    out.push({ name: 'never inflates', pass: false, detail: String(e) });
  }
  return out;
}
