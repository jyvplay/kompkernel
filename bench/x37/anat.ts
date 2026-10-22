import * as fs from 'node:fs';
import { countTokens, tokenStrings } from '@/lib/omega/bpe';
const enc:any='o200k_base';
function cat(s:string):string{
  if(/^\s+$/.test(s)) return 'whitespace';
  if(/^\d+$/.test(s)) return 'digits';
  if(/^[A-Za-z]+$/.test(s)) return 'letters';
  if(/^[.,;:!?'"`()\[\]{}<>|\\/~@#$%^&*+=_-]+$/.test(s)) return 'punct';
  return 'mixed';
}
for(const p of (process.env.LANES||'').split(',').filter(Boolean)){
  if(!fs.existsSync(p))continue;
  const t=fs.readFileSync(p,'utf8');
  const toks=tokenStrings(t,enc);
  const agg=new Map<string,{n:number,c:number,ex:string[]}>();
  for(const _o of toks){ const s=_o.s;
    const k=cat(s);
    const a=agg.get(k)??{n:0,c:0,ex:[] as string[]};
    a.n++; a.c+=s.length; if(a.ex.length<6&&s.trim())a.ex.push(JSON.stringify(s));
    agg.set(k,a);
  }
  const tot=countTokens(t,enc);
  console.log('===',p.split('/').pop(),'rawTok='+tot,'chars='+t.length);
  for(const [k,a] of [...agg].sort((x,y)=>y[1].n-x[1].n)){
    console.log('   ',k.padEnd(11),'tok='+String(a.n).padStart(5),
      (100*a.n/tot).toFixed(1).padStart(5)+'%','chars='+String(a.c).padStart(6),
      'c/tok='+(a.c/a.n).toFixed(2), a.ex.slice(0,5).join(' '));
  }
}
