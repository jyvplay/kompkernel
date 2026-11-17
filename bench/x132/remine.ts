/**
 * X132 PROBE 3 — RE-MINING the COMPRESSED body.
 *
 * The frontier's miners choose spans from the SOURCE text. But the body that
 * finally ships is a different string: a mix of glyph characters and literals.
 * Repeated substrings in THAT string are the grammar's non-terminals — repeated
 * combinations of already-mined rules — and no source-level miner can see them.
 * This is Re-Pair / grammar compression applied to the compressed sequence.
 *
 * Every candidate is priced by MEASUREMENT against the whole real message, not
 * by an estimate (X131 showed estimates overstate gains badly).
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
process.env.OMEGA_DET='1'; process.env.OMEGA_NO_MEMO='1'; process.env.OMEGA_ENGRAM='0';
process.env.OMEGA_OURA_MEMO='0'; process.env.OMEGA_NO_OROTHESIA='1';
const enc:any='o200k_base';
type Rule={g:string;v:string};
const inPool=(cp:number)=>
  (cp>=0x0400&&cp<=0x04FF)||(cp>=0x0370&&cp<=0x03FF)||(cp>=0x0600&&cp<=0x06FF)||
  (cp>=0x0590&&cp<=0x05FF)||[0x2020,0x2021,0x2022,0x00B7,0x00B1,0x00D7,0x00F7,
    0x2260,0x221E,0x2248,0x2264,0x2265].includes(cp);
function glyphSetFor(srcText:string,msg:string):Set<string>{
  const src=new Set<string>(); for(let i=0;i<srcText.length;i++) src.add(srcText[i]!);
  const g=new Set<string>();
  for(let i=0;i<msg.length;i++){ const ch=msg[i]!;
    if(!src.has(ch)&&inPool(ch.codePointAt(0)!)) g.add(ch); }
  return g;
}
function parseTape(t:string,G:Set<string>):Rule[]{
  const rs:Rule[]=[]; const seen=new Set<string>(); let cur:Rule|null=null;
  for(const ch of t){ if(G.has(ch)&&!seen.has(ch)){seen.add(ch);cur={g:ch,v:''};rs.push(cur);} else if(cur) cur.v+=ch; }
  return rs;
}
const buildTape=(rs:Rule[])=>'\u00a7'+rs.map(r=>r.g+r.v).join('');
const wellFormed=(rs:Rule[])=>{
  const seen=new Set<string>();
  for(const r of rs){ for(const ch of r.v) if(seen.has(ch)===false&&rs.some(x=>x.g===ch)) return false; seen.add(r.g); }
  return true;
};
for(const p of (process.env.LANES??'').split(',').filter(Boolean)){
  const text=fs.readFileSync(p,'utf8');
  const a:any=tagstackEncode(text,enc); const M=a.message as string;
  const G=glyphSetFor(text,M);
  if(G.size===0){ console.log(`${p.split('/').pop()!.padEnd(20)} NO GLYPHS`); continue; }
  const i1=M.indexOf('\u00a7'); const i2=M.indexOf('\u00b6',i1);
  const pre=M.slice(0,i1);
  const tape=i2<0?M.slice(i1):M.slice(i1,i2); const body=i2<0?'':M.slice(i2);
  let rules:Rule[]=parseTape(tape,G); let curBody=body;
  const msgTok=()=>countTokens(pre+buildTape(rules)+curBody,enc);
  let curTok=msgTok();
  const usedG=new Set(rules.map(r=>r.g));
  // fresh glyphs from the same block as the existing alphabet
  const blocks=[0x0430,0x03B1,0x0633,0x05D0];
  const fresh:string[]=[];
  for(const b of blocks) for(let k=0;k<64;k++){ const c=String.fromCodePoint(b+k);
    if(!usedG.has(c)&&!text.includes(c)&&inPool(b+k)) fresh.push(c); }
  let added=0;
  for(let iter=0; iter<12 && added<fresh.length; iter++){
    // enumerate repeated substrings of the CURRENT body
    const counts=new Map<string,number>();
    const n=curBody.length;
    for(let L=(process.env.MINLEN?+process.env.MINLEN:3); L<=24; L++){
      for(let i=0;i+L<=n;i++){
        const s=curBody.slice(i,i+L);
        counts.set(s,(counts.get(s)??0)+1);
      }
    }
    // rank by (occurrences-1) * length   (rough bytes saved)
    const cands=[...counts.entries()].filter(([s,c])=>c>=(process.env.MINOCC?+process.env.MINOCC:2)&&s.length>=(process.env.MINLEN?+process.env.MINLEN:3));
    cands.sort((x,y)=>((y[1]-1)*y[0].length)-((x[1]-1)*x[0].length));
    let bestGain=0, bestCand:string|null=null, bestRules:Rule[]|null=null, bestBody='';
    for(const [s] of cands.slice(0,90)){
      const z=fresh[added]; if(!z) break;
      const trial:Rule[]=[...rules.map(r=>({g:r.g,v:r.v})),{g:z,v:s}];
      // replace non-overlapping occurrences
      let out='',i=0;
      while(i<curBody.length){ if(curBody.startsWith(s,i)){ out+=z; i+=s.length; } else { out+=curBody[i]; i++; } }
      if(!wellFormed(trial)) continue;
      const t=countTokens(pre+buildTape(trial)+out,enc);
      if(curTok-t>bestGain){ bestGain=curTok-t; bestCand=s; bestRules=trial; bestBody=out; }
    }
    if(!bestCand||bestGain<=0) break;
    rules=bestRules!; curBody=bestBody; curTok-=bestGain; added++;
  }
  console.log(`${p.split('/').pop()!.padEnd(20)} out=${String(a.messageTokens).padStart(4)} rules=${String(rules.length-added).padStart(3)} | RE-MINE gain = ${String(a.messageTokens-curTok).padStart(4)}  (added ${added} rules)`);
}
