import { TACHYGRAFIA_RULES } from '../../src/lib/omega/tachygrafia';
const span='printed like';
for(const o of TACHYGRAFIA_RULES) if(span.includes(o.rep)) console.log(`span contains rep ${JSON.stringify(o.rep)} (phrase ${JSON.stringify(o.phrase)})`);
