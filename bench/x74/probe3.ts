/** X74 probe 3: candidate mechanisms measured on raw token cost, all lanes. */
import * as fs from 'node:fs';
import { countTokens as T } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';

/** greedy re-wrap: join the lines of each paragraph, then fill to width W */
function rewrap(t: string, W: number): string | null {
  const tail = t.endsWith('\n') ? '\n' : '';
  const body = tail ? t.slice(0, -1) : t;
  const paras = body.split(/\n{2,}/);
  const out: string[] = [];
  for (const p of paras) {
    const words = p.split(/\s+/).filter(Boolean);
    let line = '';
    const lines: string[] = [];
    for (const w of words) {
      if (line === '') line = w;
      else if (line.length + 1 + w.length <= W) line += ' ' + w;
      else { lines.push(line); line = w; }
    }
    if (line) lines.push(line);
    out.push(lines.join('\n'));
  }
  return out.join('\n\n') + tail;
}
for (const p of process.argv.slice(2)) {
  const t = fs.readFileSync(p, 'utf8');
  const raw = T(t, enc);
  const dewrap = t.split(/\n{2,}/).map(par => par.replace(/\n/g, ' ')).join('\n\n');
  let best: { W: number; tok: number; exact: boolean } | null = null;
  for (let W = 40; W <= 130; W++) {
    const r = rewrap(t, W);
    if (r === null) continue;
    const exact = r === t;
    const tok = T(r, enc);
    if (!best || (exact && !best.exact) || (exact === best.exact && tok < best.tok)) best = { W, tok, exact };
  }
  const lens = t.split('\n').slice(0, -1).map(l => l.length);
  const lenList = lens.join(' ');
  console.log(`${p.split('/').pop()!.padEnd(22)} raw ${String(raw).padStart(4)} dewrap ${String(T(dewrap,enc)).padStart(4)} bestW ${best?.exact?'EXACT':'nope'} W=${best?.W} ${best?.tok} (${(best?.tok??0)-raw}) | lenlist ${T(lenList,enc)} tok`);
}
