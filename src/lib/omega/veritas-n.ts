/**
 * src/lib/omega/veritas-n.ts
 * =============================================================================
 * VERITAS-N — VERITAS-U with a NESTED header (exact, byte-perfect, decoder-verified, one greedy pass).
 *
 * WHY (measured in Z32 with real o200k tokens; bench/z32/headroom.ts, bench/z32/nest-probe.ts):
 *   In a VERITAS-U wire the dictionary header is a large share of the output: 14.7% on the 111 fresh docs,
 *   16.3% on ops, 23.4% on code. Dictionary entries overlap: the phrase "A B C" is stored in full even when the
 *   shorter entry "A B" is also in the header. A header phrase that refers to a shorter entry's alias character
 *   (the body alias mechanism, applied inside the header) removes that repetition without touching the body.
 *   Probe on the VERITAS-U selection (no re-selection): wire -1.87% over all lane groups; ops -3.06%;
 *   code -3.88%; realjson -2.75%; fresh -1.97%; prose -0.13%.
 *
 * WIRE
 *   "[[VXN\n" sentinel, "# VXN: ..." legend, one "X=T" line per alias, "]]", then the escaped body.
 *   T is an escaped header phrase in which any alias character X of a SHORTER entry may appear. The body uses
 *   bare aliases exactly as in VXA. An input without the sentinel decodes to itself.
 *   Alias characters are chosen not to occur in the input, so a bare alias in T or in the body never collides
 *   with literal text. Expansion is a DAG: an entry only refers to strictly shorter phrases.
 *
 * SELECTION: the same single greedy pass as VERITAS-U over the same candidate set, but each candidate is scored by
 *   the NESTED wire (so a long phrase that is built from existing entries is cheap). A candidate is kept iff the
 *   nested wire without the legend measures fewer o200k tokens.
 * DECODE: veritasADecode (VXN is flattened to a VXA wire, then the VXA decoder runs). The encoder decodes its own
 *   output and falls back to identity on any mismatch.
 * =============================================================================
 */
import { countTokens, tokenStrings, type EncodingName } from './bpe';
import { aliasPool, escBody, escHeader, veritasADecode, VXA_SENTINEL, VXN_SENTINEL, VXC_SENTINEL } from './veritas-a';
import { collectCandidates, orderCands, TERMINATOR, type Cand } from './veritas-u';

export const VXN_LEGEND = '# VXN: X=T; bare X means T; T may use other X; ~~ is ~; ~N newline ~R CR; header ends ]]';  // 32 o200k tokens
const WINDOWS = [2, 3, 4] as const;
const POOL_SIZE = 240;
const MAX_MINE_TOKENS = 220_000;

export interface VeritasNEntry { key: string; phrase: string; hits: number; winTokens: number }
export interface VeritasNResult {
  wire: string;
  decoded: string;
  exact: boolean;
  mode: 'identity' | 'dict' | 'forced-wrap';
  entries: VeritasNEntry[];
  inTokens: number;
  outTokens: number;
}

/**
 * Nested header lines: each entry phrase, with every occurrence of a strictly shorter entry phrase replaced by that
 * entry's alias character (longest first, left to right). Expanding the result recovers the phrase exactly.
 */
export function nestedHeaderPhrases(entries: { key: string; phrase: string }[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const e of entries) {
    const subs = entries
      .filter((q) => q.phrase !== e.phrase && q.phrase.length < e.phrase.length && e.phrase.includes(q.phrase))
      .sort((x, y) => y.phrase.length - x.phrase.length);
    let s = e.phrase;
    for (const q of subs) if (s.includes(q.phrase)) s = s.split(q.phrase).join(q.key);
    out.set(e.key, s);
  }
  return out;
}

export function wireNested(entries: { key: string; phrase: string }[], body: string): string {
  const nh = nestedHeaderPhrases(entries);
  const lines = entries.map((e) => e.key + '=' + escHeader(nh.get(e.key)!)).join('\n');
  return VXN_SENTINEL + VXN_LEGEND + '\n' + lines + '\n' + TERMINATOR + '\n' + body;
}

export function veritasNEncode(text: string, enc: EncodingName = 'o200k_base'): VeritasNResult {
  const inTokens = countTokens(text, enc);
  const identity = (): VeritasNResult => ({ wire: text, decoded: text, exact: true, mode: 'identity', entries: [], inTokens, outTokens: inTokens });
  if (text.length === 0) return identity();
  const mustWrap = text.startsWith(VXA_SENTINEL) || text.startsWith(VXN_SENTINEL) || text.startsWith(VXC_SENTINEL);
  const pool = aliasPool(enc).filter((c) => !text.includes(c)).slice(0, POOL_SIZE);

  const toks = tokenStrings(text, enc);
  const union = new Map<string, Cand>();
  for (const W of WINDOWS) collectCandidates(toks, W, union);
  const list = [...union.values()];
  orderCands(list, 'old');

  let body = escBody(text);
  const entries: VeritasNEntry[] = [];
  let curTok = countTokens(body, enc);
  for (const cand of list) {
    if (entries.length >= pool.length) break;
    const key = pool[entries.length];
    const parts = body.split(escBody(cand.phrase));
    const hits = parts.length - 1;
    if (hits < 2) continue;
    const candBody = parts.join(key);
    const candTok = countTokens(wireNested([...entries, { key, phrase: cand.phrase }], candBody), enc);
    if (candTok >= curTok) continue;
    curTok = candTok;
    body = candBody;
    entries.push({ key, phrase: cand.phrase, hits, winTokens: cand.win });
  }

  let wire: string;
  let mode: VeritasNResult['mode'];
  if (entries.length > 0) {
    wire = wireNested(entries, body);
    mode = 'dict';
  } else if (mustWrap) {
    wire = VXN_SENTINEL + VXN_LEGEND + '\n' + TERMINATOR + '\n' + escBody(text);
    mode = 'forced-wrap';
  } else {
    return identity();
  }
  const decoded = veritasADecode(wire);
  if (decoded !== text) return identity();
  return { wire, decoded, exact: true, mode, entries, inTokens, outTokens: countTokens(wire, enc) };
}

export function veritasNDecode(wire: string): string {
  return veritasADecode(wire);
}
