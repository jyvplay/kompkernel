import fs from 'node:fs';
import { heuresisEncode } from '@/lib/omega/heuresis';
import { chironParseTape, scriptOfChar, chironDecode } from '@/lib/omega/chiron';
import { symplokeDecode } from '@/lib/omega/symploke';
import { countTokens } from '@/lib/omega/bpe';
const enc='o200k_base' as any;
import { scriptOfChar as soc } from '@/lib/omega/syntomia';

function expandAll(parsed: Array<{glyph:string;raw:string}>){
  const ex=new Map<string,string>();
  for(const p of parsed){ let s=p.raw;
    for(let k=0;k<12;k++){ let n=''; for(const c of s) n+=ex.get(c)??c; if(n===s)break; s=n; }
    ex.set(p.glyph,s); }
  return ex;
}
for(const f of (process.env.LANES||'').split(',').filter(Boolean)){
  const t=fs.readFileSync(f,'utf8');
  const r:any=heuresisEncode(t,enc);
  const w:string=r.wire; const sep=w.indexOf('¶');
  if(sep<0){ console.log(f.split('/').pop(),'no tape'); continue; }
  const tape=w.slice(1,sep); const body=w.slice(sep+1);
  const sc=soc(tape[0]); if(!sc){console.log('no script');continue;}
  const parsed=chironParseTape(tape,sc) as Array<{glyph:string;raw:string}>;
  const ex=expandAll(parsed);
  const oneToken=parsed.filter(p=>countTokens(ex.get(p.glyph)!,enc)<=1);
  console.log('='.repeat(66));
  console.log(f.split('/').pop(),'| msg',r.messageTokens,'| rules',parsed.length,'| 1-token phrases:',oneToken.length);
  // baseline reconstruction
  const rebuild=(keep:Set<string>)=>{
    let nt=''; for(const p of parsed) if(keep.has(p.glyph)) nt+=p.glyph+ex.get(p.glyph)!;
    let nb=body;
    for(const p of parsed) if(!keep.has(p.glyph)) nb=nb.split(p.glyph).join(ex.get(p.glyph)!);
    return '§'+nt+'¶'+nb;
  };
  const all=new Set(parsed.map(p=>p.glyph));
  const base=countTokens(rebuild(all),enc);
  // drop all 1-token-phrase rules
  const keep1=new Set(all); for(const p of oneToken) keep1.delete(p.glyph);
  const w1=rebuild(keep1);
  const ok1=symplokeDecode(w1,{stats:r.stats,order:r.order,undo:(x:string)=>chironDecode(x)})===t;
  console.log('  baseline wire',base,'| drop all',oneToken.length,'1-token rules ->',countTokens(w1,enc),'Δ',countTokens(w1,enc)-base,'EXACT',ok1);
  // greedy: drop one at a time while it helps
  let cur=new Set(all); let curTok=base; const dropped:string[]=[];
  for(let iter=0;iter<40;iter++){
    let bestG:string|null=null; let bestTok=curTok;
    for(const p of parsed){ if(!cur.has(p.glyph))continue;
      const k=new Set(cur); k.delete(p.glyph);
      const ww=rebuild(k);
      if(symplokeDecode(ww,{stats:r.stats,order:r.order,undo:(x:string)=>chironDecode(x)})!==t) continue;
      const tk=countTokens(ww,enc);
      if(tk<bestTok){bestTok=tk;bestG=p.glyph;}
    }
    if(bestG===null)break;
    cur.delete(bestG); dropped.push(bestG); curTok=bestTok;
  }
  console.log('  greedy drop',dropped.length,'rules ->',curTok,'Δ',curTok-base);
}
