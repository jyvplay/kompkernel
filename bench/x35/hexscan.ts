import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
const enc='o200k_base' as any;
const PAT:Record<string,RegExp>={
  lower : /[0-9a-f]{8,}/g,
  upper : /[0-9A-F]{8,}/g,
  mixed : /[0-9a-fA-F]{8,}/g,
  uuid  : /[0-9a-fA-F]{4,}(?:[-_][0-9a-fA-F]{2,})*|[0-9a-fA-F]{8,}/g,
};
const A='etaoinsrhldcumyp';
const fwd=new Map<string,string>(); for(let i=0;i<16;i++) fwd.set('0123456789abcdef'[i],A[i]);
const A2='ETAOINSRHLDCUMYP';
const fwdU=new Map<string,string>(); for(let i=0;i<16;i++) fwdU.set('0123456789ABCDEF'[i],A2[i]);
for(const f of (process.env.LANES||'').split(',').filter(Boolean)){
  if(!fs.existsSync(f))continue;
  const t=fs.readFileSync(f,'utf8');
  const out:string[]=[];
  for(const [name,re] of Object.entries(PAT)){
    re.lastIndex=0;
    let ch=0,tok=0,tok2=0,n=0;
    let m:RegExpExecArray|null;
    while((m=re.exec(t))){
      if(m[0].length<8) continue;
      const before=t[m.index-1], after=t[m.index+m[0].length];
      if(before&&/[0-9a-fA-F]/.test(before)) continue;
      if(after&&/[0-9a-fA-F]/.test(after)) continue;
      n++; ch+=m[0].length; tok+=countTokens(m[0],enc);
      let o=''; for(const c of m[0]) o+=fwd.get(c) ?? (name==='lower'?c:(fwdU.get(c)??c));
      tok2+=countTokens('~'+o,enc);
    }
    out.push(`${name}:n${n}/ch${ch}/save${tok-tok2}`);
  }
  console.log(f.split('/').pop()!.padEnd(24),out.join('  '));
}
