import fs from 'node:fs';import assert from 'node:assert/strict';import {encode,decode} from 'gpt-tokenizer/encoding/o200k_base';import {pinakasPlans,pinakasRead} from '../../src/lib/omega/pinakas';import {tagstackEncode} from '../../src/lib/omega/tagstack';import {antikleisParentRead} from '../../src/lib/omega/antikleis-parent';
process.env.OMEGA_DET='1';process.env.OMEGA_NO_MEMO='1';process.env.OMEGA_ENGRAM='0';process.env.OMEGA_OURA_MEMO='0';process.env.OMEGA_NO_OROTHESIA='1';
for(const path of process.argv.slice(2)){
 const bytes=fs.readFileSync(path),source=bytes.toString(),base=JSON.parse(fs.readFileSync('bench/x177/receipts/control-'+path.split('/').pop()+'.json','utf8'));assert.equal(base.path,path);assert.ok(Buffer.from(antikleisParentRead(base.message)).equals(bytes));
 const candidates=[];
 // Fixed two-plan budget: best complete direct-price candidate for each separator.
 const plans=pinakasPlans(source);const modes=process.env.PINAKAS_MODE?[process.env.PINAKAS_MODE]:['space','LF'];assert.ok(modes.every(m=>['space','LF'].includes(m)));for(const mode of modes){const p=plans.find(p=>p.mode===mode)!;const start=performance.now(),u=process.cpuUsage();const parent=tagstackEncode(p.folded).message,message=p.contract+parent;let status='exact',error;
 try{assert.ok(Buffer.from(pinakasRead(message,antikleisParentRead)).equals(bytes));assert.equal(decode(encode(message)),message);}catch(e){status='unsupported or mismatch';error=String(e);}const cpu=process.cpuUsage(u);
 candidates.push({...p,parent,message,tokens:encode(message).length,status,error,ms:performance.now()-start,cpuMs:(cpu.user+cpu.system)/1000});
 fs.writeFileSync('bench/x178/receipts/trial-'+path.split('/').pop()+(process.env.PINAKAS_MODE?'-'+mode:'')+'.json',JSON.stringify({path,base,scope:'Best direct-price width per separator, two parent calls; not all widths',candidates,native:'NOT_RUN'},null,2));console.log(path,p.n,p.mode,base.tokens,candidates.at(-1)!.tokens,status);
 }
}
