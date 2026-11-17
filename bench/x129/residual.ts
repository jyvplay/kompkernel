/** X130: what redundancy REMAINS in the frontier output? repeated-token n-gram census. */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
import { encode, decode } from 'gpt-tokenizer/encoding/o200k_base';
const enc:any='o200k_base';
for(const p of (process.env.LANES??'').split(',').filter(Boolean)){
  const text=fs.readFileSync(p,'utf8'); const raw=countTokens(text,enc);
  const a:any=tagstackEncode(text,enc); const M=a.message as string;
  const toks=encode(M).map(i=>decode([i]));
  // count every n-gram for n=2..8
  let total=0; const best:any[]=[];
  for(let n=2;n<=8;n++){
    const seen=new Map<string,number>();
    for(let i=0;i+n<=toks.length;i++){ const k=toks.slice(i,i+n).join('\u0001'); seen.set(k,(seen.get(k)??0)+1); }
    for(const [k,c] of seen){
      if(c<2) continue;
      const t=n, gain=c*(t-1)-(1+t);
      if(gain>0){ total+=gain; best.push({s:k.split('\u0001').join(''),c,n,gain}); }
    }
  }
  best.sort((x,y)=>y.gain*y.n-x.gain*x.n||y.gain-x.gain);
  console.log(`${p.split('/').pop()!.padEnd(20)} raw=${String(raw).padStart(4)} M=${String(a.messageTokens).padStart(4)}  repeated-ngram potential=${String(total).padStart(4)}  top=${best.slice(0,3).map(b=>`${JSON.stringify(b.s.slice(0,18))}x${b.c}(+${b.gain})`).join(' ')}`);
}
