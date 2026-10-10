import fs from 'node:fs'; import path from 'node:path';
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';
const ENC:EncodingName='o200k_base'; const T=(s:string)=>countTokens(s,ENC);
function stride(l:string[],a:number,b:number,P:number){const R=(b-a)/P;if(!Number.isInteger(R)||R<2)return null;
  const o:string[]=[];for(let p=0;p<P;p++)for(let r=0;r<R;r++)o.push(l[a+r*P+p]);return o;}
function unstride(g:string[],P:number){const R=g.length/P;if(!Number.isInteger(R))return null;
  const o:string[]=[];for(let r=0;r<R;r++)for(let p=0;p<P;p++)o.push(g[p*R+r]);return o;}
const files:Array<[string,string]>=[];
for(const d of ['bench/holdout','bench/holdout-ops','bench/holdout-mk','bench/holdout-work','bench/holdout-tbl','bench/holdout-tab'])
  if(fs.existsSync(d)) for(const f of fs.readdirSync(d).sort()){const t=fs.readFileSync(path.join(d,f),'utf8'); if(t.length>400&&t.length<40000) files.push([d.split('/').pop()!.replace('holdout-','')+'/'+f,t]);}
console.log('lane'.padEnd(26),'raw'.padStart(6),'bestP'.padStart(6),'rawStrided'.padStart(11),'rawΔ'.padStart(6));
for(const [n,t] of files){
  const raw=T(t); const hadTrail=t.endsWith('\n'); const lines=(hadTrail?t.slice(0,-1):t).split('\n');
  let bp=0,bv=raw,bo='';
  for(let P=2;P<=48;P++){
    if(lines.length<3*P) break;
    for(const a of [0,1,2,3,4,5]){
      const span=Math.floor((lines.length-a)/P)*P; if(span<3*P) continue;
      const g=stride(lines,a,a+span,P); if(!g) continue;
      const u=unstride(g,P); if(!u||u.join('\n')!==lines.slice(a,a+span).join('\n')) continue;
      const out=[...lines.slice(0,a),'◈'+P,...g,'◇',...lines.slice(a+span)].join('\n')+(hadTrail?'\n':'');
      const v=T(out); if(v<bv){bv=v;bp=P;bo=out;}
    }
  }
  if(bp) console.log(n.padEnd(26),String(raw).padStart(6),String(bp).padStart(6),String(bv).padStart(11),String(raw-bv).padStart(6));
}
