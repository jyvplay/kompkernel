// Z44: measure the DAEDALUS classifier fix + sound escalation on the non-Latin lanes.
import fs from 'node:fs';
import { daedalusEncode, daedalusFeatures, daedalusOrder } from '@/lib/omega/daedalus';
import { countTokens } from '@/lib/omega/bpe';
const files = process.argv.slice(2);
for (const f of files) {
  const t = fs.readFileSync(f, 'utf8');
  const feat = daedalusFeatures(t, 'o200k_base');
  const r = daedalusEncode(t, 'o200k_base');
  console.log(`${f.split('/').pop().padEnd(22)} raw=${String(countTokens(t,'o200k_base')).padStart(6)} punct=${feat.punctPct.toFixed(1)}% order=${daedalusOrder(feat).slice(0,3).join(',')}`);
  console.log(`   -> M=${r.messageTokens} mode=${r.mode} arm=${r.winningArm} exact=${r.decoded===t} ${r.ms}ms`);
}
