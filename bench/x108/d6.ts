import { TACHYGRAFIA_RULES } from '../../src/lib/omega/tachygrafia';
const line='printed like v';
let i=0, hit:any=null;
for (const r of TACHYGRAFIA_RULES) { if (line.startsWith(r.phrase, i)) { hit = r; break; } }
console.log('hit:', hit && JSON.stringify(hit.phrase), '->', hit && JSON.stringify(hit.rep));
if(hit){
  const span=line.slice(i,i+hit.phrase.length);
  console.log('clean:', TACHYGRAFIA_RULES.every((o)=>o!==hit && !span.includes(o.rep)));
  console.log('selfok:', !TACHYGRAFIA_RULES.some((o)=>o!==hit && hit.rep.includes(o.rep) && o.rep.length>2));
  for(const o of TACHYGRAFIA_RULES) if(o!==hit && hit.rep.includes(o.rep) && o.rep.length>2) console.log('   blocker:', JSON.stringify(o.rep));
}
console.log('phrase codepoints:', [...hit.phrase].map(c=>c.codePointAt(0)!.toString(16)).join(' '));
