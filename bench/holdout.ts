/** bench/holdout.ts — leaderboard over HELD-OUT corpora (not repo fixtures). */
import fs from 'node:fs';
import path from 'node:path';
import { leaderboard, printBoard } from './leaderboard';
import type { EncodingName } from '@/lib/omega/bpe';

export function holdoutCorpus(): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  const dir = 'bench/holdout';
  if (fs.existsSync(dir)) for (const f of fs.readdirSync(dir).sort()) {
    out.push(['file:' + f, fs.readFileSync(path.join(dir, f), 'utf8')]);
  }
  return out;
}

async function main() {
  const enc = (process.argv[2] as EncodingName) || 'o200k_base';
  const suite = holdoutCorpus();
  const sum = new Map<string, { w: number; n: number; bad: number }>();
  for (const [name, text] of suite) {
    const b = await leaderboard(text, enc);
    printBoard(name, text, enc, b.rows, b.inTokens);
    for (const r of b.rows) {
      const s = sum.get(r.key) ?? { w: 0, n: 0, bad: 0 };
      if (r.exact && r.rt && r.wireTokens >= 0) { s.w += r.wireTokens; s.n++; }
      else { s.bad++; s.w += b.inTokens; }
      sum.set(r.key, s);
    }
  }
  console.log('\n=== HELD-OUT TOTAL (lower=better) ===');
  for (const [k, v] of [...sum.entries()].sort((a, b) => a[1].w - b[1].w))
    console.log(k.padEnd(14), String(v.w).padStart(7), 'ok=' + v.n, v.bad ? 'FAIL=' + v.bad : '');
}
main().catch((e) => { console.error(e); process.exit(1); });
