import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
const enc='o200k_base' as any;
const HEX='0123456789abcdef';
const ALPHS={pyr:'etaoinsrhldcumyp',alt:'keaoinstrldcumzp'};
function mk(a:string){const m=new Map<string,string>();for(let i=0;i<16;i++)m.set(HEX[i],a[i]);return m;}
const ID_RE=/(?<![0-9a-zA-Z])([0-9a-f]{2,}(?:[-_][0-9a-f]{2,})+)(?![0-9a-zA-Z])/g;
for(const f of (process.env.LANES||'').split(',').filter(Boolean)){
  if(!fs.existsSync(f))continue;
  const t=fs.readFileSync(f,'utf8');
  const pats=new Map<string,string[]>();
  ID_RE.lastIndex=0; let m:RegExpExecArray|null;
  while((m=ID_RE.exec(t))){
    if(!/[a-f]/.test(m[1]))continue;                     // genuine hex only
    const p=m[1].split(/[-_]/).map(s=>s.length).join('-');
    if(!pats.has(p))pats.set(p,[]); (pats.get(p) as string[]).push(m[1]);
  }
  if(!pats.size){console.log(f.split('/').pop()!.padEnd(26),'no hex ids');continue;}
  for(const [p,arr] of [...pats.entries()].sort((a,b)=>b[1].length-a[1].length)){
    if(arr.length<2)continue;
    const segs=p.split('-').map(Number); const tot=segs.reduce((a,b)=>a+b,0);
    for(const [an,A] of Object.entries(ALPHS)){
      const fm=mk(A);
      let cur=0,eli=0;
      for(const id of arr){
        let keep=''; for(const c of id) keep+=fm.get(c)??c;          // PYKNOSIS style
        let e='';    for(const c of id) if(c!=='-'&&c!=='_') e+=fm.get(c)??c; // SYNCOPE
        cur+=countTokens('~'+keep,enc);
        eli+=countTokens('~'+e,enc);
      }
      if(an==='pyr') console.log(f.split('/').pop()!.padEnd(26),`pat ${p.padEnd(12)} n=${String(arr.length).padStart(3)} chars/ea ${tot}`,
        `| pyknosis ${String(cur).padStart(4)}  syncope ${String(eli).padStart(4)}  => ${String(cur-eli).padStart(4)}`);
      else console.log(''.padEnd(26),`   [${an}] pyknosis ${String(cur).padStart(4)} syncope ${String(eli).padStart(4)} => ${String(cur-eli).padStart(4)}`);
    }
  }
}
