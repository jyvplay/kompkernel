/** EXACT ADD-polish: offer the arm's wire the long repeats its span miner
 *  (maxSpan = 24 symbols) could never have proposed. */
import fs from 'node:fs'; import path from 'node:path';
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';
import { CHIRON_START, CHIRON_SEP, CHIRON_SCRIPTS, chironParseTape, chironInScript, chironDecode } from '../src/lib/omega/chiron';
import { syntomiaContract } from '../src/lib/omega/syntomia';
import { akribeiaEncode } from '../src/lib/omega/akribeia';
import { metatronEncode } from '../src/lib/omega/metatron';
const ENC:EncodingName='o200k_base'; const T=(s:string)=>countTokens(s,ENC);
function scriptOf(ch:string){const cp=ch.codePointAt(0)!;for(const s of CHIRON_SCRIPTS) if(chironInScript(s,cp)) return s;return null;}
function sa(s:string){const n=s.length;const a=Array.from({length:n},(_,i)=>i);let r=new Int32Array(n);
  for(let i=0;i<n;i++)r[i]=s.charCodeAt(i);const t=new Int32Array(n);
  for(let k=1;k<2*n;k<<=1){const c=(x:number,y:number)=>{if(r[x]!==r[y])return r[x]-r[y];
    const rx=x+k<n?r[x+k]:-1,ry=y+k<n?r[y+k]:-1;return rx-ry;};a.sort(c);t[a[0]]=0;
    for(let i=1;i<n;i++)t[a[i]]=t[a[i-1]]+(c(a[i-1],a[i])<0?1:0);r.set(t);if(r[a[n-1]]===n-1)break;}
  return a;}
function lcpA(s:string,a:number[]){const n=s.length,rk=new Int32Array(n),L=new Array<number>(n).fill(0);let h=0;
  for(let i=0;i<n;i++)rk[a[i]]=i;
  for(let i=0;i<n;i++){if(rk[i]>0){const j=a[rk[i]-1];while(i+h<n&&j+h<n&&s[i+h]===s[j+h])h++;L[rk[i]]=h;if(h>0)h--;}else h=0;}
  return L;}
