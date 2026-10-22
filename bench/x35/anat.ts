import fs from 'node:fs';
import { oikonomiaEncode } from '@/lib/omega/oikonomia';
import { countTokens } from '@/lib/omega/bpe';
import { CHIRON_START, CHIRON_SEP } from '@/lib/omega/chiron';
const enc='o200k_base' as any;
console.log('lane'.padEnd(30),'raw   wire  =contr + tape + rules  | tapeCh tapeCpt  ruleTok  ruleCh  nRules');
for(const f of (process.env.LANES||'').split(',').filter(Boolean)){
  if(!fs.existsSync(f))continue;
  const t=fs.readFileSync(f,'utf8');
  const r:any=oikonomiaEncode(t,enc);
  const w:String=r.wire;
  const raw=countTokens(t,enc);
  const contractTok=countTokens(r.contract||'',enc);
  let tape='',rules='';
  if(w.startsWith(CHIRON_START)){
    const cut=w.indexOf(CHIRON_SEP,CHIRON_START.length);
    if(cut>0){ tape=w.slice(CHIRON_START.length,cut); rules=w.slice(cut+1); }
  } else { tape=String(w); }
  const tapeTok=countTokens(tape,enc), ruleTok=countTokens(rules,enc);
  const nRules=rules?rules.split(CHIRON_START).length-1:0;
  const tapeCpt=tape.length/Math.max(1,tapeTok);
  console.log(f.split('/').slice(-2).join('/').padEnd(30),
    String(raw).padStart(5),String(r.messageTokens).padStart(5),
    ' =',String(contractTok).padStart(3),'+',String(tapeTok).padStart(5),'+',String(ruleTok).padStart(5),
    ' |',String(tape.length).padStart(6),tapeCpt.toFixed(2).padStart(6),
    String(ruleTok).padStart(7),String(rules.length).padStart(7),String(nRules).padStart(7));
}
