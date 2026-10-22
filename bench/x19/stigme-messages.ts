import fs from 'node:fs';
import { stigmeEncode } from '@/lib/omega/stigme';
const dir = 'bench/x19/receipts/stigme-msgs';
for (const f of process.argv.slice(2)) {
  const t = fs.readFileSync(f, 'utf8');
  const r = stigmeEncode(t, 'o200k_base');
  if (r.arm !== 'elided') { console.log('SKIP', f.split('/').pop()); continue; }
  const name = f.split('/').pop()!;
  fs.writeFileSync(`${dir}/${name}.msg`, r.decoderPrompt);
  fs.writeFileSync(`${dir}/${name}.expected`, t);
  console.log('WROTE', name, r.messageTokens, r.clauses.join('+'), r.armTag);
}
