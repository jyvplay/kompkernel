// X40 screen 2: the two costs that decide whether iterated swap ships.
//
// COST 1 — ORDER.  Swaps on overlapping characters do not commute, so a decoder
//   must undo them in reverse order.  That is a real error surface for a reader
//   working from one chat message.  Restricting the chosen pairs to be pairwise
//   DISJOINT makes the order irrelevant and the instruction a plain list.
//   Question: how much of the gain does disjointness cost?
//
// COST 2 — THE CLAUSE.  X39 paid 5 tokens for one exchange.  k exchanges need a
//   list.  Priced as the junction it creates, per EUTELEIA.
import { readFileSync } from 'node:fs';
import { encode, countTokens } from 'gpt-tokenizer';

const lanes = (process.env.LANES ?? '').split(',').filter(Boolean);
const tok = (s: string) => encode(s).length;
const POOL = (' !"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~').split('').concat(['\t']);
const show = (c: string) => (c === ' ' ? '␠' : c === '\t' ? '\\t' : c);
const name = (c: string) => (c === ' ' ? 'space' : c === '\t' ? 'tab' : c);

function swapText(t: string, a: string, b: string): string {
  const p1 = '\u0001', p2 = '\u0002';
  return t.split(a).join(p1).split(b).join(p2).split(p1).join(b).split(p2).join(a);
}

type Pair = [string, string];

function bestPair(t: string, used: Set<string>): { pair: Pair; d: number } | null {
  const base = tok(t);
  const present = new Set(t);
  let best: { pair: Pair; d: number } | null = null;
  for (let i = 0; i < POOL.length; i++) {
    for (let j = i + 1; j < POOL.length; j++) {
      const a = POOL[i], b = POOL[j];
      if (used.has(a) || used.has(b)) continue;
      if (!present.has(a) && !present.has(b)) continue;
      const d = tok(swapText(t, a, b)) - base;
      if (d < 0 && (!best || d < best.d)) best = { pair: [a, b], d };
    }
  }
  return best;
}

const MAXK = 4;
for (const p of lanes) {
  const text = readFileSync(p, 'utf8');
  const base = tok(text);
  const nm = p.split('/').pop()!;

  // free (overlaps allowed)
  let cur = text, usedF = new Set<string>(), totF = 0; const chF: string[] = [];
  for (let k = 0; k < MAXK; k++) {
    const b = bestPair(cur, usedF);
    if (!b) break;
    cur = swapText(cur, b.pair[0], b.pair[1]);
    totF += b.d; chF.push(`${show(b.pair[0])}${show(b.pair[1])}`);
    // free mode: only forbid reusing the SAME pair (a second use would undo it)
    usedF = new Set<string>();
    for (const c of chF) usedF.add(c[0]), usedF.add(c[1]);
  }

  // disjoint
  let curD = text, usedD = new Set<string>(), totD = 0; const chD: Pair[] = [];
  for (let k = 0; k < MAXK; k++) {
    const b = bestPair(curD, usedD);
    if (!b) break;
    curD = swapText(curD, b.pair[0], b.pair[1]);
    totD += b.d; chD.push(b.pair);
    usedD.add(b.pair[0]); usedD.add(b.pair[1]);
  }

  console.log(
    `${nm.padEnd(26)} raw=${String(base).padStart(5)} ` +
    `FREE k=${chF.length} ${String(totF).padStart(5)} [${chF.join(',')}]  ` +
    `DISJ k=${chD.length} ${String(totD).padStart(5)} [${chD.map((x) => show(x[0]) + show(x[1])).join(',')}]`,
  );
}

// ---------------- clause pricing ----------------
console.log('\n--- clause pricing (junction cost, against the real contract tail) ---');
const CONTRACT = 'Before ¶ k=v. expand repeatedly; print only.';
const TAIL = 'print only.';
const head = CONTRACT.slice(0, CONTRACT.length - TAIL.length);
const price = (c: string) =>
  countTokens(head + c + ' ' + TAIL, 'o200k_base' as any) - countTokens(CONTRACT, 'o200k_base' as any);

const sets: Array<Pair[]> = [
  [[' ', '/']],
  [[' ', '/'], ['.', '-']],
  [[' ', '/'], ['.', '-'], ['(', ')']],
  [[' ', '/'], ['.', '-'], ['(', ')'], ['@', '#']],
];
for (const ps of sets) {
  const wordings: string[] = [];
  // one sentence per pair
  wordings.push(ps.map(([a, b]) => `Then swap ${name(a)} and ${b}.`).join(' '));
  // one sentence, comma-separated list
  wordings.push(`Then swap ${ps.map(([a, b]) => `${name(a)} ${b}`).join(', ')}.`);
  // notation register (TIMEMA lesson)
  wordings.push(`Then swap ${ps.map(([a, b]) => `${name(a)}/${b}`).join(' ')}.`);
  wordings.push(`Then: ${ps.map(([a, b]) => `${name(a)}=${b}`).join(' ')}.`);
  wordings.push(`Then swap ${ps.map(([a, b]) => `${name(a)}<->${b}`).join(' ')}.`);
  const scored = wordings.map((w) => [w, price(w)] as [string, number]).sort((x, y) => x[1] - y[1]);
  console.log(`\nk=${ps.length}`);
  for (const [w, d] of scored) console.log('  ' + String(d).padStart(3) + '  ' + JSON.stringify(head + w + ' ' + TAIL));
}
