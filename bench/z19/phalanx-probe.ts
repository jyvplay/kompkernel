// PHALANX-P1 module probe: identity vs PHALANX vs VERITAS-VX vs holographic, every file, decode-checked.
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { phalanxEncode, phalanxDecode } from '@/lib/omega/phalanx';
import { veritasEncode } from '@/lib/omega/veritas';
import { compressHolographic } from '@/lib/neuralese-holographic';
const files = [
  ...['find-listing.txt', 'ls-full-iso.txt', 'git-numstat.txt', 'npm-ls.txt', 'node-stacktraces.txt', 'openstack-loghub-26.log', 'git-log-fuller.txt'].map(f => `bench/holdout-ops/${f}`),
  ...fs.readdirSync('bench/holdout').map(f => `bench/holdout/${f}`),
];
for (const f of files) {
  const t = fs.readFileSync(f, 'utf8');
  const p = phalanxEncode(t, 'o200k_base');
  const v = veritasEncode(t, 'o200k_base');
  const h = compressHolographic(t);
  console.log(JSON.stringify({
    f, identity: countTokens(t, 'o200k_base'),
    phalanx: p.outTokens, mode: p.mode, stages: p.stageTokens,
    phalanx_exact: phalanxDecode(p.wire) === t,
    phalanx_ascii: /^[\x00-\x7f]*$/.test(p.wire),
    veritas: countTokens(v.wire, 'o200k_base'), veritas_exact: v.decoded === t,
    holographic: countTokens(h.output, 'o200k_base'),
  }));
}
