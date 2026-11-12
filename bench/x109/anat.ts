/**
 * X109 — token-level anatomy of the emitted wire.  For each lane: the contract, and
 * the body split into glyph-run tokens and literal tokens, with tokens-per-glyph
 * measured on the runs.  tokens/glyph near 0.5 means ΧΕΙΡΩΝ's dense glyph assignment
 * is already at the pairing floor and the remaining body cost is irreducible literal
 * text; tokens/glyph well above 0.5 means the assignment still has headroom.
 */
import * as fs from 'node:fs';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
import { countTokens, tokenStrings } from '../../src/lib/omega/bpe';
import { CHIRON_START, CHIRON_SCRIPTS, chironInScript } from '../../src/lib/omega/chiron';
process.env.OMEGA_DET='1'; process.env.OMEGA_NO_MEMO='1'; process.env.OMEGA_ENGRAM='0'; process.env.OMEGA_OURA_MEMO='0'; process.env.OMEGA_NO_OROTHESIA='1';
const enc:any='o200k_base';
const lanes=fs.readFileSync(process.argv[2]!,'utf8').split('\n').filter(l=>l.trim()!=='');
console.log('lane                  body  runTok runGlyph  tok/glyph  litTok  litChars  ctr  tape');
let TB=0,TRT=0,TRG=0,TLT=0,TLC=0,TC=0,TT=0;
for(const p of lanes){
  const text=fs.readFileSync(p,'utf8');
  const r:any=tagstackEncode(text,enc);
  const msg:string=r.message;
  const w=msg.indexOf(CHIRON_START);
  if(w<0){ console.log(`${p.split('/').pop()!.padEnd(20)} NO FRAME`); continue; }
  const tEnd=msg.indexOf('\u00b6',w);
  const contract=msg.slice(0,w), tape=msg.slice(w+1,tEnd), body=msg.slice(tEnd+1);
  const script=CHIRON_SCRIPTS.find(s=>chironInScript(s,tape[0]!.codePointAt(0)!))!;
  const glyphs=new Set<string>();
  for(const ch of tape) if(chironInScript(script,ch.codePointAt(0)!)) glyphs.add(ch);
  // walk the body, splitting into glyph runs and literal spans
  let runTok=0, runGlyph=0, litTok=0, litChars=0;
  let i=0;
  while(i<body.length){
    if(glyphs.has(body[i]!)){
      let j=i; while(j<body.length&&glyphs.has(body[j]!)) j++;
      const run=body.slice(i,j);
      runTok+=countTokens(run,enc); runGlyph+=run.length; i=j;
    } else {
      let j=i; while(j<body.length&&!glyphs.has(body[j]!)) j++;
      const lit=body.slice(i,j);
      litTok+=countTokens(lit,enc); litChars+=lit.length; i=j;
    }
  }
  const bt=countTokens(body,enc);
  TB+=bt;TRT+=runTok;TRG+=runGlyph;TLT+=litTok;TLC+=litChars;TC+=countTokens(contract,enc);TT+=countTokens(tape,enc);
  console.log(`${p.split('/').pop()!.padEnd(20)} ${String(bt).padStart(4)} ${String(runTok).padStart(6)} ${String(runGlyph).padStart(8)} ${(runGlyph?runTok/runGlyph:0).toFixed(3).padStart(10)} ${String(litTok).padStart(7)} ${String(litChars).padStart(9)} ${String(countTokens(contract,enc)).padStart(4)} ${String(countTokens(tape,enc)).padStart(5)}`);
}
console.log(`\nTOTAL body ${TB} = run ${TRT} (${TRG} glyphs, ${(TRT/Math.max(1,TRG)).toFixed(3)} tok/glyph) + literal ${TLT} (${TLC} chars, ${(TLT/Math.max(1,TLC)).toFixed(3)} tok/char)`);
console.log(`contract ${TC}  tape ${TT}`);
console.log(`\nIf tok/glyph is 0.5 the runs are at the pairing floor. Literal text at ~0.25 tok/char is the o200k English density.`);
