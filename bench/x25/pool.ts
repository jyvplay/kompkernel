import fs from 'node:fs';
import {countTokens} from '@/lib/omega/bpe';
const enc='o200k_base' as any; const T=(s:string)=>countTokens(s,enc);
const W=+(process.env.W||27);
const wf=`bench/x24/wires/${W.toString().padStart(2,'0')}.wire`;
const w=fs.readFileSync(wf,'utf8');
const used=new Set<string>();
for(const ch of w){const cp=ch.codePointAt(0)!; if(cp>0x0180&&ch!=='¶'&&ch!=='§') used.add(ch);}
const gl=[...used]; const chars=[...w]; const base=T(w);
console.log(`wire ${W}: base ${base}, distinct glyphs needed ${gl.length}`);
const B:Record<string,[number,number]>={Hebrew:[0x05d0,0x05eb],Georgian:[0x10d0,0x10f6],Cyrillic:[0x0410,0x0450],
 Arabic:[0x0621,0x064b],Greek:[0x0391,0x03aa],Armenian:[0x0531,0x0556],Thai:[0x0e01,0x0e3b],
 Devanagari:[0x0915,0x0939],Bengali:[0x0995,0x09b9],Katakana:[0x30a1,0x30f6],Hiragana:[0x3041,0x3096],Gurmukhi:[0x0a15,0x0a39]};
const oneOf=(nm:string)=>{const [a,b]=B[nm]; const o:string[]=[]; for(let c=a;c<b;c++){const s=String.fromCodePoint(c); if(T(s)===1) o.push(s);} return o;};
const combos:{n:string;blocks:string[]}[]=[
 {n:'polytropos(polyglot): Gr+He+Ar+Ge+Th+Dev', blocks:['Greek','Hebrew','Armenian','Georgian','Thai','Devanagari']},
 {n:'He+Ge+Cy+Ar+Gr+Arm',                      blocks:['Hebrew','Georgian','Cyrillic','Arabic','Greek','Armenian']},
 {n:'He+Ge+Cy+Ar',                             blocks:['Hebrew','Georgian','Cyrillic','Arabic']},
 {n:'He+Ge+Cy',                                blocks:['Hebrew','Georgian','Cyrillic']},
 {n:'He+Ge',                                   blocks:['Hebrew','Georgian']},
 {n:'He+Ge+Cy+Ar+Gr+Arm+Bn',                   blocks:['Hebrew','Georgian','Cyrillic','Arabic','Greek','Armenian','Bengali']},
 {n:'He+Ge+Cy+Ar+Gr+Arm+Kat',                  blocks:['Hebrew','Georgian','Cyrillic','Arabic','Greek','Armenian','Katakana']},
 {n:'He+Ge+Cy+Ar+Gr+Arm+Hir',                  blocks:['Hebrew','Georgian','Cyrillic','Arabic','Greek','Armenian','Hiragana']},
 {n:'Cy+Gr+Ar+Arm+Bn+Gur',                     blocks:['Cyrillic','Greek','Arabic','Armenian','Bengali','Gurmukhi']},
 {n:'Cy only(+Ge+He pad)',                     blocks:['Cyrillic','Georgian','Hebrew']},
];
const out:string[]=[];
for(const c of combos){
  const pool:string[]=[]; const seen=new Set<string>();
  for(const b of c.blocks) for(const ch of oneOf(b)) if(!seen.has(ch)){seen.add(ch); pool.push(ch);}
  if(pool.length<gl.length){ out.push(`${c.n.padEnd(42)} pool ${String(pool.length).padStart(4)} TOO SMALL`); continue; }
  const m=new Map<string,string>(); gl.forEach((g,i)=>m.set(g,pool[i]));
  const t=T(chars.map(x=>m.get(x)??x).join(''));
  out.push(`${c.n.padEnd(42)} pool ${String(pool.length).padStart(4)}  wire ${String(t).padStart(5)}  delta ${String(t-base).padStart(5)}`);
}
console.log(out.sort((a,b)=>{const g=(s:string)=>{const m=s.match(/delta\s+(-?\d+)/);return m?+m[1]:1e9;};return g(a)-g(b);}).join('\n'));
console.log('base',base);
