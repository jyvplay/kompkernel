// X40 screen 1: two orthogonal generalisations, priced by token counting only.
//
// (M1) ITERATED SWAP.  ANTISTROPHE (X39) applies exactly ONE character exchange.
//      A permutation of the character alphabet is a product of exchanges, so a
//      sequence of k swaps is a strictly larger search space that costs k clause
//      segments.  Question: does the second swap still pay?
//
// (M2) DELTA ENCODING.  Every codec here treats a number as an opaque string.
//      But a monotone run of numbers carries almost no information per element:
//      the value is the previous value plus a small offset.  Transmit the first
//      value and the offsets; the reader keeps a running total.  This is the
//      first mechanism in this stack that asks the reader to do ARITHMETIC
//      rather than substitution.
//
// Both are priced on the real tokenizer.  No encoding, no search budget, so
// these numbers are upper bounds on what a full-stack codec could deliver.
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

function bestSwap(t: string): { a: string; b: string; d: number } | null {
  const base = tok(t);
  const present = new Set(t);
  let best: { a: string; b: string; d: number } | null = null;
  for (let i = 0; i < POOL.length; i++) {
    for (let j = i + 1; j < POOL.length; j++) {
      const a = POOL[i], b = POOL[j];
      if (!present.has(a) && !present.has(b)) continue;
      // a pair already used must not be reused (that would undo the first swap)
      const d = tok(swapText(t, a, b)) - base;
      if (d < 0 && (!best || d < best.d)) best = { a, b, d };
    }
  }
  return best;
}

// ---------------------------------------------------------------- M2
const NUM = /-?\d[\d.,]*\d|-?\d/g;

/** Longest run of numbers that is monotone non-decreasing with non-negative deltas. */
function monotoneRuns(text: string): Array<{ start: number; vals: number[]; spans: Array<[number, number]> }> {
  const out: Array<{ start: number; vals: number[]; spans: Array<[number, number]> }> = [];
  const re = new RegExp(NUM.source, 'g');
  let m: RegExpExecArray | null;
  let cur: { vals: number[]; spans: Array<[number, number]> } | null = null;
  const push = () => { if (cur && cur.vals.length >= 4) out.push({ start: cur.spans[0][0], vals: cur.vals, spans: cur.spans }); cur = null; };
  while ((m = re.exec(text)) !== null) {
    const s = m[0];
    if (!/^\d+$/.test(s)) { push(); continue; }        // integers only for exactness
    const v = parseInt(s, 10);
    if (!Number.isSafeInteger(v)) { push(); continue; }
    if (cur && v < cur.vals[cur.vals.length - 1]) push();
    if (!cur) cur = { vals: [], spans: [] };
    cur.vals.push(v);
    cur.spans.push([m.index, m.index + s.length]);
  }
  push();
  return out;
}

function priceDelta(text: string): { gain: number; n: number; run: string } {
  const runs = monotoneRuns(text).sort((a, b) => b.vals.length - a.vals.length);
  if (!runs.length) return { gain: 0, n: 0, run: '-' };
  const r = runs[0];
  const orig = r.vals.join(' ');
  const deltas: number[] = [r.vals[0]];
  for (let i = 1; i < r.vals.length; i++) deltas.push(r.vals[i] - r.vals[i - 1]);
  const enc = deltas.join(' ');
  return { gain: tok(enc) - tok(orig), n: r.vals.length, run: `${r.vals.length} vals` };
}

for (const p of lanes) {
  const text = readFileSync(p, 'utf8');
  const name = p.split('/').pop()!;
  const base = tok(text);

  // --- M1: iterated swap
  const s1 = bestSwap(text);
  let chain = `1st=${s1 ? show(s1.a) + show(s1.b) + ':' + s1.d : 'none'}`;
  let cur = text;
  if (s1) {
    cur = swapText(text, s1.a, s1.b);
    const s2 = bestSwap(cur);
    chain += ` 2nd=${s2 ? show(s2.a) + show(s2.b) + ':' + s2.d : 'none'}`;
    if (s2) {
      const cur2 = swapText(cur, s2.a, s2.b);
      const s3 = bestSwap(cur2);
      chain += ` 3rd=${s3 ? show(s3.a) + show(s3.b) + ':' + s3.d : 'none'}`;
      chain += ` cum3=${s3 ? tok(swapText(cur2, s3.a, s3.b)) - base : tok(cur2) - base}`;
    }
  }

  // --- M2: delta encoding
  const d = priceDelta(text);

  console.log(
    `${name.padEnd(26)} raw=${String(base).padStart(5)}  SWAP[${chain}]  DELTA[${d.n ? d.run + ':' + d.gain : '-'}]`,
  );
}
