/** X82 — HOMALISMOS hypothesis.
 *  SYZEUXIS's own doc: "MORPHE's rules carry UNIFORMITY PRECONDITIONS ... `numpad` fires
 *  only when every decimal in scope has the same width ... one stray year vetoes the rule
 *  for all the others." No codec in the stack MANUFACTURES that uniformity; they only
 *  detect it. Test: zero-pad the integer part of each numeric column to the column's max
 *  width, declare the widths in positional order, and see whether the rules that were
 *  vetoed now fire. Adding characters to SAVE tokens is only sane if it wins -- measure. */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackFrontier } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';
const NUM = /(?<![\d.\w])(\d+)(?:\.(\d+))?(?![\d.])/g;

interface Job { path: string; }
const LANES: Job[] = [
  { path: 'bench/holdout-x41/ps-aux-real.txt' },
  { path: 'bench/holdout-x41/ls-l-real.txt' },
  { path: 'bench/holdout-x41/apt-real.txt' },
  { path: 'bench/holdout-x42/ps-ef.txt' },
  { path: 'bench/holdout-x41/ps-real.txt' },
  { path: 'bench/holdout-x42/findmnt.txt' },
  { path: 'bench/holdout-x42b/vmstat.txt' },
  { path: 'bench/holdout-x42/dpkg-l.txt' },
];
const out: any[] = [];
for (const { path } of LANES) {
  const S = fs.readFileSync('/home/user/kompkernel/' + path, 'utf8');
  const lines = S.split('\n');
  // ordinal position of each number in its line
  const pos: { line: number; m: RegExpExecArray; idx: number }[] = [];
  lines.forEach((l, i) => {
    NUM.lastIndex = 0; let m: RegExpExecArray | null; let k = 0;
    while ((m = NUM.exec(l)) !== null) { pos.push({ line: i, m, idx: k }); k++; }
  });
  const ncol = Math.max(...pos.map(p => p.idx)) + 1;
  // a column qualifies only if every content line carries it (skip comment/header lines)
  const content = lines.map((l, i) => ({ l, i })).filter(x => x.l.trim() && !x.l.startsWith('#'));
  const width: (number | null)[] = [];
  for (let j = 0; j < ncol; j++) {
    const cells = pos.filter(p => p.idx === j && content.some(c => c.i === p.line));
    const owners = new Set(cells.map(c => c.line));
    if (owners.size < content.length * 0.9) { width.push(null); continue; }
    width.push(Math.max(...cells.map(c => c.m[1].length)));
  }
  const padW = width.map(w => w ?? 0);
  // build padded text
  const T = lines.map((l, i) => {
    let k = 0;
    return l.replace(NUM, (m, int: string, frac?: string) => {
      const w = padW[k] ?? 0; k++;
      if (!w || int.length >= w) return m;
      return int.padStart(w, '0') + (frac !== undefined ? '.' + frac : '');
    });
  }).join('\n');
  // reverse: strip the padding we added (exact inverse of the positional rule)
  const unpad = (X: string) => X.split('\n').map((l, i) => {
    let k = 0;
    return l.replace(NUM, (m, int: string, frac?: string) => {
      const w = padW[k] ?? 0; k++;
      if (!w) return m;
      const stripped = int.replace(/^0+(?=\d)/, '');
      return (stripped.length ? stripped : int.slice(-1)) + (frac !== undefined ? '.' + frac : '');
    });
  }).join('\n');
  const rt = unpad(T) === S;
  const changed = padW.filter((w, j) => w && pos.some(p => p.idx === j && p.m[1].length < w)).length;
  const chars = T.length - S.length;
  const raw = countTokens(T, enc) - countTokens(S, enc);
  const base: any = tagstackFrontier(S, enc);
  const fT: any = tagstackFrontier(T, enc);
  const C = `§X82 integers zero-padded to ${padW.join(' ')} in positional order.`;
  const ct = countTokens(C, enc);
  const f: any = tagstackFrontier(C + '\n' + T, enc);
  console.log(`${path.split('/').pop()!.padEnd(20)} rt=${String(rt).padEnd(5)} colsPadded=${String(changed).padStart(2)} chars+${String(chars).padStart(4)} rawΔ${raw >= 0 ? '+' : ''}${String(raw).padStart(4)} | frontier(S)=${base.messageTokens} frontier(T)=${fT.messageTokens} (${fT.messageTokens - base.messageTokens >= 0 ? '+' : ''}${fT.messageTokens - base.messageTokens}) +contract ${ct} => ${f.messageTokens - base.messageTokens >= 0 ? '+' : ''}${f.messageTokens - base.messageTokens}`);
  out.push({ lane: path.split('/').pop(), rt, padW, chars, raw, F: base.messageTokens, FT: fT.messageTokens, contract: ct, net: f.messageTokens - base.messageTokens });
}
fs.writeFileSync('/home/user/kompkernel/bench/x82/receipts/homal.json', JSON.stringify(out, null, 1) + '\n');
