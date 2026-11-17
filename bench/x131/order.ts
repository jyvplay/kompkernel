/**
 * X131: TAPE ORDERING POTENTIAL. The tape is `§g1 v1 g2 v2 ...` — an
 * UNORDERED set of (glyph -> value) pairs serialized in some order. o200k is
 * context-sensitive across the concatenation boundary, so the token count of
 * the tape DEPENDS ON THE ORDER. No arm in the X-chain touches this axis.
 * Measure the spread over valid orderings (valid = every back-referenced glyph
 * is defined before it is used, which the frontier already assumes).
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
process.env.OMEGA_DET='1'; process.env.OMEGA_NO_MEMO='1'; process.env.OMEGA_ENGRAM='0';
process.env.OMEGA_OURA_MEMO='0'; process.env.OMEGA_NO_OROTHESIS='1';
const enc:any='o200k_base';
const GLYPH_LO=0x0386, GLYPH_HI=0x04ff;
const isG=(c:string)=>{const x=c.codePointAt(0)!;return x>=GLYPH_LO&&x<=GLYPH_HI;};
function parseTape(t:string){
  const rules:{g:string;v:string}[]=[]; const seen=new Set<string>(); let cur:any=null;
  for(const ch of t){ if(isG(ch)&&!seen.has(ch)){seen.add(ch);cur={g:ch,v:''};rules.push(cur);} else if(cur) cur.v+=ch; }
  return rules;
}
const build=(rs:any[])=>'\u00a7'+rs.map(r=>r.g+r.v).join('');
for(const p of (process.env.LANES??'').split(',').filter(Boolean)){
  const text=fs.readFileSync(p,'utf8');
  const a:any=tagstackEncode(text,enc); const M=a.message as string;
  const i1=M.indexOf('\u00a7'); if(i1<0){console.log(`${p.split('/').pop()!.padEnd(20)} NO TAPE`);continue;}
  const i2=M.indexOf('\u00b6',i1); const tape=i2<0?M.slice(i1):M.slice(i1,i2);
  const rules=parseTape(tape);
  const byG=new Map(rules.map(r=>[r.g,r]));
  // deps: glyphs referenced inside a value must be defined first
  const deps=(g:string)=>{const r:any=byG.get(g);const d:string[]=[];for(const c of r.v) if(isG(c)&&byG.has(c)&&c!==g) d.push(c);return d;};
  const valid=(order:any[])=>{const seen=new Set<string>();
    for(const r of order){ for(const d of deps(r.g)) if(!seen.has(d)) return false; seen.add(r.g);} return true;};
  const base=countTokens(tape,enc);
  // random valid orderings (topological shuffle)
  let best=base, worst=base, nvalid=0;
  for(let it=0;it<400;it++){
    const pool=[...rules]; const order:any[]=[]; const placed=new Set<string>();
    let guard=0;
    while(pool.length&&guard++<5000){
      const ready=pool.filter(r=>deps(r.g).every(d=>placed.has(d)));
      if(!ready.length) break;
      const pick=ready[(Math.random()*ready.length)|0];
      pool.splice(pool.indexOf(pick),1); order.push(pick); placed.add(pick.g);
    }
    if(!valid(order)) continue;
    nvalid++;
    const t=countTokens(build(order),enc);
    if(t<best)best=t; if(t>worst)worst=t;
  }
  console.log(`${p.split('/').pop()!.padEnd(20)} tape=${String(base).padStart(4)} rules=${String(rules.length).padStart(3)} validSamples=${String(nvalid).padStart(3)}  best=${String(best).padStart(4)} worst=${String(worst).padStart(4)}  ORDER POTENTIAL=${base-best} (spread ${worst-best})`);
}
