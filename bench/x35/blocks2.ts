import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { chironFindBlocks, chironSeparators } from '@/lib/omega/chiron';
const enc='o200k_base' as any;
const BLANKS=['@','·','¤','†','‡','»','«','¦','¬','±','°','µ','★','◆','\u0001','\u0002'];
for(const f of (process.env.LANES||'').split(',').filter(Boolean)){
  if(!fs.existsSync(f))continue;
  const t=fs.readFileSync(f,'utf8');
  const blank=BLANKS.find(c=>countTokens(c,enc)===1 && !t.includes(c))!;
  const sep=process.env.SEP!==undefined?JSON.parse(`"${process.env.SEP}"`):chironSeparators(t)[0];
  const blocks:any[]=chironFindBlocks(t,blank,sep,enc,Date.now()+Number(process.env.MS||6000));
  const raw=countTokens(t,enc);
  console.log('==',f.split('/').pop(),'raw',raw,'sep',JSON.stringify(sep),'blocks',blocks.length,
    'totalGain',Math.round(blocks.reduce((a:number,b:any)=>a+b.gain,0)));
  for(const b of blocks){
    console.log(`   units=${String(b.units).padStart(4)} width=${b.width} lines=${b.startLine}..${b.endLine} gain=${String(Math.round(b.gain)).padStart(5)} anchors=${b.anchors.length} cols=${b.columns.map((c:string[])=>c.length).join('/')}`);
    if(process.env.DET) console.log('      anchors:',JSON.stringify(b.anchors).slice(0,220));
  }
}
