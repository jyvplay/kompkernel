/**
 * X132 PROBE 5 — span boundary retuning, CORRECTED and verified with the real
 * decoder (tagstackDecode) rather than my own expansion.
 *
 * Two bugs in probe 4, both found by the exactness check:
 *  (a) an EXTENSION is only valid if EVERY occurrence of the rule — in the body
 *      AND inside other rules' values — is followed by the same chars; otherwise
 *      the untouched occurrences silently gain the extension;
 *  (b) a SHRINK must re-insert the dropped chars at every occurrence, not just
 *      in the body.
 * Every candidate is now accepted only if tagstackDecode(newMessage) === source
 * AND the real token count falls.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackEncode, tagstackDecode } from '../../src/lib/omega/tagstack';
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
  for(let i=0;i<msg.length;i++){ const ch=msg[i]!; if(!src.has(ch)&&inPool(ch.codePointAt(0)!)) g.add(ch); }
  return g;
}
function parseTape(t:string,G:Set<string>):Rule[]{
  const rs:Rule[]=[]; const seen=new Set<string>(); let cur:Rule|null=null;
  for(const ch of t){ if(G.has(ch)&&!seen.has(ch)){seen.add(ch);cur={g:ch,v:''};rs.push(cur);} else if(cur) cur.v+=ch; }
  return rs;
}
const buildTape=(rs:Rule[])=>'\u00a7'+rs.map(r=>r.g+r.v).join('');
const wellFormed=(rs:Rule[])=>{
  const seen=new Set<string>(); const names=new Set(rs.map(r=>r.g));
  for(const r of rs){ for(const ch of r.v) if(names.has(ch)&&!seen.has(ch)) return false; seen.add(r.g); }
  return true;
};
for(const p of (process.env.LANES??'').split(',').filter(Boolean)){
  const text=fs.readFileSync(p,'utf8');
  const a:any=tagstackEncode(text,enc); const M=a.message as string;
  const decOk = tagstackDecode(M)===text;                  // sanity: decoder round-trips
  const G=glyphSetFor(text,M);
  if(G.size===0){ console.log(`${p.split('/').pop()!.padEnd(20)} decoderRT=${decOk} NO GLYPHS`); continue; }
  const i1=M.indexOf('\u00a7'); const i2=M.indexOf('\u00b6',i1);
  const pre=M.slice(0,i1);
  const tape=i2<0?M.slice(i1):M.slice(i1,i2); let body=i2<0?'':M.slice(i2);
  let rules:Rule[]=parseTape(tape,G);
  const buildMsg=()=>pre+buildTape(rules)+body;
  const exact=(m:string)=>{ try{ return tagstackDecode(m)===text; }catch{ return false; } };
  let curTok=countTokens(buildMsg(),enc); const start=curTok;
  let nExt=0,nShr=0;
  for(let pass=0;pass<3;pass++){
    let improved=false;
    for(const R of [...rules]){
      if(!R.v.length) continue;
      // every occurrence of R, anywhere (body + other rules' values)
      const others=rules.filter(r=>r.g!==R.g);
      const occInOthers=others.reduce((n,r)=>n+[...r.v].filter(c=>c===R.g).length,0);
      const occInBody=[...body].filter(c=>c===R.g).length;
      if(occInBody===0) continue;
      // ---- EXTEND right by k: valid only if every occurrence is followed by the same k chars
      for(let k=1;k<=3;k++){
        const after=new Set<string>();
        let ok=true;
        for(let i=0;i+k<body.length;i++) if(body[i]===R.g){
          if(i+1+k>body.length){ ok=false; break; }
          after.add(body.slice(i+1,i+1+k));
        }
        for(const r of others){ for(let i=0;i<r.v.length;i++) if(r.v[i]===R.g){
          if(i+1+k>r.v.length){ ok=false; break; } after.add(r.v.slice(i+1,i+1+k)); } }
        if(!ok||after.size!==1) break;
        const ext=[...after][0]!;
        const trial=rules.map(r=>r.g===R.g?{g:r.g,v:R.v+ext}:{g:r.g,v:r.v});
        if(!wellFormed(trial)) continue;
        const nb=body.split(R.g+ext).join(R.g);
        const nt=others.length? trial.map(r=>r.g===R.g?r:{g:r.g,v:r.v.split(R.g+ext).join(R.g)}) : trial;
        const msg=pre+buildTape(nt)+nb;
        const t=countTokens(msg,enc);
        if(t<curTok && exact(msg)){ rules=nt; body=nb; curTok=t; nExt++; improved=true; }
      }
      // ---- SHRINK: dropped chars re-inserted at EVERY occurrence
      for(const side of ['head','tail'] as const){
        for(let k=1;k<=3&&k<R.v.length;k++){
          const dropped = side==='head'? R.v.slice(0,k) : R.v.slice(-k);
          const newV    = side==='head'? R.v.slice(k)   : R.v.slice(0,-k);
          if(!newV.length) continue;
          const sub=(s:string)=> side==='head'? s.split(R.g).join(dropped+R.g) : s.split(R.g).join(R.g+dropped);
          const nt=rules.map(r=>r.g===R.g?{g:r.g,v:newV}:{g:r.g,v:sub(r.v)});
          if(!wellFormed(nt)) continue;
          const nb=sub(body);
          const msg=pre+buildTape(nt)+nb;
          const t=countTokens(msg,enc);
          if(t<curTok && exact(msg)){ rules=nt; body=nb; curTok=t; nShr++; improved=true; }
        }
      }
    }
    if(!improved) break;
  }
  console.log(`${p.split('/').pop()!.padEnd(20)} out=${String(start).padStart(4)} decoderRT=${decOk} | BOUNDARY gain = ${String(start-curTok).padStart(4)} (ext ${nExt}, shrink ${nShr}) finalExact=${exact(buildMsg())}`);
}
