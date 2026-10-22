import fs from 'node:fs';
import {countTokens} from '@/lib/omega/bpe';
const enc='o200k_base' as any; const T=(s:string)=>countTokens(s,enc);
const lanes=fs.readFileSync('bench/x21/lanes.txt','utf8').trim().split('\n');
const mk=(lo:number,hi:number)=>{const o:string[]=[];for(let c=lo;c<hi;c++){const s=String.fromCodePoint(c); if(T(s)===1)o.push(s);}return o;};
const blocks:{n:string;ch:string[]}[]=[
 {n:'Greek',ch:mk(0x0391,0x03aa)},{n:'Cyrillic',ch:mk(0x0410,0x0450)},
 {n:'Armenian',ch:mk(0x0531,0x0556)},{n:'Hebrew',ch:mk(0x05d0,0x05eb)},
 {n:'Arabic',ch:mk(0x0621,0x064b)},{n:'Thai',ch:mk(0x0e01,0x0e3b)},
 {n:'Devanagari',ch:mk(0x0915,0x0939)},{n:'Katakana',ch:mk(0x30a1,0x30f6)},
 {n:'Hiragana',ch:mk(0x3041,0x3096)},{n:'Georgian',ch:mk(0x10d0,0x10f6)},
];
const combos:{n:string;ch:string[]}[]=[
 ...blocks,
 {n:'He+Ge',ch:[...mk(0x05d0,0x05eb),...mk(0x10d0,0x10f6)]},
 {n:'He+Ge+Ar',ch:[...mk(0x05d0,0x05eb),...mk(0x10d0,0x10f6),...mk(0x0621,0x064b)]},
 {n:'He+Ge+Ar+Cy',ch:[...mk(0x05d0,0x05eb),...mk(0x10d0,0x10f6),...mk(0x0621,0x064b),...mk(0x0410,0x0450)]},
 {n:'He+Ge+Ar+Cy+Gr',ch:[...mk(0x05d0,0x05eb),...mk(0x10d0,0x10f6),...mk(0x0621,0x064b),...mk(0x0410,0x0450),...mk(0x0391,0x03aa)]},
 {n:'He+Ge+Ar+Cy+Gr+Arm',ch:[...mk(0x05d0,0x05eb),...mk(0x10d0,0x10f6),...mk(0x0621,0x064b),...mk(0x0410,0x0450),...mk(0x0391,0x03aa),...mk(0x0531,0x0556)]},
];
console.log('lane'.padEnd(36),'wire'.padStart(6),'nG'.padStart(4),'best'.padStart(22),'save');
const tot:Record<string,number>={}; let baseTot=0,netTot=0;
for(let i=0;i<lanes.length;i++){
  const wf=`bench/x24/wires/${(i+1).toString().padStart(2,'0')}.wire`;
  if(!fs.existsSync(wf)) continue;
  const w=fs.readFileSync(wf,'utf8');
  const used=new Set<string>();
  for(const ch of w){const cp=ch.codePointAt(0)!;if(cp>0x0180&&ch!=='¶'&&ch!=='§')used.add(ch);}
  const gl=[...used]; if(gl.length<8) continue;
  const b=T(w); baseTot+=b;
  let bestN='(none)',bestD=0;
  for(const c of combos){
    if(c.ch.length<gl.length) continue;               // must be large enough -> DISTINCT glyphs
    const m=new Map<string,string>(); gl.forEach((g,k)=>m.set(g,c.ch[k]));
    const d=b-T([...w].map(x=>m.get(x)??x).join(''));
    if(d>bestD){bestD=d;bestN=c.n;}
  }
  tot[bestN]=(tot[bestN]||0)+bestD; netTot+=bestD;
  console.log(lanes[i].split('/').pop()!.slice(0,35).padEnd(36),String(b).padStart(6),String(gl.length).padStart(4),bestN.padStart(22),String(bestD).padStart(5));
}
console.log('\nNET',netTot,'over base',baseTot);
console.log('winners:',Object.entries(tot).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]));
