/** X88 — ΣΥΝΤΆΞΙΣ red team. A decoder that cannot be trusted to REFUSE is worse than no
 *  codec: it hands a model a confident, wrong document. Every mutation must either throw
 *  SyntaxisRefused or reproduce the source byte for byte. A third outcome — different text,
 *  no error — is a SILENT WRONG and is the only failure that matters. A per-decode wall
 *  clock guard catches hangs. */
import * as fs from 'node:fs';
import { syntaxisEncode, syntaxisDecode } from '../../src/lib/omega/syntaxis';
const N = Number(process.env.SYNFUZZ_N ?? 40);
const LANES = ['bench/holdout-x41/ls-l-real.txt', 'bench/holdout-x41/apt-real.txt', 'bench/holdout-x41/ps-aux-real.txt',
  'bench/holdout-x86/ls-la-usrbin.txt', 'bench/holdout-x86/npm-ls-all.txt', 'bench/holdout-ops/openstack-loghub-26.log',
  'bench/holdout-ops/git-numstat.txt', 'bench/holdout-work/page.html', 'bench/holdout-tbl/psql-output.txt'];
let seed = 20261108;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length) % a.length];
const ALPHABET = 'abcdefgxyz0123456789 \t\n*¦|@§MWCTX:.=-,';
let refused = 0, noop = 0, silent = 0, hangs = 0, total = 0;
const silentExamples: string[] = [];
for (const p of LANES) {
  if (!fs.existsSync(p)) { console.log('missing', p); continue; }
  const S = fs.readFileSync(p, 'utf8');
  const r = syntaxisEncode(S, 'o200k_base' as any, null);
  if (!r.applied) { console.log(`${p.split('/').pop().padEnd(28)} REFUSED by encoder (${r.notes.slice(0, 60)})`); continue; }
  if (!r.exact) { console.log(`${p} ENCODER NOT EXACT — aborting`); process.exit(1); }
  const base = r.message;
  let lr = 0, ln = 0, ls = 0;
  for (let i = 0; i < N; i++) {
    let m = base;
    const kind = pick(['flip', 'del', 'ins', 'trunc', 'swapline', 'wdigit', 'mapchar', 'colval', 'dup']);
    const pos = Math.floor(rnd() * m.length);
    if (kind === 'flip') m = m.slice(0, pos) + pick([...ALPHABET]) + m.slice(pos + 1);
    else if (kind === 'del') m = m.slice(0, pos) + m.slice(pos + 1);
    else if (kind === 'ins') m = m.slice(0, pos) + pick([...ALPHABET]) + m.slice(pos);
    else if (kind === 'trunc') m = m.slice(0, Math.max(1, pos));
    else if (kind === 'dup') m = m.slice(0, pos) + m.slice(pos, pos + 40) + m.slice(pos);
    else {
      const L = m.split('\n');
      if (kind === 'swapline' && L.length > 4) { const a = 2 + Math.floor(rnd() * (L.length - 3)), b = 2 + Math.floor(rnd() * (L.length - 3)); [L[a], L[b]] = [L[b], L[a]]; }
      else if (kind === 'wdigit') { const w = L.findIndex((l) => l[0] === 'W'); if (w >= 0) L[w] = L[w].replace(/(\d+)$/, String(Math.floor(rnd() * 40))); }
      else if (kind === 'mapchar') { const mi = L.findIndex((l) => l[0] === 'M'); if (mi >= 0) { const s = L[mi]; const q = 1 + Math.floor(rnd() * (s.length - 1)); L[mi] = s.slice(0, q) + pick([...'ab*']) + s.slice(q + 1); } }
      else if (kind === 'colval') { const c = L.findIndex((l) => /^C[a-z0-9]\.\d+x/.test(l)); if (c >= 0 && c + 1 < L.length) L[c + 1] = L[c + 1] + pick([...ALPHABET]); }
      m = L.join('\n');
    }
    if (m === base) { ln++; noop++; continue; }
    total++;
    const t0 = Date.now();
    let got: string | null = null, threw = false;
    try { got = syntaxisDecode(m); } catch { threw = true; }
    if (Date.now() - t0 > 20000) { hangs++; console.log('HANG on', kind, p); continue; }
    if (threw) { lr++; refused++; }
    else if (got === S) { ln++; noop++; }
    else { ls++; silent++; if (silentExamples.length < 6) silentExamples.push(`${p.split('/').pop()} ${kind}: decoded ${got!.length}ch vs source ${S.length}ch`); }
  }
  console.log(`${p.split('/').pop().padEnd(28)} applied msg=${String(r.messageTokens).padStart(5)}tok  N=${N}  REFUSED=${lr}  NOOP=${ln}  SILENT-WRONG=${ls}`);
}
fs.writeFileSync('bench/x88/receipts/syntaxis-fuzz.json', JSON.stringify({ N, total, refused, noop, silent, hangs, silentExamples }, null, 1) + '\n');
console.log(`\n=== ΣΥΝΤΆΞΙΣ FUZZ: ${total} effective mutations, REFUSED ${refused}, no-op ${noop}, SILENT-WRONG ${silent}, hangs ${hangs} ===`);
console.log(silent ? `SILENT EXAMPLES:\n  ${silentExamples.join('\n  ')}` : 'no silent wrong decodes: every effective mutation either refused or reproduced the source exactly');
