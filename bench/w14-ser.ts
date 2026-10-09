/** Serialisation tournament: same rule set, different tape encodings + contracts. */
import fs from 'node:fs'; import path from 'node:path';
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';
import { CHIRON_SCRIPTS, chironParseTape, chironInScript, chironDecode, CHIRON_START, CHIRON_SEP } from '../src/lib/omega/chiron';
import { metatronEncode } from '../src/lib/omega/metatron';
const ENC:EncodingName='o200k_base'; const T=(s:string)=>countTokens(s,ENC);
function scriptOf(ch:string){const cp=ch.codePointAt(0)!;for(const s of CHIRON_SCRIPTS) if(chironInScript(s,cp)) return s;return null;}
const isSpWord=(s:string)=>/^ [\p{L}\p{N}]+$/u.test(s);

const C={
  chiron:"\nEvery new Cyrillic letter before ¶ starts a rule whose text runs to the next new letter or to ¶. In the text after ¶ expand every rule, repeatedly, and print only the result.",
  min:"Before ¶ every new letter labels the text up to the next new letter. After ¶ expand all, print only the result.",
  trans:"Line 1's letters stand, in order, for line 2's words (each with one leading space). Expand them in the rest and print only the result.",
  transMin:"Line 1 letters mean line 2 words in order, each with a leading space. Expand below, print only the result.",
  hybrid:"Line 1 letters mean line 2 words in order, each with a leading space. Before ¶ every new letter labels the text up to the next new letter. Expand all after ¶ and print only the result.",
};
for(const [k,v] of Object.entries(C)) console.log('contract',k,T(v));

/** decode a transposed/hybrid wire by re-serialising to a plain CHIRON wire */
function toChiron(w:string): string|null {
  const nl1=w.indexOf('\n'); if(nl1<0) return null;
  const nl2=w.indexOf('\n',nl1+1); if(nl2<0) return null;
  const glyphs=[...w.slice(0,nl1)];
  const words=w.slice(nl1+1,nl2).split(' ').filter(x=>x.length>0);
  if(glyphs.length!==words.length) return null;
  let rest=w.slice(nl2+1);
  let sub='';
  if(rest.startsWith(CHIRON_START)){ const k=rest.indexOf(CHIRON_SEP); if(k<0) return null; sub=rest.slice(1,k); rest=rest.slice(k+1); }
  const tape=glyphs.map((g,i)=>g+' '+words[i]).join('')+sub;
  return CHIRON_START+tape+CHIRON_SEP+rest;
}
const transDecode=(w:string)=>{const c=toChiron(w); return c===null? w : chironDecode(c);};

const files:Array<[string,string]>=[];
for (const d of ['bench/holdout-work','bench/holdout','bench/holdout-tbl'])
  for (const f of fs.readdirSync(d).sort()){const t=fs.readFileSync(path.join(d,f),'utf8'); if(t.length<40000) files.push([d.split('/').pop()!.replace('holdout-','')+'/'+f,t]);}

console.log('\nlane'.padEnd(26),'raw'.padStart(6),'MTR'.padStart(6),'S1min'.padStart(6),'S2tr'.padStart(6),'best'.padStart(6),'Δ'.padStart(5),'R/w'.padStart(7));
let R=0,M=0,B=0; const wins:string[]=[];
for(const [nm,t] of files){
  const raw=T(t); let m:any=null; try{m=metatronEncode(t,ENC,{budgetMs:2500});}catch{}
  const mm=(m&&m.decoded===t)?Math.min(raw,m.messageTokens):raw;
  let s1=1e9,s2=1e9,info='-';
  if(m&&m.decoded===t&&m.wire.startsWith(CHIRON_START)&&m.messageTokens<raw){
    const k=m.wire.indexOf(CHIRON_SEP);
    const tape=m.wire.slice(1,k), body=m.wire.slice(k+1);
    const sc=tape.length?scriptOf(tape[0]):null;
    const rules=sc?chironParseTape(tape,sc):null;
    if(rules){
      // S1: same wire, minimal contract
      s1=T(m.wire)+T(C.min);
      // S2: transposed single-space-word rules, CHIRON sub-tape for the rest
      const wr=rules.filter(r=>isSpWord(r.raw)), other=rules.filter(r=>!isSpWord(r.raw));
      info=`${wr.length}/${rules.length}`;
      if(wr.length>=4){
        const head=wr.map(r=>r.glyph).join('')+'\n'+wr.map(r=>r.raw.slice(1)).join(' ')+'\n';
        const subTape=other.length? CHIRON_START+other.map(r=>r.glyph+r.raw).join('')+CHIRON_SEP : '';
        const w2=head+subTape+body;
        if(transDecode(w2)===t) s2=T(w2)+T(other.length?C.hybrid:C.transMin);
      }
    }
  }
  const best=Math.min(mm,s1,s2); R+=raw;M+=mm;B+=best;
  if(best<mm) wins.push(`${nm} ${mm}->${best}`);
  console.log(nm.padEnd(26),String(raw).padStart(6),String(mm).padStart(6),String(s1>1e8?-1:s1).padStart(6),String(s2>1e8?-1:s2).padStart(6),String(best).padStart(6),String(mm-best).padStart(5),info.padStart(7));
}
console.log('TOTAL'.padEnd(26),String(R).padStart(6),String(M).padStart(6),''.padStart(6),''.padStart(6),String(B).padStart(6),String(M-B).padStart(5),`  ${((M-B)/M*100).toFixed(2)}%`);
console.log('wins:', wins.join(' | '));
