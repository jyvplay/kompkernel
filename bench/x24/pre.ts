import fs from 'node:fs';
import {countTokens} from '@/lib/omega/bpe';
import {polytroposEncode} from '@/lib/omega/polytropos';
import {chironDecode} from '@/lib/omega/chiron';
import {psephosCollapse,psephosUncollapse,psephosContract} from '@/lib/omega/psephos';
const enc='o200k_base' as any; const T=(s:string)=>countTokens(s,enc);
const lanes=fs.readFileSync('bench/x21/lanes.txt','utf8').trim().split('\n');
const SH=+(process.env.SHARD||0), NS=+(process.env.NSHARD||1);
const out=fs.createWriteStream(`bench/x24/pre-${SH}.jsonl`,{flags:'a'});
console.log('lane'.padEnd(42),'raw'.padStart(6),'polyM'.padStart(6),'in-M'.padStart(6),'delta'.padStart(6),'RT   modes');
for(let i=0;i<lanes.length;i++){
  if(i%NS!==SH) continue;
  const f=lanes[i]; const text=fs.readFileSync(f,'utf8'); const raw=T(text);
  const p:any=polytroposEncode(text,enc);
  const polyM=p.messageTokens as number;
  const c=psephosCollapse(text);
  if(!c.stats.totalCollapsed){ out.write(JSON.stringify({file:f,raw,polyM,inM:polyM,delta:0,exact:true,note:'none'})+'\n'); console.log(f.split('/').pop()!.padEnd(42),String(raw).padStart(6),String(polyM).padStart(6),String(polyM).padStart(6),'0'.padStart(6),'true none'); continue; }
  const clause=psephosContract(c.stats);
  const q:any=polytroposEncode(c.text,enc);
  const contract=String(q.decoderPrompt).slice(String(q.wire).length+1);
  const full=contract?`${contract} ${clause}`:clause;
  const inM=T(q.wire)+T(full);
  const rt=chironDecode(q.wire);
  const back=psephosUncollapse(rt,c.stats);
  const exact=back===text;
  out.write(JSON.stringify({file:f,raw,polyM,inM,delta:inM-polyM,exact,modes:c.stats.formats.map((x:any)=>`${x.name}:${x.mode}${x.sentinel}`),collapsed:c.stats.totalCollapsed,bare:c.stats.totalBare,ctrTok:T(clause)})+'\n');
  console.log(f.split('/').pop()!.padEnd(42),String(raw).padStart(6),String(polyM).padStart(6),String(inM).padStart(6),String(inM-polyM).padStart(6),String(exact).padEnd(5),c.stats.formats.map((x:any)=>`${x.name}:${x.enabled?x.mode+x.sentinel:'off'}(${x.collapsed}/b${x.bare})`).join(' '));
}
out.end();
