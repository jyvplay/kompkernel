/**
 * X42 screen 9 — the untested gap: prose-02..12 were NEVER passed through
 * SYSTOLE. X41 tested only prose-01. The anatomy screen shows prose-05 carries
 * 287 digit characters costing 125 payload tokens and prose-02 carries 158 for
 * 72, which is far more structured-number content than prose-01 had. Question:
 * does SYSTOLE's template machinery find anything there?
 * Cheap: no stack encode.
 */
import { readFileSync } from 'node:fs';
import { systoleRuns, systoleShapeOf, systoleDigits } from '@/lib/omega/systole';
import { apocopeFind } from '@/lib/omega/apocope';
import { countTokens, type EncodingName } from '@/lib/omega/bpe';

const enc = (process.env.ENC || 'o200k_base') as EncodingName;
const SEP = new Set(['.', ':', ';', '-']);

for (const p of (process.env.LANES || '').split(',').map((s) => s.trim()).filter(Boolean)) {
  const t = readFileSync(p, 'utf8');
  const nm = p.split('/').pop()!;
  const runs = systoleRuns(t);
  const shapes = new Map<string, { n: number; save: number; ex: string }>();
  let runChars = 0;
  for (const r of runs) {
    runChars += r.s.length;
    const sh = systoleShapeOf(r.s);
    const d = systoleDigits(sh);
    if (d < 3) continue;
    const stripped = [...r.s].filter((c) => !SEP.has(c)).join('');
    const save = countTokens(r.s, enc) - countTokens(stripped, enc);
    const e = shapes.get(sh) ?? { n: 0, save: 0, ex: r.s };
    e.n++; e.save += save; shapes.set(sh, e);
  }
  const tot = [...shapes.values()].reduce((s, v) => s + v.save, 0);
  const apo = apocopeFind(t, enc);
  console.log(`${nm.padEnd(15)} runs=${String(runs.length).padStart(4)} runChars=${String(runChars).padStart(4)} systoleRaw=${String(tot).padStart(4)} apoCands=${apo.length}`);
  const top = [...shapes.entries()].sort((a, b) => b[1].save - a[1].save).slice(0, 4);
  for (const [sh, v] of top) {
    if (v.save <= 0) continue;
    console.log(`     ${sh.padEnd(12)} n=${String(v.n).padStart(3)} save=${String(v.save).padStart(4)}  e.g. ${v.ex}`);
  }
}
