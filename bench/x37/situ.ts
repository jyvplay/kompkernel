import * as fs from 'node:fs';
import { countTokens, EncodingName } from '@/lib/omega/bpe';
import { oikonomiaEncode } from '@/lib/omega/oikonomia';
import { CHIRON_SCRIPTS, CHIRON_START, CHIRON_SEP } from '@/lib/omega/chiron';
const enc:any='o200k_base';

function inScript(cp:number):boolean{
  for(const s of CHIRON_SCRIPTS){
    if(s.ranges){ for(const [a,b] of s.ranges) if(cp>=a&&cp<b) return true; }
    else if(cp>=s.lo&&cp<s.hi) return true;
  }
  return false;
}

for (const p of (process.env.LANES||'').split(',').filter(Boolean)) {
  if(!fs.existsSync(p)) continue;
  const t = fs.readFileSync(p,'utf8');
  const r:any = oikonomiaEncode(t, enc);
  const wire:string = r.wire;
  const cut = wire.indexOf(CHIRON_SEP, CHIRON_START.length);
  if (cut<0){ console.log(p.split('/').pop(),'no tape'); continue; }
  const tape = wire.slice(CHIRON_START.length, cut);
  const body = wire.slice(cut+1);
  // distinct pool chars in tape
  const used = new Set<string>();
  for(const ch of tape){ const cp=ch.codePointAt(0)!; if(inScript(cp)) used.add(ch); }
  const usedArr=[...used];
  // pool candidates: scan a few scripts for chars NOT used and not in body
  const cands:string[]=[];
  for(const s of CHIRON_SCRIPTS.slice(0,6)){
    for(let cp=s.lo;cp<s.hi && cands.length<60;cp++){
      const ch=String.fromCodePoint(cp);
      if(used.has(ch)) continue;
      if(tape.includes(ch)||body.includes(ch)) continue;
      cands.push(ch);
    }
  }
  const base = countTokens(wire,enc);
  // per-glyph in-situ sensitivity: swap each used glyph for each of 8 candidates
  let bestTotal = base, moves=0, detail:string[]=[];
  for(const g of usedArr){
    let best=base, bestC='';
    for(const c of cands.slice(0,8)){
      const w2 = wire.split(g).join(c);
      const n = countTokens(w2,enc);
      if(n<best){best=n;bestC=c;}
    }
    if(bestC){ detail.push(`${g}->${bestC}:${base-best}`); moves+=base-best; bestTotal=best; }
  }
  console.log(p.split('/').pop()!.padEnd(26),'tok='+base,'glyphs='+usedArr.length,
    'cands='+cands.length,'inSituGain='+ -moves, detail.slice(0,8).join(' '));
}
