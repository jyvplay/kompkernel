/**
 * X109 — SELECTIVE (PARTIAL) SUBSTITUTION HEADROOM.
 *
 * ΧΕΙΡΩΝ replaces EVERY occurrence of a rule phrase (`body.split(p).join(gl)`).
 * But a glyph wedged into the body FRAGMENTS the residual literal text and the
 * tokenizer then charges a worse density for it (measured: 0.33-0.39 tok/char on
 * the residue vs ~0.25 for natural prose).  Expanding ONE occurrence back to its
 * literal text can therefore LOWER the total price, and the decoder is unaffected:
 * a rule means "this glyph is this text", so an occurrence left literal is still
 * decoded correctly.
 *
 * Probe: hill-climb which occurrences to leave literal, pricing the whole message.
 */
import * as fs from 'node:fs';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
import { countTokens } from '../../src/lib/omega/bpe';
import { chironParseTape, chironDecode, CHIRON_START, CHIRON_SCRIPTS, chironInScript } from '../../src/lib/omega/chiron';
process.env.OMEGA_DET='1'; process.env.OMEGA_NO_MEMO='1'; process.env.OMEGA_ENGRAM='0'; process.env.OMEGA_OURA_MEMO='0'; process.env.OMEGA_NO_OROTHESIA='1';
const enc:any='o200k_base';
const lanes=fs.readFileSync(process.argv[2]!,'utf8').split('\n').filter(l=>l.trim()!=='');
const PASSES=Number(process.argv[3]??'2');
console.log('lane                  before  after    Δ  expanded  exact  decode-same');
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
  const parsed=chironParseTape(tape,script);
  if(!parsed){ console.log(`${p.split('/').pop()!.padEnd(20)} TAPE UNPARSEABLE`); continue; }
  const before=countTokens(msg,enc);
  const head=msg.slice(0,w), rest=msg.slice(w);
  // glyph -> rule text
  const txt=new Map<string,string>();
  for(const pr of parsed) txt.set(pr.glyph,pr.text);
  let cur=msg, curTok=before, nExp=0;
  for(let pass=0;pass<PASSES;pass++){
    let improved=false;
    // walk the body; for each glyph occurrence try expanding it in place
    for(let i=0;i<cur.length;i++){
      const g=cur[i]!;
      const t=txt.get(g);
      if(t===undefined) continue;
      const cand=cur.slice(0,i)+t+cur.slice(i+1);
      const tk=countTokens(cand,enc);
      if(tk<curTok){ cur=cand; curTok=tk; nExp++; improved=true; }
    }
    if(!improved) break;
  }
  let e1:string|null=null,e2:string|null=null;
  try{ e1=chironDecode(rest); }catch{}
  try{ e2=chironDecode(cur.slice(cur.indexOf(CHIRON_START))); }catch{}
  tb+=before; ta+=curTok;
  console.log(`${p.split('/').pop()!.padEnd(20)} ${String(before).padStart(6)} ${String(curTok).padStart(6)} ${String(curTok-before).padStart(4)} ${String(nExp).padStart(9)}   ${r.exact?'y':'N'}    ${e1!==null&&e1===e2?'y':'N'}`);
}
console.log(`\nTOTAL before ${tb}  after ${ta}  ΣΔ ${ta-tb}`);
