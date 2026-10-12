// Z32 diagnostic: best-improvement greedy with token windows 2..WMAX (re-derived each step), vs DAEDALUS messageTokens.
import fs from 'node:fs';
import { countTokens, tokenStrings, type EncodingName } from '@/lib/omega/bpe';
import { aliasPool, escBody } from '@/lib/omega/veritas-a';
import { collectCandidates, type Cand } from '@/lib/omega/veritas-u';
import { charCandidates, wireC } from '@/lib/omega/veritas-c';
const enc: EncodingName = 'o200k_base';
const K = Number(process.env.K ?? 20);
const WMAX = Number(process.env.WMAX ?? 12);
const WINS = Array.from({ length: WMAX - 1 }, (_, i) => i + 2);
function runBest(text: string): number {
  const inTok = countTokens(text, enc);
  const pool = aliasPool(enc).filter((c) => !text.includes(c)).slice(0, 240);
  let body = escBody(text); const entries: { key: string; phrase: string }[] = [];
  let cur = countTokens(body, enc);
  while (entries.length < pool.length) {
    const toks = tokenStrings(body, enc);
    const tm = new Map<string, Cand>();
    for (const W of WINS) collectCandidates(toks, W, tm);
    const list = [...tm.values(), ...charCandidates(body, enc)];
    const seen = new Set<string>();
    const score = (c: Cand) => c.anchorHits * (c.win - 1) - (c.win + 1);
    const top = list.filter((c) => (seen.has(c.phrase) ? false : (seen.add(c.phrase), true)))
      .filter((c) => c.anchorHits >= 2).sort((x, y) => score(y) - score(x)).slice(0, K);
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
  return entries.length ? cur : inTok;
}
const D: Record<string, number> = {};
for (const l of fs.readFileSync('/home/user/z32/daedalus-151.jsonl', 'utf8').split('\n').filter(Boolean)) { const r = JSON.parse(l); D[r.file] = r.messageTokens; }
const rows: [string, string][] = [];
for (const l of fs.readFileSync('/home/user/z31/groups-list.tsv', 'utf8').split('\n').filter(Boolean)) { const [g, f] = l.split('\t'); rows.push([g, f.startsWith('/') ? f : '/home/user/kompkernel/' + f]); }
const only = process.env.ONLY ?? '';
const agg: Record<string, [number, number, number]> = {};
for (const [g, f] of rows) {
  if (only && g !== only) continue;
  const t = fs.readFileSync(f, 'utf8');
  const w = runBest(t);
  const a = agg[g] ??= [0, 0, 0];
  a[0] += w; a[1] += D[f] ?? 0; a[2]++;
  console.log(`${g} ${f.split('/').pop()} wide=${w} dae=${D[f]}`);
}
for (const [g, a] of Object.entries(agg)) console.log('SUM', g.padEnd(13), 'n', a[2], 'wide', a[0], 'dae', a[1], `${(((a[0] - a[1]) / a[1]) * 100).toFixed(2)}%`);
