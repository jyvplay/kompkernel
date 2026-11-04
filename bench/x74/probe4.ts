/** X74 probe 4: is the hard wrap a SINGLE width?
 *  For a paragraph filled greedily at width W: every line L must satisfy
 *  len(L) <= W  and  len(L)+1+len(firstWord(next)) > W  (unless next is the last).
 *  Intersect the intervals; if non-empty, one integer explains every break.
 */
import * as fs from 'node:fs';
import { countTokens as T } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
function fill(par: string, W: number): string[] {
  const words = par.split(/\s+/).filter(Boolean);
  const out: string[] = []; let line = '';
  for (const w of words) {
    if (!line) line = w;
    else if (line.length + 1 + w.length <= W) line += ' ' + w;
    else { out.push(line); line = w; }
  }
  if (line) out.push(line);
  return out;
}
for (const p of process.argv.slice(2)) {
  const t = fs.readFileSync(p, 'utf8');
  const tail = t.endsWith('\n') ? '\n' : '';
  const body = tail ? t.slice(0, -1) : t;
  const paras = body.split(/\n{2,}/);
  const raw = T(t, enc);
  // find W candidates that reproduce every paragraph exactly
  const ok: number[] = [];
  for (let W = 20; W <= 200; W++) {
    if (paras.every(par => fill(par, W).join('\n') === par)) ok.push(W);
  }
  // also: allow one global W with per-paragraph "no wrap" if a paragraph has no newline
  const nowrap = paras.filter(par => !par.includes('\n')).length;
  const dewrap = paras.map(par => par.replace(/\n/g, ' ')).join('\n\n') + tail;
  console.log(`${p.split('/').pop()!.padEnd(24)} raw ${String(raw).padStart(4)} dewrap ${String(T(dewrap,enc)).padStart(4)} singleW ${ok.length ? '['+ok[0]+'..'+ok[ok.length-1]+'] '+ok.length+' vals' : 'NONE'} paras ${paras.length} unwrapped ${nowrap} | W-cost ${T('W='+ (ok[0]??0), enc)}`);
}
