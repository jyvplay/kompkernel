import fs from 'node:fs';
import {countTokens} from '@/lib/omega/bpe';
import {psephosEncode,psephosDecode} from '@/lib/omega/psephos';
const enc='o200k_base' as any;
const lanes=fs.readFileSync('bench/x21/lanes.txt','utf8').trim().split('\n');
const SH=+(process.env.SHARD||0), NS=+(process.env.NSHARD||1);
const out=fs.createWriteStream(`bench/x24/psephos-${SH}.jsonl`,{flags:'a'});
for(let i=0;i<lanes.length;i++){
  if(i%NS!==SH) continue;
  const f=lanes[i]; const text=fs.readFileSync(f,'utf8');
  const t0=Date.now();
  const r:any=psephosEncode(text,enc);
  const dec=psephosDecode(r.wire,{stats:r.decodeConfig.stats,undo:r.decodeConfig.undo,order:r.decodeConfig.order});
  const exact=dec===text;
  out.write(JSON.stringify({file:f,raw:r.inTokens,psephosM:r.messageTokens,wireTok:countTokens(r.wire,enc),contractTok:countTokens(r.contract,enc),parent:r.parent,exact,collapsed:r.stats.totalCollapsed,bare:r.stats.totalBare,modes:r.stats.formats.map((x:any)=>`${x.name}:${x.mode}${x.sentinel||''}`),notes:r.notes,ms:Date.now()-t0})+'\n');
  console.log(f.split('/').pop()!.padEnd(42),String(r.inTokens).padStart(6),String(r.messageTokens).padStart(7),r.parent.padEnd(20),String(exact).padEnd(6),r.notes.slice(0,70));
}
out.end();
