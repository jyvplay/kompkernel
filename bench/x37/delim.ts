import * as fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { oikonomiaEncode } from '@/lib/omega/oikonomia';
const enc:any='o200k_base';
const CAND=['`','\\','{','}','$','%','*','+','=',';',':','<','>','[','~','^','|','@','#','&','?','!'];
const CTRL=['\u00a7','\u00b6','\u00d7','\u2026'];
for (const p of (process.env.LANES||'').split(',').filter(Boolean)) {
  if(!fs.existsSync(p)) continue;
  const t=fs.readFileSync(p,'utf8');
  const r:any=oikonomiaEncode(t,enc);
  const msg:string = r.contract + r.wire;             // the shipped one-chat message
  const base=countTokens(msg,enc);
  const per:string[]=[]; let total=0;
  let cur=msg;
  for(const c of CTRL){
    if(!cur.includes(c)) continue;
    let best=countTokens(cur,enc); let bc='';
    for(const d of CAND){
      if(cur.includes(d)) continue;
      const m2=cur.split(c).join(d);
      const n=countTokens(m2,enc);
      if(n<best){best=n;bc=d;}
    }
    const gain=countTokens(cur,enc)-best;
    if(gain>0){ per.push(`${JSON.stringify(c)}->${JSON.stringify(bc)}:${gain}`); cur=cur.split(c).join(bc); total+=gain; }
    else per.push(`${JSON.stringify(c)}:0`);
  }
  console.log(p.split('/').pop()!.padEnd(26),'msgTok='+base,'DELIM_GAIN='+(-total),per.join(' '));
}
