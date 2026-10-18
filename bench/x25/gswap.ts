import fs from 'node:fs';
import {countTokens} from '@/lib/omega/bpe';
const enc='o200k_base' as any; const T=(s:string)=>countTokens(s,enc);
const lanes=fs.readFileSync('bench/x21/lanes.txt','utf8').trim().split('\n');
const W=[...(process.env.W?process.env.W.split(',').map(Number):[])];
// candidate alphabets: name -> ordered char list
const mk=(lo:number,hi:number)=>{const o:string[]=[];for(let c=lo;c<hi;c++)o.push(String.fromCodePoint(c));return o;};
const cands:{n:string;ch:string[]}[]=[
 {n:'Greek',ch:mk(0x0391,0x03aa)},{n:'Cyrillic',ch:mk(0x0410,0x0450)},
 {n:'Cyrillic+ext',ch:[...mk(0x0410,0x0450),...mk(0x0450,0x0460)]},
 {n:'Armenian',ch:mk(0x0531,0x0556)},{n:'Hebrew',ch:mk(0x05d0,0x05eb)},
 {n:'Arabic',ch:mk(0x0621,0x064b)},{n:'Thai',ch:mk(0x0e01,0x0e3b)},
 {n:'Devanagari',ch:mk(0x0915,0x0939)},{n:'Katakana',ch:mk(0x30a1,0x30f6)},
 {n:'Hiragana',ch:mk(0x3041,0x3096)},{n:'Georgian',ch:mk(0x10d0,0x10f6)},
 {n:'HangulJamo',ch:mk(0x3131,0x3163)},
];
console.log('lane'.padEnd(38),'wire'.padStart(6),'nG'.padStart(4),...cands.map(c=>c.n.slice(0,7).padStart(8)));
const tot:Record<string,number>={}; let baseTot=0;
for(let i=0;i<lanes.length;i++){
  const wf=`bench/x24/wires/${(i+1).toString().padStart(2,'0')}.wire`;
  if(!fs.existsSync(wf)) continue;
  const w=fs.readFileSync(wf,'utf8');
  const used=new Set<string>();
  for(const ch of w){const cp=ch.codePointAt(0)!;if(cp>0x0180&&ch!=='¶'&&ch!=='§')used.add(ch);}
  const gl=[...used]; if(gl.length<8) continue;
  const b=T(w); baseTot+=b; const cells:string[]=[];
  for(const c of cands){
    const m=new Map<string,string>(); gl.forEach((g,k)=>m.set(g,c.ch[k%c.ch.length]));
    const t=T([...w].map(x=>m.get(x)??x).join(''));
    const d=b-t; tot[c.n]=(tot[c.n]||0)+d;
    cells.push(((d>0?'+':'')+d).padStart(8));
  }
  console.log(lanes[i].split('/').pop()!.slice(0,37).padEnd(38),String(b).padStart(6),String(gl.length).padStart(4),...cells);
}
console.log('\nNET SAVINGS vs current (positive = better):');
for(const k of Object.keys(tot).sort((a,b)=>tot[b]-tot[a])) console.log('  ',k.padEnd(14),String(tot[k]).padStart(6));
console.log('base total',baseTot);
