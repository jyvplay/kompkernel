// Z31: for each real doc, which hard-wrap width W in [20,200] explains its multi-line paragraphs exactly (greedyWrap)?
// A paragraph = maximal run of non-empty lines with >= 2 lines. It "matches W" iff its lines equal greedyWrap(join(lines,' '), W).
import fs from 'node:fs';
import { greedyWrap } from '@/lib/omega/wrapcanon';
const [listFile, outFile] = process.argv.slice(2);
const files = fs.readFileSync(listFile, 'utf8').split('\n').filter(Boolean);
for (const f of files) {
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  const paras: string[][] = [];
  let cur: string[] = [];
  for (const l of lines) { if (l.trim() === '') { if (cur.length) paras.push(cur); cur = []; } else cur.push(l); }
  if (cur.length) paras.push(cur);
  const multi = paras.filter((p) => p.length >= 2);
  const hits = new Map<number, number>();
  let explained = 0;
  for (const p of multi) {
    const joined = p.join(' ');
    let any = false;
    for (let W = 20; W <= 200; W++) {
      if (greedyWrap(joined, W).join('\n') === p.join('\n')) { hits.set(W, (hits.get(W) ?? 0) + 1); any = true; }
    }
    if (any) explained++;
  }
  let bestW = 0, bestC = 0;
  for (const [W, c] of hits) if (c > bestC || (c === bestC && W < bestW)) { bestW = W; bestC = c; }
  fs.appendFileSync(outFile, JSON.stringify({ file: f, multi: multi.length, explained, bestW, bestC }) + '\n');
}
console.log('done', files.length);
