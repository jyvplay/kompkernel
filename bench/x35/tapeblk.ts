import fs from 'node:fs';
import { oikonomiaEncode } from '@/lib/omega/oikonomia';
import { countTokens } from '@/lib/omega/bpe';
import { CHIRON_START, CHIRON_SEP, chironFindBlocks, chironSeparators } from '@/lib/omega/chiron';
const enc='o200k_base' as any;
const BLANKS=['@','·','¤','†','‡','»','«','¦','¬','±','°','µ','★','◆','\u0001','\u0002'];
for(const f of (process.env.LANES||'').split(',').filter(Boolean)){
  if(!fs.existsSync(f))continue;
  const t=fs.readFileSync(f,'utf8');
  const r:any=oikonomiaEncode(t,enc);
  const w=String(r.wire); const cut=w.indexOf(CHIRON_SEP);
  const tape=w.slice(cut+1);
  const blank=BLANKS.find(c=>countTokens(c,enc)===1 && !w.includes(c));
  if(!blank){ console.log(f.split('/').pop()!.padEnd(24),'no blank'); continue; }
  const seps=chironSeparators(tape);
  let best=-1,bestSep='',nb=0,det='';
  for(const sep of seps.slice(0,4)){
    let bl:any[]=[];
    try{ bl=chironFindBlocks(tape,blank,sep,enc,Date.now()+3000); }catch(e){ continue; }
    const g=bl.reduce((a:number,b:any)=>a+b.gain,0);
    if(g>best){best=g;bestSep=JSON.stringify(sep);nb=bl.length;
      det=bl.slice(0,3).map((b:any)=>`[${b.units}u gain${Math.round(b.gain)} anc${b.anchors.length}]`).join('');}
  }
  console.log(f.split('/').pop()!.padEnd(24),'wire',String(r.messageTokens).padStart(5),
    'tapeTok',String(countTokens(tape,enc)).padStart(5),
    '| TAPE-blocks',String(nb).padStart(3),'gain',String(Math.round(best)).padStart(5),
    `(${(best/r.messageTokens*100).toFixed(1)}% of wire)`,'sep',bestSep,det);
}
