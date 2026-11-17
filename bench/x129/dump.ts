import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackFrontier } from '../../src/lib/omega/tagstack';
process.env.OMEGA_DET='1'; process.env.OMEGA_NO_MEMO='1'; process.env.OMEGA_ENGRAM='0'; process.env.OMEGA_OURA_MEMO='0'; process.env.OMEGA_NO_OROTHESIA='1';
const enc:any='o200k_base';
for(const p of (process.env.LANES??'').split(',').filter(Boolean)){
  const text=fs.readFileSync(p,'utf8');
  const a:any=tagstackFrontier(text,enc);
  const m=a.message as string;
  console.log('='.repeat(72));
  console.log(`${p}  raw=${countTokens(text,enc)} out=${a.messageTokens} parent=${a.parentCodec} exact=${a.decoded===text} chars=${m.length}`);
  console.log('--- FULL MESSAGE ---');
  console.log(JSON.stringify(m));
  for (const [nm,ch] of [['SECTION §','§'],['PIPE ‖','‖'],['PARA ¶','¶'],['TILDE ~','~']] as const){
    const idx=[...m].map((c,i)=>c===ch?i:-1).filter(i=>i>=0);
    console.log(`  ${nm}: count=${idx.length} at=${idx.slice(0,10).join(',')}`);
  }
  console.log(`  NEWLINE count=${[...m].filter(c=>c==='\n').length}`);
}
