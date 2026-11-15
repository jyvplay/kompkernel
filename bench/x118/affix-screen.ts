/** X118 frontier screen: vertical character-affix residual (bidirectional,
 * multi-donor). COMPLETE-message gate in one process. Scratch falsification
 * harness; the mechanism is only promoted to src/ if the strict gate clears.
 * Run: bash bench/x15/run.sh bench/x118/affix-screen.ts <lane> [lane...]
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackEncode, tagstackFrontier } from '../../src/lib/omega/tagstack';
const enc = 'o200k_base' as const;
const T = (s: string) => countTokens(s, enc);
const MARKS = ['¤', '†', '‡', '¦', '¬', '÷', '¡', '¿', '¥', '£', '€', '©', '®', '♦', '♥', '♪', '♫', '★', '☆', '☎', '✓', '✔', '✨'];
const KEY = (m: string) => `${m}k,p/rest = first p chars of field k lines above + rest; ${m}k,s/head = head + last p chars of that field.`;
function rewrite(text: string, m: string): { wire: string; hits: number } {
  const lines = text.split('\n'); const fields = lines.map(l => l.split(/(\s+)/)); let hits = 0;
  const out = lines.map((line, i) => {
    const parts = line.split(/(\s+)/); let j = 0;
    for (let p = 0; p < parts.length; p += 2) {
      const f = parts[p]!; if (!f) { continue; }
      let best: { rep: string; n: number } | null = null;
      for (let k = 1; k <= Math.min(8, i); k++) {
        const prev = fields[i - k]!; let q = -1; let jj = 0;
        for (let pp = 0; pp < prev.length; pp += 2) { if (prev[pp] === '') continue; if (jj === j) { q = pp; break; } jj++; }
        const r = q >= 0 ? prev[q] : undefined; if (!r) { j++; continue; }
        let pre = 0; while (pre < f.length && pre < r.length && f[pre] === r[pre]) pre++;
        let suf = 0; while (suf < f.length - pre && suf < r.length - pre && f[f.length - 1 - suf] === r[r.length - 1 - suf]) suf++;
        if (pre >= 6 && pre > (best?.n ?? 0)) best = { n: pre, rep: `${m}${k},p${pre}/${f.slice(pre)}` };
        if (suf >= 6 && suf > (best?.n ?? 0)) best = { n: suf, rep: `${m}${k},s${suf}/${f.slice(0, f.length - suf)}` };
      }
      if (best && T(best.rep) < T(f)) { parts[p] = best.rep; hits++; }
      j++;
    }
    return parts.join('');
  });
  return { wire: out.join('\n'), hits };
}
function inverse(body: string, m: string): string {
  const ls = body.split('\n'); const dec: string[] = [];
  const esc = m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp('^' + esc + '(\\d+),([ps])(\\d+)/(.*)$');
  for (const line of ls) {
    const parts = line.split(/(\s+)/); let j = 0;
    for (let p = 0; p < parts.length; p += 2) {
      const f = parts[p]!; if (!f) continue;
      const h = re.exec(f);
      if (h) {
        const k = +h[1]!, dir = h[2], n = +h[3]!, rest = h[4]!; const ref = dec[dec.length - k]; if (ref === undefined) throw Error('bad affix ref');
        const rf = ref.split(/(\s+)/).filter((s, idx) => idx % 2 === 0 && s !== ''); const src = rf[j]; if (src === undefined) throw Error('bad affix field');
        parts[p] = dir === 'p' ? src.slice(0, n) + rest : rest + src.slice(src.length - n);
      }
      j++;
    }
    dec.push(parts.join(''));
  }
  return dec.join('\n');
}
const rows: any[] = [];
for (const p of process.argv.slice(2)) {
  const text = fs.readFileSync(p, 'utf8');
  const m = MARKS.find(c => !text.includes(c) && T(c) === 1);
  if (!m) { rows.push({ path: p, refuse: 'no marker' }); continue; }
  const t0 = Date.now(); const base = tagstackEncode(text, enc); const t1 = Date.now();
  const rw = rewrite(text, m);
  if (!rw.hits) { rows.push({ path: p, refuse: 'no profitable affix', baseTokens: base.messageTokens, baseMs: t1 - t0 }); continue; }
  const own = inverse(rw.wire, m) === text;
  const inner = tagstackFrontier(rw.wire, enc); const t2 = Date.now();
  const message = KEY(m) + '\n' + inner.message; const tokens = T(message);
  const decoded = inverse(inner.decoded, m);
  const row = { path: p, marker: m, hits: rw.hits, keyTokens: T(KEY(m)), baseTokens: base.messageTokens, baseExact: base.decoded === text, baseParent: base.parentCodec, baseMs: t1 - t0, innerTokens: inner.messageTokens, innerExact: inner.decoded === rw.wire, innerParent: inner.parentCodec, innerMs: t2 - t1, ownInverse: own, composedExact: decoded === text, candidateTokens: tokens, delta: tokens - base.messageTokens, admitted: own && inner.decoded === rw.wire && decoded === text && tokens < base.messageTokens };
  rows.push(row);
  console.log(JSON.stringify(row));
}
fs.mkdirSync('bench/x118/receipts', { recursive: true });
fs.writeFileSync('bench/x118/receipts/affix-screen.json', JSON.stringify({ schema: 'kompkernel-x118-affix-frontier-screen-v1', rows }, null, 2) + '\n');
