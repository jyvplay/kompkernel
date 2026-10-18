import fs from 'node:fs';
import {countTokens} from '@/lib/omega/bpe';
const enc='o200k_base' as any; const T=(s:string)=>countTokens(s,enc);
const lanes=fs.readFileSync('bench/x21/lanes.txt','utf8').trim().split('\n');
const LAT=(c:string)=>/[A-Za-z]/.test(c);
const NONLAT=(c:string)=>/\p{L}/u.test(c)&&!LAT(c);
const NUM=(c:string)=>/\p{N}/u.test(c);
const PUN=(c:string)=>!/[\s]/.test(c)&&!/\p{L}/u.test(c)&&!/\p{N}/u.test(c);
type Cls='L'|'X'|'N'|'P';
const cls=(c:string):Cls|null=> LAT(c)?'L':NONLAT(c)?'X':NUM(c)?'N':PUN(c)?'P':null;
// build every ordered pair transform: insert a space at a->b transitions
const pairs:[Cls,Cls][]=[];
for(const a of ['L','X','N','P'] as Cls[]) for(const b of ['L','X','N','P'] as Cls[]) if(a!==b) pairs.push([a,b]);
const tot:Record<string,number>={}; const cnt:Record<string,number>={};
let base=0;
for(let i=0;i<lanes.length;i++){
  const wf=`bench/x24/wires/${(i+1).toString().padStart(2,'0')}.wire`;
  if(!fs.existsSync(wf)) continue;
  const w=fs.readFileSync(wf,'utf8'); const b=T(w); base+=b;
  const cs=[...w].map(cls);
  for(const [a,bb] of pairs){
    let out=''; let n=0;
    for(let k=0;k<w.length;k++){
      out+=w[k];
      if(cs[k]===a && cs[k+1]===bb){ out+=' '; n++; }
    }
    if(!n) continue;
    const d=b-T(out);   // POSITIVE = saves
    tot[a+'→'+bb]=(tot[a+'→'+bb]||0)+d; cnt[a+'→'+bb]=(cnt[a+'→'+bb]||0)+n;
  }
}
console.log('BASE wire total',base);
console.log('insert-space-at-transition  (positive net = SAVES tokens)');
for(const k of Object.keys(tot).sort((x,y)=>tot[y]-tot[x])){
  const v=tot[k]; if(v===0) continue;
  console.log('  ',k.padEnd(6),'sites',String(cnt[k]).padStart(6),'net',String(v).padStart(6),'per-site',(v/cnt[k]).toFixed(3));
}
