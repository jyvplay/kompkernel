/** Where does the stack's time go?  Instrument every countTokens call. */
import fs from 'node:fs'; import path from 'node:path';
import * as bpe from '../src/lib/omega/bpe';
const real = bpe.countTokens;
let calls=0, chars=0, ms=0;
// monkey-patch the module export used by every codec
(bpe as any).countTokens = (s:string, e:any)=>{ calls++; chars+=s.length; const t=process.hrtime.bigint();
  const v=real(s,e); ms+=Number(process.hrtime.bigint()-t)/1e6; return v; };
const { ariadneEncode } = await import('../src/lib/omega/ariadne');
const { sibylEncode } = await import('../src/lib/omega/sibyl');
const { metatronEncode } = await import('../src/lib/omega/metatron');
const files=['bench/holdout/code-ts.txt','bench/holdout/gh-prose.txt','bench/holdout-mk/page.html','bench/holdout-work/kb-article.txt'];
for(const f of files){
  const t=fs.readFileSync(f,'utf8');
  for(const [nm,fn] of [['ariadne',()=>ariadneEncode(t,'o200k_base',{budgetMs:80})],
                        ['sibyl-w6',()=>sibylEncode(t,'o200k_base',{budgetMs:80,wordGrid:[6]} as any)],
                        ['metatron',()=>metatronEncode(t,'o200k_base',{budgetMs:2000})]] as any[]){
    calls=0;chars=0;ms=0;
    const t0=Date.now(); try{ fn(); }catch{}; const wall=Date.now()-t0;
    console.log(`${f.split('/').pop()!.padEnd(16)} ${String(nm).padEnd(9)} wall=${String(wall).padStart(6)}ms  countTokens calls=${String(calls).padStart(8)}  chars=${String(chars).padStart(11)}  tokenizerMs=${ms.toFixed(0).padStart(6)}  = ${(100*ms/Math.max(wall,1)).toFixed(1)}% of wall`);
  }
}
