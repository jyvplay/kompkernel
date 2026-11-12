import { TACHYGRAFIA_RULES, tachygrafiaApplyTraced } from '../../src/lib/omega/tachygrafia';
console.log('rules:', TACHYGRAFIA_RULES.length);
console.log(TACHYGRAFIA_RULES.slice(0,4).map(r=>[r.phrase,r.rep]));
const l='spec: v+k*r = v+(k*row#) printed like v; v@+ks = v plus k sec; list* repeats; =v fixed; body = header then rows.';
console.log('has "printed like":', l.includes('printed like'), 'startsWith at 26:', l.startsWith('printed like',26));
for (const r of TACHYGRAFIA_RULES) { const i=l.indexOf(r.phrase); if(i>=0) console.log(`  MATCH at ${i}: ${JSON.stringify(r.phrase)} -> ${JSON.stringify(r.rep)}`); }
console.log('traced:', JSON.stringify(tachygrafiaApplyTraced(l).after.slice(0,80)));
