/**
 * X75 / t6 — CONTRACT AUDIT: what does the frontier's own decoder text cost, per lane,
 * and is it already the minimum-complete form (SYNTOMIA) or the long CHIRON form?
 */
import * as fs from 'node:fs';
import { countTokens as T } from '../../src/lib/omega/bpe';
import { tagstackFrontier } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';
const prev = JSON.parse(fs.readFileSync('bench/x72/receipts/stadion-broad.json', 'utf8'));
const F = new Map<string, number>(prev.rows.map((r: any) => [r.path, r.tokens]));
const CYR = /\p{Script=Cyrillic}/u;
for (const p of process.argv.slice(2)) {
  const t = fs.readFileSync(p, 'utf8');
  const r: any = tagstackFrontier(t, enc);
  const m: string = r.message;
  const lines = m.split('\n');
  // every line that is pure prose guidance (no digits, > 40 chars, ends with '.')
  const prose = lines.filter((l) => l.length > 40 && /\.$/.test(l.trim()) && !/\d/.test(l));
  const proseTok = prose.reduce((a, l) => a + T(l, enc), 0);
  const longChiron = prose.some((l) => /Every new Cyrillic letter/.test(l));
  const syntomia = prose.some((l) => /Before ¶ a new foreign letter labels/.test(l));
  console.log(`${p.split('/').pop()!.padEnd(20)} tok ${String(r.messageTokens).padStart(5)} proseLines ${String(prose.length).padStart(2)} proseTok ${String(proseTok).padStart(4)} (${(100 * proseTok / Math.max(1, r.messageTokens)).toFixed(0)}%) ${longChiron ? 'CHIRON-LONG' : syntomia ? 'SYNTOMIA' : '-'}`);
}
