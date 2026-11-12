import * as fs from 'node:fs';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
import { chironDecode, CHIRON_START } from '../../src/lib/omega/chiron';
process.env.OMEGA_DET='1'; process.env.OMEGA_NO_MEMO='1'; process.env.OMEGA_ENGRAM='0'; process.env.OMEGA_OURA_MEMO='0'; process.env.OMEGA_NO_OROTHESIA='1';
const enc:any='o200k_base';
const p='bench/holdout-tbl/df-h.txt';
const text=fs.readFileSync(p,'utf8');
function one(noT:boolean){
  process.env.OMEGA_NO_TACHYGRAFIA = noT?'1':'0';
  const r:any=tagstackEncode(text,enc);
  const msg:string=r.message;
  const w=msg.indexOf(CHIRON_START);
  let exp:string|null=null; try{ exp=w>=0?chironDecode(msg.slice(w)):null; }catch(e:any){ exp='THREW:'+String(e&&e.message); }
  return {tokens:r.messageTokens,msg,w,exp};
}
const off=one(true), on=one(false);
console.log(`off tokens=${off.tokens} §at ${off.w} explen=${off.exp===null?'null':off.exp.length}`);
console.log(`on  tokens=${on.tokens} §at ${on.w} explen=${on.exp===null?'null':on.exp.length}`);
console.log(`equal exp: ${off.exp===on.exp}`);
console.log('\n--- OFF contract (before §) ---');
console.log(JSON.stringify(off.msg.slice(0,off.w)));
console.log('\n--- ON contract (before §) ---');
console.log(JSON.stringify(on.msg.slice(0,on.w)));
console.log('\n--- OFF wire-from-§ (first 200) ---');
console.log(JSON.stringify(off.msg.slice(off.w,off.w+200)));
console.log('\n--- ON wire-from-§ (first 200) ---');
console.log(JSON.stringify(on.msg.slice(on.w,on.w+200)));
if(off.exp!==null&&on.exp!==null&&off.exp!==on.exp){
  let i=0; while(i<Math.min(off.exp.length,on.exp.length)&&off.exp[i]===on.exp[i])i++;
  console.log(`\nfirst divergence at ${i}:`);
  console.log('OFF: '+JSON.stringify(off.exp.slice(Math.max(0,i-60),i+60)));
  console.log('ON : '+JSON.stringify(on.exp.slice(Math.max(0,i-60),i+60)));
}
