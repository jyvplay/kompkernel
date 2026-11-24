import fs from 'node:fs';import assert from 'node:assert/strict';import {encode,decode} from 'gpt-tokenizer/encoding/o200k_base';import {symfrazPlans,symfrazRead,symfrazFromFrontier} from '../../src/lib/omega/symfraz';import {tagstackEncode} from '../../src/lib/omega/tagstack';import {antikleisParentRead} from '../../src/lib/omega/antikleis-parent';
process.env.OMEGA_DET='1';process.env.OMEGA_NO_MEMO='1';process.env.OMEGA_ENGRAM='0';process.env.OMEGA_OURA_MEMO='0';process.env.OMEGA_NO_OROTHESIA='1';
const old=fs.readFileSync('bench/x165/receipts/frontier.jsonl','utf8').trim().split('\n').map(l=>JSON.parse(l));
for(const path of process.argv.slice(2)){
 const source=fs.readFileSync(path),r=old.find(r=>r.path===path);assert.ok(r);assert.ok(Buffer.from(antikleisParentRead(r.message)).equals(source));const candidates:any[]=[];const start=performance.now(),u=process.cpuUsage();
 const result=symfrazFromFrontier(source.toString(),r.message,antikleisParentRead,folded=>{const p=tagstackEncode(folded);assert.equal(antikleisParentRead(p.message),folded);candidates.push({folded,parent:p.message,parentTokens:encode(p.message).length});return p.message;},antikleisParentRead);
 assert.ok(Buffer.from(result.applied?symfrazRead(result.message,antikleisParentRead):antikleisParentRead(result.message)).equals(source));assert.equal(decode(encode(result.message)),result.message);assert.equal(encode(result.message).length,result.tokens);
 const plans=symfrazPlans(source.toString());for(const c of candidates){const p=plans.find(p=>p.folded===c.folded)!;c.k=p.k;c.message=p.contract+c.parent;c.tokens=encode(c.message).length;assert.ok(Buffer.from(symfrazRead(c.message,antikleisParentRead)).equals(source));}
 const cpu=process.cpuUsage(u);const receipt={path,base:{message:r.message,tokens:r.tokens,scope:'X165 saved baseline; must match independent X166 canonical replay'},candidates,result,cpuMs:(cpu.user+cpu.system)/1000,ms:performance.now()-start,native:'NOT_RUN'};
 fs.writeFileSync('bench/x166/receipts/trial-'+path.split('/').pop()+'.json',JSON.stringify(receipt,null,2));console.log(path,r.tokens,result.tokens,candidates.map(c=>c.tokens));
}
