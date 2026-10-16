/**
 * X20: TYPOS configuration screen (forward transform only, tokenizer-only cost model).
 * For each lane and each config, report the shape set and the estimated net saving
 *     est = tok(input) - tok(transformed) - tok(contract sentence)
 * which is the gross upper bound before DAEDALUS. usage: bench/x20/run.sh bench/x20/typos-screen.ts <lanes>
 */
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { typosPlans, typosContract, TYPOS_SEPS, TYPOS_SEPS_WIDE } from '@/lib/omega/typos';

const enc = 'o200k_base' as const;
const CONFIGS: Array<[string, any]> = [
  ['narrow', { seps: TYPOS_SEPS, minCount: 2 }],
  ['narrow3', { seps: TYPOS_SEPS, minCount: 3 }],
  ['wide', { seps: TYPOS_SEPS_WIDE, minCount: 2 }],
  ['wide3', { seps: TYPOS_SEPS_WIDE, minCount: 3 }],
  ['nospace-noT', { seps: '-:./', minCount: 2 }],
];
const lanes = fs.readFileSync(process.argv[2], 'utf8').trim().split('\n').filter(Boolean);
const tot = new Map<string, number>(CONFIGS.map(c => [c[0], 0]));
const wins = new Map<string, number>(CONFIGS.map(c => [c[0], 0]));
console.log(['lane', ...CONFIGS.map(c => c[0])].join('\t'));
for (const f of lanes) {
  let text: string;
  try { text = fs.readFileSync(f, 'utf8'); } catch { continue; }
  const raw = countTokens(text, enc);
  const row = [f.split('/').pop() ?? f];
  for (const [name, cfg] of CONFIGS) {
    const plans = typosPlans(text, { ...cfg, enc });
    if (!plans.length) { row.push('.'); continue; }
    const fw = plans[0];
    const g = fw.est;
    tot.set(name, (tot.get(name) ?? 0) + Math.max(0, g));
    if (g > 0) wins.set(name, (wins.get(name) ?? 0) + 1);
    row.push(`${g}/${fw.shapes.length}s/${fw.occurrences}o/${fw.mode[0]}[${plans.map(p => p.mode[0] + p.est).join(' ')}]`);
  }
  console.log(row.join('\t'));
}
console.log(['TOTAL', ...CONFIGS.map(([n]) => `${tot.get(n)}(${wins.get(n)}w)`)].join('\t'));
