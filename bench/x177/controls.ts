import fs from 'node:fs';
import assert from 'node:assert/strict';
import {encode,decode} from 'gpt-tokenizer/encoding/o200k_base';
import {tagstackEncode} from '../../src/lib/omega/tagstack';
import {antikleisParentRead} from '../../src/lib/omega/antikleis-parent';
process.env.OMEGA_DET='1';process.env.OMEGA_NO_MEMO='1';process.env.OMEGA_ENGRAM='0';process.env.OMEGA_OURA_MEMO='0';process.env.OMEGA_NO_OROTHESIA='1';
for(const path of process.argv.slice(2)){
 const bytes=fs.readFileSync(path),start=performance.now(),u=process.cpuUsage();
 const message=tagstackEncode(bytes.toString('utf8')).message;
 assert.ok(Buffer.from(antikleisParentRead(message)).equals(bytes));
 assert.equal(decode(encode(message)),message);
 const cpu=process.cpuUsage(u);
 const receipt={path,message,tokens:encode(message).length,status:'exact',ms:performance.now()-start,cpuMs:(cpu.user+cpu.system)/1000};
 fs.writeFileSync('bench/x177/receipts/control-'+path.split('/').pop()+'.json',JSON.stringify(receipt,null,2));
 console.log(path,receipt.tokens,'fresh control exact');
}
