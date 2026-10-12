/**
 * src/lib/omega/veritas-ch.ts
 * =============================================================================
 * VERITAS-CH — VERITAS-A with CHARACTER-aligned candidate mining (exact, byte-perfect).
 *
 * WHY: VERITAS-A mines candidate phrases from BPE token windows. A phrase the tokenizer splits at an
 * unlucky boundary (a path fragment, "/-/", "node_modules/") is never a candidate, although it recurs.
 * VERITAS-CH mines character substrings (several lengths), ranks them by estimated saving, and keeps
 * a candidate only if the REAL token count of the wire (no legend) falls.
 *
 * WIRE: identical to VERITAS-A (same sentinel, same entries, same escapes), so the VERITAS-A decoder
 * (veritasADecode) decodes it. Only the encoder's choice of phrases differs.
 * =============================================================================
 */
import { countTokens, type EncodingName } from '@/lib/omega/bpe';
import { aliasPool, escBody, escHeader, veritasADecode, VXA_LEGEND_V2, VXA_SENTINEL, type VxaResult, type VxaEntry } from '@/lib/omega/veritas-a';

const LENGTHS = [6, 8, 12, 16, 24, 32];
const MIN_COUNT = 3;
const TOP = 400;
const TERMINATOR = ']]';
const POOL_SIZE = 240;

export function veritasCharEncode(text: string, enc: EncodingName, legend: string = VXA_LEGEND_V2): VxaResult {
  const inTokens = countTokens(text, enc);
  const identity = (): VxaResult => ({ wire: text, decoded: text, exact: true, mode: 'identity', entries: [], inTokens, outTokens: inTokens });
  if (text.length === 0) return identity();
  const mustWrap = text.startsWith(VXA_SENTINEL);
  const keys = aliasPool(enc).filter((c) => !text.includes(c)).slice(0, POOL_SIZE);

  // character-substring candidates with count >= MIN_COUNT, ranked by estimated saving
  const counts = new Map<string, number>();
  for (const L of LENGTHS) {
    for (let i = 0; i + L <= text.length; i++) {
      const s = text.substr(i, L);
      if (s.includes('\n') && s.trim().length < 3) continue;
      counts.set(s, (counts.get(s) ?? 0) + 1);
    }
  }
  const cands: { phrase: string; est: number }[] = [];
  for (const [phrase, c] of counts) {
    if (c < MIN_COUNT) continue;
    const approxTok = Math.max(1, Math.ceil(phrase.length / 4));
    const est = (c - 1) * (approxTok - 1) - (approxTok + 3);
    if (est > 0) cands.push({ phrase, est });
  }
  cands.sort((x, y) => y.est - x.est || (x.phrase < y.phrase ? -1 : x.phrase > y.phrase ? 1 : 0));

  const wireOf = (entries: VxaEntry[], body: string): string => {
    if (entries.length === 0) return body;
    return VXA_SENTINEL + entries.map((e) => e.key + '=' + escHeader(e.phrase)).join('\n') + '\n' + TERMINATOR + '\n' + body;
  };

  let body = escBody(text);
  const entries: VxaEntry[] = [];
  let curTok = countTokens(body, enc);
  let tried = 0;
  for (const cand of cands) {
    if (entries.length >= keys.length) break;
    const key = keys[entries.length];
    const phraseB = escBody(cand.phrase);
    const parts = body.split(phraseB);
    const hits = parts.length - 1;
    // Dead candidates (every occurrence already replaced) cost nothing and do not count against the cap.
    if (hits < 2) continue;
    if (tried >= TOP) break;
    tried++;
    const candBody = parts.join(key);
    const newEntries = [...entries, { key, phrase: cand.phrase, hits, winTokens: 0 }];
    const candTok = countTokens(wireOf(newEntries, candBody), enc);
    if (candTok >= curTok) continue;
    curTok = candTok;
    body = candBody;
    entries.push({ key, phrase: cand.phrase, hits, winTokens: 0 });
  }

  let wire: string;
  let mode: VxaResult['mode'];
  if (entries.length > 0) {
    wire = VXA_SENTINEL + legend + '\n' + entries.map((e) => e.key + '=' + escHeader(e.phrase)).join('\n') + '\n' + TERMINATOR + '\n' + body;
    mode = 'dict';
  } else if (mustWrap) {
    wire = VXA_SENTINEL + legend + '\n' + TERMINATOR + '\n' + escBody(text);
    mode = 'forced-wrap';
  } else {
    return identity();
  }
  const decoded = veritasADecode(wire);
  if (decoded !== text) return identity();
  return { wire, decoded, exact: true, mode, entries, inTokens, outTokens: countTokens(wire, enc) };
}
