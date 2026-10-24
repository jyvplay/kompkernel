import * as fs from 'node:fs';
import { typosPlan, typosTransform, typosDecode } from '@/lib/omega/typos';
import { ouraEncode } from '@/lib/omega/oura';
import { countTokens } from '@/lib/omega/bpe';
const ENC:any='o200k_base';
const f = process.env.F!; const n = Number(process.env.N || 30); const skip = Number(process.env.SKIP || 1);
const all = fs.readFileSync(f,'utf8').split('\n');
const text = all.slice(0, skip).concat(all.slice(skip, skip+n)).join('\n') + '\n';
const plan:any = typosPlan(text, ENC);
if (!plan) { console.log(f + ' no plan n=' + n); process.exit(0); }
const x = typosTransform(text, plan);
const t0=Date.now(); const a:any = ouraEncode(text, ENC); const t1=Date.now();
const b:any = ouraEncode(x, ENC); const t2=Date.now();
console.log(`${f.split('/').pop()} n=${n} raw=${countTokens(text,ENC)} xform=${countTokens(x,ENC)} frontier=${a.messageTokens}(${((t1-t0)/1000)|0}s) parentOfXform=${b.messageTokens}(${((t2-t1)/1000)|0}s) d=${b.messageTokens-a.messageTokens} decode=${typosDecode(x)===text?'EXACT':'BAD'} hdr=${plan.header.slice(0,60)}`);
