/** PROTOTYPE: re-frame the incumbent's own CHIRON wire as in-place appositive
 *  bindings with a minimal contract.  Measures the exact delta. */
import fs from 'node:fs'; import path from 'node:path';
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';
import { CHIRON_SCRIPTS, chironParseTape, chironInScript, chironDecode, CHIRON_START, CHIRON_SEP } from '../src/lib/omega/chiron';
import { metatronEncode } from '../src/lib/omega/metatron';
const ENC:EncodingName='o200k_base'; const T=(s:string)=>countTokens(s,ENC);

const WORD = /[^\r\n\p{L}\p{N}]?[\p{L}\p{N}]+$/u;     // exactly one o200k word-chunk
const isWordRule = (s:string)=> /^[^\r\n\p{L}\p{N}]?[\p{L}\p{N}]+$/u.test(s);

function scriptOf(ch:string){ const cp=ch.codePointAt(0)!; for(const s of CHIRON_SCRIPTS) if(chironInScript(s,cp)) return s; return null; }

/** APPOSITION decoder: one left-to-right pass. */
function appoDecode(wire:string): string {
  let body=wire, defs=new Map<string,string>();
  if (wire.startsWith(CHIRON_START)) {
    const k=wire.indexOf(CHIRON_SEP); if(k<0) return wire;
    const tape=wire.slice(1,k); body=wire.slice(k+1);
    const sc=tape.length?scriptOf(tape[0]):null;
    if(sc){ const rs=chironParseTape(tape,sc); if(!rs) return wire;
      for(const r of rs) defs.set(r.glyph, r.raw); }
  }
  const sc = (() => { for (const ch of body){ const s=scriptOf(ch); if(s) return s; } return null; })();
  if(!sc && defs.size===0) return body;
  let out='';
  for (let i=0;i<body.length;i++){
    const ch=body[i];
    const s=scriptOf(ch);
    if(!s){ out+=ch; continue; }
    const d=defs.get(ch);
    if(d!==undefined){ out+=d; continue; }
    const m=out.match(WORD);
    if(!m) { out+=ch; continue; }
    defs.set(ch,m[0]);      // bind: the word just emitted, space included
  }
  // expand nested glyph references inside tape definitions (bounded)
  for(let pass=0;pass<8;pass++){
    let changed=false, o2='';
    for(const ch of out){ const s=scriptOf(ch); const d=s?defs.get(ch):undefined;
      if(d!==undefined){o2+=d;changed=true;} else o2+=ch; }
    out=o2; if(!changed) break;
  }
  return out;
}

const CONTRACTS = {
  plain: 'Each Cyrillic letter stands for the word it is first attached to, space included. Print the restored text.',
  short: 'A Cyrillic letter means the word it first follows, space included. Print the restored text.',
  tiny:  'Each letter means the word it first follows, space included. Print the text.',
};

function reframe(wire:string, srcText:string){
  if(!wire.startsWith(CHIRON_START)) return null;
  const k=wire.indexOf(CHIRON_SEP); if(k<0) return null;
  const tape=wire.slice(1,k); let body=wire.slice(k+1);
  if(!tape.length) return null;
  const sc=scriptOf(tape[0]); if(!sc) return null;
  const rules=chironParseTape(tape,sc); if(!rules) return null;
  // eligible: plain single-word text, no glyph inside, no CHIRON operators
  const keep: typeof rules = [], inline: typeof rules = [];
  for(const r of rules){
    const hasGlyph=[...r.raw].some(c=>!!scriptOf(c));
    const hasOp=/[×…]/.test(r.raw);
    if(!hasGlyph && !hasOp && isWordRule(r.raw)) inline.push(r); else keep.push(r);
  }
  if(inline.length===0) return null;
  // place the definition at each inline glyph's FIRST occurrence in the body
  for(const r of inline){
    const i=body.indexOf(r.glyph);
    if(i<0) { keep.push(r); continue; }
    body = body.slice(0,i) + r.raw + r.glyph + body.slice(i+1);
  }
  const newTape = keep.length? CHIRON_START+keep.map(r=>r.glyph+r.raw).join('')+CHIRON_SEP : '';
  const w = newTape + body;
  const ok = appoDecode(w)===srcText;
  return { wire:w, ok, inline:inline.length, kept:keep.length };
}

const files:Array<[string,string]>=[];
for (const d of ['bench/holdout-work','bench/holdout'])
  for (const f of fs.readdirSync(d).sort()){const t=fs.readFileSync(path.join(d,f),'utf8'); if(t.length<40000) files.push([d.split('/').pop()+'/'+f,t]);}
console.log('contract tokens:', Object.entries(CONTRACTS).map(([k,v])=>`${k}=${T(v)}`).join(' '));
console.log('lane'.padEnd(26),'raw'.padStart(6),'MTRmsg'.padStart(7),'APPOwire'.padStart(9),'APPOmsg'.padStart(8),'Δ'.padStart(5),'inl/kept'.padStart(9),'ok');
let R=0,M=0,A=0;
for(const [nm,t] of files){
  const raw=T(t);
  let m:any=null; try{m=metatronEncode(t,ENC,{budgetMs:2500});}catch{}
  const mm = (m&&m.decoded===t)?Math.min(raw,m.messageTokens):raw;
  let am=mm, info='-', ok='-';
  if(m&&m.decoded===t&&m.wire.startsWith(CHIRON_START)){
    const r=reframe(m.wire,t);
    if(r){ ok=r.ok?'✓':'✗'; info=`${r.inline}/${r.kept}`;
      if(r.ok) am=Math.min(mm, T(r.wire)+T(CONTRACTS.short)); }
  }
  R+=raw; M+=mm; A+=am;
  console.log(nm.padEnd(26),String(raw).padStart(6),String(mm).padStart(7),String(m&&m.wire?T(m.wire):0).padStart(9),String(am).padStart(8),String(mm-am).padStart(5),info.padStart(9),ok);
}
console.log('TOTAL'.padEnd(26),String(R).padStart(6),String(M).padStart(7),''.padStart(9),String(A).padStart(8),String(M-A).padStart(5), `  ${((M-A)/M*100).toFixed(2)}% better than METATRON`);
