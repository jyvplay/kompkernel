import fs from 'node:fs';import {tagstackEncode} from '../../src/lib/omega/tagstack';
process.env.OMEGA_DET='1';process.env.OMEGA_NO_MEMO='1';process.env.OMEGA_ENGRAM='0';process.env.OMEGA_OURA_MEMO='0';process.env.OMEGA_NO_OROTHESIA='1';
const path=process.argv[2]||'bench/holdout-work/kb-article.txt',source=fs.readFileSync(path,'utf8'),a=tagstackEncode(source);if(a.decoded!==source)throw Error('bad decoded');console.log(path,a.messageTokens,a.ms);
