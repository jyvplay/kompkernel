/**
 * X109 — GLYPH-ASSIGNMENT HEADROOM, MEASURED BY HILL-CLIMB.
 *
 * ΧΕΙΡΩΝ's `renderWire` assigns rule glyphs during rendering, under topological
 * (dependency) constraints.  A rule's glyph is the ONLY thing tying the tape to the
 * body, so a CONSISTENT PERMUTATION of the used glyphs across tape and body leaves
 * `chironDecode` byte-identical — exactly lossless, and invisible to the reader
 * because a glyph is a glyph.
 *
 * This probe hill-climbs that permutation against the live tokenizer on the FULL
 * message and reports the improvement.  It is the measurement that decides whether a
 * standalone reassignment codec has legs.
 */
import * as fs from 'node:fs';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
import { countTokens } from '../../src/lib/omega/bpe';
import { chironDecode, CHIRON_START, CHIRON_SCRIPTS, chironInScript } from '../../src/lib/omega/chiron';
process.env.OMEGA_DET='1'; process.env.OMEGA_NO_MEMO='1'; process.env.OMEGA_ENGRAM='0'; process.env.OMEGA_OURA_MEMO='0'; process.env.OMEGA_NO_OROTHESIA='1';
const enc:any='o200k_base';
const lanes=fs.readFileSync(process.argv[2]!,'utf8').split('\n').filter(l=>l.trim()!=='');
const ITER = Number(process.argv[3] ?? '4000');

console.log('lane                  before  after    Δ   swaps  exact  decode-same');
let tb=0,ta=0;
for(const p of lanes){
  const text=fs.readFileSync(p,'utf8');
  const r:any=tagstackEncode(text,enc);
  const msg:string=r.message;
  const w=msg.indexOf(CHIRON_START);
  if(w<0){ console.log(`${p.split('/').pop()!.padEnd(20)} NO FRAME`); continue; }
  const tEnd=msg.indexOf('\u00b6',w);
  const tape=msg.slice(w+1,tEnd);
  const script=CHIRON_SCRIPTS.find(s=>chironInScript(s,tape[0]!.codePointAt(0)!))!;
  const glyphs:string[]=[];
  { const seen=new Set<string>();
    for(const ch of tape) if(chironInScript(script,ch.codePointAt(0)!)&&!seen.has(ch)){seen.add(ch);glyphs.push(ch);} }
  if(glyphs.length<2){ console.log(`${p.split('/').pop()!.padEnd(20)} only ${glyphs.length} glyph`); continue; }
  const before=countTokens(msg,enc);
  // deterministic pseudo-random order (no Math.random: a run must be reproducible)
  let seed=0x9e3779b9; const rnd=()=>{ seed=(seed+0x6d2b79f5)|0; let t=seed; t=Math.imul(t^(t>>>15),t|1); t^=t+Math.imul(t^(t>>>7),t|61); return ((t^(t>>>14))>>>0)/4294967296; };
  let perm=glyphs.slice();
  for(let i=perm.length-1;i>0;i--){ const j=Math.floor(rnd()*(i+1)); const t=perm[i]!; perm[i]=perm[j]!; perm[j]=t; }
  const apply=(m:string,pm:string[])=> {
    const map=new Map<string,string>(); for(let i=0;i<glyphs.length;i++) map.set(glyphs[i]!,pm[i]!);
    let out=''; for(const ch of m) out += map.get(ch) ?? ch; return out;
  };
  let cur=perm.slice(), bestTok=countTokens(apply(msg,cur),enc), swaps=0;
  for(let it=0; it<ITER; it++){
    const i=Math.floor(rnd()*glyphs.length), j=Math.floor(rnd()*glyphs.length);
    if(i===j) continue;
    const t=cur[i]!; cur[i]=cur[j]!; cur[j]=t;
    const tok=countTokens(apply(msg,cur),enc);
    if(tok<bestTok){ bestTok=tok; swaps++; } else { const u=cur[i]!; cur[i]=cur[j]!; cur[j]=u; }
  }
  const after=apply(msg,cur);
  let exp1:string|null=null, exp2:string|null=null;
  try{ exp1=chironDecode(msg.slice(w)); }catch{}
  try{ exp2=chironDecode(after.slice(after.indexOf(CHIRON_START))); }catch{}
  tb+=before; ta+=bestTok;
  console.log(`${p.split('/').pop()!.padEnd(20)} ${String(before).padStart(6)} ${String(bestTok).padStart(6)} ${String(bestTok-before).padStart(4)} ${String(swaps).padStart(6)}   ${r.exact?'y':'N'}    ${exp1!==null&&exp1===exp2?'y':'N'}`);
}
console.log(`\nTOTAL before ${tb}  after ${ta}  ΣΔ ${ta-tb}   (hill-climb, ${ITER} random swaps per lane)`);
