import * as fs from 'node:fs';
import { sphragisDecode } from '../../src/lib/omega/sphragis';
const SEP='[-:./,]'; const G='[0-9a-fA-F]+';
const RUN=new RegExp(`${G}(?:${SEP}${G}){1,5}`,'g'); const ALL=new RegExp(SEP,'g');
for (const p of process.argv.slice(2)) {
  const S=fs.readFileSync(p,'utf8'); const occ=new Map<string,number>(); let m:RegExpExecArray|null; RUN.lastIndex=0;
  while((m=RUN.exec(S))!==null){const r=m[0]; if(!/\d/.test(r))continue;
    const b=m.index>0?S[m.index-1]:'', a=m.index+r.length<S.length?S[m.index+r.length]:'';
    if(/[0-9a-fA-F]/.test(b)||/[0-9a-fA-F]/.test(a))continue;
    const parts=r.split(new RegExp(`(${SEP})`)); let sh='';
    for(let i=0;i<parts.length;i+=2){sh+='#'.repeat(parts[i].length); if(parts[i+1]!==undefined)sh+=parts[i+1];}
    occ.set(sh,(occ.get(sh)??0)+1);}
  const keep=[...occ].filter(([s,n])=>n>=2).map(([s])=>s);
  const packed=S.replace(RUN,(r)=>{if(!/\d/.test(r))return r;const parts=r.split(new RegExp(`(${SEP})`));let sh='';
    for(let i=0;i<parts.length;i+=2){sh+='#'.repeat(parts[i].length); if(parts[i+1]!==undefined)sh+=parts[i+1];}
    return keep.includes(sh)?r.replace(ALL,''):r;});
  const msg=`§SPHRAGIS #:char, fill: ${keep.join(' ')}\n${packed}`;
  console.log(`${p.split('/').pop()!.padEnd(24)} shapes ${String(keep.length).padStart(2)} | ${keep.slice(0,4).join(' ').padEnd(40)} | RT ${sphragisDecode(msg)===S}`);
}
