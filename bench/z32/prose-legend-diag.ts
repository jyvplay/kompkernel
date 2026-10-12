// Z32 diagnostic: how much of the prose gap to EIDOLON is the in-message legend line (32 tokens per wire)?
// Not a codec: it reports the VXC wire size with and without its legend line, next to EIDOLON's measured sizes.
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { veritasCEncode, VXC_LEGEND } from '@/lib/omega/veritas-c';
const enc = 'o200k_base' as const;
const eid: Record<string, number> = { 'gh-prose.txt': 1910, 'readme.txt': 730, 'license.txt': 1096, 'lic-mit.txt': 223, 'md-react.txt': 252, 'md-vite.txt': 255 };
let sumV = 0, sumNoLeg = 0, sumE = 0;
for (const f of Object.keys(eid)) {
  const t = fs.readFileSync('/home/user/kompkernel/bench/holdout/' + f, 'utf8');
  const r = veritasCEncode(t, enc);
  const noLeg = r.wire.replace(VXC_LEGEND + '\n', '');
  const nl = countTokens(noLeg, enc);
  console.log(f.padEnd(14), 'VXC', String(r.outTokens).padStart(6), 'VXC without legend line', String(nl).padStart(6), 'legend tokens', countTokens(VXC_LEGEND, enc), 'EIDOLON (no legend, system prompt needed)', eid[f]);
  sumV += r.outTokens; sumNoLeg += nl; sumE += eid[f];
}
console.log('SUM prose: VXC', sumV, 'VXC no-legend', sumNoLeg, 'EIDOLON', sumE);
