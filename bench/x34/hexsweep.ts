import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
const enc='o200k_base' as any;
const HEX='0123456789abcdef';
const A='etaoinsrhldcumfp';
const map=new Map<string,string>(); for(let i=0;i<16;i++) map.set(HEX[i],A[i]);
const conv=(s:string)=>{let o='';for(const c of s)o+=map.get(c)??c;return o;};
const CLAUSE=13;
const files=(process.env.LANES||'').split(',').filter(f=>fs.existsSync(f));
// delimiter candidates: [open, close]
const delims:[string,string,string][]=[
  ['~','|','~/|'],['«','»','«»'],['^','$','^$'],['[',']','[]'],
  ['~','~','~~'],['_','_','__'],[':',';',':;'],['~','','~only'],['«','','«only'],
];
const RUNRE=/[0-9a-fA-F]{4,}(?:[-_][0-9a-fA-F]{2,})*|[0-9a-fA-F]{12,}/g;
for(const [op,cl,name] of delims){
  console.log(`--- delim ${name} ---`);
  for(const minL of [8,12,16,20,28]){
    let line='  minL='+String(minL).padStart(2)+'  ';
    for(const f of files){
      const t=fs.readFileSync(f,'utf8'); const runs:string[]=[];
      for(const m of t.matchAll(RUNRE)) if(m[0].length>=minL) runs.push(m[0].toLowerCase());
      if(!runs.length){ line+=f.split('/').pop()!.slice(0,10).padStart(11)+':   -   '; continue; }
      let bt=0,rt=0,d=0;
      for(const s of runs){ bt+=countTokens(s,enc); rt+=countTokens(op+conv(s)+cl,enc); }
      line+=f.split('/').pop()!.slice(0,10).padStart(11)+':'+String(bt-rt-CLAUSE).padStart(6)+'  ';
    }
    console.log(line);
  }
}
