import fs from 'node:fs';
import { oikonomiaEncode } from '@/lib/omega/oikonomia';
import { countTokens } from '@/lib/omega/bpe';
import { chironDecode, CHIRON_START, CHIRON_SEP, chironParseTape } from '@/lib/omega/chiron';
import { symplokeDecode } from '@/lib/omega/symploke';
const enc='o200k_base' as any;
const f=process.env.F||'';
const text=fs.readFileSync(f,'utf8');
const r:any=oikonomiaEncode(text,enc);
const w:string=r.wire;
const cut=w.indexOf(CHIRON_SEP,1);
const gloss=w.slice(1,cut), body=w.slice(cut+1);
// re-derive rules with the same script detection the decoder uses
const tape0=w.slice(1,cut);
let script:any=null;
// scriptOf is private; detect by trying each exported script via chironParseTape
import * as CH from '@/lib/omega/chiron';
const scripts=(CH as any).CHIRON_SCRIPTS;
const cp0=tape0.codePointAt(0)!;
for(const s of scripts){ if((CH as any).chironInScript(s,cp0)){ script=s; break; } }
const rules=chironParseTape(tape0,script)!;
console.log('lane',f.split('/').pop(),'msg',r.messageTokens,'rules',rules.length);
// dependency: rule i depends on j if raw_i contains glyph_j
const glyphs=rules.map(x=>x.glyph);
const dep=rules.map((x,i)=>{const s=new Set<number>();for(let j=0;j<glyphs.length;j++) if(j!==i && x.raw.includes(glyphs[j])) s.add(j); return s;});
const nDep=dep.filter(d=>d.size>0).length;
console.log('  rules with glyph refs inside their phrase:',nDep,'of',rules.length);
const build=(perm:number[])=>{ let t=''; for(const i of perm) t+=rules[i].glyph+rules[i].raw; return CHIRON_START+t+CHIRON_SEP+body; };
const base=countTokens(build(rules.map((_,i)=>i)),enc);
// validity: decode must reproduce the wire's decoded text
const decodedRef = r.parent==='identity' ? symplokeDecode(w,{stats:r.stats,order:r.order,undo:(x:string)=>x})
                                         : symplokeDecode(w,{stats:r.stats,order:r.order,undo:chironDecode});
const valid=(s:string)=> symplokeDecode(s,{stats:r.stats,order:r.order,undo:chironDecode})===decodedRef;
console.log('  base wire tokens', countTokens(w,enc), 'glossary-tokens-only baseline', base, 'ref valid', valid(w));
let rng=12345; const rnd=()=>(rng=(rng*1103515245+12345)&0x7fffffff)/0x7fffffff;
const toks:number[]=[]; let okCount=0;
for(let k=0;k<Number(process.env.N||400);k++){
  const perm=rules.map((_,i)=>i);
  for(let i=perm.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[perm[i],perm[j]]=[perm[j],perm[i]];}
  const s=build(perm); const t=countTokens(s,enc);
  if(valid(s)){ toks.push(t); okCount++; }
}
toks.sort((a,b)=>a-b);
console.log('  random permutations tried',Number(process.env.N||400),'valid',okCount);
if(toks.length) console.log('  token spread  min',toks[0],' median',toks[toks.length>>1],' max',toks[toks.length-1],'  base',base,
  '  best saving', base-toks[0], '=', (100*(base-toks[0])/base).toFixed(1)+'% of glossary');
