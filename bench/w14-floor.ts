import fs from 'node:fs'; import path from 'node:path'; import zlib from 'node:zlib';
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';
import { sibylEncode } from '../src/lib/omega/sibyl';
import { chironDecoderPrompt } from '../src/lib/omega/chiron';
const ENC:EncodingName='o200k_base'; const T=(s:string)=>countTokens(s,ENC);
const files:Array<[string,string]>=[];
for (const d of ['bench/holdout-work','bench/holdout'])
  for (const f of fs.readdirSync(d).sort()){const t=fs.readFileSync(path.join(d,f),'utf8'); if(t.length<40000) files.push([d.split('/').pop()+'/'+f,t]);}

console.log('=== where is the headroom? (xz floor at 10 bits/token vs incumbent) ===');
console.log('lane'.padEnd(26),'raw'.padStart(6),'xzBytes'.padStart(8),'floorTok'.padStart(9),'SIBYLmsg'.padStart(9),'gapToFloor'.padStart(11));
for (const [n,t] of files){
  const raw=T(t);
  const xz=zlib.brotliCompressSync(Buffer.from(t,'utf8'),{params:{[zlib.constants.BROTLI_PARAM_QUALITY]:11}}).length;
  const floor=Math.round(xz*8/10);
  let s=raw; try{const r=sibylEncode(t,ENC,{budgetMs:3000}); if(r.decoded===t) s=Math.min(raw,r.messageTokens);}catch{}
  console.log(n.padEnd(26),String(raw).padStart(6),String(xz).padStart(8),String(floor).padStart(9),String(s).padStart(9),String(s-floor).padStart(11));
}

console.log('\n=== CHIRON decoder contract, verbatim ===');
const t=fs.readFileSync('bench/holdout-work/kb-article.txt','utf8');
const r=sibylEncode(t,ENC,{budgetMs:3000});
const p=chironDecoderPrompt(r.wire);
const contract=p.slice(p.indexOf(r.wire)+r.wire.length) || p.replace(r.wire,'');
console.log('full prompt tokens:', T(p), ' wire tokens:', T(r.wire), ' contract tokens:', T(p)-T(r.wire));
console.log(JSON.stringify(contract));
console.log('\n=== glyph cost inside SIBYL kb-article wire ===');
const bi=r.wire.lastIndexOf('¶'); const body=r.wire.slice(bi+1);
const gl=new Set<string>(); for(const ch of body){const c=ch.codePointAt(0)!; if(c>=0x370) gl.add(ch);}
let occ=0,marg=0; const base=T(body);
for(const g of gl){const k=body.split(g).length-1; if(!k)continue; occ+=k; marg+=base-T(body.split(g).join(''));}
console.log(`distinct glyphs=${gl.size} occurrences=${occ} marginal=${marg} -> ${(marg/occ).toFixed(3)} tok/ref; body=${base} tape=${T(r.wire)-base}`);
