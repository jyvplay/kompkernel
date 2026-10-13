// Z37 probe: VXR with optional site pass (SITE=1) and pool order (POOL=cp|cyr|greek|arabic|armenian).
import fs from 'node:fs';
import { veritasSiteEncode } from './site';
import { DEFAULT_VXR_OPTS } from '@/lib/omega/veritas-r';
const cfg = JSON.parse(process.env.CFG ?? '{}');
for (const f of process.argv.slice(2)) {
  const text = fs.readFileSync(f, 'utf8');
  const t0 = Date.now();
  const r = veritasSiteEncode(text, 'o200k_base', { ...DEFAULT_VXR_OPTS, ...cfg });
  console.log(JSON.stringify({ f: f.split('/').pop(), site: process.env.SITE ?? '0', pool: process.env.POOL ?? 'cp', out: r.outTokens, ent: r.entries, exact: r.exact, stats: (globalThis as any).__siteStats ?? null, swap: (globalThis as any).__swapStats ?? null, rejDec: (globalThis as any).__swapRejectedDecode ?? 0, ms: Date.now() - t0 }));
}
