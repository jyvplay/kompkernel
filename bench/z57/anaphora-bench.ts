// X12: ANAPHORA vs plain DAEDALUS, one-chat M (contract + wire), o200k, exact on every lane.
import fs from 'node:fs';
import { anaphoraFoldEncode, anaphoraFoldDecode } from '@/lib/omega/anaphora-fold';
import { daedalusEncode } from '@/lib/omega/daedalus';
for (const f of process.argv.slice(2)) {
  const text = fs.readFileSync(f, 'utf8');
  const t0 = performance.now();
  const r = anaphoraFoldEncode(text, 'o200k_base');
  const t1 = performance.now();
  const exact = anaphoraFoldDecode(r.wire, r.arm) === text;
  console.log(JSON.stringify({ lane: f, raw: text.length, arm: r.arm, folds: r.folds, exact, anaphora: r.messageTokens, plain: daedalusEncode(text, 'o200k_base').messageTokens, encMs: Math.round(t1 - t0) }));
}
