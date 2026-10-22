import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
const enc='o200k_base' as any; const T=(s:string)=>countTokens(s,enc);
// major single-token scripts that could serve as glyph alphabets
const BLOCKS: Array<[string,number,number]> = [
  ['CYRILLIC',0x400,0x460],['GREEK',0x386,0x3d0],['ARMENIAN',0x531,0x570],['GEORGIAN',0x10a0,0x1100],
  ['DEVANAGARI',0x904,0x940],['HEBREW',0x5d0,0x5eb],['THAI',0xe01,0xe3b],['HIRAGANA',0x3041,0x3097],
  ['KATAKANA',0x30a1,0x30fb],['TAMIL',0xb85,0xbc0],['TELUGU',0xc05,0xc40],['KANNADA',0xc85,0xcc0],
  ['MALAYALAM',0xd05,0xd40],['LAO',0xe81,0xee0],['BENGALI',0x985,0x9c0],['GUJARATI',0xa85,0xac0],
  ['HANGUL_JAMO',0x1100,0x1200],['CYRILLIC_EXT',0x460,0x500],['GREEK_EXT',0x1f00,0x1f60],
];
const files=fs.readdirSync('bench/x30/fresh').filter(f=>f.endsWith('.txt')).sort();
console.log('file          payloadChars  bestScript  avail  (avail = 1-token chars of that script absent from payload)');
for(const f of files){
  const t=fs.readFileSync('bench/x30/fresh/'+f,'utf8');
  const payload=new Set([...t]);
  let best:{n:string,c:number}|null=null;
  const per:string[]=[];
  for(const [name,lo,hi] of BLOCKS){
    let c=0;
    for(let cp=lo;cp<hi;cp++){const ch=String.fromCodePoint(cp); if(!payload.has(ch)&&T(ch)===1)c++;}
    per.push(name+':'+c);
    if(!best||c>best.c) best={n:name,c};
  }
  console.log(f.padEnd(14), String(payload.size).padStart(10), '  ', (best!.n+':'+best!.c).padEnd(22));
}
