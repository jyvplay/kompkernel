// z11: HYLE probe. Real files, real o200k counts, decode check. Fast mode = deterministic folds only.
import fs from 'node:fs';
import { hyleEncode } from '@/lib/omega/hyle';
import { countTokens } from '@/lib/omega/bpe';
const files = fs.readFileSync(process.env.LIST || 'bench/z11/corpus-55.txt', 'utf8').split('\n').filter(Boolean);
const fast = process.env.FAST === '1';
const SH = Number(process.env.SHARD || 0), NS = Number(process.env.NSHARD || 1);
files.forEach((f, i) => {
  if (i % NS !== SH) return;
  const t = fs.readFileSync(f, 'utf8');
  const r = hyleEncode(t, 'o200k_base', { fast, budgetMs: 20000 });
  console.log(JSON.stringify({ f, in: countTokens(t, 'o200k_base'), msg: r.messageTokens, contract: r.contractTokens, winner: r.winner, folds: r.folds, exact: r.exact, decodedOk: r.decoded === t, certified: r.certified, ms: r.ms, wire: r.winner === 'identity' || r.winner === 'raw' ? null : r.wire }));
});
