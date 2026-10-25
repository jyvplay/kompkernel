/** X43 probe: where do the tokens actually go in PROSE, and which channels are free? */
import * as fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
const ENC: any = 'o200k_base';
const lanes = (process.env.LANES || '').split(',').filter(Boolean);
const T = (s: string) => countTokens(s, ENC);
for (const p of lanes) {
  const t = fs.readFileSync(p, 'utf8');
  const raw = T(t);
  // channel masses: measure by REMOVAL (what the channel costs as tokens)
  const noUpper = t.replace(/[A-Z]/g, (c) => c.toLowerCase());
  const noPunct = t.replace(/[^\w\s]/g, '');
  const words = t.match(/[A-Za-z']+/g) ?? [];
  const types = new Map<string, number>();
  for (const w of words) types.set(w.toLowerCase(), (types.get(w.toLowerCase()) ?? 0) + 1);
  const once = [...types.values()].filter((n) => n === 1).length;
  // uppercase positions: how many are explainable by "after . ! ? \n" or the word I
  const caps = [...t.matchAll(/(?<![A-Za-z])[A-Z]/g)].map((m) => m.index!);
  let ruleCovered = 0;
  for (const i of caps) {
    let j = i - 1;
    while (j >= 0 && (t[j] === ' ' || t[j] === '"' || t[j] === '(' || t[j] === '\u201c')) j--;
    const prev = j >= 0 ? t[j] : '\n';
    const wordI = /^I(?![A-Za-z])/.test(t.slice(i));
    if ('.!?\n'.includes(prev) || wordI) ruleCovered++;
  }
  console.log(p.split('/').pop()!.padEnd(22),
    'raw=' + String(raw).padStart(4),
    'lower=' + String(T(noUpper)).padStart(4),
    'noPunct=' + String(T(noPunct)).padStart(4),
    'words=' + String(words.length).padStart(4),
    'types=' + String(types.size).padStart(4),
    'hapax=' + String(once).padStart(4),
    'caps=' + String(caps.length).padStart(4),
    'capRule=' + (100 * ruleCovered / Math.max(1, caps.length)).toFixed(0) + '%');
}
