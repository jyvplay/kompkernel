import fs from 'node:fs';
import {countTokens} from '@/lib/omega/bpe';
const enc='o200k_base' as any; const T=(s:string)=>countTokens(s,enc);
const W=+(process.env.W||27);
const wf=`bench/x24/wires/${W.toString().padStart(2,'0')}.wire`;
const w=fs.readFileSync(wf,'utf8');
const used=new Set<string>();
for(const ch of w){const cp=ch.codePointAt(0)!; if(cp>0x0180&&ch!=='¶'&&ch!=='§') used.add(ch);}
const chars=[...w];
const nGlyph=chars.filter(c=>used.has(c)).length;
const base=T(w);
console.log(`wire ${W}: base ${base}, glyph occurrences ${nGlyph}, distinct ${used.size}`);
// candidate blocks: [name, lo, hi]
const blocks:[string,number,number][]=[
 ['Cyrillic',0x0410,0x0450],['Greek',0x0391,0x03aa],['Hebrew',0x05d0,0x05eb],
 ['Arabic',0x0621,0x064b],['Thai',0x0e01,0x0e3b],['Devanagari',0x0915,0x0939],
 ['Bengali',0x0995,0x09aa],['Tamil',0x0b95,0x0baa],['Telugu',0x0c15,0x0c2a],
 ['Gujarati',0x0a95,0x0aaa],['Armenian',0x0531,0x0556],['Georgian',0x10d0,0x10f0],
 ['HangulJamo',0x3131,0x3163],['Katakana',0x30a1,0x30f6],['Hiragana',0x3041,0x3096],
 ['CJK',0x4e00,0x4e40],['Lao',0x0e81,0x0eaa],['Myanmar',0x1000,0x1020],
 ['Khmer',0x1780,0x17a0],['Ethiopic',0x1200,0x1220],['Sinhala',0x0d9a,0x0db0],
 ['Malayalam',0x0d15,0x0d2a],['Kannada',0x0c95,0x0caa],['Oriya',0x0b15,0x0b2a],
 ['Gurmukhi',0x0a15,0x0a2a],['Tibetan',0x0f40,0x0f60],['Cherokee',0x13a0,0x13c0],
];
const rows:string[]=[];
for(const [nm,lo,hi] of blocks){
  // cost of using an ENTIRE block as the alphabet: map distinct glyphs -> consecutive block chars
  const gl=[...used]; const pooln=hi-lo;
  const cps:string[]=[]; for(let c=lo;c<hi;c++) cps.push(String.fromCodePoint(c));
  const one=cps.filter(c=>T(c)===1).length;
  
  const m=new Map<string,string>(); const sh=Math.floor(gl.length/cps.length); gl.forEach((g,i)=>m.set(g,cps[Math.floor(i/(sh+1))%cps.length]));
  const out=chars.map(c=>m.get(c)??c).join('');
  const t=T(out);
  rows.push(`${nm.padEnd(12)} pool ${String(pooln).padStart(4)} 1tok ${String(one).padStart(4)}/${pooln}  wire ${String(t).padStart(5)}  delta ${String(t-base).padStart(5)}`);
}
console.log(rows.sort((a,b)=>{
  const g=(s:string)=>{const m=s.match(/delta\s+(-?\d+)/);return m?+m[1]:1e9;};
  return g(a)-g(b);}).join('\n'));
console.log('\nbase',base);
