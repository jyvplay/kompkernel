import fs from 'node:fs';import assert from 'node:assert/strict';import crypto from 'node:crypto';import {encode} from 'gpt-tokenizer/encoding/o200k_base';import {encodeIds,decodeIds} from '../../src/lib/omega/bpe';import {readPlainParent} from '../../src/lib/omega/ekdysis-frontier';import {homosemaFusedRead} from '../../src/lib/omega/homosema';import {kenomaRead,kenomaIndentRead,kenomaSelect,kenomaIndentSelect} from '../../src/lib/omega/kenoma';
const prior=JSON.parse(fs.readFileSync('bench/x152/receipts/wrapper.json','utf8')).rows;const results=[];
for(const file of process.argv.slice(2)){
 const rows=fs.readFileSync(file,'utf8').trim().split('\n').filter(Boolean).map(l=>JSON.parse(l));
 for(const r of rows){if(!r.message||r.stage&&!r.stage.startsWith('KENOMA'))continue;
  const source=fs.readFileSync(r.path),indent=r.width!==undefined||r.stage==='KENOMA-indent',decoded=indent?kenomaIndentRead(r.message,readPlainParent):kenomaRead(r.message,readPlainParent),tokens=r.candidate??r.tokens;
  assert.ok(Buffer.from(decoded).equals(source));assert.equal(encode(r.message).length,tokens);assert.equal(Buffer.from(r.message).toString('utf8'),r.message);assert.equal(decodeIds(encodeIds(r.message,'o200k_base'),'o200k_base'),r.message);
  const incumbent=prior.find((x:any)=>x.path===r.path)??rows.filter(x=>x.stage==='TAGSTACK'||x.stage==='HOMOSEMA'&&x.tokens!==null).sort((a,b)=>a.tokens-b.tokens)[0];assert.ok(incumbent);assert.equal(encode(incumbent.message).length,r.incumbent);
  let baseSource;try{baseSource=homosemaFusedRead(incumbent.message,readPlainParent)}catch{baseSource=readPlainParent(incumbent.message)}assert.ok(Buffer.from(baseSource).equals(source));
  const selected=indent?kenomaIndentSelect(source.toString(),r.width,r.parent,incumbent.message,readPlainParent):kenomaSelect(source.toString(),r.parent,incumbent.message,readPlainParent);assert.equal(!!selected,tokens<r.incumbent);
  results.push({path:r.path,arm:indent?'indent':'hole',tokens,incumbent:r.incumbent,gain:r.incumbent-tokens,sourceSha256:crypto.createHash('sha256').update(source).digest('hex'),message:r.message});
 }
}
const wins=results.filter(r=>r.gain>10).sort((a,b)=>b.gain-a.gain);assert.ok(wins.length);fs.writeFileSync('bench/x153/receipts/native-packet.txt',wins[0]!.message);
fs.writeFileSync('bench/x153/receipts/gate.json',JSON.stringify({messages:results.length,exactSourceReads:results.length,referencePrices:results.length,nativeSingleChat:'NOT_RUN',rows:results.map(({message,...r})=>r)},null,2));console.log(JSON.stringify(results.map(({message,...r})=>r)));
