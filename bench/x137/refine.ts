import * as fs from 'node:fs';
import assert from 'node:assert/strict';
import {synarmogeFromFrontier} from '../../src/lib/omega/synarmoge';
import {chironDecode} from '../../src/lib/omega/chiron';
import {kremaOverflowUndo} from '../../src/lib/omega/krema';
import {encode} from 'gpt-tokenizer/encoding/o200k_base';
process.env.OMEGA_DET='1';process.env.OMEGA_NO_MEMO='1';process.env.OMEGA_ENGRAM='0';process.env.OMEGA_OURA_MEMO='0';process.env.OMEGA_NO_OROTHESIA='1';
for(const line of fs.readFileSync('bench/x137/receipts/fast-parent.jsonl','utf8').trim().split('\n')){
 const a=JSON.parse(line);if(!a.message)continue;
 const layer=chironDecode(a.message.slice(a.message.indexOf('§'))),t=performance.now();
 const r=synarmogeFromFrontier({message:a.message,messageTokens:a.B,decoded:layer},layer,'o200k_base');
 const message=r?.message??a.message,ms=performance.now()-t;
 assert.equal(kremaOverflowUndo(chironDecode(message.slice(message.indexOf('§'))),a.width,a.indent,a.escapes>0),fs.readFileSync(a.path,'utf8'));
 console.log(JSON.stringify({...a,A:a.B,B:encode(message).length,refineMs:ms,message}));
}
