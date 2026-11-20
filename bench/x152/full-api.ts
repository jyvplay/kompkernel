import fs from 'node:fs';import assert from 'node:assert/strict';import {homosemaFrontierEncode} from '../../src/lib/omega/homosema-frontier';import {homosemaFusedRead} from '../../src/lib/omega/homosema';import {readPlainParent} from '../../src/lib/omega/ekdysis-frontier';import {encode} from 'gpt-tokenizer/encoding/o200k_base';
process.env.OMEGA_DET='1';process.env.OMEGA_NO_MEMO='1';process.env.OMEGA_ENGRAM='0';process.env.OMEGA_OURA_MEMO='0';process.env.OMEGA_NO_OROTHESIA='1';
const path='bench/x152/fixtures/vscode-json-package.json',bytes=fs.readFileSync(path),source=bytes.toString('utf8'),cpu=process.cpuUsage(),start=performance.now();
const r=homosemaFrontierEncode(source),c=process.cpuUsage(cpu),ms=performance.now()-start;
assert.equal(r.baseTokens,915);assert.equal(r.tokens,895);assert.equal(r.parentCalls,2);assert.equal(r.applied,true);assert.equal(encode(r.message).length,r.tokens);assert.ok(Buffer.from(homosemaFusedRead(r.message,readPlainParent)).equals(bytes));
assert.equal(r.message,fs.readFileSync('bench/x152/receipts/native-packet.txt','utf8'));
const result={path,...r,ms,cpuMs:(c.user+c.system)/1000,scope:'fresh complete public API execution, one original + two real folded parent calls; not replay'};fs.writeFileSync('bench/x152/receipts/full-api.json',JSON.stringify(result,null,2));console.log(JSON.stringify({...result,message:undefined}));
