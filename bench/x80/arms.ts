import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackFrontier } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';
for (const p of process.argv.slice(2)) {
  const S = fs.readFileSync(p, 'utf8');
  const L = S.split('\n');
  const geo = L.map((l) => { const a: number[] = []; const re = / {2,}/g; let m: RegExpExecArray|null;
    while ((m = re.exec(l)) !== null) a.push(m.index + m[0].length); return a; });
  const k = Math.max(...geo.map((a) => a.length));
  const full = geo.map((a,i)=>a.length===k?i:-1).filter(i=>i>=0);
  const P: number[] = [];
  for (let j=0;j<k;j++){ const c=new Map<number,number>(); for(const i of full)c.set(geo[i][j],(c.get(geo[i][j])??0)+1);
    let b=0,v=0; for(const [x,n] of c) if(n>v){b=x;v=n;} P.push(b); }
  const aligned = full.filter((i)=>geo[i].every((v,j)=>v===P[j]));
  let w: number[] = []; let prev=0; for(const x of P){w.push(x-prev);prev=x;}
  const collapsed = L.map((l)=>l.replace(/ {2,}/g,' ')).join('\n');
  for (const label of ['nocollapse','collapse-nocontract']) {}
  const base: any = tagstackFrontier(S, enc);
  const variants: [string,string][] = [
    ['collapse only (LOSSY)', collapsed],
    ['collapse + short contract (A)', '§PARATAXIS pad fields to '+w.join(' ')+'\n'+collapsed],
    ['collapse + range contract (A)', '§PARATAXIS lines 2-25 pad fields to '+w.join(' ')+'\n'+collapsed],
  ];
  console.log(`${p.split('/').pop()} F=${base.messageTokens} k=${k} aligned=${aligned.length}/${L.length} widths=${w.join(' ')}`);
  for (const [name, txt] of variants) {
    const r: any = tagstackFrontier(txt, enc);
    console.log(`   ${name.padEnd(32)} ${String(r.messageTokens).padStart(4)}  (${r.messageTokens-base.messageTokens>=0?'+':''}${r.messageTokens-base.messageTokens})  parent=${r.parentCodec}`);
  }
}
