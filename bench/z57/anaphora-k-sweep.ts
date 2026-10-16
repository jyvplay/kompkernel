// X12: look-back window sweep for ANAPHORA (K = 1, 4, 16). One-chat M vs plain DAEDALUS, exact.
import fs from 'node:fs';
import { anaphoraFoldEncode, anaphoraFoldDecode } from '@/lib/omega/anaphora-fold';
import { daedalusEncode } from '@/lib/omega/daedalus';
const files = process.argv.slice(2);
for (const f of files) {
  const text = fs.readFileSync(f, 'utf8');
  const plain = daedalusEncode(text, 'o200k_base').messageTokens;
  const row: Record<string, unknown> = { lane: f.split('/').pop(), plain };
  for (const K of [1, 4, 16]) {
    const r = anaphoraFoldEncode(text, 'o200k_base', K);
    row['K' + K] = { arm: r.arm, folds: r.folds, M: r.messageTokens, exact: anaphoraFoldDecode(r.wire, r.arm) === text };
  }
  console.log(JSON.stringify(row));
}
