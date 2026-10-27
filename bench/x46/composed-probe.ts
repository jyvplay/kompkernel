import fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { apographeEncode, apographeDecodeResult } from '../../src/lib/omega/apographe';

function suffixFold(text: string, suffix: string, marker: string) {
  if (text.includes(marker)) return null;
  const lines = text.split('\n'); let hits = 0;
  const body = lines.map(line => {
    const m = line.match(/^(.*?\s+)([^\s]+)$/);
    if (!m || !m[2].includes('/') || !m[2].endsWith(suffix)) return line;
    hits++; return m[1] + m[2].slice(0, -suffix.length) + marker;
  }).join('\n');
  if (hits < 3) return null;
  const restore = (s: string) => s.split('\n').map(line => {
    const m = line.match(/^(.*?\s+)([^\s]+)$/);
    return m && m[2].endsWith(marker) ? m[1] + m[2].slice(0,-marker.length) + suffix : line;
  }).join('\n');
  return { body, hits, restore, clause: `In each final path field, ${marker} stands for the exact suffix ${JSON.stringify(suffix)}; restore it. Print only.` };
}
const file='bench/holdout-ops/find-listing.txt';
const text=fs.readFileSync(file,'utf8');
const suffixes=['.js','.json','.ts','.map','.cjs','.mjs','.md','.py','.sh','.txt','.d.ts','.test.js','.spec.js'];
const picks:any[]=[];
for(const s of suffixes){ const t=suffixFold(text,s,'~'); if(!t) continue; const m=countTokens(t.clause+'\n'+t.body,'o200k_base'); picks.push({s,t,m}); }
picks.sort((a,b)=>a.m-b.m);
console.error('pre',picks.slice(0,5).map(x=>({suffix:x.s,hits:x.t.hits,m:x.m,raw:countTokens(text,'o200k_base')})));
const results:any[]=[];
for(const x of picks.slice(0,2)){
 const p=apographeEncode(x.t.body,'o200k_base');
 const restored=apographeDecodeResult(p); const clause=p.contract? p.contract.replace(/; print only\.$/,` ${x.t.clause}`):x.t.clause;
 const message=clause+'\n'+p.wire, M=countTokens(message,'o200k_base');
 results.push({suffix:x.s,marker:'~',hits:x.t.hits,apographeArm:p.apographe,apographeM:p.messageTokens,apographeParent:p.apographeParentTokens,M,exact:restored===x.t.body&&x.t.restore(restored)===text,clause,wire:p.wire});
 console.error('done',x.s,'M',M,'parent',p.messageTokens,'exact',restored===x.t.body&&x.t.restore(restored)===text);
}
console.log(JSON.stringify({file,raw:countTokens(text,'o200k_base'),X45_Synkrisis_M:1267,results},null,2));
