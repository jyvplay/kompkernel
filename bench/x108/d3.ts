import { TACHYGRAFIA_RULES, tachygrafiaApplyTraced } from '../../src/lib/omega/tachygrafia';
const l='spec: v+k*r = v+(k*row#) printed like v; v@+ks = v plus k sec; list* repeats; =v fixed; body = header then rows.';
const t=tachygrafiaApplyTraced(l);
console.log('steps:', t.steps.length, t.steps.map(s=>[s.rule.phrase,s.rule.rep]));
// manual gate replay at i=25
const i=25; const hit=TACHYGRAFIA_RULES.find(r=>l.startsWith(r.phrase,i))!;
console.log('hit at 25:', JSON.stringify(hit.phrase), '->', JSON.stringify(hit.rep));
const span=l.slice(i,i+hit.phrase.length);
console.log('span:', JSON.stringify(span));
for(const o of TACHYGRAFIA_RULES){ if(o!==hit && span.includes(o.rep)) console.log('  BLOCK clean by rep', JSON.stringify(o.rep)); }
for(const o of TACHYGRAFIA_RULES){ if(o!==hit && hit.rep.includes(o.rep) && o.rep.length>2) console.log('  BLOCK self by rep', JSON.stringify(o.rep), 'in', JSON.stringify(hit.rep)); }
