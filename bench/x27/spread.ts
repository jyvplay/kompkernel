import fs from 'node:fs';
import { symplokeEncode } from '@/lib/omega/symploke';
import { chironParseTape, CHIRON_START, CHIRON_SEP } from '@/lib/omega/chiron';
import { scriptOfChar } from '@/lib/omega/syntomia';
import { countTokens } from '@/lib/omega/bpe';
const enc='o200k_base' as any;
const T=(s:string)=>countTokens(s,enc);
const N=Number(process.env.N||400);
for (const f of (process.env.F||'').split(',').filter(Boolean)) {
  const text=fs.readFileSync(f,'utf8');
  const r=symplokeEncode(text,enc);
  const cut=r.wire.indexOf(CHIRON_SEP,CHIRON_START.length);
  const tape=r.wire.slice(CHIRON_START.length,cut);
  const body=r.wire.slice(cut+CHIRON_SEP.length);
  const sc=scriptOfChar(tape[0])!;
  const rules=chironParseTape(tape,sc)!;
  const og=rules.map(x=>x.glyph);
  const payload=new Set(text);
  const spans=(sc as any).ranges??[[(sc as any).lo,(sc as any).hi]];
  const pool:string[]=[];
  for(const [a,b] of spans) for(let cp=a;cp<b;cp++){const ch=String.fromCodePoint(cp); if(!payload.has(ch)&&T(ch)===1) pool.push(ch);}
  const wireOf=(assign:string[])=>{
    const map=new Map<string,string>(); og.forEach((g,i)=>map.set(g,assign[i]));
    const conv=(s:string)=>[...s].map(c=>map.get(c)??c).join('');
    return CHIRON_START+rules.map((ru,i)=>assign[i]+conv(ru.raw)).join('')+CHIRON_SEP+conv(body);
  };
  const orig=T(wireOf(og));
  let mn=1e9,mx=-1,sum=0;
  const poolTake=pool.slice(0, Math.min(pool.length, og.length+40));
  for(let k=0;k<N;k++){
    // random permutation sample
    const sh=poolTake.slice();
    for(let i=sh.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[sh[i],sh[j]]=[sh[j],sh[i]];}
    const t=T(wireOf(sh.slice(0,og.length)));
    if(t<mn)mn=t; if(t>mx)mx=t; sum+=t;
  }
  console.log(f.split('/').pop()!.padEnd(34),'rules',String(og.length).padStart(3),
    '| parent',String(orig).padStart(5),
    '| random best',String(mn).padStart(5),'mean',(sum/N).toFixed(0).padStart(5),'worst',String(mx).padStart(5),
    '| best-parent',String(mn-orig).padStart(5));
}
