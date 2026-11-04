/** t16: the generator ceiling on every table lane, INCLUDING patched programs
 *  (an AP that is right except on a short patch list) — X73's own stated limit. */
import * as fs from 'node:fs';
import { countTokens as T } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
const prev = JSON.parse(fs.readFileSync('bench/x72/receipts/stadion-broad.json','utf8'));
const F = new Map<string, number>(prev.rows.map((r: any) => [r.path, r.tokens]));

function numParse(tok: string) { const m = /^(-?)(\d+)(?:\.(\d+))?$/.exec(tok); if (!m) return null;
  return { neg: m[1] === '-', int: m[2], dec: m[3] ?? '', units: Math.round(Number(tok) * Math.pow(10, (m[3] ?? '').length)), decN: (m[3] ?? '').length, width: m[2].length }; }
function numRender(f: any, units: number) { const neg = units < 0, a = Math.abs(units);
  const s = f.decN === 0 ? String(a).padStart(f.width, '0') : `${String(Math.floor(a / 10 ** f.decN)).padStart(f.width, '0')}.${String(a % 10 ** f.decN).padStart(f.decN, '0')}`;
  return (neg ? '-' : '') + s; }

/** best program for one column, with patch support */
function program(vals: string[]): { spec: string; tok: number } {
  const R = vals.length; const uniq = [...new Set(vals)];
  const cands: string[] = [];
  if (uniq.length === 1) cands.push('=' + vals[0]);
  for (let p = 1; p <= Math.min(8, Math.floor(R / 2)); p++) { const L = vals.slice(0, p); if (vals.every((v, i) => v === L[i % p])) { cands.push(L.join('|') + '*'); break; } }
  // numeric AP with patches: try base = value at row 0, step = the modal step
  const nums = vals.map(numParse);
  if (nums.every(n => n !== null)) {
    const steps = new Map<number, number>();
    for (let i = 1; i < R; i++) { const d = nums[i]!.units - nums[i - 1]!.units; steps.set(d, (steps.get(d) ?? 0) + 1); }
    for (const [step] of [...steps.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)) {
      const base = { ...nums[0]!, width: Math.min(...nums.map(n => n!.width)) };
      const patches: string[] = [];
      for (let i = 0; i < R; i++) { const want = numRender(base, base.units + step * i); if (want !== vals[i]) patches.push(`${i}:${vals[i]}`); }
      const stepStr = (step >= 0 ? '+' : '-') + numRender({ ...base, width: 1 }, Math.abs(step));
      cands.push(`${numRender(base, base.units)}${stepStr}*r` + (patches.length ? `!${patches.join(',')}` : ''));
    }
    // second-order AP (constant delta-of-delta)
    if (R >= 4) {
      const d1 = nums.slice(1).map((n, i) => n!.units - nums[i]!.units);
      const dd = d1.slice(1).map((x, i) => x - d1[i]);
      if (dd.length && dd.every(x => x === dd[0]) && dd[0] !== 0) {
        const base = { ...nums[0]!, width: Math.min(...nums.map(n => n!.width)) };
        const patches: string[] = [];
        for (let i = 0; i < R; i++) { const want = numRender(base, base.units + d1[0] * i + dd[0] * i * (i - 1) / 2); if (want !== vals[i]) patches.push(`${i}:${vals[i]}`); }
        cands.push(`${numRender(base, base.units)}${(d1[0] >= 0 ? '+' : '-')}${Math.abs(d1[0])}r${(dd[0] >= 0 ? '+' : '-')}${Math.abs(dd[0])}r2` + (patches.length ? `!${patches.join(',')}` : ''));
      }
    }
  }
  // dictionary + index
  if (uniq.length <= 62 && uniq.length < R) { const idx = vals.map(v => '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'[uniq.indexOf(v)]).join(''); cands.push(uniq.join('|') + ';' + idx); }
  cands.push(vals.join('|'));
  let best = cands[0], bt = T(cands[0], enc);
  for (const c of cands.slice(1)) { const t = T(c, enc); if (t < bt) { best = c; bt = t; } }
  return { spec: best, tok: bt };
}
const SEPS = [' | ', '\t', ', ', '; ', ',', ';', '  ', '|'];
for (const p of process.argv.slice(2)) {
  const t = fs.readFileSync(p, 'utf8');
  const tail = t.endsWith('\n') ? '\n' : '';
  const lines = (tail ? t.slice(0, -1) : t).split('\n');
  let bestAll: any = null;
  for (const sep of SEPS) {
    const rows = lines.map(l => l.split(sep));
    const k = rows[0].length;
    if (k < 2 || !rows.every(r => r.length === k) || !rows.every((r, i) => r.join(sep) === lines[i])) continue;
    const body = rows.slice(1);
    const progs = Array.from({ length: k }, (_, c) => program(body.map(r => r[c])));
    const total = 12 + progs.reduce((a, b) => a + b.tok, 0);
    if (!bestAll || total < bestAll.total) bestAll = { total, sep, k, progs, rows: body.length, header: lines[0] };
  }
  if (!bestAll) { console.log(`${p.split('/').pop()!.padEnd(22)} not a uniform table`); continue; }
  const f = F.get(p) ?? 0;
  console.log(`${p.split('/').pop()!.padEnd(22)} raw ${String(T(t,enc)).padStart(4)} frontier ${String(f).padStart(4)} | GEN ${String(bestAll.total).padStart(4)} (${bestAll.rows}x${bestAll.k}) delta ${String(bestAll.total - f).padStart(5)} | ${bestAll.progs.map((x: any) => x.spec.slice(0, 26)).join('  ~  ')}`);
}
