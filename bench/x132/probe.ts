/**
 * X132 PROBE. Two untested mechanisms on the frontier's tape.
 *
 * M1 MARGINAL CLEARING. A rule costs (1 glyph + t tokens) in the tape and saves
 *    (t-1) at each of its c uses; it pays iff c*(t-1) > (1+t). The frontier
 *    evaluates that when it MINES. Later arms transform the body and can change
 *    c, so a rule can be born profitable and end up net-negative. X131 only
 *    audited c<=1 (and found ~0). This audits EVERY c, measured against the real
 *    whole message, by tentatively inlining the rule back at its use sites.
 *
 * M2 RULE MERGING (Re-Pair on the body's glyph sequence). Two rules that always
 *    occur adjacently in the body can be fused into one, saving one body token
 *    per occurrence. The frontier mined spans from the SOURCE; this merges
 *    already-existing rules in the FINAL body sequence.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
process.env.OMEGA_DET='1'; process.env.OMEGA_NO_MEMO='1'; process.env.OMEGA_ENGRAM='0';
process.env.OMEGA_OURA_MEMO='0'; process.env.OMEGA_NO_OROTHESIA='1';
const enc:any='o200k_base';
const GLYPH_LO=0x0386, GLYPH_HI=0x04ff;
const isG=(c:string)=>{const x=c.codePointAt(0)!;return x>=GLYPH_LO&&x<=GLYPH_HI;};
type Rule={g:string;v:string};
function parseTape(t:string):Rule[]{
  const rs:Rule[]=[]; const seen=new Set<string>(); let cur:Rule|null=null;
  for(const ch of t){ if(isG(ch)&&!seen.has(ch)){seen.add(ch);cur={g:ch,v:''};rs.push(cur);} else if(cur) cur.v+=ch; }
  return rs;
}
const buildTape=(rs:Rule[])=>'\u00a7'+rs.map(r=>r.g+r.v).join('');
function expandRules(rs:Rule[]):Map<string,string>{
  const m=new Map<string,string>();
  for(const r of rs){ let o=''; for(const ch of r.v) o+=(isG(ch)&&m.has(ch))?m.get(ch)!:ch; m.set(r.g,o); }
  return m;
}
const wellFormed=(rs:Rule[])=>{
  const seen=new Set<string>();
  for(const r of rs){ for(const ch of r.v) if(isG(ch)&&!seen.has(ch)) return false; seen.add(r.g); }
  return true;
};
for(const p of (process.env.LANES??'').split(',').filter(Boolean)){
  const text=fs.readFileSync(p,'utf8');
  const a:any=tagstackEncode(text,enc); const M=a.message as string;
  const i1=M.indexOf('\u00a7'); if(i1<0){ console.log(`${p.split('/').pop()!.padEnd(20)} NO TAPE`); continue; }
  const i2=M.indexOf('\u00b6',i1);
  const tape=i2<0?M.slice(i1):M.slice(i1,i2); const body=i2<0?'':M.slice(i2);
  const pre=M.slice(0,i1);
  const rules=parseTape(tape);
  const full=expandRules(rules);
  const msgTok=(rs:Rule[],b:string)=>countTokens(pre+buildTape(rs)+b,enc);
  const base=msgTok(rules,body);

  // ---------- M1: marginal clearing, greedy, measured ----------
  let cur:Rule[]=rules.map(r=>({g:r.g,v:r.v}));
  let curBody=body, curTok=base;
  const removed:string[]=[];
  for(let pass=0;pass<4;pass++){
    let improved=false;
    for(const R of [...cur]){
      if(R.v.length===0) continue;
      const trial:Rule[]=cur.filter(r=>r.g!==R.g).map(r=>({g:r.g,v:r.v.split(R.g).join(R.v)}));
      const trialBody=curBody.split(R.g).join(R.v);
      if(!wellFormed(trial)) continue;
      const t=msgTok(trial,trialBody);
      if(t<curTok){ cur=trial; curBody=trialBody; curTok=t; removed.push(R.g); improved=true; }
    }
    if(!improved) break;
  }

  // ---------- M2: adjacent glyph-pair merging ----------
  // count adjacent glyph pairs in the body
  const pairs=new Map<string,number>();
  for(let i=0;i+1<curBody.length;i++){
    const x=curBody[i]!, y=curBody[i+1]!;
    if(isG(x)&&isG(y)){ const k=x+y; pairs.set(k,(pairs.get(k)??0)+1); }
  }
  const top=[...pairs.entries()].filter(([,c])=>c>=2).sort((a,b)=>b[1]-a[1]);
  let m2gain=0, m2pairs=0;
  {
    let c2:Rule[]=cur.map(r=>({g:r.g,v:r.v}));
    let c2Body=curBody, c2Tok=curTok;
    // allocate a fresh glyph not in use
    const used=new Set(cur.map(r=>r.g));
    let next=GLYPH_LO;
    while(used.has(String.fromCodePoint(next))&&next<GLYPH_HI) next++;
    for(const [pr,c] of top.slice(0,40)){
      if(next>=GLYPH_HI) break;
      const z=String.fromCodePoint(next);
      // value = concatenation of the two rules' raw values
      const A=c2.find(r=>r.g===pr[0]), B=c2.find(r=>r.g===pr[1]);
      if(!A||!B) continue;
      const trial:Rule[]=[...c2.map(r=>({g:r.g,v:r.v})),{g:z,v:A.v+B.v}];
      const trialBody=c2Body.split(pr).join(z);
      if(!wellFormed(trial)) continue;
      const t=msgTok(trial,trialBody);
      if(t<c2Tok){ c2=trial; c2Body=trialBody; c2Tok=t; next++; m2gain+=c2Tok-t+ (c2Tok-t); m2pairs++; }
    }
    m2gain=c2Tok<curTok?curTok-c2Tok:0;
  }

  console.log(`${p.split('/').pop()!.padEnd(20)} tape=${String(countTokens(tape,enc)).padStart(4)} body=${String(countTokens(body,enc)).padStart(4)} rules=${String(rules.length).padStart(3)} | M1 clear: -${String(base-curTok).padStart(3)} (${removed.length} rules) | M2 merge: pairs>=2: ${String(top.length).padStart(3)} best=${top.length?top[0]![1]:0} gain ${m2gain} (${m2pairs} merged)`);
}
