/**
 * X132 PROBE 2 — same two mechanisms, but with the glyph alphabet derived
 * EMPIRICALLY (chars in the message but absent from the source), so Arabic,
 * Greek and Cyrillic pools are all handled. Structural markers are excluded.
 *
 * M1 MARGINAL CLEARING: a rule pays iff c*(t-1) > (1+t). That is decided when
 *    the rule is MINED; later arms can change c. Audit every rule by actually
 *    inlining it back and measuring the whole message.
 * M2 RULE MERGING: fuse two rules that always occur adjacently in the body.
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
  const src=new Set<string>();
  for(let i=0;i<srcText.length;i++) src.add(srcText[i]!);
  const g=new Set<string>();
  for(let i=0;i<msg.length;i++){ const ch=msg[i]!;
    if(!src.has(ch)&&inPool(ch.codePointAt(0)!)) g.add(ch); }
  return g;
}
function parseTape(t:string,G:Set<string>):Rule[]{
  const rs:Rule[]=[]; const seen=new Set<string>(); let cur:Rule|null=null;
  for(const ch of t){
    if(G.has(ch)&&!seen.has(ch)){ seen.add(ch); cur={g:ch,v:''}; rs.push(cur); }
    else if(cur) cur.v+=ch;
  }
  return rs;
}
const buildTape=(rs:Rule[])=>'\u00a7'+rs.map(r=>r.g+r.v).join('');
function expandRules(rs:Rule[]):Map<string,string>{
  const m=new Map<string,string>();
  for(const r of rs){ let o=''; for(const ch of r.v) o+=(m.has(ch))?m.get(ch)!:ch; m.set(r.g,o); }
  return m;
}
const wellFormed=(rs:Rule[])=>{
  const seen=new Set<string>();
  for(const r of rs){ for(const ch of r.v) if(seen.has(ch)===false&&rs.some(x=>x.g===ch)&&!seen.has(ch)) return false; seen.add(r.g); }
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
  const rules=parseTape(tape,G);
  const msgTok=(rs:Rule[],b:string)=>countTokens(pre+buildTape(rs)+b,enc);
  const base=msgTok(rules,body);
  let cur:Rule[]=rules.map(r=>({g:r.g,v:r.v})); let curBody=body, curTok=base;
  let removed=0;
  for(let pass=0;pass<4;pass++){
    let imp=false;
    for(const R of [...cur]){
      if(!R.v.length) continue;
      const trial:Rule[]=cur.filter(r=>r.g!==R.g).map(r=>({g:r.g,v:r.v.split(R.g).join(R.v)}));
      const tb=curBody.split(R.g).join(R.v);
      if(!wellFormed(trial)) continue;
      const t=msgTok(trial,tb);
      if(t<curTok){ cur=trial; curBody=tb; curTok=t; removed++; imp=true; }
    }
    if(!imp) break;
  }
  console.log(`${p.split('/').pop()!.padEnd(20)} out=${String(base).padStart(4)} glyphs=${String(G.size).padStart(3)} rules=${String(rules.length).padStart(3)} tape=${String(countTokens(tape,enc)).padStart(4)} | M1 clearing gain = ${String(base-curTok).padStart(4)}  (removed ${removed})`);
}
