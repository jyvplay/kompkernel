import * as fs from 'node:fs';
import assert from 'node:assert/strict';
import {tagstackEncode} from '../../src/lib/omega/tagstack';
process.env.OMEGA_DET='1';process.env.OMEGA_NO_MEMO='1';process.env.OMEGA_ENGRAM='0';process.env.OMEGA_OURA_MEMO='0';process.env.OMEGA_NO_OROTHESIA='1';
const path=process.argv[2]??'bench/holdout-work/kb-article.txt';
const text=fs.readFileSync(path,'utf8'),t=performance.now(),r=tagstackEncode(text);
assert.equal(r.decoded,text);console.log(JSON.stringify({path,ms:performance.now()-t,message:r.message,tokens:r.messageTokens}));
