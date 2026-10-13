// Z34 probe: first greedy step on a prose file. Exact token effect of the top-ranked candidates (one entry each).
import fs from 'node:fs';
import { countTokens, tokenStrings } from '@/lib/omega/bpe';
import { aliasPool, escBody } from '@/lib/omega/veritas-a';
import { rankedCandidatesS, wireS } from '@/lib/omega/veritas-s';
const enc = 'o200k_base' as const;
const f = process.argv[2];
const text = fs.readFileSync(f, 'utf8');
const body = escBody(text);
const base = countTokens(body, enc);
const ranked = rankedCandidatesS(body, enc);
const pool = aliasPool(enc).filter((c) => !text.includes(c));
console.log(JSON.stringify({ file: f, base, ranked: ranked.length, poolHead: pool.slice(0, 8) }));
let shown = 0, improving = 0;
for (const c of ranked.slice(0, 400)) {
  const parts = body.split(escBody(c.phrase));
  if (parts.length - 1 < 2) continue;
  const cb = parts.join(pool[0]);
  const t = countTokens(wireS([{ key: pool[0], phrase: c.phrase }], cb), enc);
  if (t < base) improving++;
  if (shown++ < 12) console.log(JSON.stringify({ phrase: c.phrase.slice(0, 40), win: c.win, hits: c.anchorHits, occ: parts.length - 1, t, delta: t - base, keyTok: countTokens(pool[0], enc) }));
}
console.log(JSON.stringify({ tried: shown, improving }));
