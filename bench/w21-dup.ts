/** Census: duplicate and constant COLUMNS (the only structure transposition has been shown to pay on). */
import fs from 'node:fs'; import path from 'node:path';
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';
const ENC:EncodingName='o200k_base'; const T=(s:string)=>countTokens(s,ENC);
const SEPS=[',','\t','|',';','  '];
function blocks(lines:string[],sep:string,min=4){const o:Array<[number,number,number]>=[];let i=0;
  while(i<lines.length){const c=lines[i].split(sep).length; if(c<2){i++;continue;}
    let j=i+1; while(j<lines.length&&lines[j].split(sep).length===c)j++;
    if(j-i>=min)o.push([i,j,c]); i=j>i?j:i+1;} return o;}
const files:Array<[string,string]>=[];
for(const d of ['bench/holdout','bench/holdout-ops','bench/holdout-mk','bench/holdout-work','bench/holdout-tbl','bench/holdout-tab'])
  if(fs.existsSync(d)) for(const f of fs.readdirSync(d).sort()){const t=fs.readFileSync(path.join(d,f),'utf8'); if(t.length>300&&t.length<40000) files.push([d.split('/').pop()!.replace('holdout-','')+'/'+f,t]);}
console.log('lane'.padEnd(26),'raw'.padStart(6),'sep'.padStart(5),'rows'.padStart(5),'cols'.padStart(5),'dupCols'.padStart(8),'constCols'.padStart(10),'dupTok'.padStart(7));
let totDup=0;
for(const [n,t] of files){
  const lines=t.replace(/\n$/,'').split('\n'); let shown=false;
  for(const sep of SEPS) for(const [a,b,C] of blocks(lines,sep)){
    const rows=lines.slice(a,b).map(l=>l.split(sep));
    const cols:string[]=[]; for(let c=0;c<C;c++) cols.push(rows.map(r=>r[c]).join('\u0001'));
    const seen=new Map<string,number>(); let dup=0,dupTok=0,konst=0;
    for(let c=0;c<C;c++){
      const u=new Set(rows.map(r=>r[c])); if(u.size===1) konst++;
      const p=seen.get(cols[c]); if(p!==undefined){dup++; dupTok+=T(rows.map(r=>r[c]).join(sep));} else seen.set(cols[c],c);
    }
    if(dup>0||konst>0){ totDup+=dupTok; shown=true;
      console.log(n.padEnd(26),String(T(t)).padStart(6),JSON.stringify(sep).padStart(5),String(b-a).padStart(5),String(C).padStart(5),String(dup).padStart(8),String(konst).padStart(10),String(dupTok).padStart(7)); }
  }
}
console.log(`\ntotal tokens sitting in DUPLICATE columns across the corpus: ${totDup}`);
