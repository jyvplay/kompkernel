/** Dictionary ceiling with EXACT per-candidate tokenizer measurement. */
import fs from 'node:fs'; import path from 'node:path';
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';
import { daedalusEncode } from '../src/lib/omega/daedalus';
const ENC: EncodingName='o200k_base';
const T=(s:string)=>countTokens(s,ENC);

function suffixArray(s: string): number[] {
  const n=s.length; const sa=Array.from({length:n},(_,i)=>i);
  let rank=new Int32Array(n); for(let i=0;i<n;i++) rank[i]=s.charCodeAt(i);
  const tmp=new Int32Array(n);
  for(let k=1;k<2*n;k<<=1){
    const cmp=(a:number,b:number)=>{ if(rank[a]!==rank[b])return rank[a]-rank[b];
      const ra=a+k<n?rank[a+k]:-1, rb=b+k<n?rank[b+k]:-1; return ra-rb; };
    sa.sort(cmp); tmp[sa[0]]=0;
    for(let i=1;i<n;i++) tmp[sa[i]]=tmp[sa[i-1]]+(cmp(sa[i-1],sa[i])<0?1:0);
    rank.set(tmp); if(rank[sa[n-1]]===n-1) break;
  }
  return sa;
}
function lcpArray(s:string, sa:number[]):number[]{
  const n=s.length, rank=new Int32Array(n), lcp=new Array(n).fill(0); let h=0;
  for(let i=0;i<n;i++) rank[sa[i]]=i;
  for(let i=0;i<n;i++){ if(rank[i]>0){ const j=sa[rank[i]-1];
    while(i+h<n&&j+h<n&&s[i+h]===s[j+h]) h++; lcp[rank[i]]=h; if(h>0)h--; } else h=0; }
  return lcp;
}
function repeats(s:string, maxLen=80, minLen=3, minCount=2){
  const n=s.length; if(n<8) return new Map<string,number>();
  const sa=suffixArray(s), lcp=lcpArray(s,sa);
  const out=new Map<string,number>(); const stack: Array<{len:number;cnt:number}>=[];
  for(let i=1;i<=n;i++){
    const h=i<n?Math.min(lcp[i],maxLen):0; let cnt=1;
    while(stack.length && stack[stack.length-1].len>h){ const top=stack.pop()!; cnt+=top.cnt;
      if(top.len>=minLen&&cnt>=minCount){ const sub=s.substr(sa[i-1],top.len);
        const p=out.get(sub)??0; if(cnt>p) out.set(sub,cnt); } }
    if(h>=minLen) stack.push({len:h,cnt});
  }
  return out;
}
function occ(h:string,x:string){let c=0,i=0;for(;;){const j=h.indexOf(x,i);if(j<0)break;c++;i=j+x.length;}return c;}

function optimiseExact(text:string, glyphs:string[], maxRules:number, topK:number){
  let body=text; const rules:Array<{g:string;s:string}>=[];
  let bodyTok=T(body);
  for(let r=0;r<maxRules;r++){
    const g=glyphs[r]; if(!g) break;
    const cands=[...repeats(body).entries()]
      .map(([s,c])=>({s,c,est:(c-1)*T(s)-1}))
      .filter(x=>x.est>0)
      .sort((a,b)=>b.est-a.est).slice(0,topK);
    let best:{s:string;net:number;nb:string;nbTok:number}|null=null;
    for(const c of cands){
      const nb=body.split(c.s).join(g);
      const nbTok=T(nb);
      const net=(bodyTok-nbTok) - T(g+c.s);
      if(net>0 && (!best||net>best.net)) best={s:c.s,net,nb,nbTok};
    }
    if(!best||best.net<1) break;
    body=best.nb; bodyTok=best.nbTok; rules.push({g,s:best.s});
  }
  const tape='§'+rules.map(r=>r.g+r.s).join('')+'¶';
  return { wire: tape+body, rules: rules.length, tapeTok:T(tape), bodyTok };
}
const GL=(()=>{const o:string[]=[];for(let cp=0x4e00;cp<0x9fff&&o.length<400;cp++){const c=String.fromCodePoint(cp);if(T(c)===1)o.push(c);}return o;})();

const files: Array<[string,string]> = [];
for (const d of ['bench/holdout-work'])
  for (const f of fs.readdirSync(d).sort()) files.push([f, fs.readFileSync(path.join(d,f),'utf8')]);
for (const f of ['lic-mit.txt','md-vite.txt','gh-prose.txt','readme.txt']) files.push(['ho/'+f, fs.readFileSync('bench/holdout/'+f,'utf8')]);

console.log('lane'.padEnd(26),'raw'.padStart(6),'DAEDmsg'.padStart(8),'EXACTwire'.padStart(10),'rules'.padStart(6),'wireGain%'.padStart(10),'ms'.padStart(7));
for (const [n,t] of files) {
  const raw=T(t);
  let d=raw; try{const r=daedalusEncode(t,ENC,{budgetMs:3000}); if(r.decoded===t) d=r.messageTokens;}catch{}
  const t0=Date.now();
  const o=optimiseExact(t, GL, 120, 140);
  const ms=Date.now()-t0; const ow=T(o.wire);
  console.log(n.padEnd(26),String(raw).padStart(6),String(d).padStart(8),String(ow).padStart(10),String(o.rules).padStart(6),(((raw-ow)/raw)*100).toFixed(1).padStart(10),String(ms).padStart(7));
}
