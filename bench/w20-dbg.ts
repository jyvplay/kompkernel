import fs from 'node:fs';
import { countTokens } from '../src/lib/omega/bpe';
const T=(s:string)=>countTokens(s,'o200k_base');
/** cut at p  <=>  every line has space (or ends) at p-1, and some line has a non-space at p */
function cuts(lines:string[]){
  const W=Math.max(...lines.map(l=>l.length)); const out:number[]=[];
  for(let p=1;p<W;p++){
    let allGap=true, someStart=false;
    for(const l of lines){
      const a=p-1<l.length?l[p-1]:' ';
      if(a!==' '&&a!=='\t'){allGap=false;break;}
      const b=p<l.length?l[p]:' ';
      if(b!==' '&&b!=='\t') someStart=true;
    }
    if(allGap&&someStart) out.push(p);
  }
  return out;
}
const SENT='\u00ac';
function split(l:string,cs:number[]){const f:string[]=[];let prev=0;
  for(const c of cs){const q=Math.min(c,l.length); f.push(l.slice(prev,q)); prev=q;}
  f.push(l.slice(prev)); return f;}
for(const f of ['bench/holdout-tbl/kubectl-get-pods.txt','bench/holdout-tbl/df-h.txt','bench/holdout-tbl/psql-output.txt','bench/holdout-ops/ls-full-iso.txt','bench/holdout-ops/npm-ls.txt','bench/holdout-ops/find-listing.txt']){
  const t=fs.readFileSync(f,'utf8'); const hadTrail=t.endsWith('\n');
  const lines=(hadTrail?t.slice(0,-1):t).split('\n').filter(x=>x.length>0);
  const cs=cuts(lines);
  const rows=lines.map(l=>split(l,cs)); const C=rows[0].length;
  const okc=rows.every(r=>r.length===C) && rows.every(r=>r.join('')===lines[r===rows[0]?0:rows.indexOf(r)]);
  let tr=0, ok=false;
  if(cs.length>=1){
    const cols:string[]=[]; for(let c=0;c<C;c++) cols.push(rows.map(r=>r[c]).join(SENT));
    const out='◆\n'+cols.join('\n')+'\n◇'+(hadTrail?'\n':'');
    tr=T(out);
    const cc=cols.map(x=>x.split(SENT)); const h=cc[0].length;
    const rr:string[]=[]; for(let r=0;r<h;r++) rr.push(cc.map(x=>x[r]).join(''));
    ok = rr.join('\n')+(hadTrail?'\n':'') === (hadTrail? lines.join('\n')+'\n' : lines.join('\n'));
  }
  console.log(f.split('/').pop()!.padEnd(24),'lines',String(lines.length).padStart(4),'cuts',String(cs.length).padStart(3),
    'cols',String(C).padStart(3),'raw',String(T(t)).padStart(5),'transposed',String(tr).padStart(5),'invOK',ok);
}
