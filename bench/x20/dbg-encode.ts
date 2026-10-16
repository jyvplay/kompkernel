import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { typosEncode, typosForward, typosContract, typosPlans } from '@/lib/omega/typos';
const text = fs.readFileSync(process.argv[2], 'utf8');
const plans = typosPlans(text);
console.log('plans:', plans.map(p => `${p.mode} est=${p.est} shapes=${p.shapes.length} occ=${p.occurrences}`).join(' | ') || 'none');
const fw = typosForward(text);
if (fw) {
  console.log('fw shapes:', JSON.stringify(fw.shapes), 'marks', JSON.stringify(fw.marks), 'occ', fw.occurrences);
  console.log('tok(input)=', countTokens(text, 'o200k_base'), 'tok(fw.text)=', countTokens(fw.text, 'o200k_base'), 'sentence=', countTokens(typosContract(fw.shapes, fw.mode, fw.marks), 'o200k_base'));
  console.log('sample:', JSON.stringify(fw.text.slice(0, 160)));
}
const r = typosEncode(text);
console.log('RESULT mode=', r.mode, 'rule=', r.rule, 'base=', r.baseTokens.o200k_base, 'M=', r.messageTokens.o200k_base, 'notes=', r.notes);
