import fs from 'node:fs';
import {countTokens} from '@/lib/omega/bpe';
const enc='o200k_base' as any; const T=(s:string)=>countTokens(s,enc);
const lanes=fs.readFileSync('bench/x21/lanes.txt','utf8').trim().split('\n');
// merging two glyphs is INVALID for decode -- it measures the marginal value of
// DISTINCTNESS.  If merging saves ~1 token per merge, then the tape's glyph
// slots cost ~1 each and rule-count reduction is a real lever.
console.log('lane'.padEnd(34),'wire'.padStart(6),'nG'.padStart(4),'merge20'.padStart(9),'per'.padStart(7),'merge50'.padStart(9));
let tb=0,t20=0,t50=0;
for(let i=0;i<lanes.length;i++){
  const wf=`bench/x24/wires/${(i+1).toString().padStart(2,'0')}.wire`;
  if(!fs.existsSync(wf)) continue;
  const w=fs.readFileSync(wf,'utf8');
  const used=new Set<string>();
  for(const ch of w){const cp=ch.codePointAt(0)!;if(cp>0x0180&&ch!=='¶'&&ch!=='§')used.add(ch);}
  const gl=[...used]; if(gl.length<30) continue;
  const freq=new Map<string,number>();
  for(const ch of w) if(used.has(ch)) freq.set(ch,(freq.get(ch)||0)+1);
  const asc=gl.slice().sort((a,b)=>freq.get(a)!-freq.get(b)!);
  const b=T(w);
  const mm=(k:number)=>{const m=new Map<string,string>();
    for(let j=0;j<Math.min(k,asc.length-1);j++) m.set(asc[j],asc[asc.length-1]);
    return T([...w].map(c=>m.get(c)??c).join(''));};
  const m20=mm(20), m50=mm(50);
  tb+=b;t20+=b-m20;t50+=b-m50;
  console.log(lanes[i].split('/').pop()!.slice(0,33).padEnd(34),String(b).padStart(6),String(gl.length).padStart(4),String(b-m20).padStart(9),((b-m20)/20).toFixed(2).padStart(7),String(b-m50).padStart(9));
}
console.log(`\nTOTAL base ${tb}  saved by merging 20 rarest glyphs ${t20}  by 50 ${t50}`);
console.log('=> per merged-away glyph slot:',(t20/20).toFixed(2),'tokens. If << 1, rule count is NOT the lever.');
