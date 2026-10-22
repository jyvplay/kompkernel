// X39 screen 2: for every lane, for every candidate delimiter character,
// measure the token delta of (a) replacing it with a space and (b) deleting it.
// Reports per-occurrence savings so the mechanism can be judged honestly:
// a big total on a char that occurs 3,000 times is a different proposition
// from one on a char that occurs 60 times.
import { readFileSync } from 'node:fs';
import { encode } from 'gpt-tokenizer';

const lanes = (process.env.LANES ?? '').split(',').filter(Boolean);

const CANDIDATES = [
  '\t', '|', ',', ';', ':', '=', '"', "'", '(', ')', '[', ']', '{', '}',
  '<', '>', '/', '\\', '-', '_', '*', '#', '@', '&', '%', '+', '~', '^', '!', '?',
  '│', '├', '└', '─', '·', '•', '\r',
];

const tok = (s: string) => encode(s).length;

for (const path of lanes) {
  const text = readFileSync(path, 'utf8');
  const base = tok(text);
  const name = path.split('/').pop()!;
  const hits: Array<[string, number, number, number]> = []; // char, count, dSpace, dDel

  for (const c of CANDIDATES) {
    let n = 0;
    for (let i = 0; i < text.length; i++) if (text[i] === c) n++;
    if (n === 0) continue;
    const toSpace = tok(text.split(c).join(' '));
    const deleted = tok(text.split(c).join(''));
    hits.push([c, n, toSpace - base, deleted - base]);
  }

  // best by total saving (replacement with space)
  hits.sort((a, b) => a[2] - b[2]);
  const top = hits.slice(0, 4)
    .filter(([, , d]) => d < 0)
    .map(([c, n, d, dd]) => {
      const ch = c === '\t' ? '\\t' : c === '\r' ? '\\r' : c;
      return `${ch}x${n}:${d}(${(d / n).toFixed(2)}/ea,del${dd})`;
    })
    .join('  ');

  console.log(`${name.padEnd(28)} raw=${String(base).padStart(5)}  ${top || '(no win)'}`);
}
