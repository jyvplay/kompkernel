import { prismSelfTest } from '../src/lib/omega/prism';
for (const t of prismSelfTest('o200k_base')) console.log((t.pass ? 'PASS ' : 'FAIL ') + t.name + '  ::  ' + t.details);
