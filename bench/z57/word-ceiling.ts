// X12: ceiling test for the user's language-substitution idea (whole-word aliases).
// For each word (ASCII letters, with the leading space o200k sees mid-sentence) with cost c>1 tokens,
// an alias that costs 1 token would save (c-1) per occurrence, but each DISTINCT alias needs a definition
// whose cost we lower-bound by c (spelling the word once) + DEF (the alias syntax, 3 tokens).
// Net ceiling = sum over distinct multi-token words of max(0, n*(c-1) - c - DEF). No foreign-language
// translation is charged here: a foreign alias is at best 1 token, so this is an upper bound on the idea.
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
const DEF = 3;
for (const f of process.argv.slice(2)) {
  const text = fs.readFileSync(f, 'utf8');
  const total = countTokens(text, 'o200k_base');
  const counts = new Map<string, number>();
  for (const m of text.matchAll(/ ?[A-Za-z]{2,}/g)) counts.set(m[0], (counts.get(m[0]) ?? 0) + 1);
  let excess = 0, net = 0, distinctMulti = 0, occMulti = 0;
  for (const [w, n] of counts) {
    const c = countTokens(w, 'o200k_base');
    if (c <= 1) continue;
    distinctMulti++; occMulti += n; excess += n * (c - 1);
    net += Math.max(0, n * (c - 1) - c - DEF);
  }
  console.log(JSON.stringify({ lane: f.split('/').pop(), totalTokens: total, multiTokenWordTypes: distinctMulti, multiTokenWordOccurrences: occMulti, excessTokens: excess, excessPct: +(100 * excess / total).toFixed(1), netCeilingTokens: net, netCeilingPct: +(100 * net / total).toFixed(1) }));
}
