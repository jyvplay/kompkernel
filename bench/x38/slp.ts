import * as fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { anadiplosisEncode } from '@/lib/omega/anadiplosis';
import { chironParseTape, CHIRON_SCRIPTS } from '@/lib/omega/chiron';
const enc:any='o200k_base';

/** Greedily rewrite `s` replacing maximal occurrences of already-defined rules. */
function rewrite(s:string, defs:{g:string,t:string}[]):string{
  let out='';
  let i=0;
  while(i<s.length){
    let bestG='', bestLen=0;
    for(const d of defs){
      if(d.t.length>bestLen && s.startsWith(d.t,i)){ bestG=d.g; bestLen=d.t.length; }
    }
    if(bestLen>0){ out+=bestG; i+=bestLen; }
    else { out+=s[i]; i++; }
  }
  return out;
}

for(const p of (process.env.LANES||'').split(',').filter(Boolean)){
  if(!fs.existsSync(p))continue;
  const t=fs.readFileSync(p,'utf8');
  const r:any=anadiplosisEncode(t,enc);
  const cut=r.wire.indexOf('\u00b6',1);
  if(cut<0){console.log(p,'no tape');continue;}
  const tape=r.wire.slice(1,cut);
  let rules:any=null, script='';
  for(const s of CHIRON_SCRIPTS){ const rr=chironParseTape(tape,s); if(rr){rules=rr;script=s.name;break;} }
  if(!rules){console.log(p,'unparsed');continue;}
  const litTok=countTokens(tape,enc);
  // SLP: process in tape order, each entry may reference only EARLIER entries
  const defs:{g:string,t:string}[]=[];
  let slpTok=0;
  for(const ru of rules){
    const rw=rewrite(ru.raw,defs);
    slpTok+=countTokens(ru.glyph+rw,enc);
    defs.push({g:ru.glyph,t:ru.raw});
  }
  console.log(p.split('/').pop()!.padEnd(26),'script='+script.padEnd(9),
    'rules='+String(rules.length).padStart(4),
    'glossLit='+String(litTok).padStart(4),
    'glossSLP='+String(slpTok).padStart(4),
    'SLP_GAIN='+String(slpTok-litTok).padStart(5),
    'msg='+r.messageTokens);
}
