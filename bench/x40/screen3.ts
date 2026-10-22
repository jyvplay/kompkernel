// X40 screen 3: how much of the iterated-swap gain survives if the pairs must be
// pairwise DISJOINT (so their order is irrelevant and the reader gets a plain
// list), and does a beam recover what greedy loses?
//
// Greedy is order-myopic: it takes the single best exchange, which can consume a
// character a later, better exchange needed (find-listing loses 83 tokens this
// way).  A beam over disjoint pairs explores combinations instead.
import { readFileSync } from 'node:fs';
import { encode } from 'gpt-tokenizer';

const lanes = (process.env.LANES ?? '').split(',').filter(Boolean);
const tok = (s: string) => encode(s).length;
const POOL = (' !"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~').split('').concat(['\t']);
const show = (c: string) => (c === ' ' ? '␠' : c === '\t' ? '\\t' : c);

function swapText(t: string, a: string, b: string): string {
  const p1 = '\u0001', p2 = '\u0002';
  return t.split(a).join(p1).split(b).join(p2).split(p1).join(b).split(p2).join(a);
}
type Pair = [string, string];

/** All single-pair deltas for pairs avoiding `used`. */
function candidates(t: string, used: Set<string>, cap: number): Array<{ pair: Pair; d: number }> {
  const base = tok(t);
  const present = new Set(t);
  const out: Array<{ pair: Pair; d: number }> = [];
  for (let i = 0; i < POOL.length; i++) {
    for (let j = i + 1; j < POOL.length; j++) {
      const a = POOL[i], b = POOL[j];
      if (used.has(a) || used.has(b)) continue;
      if (!present.has(a) && !present.has(b)) continue;
      const d = tok(swapText(t, a, b)) - base;
      if (d < 0) out.push({ pair: [a, b], d });
    }
  }
  out.sort((x, y) => x.d - y.d);
  return out.slice(0, cap);
}

const WIDTH = Number(process.env.WIDTH ?? 8);
const DEPTH = 5;
const CAP = Number(process.env.CAP ?? 10);

for (const p of lanes) {
  const text = readFileSync(p, 'utf8');
  const nm = p.split('/').pop()!;
  const base = tok(text);

  // beam over disjoint pairs
  type Node = { text: string; used: Set<string>; tot: number; chain: Pair[] };
  let beam: Node[] = [{ text, used: new Set(), tot: 0, chain: [] }];
  let best: Node = beam[0];
  for (let depth = 0; depth < DEPTH; depth++) {
    const next: Node[] = [];
    for (const node of beam) {
      for (const c of candidates(node.text, node.used, CAP)) {
        const used = new Set(node.used); used.add(c.pair[0]); used.add(c.pair[1]);
        next.push({
          text: swapText(node.text, c.pair[0], c.pair[1]),
          used, tot: node.tot + c.d, chain: [...node.chain, c.pair],
        });
      }
    }
    if (!next.length) break;
    next.sort((x, y) => x.tot - y.tot);
    beam = next.slice(0, WIDTH);
    if (beam[0].tot < best.tot) best = beam[0];
  }

  // greedy disjoint, for comparison
  let cur = text, used = new Set<string>(), tot = 0; const chain: Pair[] = [];
  for (let k = 0; k < DEPTH; k++) {
    const cs = candidates(cur, used, 1);
    if (!cs.length) break;
    cur = swapText(cur, cs[0].pair[0], cs[0].pair[1]);
    used.add(cs[0].pair[0]); used.add(cs[0].pair[1]);
    tot += cs[0].d; chain.push(cs[0].pair);
  }

  const f = (n: Node | { tot: number; chain: Pair[] }) =>
    `k=${n.chain.length} ${String(n.tot).padStart(5)} [${n.chain.map((x) => show(x[0]) + show(x[1])).join(',')}]`;
  console.log(`${nm.padEnd(26)} raw=${String(base).padStart(5)}  BEAM ${f(best)}   GREEDY ${f({ tot, chain })}`);
}
