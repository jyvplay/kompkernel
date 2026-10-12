// Legend check: the legend-carrying VX1 wire decodes with veritasDecodeL, and the legend is needed (its cost is counted).
import { countTokens } from '@/lib/omega/bpe';
import { veritasEncode, veritasDecode } from '@/lib/omega/veritas';
import { veritasEncodeMulti, withVxLegend, veritasDecodeL, VX_LEGEND } from '@/lib/omega/veritas-w';
const samples = ['bench/holdout-ops/openstack-loghub-26.log', 'bench/holdout/gh-api.json.txt', 'bench/holdout/readme.txt', 'bench/holdout-ops/ls-full-iso.txt'];
console.log('legend tokens:', countTokens(VX_LEGEND, 'o200k_base'), 'chars:', VX_LEGEND.length);
import fs from 'node:fs';
let bad = 0;
for (const f of samples) {
  const t = fs.readFileSync(f, 'utf8');
  const a = veritasEncode(t);
  const w = withVxLegend(a.wire);
  if (veritasDecodeL(w) !== t || veritasDecode(a.wire) !== t) bad++;
  const m = veritasEncodeMulti(t, 'o200k_base', [3]);
  if (veritasDecodeL(m.wire) !== t) bad++;
  console.log(f, 'VX1 plain', a.outTokens, 'VX1 +legend', countTokens(w, 'o200k_base'), 'VXM[3] +legend (wire has legend)', countTokens(m.wire, 'o200k_base'), 'mode', a.mode);
}
// legacy wires (no legend) still decode with the new decoder
const legIn = 'phrase here alpha beta. phrase here alpha beta. phrase here alpha beta. phrase here alpha beta.';
const legacy = veritasEncode(legIn).wire;
if (veritasDecodeL(legacy) !== legIn || veritasDecode(legacy) !== legIn || legacy.indexOf('# ') >= 0) bad++;
console.log('legacy decode ok:', bad === 0 ? 'yes' : 'NO', 'failures', bad);
