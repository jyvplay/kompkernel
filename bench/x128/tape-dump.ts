import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackFrontier } from '../../src/lib/omega/tagstack';
process.env.OMEGA_DET='1'; process.env.OMEGA_NO_MEMO='1'; process.env.OMEGA_ENGRAM='0'; process.env.OMEGA_OURA_MEMO='0'; process.env.OMEGA_NO_OROTHESIA='1';
const enc:any='o200k_base';
for(const p of (process.env.LANES??'').split(',').filter(Boolean)){
  const text=fs.readFileSync(p,'utf8');
  const a:any=tagstackFrontier(text,enc);
  const m=a.message as string;
  const i=m.indexOf('\u2016');
  const head=m.slice(0,i<0?m.length:i), body=i<0?'':m.slice(i+1);
  const hTok=countTokens(head,enc), bTok=countTokens(body,enc);
  const hDen=hTok/Math.max(1,head.length), bDen=bTok/Math.max(1,body.length);
  console.log(`\n=== ${p.split('/').pop()}  total=${a.messageTokens}  head=${hTok}(${head.length}ch, ${hDen.toFixed(3)} t/c)  body=${bTok}(${body.length}ch, ${bDen.toFixed(3)} t/c)`);
  if(i>=0){
    const gap=Math.round(hTok - head.length*bDen);
    console.log(`    tape-layout gap = ${hTok} - ${head.length}*${bDen.toFixed(3)} = ${gap} tokens`);
    console.log(`    head[0:220]=${JSON.stringify(head.slice(0,220))}`);
  }
}
