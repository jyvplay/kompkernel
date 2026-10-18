import fs from 'node:fs';
import {countTokens} from '@/lib/omega/bpe';
import {psephosCollapse,psephosUncollapse,psephosContract,PSEPHOS_FORMATS} from '@/lib/omega/psephos';
const enc='o200k_base' as any; const T=(s:string)=>countTokens(s,enc);
const lanes=fs.readFileSync('bench/x21/lanes.txt','utf8').trim().split('\n');
console.log('lane'.padEnd(42),'raw'.padStart(6),'wireT'.padStart(6),'newT'.padStart(6),'d'.padStart(5),'ctr'.padStart(4),'RT   modes');
let totRaw=0,totWire=0,totNew=0,totCtr=0, fails=0, n=0;
for(let i=0;i<lanes.length;i++){
  const wf='bench/x24/wires/'+(i+1).toString().padStart(2,'0')+'.wire';
  if(!fs.existsSync(wf)){console.log('(pending)',lanes[i]);continue;}
  n++;
  const wire=fs.readFileSync(wf,'utf8');
  const raw=fs.readFileSync(lanes[i],'utf8');
  const c=psephosCollapse(wire);
  const back=psephosUncollapse(c.text,c.stats);
  const rt=back===wire;
  const wireTok=T(wire), newTok=T(c.text);
  const ctr=T(psephosContract(c.stats));
  if(!rt) fails++;
  totRaw+=T(raw); totWire+=wireTok; totNew+=newTok; totCtr+=ctr;
  console.log(lanes[i].split('/').pop()!.padEnd(42),String(T(raw)).padStart(6),String(wireTok).padStart(6),String(newTok).padStart(6),String(newTok-wireTok).padStart(5),String(ctr).padStart(4),String(rt).padEnd(5),c.stats.formats.map(f=>`${f.name}:${f.enabled?f.mode+f.sentinel:'off'}(${f.collapsed}/b${f.bare})`).join(' '));
}
console.log(`\nlanes=${n} roundTripFails=${fails} | wire ${totWire} -> new ${totNew} (+contract ${totCtr}) => net ${totNew+totCtr-totWire}`);
