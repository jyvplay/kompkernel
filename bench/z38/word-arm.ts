// Z38 probe: VERITAS greedy (exact recount, cyrillic pool) with WHOLE-WORD candidates ranked first, the word arm
// that DAEDALUS uses. Same wire (wireR) and decoder. Bench-only; reports exact tokens and entries.
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { aliasPool, escBody } from '@/lib/omega/veritas-a';
import { wireR, veritasRDecode } from '@/lib/omega/veritas-r';
import { rankedCandidatesS } from '@/lib/omega/veritas-s';
const enc = 'o200k_base' as const;
function wordCands(body: string): string[] {
  const m = body.match(/ ?[A-Za-z][A-Za-z'\-]{2,}/g) ?? [];
  const cnt = new Map<string, number>();
  for (const w of m) cnt.set(w, (cnt.get(w) ?? 0) + 1);
  return [...cnt.entries()].filter(([, c]) => c >= 2).sort((a, b) => (b[1] - 1) * b[0].length - (a[1] - 1) * a[0].length).map(([w]) => w);
}
function run(text: string, opt: { kImprove: number; maxTrials: number; words: boolean }) {
  const basePool = aliasPool(enc).filter((c) => !text.includes(c));
  const cyr = (c: string) => { const k = c.codePointAt(0)!; return k >= 0x400 && k <= 0x4ff; };
  const pool = [...basePool.filter(cyr), ...basePool.filter((c) => !cyr(c))].slice(0, 240);
  let entries: { key: string; phrase: string }[] = [];
  let body = escBody(text);
  let cur = countTokens(wireR([], body), enc);
  while (entries.length < pool.length) {
    const key = pool[entries.length];
    const cands: string[] = [];
    const seen = new Set<string>();
    if (opt.words) for (const w of wordCands(body)) { if (!seen.has(w)) { seen.add(w); cands.push(w); } }
    for (const c of rankedCandidatesS(body, enc)) if (!seen.has(c.phrase)) { seen.add(c.phrase); cands.push(c.phrase); }
    const improving: { phrase: string; body: string; t: number }[] = [];
    let trials = 0;
    for (const p of cands) {
      if (improving.length >= opt.kImprove || trials >= opt.maxTrials) break;
      const parts = body.split(escBody(p));
      if (parts.length - 1 < 2) continue;
      trials++;
      const cb = parts.join(key);
      const t = countTokens(wireR([...entries, { key, phrase: p }], cb), enc);
      if (t < cur) improving.push({ phrase: p, body: cb, t });
    }
    if (!improving.length) break;
    const best = improving.reduce((a, b) => (b.t < a.t ? b : a));
    cur = best.t; body = best.body; entries.push({ key, phrase: best.phrase });
  }
  const wire = wireR(entries, body);
  return { tokens: countTokens(wire, enc), entries: entries.length, exact: veritasRDecode(wire) === text };
}
const f = process.argv[2];
const text = fs.readFileSync(f, 'utf8');
const mode = process.argv[3] ?? 'words';
const r = run(text, { kImprove: 100, maxTrials: 4000, words: mode === 'words' });
console.log(JSON.stringify({ f: f.split('/').pop(), mode, ...r }));
