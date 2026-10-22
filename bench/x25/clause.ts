import fs from 'node:fs';
import {countTokens} from '@/lib/omega/bpe';
import {letteriseGlyphs,genericWordingIsSound,syntomiaRulesClause} from '@/lib/omega/syntomia';
import {CHIRON_SCRIPTS,CHIRON_SEP,CHIRON_START} from '@/lib/omega/chiron';
import {chironParseTape} from '@/lib/omega/chiron';
const enc='o200k_base' as any; const T=(s:string)=>countTokens(s,enc);
const lanes=fs.readFileSync('bench/x21/lanes.txt','utf8').trim().split('\n');
function scriptOfChar(ch:string){const cp=ch.codePointAt(0)!;for(const s of CHIRON_SCRIPTS){const sp=(s as any).ranges??[[(s as any).lo,(s as any).hi]];for(const [a,b] of sp) if(cp>=a&&cp<b) return s;}return null;}
console.log('lane'.padEnd(40),'wireT'.padStart(6),'ctr'.padStart(4),'script'.padStart(10),'sound?'.padStart(7),'afterLetterise'.padStart(14),'save');
let totSave=0;
for(let i=0;i<lanes.length;i++){
  const wf=`bench/x24/wires/${(i+1).toString().padStart(2,'0')}.wire`;
  if(!fs.existsSync(wf)) continue;
  const wire=fs.readFileSync(wf,'utf8');
  const src=fs.readFileSync(lanes[i],'utf8');
  const k=wire.indexOf(CHIRON_SEP); if(k<0){continue;}
  const tape=wire.slice(1,k); if(!tape.length) continue;
  const sc:any=scriptOfChar(tape[0]); if(!sc) continue;
  const rules=chironParseTape(tape,sc); const nested=!!rules&&rules.length>0;
  const sound=genericWordingIsSound(wire,src);
  const asIs=syntomiaRulesClause(sound?'':sc.label,nested);
  const ctr=T(asIs);
  let best=ctr, note='';
  const lw=letteriseGlyphs(wire,enc);
  if(lw){
    const sound2=genericWordingIsSound(lw,src);
    const c2=T(syntomiaRulesClause(sound2?'':sc.label,nested));
    const net=(ctr-c2) - (T(lw)-T(wire));   // contract saving minus wire cost
    if(c2<best){best=c2; note=`letterise -> ctr ${c2} (wire ${T(lw)-T(wire)>=0?'+':''}${T(lw)-T(wire)})`;}
  }
  totSave+=ctr-best;
  console.log(lanes[i].split('/').pop()!.padEnd(40),String(T(wire)).padStart(6),String(ctr).padStart(4),String(sc.name).padStart(10),String(sound).padStart(7),note.padStart(14),String(ctr-best).padStart(5));
}
console.log('TOTAL contract tokens recoverable =',totSave);
