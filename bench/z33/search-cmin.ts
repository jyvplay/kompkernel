// Z33 diagnostic: best-improvement greedy whose step scans down the ranked candidate list until K IMPROVING
// candidates are found (or MAXT trials are spent), instead of stopping when the top-K all fail.
// Reports exact VX-level wire tokens (wireC) so it is comparable to VERITAS-C and to DAEDALUS messageTokens.
import fs from 'node:fs';
import { countTokens, tokenStrings, type EncodingName } from '@/lib/omega/bpe';
import { aliasPool, escBody } from '@/lib/omega/veritas-a';
import { collectCandidates, type Cand } from '@/lib/omega/veritas-u';
import { wireC } from '@/lib/omega/veritas-c';
import { charCandidatesMin } from './charmin-diag';
const CMIN = Number(process.env.CMIN ?? 4);
const enc: EncodingName = 'o200k_base';
const K = Number(process.env.K ?? 20);
const WMAX = Number(process.env.WMAX ?? 4);
const MAXT = Number(process.env.MAXT ?? 400);
const WINS = Array.from({ length: Math.max(0, WMAX - 1) }, (_, i) => i + 2);
export interface SearchResult { tokens: number; entries: number; trials: number; wire: string }
export function runSearch(text: string): SearchResult {
  const inTok = countTokens(text, enc);
  const pool = aliasPool(enc).filter((c) => !text.includes(c)).slice(0, 240);
  let body = escBody(text);
  const entries: { key: string; phrase: string }[] = [];
  let cur = countTokens(body, enc);
  let trialsTot = 0;
  while (entries.length < pool.length) {
    const toks = tokenStrings(body, enc);
    const tm = new Map<string, Cand>();
    for (const W of WINS) collectCandidates(toks, W, tm);
    const list = [...tm.values(), ...charCandidatesMin(body, enc, CMIN)];
    const seen = new Set<string>();
    const score = (c: Cand) => c.anchorHits * (c.win - 1) - (c.win + 1);
    const ranked = list.filter((c) => (seen.has(c.phrase) ? false : (seen.add(c.phrase), true)))
      .filter((c) => c.anchorHits >= 2).sort((x, y) => score(y) - score(x));
    const key = pool[entries.length];
    const improving: { phrase: string; body: string; t: number }[] = [];
    let trials = 0;
    for (const c of ranked) {
      if (improving.length >= K || trials >= MAXT) break;
      const parts = body.split(escBody(c.phrase));
      if (parts.length - 1 < 2) continue;
      trials++;
      const cb = parts.join(key);
      const t = countTokens(wireC([...entries, { key, phrase: c.phrase }], cb), enc);
      if (t < cur) improving.push({ phrase: c.phrase, body: cb, t });
    }
    trialsTot += trials;
    if (improving.length === 0) break;
    const best = improving.reduce((a, b) => (b.t < a.t ? b : a));
    cur = best.t; body = best.body; entries.push({ key, phrase: best.phrase });
  }
  const wire = entries.length ? wireC(entries, body) : text;
  return { tokens: entries.length ? countTokens(wire, enc) : inTok, entries: entries.length, trials: trialsTot, wire };
}
if (process.argv[2]) {
  const t = fs.readFileSync(process.argv[2], 'utf8');
  const t0 = Date.now();
  const r = runSearch(t);
  console.log(JSON.stringify({ file: process.argv[2], tokens: r.tokens, entries: r.entries, trials: r.trials, ms: Date.now() - t0 }));
}
