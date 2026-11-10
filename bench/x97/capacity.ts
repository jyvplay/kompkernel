/**
 * X97 — PER-SCRIPT VOCABULARY CAPACITY FOR RUN PACKING.  The run-packing mechanism needs, for a
 * body run of L reference glyphs, L letters of the DECLARED script whose concatenation is a single
 * o200k_base token.  X95 measured the capacity over ALL characters (8 785 / 6 821 / 3 217 / 986 /
 * 327 / 94 / 39 / 7 / 5 / 3 / 0 for L = 2..12).  That is the wrong number: the letters must come
 * from one script's one-token pool, and a script with 122 letters has far fewer usable tokens than
 * the whole vocabulary does.
 *
 * This measures, per script, how many vocabulary tokens of each length are written entirely in that
 * script's one-token pool -- and sets it against the number of distinct body runs of that length
 * that need packing.  A script whose capacity is below the demand cannot pack those runs at all.
 */
import * as fs from 'node:fs';
import { countTokensExact } from '../../src/lib/omega/bpe';
import { CHIRON_SCRIPTS, chironInScript, CHIRON_START } from '../../src/lib/omega/chiron';

const enc: any = 'o200k_base';
const wireDir = 'bench/x87/receipts/wires';
const lanes = fs.readdirSync(wireDir).filter((f) => f.endsWith('.wire.txt')).map((f) => f.replace('.wire.txt', ''));

// 1. which script each wire declares, and how many distinct runs of each length it needs
const need = new Map<string, Map<number, number>>();
for (const lane of lanes) {
  const msg = fs.readFileSync(`${wireDir}/${lane}.wire.txt`, 'utf8');
  const w = msg.indexOf(CHIRON_START);
  const tEnd = msg.indexOf('\u00b6', w);
  const tape = msg.slice(w + 1, tEnd), body = msg.slice(tEnd + 1);
  const first = tape[0];
  const sc = CHIRON_SCRIPTS.find((s) => chironInScript(s, first.codePointAt(0)!));
  if (!sc) throw new Error(`${lane}: cannot resolve script of ${first}`);
  const keys = new Set<string>();
  for (const ch of tape) if (ch.charCodeAt(0) > 0x370) keys.add(ch);
  const runs = new Set<string>();
  let cur = '';
  for (const ch of body) { if (keys.has(ch)) cur += ch; else { if (cur.length >= 2) runs.add(cur); cur = ''; } }
  if (cur.length >= 2) runs.add(cur);
  const m = need.get(sc.name) ?? new Map<number, number>();
  for (const r of runs) m.set(r.length, (m.get(r.length) ?? 0) + 1);
  need.set(sc.name, m);
}

// 2. per-script one-token pool, then count vocab tokens of length 2..9 written entirely in it
const poolOf = (sc: any): string[] => {
  const out: string[] = [];
  for (const [a, b] of sc.ranges ?? [[sc.lo, sc.hi]]) for (let cp = a; cp < b; cp++) {
    const ch = String.fromCodePoint(cp);
    if (countTokensExact(ch, enc) === 1) out.push(ch);
  }
  return out;
};
const vocabOfLen = new Map<number, Set<string>>();
for (let L = 2; L <= 9; L++) vocabOfLen.set(L, new Set<string>());

console.log(`script        oneTokPool  demand(L=2..9)                capacity(L=2..9)`);
const out: any = { scripts: [] };
for (const sc of CHIRON_SCRIPTS) {
  const pool = poolOf(sc);
  if (pool.length < 4) continue;
  const pset = new Set(pool);
  // enumerate all strings of length L over the pool that are single tokens: only feasible for small
  // pools, so bound the enumeration and report the bound honestly
  const cap: Record<number, number> = {};
  for (let L = 2; L <= 9; L++) {
    if (Math.pow(pool.length, L) > 4_000_000) { cap[L] = -1; continue; }
    let n = 0;
    const idx = new Array(L).fill(0);
    const buf = new Array(L).fill('');
    for (;;) {
      for (let i = 0; i < L; i++) buf[i] = pool[idx[i]];
      const s = buf.join('');
      if (countTokensExact(s, enc) === 1) { n++; vocabOfLen.get(L)!.add(s); }
      let k = L - 1;
      while (k >= 0) { idx[k]++; if (idx[k] < pool.length) break; idx[k] = 0; k--; }
      if (k < 0) break;
    }
    cap[L] = n;
  }
  const d = need.get(sc.name);
  const dsum = d ? [...d.entries()].sort((a, b) => a[0] - b[0]).map(([L, n]) => `${L}:${n}`).join(' ') : '(none)';
  const csum = Object.entries(cap).sort((a, b) => Number(a[0]) - Number(b[0])).map(([L, n]) => `${L}:${n < 0 ? '?' : n}`).join(' ');
  console.log(`${sc.name.padEnd(12)} ${String(pool.length).padStart(10)}  ${dsum.padEnd(28)}  ${csum}`);
  out.scripts.push({ name: sc.name, pool: pool.length, demand: d ? Object.fromEntries(d) : {}, capacity: cap });
}
fs.mkdirSync('bench/x97/receipts', { recursive: true });
fs.writeFileSync('bench/x97/receipts/capacity.json', JSON.stringify(out, null, 1) + '\n');
console.log(`\nwrote bench/x97/receipts/capacity.json  ('?' = enumeration bounded at 4e6 strings, not measured)`);
