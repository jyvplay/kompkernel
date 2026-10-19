import { countTokens } from '@/lib/omega/bpe';
const enc='o200k_base' as any;
const P='¶';
const heads = [
 ['safe (current)',  `Letters before ${P} name the phrases after them. Then `],
 ['k=v A',           `Before ${P} key=phrase. Then `],
 ['k=v B',           `Before ${P} k=v. Then `],
 ['k=v C',           `Before ${P}: k=v. Then `],
 ['k=v D',           `Before ${P} k=v; then `],
 ['map A',           `Before ${P} each key names the phrase after it. Then `],
 ['map B',           `Keys before ${P} name the phrases after them. Then `],
 ['means A',         `Before ${P} k means v. Then `],
 ['means B',         `Before ${P}: k means v. Then `],
 ['assign',          `Before ${P}, k = v. Then `],
 ['arrow',           `Before ${P}: k → v. Then `],
 ['COMPACT none',    ``],
 ['COMPACT exp',     `Expand `],
];
const tails = [
 ['repeatedly+print', 'expand repeatedly; print result only.'],
 ['expand+print',     'expand; print result only.'],
 ['repeatedly only',  'expand repeatedly.'],
];
console.log('head'.padEnd(18), tails.map(t=>t[0].padStart(18)).join(''));
for (const [hn,h] of heads)
  console.log(hn.padEnd(18), tails.map(([tn,t])=>String(countTokens(h+t,enc)).padStart(18)).join(''));
console.log('\n--- exact strings for the best candidates ---');
for (const [hn,h] of heads) for (const [tn,t] of tails){
  const n=countTokens(h+t,enc);
  if(n<=13) console.log(String(n).padStart(3), JSON.stringify(h+t));
}
