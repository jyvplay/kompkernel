import { countTokens } from '@/lib/omega/bpe';
const enc='o200k_base' as any;
const P='¶';
const NEST='expand repeatedly; print result only.';
const FLAT='expand; print result only.';
const heads = [
 ['V0 current   ', `Letters before ${P} name the phrases after them. Then `],
 ['k=v Then     ', `Before ${P} k=v. Then `],
 ['k=v;         ', `Before ${P} k=v. `],
 ['k=v no-then  ', `Before ${P} k=v; `],
 ['k=v colon    ', `Before ${P}: k=v. `],
 ['k=v pre      ', `k=v before ${P}. `],
 ['kv           ', `Before ${P} kv. `],
 ['k=v, Then    ', `Before ${P} k=v, then `],
 ['key=phrase   ', `Before ${P} key=phrase. `],
 ['k=v→         ', `Before ${P} k→v. `],
 ['letters      ', `Letters before ${P} name text to the next. `],
 ['NONE         ', ``],
];
console.log('head'.padEnd(16),'NEST'.padStart(6),'FLAT'.padStart(6),'  (current = 17 / 16)');
const rows=heads.map(([n,h])=>({n,h,a:countTokens(h+NEST,enc),b:countTokens(h+FLAT,enc)}));
rows.sort((x,y)=>x.a-y.a);
for(const r of rows) console.log(r.n.padEnd(16),String(r.a).padStart(6),String(r.b).padStart(6),'  ',JSON.stringify(r.h+NEST));
