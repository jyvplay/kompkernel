import fs from 'node:fs';
import {countTokens} from '@/lib/omega/bpe';
import {polytroposEncode} from '@/lib/omega/polytropos';
import {chironDecode} from '@/lib/omega/chiron';
import {psephosEncode,psephosDecode} from '@/lib/omega/psephos';
const enc='o200k_base' as any;
const lanes=fs.readFileSync('bench/x21/lanes.txt','utf8').trim().split('\n');
const SH=+(process.env.SHARD||0), NS=+(process.env.NSHARD||1);
const OUT=`bench/x24/psephos-${SH}.jsonl`;
// polytropos wins 27/28 lanes on the current frontier; identity covers the one
// exception (git-log-fuller, where the frontier leader is LAKONIKOS at identity
// cost). lakonikos/daedalus are therefore not worth 2 extra full encodes per lane.
const cut=(r:any)=>{const dp:string=r.decoderPrompt;return {wire:String(r.wire),contract:dp.slice(String(r.wire).length+1)};};
const parents=[
 {name:'identity',run:(x:string)=>({wire:x,contract:''}),undo:(w:string)=>w},
 {name:'polytropos',run:(x:string)=>cut(polytroposEncode(x,enc)),undo:(w:string)=>chironDecode(w)},
];
for(let i=0;i<lanes.length;i++){
  if(i%NS!==SH) continue;
  const f=lanes[i]; const text=fs.readFileSync(f,'utf8');
  const t0=Date.now();
  const r:any=psephosEncode(text,enc,parents as any);
  const dec=psephosDecode(r.wire,r.decodeConfig);
  const exact=dec===text;
  const rec={file:f,raw:r.inTokens,psephosM:r.messageTokens,wireTok:countTokens(r.wire,enc),
    contractTok:countTokens(r.contract,enc),parent:r.parent,exact,
    collapsed:r.stats.totalCollapsed,bare:r.stats.totalBare,
    formats:r.stats.formats.map((x:any)=>({name:x.name,mode:x.mode,sentinel:x.sentinel,enabled:x.enabled,collapsed:x.collapsed,bare:x.bare})),
    ms:Date.now()-t0};
  fs.appendFileSync(OUT,JSON.stringify(rec)+'\n');   // durable, one write per lane
  console.log(f.split('/').pop()!.padEnd(42),String(r.inTokens).padStart(6),String(r.messageTokens).padStart(7),r.parent.padEnd(18),String(exact).padEnd(6),`collapsed=${r.stats.totalCollapsed}`);
}
