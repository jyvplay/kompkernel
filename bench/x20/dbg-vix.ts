import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { stathmosForward, STATHMOS_CONTRACT } from '@/lib/omega/stathmos';
import { typosPlans, typosContract, typosDecode } from '@/lib/omega/typos';
import { lakonikosDualEncode } from '@/lib/omega/lakonikos-d';
const text = fs.readFileSync('bench/holdout-tab/vix-daily-1990.csv', 'utf8');
const st = stathmosForward(text)!;
console.log('stathmos head:', JSON.stringify(st.text.slice(0, 90)));
const nl = st.text.indexOf('\n');
const head = st.text.slice(0, nl + 1), rest = st.text.slice(nl + 1);
const plans = typosPlans(rest);
console.log('plans on rest:', plans.map(p => `${p.mode} est=${p.est} shapes=${JSON.stringify(p.shapes)} occ=${p.occurrences}`).join(' | ') || 'none');
for (const p of plans.slice(0, 3)) {
  const full = head + p.text;
  const tr = lakonikosDualEncode(full);
  const msg = `${tr.decoderPrompt}\n${STATHMOS_CONTRACT}\n${typosContract(p.shapes, p.mode, p.marks)}`;
  const M = countTokens(msg, 'o200k_base');
  const dec = typosDecode(tr.wire, p.shapes, p.mode, p.marks, true);
  console.log(`chained ${p.mode}: wireMode=${tr.mode} M=${M} exact=${dec === text}`);
}
