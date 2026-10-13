// Z33: VERITAS-S evaluation over the 151-file corpus (40 groups + 111 fresh; lists from bench/z33/receipts).
// Every file: encode, decode through the shipped decoder, require byte-exact equality. Writes one JSON line per file.
import fs from 'node:fs';
import { veritasSEncode } from '@/lib/omega/veritas-s';
const OUT = process.env.OUT ?? '/home/user/z33/vxs-eval.jsonl';
const D: Record<string, { messageTokens: number }> = {};
for (const l of fs.readFileSync('bench/z33/receipts/daedalus-151.jsonl', 'utf8').split('\n').filter(Boolean)) { const r = JSON.parse(l); D[r.file] = r; }
const rows: [string, string][] = [];
for (const l of fs.readFileSync('bench/z33/receipts/a10-groups.jsonl', 'utf8').split('\n').filter(Boolean)) { const r = JSON.parse(l); rows.push([r.group, r.file]); }
for (const l of fs.readFileSync('bench/z33/receipts/daedalus-151.jsonl', 'utf8').split('\n').filter(Boolean)) { const r = JSON.parse(l); if (r.group === 'fresh') rows.push(['fresh', r.file]); }
const only = process.env.ONLY;
fs.writeFileSync(OUT, '');
let ok = 0, n = 0;
for (const [g, f] of rows) {
  if (only && g !== only) continue;
  const text = fs.readFileSync(f, 'utf8');
  const t0 = Date.now();
  const r = veritasSEncode(text);
  n++; if (r.exact) ok++;
  const rec = { group: g, file: f, search: r.outTokens, dae: D[f]?.messageTokens ?? 0, entries: r.entries, exact: r.exact, bytes: Buffer.byteLength(text), trials: r.trials, ms: Date.now() - t0 };
  fs.appendFileSync(OUT, JSON.stringify(rec) + '\n');
}
console.log(JSON.stringify({ n, exact: ok, out: OUT }));
