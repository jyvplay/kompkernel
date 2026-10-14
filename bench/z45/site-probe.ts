import fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
const enc = (process.env.ENC || 'o200k_base') as any;
// per-site gain of fusing ", word" -> ",word" and ". Word" -> ".Word", bucketed by following word length and by word
const byLen = new Map<number, { n: number; g: number }>();
const byWord = new Map<string, { n: number; g: number }>();
const byLenP = new Map<number, { n: number; g: number }>();
const byWordP = new Map<string, { n: number; g: number }>();
for (const f of process.argv.slice(2)) {
  const t = fs.readFileSync(f, 'utf8');
  const re = /([,.!?]) ([A-Za-z]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(t))) {
    const p = m[1], w = m[2];
    if (p === ',' && !/^[a-z]/.test(w)) continue;
    if (p !== ',' && !/^[A-Z]/.test(w)) continue;
    // local context: 6 chars before, word + 1 char after to capture tokenization context
    const pre = t.slice(Math.max(0, m.index - 12), m.index);
    const post = t.slice(m.index + m[0].length, m.index + m[0].length + 1);
    const a = countTokens(pre + p + ' ' + w + post, enc);
    const b = countTokens(pre + p + w + post, enc);
    const g = a - b;
    const L = Math.min(w.length, 10);
    const ml = p === ',' ? byLen : byLenP; const mw = p === ',' ? byWord : byWordP;
    const e = ml.get(L) || { n: 0, g: 0 }; e.n++; e.g += g; ml.set(L, e);
    const key = p === ',' ? w.toLowerCase() : w;
    const e2 = mw.get(key) || { n: 0, g: 0 }; e2.n++; e2.g += g; mw.set(key, e2);
  }
}
const show = (name: string, ml: Map<number, any>, mw: Map<string, any>) => {
  console.log(`\n== ${name} by following-word length:`);
  for (const L of [...ml.keys()].sort((a, b) => a - b)) console.log(`  len${L}: sites=${ml.get(L).n} gain=${ml.get(L).g}`);
  const ws = [...mw.entries()].sort((a, b) => b[1].g - a[1].g);
  console.log('  top words: ' + ws.slice(0, 25).map(([w, e]) => `${w}:${e.g}/${e.n}`).join(' '));
  console.log('  negative words: ' + ws.filter(([, e]) => e.g < 0).slice(-25).map(([w, e]) => `${w}:${e.g}/${e.n}`).join(' '));
  const neg = ws.filter(([, e]) => e.g < 0).reduce((s, [, e]) => s + e.g, 0);
  console.log(`  total negative = ${neg}, total = ${ws.reduce((s, [, e]) => s + e.g, 0)}`);
};
show('COMMA', byLen, byWord); show('PERIOD', byLenP, byWordP);