function occ(h:string,s:string){let c=0,i=0;for(;;){const j=h.indexOf(s,i);if(j<0)break;c++;i=j+s.length;}return c;}
/** long repeats of `s`, ranked by crude value, de-nested */
function longCands(s:string,minLen:number,maxOut:number){
  const n=s.length; if(n<2*minLen) return [] as string[];
  const A=sa(s),L=lcpA(s,A); const set=new Set<string>();
  for(let i=1;i<n;i++) if(L[i]>=minLen) set.add(s.substr(A[i],Math.min(L[i],1200)));
  const arr=[...set].map(sub=>({sub,c:occ(s,sub)})).filter(x=>x.c>=2);
  arr.sort((a,b)=>(b.c-1)*T(b.sub)-(a.c-1)*T(a.sub));
  const out:string[]=[];
  for(const x of arr){ if(out.some(k=>k.includes(x.sub))) continue; out.push(x.sub); if(out.length>=maxOut) break; }
  return out;
}
function freshGlyphs(wire:string,scriptName:string,k:number){
  const sc=CHIRON_SCRIPTS.find(s=>s.name===scriptName)!; const used=new Set([...wire]); const out:string[]=[];
  const spans=sc.ranges ?? [[sc.lo,sc.hi] as [number,number]];
  for(const [a,b] of spans){ for(let cp=a;cp<b&&out.length<k;cp++){const ch=String.fromCodePoint(cp);
    if(!used.has(ch)&&T(ch)===1&&/^\p{L}$/u.test(ch)) out.push(ch);} if(out.length>=k) break; }
  return out;
}
function addPolish(wire:string,src:string,rounds=24){
  if(!wire.startsWith(CHIRON_START)) return null;
  const k0=wire.indexOf(CHIRON_SEP); if(k0<0) return null;
  let tape=wire.slice(1,k0), body=wire.slice(k0+1);
  const sc=tape.length?scriptOf(tape[0]):null; if(!sc) return null;
  const cost=(tp:string,bd:string)=>{const w=CHIRON_START+tp+CHIRON_SEP+bd;
    if(chironDecode(w)!==src) return {t:Infinity,w}; return {t:T(w)+T(syntomiaContract(w,src)),w};};
  let cur=cost(tape,body); if(!Number.isFinite(cur.t)) return null;
  const pool=freshGlyphs(wire,sc.name,rounds+8); let gi=0, added=0;
  for(let r=0;r<rounds;r++){
    const g=pool[gi]; if(!g) break;
    const cands=longCands(body,32,26);
    let best:{t:number;tp:string;bd:string}|null=null;
    for(const c of cands){
      if(c.includes(CHIRON_SEP)||c.includes(CHIRON_START)) continue;
      // a rule text containing an UNUSED in-script glyph would break tape parsing
      if([...c].some(ch=>{const s2=scriptOf(ch); return !!s2 && s2.name===sc.name && !tape.includes(ch);})) continue;
      const nb=body.split(c).join(g), nt=tape+g+c;
      const o=cost(nt,nb);
      if(o.t<cur.t&&(!best||o.t<best.t)) best={t:o.t,tp:nt,bd:nb};
    }
    if(!best) break;
    tape=best.tp; body=best.bd; cur={t:best.t,w:CHIRON_START+tape+CHIRON_SEP+body}; gi++; added++;
  }
  if(chironDecode(cur.w)!==src) return null;
  return {wire:cur.w,tokens:cur.t,added};
}
const files:Array<[string,string]>=[];
for(const d of ['bench/holdout','bench/holdout-work','bench/holdout-lang','bench/holdout-tbl','bench/holdout-mk','bench/holdout-ops','bench/holdout-tab'])
  if(fs.existsSync(d)) for(const f of fs.readdirSync(d).sort()){const t=fs.readFileSync(path.join(d,f),'utf8'); if(t.length>200&&t.length<40000) files.push([d.split('/').pop()!.replace('holdout-','')+'/'+f,t]);}
console.log('lane'.padEnd(26),'raw'.padStart(6),'MTR'.padStart(6),'AKR'.padStart(6),'+ADD'.padStart(6),'Δ'.padStart(5),'added'.padStart(6),'ms'.padStart(6));
let R=0,M=0,A=0,P=0;
for(const [n,t] of files){
  const raw=T(t); let m=raw, inc:any;
  try{const r=metatronEncode(t,ENC,{budgetMs:2500}); if(r.decoded===t){m=Math.min(raw,r.messageTokens);inc=r;}}catch{}
  const ak=akribeiaEncode(t,ENC,{maxArms:3,armBudgetMs:80,incumbent:inc});
  const akT=Math.min(raw,ak.messageTokens);
  let pol=akT, add=0, ms=0;
  if(ak.wire!==t&&ak.wire.startsWith(CHIRON_START)){
    const t0=Date.now(); const o=addPolish(ak.wire,t); ms=Date.now()-t0;
    if(o&&o.tokens<pol){pol=o.tokens;add=o.added;}
  }
  R+=raw;M+=m;A+=akT;P+=Math.min(akT,pol);
  console.log(n.padEnd(26),String(raw).padStart(6),String(m).padStart(6),String(akT).padStart(6),String(Math.min(pol,raw)).padStart(6),String(akT-Math.min(akT,pol)).padStart(5),String(add).padStart(6),String(ms).padStart(6));
}
console.log('TOTAL'.padEnd(26),String(R).padStart(6),String(M).padStart(6),String(A).padStart(6),String(P).padStart(6),String(A-P).padStart(5));
console.log(`ADD-polish gains ${A-P} tokens over AKRIBEIA (${((A-P)/A*100).toFixed(2)}%); vs METATRON ${M-P} (${((M-P)/M*100).toFixed(2)}%)`);
