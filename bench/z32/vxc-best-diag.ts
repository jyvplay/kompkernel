// Z32 diagnostic: BEST-improvement greedy (one pass, width K) vs the shipped FIRST-improvement greedy.
// Each step re-derives candidates from the current body, trial-encodes the top K by estimated saving,
// and keeps the trial with the fewest exact wire tokens. Still a single pass: no codec tournament.
import fs from 'node:fs';
import { countTokens, tokenStrings, type EncodingName } from '@/lib/omega/bpe';
import { aliasPool, escBody } from '@/lib/omega/veritas-a';
import { collectCandidates, type Cand } from '@/lib/omega/veritas-u';
import { charCandidates, wireC, veritasCEncode } from '@/lib/omega/veritas-c';
const enc: EncodingName = 'o200k_base';
const K = Number(process.env.K ?? 40);
function runBest(text: string): { tokens: number; entries: number } {
  const inTok = countTokens(text, enc);
  const pool = aliasPool(enc).filter((c) => !text.includes(c)).slice(0, 240);
  let body = escBody(text); const entries: { key: string; phrase: string }[] = [];
  let cur = countTokens(body, enc);
  while (entries.length < pool.length) {
    const toks = tokenStrings(body, enc);
    const tm = new Map<string, Cand>();
    for (const W of [2, 3, 4] as const) collectCandidates(toks, W, tm);
    const list = [...tm.values(), ...charCandidates(body, enc)];
    const seen = new Set<string>();
    const score = (c: Cand) => c.anchorHits * (c.win - 1) - (c.win + 1);
    const top = list.filter((c) => (seen.has(c.phrase) ? false : (seen.add(c.phrase), true)))
      .filter((c) => c.anchorHits >= 2).filter((c) => !(process.env.NONL && c.phrase.includes('\n'))).sort((x, y) => score(y) - score(x)).slice(0, K);
    const key = pool[entries.length];
    let best: { phrase: string; body: string; t: number } | null = null;
    for (const c of top) {
      const parts = body.split(escBody(c.phrase));
      if (parts.length - 1 < 2) continue;
      const cb = parts.join(key);
      const t = countTokens(wireC([...entries, { key, phrase: c.phrase }], cb), enc);
      if (t < cur && (!best || t < best.t)) best = { phrase: c.phrase, body: cb, t };
    }
    if (!best) break;
    cur = best.t; body = best.body; entries.push({ key, phrase: best.phrase });
  }
  return { tokens: entries.length ? cur : inTok, entries: entries.length };
}
const sets: Record<string, string[]> = {};
for (const l of fs.readFileSync('/home/user/z31/groups-list.tsv', 'utf8').split('\n').filter(Boolean)) { const [g, f] = l.split('\t'); (sets[g] ??= []).push(f.startsWith('/') ? f : '/home/user/kompkernel/' + f); }
if (process.argv[2] === 'fresh') sets.fresh = fs.readFileSync('/home/user/z31/fresh-list.tsv', 'utf8').split('\n').filter(Boolean).map((l) => l.split('\t')[1]);
const only = process.argv[3];
let G = 0, F = 0, tStart = Date.now();
for (const [g, files] of Object.entries(sets)) {
  if (only && g !== only) continue;
  let b = 0, s = 0, n = 0; const t0 = Date.now();
  for (const f of files) {
    const t = fs.readFileSync(f, 'utf8');
    const first = veritasCEncode(t, enc).outTokens;
    const best = runBest(t).tokens;
    s += first; b += Math.min(best, first); n++;
    console.log(`  ${g} ${f.split('/').pop()} first=${first} best=${best}`);
  }
  console.log(g.padEnd(13), 'docs', String(n).padStart(3), 'first', s, 'best(min-guard)', b, `${(((b - s) / s) * 100).toFixed(2)}%`, `${((Date.now() - t0) / 1000).toFixed(0)}s`);
  G += s; F += b;
}
void G; void F; console.log('total secs', ((Date.now() - tStart) / 1000).toFixed(0));
