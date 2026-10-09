import { countTokens } from '../src/lib/omega/bpe';
import { synPlan, renderSynWire, synizesisDecode, synContract, SYN_HEX, SYN_SEP } from '../src/lib/omega/synizesis';
const ENC='o200k_base' as const; const T=(s:string)=>countTokens(s,ENC);
console.log('sep tok', T(SYN_SEP), 'hex sigil tok', T(SYN_HEX));
const LOG = Array.from({length:40},(_,i)=>
  `2026-09-${String(10+(i%20)).padStart(2,'0')}T${String(8+(i%12)).padStart(2,'0')}:${String((i*7)%60).padStart(2,'0')}:${String((i*13)%60).padStart(2,'0')}.${String((i*137)%1000).padStart(3,'0')}Z INFO  [scheduler-${i%4}] tenant=t-${1000+i} req=${(i*7919).toString(16).padStart(12,'0')} latency=${(12+i*3)}ms status=200`).join('\n');
for (const [n,t] of [['log',LOG]] as Array<[string,string]>) {
  const p = synPlan(t, ENC);
  if (!p) { console.log(n,'no plan'); continue; }
  const w = renderSynWire(p); const c = synContract(p);
  const d = synizesisDecode(w);
  console.log(n, 'raw', T(t), 'wire', T(w), 'contract', T(c), 'msg', T(w)+T(c), 'exact', d===t, 'shapes', p.shapes.length, 'inst', p.instances);
  console.log('legend:', JSON.stringify(w.slice(0, w.indexOf('\n'+SYN_SEP+'\n'))));
  console.log('body head:', JSON.stringify(w.slice(w.indexOf('\n'+SYN_SEP+'\n')+3, w.indexOf('\n'+SYN_SEP+'\n')+200)));
  if (d!==t) { for (let i=0;i<Math.max(d.length,t.length);i++) if (d[i]!==t[i]) { console.log('first diff at',i, JSON.stringify(t.slice(i-40,i+40)), '||', JSON.stringify(d.slice(i-40,i+40))); break; } }
}
