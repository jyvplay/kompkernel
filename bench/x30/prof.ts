import fs from 'node:fs';
import * as bpe from '@/lib/omega/bpe';
const enc='o200k_base' as any;
// wrap countTokens to gather stats
let n=0, totalChars=0, totalMs=0;
const buckets: Record<string,{n:number,ms:number}> = {};
const orig = bpe.countTokens;
const patched = ((s:string, e:any)=>{
  const t0=process.hrtime.bigint();
  const r=(orig as any)(s,e);
  const ms=Number(process.hrtime.bigint()-t0)/1e6;
  n++; totalChars+=s.length; totalMs+=ms;
  const b = s.length<=4?'<=4' : s.length<=16?'5-16' : s.length<=64?'17-64' : s.length<=256?'65-256' : '>256';
  (buckets[b] ??= {n:0,ms:0}); buckets[b].n++; buckets[b].ms+=ms;
  return r;
}) as any;
// monkeypatch the module: since ESM, patch via re-export object is not possible; instead measure by re-importing path
console.log('countTokens is a named ESM export; using static instrumentation instead');
console.log('typeof countTokens:', typeof bpe.countTokens);
console.log('exports:', Object.keys(bpe).join(','));
