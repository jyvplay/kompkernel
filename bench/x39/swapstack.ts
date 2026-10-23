// X39 decisive test: does a character swap survive the stack?
//
// Raw token deltas are not the metric -- the message is stack(swap(text)), and
// the stack's dictionary finds a different phrase set on the swapped text.
// For each lane: measure the baseline, search the structure-preserving swap
// pool, then re-encode under the best swap and verify a full round trip
//   unswap( ouraDecode( ouraEncode( swap(text) ) ) ) === text
import * as fs from 'node:fs';
import { encode } from 'gpt-tokenizer';
import { ouraEncode, ouraDecode } from '@/lib/omega/oura';
import { chironDecode } from '@/lib/omega/chiron';

const enc: any = 'o200k_base';
const tok = (s: string) => encode(s).length;

const POOL = (' !"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~').split('').concat(['\t']).filter((c) => c !== '\n');
const show = (c: string) => (c === ' ' ? '␠' : c === '\t' ? '\\t' : c);

function swapText(text: string, a: string, b: string): string {
  const p1 = '\u0001', p2 = '\u0002';
  return text.split(a).join(p1).split(b).join(p2).split(p1).join(b).split(p2).join(a);
}

function bestSwap(text: string): { a: string; b: string; raw: number; base: number } {
  const base = tok(text);
  const present = new Set(text);
  let best = { a: '', b: '', raw: 0, base };
  for (let i = 0; i < POOL.length; i++) {
    for (let j = i + 1; j < POOL.length; j++) {
      const a = POOL[i], b = POOL[j];
      if (!present.has(a) && !present.has(b)) continue;
      const d = tok(swapText(text, a, b)) - base;
      if (d < best.raw) best = { a, b, raw: d, base };
    }
  }
  return best;
}

for (const p of (process.env.LANES || '').split(',').filter(Boolean)) {
  if (!fs.existsSync(p)) continue;
  const text = fs.readFileSync(p, 'utf8');
  const name = p.split('/').pop()!;

  // ---- baseline
  let t0 = Date.now();
  const rb: any = ouraEncode(text, enc);
  const baseTok = rb.messageTokens;
  const backB = ouraDecode(rb.wire, { stats: rb.stats, order: rb.order,
      undo: rb.parent === 'identity' ? (w: string) => w : chironDecode } as any,
    { alphabet: rb.alphabet, marker: rb.marker, marker2: rb.marker2, group: rb.syncopeGroup,
      framing: rb.framing, ouraShape: rb.ouraShape, ouraMode: rb.ouraMode,
      ouraSentinel: rb.ouraSentinel } as any);
  const baseExact = backB === text;
  const baseSec = ((Date.now() - t0) / 1000) | 0;

  // ---- pick the best swap
  t0 = Date.now();
  const bs = bestSwap(text);
  const searchSec = ((Date.now() - t0) / 1000) | 0;
  if (!bs.a) { console.log(`${name.padEnd(26)} base=${baseTok} ${baseExact ? 'EXACT' : 'MISMATCH'} (no swap)`); continue; }

  const swapped = swapText(text, bs.a, bs.b);

  // ---- encode the swapped text
  t0 = Date.now();
  const rs: any = ouraEncode(swapped, enc);
  const swapTok = rs.messageTokens;
  const backS = ouraDecode(rs.wire, { stats: rs.stats, order: rs.order,
      undo: rs.parent === 'identity' ? (w: string) => w : chironDecode } as any,
    { alphabet: rs.alphabet, marker: rs.marker, marker2: rs.marker2, group: rs.syncopeGroup,
      framing: rs.framing, ouraShape: rs.ouraShape, ouraMode: rs.ouraMode,
      ouraSentinel: rs.ouraSentinel } as any);
  const roundTrip = swapText(backS, bs.a, bs.b);   // swap is an involution
  const exact = roundTrip === text;
  const swapSec = ((Date.now() - t0) / 1000) | 0;

  const delta = swapTok - baseTok;
  console.log(
    `${name.padEnd(26)} base=${String(baseTok).padStart(5)}(${baseExact ? 'EXACT' : 'MISMATCH'}) ` +
    `swap ${show(bs.a)}<->${show(bs.b)} raw=${String(bs.raw).padStart(5)} ` +
    `wire=${String(swapTok).padStart(5)} delta=${delta >= 0 ? '+' : ''}${delta} ` +
    `${exact ? 'EXACT' : '***MISMATCH***'} [search ${searchSec}s, enc ${baseSec}/${swapSec}s]`,
  );
}
