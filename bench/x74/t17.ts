/** t17: generator body + the frontier as residual coder. */
import * as fs from 'node:fs';
import { countTokens as T } from '../../src/lib/omega/bpe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';
const prev = JSON.parse(fs.readFileSync('bench/x72/receipts/stadion-broad.json','utf8'));
const F = new Map<string, number>(prev.rows.map((r: any) => [r.path, r.tokens]));
function numParse(tok: string) { const m = /^(-?)(\d+)(?:\.(\d+))?$/.exec(tok); if (!m) return null;
  return { units: Math.round(Number(tok) * Math.pow(10, (m[3] ?? '').length)), decN: (m[3] ?? '').length, width: m[2].length }; }
function numRender(f: any, units: number) { const neg = units < 0, a = Math.abs(units);
  const s = f.decN === 0 ? String(a).padStart(f.width, '0') : `${String(Math.floor(a / 10 ** f.decN)).padStart(f.width, '0')}.${String(a % 10 ** f.decN).padStart(f.decN, '0')}`;
  return (neg ? '-' : '') + s; }
function program(vals: string[], enc: any): string {
  const R = vals.length; const uniq = [...new Set(vals)]; const cands: string[] = [];
  if (uniq.length === 1) cands.push('=' + vals[0]);
  for (let p = 1; p <= Math.min(8, Math.floor(R / 2)); p++) { const L = vals.slice(0, p); if (vals.every((v, i) => v === L[i % p])) { cands.push(L.join('|') + '*'); break; } }
  const nums = vals.map(numParse);
  if (nums.every(n => n !== null)) {
    const steps = new Map<number, number>();
    for (let i = 1; i < R; i++) { const d = nums[i]!.units - nums[i - 1]!.units; steps.set(d, (steps.get(d) ?? 0) + 1); }
    for (const [step] of [...steps.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2)) {
      const base = { ...nums[0]!, width: Math.min(...nums.map(n => n!.width)) };
      const patches: string[] = [];
      for (let i = 0; i < R; i++) if (numRender(base, base.units + step * i) !== vals[i]) patches.push(`${i}:${vals[i]}`);
      cands.push(`${numRender(base, base.units)}${step >= 0 ? '+' : '-'}${numRender({ ...base, width: 1 }, Math.abs(step))}*r` + (patches.length ? `!${patches.join(',')}` : ''));
    }
  }
  if (uniq.length <= 62 && uniq.length < R) cands.push(uniq.join('|') + ';' + vals.map(v => '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'[uniq.indexOf(v)]).join(''));
  cands.push(vals.join('|'));
  let best = cands[0], bt = T(cands[0], enc);
  for (const c of cands.slice(1)) { const t = T(c, enc); if (t < bt) { best = c; bt = t; } }
  return best;
}
const SEPS = [' | ', '\t', ', ', '; ', ',', ';', '  ', '|'];
for (const p of process.argv.slice(2)) {
  const t = fs.readFileSync(p, 'utf8');
  const tail = t.endsWith('\n') ? '\n' : '';
  const lines = (tail ? t.slice(0, -1) : t).split('\n');
  let best: any = null;
  for (const sep of SEPS) {
    const rows = lines.map(l => l.split(sep));
    const k = rows[0].length;
    if (k < 2 || !rows.every(r => r.length === k) || !rows.every((r, i) => r.join(sep) === lines[i])) continue;
    const body = rows.slice(1);
    const progs = Array.from({ length: k }, (_, c) => program(body.map(r => r[c]), enc));
    const gen = progs.join('\n');
    if (!best) best = { gen, k, rows: body.length, progs, sep };
  }
  if (!best) { console.log(`${p.split('/').pop()!.padEnd(22)} not a uniform table`); continue; }
  const g = tagstackEncode(best.gen, enc);
  const f = F.get(p) ?? 0;
  console.log(`${p.split('/').pop()!.padEnd(22)} raw ${String(T(t,enc)).padStart(4)} frontier ${String(f).padStart(4)} | genRaw ${String(T(best.gen,enc)).padStart(4)} gen->F ${String(g.messageTokens).padStart(4)} (${g.parentCodec}) + key ~40 = ${g.messageTokens + 40} delta ${g.messageTokens + 40 - f}`);
}
