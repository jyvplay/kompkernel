/** Exhaustive-ish dictionary optimiser: suffix array -> all maximal repeats ->
 *  greedy with REAL tokenizer measurement at every step.  Upper bound on what
 *  the dictionary class can do, to separate "search failure" from "real floor". */
import fs from 'node:fs'; import path from 'node:path';
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';
import { daedalusEncode } from '../src/lib/omega/daedalus';
const ENC: EncodingName='o200k_base';
const memo=new Map<string,number>();
const T=(s:string)=>{const h=memo.get(s); if(h!==undefined)return h; const v=countTokens(s,ENC); memo.set(s,v); return v;};

function suffixArray(s: string): number[] {
  const n=s.length; let sa=Array.from({length:n},(_,i)=>i);
  let rank=new Int32Array(n); for(let i=0;i<n;i++) rank[i]=s.charCodeAt(i);
  let tmp=new Int32Array(n);
  for(let k=1;;k<<=1){
    const cmp=(a:number,b:number)=>{ if(rank[a]!==rank[b])return rank[a]-rank[b];
      const ra=a+k<n?rank[a+k]:-1, rb=b+k<n?rank[b+k]:-1; return ra-rb; };
    sa.sort(cmp);
    tmp[sa[0]]=0;
    for(let i=1;i<n;i++) tmp[sa[i]]=tmp[sa[i-1]]+(cmp(sa[i-1],sa[i])<0?1:0);
    rank.set(tmp);
    if(rank[sa[n-1]]===n-1) break;
    if(k>n) break;
  }
  return sa;
}
function lcpArray(s:string, sa:number[]):number[]{
  const n=s.length, rank=new Int32Array(n), lcp=new Array(n).fill(0);
  for(let i=0;i<n;i++) rank[sa[i]]=i;
  let h=0;
  for(let i=0;i<n;i++){
    if(rank[i]>0){ const j=sa[rank[i]-1];
      while(i+h<n&&j+h<n&&s[i+h]===s[j+h]) h++;
      lcp[rank[i]]=h; if(h>0)h--;
    } else h=0;
  }
  return lcp;
}
/** all repeated substrings (length 2..maxLen) with their occurrence counts, via LCP intervals */
function repeats(s:string, maxLen=120, minLen=2, minCount=2): Map<string,number> {
  const n=s.length; if(n<4) return new Map();
  const sa=suffixArray(s), lcp=lcpArray(s,sa);
  const out=new Map<string,number>();
  // for each position pair, the lcp gives a repeated prefix; count via a stack of (len,count)
  const stack: Array<{len:number;cnt:number}> = [];
  for(let i=1;i<=n;i++){
    const h=i<n?Math.min(lcp[i],maxLen):0;
    let cnt=1;
    while(stack.length && stack[stack.length-1].len>h){
      const top=stack.pop()!;
      cnt+=top.cnt;
      if(top.len>=minLen && cnt>=minCount){
        const sub=s.substr(sa[i-1],top.len);
        const prev=out.get(sub)??0; if(cnt>prev) out.set(sub,cnt);
      }
    }
    if(h>=minLen) stack.push({len:h,cnt});
  }
  return out;
}
function countOcc(hay:string, needle:string):number{
  let c=0,i=0; for(;;){ const j=hay.indexOf(needle,i); if(j<0)break; c++; i=j+needle.length; } return c;
}

/** greedy dictionary optimiser measured against the real tokenizer */
function optimise(text:string, glyphs:string[], opts:{maxRules:number; glyphCost:number}) {
  let body=text; const rules: Array<{g:string;s:string}> = [];
  for(let r=0;r<opts.maxRules;r++){
    const cands=repeats(body);
    let best:{s:string;gain:number;cnt:number}|null=null;
    for(const [sub,cnt0] of cands){
      if(sub.length<2) continue;
      const cnt=countOcc(body,sub); if(cnt<2) continue;
      const ts=T(sub);
      if(ts<2) continue;
      const gain=cnt*ts - ts - 1 - cnt*opts.glyphCost;   // uses - tape(glyph+text) - refs
      if(gain>0 && (!best||gain>best.gain)) best={s:sub,gain,cnt};
    }
    if(!best||best.gain<1) break;
    const g=glyphs[r]; if(!g) break;
    body=body.split(best.s).join(g);
    rules.push({g,s:best.s});
  }
  const tape='§'+rules.map(r=>r.g+r.s).join('')+'¶';
  return { wire: tape+body, rules: rules.length, tapeTok: T(tape), bodyTok: T(body) };
}

const GL = (()=>{ const out:string[]=[]; for(let cp=0x4e00; cp<0x9fff && out.length<400; cp++){ const c=String.fromCodePoint(cp); if(countTokens(c,ENC)===1) out.push(c);} return out; })();
console.log('glyph pool (CJK 1-token):', GL.length);

const files: Array<[string,string]> = [];
for (const d of ['bench/holdout-work','bench/holdout'])
  for (const f of fs.readdirSync(d).sort()) { const t=fs.readFileSync(path.join(d,f),'utf8'); if (t.length<40000) files.push([d.split('/').pop()+'/'+f, t]); }

console.log('lane'.padEnd(28),'raw'.padStart(6),'DAEDmsg'.padStart(8),'OPTwire'.padStart(8),'rules'.padStart(6),'wireGain'.padStart(9),'ms'.padStart(6));
for (const [n,t] of files) {
  const raw=T(t);
  let d=raw; try{const r=daedalusEncode(t,ENC,{budgetMs:3000}); if(r.decoded===t) d=r.messageTokens;}catch{}
  const t0=Date.now();
  const o=optimise(t, GL, { maxRules: 300, glyphCost: 0.7 });
  const ms=Date.now()-t0;
  const ow=T(o.wire);
  console.log(n.padEnd(28),String(raw).padStart(6),String(d).padStart(8),String(ow).padStart(8),String(o.rules).padStart(6),String(raw-ow).padStart(9),String(ms).padStart(6));
}
