/**
 * X132 PROBE 4 — SPAN BOUNDARY RETUNING of existing rules.
 *
 * A rule's value is ONE chosen span covering c occurrences. Adjacent spans with
 * the SAME occurrence count are equally valid coverings but tokenize
 * differently:
 *   EXTEND: if every body occurrence of R is followed by the same char c, then
 *           v' = v+c also occurs c times. Tape +1, body -1 per occurrence.
 *   SHRINK: v' = v minus an edge char; the dropped chars become literals around
 *           the glyph in the body. Tape -1, body +1 per occurrence.
 * Both are exact. merismos caps MAX_LEN=24, so any rule already at the cap was
 * never eligible for extension by the miner — this probe can go past it.
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
  for(let i=0;i<msg.length;i++){ const ch=msg[i]!; if(!src.has(ch)&&inPool(ch.codePointAt(0)!)) g.add(ch); }
  return g;
}
function parseTape(t:string,G:Set<string>):Rule[]{
  const rs:Rule[]=[]; const seen=new Set<string>(); let cur:Rule|null=null;
  for(const ch of t){ if(G.has(ch)&&!seen.has(ch)){seen.add(ch);cur={g:ch,v:''};rs.push(cur);} else if(cur) cur.v+=ch; }
  return rs;
}
const buildTape=(rs:Rule[])=>'\u00a7'+rs.map(r=>r.g+r.v).join('');
function expandRules(rs:Rule[]):Map<string,string>{
  const m=new Map<string,string>();
  for(const r of rs){ let o=''; for(const ch of r.v) o+=(m.has(ch))?m.get(ch)!:ch; m.set(r.g,o); }
  return m;
}
const wellFormed=(rs:Rule[])=>{
  const seen=new Set<string>(); const names=new Set(rs.map(r=>r.g));
  for(const r of rs){ for(const ch of r.v) if(names.has(ch)&&!seen.has(ch)) return false; seen.add(r.g); }
  return true;
};
for(const p of (process.env.LANES??'').split(',').filter(Boolean)){
  const text=fs.readFileSync(p,'utf8');
  const a:any=tagstackEncode(text,enc); const M=a.message as string;
  const G=glyphSetFor(text,M);
  if(G.size===0){ console.log(`${p.split('/').pop()!.padEnd(20)} NO GLYPHS`); continue; }
  const i1=M.indexOf('\u00a7'); const i2=M.indexOf('\u00b6',i1);
  const pre=M.slice(0,i1);
  const tape=i2<0?M.slice(i1):M.slice(i1,i2); let body=i2<0?'':M.slice(i2);
  let rules:Rule[]=parseTape(tape,G);
  const msgTok=()=>countTokens(pre+buildTape(rules)+body,enc);
  let curTok=msgTok(); const start=curTok;
  let nExt=0,nShr=0;
  for(let pass=0;pass<3;pass++){
    let improved=false;
    for(const R of [...rules]){
      const idx:number[]=[]; for(let i=0;i<body.length;i++) if(body[i]===R.g) idx.push(i);
      if(idx.length===0) continue;
      // ---- EXTEND right/left by 1..3 ----
      for(const dir of [1,-1]){
        for(let k=1;k<=3;k++){
          let ok=true, ext='';
          for(let j=0;j<k;j++){
            const chs=new Set<string>();
            for(const i of idx){
              const at = dir>0 ? i+1+j : i-1-j;
              if(at<0||at>=body.length){ ok=false; break; }
              chs.add(body[at]!);
            }
            if(!ok||chs.size!==1) { ok=false; break; }
            ext += dir>0 ? [...chs][0]! : [...chs][0]!;
          }
          if(!ok) break;
          const newV = dir>0 ? R.v+ext : [...ext].reverse().join('')+R.v;
          const trial=rules.map(r=>r.g===R.g?{g:r.g,v:newV}:{g:r.g,v:r.v});
          if(!wellFormed(trial)) continue;
          // rewrite body: replace the glyph plus its neighbours by the same glyph
          let nb=body;
          if(dir>0){ // replace R followed by ext
            nb=body.split(R.g+ext).join(R.g);
          } else {
            nb=body.split(ext.split('').reverse().join('')+R.g).join(R.g);
          }
          const t=countTokens(pre+buildTape(trial)+nb,enc);
          if(t<curTok){ rules=trial; body=nb; curTok=t; nExt++; improved=true; }
        }
      }
      // ---- SHRINK: drop k chars from an edge, they become body literals ----
      for(const side of ['head','tail']){
        for(let k=1;k<=3&&k<R.v.length;k++){
          const dropped = side==='head' ? R.v.slice(0,k) : R.v.slice(-k);
          const newV   = side==='head' ? R.v.slice(k) : R.v.slice(0,-k);
          if(!newV.length) continue;
          const trial=rules.map(r=>r.g===R.g?{g:r.g,v:newV}:{g:r.g,v:r.v});
          if(!wellFormed(trial)) continue;
          const nb = side==='head' ? body.split(R.g).join(dropped+R.g)
                                   : body.split(R.g).join(R.g+dropped);
          const t=countTokens(pre+buildTape(trial)+nb,enc);
          if(t<curTok){ rules=trial; body=nb; curTok=t; nShr++; improved=true; }
        }
      }
    }
    if(!improved) break;
  }
  // exactness: fully expanded body must match
  const ex=(rs:Rule[],b:string)=>{ const m=expandRules(rs); let o=''; for(const ch of b) o+=m.has(ch)?m.get(ch)!:ch; return o; };
  const ok = ex(parseTape(tape,G), i2<0?'':M.slice(i2)) === ex(rules, body);
  console.log(`${p.split('/').pop()!.padEnd(20)} out=${String(start).padStart(4)} | BOUNDARY gain = ${String(start-curTok).padStart(4)}  (ext ${nExt}, shrink ${nShr})  exact=${ok}`);
}
