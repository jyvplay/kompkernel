import fs from 'node:fs'; import path from 'node:path';
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';
import { CHIRON_SCRIPTS, chironParseTape, chironInScript, chironDecode, CHIRON_START, CHIRON_SEP } from '../src/lib/omega/chiron';
import { metatronEncode } from '../src/lib/omega/metatron';
const ENC:EncodingName='o200k_base'; const T=(s:string)=>countTokens(s,ENC);
const WORDTAIL=/[^\r\n\p{L}\p{N}]?[\p{L}\p{N}]+$/u;
const isWord=(s:string)=>/^[^\r\n\p{L}\p{N}]?[\p{L}\p{N}]+$/u.test(s);
function scriptOf(ch:string){const cp=ch.codePointAt(0)!;for(const s of CHIRON_SCRIPTS) if(chironInScript(s,cp)) return s;return null;}

/** APPOSITION -> CHIRON re-serialisation (the decode path).  One L-to-R pass. */
function appoToChiron(wire:string): string|null {
  let residual='', body=wire;
  if (wire.startsWith(CHIRON_START)) { const k=wire.indexOf(CHIRON_SEP); if(k<0) return null; residual=wire.slice(1,k); body=wire.slice(k+1); }
  const bound=new Set<string>();
  if(residual){ const sc=scriptOf(residual[0]); if(!sc) return null; const rs=chironParseTape(residual,sc); if(!rs) return null; for(const r of rs) bound.add(r.glyph); }
  let out='', tape=residual;
  for(let i=0;i<body.length;i++){
    const ch=body[i]; const s=scriptOf(ch);
    if(!s || bound.has(ch)){ out+=ch; continue; }
    const m=out.match(WORDTAIL);
    if(!m){ out+=ch; continue; }
    bound.add(ch); tape += ch + m[0];     // define; glyph itself disappears from the body
  }
  return CHIRON_START + tape + CHIRON_SEP + out;
}
const appoDecode=(w:string)=>{ const c=appoToChiron(w); return c===null? w : chironDecode(c); };

const CTR_APPO='A Cyrillic letter means the word it first follows, space included. Print the restored text.';

function reframe(wire:string, src:string, dropNonWord:boolean){
  if(!wire.startsWith(CHIRON_START)) return null;
  const k=wire.indexOf(CHIRON_SEP); if(k<0) return null;
  const tape=wire.slice(1,k); let body=wire.slice(k+1);
  if(!tape.length) return null;
  const sc=scriptOf(tape[0]); if(!sc) return null;
  const rules=chironParseTape(tape,sc); if(!rules) return null;
  const inline:typeof rules=[], keep:typeof rules=[];
  for(const r of rules){
    const hasGlyph=[...r.raw].some(c=>!!scriptOf(c));
    const hasOp=/[×…]/.test(r.raw);
    if(!hasGlyph && !hasOp && isWord(r.raw)) inline.push(r); else keep.push(r);
  }
  if(!inline.length) return null;
  if(dropNonWord && keep.length){
    // expand kept rules back to literal text so the tape disappears entirely
    let changed=true, guard=0;
    while(changed && guard++<10){ changed=false;
      for(const r of keep){ if(body.includes(r.glyph)){ body=body.split(r.glyph).join(r.raw); changed=true; } } }
    if([...body].some(c=>{const s=scriptOf(c); return s && !inline.some(x=>x.glyph===c);})) return null;
    keep.length=0;
  }
  for(const r of inline){ const i=body.indexOf(r.glyph); if(i<0) continue;
    body=body.slice(0,i)+r.raw+r.glyph+body.slice(i+1); }
  const w=(keep.length? CHIRON_START+keep.map(r=>r.glyph+r.raw).join('')+CHIRON_SEP : '')+body;
  return { wire:w, ok:appoDecode(w)===src, inline:inline.length, kept:keep.length };
}

const files:Array<[string,string]>=[];
for (const d of ['bench/holdout-work','bench/holdout'])
  for (const f of fs.readdirSync(d).sort()){const t=fs.readFileSync(path.join(d,f),'utf8'); if(t.length<40000) files.push([d.split('/').pop()+'/'+f,t]);}
console.log('apposition contract =', T(CTR_APPO), 'tokens');
console.log('lane'.padEnd(26),'raw'.padStart(6),'MTR'.padStart(6),'A-keep'.padStart(7),'A-drop'.padStart(7),'best'.padStart(6),'Δ'.padStart(5),'ok');
let R=0,M=0,A=0;
for(const [nm,t] of files){
  const raw=T(t); let m:any=null; try{m=metatronEncode(t,ENC,{budgetMs:2500});}catch{}
  const mm=(m&&m.decoded===t)?Math.min(raw,m.messageTokens):raw;
  let a1=1e9,a2=1e9,ok='-';
  if(m&&m.decoded===t&&m.wire.startsWith(CHIRON_START)){
    for (const [drop,slot] of [[false,1],[true,2]] as Array<[boolean,number]>) {
      const r=reframe(m.wire,t,drop);
      if(r&&r.ok){ const c=T(r.wire)+T(CTR_APPO)+(r.kept? 40:0); if(slot===1) a1=c; else a2=c; ok='✓'; }
      else if(r) ok = ok==='✓'?ok:'✗';
    }
  }
  const best=Math.min(mm,a1,a2); R+=raw;M+=mm;A+=best;
  console.log(nm.padEnd(26),String(raw).padStart(6),String(mm).padStart(6),String(a1>1e8?-1:a1).padStart(7),String(a2>1e8?-1:a2).padStart(7),String(best).padStart(6),String(mm-best).padStart(5),ok);
}
console.log('TOTAL'.padEnd(26),String(R).padStart(6),String(M).padStart(6),''.padStart(7),''.padStart(7),String(A).padStart(6),String(M-A).padStart(5),`  ${((M-A)/M*100).toFixed(2)}%`);
