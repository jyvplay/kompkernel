import fs from 'node:fs';import {tagstackEncode} from '../../src/lib/omega/tagstack';import {countTokens} from '../../src/lib/omega/bpe';import {readPlainParent} from '../../src/lib/omega/ekdysis-frontier';import {polysteliUndo} from '../../src/lib/omega/polysteli';import {splitPlan} from './polysteli-split';
process.env.OMEGA_DET='1';process.env.OMEGA_NO_MEMO='1';process.env.OMEGA_ENGRAM='0';process.env.OMEGA_OURA_MEMO='0';process.env.OMEGA_NO_OROTHESIA='1';delete process.env.OMEGA_POLYSTELI;delete process.env.OMEGA_NO_POLYSTELI;
const path='bench/holdout-x41/ps-aux-real.txt',source=fs.readFileSync(path,'utf8'),plan=splitPlan(source);if(!plan)throw Error('no plan');
const key='After decoding, apply each ॥ row-padding instruction and remove its marker line; preserve every other character.\n';
const start=performance.now(),child=tagstackEncode(plan.text,'o200k_base'),ms=performance.now()-start;
if(child.decoded!==plan.text || !child.exact || !child.frontierComplete)throw Error('parent mismatch');
const message=key+child.message,tokens=countTokens(message,'o200k_base');let decoded:string|null=null,error:string|null=null;
try{decoded=polysteliUndo(readPlainParent(message.slice(key.length)))}catch(e){error=String(e)}
const exact=decoded!==null&&Buffer.from(decoded).equals(fs.readFileSync(path));
const out={path,baselineX149:980,grids:plan.grids,tokens,exact,error,ms,message,notes:child.notes};
fs.writeFileSync('bench/x150/receipts/split-composite.json',JSON.stringify(out,null,2));console.log(JSON.stringify({path,baselineX149:980,grids:plan.grids,tokens,exact,error,ms}));
