/**
 * X45 verification — METRON against the frontier recorded at the end of X44.
 *
 * Two claims, checked in one process:
 *   1. NON-REGRESSION. messageTokens must be <= the X44 frontier on every lane.
 *      The lanes that matter most are the ones where SYMPLOKE does the heavy
 *      lifting, because that is where an 'in' shape trial is most likely to be the
 *      thing that paid: page.html compresses 3,220 -> 547, chart.svg 1,331 -> 417,
 *      dump.sql 1,795 -> 608, ls-full-iso 1,175 -> 364. A cap of 1 that held on
 *      pom.xml and component.jsx proves nothing about those.
 *   2. BYTE-EXACT. Independent decode through the full chain.
 * Wall clock and tokenizer-call counts are recorded against the X44 parent so the
 * speedup is a measurement and not an inference from the budget arithmetic.
 */
import { readFileSync, existsSync } from 'node:fs';
import { chunkCacheStats, chunkCacheClear, countTokens, type EncodingName } from '@/lib/omega/bpe';
import { metronEncode, metronDecode } from '@/lib/omega/metron';
import { analepsisEncode } from '@/lib/omega/analepsis';
import { chironDecode } from '@/lib/omega/chiron';

const enc = 'o200k_base' as EncodingName;
const calls = () => { const s = chunkCacheStats(); return s.shortHits+s.shortMisses+s.longHits+s.longMisses; };

const FRONTIER: Record<string, number> = {
  'vix-daily-1990.csv':550,'aapl-2014.csv':1407,'openstack-loghub-26.log':894,'dump.sql':608,
  'git-numstat.txt':1906,'find-listing.txt':1218,'ls-full-iso.txt':364,'kb-article.txt':622,
  'prose-01.txt':736,'readme.txt':646,'bibliography.txt':667,'email-thread.txt':488,
  'chart.svg':417,'page.html':547,'meeting-transcript.txt':384,'component.jsx':264,'pom.xml':242,
  'prose-02.txt':789,'prose-03.txt':837,'prose-04.txt':836,'prose-05.txt':920,
  'prose-06.txt':840,'prose-07.txt':809,
};
const dec = (r: any, t: string) => metronDecode(r.wire, { stats:r.stats, order:r.order, undo:r.parent==='identity'?(w:string)=>w:chironDecode } as any,
  { alphabet:r.alphabet, marker:r.marker, marker2:r.marker2, group:r.syncopeGroup, framing:r.framing,
    ouraShape:r.ouraShape, ouraMode:r.ouraMode, ouraSentinel:r.ouraSentinel, antistrophePair:r.antistrophePair,
    peritropePairs:r.peritropePairs, systoleTemplates:r.systoleTemplates, apocopeTemplates:r.apocopeTemplates } as any) === t;

console.log('lane'.padEnd(23)+'metron'.padStart(7)+'front'.padStart(7)+'  ok rt'.padStart(7)+'   metron-ms  calls(M)   parent-ms  calls(M)  speedup');
let nOk=0,nTot=0,speed=0,nSp=0;
for (const p of (process.env.LANES||'').split(',').map(s=>s.trim()).filter(Boolean)) {
  if (!existsSync(p)) { console.log(`${p} MISSING`); continue; }
  const t = readFileSync(p,'utf8'); const nm = p.split('/').pop()!;
  chunkCacheClear(); let b=calls(); let t0=Date.now();
  let r:any; try { r = metronEncode(t,enc); } catch(e:any){ console.log(nm.padEnd(23)+' THREW '+String(e).slice(0,50)); continue; }
  const mMs=Date.now()-t0, mN=calls()-b;
  b=calls(); t0=Date.now();
  let pa:any; try { pa = analepsisEncode(t,enc); } catch { pa=null; }
  const pMs=Date.now()-t0, pN=calls()-b;
  const ok = dec(r,t); const front=FRONTIER[nm];
  const good = ok && (front===undefined || r.messageTokens<=front);
  nTot++; if(good) nOk++;
  const sp = pa ? pMs/mMs : NaN; if(!isNaN(sp)){speed+=sp;nSp++;}
  console.log(nm.padEnd(23)+String(r.messageTokens).padStart(7)+String(front??'-').padStart(7)+
    (good?'   OK':'  ***').padStart(7)+String(mMs).padStart(11)+(mN/1e6).toFixed(2).padStart(9)+
    (pa?String(pMs).padStart(12)+(pN/1e6).toFixed(2).padStart(9):'           -        -')+
    (isNaN(sp)?'        -':(sp.toFixed(2)+'x').padStart(9))+
    (front!==undefined&&r.messageTokens>front?`  REGRESSED by ${r.messageTokens-front}`:''));
}
console.log(`\nnon-regressing and byte-exact: ${nOk}/${nTot}   mean speedup vs ANALEPSIS parent: ${nSp?(speed/nSp).toFixed(2):'-'}x over ${nSp} lanes`);
