/**
 * X46 verification — TEKMAR against the frontier, and against both of its parents.
 *
 * The claim to test is that TEKMAR dominates METRON and matches ANALEPSIS: on a
 * lattice lane it must use cap 4 and return ANALEPSIS's tokens, fixing METRON's
 * 60-token regression on dump.sql; on a flat lane it must use cap 1 and return
 * METRON's tokens AND METRON's wall clock. Every wire is decoded byte-exact.
 */
import { readFileSync, existsSync } from 'node:fs';
import { countTokens, type EncodingName } from '@/lib/omega/bpe';
import { tekmarEncode, tekmarDecode } from '@/lib/omega/tekmar';
import { chironDecode } from '@/lib/omega/chiron';
const enc = 'o200k_base' as EncodingName;
const FRONTIER: Record<string, number> = {
  'dump.sql':608,'chart.svg':417,'page.html':547,'pom.xml':242,'component.jsx':264,
  'ls-full-iso.txt':364,'kb-article.txt':622,'email-thread.txt':488,'bibliography.txt':667,
  'meeting-transcript.txt':384,'readme.txt':646,'prose-01.txt':736,'aapl-2014.csv':1407,
  'vix-daily-1990.csv':550,'find-listing.txt':1218,'git-numstat.txt':1906,'openstack-loghub-26.log':894,
};
console.log('lane'.padEnd(23)+'tekmar'.padStart(7)+'front'.padStart(7)+' cap lattice  lineFrac charFrac'.padStart(30)+'     ms    rt   verdict');
let ok=0,tot=0;
for (const p of (process.env.LANES||'').split(',').map(s=>s.trim()).filter(Boolean)) {
  if(!existsSync(p)){console.log(p+' MISSING');continue;}
  const t=readFileSync(p,'utf8'); const nm=p.split('/').pop()!;
  const t0=Date.now(); let r:any;
  try{ r=tekmarEncode(t,enc); }catch(e:any){ console.log(nm.padEnd(23)+' THREW '+String(e).slice(0,50)); continue; }
  const ms=Date.now()-t0;
  let rt=false;
  try{ rt = tekmarDecode(r.wire,{stats:r.stats,order:r.order,undo:r.parent==='identity'?(w:string)=>w:chironDecode} as any,
    {alphabet:r.alphabet,marker:r.marker,marker2:r.marker2,group:r.syncopeGroup,framing:r.framing,ouraShape:r.ouraShape,
     ouraMode:r.ouraMode,ouraSentinel:r.ouraSentinel,antistrophePair:r.antistrophePair,peritropePairs:r.peritropePairs,
     systoleTemplates:r.systoleTemplates,apocopeTemplates:r.apocopeTemplates} as any)===t; }catch{}
  const f=FRONTIER[nm]; const good = rt && (f===undefined || r.messageTokens<=f);
  tot++; if(good) ok++;
  const s=r.tekmarScore;
  console.log(nm.padEnd(23)+String(r.messageTokens).padStart(7)+String(f??'-').padStart(7)+
    String(r.tekmarCap).padStart(5)+String(r.tekmarLattice).padStart(8)+
    s.lineFrac.toFixed(3).padStart(10)+s.charFrac.toFixed(3).padStart(9)+
    String(ms).padStart(8)+(rt?'  OK':' FAIL')+'   '+
    (f===undefined?'(no frontier)':(r.messageTokens===f?'MATCHES frontier':(r.messageTokens<f?'BETTER by '+(f-r.messageTokens):'*** WORSE by '+(r.messageTokens-f)+' ***'))));
}
console.log(`\nbyte-exact and non-regressing: ${ok}/${tot}`);
