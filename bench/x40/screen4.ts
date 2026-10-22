// X40 screen 4: does the prose dead end survive a WIDER pool?
//
// ANTISTROPHE and PERITROPE so far use ASCII punctuation, space and tab. But a
// character can be cheap to the tokenizer and rare in a given document at the
// same time -- that is the whole premise. Published English prose is full of
// curly apostrophes, em dashes and ellipses, so o200k_base has merges for them;
// most plain-text documents, however, use only the ASCII forms. Exchanging the
// ASCII form for the typographic one is a bijection and both characters are
// VISIBLE, so the clause stays readable.
//
// This is the first candidate in six turns that could move prose without
// touching words, numbers or line breaks.
import { readFileSync } from 'node:fs';
import { encode } from 'gpt-tokenizer';

const lanes = (process.env.LANES ?? '').split(',').filter(Boolean);
const tok = (s: string) => encode(s).length;

const ASCII = (' !"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~').split('').concat(['\t']);
// typographic / common Unicode punctuation that occurs constantly in published
// English and therefore probably earned merges
const UNI = ['’', '‘', '“', '”', '—', '–', '…', '•', '·', ' ', '′', '″', '«', '»', '‹', '›', '¡', '¿', '°', '€', '£', '¥', '§', '¶', '†', '‡', '•'];
const POOL = ASCII.concat(UNI);

const show = (c: string) => (c === ' ' ? '␠' : c === '\t' ? '\\t' : c);
function swapText(t: string, a: string, b: string): string {
  const p1 = '\u0001', p2 = '\u0002';
  return t.split(a).join(p1).split(b).join(p2).split(p1).join(b).split(p2).join(a);
}
type Pair = [string, string];

const WIDTH = 8, DEPTH = 4, CAP = 10;

function beam(text: string, pool: string[]) {
  const freq = new Map<string, number>();
  for (const ch of text) freq.set(ch, (freq.get(ch) ?? 0) + 1);
  const p = pool.filter((c) => (freq.get(c) ?? 0) >= 20);
  if (p.length < 2) return { chain: [] as Pair[], tot: 0 };
  type N = { text: string; used: Set<string>; tot: number; chain: Pair[] };
  let b: N[] = [{ text, used: new Set(), tot: 0, chain: [] }];
  let best: N = b[0];
  for (let d = 0; d < DEPTH; d++) {
    const next: N[] = [];
    for (const node of b) {
      const base = tok(node.text);
      const scored: Array<{ pair: Pair; d: number }> = [];
      for (let i = 0; i < p.length; i++) {
        for (let j = i + 1; j < p.length; j++) {
          const a = p[i], bb = p[j];
          if (node.used.has(a) || node.used.has(bb)) continue;
          if (!(freq.get(a)! >= 20) && !(freq.get(bb)! >= 20)) continue;
          const dd = tok(swapText(node.text, a, bb)) - base;
          if (dd < 0) scored.push({ pair: [a, bb], d: dd });
        }
      }
      scored.sort((x, y) => x.d - y.d);
      for (const c of scored.slice(0, CAP)) {
        const used = new Set(node.used); used.add(c.pair[0]); used.add(c.pair[1]);
        next.push({ text: swapText(node.text, c.pair[0], c.pair[1]), used, tot: node.tot + c.d, chain: [...node.chain, c.pair] });
      }
    }
    if (!next.length) break;
    next.sort((x, y) => x.tot - y.tot);
    b = next.slice(0, WIDTH);
    if (b[0].tot < best.tot) best = b[0];
  }
  return { chain: best.chain, tot: best.tot };
}

for (const path of lanes) {
  const text = readFileSync(path, 'utf8');
  const nm = path.split('/').pop()!;
  const a = beam(text, ASCII);
  const u = beam(text, POOL);
  const f = (x: { chain: Pair[]; tot: number }) =>
    `k=${x.chain.length} ${String(x.tot).padStart(5)} [${x.chain.map((y) => show(y[0]) + show(y[1])).join(',')}]`;
  const flag = u.tot < a.tot - 5 ? '  <-- WIDER POOL WINS' : '';
  console.log(`${nm.padEnd(26)} raw=${String(tok(text)).padStart(5)}  ASCII ${f(a)}   WIDE ${f(u)}${flag}`);
}
