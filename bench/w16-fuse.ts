/** Pool the RULE SETS of several arms, then re-select greedily with exact
 *  windowed token deltas. Portfolio FUSION vs portfolio SELECTION. */
import fs from 'node:fs'; import path from 'node:path';
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';
import { CHIRON_START, CHIRON_SEP, CHIRON_SCRIPTS, chironParseTape, chironInScript, chironDecode } from '../src/lib/omega/chiron';
import { syntomiaContract } from '../src/lib/omega/syntomia';
import { ariadneEncode } from '../src/lib/omega/ariadne';
import { sibylEncode } from '../src/lib/omega/sibyl';
import { epistemeEncode } from '../src/lib/omega/episteme';
import { metatronEncode } from '../src/lib/omega/metatron';
const ENC:EncodingName='o200k_base'; const T=(s:string)=>countTokens(s,ENC);
function scriptOf(ch:string){const cp=ch.codePointAt(0)!;for(const s of CHIRON_SCRIPTS) if(chironInScript(s,cp)) return s;return null;}

/** expand a CHIRON tape into literal rule texts */
function ruleTexts(wire:string): string[] {
  if(!wire.startsWith(CHIRON_START)) return [];
  const k=wire.indexOf(CHIRON_SEP); if(k<0) return [];
  const tape=wire.slice(1,k); if(!tape.length) return [];
  const sc=scriptOf(tape[0]); if(!sc) return [];
  const rs=chironParseTape(tape,sc); if(!rs) return [];
  const map=new Map(rs.map(r=>[r.glyph,r.raw]));
  const expand=(s:string,d=0):string=>{ if(d>8) return s; let o='';
    for(const ch of s){ const v=map.get(ch); o += v!==undefined? expand(v,d+1) : ch; } return o; };
  const out:string[]=[];
  for(const r of rs){ const lit=expand(r.raw); if(lit.length>=2 && !/[×…]/.test(lit) && ![...lit].some(c=>!!scriptOf(c))) out.push(lit); }
  return out;
}

const ARMS:Array<[string,(t:string)=>any]>=[
  ['ar',     t=>ariadneEncode(t,ENC,{budgetMs:80})],
  ['sb',     t=>sibylEncode(t,ENC,{budgetMs:80})],
  ['sb-w1',  t=>sibylEncode(t,ENC,{budgetMs:80,wordGrid:[1]} as any)],
  ['sb-w3',  t=>sibylEncode(t,ENC,{budgetMs:80,wordGrid:[3]} as any)],
  ['sb-w6',  t=>sibylEncode(t,ENC,{budgetMs:80,wordGrid:[6]} as any)],
  ['sb-w12', t=>sibylEncode(t,ENC,{budgetMs:80,wordGrid:[12]} as any)],
  ['ep',     t=>epistemeEncode(t,ENC,{budgetMs:80} as any)],
];
function pool(enc:EncodingName, text:string, scriptName:string){
  const sc=CHIRON_SCRIPTS.find(s=>s.name===scriptName)!;
  const out:string[]=[]; const spans=sc.ranges ?? [[sc.lo,sc.hi] as [number,number]];
  for(const [a,b] of spans) for(let cp=a;cp<b;cp++){const ch=String.fromCodePoint(cp); if(!text.includes(ch)&&T(ch)===1&&/^\p{L}$/u.test(ch)) out.push(ch);}
  return out;
}
function occ(h:string,s:string){let c=0,i=0;for(;;){const j=h.indexOf(s,i);if(j<0)break;c++;i=j+s.length;}return c;}

/** greedy selection over a pooled candidate set, exact measurement */
function fuse(text:string, cands:string[], scriptName:string, maxRules=200){
  const gl=pool(ENC,text,scriptName); if(!gl.length) return null;
  if(text.includes(CHIRON_START)||text.includes(CHIRON_SEP)) return null;
  let body=text, bodyTok=T(body);
  const rules:Array<{g:string;s:string}>=[];
  const live=new Set(cands.filter(c=>c.length>=2));
  for(let r=0;r<maxRules;r++){
    const g=gl[r]; if(!g) break;
    let best:{s:string;net:number;nb:string;nbTok:number}|null=null;
    for(const s of live){
      const c=occ(body,s); if(c<2){ if(c<=1) live.delete(s); continue; }
      const nb=body.split(s).join(g); const nbTok=T(nb);
      const net=(bodyTok-nbTok)-T(g+s);
      if(net>0&&(!best||net>best.net)) best={s,net,nb,nbTok};
    }
    if(!best||best.net<1) break;
    live.delete(best.s); body=best.nb; bodyTok=best.nbTok; rules.push({g,s:best.s});
  }
  if(!rules.length) return null;
  const wire=CHIRON_START+rules.map(x=>x.g+x.s).join('')+CHIRON_SEP+body;
  return { wire, rules: rules.length };
}

const files:Array<[string,string]>=[];
for(const d of ['bench/holdout-lang','bench/holdout-work','bench/holdout','bench/holdout-tbl'])
  if(fs.existsSync(d)) for(const f of fs.readdirSync(d).sort()){const t=fs.readFileSync(path.join(d,f),'utf8'); if(t.length<20000) files.push([d.split('/').pop()!.replace('holdout-','')+'/'+f,t]);}
console.log('lane'.padEnd(26),'raw'.padStart(6),'MTR'.padStart(6),'bestArm'.padStart(8),'FUSED'.padStart(6),'Δvs arm'.padStart(8),'cands'.padStart(6),'rules'.padStart(6));
let R=0,M=0,A=0,F=0;
for(const [n,t] of files){
  const raw=T(t);
  let m=raw; try{const r=metatronEncode(t,ENC,{budgetMs:2000}); if(r.decoded===t) m=Math.min(raw,r.messageTokens);}catch{}
  let bestArm=raw; const cand=new Set<string>();
  for(const [nm,fn] of ARMS){
    try{ const r=fn(t); if(r&&r.decoded===t){
      if(typeof r.messageTokens==='number') bestArm=Math.min(bestArm,r.messageTokens);
      if(typeof r.wire==='string'&&r.wire.startsWith(CHIRON_START)&&chironDecode(r.wire)===t){
        bestArm=Math.min(bestArm, T(r.wire)+T(syntomiaContract(r.wire,t)));
        for(const s of ruleTexts(r.wire)) cand.add(s);
      }
    }}catch{}
  }
  let fused=raw;
  for(const sn of ['cyrillic','polyglot']){
    try{ const o=fuse(t,[...cand],sn); if(o&&chironDecode(o.wire)===t){ const c=syntomiaContract(o.wire,t); fused=Math.min(fused,T(o.wire)+T(c)); } }catch{}
  }
  R+=raw;M+=m;A+=Math.min(m,bestArm);F+=Math.min(m,bestArm,fused);
  console.log(n.padEnd(26),String(raw).padStart(6),String(m).padStart(6),String(bestArm).padStart(8),String(fused).padStart(6),String(bestArm-Math.min(bestArm,fused)).padStart(8),String(cand.size).padStart(6),'');
}
console.log('TOTAL'.padEnd(26),String(R).padStart(6),String(M).padStart(6),String(A).padStart(8),String(F).padStart(6),String(A-F).padStart(8));
console.log(`fusion beats best-single-arm by ${A-F} tokens (${((A-F)/A*100).toFixed(2)}%); vs METATRON ${M-F} (${((M-F)/M*100).toFixed(2)}%)`);
