/**
 * X47 verification — EMPEDOS: identical tokens, and identical ACROSS RUNS.
 *
 * Two claims. (1) NON-REGRESSION against the frontier recorded at the end of X46,
 * with a byte-exact decode. (2) REPEATABILITY: the same lane encoded twice in the
 * same process must return the same message size, which is the property the pinned
 * work budget exists to buy and the one the wall-clock bound cannot promise on an
 * input large enough to exhaust it.
 */
import { readFileSync, existsSync } from 'node:fs';
import { countTokens, type EncodingName } from '@/lib/omega/bpe';
import { empedosEncode, empedosDecode } from '@/lib/omega/empedos';
import { chironDecode } from '@/lib/omega/chiron';
const enc = 'o200k_base' as EncodingName;
const FRONTIER: Record<string, number> = {
  'component.jsx':264,'kb-article.txt':622,'prose-01.txt':736,'chart.svg':417,
  'meeting-transcript.txt':384,'pom.xml':242,'readme.txt':646,'bibliography.txt':667,
  'email-thread.txt':488,'ls-full-iso.txt':364,'page.html':547,'dump.sql':608,
};
const REPS = Number(process.env.REPS || 2);
console.log('lane'.padEnd(23)+'front'.padStart(6)+' cap lat'.padStart(8)+'  runs (msg/ms)'.padEnd(34)+'repeatable  rt  verdict');
let ok=0,tot=0;
for (const p of (process.env.LANES||'').split(',').map(s=>s.trim()).filter(Boolean)) {
  if(!existsSync(p)){console.log(p+' MISSING');continue;}
  const t=readFileSync(p,'utf8'); const nm=p.split('/').pop()!;
  const runs:string[]=[]; const msgs:number[]=[]; let rtAll=true; let last:any=null; let msSum=0;
  for(let i=0;i<REPS;i++){
    const t0=Date.now(); let r:any;
    try{ r=empedosEncode(t,enc); }catch(e:any){ runs.push('THREW'); continue; }
    const ms=Date.now()-t0; msSum+=ms; last=r; msgs.push(r.messageTokens);
    let rt=false;
    try{ rt = empedosDecode(r.wire,{stats:r.stats,order:r.order,undo:r.parent==='identity'?(w:string)=>w:chironDecode} as any,
      {alphabet:r.alphabet,marker:r.marker,marker2:r.marker2,group:r.syncopeGroup,framing:r.framing,ouraShape:r.ouraShape,
       ouraMode:r.ouraMode,ouraSentinel:r.ouraSentinel,antistrophePair:r.antistrophePair,peritropePairs:r.peritropePairs,
       systoleTemplates:r.systoleTemplates,apocopeTemplates:r.apocopeTemplates} as any)===t; }catch{}
    if(!rt) rtAll=false;
    runs.push(`${r.messageTokens}/${(ms/1000).toFixed(1)}s`);
  }
  if(!last) continue;
  const f=FRONTIER[nm]; const m=last.messageTokens;
  const repeat = new Set(msgs).size===1;
  const good = rtAll && repeat && (f===undefined || m<=f);
  tot++; if(good) ok++;
  console.log(nm.padEnd(23)+String(f??'-').padStart(6)+String(last.tekmarCap).padStart(5)+String(last.tekmarLattice).padStart(4)+
    '  '+runs.join('  ').padEnd(32)+(repeat?'YES':'*** NO ***').padEnd(11)+(rtAll?' OK':' FAIL')+'  '+
    (f===undefined?'(no frontier)':(m===f?'matches':(m<f?'BETTER by '+(f-m):'*** WORSE by '+(m-f)+' ***'))));
}
console.log(`\nnon-regressing, byte-exact and repeatable: ${ok}/${tot}`);
