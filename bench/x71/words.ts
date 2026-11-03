import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
const T = (s: string) => countTokens(s, enc);
for (const p of process.argv.slice(2)) {
  const text = fs.readFileSync(p, 'utf8');
  const raw = T(text);
  const words = text.split(/(\s+)/);
  const freq = new Map<string, number>();
  for (const w of words) if (w.trim()) freq.set(w, (freq.get(w) ?? 0) + 1);
  const rows = [...freq.entries()].map(([w, c]) => ({ w, c, t: T(w) }))
    .sort((a, b) => (b.t - 1) * (b.c - 1) - (a.t - 1) * (a.c - 1));
  // oracle: every word may take a 1-token code, paying 2 tokens once (marker+def)
  let sav = 0, used = 0;
  for (const r of rows) { const s = r.c * (r.t - 1) - 2; if (s > 0) { sav += s; used++; } }
  // same but only words of cost>=3 (cheap words can't pay)
  let sav3 = 0, u3 = 0;
  for (const r of rows) if (r.t >= 3) { const s = r.c * (r.t - 1) - 2; if (s > 0) { sav3 += s; u3++; } }
  // bigram phrases
  const toks = text.split(/\s+/).filter(Boolean);
  const bg = new Map<string, number>();
  for (let i = 0; i + 1 < toks.length; i++) { const k = toks[i] + ' ' + toks[i + 1]; bg.set(k, (bg.get(k) ?? 0) + 1); }
  let bsav = 0, bused = 0;
  for (const [k, c] of bg) { if (c < 2) continue; const t = T(k); const s = c * (t - 1) - 3; if (s > 0) { bsav += s; bused++; } }
  console.log(`${p}\n  raw ${raw}  words ${toks.length} distinct ${freq.size}  |  word-oracle -${sav} (${used} codes)  cost>=3 -${sav3} (${u3})  bigram-oracle -${bsav} (${bused})`);
  console.log('  top word savings: ' + rows.slice(0, 8).map(r => `${JSON.stringify(r.w)}x${r.c}(t${r.t})=${r.c * (r.t - 1) - 2}`).join(' '));
}
