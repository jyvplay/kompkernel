import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackFrontier, tagstackEncode, tagstackEncodeUncached, tagstackX74Chain } from '../../src/lib/omega/tagstack';
const enc:any='o200k_base';
const p=process.env.LANE!;
const text=fs.readFileSync(p,'utf8');
console.log(`${p}  raw=${countTokens(text,enc)}`);
for (const [nm,fn] of [['X74Chain',tagstackX74Chain],['EncodeUncached',tagstackEncodeUncached],['Encode',tagstackEncode],['Frontier',tagstackFrontier]] as const){
  const t=Date.now(); const r:any=(fn as any)(text,enc); const ms=Date.now()-t;
  console.log(`  ${nm.padEnd(15)} M=${String(r.messageTokens).padStart(5)} exact=${r.decoded===text}  ${ms}ms`);
}
