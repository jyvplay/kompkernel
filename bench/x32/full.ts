import { countTokens } from '@/lib/omega/bpe';
const enc='o200k_base' as any;
const P='¶';
const cands=[
 `Letters before ${P} name the phrases after them. Then expand repeatedly; print result only.`,
 `Before ${P} k=v. expand repeatedly; print result only.`,            // shipped
 `Before ${P} k=v. expand repeatedly; print only.`,
 `Before ${P} k=v. expand*; print only.`,
 `Before ${P} k=v; expand*; print only.`,
 `Before ${P} k=v. expand*; print result only.`,
 `${P} k=v; expand repeatedly; print only.`,
 `${P} k=v; expand*; print only.`,
 `${P}: k=v; expand*; print only.`,
 `k=v before ${P}; expand repeatedly; print only.`,
 `k=v before ${P}; expand*; print only.`,
 `k=v before ${P}, expand*, print only.`,
 `Before ${P} k=v. Then expand repeatedly. Print only.`,
 `Before ${P} k=v. expand all; print only.`,
 `Before ${P} k=v. expand recursively; print only.`,
 `expand repeatedly; print result only.`,
 `expand*; print only.`,
];
const rows=cands.map(c=>({c,n:countTokens(c,enc)}));
rows.sort((a,b)=>a.n-b.n);
for(const r of rows) console.log(String(r.n).padStart(3), JSON.stringify(r.c));
