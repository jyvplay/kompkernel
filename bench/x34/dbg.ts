import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { PYKNOSIS_HEX, PYKNOSIS_ALPHABET, PYKNOSIS_MARKERS } from '@/lib/omega/pyknosis';
const enc='o200k_base' as any;
const RUN_RE=/[0-9a-f]{4,}(?:[-_][0-9a-f]{2,})*|[0-9a-f]{8,}/g;
const fwd=new Map<string,string>(); for(let i=0;i<16;i++) fwd.set(PYKNOSIS_HEX[i],PYKNOSIS_ALPHABET[i]);
const back=new Map<string,string>(); for(let i=0;i<16;i++) back.set(PYKNOSIS_ALPHABET[i],PYKNOSIS_HEX[i]);
const respell=(s:string)=>{let o='';for(const c of s)o+=fwd.get(c)??c;return o;};
for(const f of (process.env.LANES||'').split(',').filter(Boolean)){
  if(!fs.existsSync(f)) continue;
  const t=fs.readFileSync(f,'utf8');
  console.log('==',f.split('/').pop());
  console.log('  markers present:', PYKNOSIS_MARKERS.filter(m=>t.includes(m)).map(m=>JSON.stringify(m)).join(' ')||'none');
  const runs:{s:number,e:number}[]=[];
  RUN_RE.lastIndex=0; let m:RegExpExecArray|null;
  while((m=RUN_RE.exec(t))){
    if(m[0].length<12) continue;
    const b=t[m.index-1], a=t[m.index+m[0].length];
    if(b&&/[0-9a-f]/.test(b)) continue;
    if(a&&/[0-9a-f]/.test(a)) continue;
    runs.push({s:m.index,e:m.index+m[0].length});
  }
  console.log('  runs>=12:',runs.length);
  let blocked=0;
  for(const r of runs){ const nx=t[r.e]; if(nx!==undefined&&back.has(nx)) blocked++; }
  console.log('  runs blocked by following alphabet char:',blocked);
  const clause=`Then ~: ${PYKNOSIS_ALPHABET} mean ${PYKNOSIS_HEX}.`;
  const clauseTok=countTokens(' '+clause,enc)-countTokens(' ',enc);
  let est=0,ch=0;
  for(const r of runs){ const s=t.slice(r.s,r.e);
    est+=countTokens(s,enc)-countTokens('~'+respell(s),enc); ch+=s.length; }
  console.log('  hex chars',ch,'clauseTok',clauseTok,'isolated est (pre-clause)',est,'net',est-clauseTok,
    '| gate needs >=',clauseTok*2,'=>',(est-clauseTok>=clauseTok*2?'PASS':'FAIL'));
}
