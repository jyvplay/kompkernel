import fs from 'node:fs';import assert from 'node:assert/strict';import crypto from 'node:crypto';import {encode} from 'gpt-tokenizer/encoding/o200k_base';import {encodeIds,decodeIds} from '../../src/lib/omega/bpe';import {arkesisRead} from '../../src/lib/omega/arkesis';import {arkesisFromFrontier,readArkesisIncumbent} from '../../src/lib/omega/arkesis-frontier';import {readPlainParent} from '../../src/lib/omega/ekdysis-frontier';
const canonical=fs.readFileSync('bench/x153/receipts/frontier.jsonl','utf8').trim().split('\n').map(l=>JSON.parse(l));
const json=JSON.parse(fs.readFileSync('bench/x153/receipts/full-api.json','utf8'));
const html=fs.readFileSync('bench/x153/receipts/html.jsonl','utf8').trim().split('\n').map(l=>JSON.parse(l)).filter(r=>r.message&&r.tokens).sort((a,b)=>a.tokens-b.tokens)[0];
const results=[];let packet='';
for(const file of process.argv.slice(2)){const rows=fs.readFileSync(file,'utf8').trim().split('\n').filter(Boolean).map(l=>JSON.parse(l));
 for(const r of rows){if(!r.message||r.stage==='incumbent')continue;const source=fs.readFileSync(r.path),base=r.path.endsWith('vscode-json-package.json')?json:r.path.endsWith('html-package.json')?html:rows.find(r=>r.stage==='incumbent')??canonical.find(x=>x.path===r.path);assert.ok(base);
 assert.ok(Buffer.from(readArkesisIncumbent(base.message)).equals(source));assert.equal(encode(base.message).length,r.incumbent);
 assert.ok(Buffer.from(arkesisRead(r.message,readPlainParent)).equals(source));assert.equal(encode(r.message).length,r.candidate);assert.equal(Buffer.from(r.message).toString('utf8'),r.message);assert.equal(decodeIds(encodeIds(r.message,'o200k_base'),'o200k_base'),r.message);
 const selected=arkesisFromFrontier(source.toString('utf8'),base.message,s=>{assert.equal(s,r.folded);return r.parent;});assert.equal(selected.applied,r.candidate<r.incumbent);assert.equal(selected.tokens,Math.min(r.candidate,r.incumbent));assert.equal(selected.parentCalls,1);
 results.push({path:r.path,tokens:r.candidate,incumbent:r.incumbent,gain:r.gain,sourceBytes:source.length,sha256:crypto.createHash('sha256').update(source).digest('hex')});if(r.gain>10)packet=r.message;
 }}
assert.ok(packet);fs.writeFileSync('bench/x154/receipts/native-packet.txt',packet);fs.writeFileSync('bench/x154/receipts/gate.json',JSON.stringify({messages:results.length,sourceReads:results.length,referencePrices:results.length,rows:results,native:'NOT_RUN',scope:'stored full parent wires replayed through selector; not fresh full API timing'},null,2));console.log(results);
