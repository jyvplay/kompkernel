/** Do arms keep rules that are NOT worth it under EXACT measurement? */
import fs from 'node:fs'; import path from 'node:path';
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';
import { CHIRON_START, CHIRON_SEP, CHIRON_SCRIPTS, chironParseTape, chironInScript, chironDecode } from '../src/lib/omega/chiron';
import { syntomiaContract } from '../src/lib/omega/syntomia';
import { sibylEncode } from '../src/lib/omega/sibyl';
import { ariadneEncode } from '../src/lib/omega/ariadne';
import { metatronEncode } from '../src/lib/omega/metatron';
const ENC:EncodingName='o200k_base'; const T=(s:string)=>countTokens(s,ENC);
function scriptOf(ch:string){const cp=ch.codePointAt(0)!;for(const s of CHIRON_SCRIPTS) if(chironInScript(s,cp)) return s;return null;}
type Rule={g:string;raw:string};
function parse(wire:string):{rules:Rule[];body:string}|null{
  if(!wire.startsWith(CHIRON_START)) return null;
  const k=wire.indexOf(CHIRON_SEP); if(k<0) return null;
  const tape=wire.slice(1,k), body=wire.slice(k+1);
  if(!tape.length) return null;
  const sc=scriptOf(tape[0]); if(!sc) return null;
  const rs=chironParseTape(tape,sc); if(!rs) return null;
  return { rules: rs.map(r=>({g:r.glyph,raw:r.raw})), body };
}
const render=(rules:Rule[],body:string)=>CHIRON_START+rules.map(r=>r.g+r.raw).join('')+CHIRON_SEP+body;
/** inline rule i everywhere (tape + body), removing it */
function drop(rules:Rule[],body:string,i:number){
  const r=rules[i];
  const nr=rules.filter((_,j)=>j!==i).map(x=>({g:x.g,raw:x.raw.split(r.g).join(r.raw)}));
  return { rules:nr, body: body.split(r.g).join(r.raw) };
}
function cost(rules:Rule[],body:string,src:string){
  const w=render(rules,body);
  if(chironDecode(w)!==src) return {tok:1e9,w};
  return { tok: T(w)+T(syntomiaContract(w,src)), w };
}
/** exact drop-polish: repeatedly remove the rule whose removal helps most */
function polish(wire:string,src:string){
  let p=parse(wire); if(!p) return null;
  let cur=cost(p.rules,p.body,src); if(cur.tok>=1e9) return null;
  let dropped=0;
  for(let iter=0; iter<200; iter++){
    let best=-1,bestTok=cur.tok,bestState:any=null;
    for(let i=0;i<p.rules.length;i++){
      const d=drop(p.rules,p.body,i);
      const c=cost(d.rules,d.body,src);
      if(c.tok<bestTok){bestTok=c.tok;best=i;bestState=d;}
    }
    if(best<0) break;
    p=bestState; cur={tok:bestTok,w:render(p.rules,p.body)}; dropped++;
  }
  return { tok:cur.tok, wire:cur.w, dropped, rules:p.rules.length };
}
const files:Array<[string,string]>=[];
for(const d of ['bench/holdout-lang','bench/holdout-work','bench/holdout','bench/holdout-tbl','bench/holdout-mk'])
  if(fs.existsSync(d)) for(const f of fs.readdirSync(d).sort()){const t=fs.readFileSync(path.join(d,f),'utf8'); if(t.length<14000) files.push([d.split('/').pop()!.replace('holdout-','')+'/'+f,t]);}
console.log('lane'.padEnd(24),'raw'.padStart(5),'MTR'.padStart(5),'arm+min'.padStart(8),'polished'.padStart(9),'Δ'.padStart(4),'dropped'.padStart(8),'ms'.padStart(6));
let A=0,P=0,M=0;
for(const [n,t] of files){
  const raw=T(t);
  let m=raw; try{const r=metatronEncode(t,ENC,{budgetMs:1500}); if(r.decoded===t) m=Math.min(raw,r.messageTokens);}catch{}
  let bestW:string|null=null, bestTok=raw;
  for(const fn of [()=>sibylEncode(t,ENC,{budgetMs:80,wordGrid:[6]} as any),()=>sibylEncode(t,ENC,{budgetMs:80,wordGrid:[3]} as any),()=>ariadneEncode(t,ENC,{budgetMs:80})]){
    try{ const r=fn(); if(r&&r.decoded===t&&typeof r.wire==='string'&&r.wire.startsWith(CHIRON_START)&&chironDecode(r.wire)===t){
      const c=T(r.wire)+T(syntomiaContract(r.wire,t)); if(c<bestTok){bestTok=c;bestW=r.wire;} } }catch{}
  }
  let pol=bestTok, dr=0, ms=0;
  if(bestW){ const t0=Date.now(); const o=polish(bestW,t); ms=Date.now()-t0; if(o&&o.tok<pol){pol=o.tok;dr=o.dropped;} }
  A+=Math.min(m,bestTok); P+=Math.min(m,bestTok,pol); M+=m;
  console.log(n.padEnd(24),String(raw).padStart(5),String(m).padStart(5),String(Math.min(bestTok,raw)).padStart(8),String(Math.min(pol,raw)).padStart(9),String(bestTok-pol).padStart(4),String(dr).padStart(8),String(ms).padStart(6));
}
console.log('TOTAL'.padEnd(24),'',' ',String(M).padStart(5),String(A).padStart(8),String(P).padStart(9),String(A-P).padStart(4));
console.log(`exact drop-polish gains ${A-P} tokens over the arm it polishes (${((A-P)/A*100).toFixed(2)}%); vs METATRON ${M-P} (${((M-P)/M*100).toFixed(2)}%)`);
