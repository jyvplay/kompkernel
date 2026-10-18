import fs from 'node:fs';
import {countTokens} from '@/lib/omega/bpe';
const enc='o200k_base' as any; const T=(s:string)=>countTokens(s,enc);
console.log('lane'.padEnd(40),'wire'.padStart(6),'glyphOcc'.padStart(9),'delAll'.padStart(7),'marg/glyph'.padStart(11),'spc→1'.padStart(7));
let tw=0,tg=0,ts=0;
const lanes=fs.readFileSync('bench/x21/lanes.txt','utf8').trim().split('\n');
for(let i=0;i<lanes.length;i++){
  const wf=`bench/x24/wires/${(i+1).toString().padStart(2,'0')}.wire`;
  if(!fs.existsSync(wf)) continue;
  const w=fs.readFileSync(wf,'utf8');
  const used=new Set<string>();
  for(const ch of w){const cp=ch.codePointAt(0)!; if(cp>0x0180&&ch!=='¶'&&ch!=='§') used.add(ch);}
  const occ=[...w].filter(c=>used.has(c)).length;
  if(occ<20) continue;
  const b=T(w);
  const del=T([...w].filter(c=>!used.has(c)).join(''));      // glyphs deleted
  const spc=T([...w].map(c=>used.has(c)?' ':c).join(''));    // glyphs -> space
  const marg=(b-del)/occ;
  tw+=b-del; tg+=occ; ts+=b-spc;
  console.log(lanes[i].split('/').pop()!.padEnd(40),String(b).padStart(6),String(occ).padStart(9),String(b-del).padStart(7),marg.toFixed(3).padStart(11),String(b-spc).padStart(7));
}
console.log('\nTOTAL: glyph-occurrence mass',tw,'tokens over',tg,'occurrences => mean marginal cost',(tw/tg).toFixed(3));
console.log('       replacing glyphs with SPACES would save',ts,'tokens (upper bound on alphabet swap)');
