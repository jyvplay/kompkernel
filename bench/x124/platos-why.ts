import * as fs from 'node:fs';
import { platosTransform } from '../../src/lib/omega/platos';
for (const p of ['bench/holdout-x42/findmnt.txt','bench/holdout-x41/node-help.txt','bench/holdout-x42/dpkg-l.txt','bench/holdout-tbl/kubectl-get-pods.txt','bench/holdout-x41/ps-aux-real.txt']) {
  const t = fs.readFileSync(p, 'utf8');
  const r = platosTransform(t);
  console.log(p.split('/').pop(), r ? `FIT ${r.blk.rows.length}x${r.blk.n} pad ${r.blk.padMass} side ${r.blk.side}` : 'NO FIT');
  if (!r) {
    // which lines fail a simple fixed-offset model derived from the header?
    const lines = t.split('\n');
    for (let h = 0; h < Math.min(4, lines.length); h++) {
      const starts: number[] = [];
      for (let i = 0; i < lines[h].length; i++) {
        if (lines[h][i] !== ' ' && (i === 0 || lines[h][i-1] === ' ')) {
          // start of a token; only count if preceded by 2+ spaces or is at 0
          if (i === 0 || (lines[h][i-1] === ' ' && (i === 1 || lines[h][i-2] === ' '))) starts.push(i);
        }
      }
      console.log('   header cand line', h, 'starts', JSON.stringify(starts.slice(0, 10)), JSON.stringify(lines[h].slice(0, 60)));
    }
  }
}
