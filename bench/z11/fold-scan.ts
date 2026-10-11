import fs from 'node:fs';
import { hyleEncode } from '@/lib/omega/hyle';
for (const f of (process.env.LIST || '').split(',').filter(Boolean)) {
  const t = fs.readFileSync(f, 'utf8');
  const h = hyleEncode(t, 'o200k_base', { fast: true });
  console.log(JSON.stringify({ f, folds: h.folds, winner: h.winner, wireLen: h.wire.length, inLen: t.length }));
}
