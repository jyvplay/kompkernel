import fs from 'node:fs';import * as O from 'gpt-tokenizer/encoding/o200k_base';
const m:any=O,core=m.default?.bytePairEncodingCoreProcessor??m.bytePairEncodingCoreProcessor,te=new TextEncoder(),keys=[new Set<number>(),new Set<number>()];
for(const [s] of core.bytePairStringRankEncoder){const b=te.encode(s);if(b.length===3)keys[0].add((b[0]<<16)|(b[1]<<8)|b[2]);if(b.length===4)keys[1].add(((b[0]<<24)|(b[1]<<16)|(b[2]<<8)|b[3])>>>0);}
const rows=[];for(let kind=0;kind<2;kind++)for(const arm of ['old','multiplicative']){const table=new Float64Array(1<<18).fill(-1);let insertProbes=0,maxProbe=0;
 const h=(k:number)=>arm==='multiplicative'?Math.imul(k,0x9e3779b1)>>>14:kind===0?k&((1<<18)-1):(((k>>>16)*31+(k&65535))&((1<<18)-1));
 for(const k of keys[kind]){let i=h(k),p=1;while(table[i]!==-1&&table[i]!==k){i=(i+1)&((1<<18)-1);p++;}table[i]=k;insertProbes+=p;maxProbe=Math.max(maxProbe,p);}
 rows.push({bytes:kind+3,arm,entries:keys[kind].size,insertProbes,meanInsertionProbe:insertProbes/keys[kind].size,maxProbe});}
fs.writeFileSync('bench/x154/receipts/hash-probes.json',JSON.stringify({rows,scope:'valid string vocabulary insertion probes only; causal diagnostic, not whole-stack speed'},null,2));console.log(rows);
