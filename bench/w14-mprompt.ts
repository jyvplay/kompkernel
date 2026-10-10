import fs from 'node:fs';
import { countTokens } from '../src/lib/omega/bpe';
import { metatronEncode } from '../src/lib/omega/metatron';
const T=(s:string)=>countTokens(s,'o200k_base');
for(const f of ['bench/holdout-work/llm-answer.md','bench/holdout/lic-mit.txt','bench/holdout/md-react.txt','bench/holdout/code-ts.txt']){
  const t=fs.readFileSync(f,'utf8');
  const m=metatronEncode(t,'o200k_base',{budgetMs:2500});
  const c=m.decoderPrompt.slice(m.wire.length);
  console.log('\n===',f,'winner=',m.winner,'msg=',m.messageTokens,'contract=',T(c));
  console.log(JSON.stringify(c));
}
