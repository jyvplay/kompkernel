import * as O from 'gpt-tokenizer/encoding/o200k_base';
import {rankSlot3,rankSlot4} from '../../src/lib/omega/rank-hash';
import assert from 'node:assert/strict';
const core=(O as any).default.bytePairEncodingCoreProcessor,te=new TextEncoder(),keys=[new Set<number>(),new Set<number>()];
for(const s of core.bytePairStringRankEncoder.keys()){const b=te.encode(s);if(b.length===3||b.length===4){let k=0;for(const x of b)k=k*256+x;keys[b.length-3].add(k);}}
for(const [b]of core.bytePairNonUtfSortedEncoder){if(b.length===3||b.length===4){let k=0;for(const x of b)k=k*256+x;keys[b.length-3].add(k);}}
// Placement census includes non-UTF entries even if shadowed; not a production
// index census or runtime measurement. Differential tokenizer gate is separate.
for(let n=3;n<=4;n++)for(const fast of [false,true]){
 const table=new Float64Array(1<<18).fill(-1),mask=table.length-1;
 const slot=(k:number)=>fast?(n===3?rankSlot3(k):rankSlot4(Math.floor(k/65536),k&65535)):(n===3?k&mask:(Math.floor(k/65536)*31+(k&65535))&mask);
 let total=0,max=0;
 for(const k of keys[n-3]){let at=slot(k),probes=1;assert.ok(at>=0&&at<table.length);while(table[at]!==-1){at=(at+1)&mask;probes++;}table[at]=k;total+=probes;max=Math.max(max,probes);}
 let checks=0;
 for(const k of keys[n-3]){let at=slot(k);while(table[at]!==-1&&table[at]!==k)at=(at+1)&mask;assert.equal(table[at],k);checks++;}
 console.log(JSON.stringify({bytes:n,mixed:fast,keys:keys[n-3].size,averageInsertionProbes:total/keys[n-3].size,maxInsertionProbes:max,checks}));
}
