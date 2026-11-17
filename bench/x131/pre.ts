/** X131: what IS the preamble? 736 tokens = 6.1% of output, 100% of the 3 zero-compression lanes. */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
process.env.OMEGA_DET='1'; process.env.OMEGA_NO_MEMO='1'; process.env.OMEGA_ENGRAM='0';
process.env.OMEGA_OURA_MEMO='0'; process.env.OMEGA_NO_OROTHESIA='1';
const enc:any='o200k_base';
const lanes=fs.readFileSync('bench/x109/lanes29.txt','utf8').split('\n').filter(Boolean);
const seen=new Map<string,number>();
for(const p of lanes){
  const text=fs.readFileSync(p,'utf8');
  const a:any=tagstackEncode(text,enc); const M=a.message as string;
  const i1=M.indexOf('\u00a7'); const i2=M.indexOf('\u00b6',i1);
  const pre = i1<0? M : M.slice(0,i1);
  const key = pre.replace(/\d+/g,'#');
  seen.set(key,(seen.get(key)??0)+1);
  if(p.includes('lsblk')||p.includes('uptime-w')||p.includes('free-m')||p.includes('vmstat')){
    console.log('='.repeat(70)); console.log('LANE',p.split('/').pop(),' pre tokens=',countTokens(pre,enc),' out=',a.messageTokens);
    console.log(JSON.stringify(pre.slice(0,600)));
  }
}
console.log('\n\n#### DISTINCT PREAMBLE SHAPES (# = any digits):');
for(const [k,v] of [...seen].sort((a,b)=>b[1]-a[1])) console.log(`--- ${v} lanes, ${countTokens(k,enc)} tok ---\n${k.slice(0,420)}\n`);
