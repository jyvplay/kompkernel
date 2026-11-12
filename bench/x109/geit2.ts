/**
 * X109 — GLYPH-ASSIGNMENT HEADROOM, GREEDY MULTI-PASS OVER THE FULL POOL.
 *
 * ΧΕΙΡΩΝ's renderer picks rule glyphs in topological order.  The CHOICE is free, so
 * a reassignment that lowers the tokenizer's cost of tape+body is byte-identical to
 * the reader.  Probe: greedy multi-pass — for each used glyph, try every single-
 * character o200k token in the same script, keep the best, repeat to fixpoint.
 */
import * as fs from 'node:fs';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
import { countTokens } from '../../src/lib/omega/bpe';
import { chironDecode, CHIRON_START, CHIRON_SCRIPTS, chironInScript } from '../../src/lib/omega/chiron';
import { createRequire } from 'node:module';
process.env.OMEGA_DET='1'; process.env.OMEGA_NO_MEMO='1'; process.env.OMEGA_ENGRAM='0'; process.env.OMEGA_OURA_MEMO='0'; process.env.OMEGA_NO_OROTHESIA='1';
const enc:any='o200k_base';
const lanes=fs.readFileSync(process.argv[2]!,'utf8').split('\n').filter(l=>l.trim()!=='');
const PASSES = Number(process.argv[3] ?? '4');
const req=createRequire(import.meta.url); const gpt:any=req('gpt-tokenizer');
/** every single-character o200k token whose codepoint lies in `ranges` */
function pool1(ranges:Array<[number,number]>):string[]{
  const out:string[]=[];
  for(let id=0; id<200_000; id++){
    let s:string; try{ s=gpt.decode([id]); }catch{ continue; }
    if(s.length!==1) continue;
    const c=s.codePointAt(0)!;
    if(ranges.some(([a,b])=>c>=a&&c<b)) out.push(s);
  }
  return out;
}
const STRUCT=new Set(['\u00a7','\u00b6','\u00d7','\u2026','\u23d0']);
console.log('lane                  before  after    Δ  passes  exact  decode-same');
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
  const used:string[]=[];
  { const seen=new Set<string>(); for(const ch of tape) if(chironInScript(script,ch.codePointAt(0)!)&&!seen.has(ch)){seen.add(ch);used.push(ch);} }
  const before=countTokens(msg,enc);
  const head=msg.slice(0,w), body=msg.slice(tEnd);
  const pool=pool1(script.ranges ?? [[script.lo,script.hi] as [number,number]]).filter(c=>!STRUCT.has(c));
  // map glyph -> chosen glyph; apply via one regex pass
  const render=(map:Map<string,string>)=>{
    if(map.size===0) return msg;
    const re=new RegExp('['+[...map.keys()].join('')+']','g');
    return head + msg.slice(w).replace(re, c=>map.get(c)!);
  };
  let map=new Map<string,string>(); for(const g of used) map.set(g,g);
  let cur=countTokens(render(map),enc), passUsed=0;
  for(let pass=0; pass<PASSES; pass++){
    let improved=false;
    for(const g of used){
      let bestCh=map.get(g)!, bestTok=cur;
      for(const c of pool){
        if(map.get(c)!==undefined && map.get(c)!==g) continue;
        if(map.get(g)===c) continue;
        const old=map.get(g)!; map.set(g,c); map.delete(old===c?g:g);
        // simpler: set g->c
        map.set(g,c);
        const t=countTokens(render(map),enc);
        if(t<bestTok){ bestTok=t; bestCh=c; }
      }
      map.set(g,bestCh);
      if(bestTok<cur){ cur=bestTok; improved=true; passUsed++; }
    }
    if(!improved) break;
  }
  const after=render(map);
  let e1:string|null=null,e2:string|null=null;
  try{ e1=chironDecode(msg.slice(w)); }catch{}
  try{ e2=chironDecode(after.slice(after.indexOf(CHIRON_START))); }catch{}
  tb+=before; ta+=cur;
  console.log(`${p.split('/').pop()!.padEnd(20)} ${String(before).padStart(6)} ${String(cur).padStart(6)} ${String(cur-before).padStart(4)} ${String(passUsed).padStart(7)}   ${r.exact?'y':'N'}    ${e1!==null&&e1===e2?'y':'N'}`);
}
console.log(`\nTOTAL before ${tb}  after ${ta}  ΣΔ ${ta-tb}`);
