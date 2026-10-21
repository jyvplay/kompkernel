import fs from 'node:fs';
import { pyknosisEncode } from '@/lib/omega/pyknosis';
import { oikonomiaEncode } from '@/lib/omega/oikonomia';
import { pyknosisPlan } from '@/lib/omega/pyknosis';
import { countTokens } from '@/lib/omega/bpe';
const enc='o200k_base' as any;
const f=process.env.LANE!; const t=fs.readFileSync(f,'utf8');
const p=pyknosisPlan(t,enc);
console.log('plan',p?{runs:p.runs,chars:p.chars,est:p.estimated,marker:p.marker}:'NULL');
const r:any=pyknosisEncode(t,enc);
console.log('pyknosisEncode ->',{msg:r.messageTokens,fired:r.pyknosis,runs:r.hexRuns,chars:r.hexChars,est:r.estimatedSaving,clause:r.hexClause});
const b:any=oikonomiaEncode(t,enc);
console.log('oikonomiaEncode ->',b.messageTokens);
if(p){ const a:any=oikonomiaEncode(p.text,enc); console.log('direct alt ->',a.messageTokens,'+17 =',a.messageTokens+17); }
