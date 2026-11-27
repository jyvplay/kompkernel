import fs from 'node:fs';import assert from 'node:assert/strict';import {encode} from 'gpt-tokenizer/encoding/o200k_base';
import {tagstackEncode} from '../../src/lib/omega/tagstack';import {grammikosParentRead} from '../../src/lib/omega/grammikos-parent';import {diexodosUndo,DIEXODOS_KEY} from '../../src/lib/omega/diexodos';
Object.assign(process.env,{OMEGA_DET:'1',OMEGA_NO_MEMO:'1',OMEGA_ENGRAM:'0',OMEGA_OURA_MEMO:'0',OMEGA_NO_OROTHESIA:'1'});
const job=JSON.parse(fs.readFileSync(process.argv[2],'utf8')),t=performance.now(),cpu=process.cpuUsage();
const p=tagstackEncode(job.folded);assert.equal(p.decoded,job.folded);const message=DIEXODOS_KEY+p.message;let status='exact',error;
try{assert.equal(diexodosUndo(grammikosParentRead(p.message)),fs.readFileSync(job.path,'utf8'));}catch(e){status='reader-refused';error=String(e);}
const out={...job,parent:p.message,message,tokens:encode(message).length,parentTokens:encode(p.message).length,keyMarginal:encode(message).length-encode(p.message).length,status,error,cpu:process.cpuUsage(cpu),ms:performance.now()-t,native:'NOT_RUN'};
fs.writeFileSync(job.output,JSON.stringify(out,null,2));console.log(job.path,job.mode,status,out.tokens);
