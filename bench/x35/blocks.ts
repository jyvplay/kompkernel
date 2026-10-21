import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { chironFindBlocks, chironSeparators } from '@/lib/omega/chiron';
const enc='o200k_base' as any;
const BLANKS=['@','·','¤','†','‡','»','«','¦','¬','±','°','µ','★','◆','\u0001','\u0002'];
for(const f of (process.env.LANES||'').split(',').filter(Boolean)){
  if(!fs.existsSync(f))continue;
  const t=fs.readFileSync(f,'utf8');
  const blank=BLANKS.find(c=>countTokens(c,enc)===1 && !t.includes(c));
  if(!blank){ console.log(f.split('/').pop()!.padEnd(26),'NO BLANK'); continue; }
  const seps=chironSeparators(t);
  const raw=countTokens(t,enc);
  let bestGain=-1,bestSep='',nBlocks=0,totGain=0,detail='';
  for(const sep of seps.slice(0,Number(process.env.NSEP||6))){
    let blocks:any[]=[];
    try{ blocks=chironFindBlocks(t,blank,sep,enc,Date.now()+Number(process.env.MS||4000)); }catch(e){ continue; }
    const g=blocks.reduce((a,b:any)=>a+b.gain,0);
    if(g>bestGain){bestGain=g;bestSep=JSON.stringify(sep);nBlocks=blocks.length;
      detail=blocks.slice(0,3).map((b:any)=>`[${b.units}u x${b.width}L gain${Math.round(b.gain)} anc${b.anchors.length}]`).join('');}
  }
  console.log(f.split('/').pop()!.padEnd(26),'raw',String(raw).padStart(5),
    'blank',JSON.stringify(blank),'seps',String(seps.length).padStart(2),
    '| bestSep',bestSep.padEnd(6),'blocks',String(nBlocks).padStart(3),
    'gain',String(Math.round(bestGain)).padStart(5),
    `(${raw?((bestGain/raw)*100).toFixed(1):'-'}%)`,detail);
}
