// Where do the remaining A1 tokens go? Per-line token cost of the A1 wire, grouped by line shape.
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { phalanxA1Encode } from '@/lib/omega/phalanx-a1';
const enc = 'o200k_base' as const;
const files = ['bench/z20/samples/find-printf-src.txt', 'bench/holdout-ops/npm-ls.txt', 'bench/holdout/gh-api.json.txt', 'bench/holdout-ops/package-lock-head.json'];
for (const f of files) {
  const t = fs.readFileSync(f, 'utf8');
  const r = phalanxA1Encode(t, enc);
  const lines = r.wire.split('\n');
  let hdr = 0, body = 0, legendTok = 0, aliasUse = 0, bodyLines = 0;
  const shapes = new Map<string, number>();
  let inBody = false;
  for (const ln of lines) {
    const c = countTokens(ln + '\n', enc);
    if (!inBody) { hdr += c; if (ln === ']]') inBody = true; if (ln.startsWith('#')) legendTok += c; continue; }
    body += c; bodyLines++;
    const shape = ln.replace(/[A-Za-z]+/g, 'w').replace(/\d+/g, 'N').slice(0, 24);
    shapes.set(shape, (shapes.get(shape) ?? 0) + c);
  }
  console.log(`${f}: identity=${countTokens(t, enc)} A1=${r.outTokens} mode=${r.mode} headerTok=${hdr} legendTok=${legendTok} bodyTok=${body} bodyLines=${bodyLines}`);
  const top = [...shapes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  for (const [s, c] of top) console.log(`   ${String(c).padStart(6)}  ${JSON.stringify(s)}`);
}
