import assert from 'node:assert/strict';import fs from 'node:fs';import {periballonScope} from '../../src/lib/omega/periballon';
const original=process.env,key='OMEGA_X148_TEST';let checks=0;const eq=(a:unknown,b:unknown)=>{assert.deepEqual(a,b);checks++};const saved=original[key];
try{
 delete original[key];eq(periballonScope(()=>process.env[key]),undefined);eq(process.env,original);
 process.env[key]='late';eq(periballonScope(()=>process.env[key]),'late');
 eq(periballonScope(()=>{process.env[key]='write';eq(original[key],'write');return periballonScope(()=>process.env[key])}),'write');
 periballonScope(()=>{delete process.env[key];eq(original[key],undefined)});eq(original[key],undefined);
 assert.throws(()=>periballonScope(()=>{process.env[key]='throw';throw Error('intentional')}));checks++;eq(original[key],'throw');eq(process.env,original);
 assert.throws(()=>periballonScope(()=>{original[key]='out-of-band';return process.env[key]}),/out-of-band/);checks++;eq(process.env,original);
 assert.throws(()=>periballonScope(()=>{process.env={};return 1}),/replaced/);checks++;eq(process.env,original);
 assert.throws(()=>periballonScope(()=>({then(){}})),/synchronous/);checks++;eq(process.env,original);
 for(let i=0;i<300;i++)periballonScope(()=>{process.env[key]=String(i);eq(process.env[key],original[key]);eq(Object.keys(process.env).sort(),Object.keys(original).sort());delete process.env[key];eq(key in process.env,key in original)});
 // No snapshot values/keys other than the dedicated test key are written to receipts.
 fs.writeFileSync('bench/x148/receipts/scope-unit.json',JSON.stringify({checks,cleanup:true,outOfBandRejected:true,nested:true,syncOnly:true}));console.log({checks});
}finally{if(saved===undefined)delete original[key];else original[key]=saved;assert.equal(process.env,original)}
