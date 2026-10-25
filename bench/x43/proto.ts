/** X43 prototype: shaped-numeric DELTA streams. Transform + exact decode + parent cost. */
import * as fs from 'node:fs';
import { ouraEncode } from '@/lib/omega/oura';
import { countTokens } from '@/lib/omega/bpe';
const ENC: any = 'o200k_base';
const T = (s: string) => countTokens(s, ENC);
const B36 = '0123456789abcdefghijklmnopqrstuvwxyz';
// MEASURED: decimal is the cheapest envelope in o200k (bench/x43/enc.ts) —
// 505 tokens against base-36's 626 on the same delta stream, because BPE packs
// digit runs densely and letters sparsely. Sign only when negative.
const b36 = (n: bigint): string => (n < 0n ? '-' : '') + (-n).toString();
const toks = (l: string) => [...l.matchAll(/[^ ]+/g)].map((m) => ({ s: m[0], i: m.index!, e: m.index! + m[0].length }));
const maskOf = (s: string) => s.replace(/\d+/g, (d) => '#'.repeat(d.length));
const digitsOf = (s: string) => s.replace(/\D/g, '');
/** render a BigInt into a mask: '#' runs get the digits, padded to the run width. */
function render(mask: string, v: bigint): string | null {
  const d = v.toString();
  const widths = [...mask.matchAll(/#+/g)].map((m) => m[0].length);
  const total = widths.reduce((a, b) => a + b, 0);
  if (d.length > total || v < 0n) return null;
  const padded = d.padStart(total, '0');
  let o = '', di = 0, mi = 0;
  for (const m of mask.matchAll(/#+|[^#]+/g)) {
    if (m[0][0] === '#') { o += padded.slice(di, di + m[0].length); di += m[0].length; }
    else o += m[0];
    mi += m[0].length;
  }
  return o;
}
/** pick the best shaped column: ordinal j with the most consistent mask. */
function pick(lines: string[]) {
  let best: any = null;
  for (let j = 0; j < 6; j++) {
    const vals: Array<{ li: number; s: string }> = [];
    const masks = new Map<string, number>();
    for (let i = 0; i < lines.length; i++) {
      const ts = toks(lines[i]);
      if (ts.length <= j) continue;
      const m = maskOf(ts[j].s);
      if (!/\d/.test(ts[j].s)) continue;
      masks.set(m, (masks.get(m) ?? 0) + 1);
      vals.push({ li: i, s: ts[j].s });
    }
    for (const [mask, n] of masks) {
      const digits = mask.split('').filter((c) => c === '#').length;
      if (n < 8 || digits < 8) continue;
      const chosen = vals.filter((v) => maskOf(v.s) === mask);
      if (chosen.length < 8) continue;
      let prev: bigint | null = null; const deltas: string[] = [];
      let ok = true;
      for (const v of chosen) {
        const cur = BigInt(digitsOf(v.s));
        const d = prev === null ? cur : cur - prev;
        if (render(mask, cur) !== v.s) { ok = false; break; }
        deltas.push(b36(d)); prev = cur;
      }
      if (!ok) continue;
      const rawTok = T(chosen.map((v) => v.s).join('\n'));
      const dTok = T(deltas.join('\n'));
      const gain = rawTok - dTok - T(mask) - 4;
      if (gain > 20 && (!best || gain > best.gain)) best = { j, mask, gain, deltas, rows: chosen.map((v) => v.li) };
    }
  }
  return best;
}
for (const p of (process.env.LANES || '').split(',').filter(Boolean)) {
  const text = fs.readFileSync(p, 'utf8');
  const lines = text.split('\n');
  const M0 = ouraEncode(text, ENC).messageTokens;
  const b = pick(lines);
  if (!b) { console.log(p.split('/').pop(), 'raw=' + T(text), 'M=' + M0, 'no shaped column'); continue; }
  // build the transform
  const rowSet = new Set<number>(b.rows);
  const out: string[] = [];
  let k = 0;
  for (let i = 0; i < lines.length; i++) {
    if (!rowSet.has(i)) { out.push(lines[i]); continue; }
    const ts = toks(lines[i]);
    const t = ts[b.j];
    out.push(lines[i].slice(0, t.i) + b.deltas[k++] + lines[i].slice(t.e));
  }
  const pat = lines.map((_, i) => (rowSet.has(i) ? 'R' : 'L')).join('');
  const head = '⟨Δ\n' + b.mask + '\n' + String(b.j) + '\n' + pat.replace(/R+/g, (m) => 'R' + m.length).replace(/L+/g, (m) => 'L' + m.length) + '⟩';
  const wire = head + '\n' + out.join('\n');
  // exact decode check
  let decoded = ''; {
    const nl = wire.indexOf('\n');
    const rest = wire.slice(nl + 1);
    const close = rest.indexOf('⟩');
    const spec = rest.slice(0, close).split('\n');
    const [mask, js, pats] = spec;
    let patFull = ''; for (const m of pats.matchAll(/([RL])(\d+)/g)) patFull += m[1].repeat(Number(m[2]));
    const tail = rest.slice(close + 2);
    const bl = tail.length ? tail.split('\n') : [];
    let prev = 0n; const outs: string[] = [];
    for (let i = 0; i < patFull.length; i++) {
      if (patFull[i] === 'L') { outs.push(bl.shift()!); continue; }
      const line = bl.shift()!;
      const ts = toks(line);
      const t = ts[Number(js)];
      const body0 = t.s.replace(/^[+-]/, '');
      if (!/^[0-9a-z]+$/.test(body0)) { console.log('BAD TOKEN', JSON.stringify(t.s), 'at row', i, JSON.stringify(line).slice(0,120)); decoded = 'BAD'; break; }
      const d = BigInt((t.s[0] === '-' ? '-' : '') + body0);
      prev += d;
      const val = render(mask, prev);
      if (val === null) { decoded = 'RENDER FAIL'; break; }
      outs.push(line.slice(0, t.i) + val + line.slice(t.e));
    }
    decoded = outs.join('\n');
  }
  const exact = decoded === text;
  const M1 = ouraEncode(wire, ENC).messageTokens;
  console.log(p.split('/').pop()!.padEnd(22), 'j=' + b.j, 'rows=' + b.rows.length, 'gainProxy=' + b.gain,
    'exact=' + exact, 'raw=' + T(text), 'M0=' + M0, 'wireTok=' + T(wire), 'M1=' + M1, 'delta=' + (M1 - M0));
}
