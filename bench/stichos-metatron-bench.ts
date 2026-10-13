/**
 * bench/stichos-metatron-bench.ts — STICHOS∘METATRON vs METATRON, on every real
 * file where the greedy layout explains ≥ MIN_WRAPPED blocks (METATRON is slow;
 * only layout-rich files are measured, and the selection rule is printed).
 */
import fs from 'node:fs';
import path from 'node:path';
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';
import { metatronEncode } from '../src/lib/omega/metatron';
import { stichosLayoutStats, stichosMetatronEncode, stichosMetatronDecode } from '../src/lib/omega/stichos';

const ENC: EncodingName = 'o200k_base';
const MIN_WRAPPED = 5;
const files: Array<[string, string]> = [];
const seen = new Set<string>();
const walk = (dir: string, depth: number) => {
  if (depth > 6 || !fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, depth + 1);
    else if (/\.(md|txt|markdown)$/i.test(e.name) || /^(LICENSE|LICENCE|NOTICE|AUTHORS|CHANGELOG)/i.test(e.name)) {
      const st = fs.statSync(p);
      if (st.size >= 400 && st.size <= 12000) {
        const t = fs.readFileSync(p, 'utf8');
        const key = t.length + ':' + t.slice(0, 200);
        if (seen.has(key)) continue; // identical copies measured once
        seen.add(key);
        files.push([p, t]);
      }
    }
  }
};
for (const d of ['bench/holdout', 'bench/holdout-work', 'bench/holdout-tbl', 'bench/holdout-mk', 'bench/holdout-lang', 'bench/holdout-ops']) {
  if (!fs.existsSync(d)) continue;
  for (const f of fs.readdirSync(d).sort()) files.push([`${d}/${f}`, fs.readFileSync(path.join(d, f), 'utf8')]);
}
walk('node_modules', 0);

const selected = files.filter(([, t]) => { const s = stichosLayoutStats(t); return s !== null && s.wrapped >= MIN_WRAPPED; });
console.log(`corpus(distinct)=${files.length}  selection: greedy-layout wrapped blocks ≥ ${MIN_WRAPPED}  → selected=${selected.length}`);
let sumRaw = 0, sumMeta = 0, sumSt = 0, wins = 0;
for (const [name, text] of selected) {
  const t0 = Date.now();
  const raw = countTokens(text, ENC);
  let meta = raw, metaOk = false;
  try { const m = metatronEncode(text, ENC, { budgetMs: 60000 } as any); if (m.decoded === text) { meta = Math.min(raw, m.messageTokens); metaOk = true; } } catch { /* keep raw */ }
  const s = stichosMetatronEncode(text, ENC, 60000);
  const ok = stichosMetatronDecode(s.wire) === text || s.winner === 'raw';
  sumRaw += raw; sumMeta += meta; sumSt += s.messageTokens;
  const d = s.messageTokens - meta;
  if (d < -3) wins++;
  console.log(`${name.padEnd(72)} raw=${String(raw).padStart(5)} metatron=${String(meta).padStart(5)}${metaOk ? '' : '(raw?)'} stichos∘metatron=${String(s.messageTokens).padStart(5)} winner=${s.winner} exact=${ok} Δ=${d} (${Date.now() - t0}ms)`);
}
console.log(`\nselected=${selected.length}  strict wins (Δ<−3 vs METATRON)=${wins}`);
console.log(`totals: raw=${sumRaw} METATRON=${sumMeta} STICHOS∘METATRON=${sumSt} Δ=${sumSt - sumMeta} (${(((sumMeta - sumSt) / sumMeta) * 100).toFixed(2)}% smaller)`);
