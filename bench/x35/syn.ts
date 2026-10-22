import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
const enc='o200k_base' as any;
const HEX='0123456789abcdef';
const A='etaoinsrhldcumyp';
const fwd=new Map<string,string>(); for(let i=0;i<16;i++) fwd.set(HEX[i],A[i]);
const ID_RE=/(?<![0-9a-zA-Z])([0-9a-f]{2,}(?:[-_][0-9a-f]{2,})+)(?![0-9a-zA-Z])/g;
for(const f of (process.env.LANES||'').split(',').filter(Boolean)){
  if(!fs.existsSync(f))continue;
  const t=fs.readFileSync(f,'utf8');
  const pats=new Map<string,number>();
  const ids:string[]=[];
  ID_RE.lastIndex=0; let m:RegExpExecArray|null;
  while((m=ID_RE.exec(t))){
    const segs=m[1].split(/[-_]/);
    const pat=segs.map(s=>s.length).join('-');
    pats.set(pat,(pats.get(pat)||0)+1); ids.push(m[1]);
  }
  const top=[...pats.entries()].sort((a,b)=>b[1]-a[1]).slice(0,3);
  if(!ids.length){console.log(f.split('/').pop()!.padEnd(24),'no dashed ids');continue;}
  // cost: current vs elided+remapped (dominant pattern only)
  const dp=top[0][0]; const segs=dp.split('-').map(Number);
  const sel=ids.filter(x=>x.split(/[-_]/).map(s=>s.length).join('-')===dp);
  let cur=0,neu=0,nch=0;
  for(const id of sel){
    cur+=countTokens(id,enc);
    let o=''; for(const c of id) if(c!=='-'&&c!=='_') o+=fwd.get(c)??c;
    neu+=countTokens('~'+o,enc); nch+=o.length;
  }
  console.log(f.split('/').pop()!.padEnd(24),'patterns',top.map(([p,n])=>`${p}x${n}`).join(' '),
    '| dominant',dp,'n',String(sel.length).padStart(3),'chars',String(nch).padStart(5),
    'cur',String(cur).padStart(4),'new',String(neu).padStart(4),'=> save',String(cur-neu).padStart(4));
}
