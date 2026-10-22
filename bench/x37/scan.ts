import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
const ENC='o200k_base' as any;
const T=(s:string)=>countTokens(s,ENC);

// ---- candidate transforms: each returns {name, out} or null. All must be exactly invertible.
type Xf=(t:string)=>{n:number;out:string}|null;

// 1. adjacent repeated spans (ANADIPLOSIS, baseline for comparison)
const O='\u27e6',C='\u27e7',M='\u21e4';
function spanRLE(t:string,minP=2,maxP=64){
  if(t.includes(O)||t.includes(C)||t.includes(M))return null;
  const n=t.length; const pick:Array<{s:number;p:number;k:number}>=[];
  const used=new Uint8Array(n); const cands:Array<{s:number;p:number;k:number;g:number}>=[];
  for(let i=0;i<n;i++){
    let bp=0,bk=0,bv=0;
    const lim=Math.min(maxP,(n-i)>>1);
    for(let p=minP;p<=lim;p++){ let k=1;
      while(i+(k+1)*p<=n){ let s=true;
        for(let q=0;q<p;q++) if(t[i+q]!==t[i+k*p+q]){s=false;break;}
        if(!s)break; k++; }
      if(k>=2){ const v=(k-1)*T(t.slice(i,i+p)); if(v>bv){bv=v;bp=p;bk=k;} } }
    if(bp) cands.push({s:i,p:bp,k:bk,g:bv});
  }
  cands.sort((a,b)=>b.g-a.g);
  for(const c of cands){ const e=c.s+c.p*c.k; if(e>n)continue;
    if(c.g<8)continue; let f=true; for(let q=c.s;q<e;q++) if(used[q]){f=false;break;}
    if(!f)continue; for(let q=c.s;q<e;q++)used[q]=1; pick.push(c); }
  if(!pick.length)return null;
  pick.sort((a,b)=>a.s-b.s);
  let out='';let i=0;
  for(const c of pick){ out+=t.slice(i,c.s)+O+c.k+M+t.slice(c.s,c.s+c.p)+C; i=c.s+c.p*c.k; }
  out+=t.slice(i);
  return {n:pick.length,out};
}
// 2. whitespace runs >=2 collapsed to a count
const WS='\u2983';
function wsRLE(t:string){
  if(t.includes(WS))return null;
  let n=0; const out=t.replace(/[ \t]{2,}/g,(m)=>{n++;return WS+m.length;});
  return n?{n,out}:null;
}
// 3. numeric range lists:  a,b,c,d consecutive integers -> a..d
function ranges(t:string){
  let n=0;
  const out=t.replace(/(?<![\d.])(\d{1,9})(,\s*)(\d{1,9})(,\s*)(\d{1,9})(,\s*)(\d{1,9})(?![\d.])/g,
    (m,a,s1,b,s2,c,s3,d)=>{
      const A=+a,B=+b,Cc=+c,D=+d;
      if(B===A+1&&Cc===A+2&&D===A+3&&s1===','&&s2===','&&s3===','){n++;return `${a}..${d}`;}
      return m; });
  return n?{n,out}:null;
}
// 4. repeated blank lines
const BL='\u2984';
function blankRuns(t:string){
  if(t.includes(BL))return null;
  let n=0; const out=t.replace(/\n{3,}/g,(m)=>{n++;return BL+m.length;});
  return n?{n,out}:null;
}
// 5. long single-char runs (e.g. ----- or ==== or 0000)
const CR='\u2985';
function charRuns(t:string){
  if(t.includes(CR))return null;
  let n=0; const out=t.replace(/(.)\1{7,}/g,(m,c)=>{n++;return CR+c+m.length;});
  return n?{n,out}:null;
}
// 6. escaped sequences: literal backslash sequences are 2 chars; count them
function escapes(t:string){ const m=t.match(/\\./g); return m&&m.length>20?{n:m.length,out:t}:null; }
// 7. trailing whitespace at EOL
function trailWS(t:string){ const m=t.match(/[ \t]+\n/g); return m&&m.length>10?{n:m.length,out:t}:null; }
// 8. CRLF -> LF
function crlf(t:string){ const m=t.match(/\r\n/g); return m&&m.length>10?{n:m.length,out:t.replace(/\r\n/g,'\n')}:null; }
// 9. repeated identical LINES (whole line run-length)
const LR='\u2986';
function lineRLE(t:string){
  if(t.includes(LR))return null;
  const lines=t.split('\n'); let n=0; const o:string[]=[];
  let i=0; while(i<lines.length){ let j=i; while(j+1<lines.length&&lines[j+1]===lines[i])j++;
    const k=j-i+1; if(k>=2&&lines[i].length>0){n++;o.push(LR+k+'\u204b'+lines[i]);} else for(let q=i;q<=j;q++)o.push(lines[q]);
    i=j+1; }
  return n?{n,out:o.join('\n')}:null;
}
// 10. leading-zero padded fixed-width numerics
function zeroPad(t:string){ const m=t.match(/(?<![\d.])0+\d/g); return m&&m.length>20?{n:m.length,out:t}:null; }
// 11. alternating pairs ABABAB (period 2 units) -- covered by spanRLE with p=|AB|
// 12. repeated separator runs (,, ;; ||)
function sepRuns(t:string){ const m=t.match(/(,){3,}|(;){3,}|(\|){3,}/g); return m&&m.length>5?{n:m.length,out:t}:null; }
// 13. constant line prefix (shared leading whitespace / indent)
function indent(t:string){ const m=t.match(/^[ \t]{2,}/gm); return m&&m.length>20?{n:m.length,out:t}:null; }

const XFS:Array<[string,Xf]>=[
  ['spanRLE',spanRLE],['wsRLE',wsRLE],['ranges',ranges],['blankRuns',blankRuns],
  ['charRuns',charRuns],['escapes',escapes],['trailWS',trailWS],['crlf',crlf],
  ['lineRLE',lineRLE],['zeroPad',zeroPad],['sepRuns',sepRuns],['indent',indent],
];
const lanes=(process.env.LANES||'').split(',').filter(Boolean);
const tot:Record<string,number>={};
console.log('lane'.padEnd(26),XFS.map(([n])=>n.slice(0,9).padStart(10)).join(''));
for(const f of lanes){
  if(!fs.existsSync(f))continue;
  const t=fs.readFileSync(f,'utf8'); const base=T(t);
  const row:string[]=[];
  for(const [name,xf] of XFS){
    let d='-';
    try{ const r=xf(t); if(r){ const s=T(r.out)-base; tot[name]=(tot[name]||0)+s; d=(s>=0?'+':'')+s+`(${r.n})`; } }
    catch(e){ d='ERR'; }
    row.push(d.padStart(10));
  }
  console.log(f.split('/').pop()!.padEnd(26).slice(0,26),row.join(''));
}
console.log('\nTOTAL raw-token delta across lanes (negative = saves):');
for(const [k,v] of Object.entries(tot).sort((a,b)=>a[1]-b[1])) console.log('  ',k.padEnd(12),v);
