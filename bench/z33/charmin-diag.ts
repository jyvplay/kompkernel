// Z33 diagnostic: VERITAS-C char-candidate minimum length as a parameter (copy of charCandidates).
import { countTokens, type EncodingName } from '@/lib/omega/bpe';
import type { Cand } from '@/lib/omega/veritas-u';
export function charCandidatesMin(text: string, enc: EncodingName, CMIN: number): Cand[] {
  const N = text.length;
  if (N > 60000 || N < CMIN * 2) return [];
  const codes = new Uint32Array(N);
  for (let i = 0; i < N; i++) codes[i] = text.charCodeAt(i);
  const B = 0x01000193;
  const H = new Uint32Array(N);
  const pre: { L: number; pos: number; hits: number; est: number }[] = [];
  for (let L = 1; L <= 80; L++) {
    const cnt = new Map<number, { hits: number; pos: number }>();
    for (let i = 0; i + L <= N; i++) {
      H[i] = (Math.imul(H[i], B) ^ codes[i + L - 1]) >>> 0;
      if (L < CMIN) continue;
      const hit = cnt.get(H[i]);
      if (hit) hit.hits++; else cnt.set(H[i], { hits: 1, pos: i });
    }
    if (L < CMIN) continue;
    for (const { hits, pos } of cnt.values()) {
      if (hits < 2) continue;
      const est = Math.max(1, Math.round(L / 3.5));
      const gain = hits * (est - 1) - (est + 1);
      if (gain > 0) pre.push({ L, pos, hits, est: gain });
    }
  }
  pre.sort((a, b) => b.est - a.est);
  const top = pre.slice(0, 3000 * 3);
  const scored: Cand[] = [];
  const seen = new Set<string>();
  for (const c of top) {
    const phrase = text.slice(c.pos, c.pos + c.L);
    if (seen.has(phrase)) continue;
    seen.add(phrase);
    const tok = countTokens(phrase, enc);
    const gain = c.hits * (tok - 1) - (tok + 1);
    if (gain > 0) scored.push({ phrase, win: tok, anchorHits: c.hits });
  }
  scored.sort((x, y) => (y.anchorHits * (y.win - 1) - (y.win + 1)) - (x.anchorHits * (x.win - 1) - (x.win + 1)));
  return scored.slice(0, 3000);
}

// Search width of the best-improvement pass (candidates trial-encoded per step).
const BEST_WIDTH = 20;

interface Greedy { entries: VeritasCEntry[]; body: string }

// Pass 1 (first-improvement): walk the ordered candidates once, accept each that lowers the exact wire.
function greedyFirst(text: string, enc: EncodingName, pool: string[], list: Cand[]): Greedy {
  let body = escBody(text);
  const entries: VeritasCEntry[] = [];
  let curTok = countTokens(body, enc);
  for (const cand of list) {
    if (entries.length >= pool.length) break;
    const key = pool[entries.length];
    const parts = body.split(escBody(cand.phrase));
    const hits = parts.length - 1;
    if (hits < 2) continue;
    const candBody = parts.join(key);
    const candTok = countTokens(wireC([...entries, { key, phrase: cand.phrase }], candBody), enc);
    if (candTok >= curTok) continue;
    curTok = candTok;
    body = candBody;
    entries.push({ key, phrase: cand.phrase, hits, winTokens: cand.win });
  }
  return { entries, body };
}

// Pass 2 (best-improvement): each step re-derives candidates from the current body, trial-encodes the
// top BEST_WIDTH by estimated saving, and keeps the trial with the fewest exact wire tokens.
function greedyBest(text: string, enc: EncodingName, pool: string[]): Greedy {
  let body = escBody(text);
  const entries: VeritasCEntry[] = [];
  let curTok = countTokens(body, enc);
  while (entries.length < pool.length) {
    const toks = tokenStrings(body, enc);
    const tokMap = new Map<string, Cand>();
    for (const W of WINDOWS) collectCandidates(toks, W, tokMap);
    const merged = [...tokMap.values(), ...charCandidates(body, enc)];
    const seen = new Set<string>();
    const score = (c: Cand) => c.anchorHits * (c.win - 1) - (c.win + 1);
    const top = merged
      .filter((c) => (seen.has(c.phrase) ? false : (seen.add(c.phrase), true)))
      .filter((c) => c.anchorHits >= 2)
      .sort((x, y) => score(y) - score(x))
      .slice(0, BEST_WIDTH);
    const key = pool[entries.length];
    let best: { phrase: string; body: string; tok: number; hits: number; win: number } | null = null;
    for (const c of top) {
      const parts = body.split(escBody(c.phrase));
      const hits = parts.length - 1;
      if (hits < 2) continue;
      const candBody = parts.join(key);
      const t = countTokens(wireC([...entries, { key, phrase: c.phrase }], candBody), enc);
      if (t < curTok && (!best || t < best.tok)) best = { phrase: c.phrase, body: candBody, tok: t, hits, win: c.win };
    }
    if (!best) break;
    curTok = best.tok;
    body = best.body;
    entries.push({ key, phrase: best.phrase, hits: best.hits, winTokens: best.win });
  }
  return { entries, body };
}


