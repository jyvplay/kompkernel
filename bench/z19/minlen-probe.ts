// DITTO min-length parameter inside the fixed PHALANX order (U -> Da -> T(minLen) -> V).
// Chosen as a single fixed parameter over a stated set {3,4,6,8}; not a per-file arm choice.
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { uuidfoldEncode, uuidfoldDecode } from '@/lib/omega/uuidfold';
import { dirfoldAEncode, dirfoldADecode } from '@/lib/omega/dirfold-a';
import { dittoEncode, dittoDecode } from '@/lib/omega/ditto';
import { veritasEncode, veritasDecode } from '@/lib/omega/veritas';
const files = [
  ...['find-listing.txt', 'ls-full-iso.txt', 'git-numstat.txt', 'npm-ls.txt', 'node-stacktraces.txt', 'openstack-loghub-26.log', 'git-log-fuller.txt'].map(f => `bench/holdout-ops/${f}`),
  ...fs.readdirSync('bench/holdout').map(f => `bench/holdout/${f}`),
];
for (const f of files) {
  const t = fs.readFileSync(f, 'utf8');
  const out: Record<string, unknown> = { f };
  const vOnly = countTokens(veritasEncode(t, 'o200k_base').wire, 'o200k_base');
  out.veritas = vOnly;
  for (const m of [3, 4, 6, 8]) {
    const u = uuidfoldEncode(t, 'o200k_base').wire;
    const da = dirfoldAEncode(u, 'o200k_base').wire;
    const d = dittoEncode(da, 'o200k_base', m).wire;
    const v = veritasEncode(d, 'o200k_base').wire;
    const back = uuidfoldDecode(dirfoldADecode(dittoDecode(veritasDecode(v))));
    out['minLen' + m] = { tok: countTokens(v, 'o200k_base'), exact: back === t };
  }
  console.log(JSON.stringify(out));
}
