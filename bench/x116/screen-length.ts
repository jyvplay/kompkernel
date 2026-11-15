/** X116 raw screen: symlink size = UTF-8 byte length of the target after " -> ".
 * Composes with ENALLAGE octal modes. Independent inverse; raw price only. */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { enallageRewrite, enallageExpand } from '../../src/lib/omega/enallage';

const enc = 'o200k_base' as const;
const T = (s: string) => countTokens(s, enc);
const MARKS = ['ℓ', '◇', '※', '⌀', '∅', 'λ'];
const ARROW = ' -> ';
function rewrite(text: string, mark: string): { wire: string; hits: number } | null {
  if (text.includes(mark)) return null;
  const final = text.endsWith('\n');
  const lines = (final ? text.slice(0, -1) : text).split('\n');
  let hits = 0;
  const out = lines.map(line => {
    if (!line.startsWith('l')) return line;
    const a = line.indexOf(ARROW);
    if (a < 0) return line;
    const target = line.slice(a + ARROW.length);
    const prefix = line.slice(0, a);
    const cells = [...prefix.matchAll(/\S+/g)];
    if (cells.length < 5) return line;
    const size = cells[4]!;
    if (!/^\d+$/.test(size[0])) return line;
    if (Number(size[0]) !== Buffer.byteLength(target, 'utf8')) return line;
    hits++;
    return prefix.slice(0, size.index ?? 0) + mark + prefix.slice((size.index ?? 0) + size[0].length) + line.slice(a);
  });
  if (!hits) return null;
  return { wire: out.join('\n') + (final ? '\n' : ''), hits };
}
function expand(wire: string, mark: string): string {
  const final = wire.endsWith('\n');
  const lines = (final ? wire.slice(0, -1) : wire).split('\n');
  const out = lines.map(line => {
    const a = line.indexOf(ARROW);
    if (a < 0) return line;
    const target = line.slice(a + ARROW.length);
    const prefix = line.slice(0, a);
    const at = prefix.indexOf(mark);
    if (at < 0) return line;
    return prefix.slice(0, at) + Buffer.byteLength(target, 'utf8') + prefix.slice(at + mark.length) + line.slice(a);
  });
  return out.join('\n') + (final ? '\n' : '');
}
const keys = [
  (m: string) => `${m}=bytes after ->.`,
  (m: string) => `${m}=UTF8 bytes after ->.`,
  (m: string) => `l-lines: ${m}=bytes after ->.`,
  (m: string) => `${m} is byte length after ->.`,
  (m: string) => `${m}=len(target).`,
];
const lanes = fs.readFileSync('bench/x109/lanes29.txt', 'utf8').split('\n').filter(Boolean);
const rows: any[] = [];
for (const p of lanes) {
  const text = fs.readFileSync(p, 'utf8');
  const oct = enallageRewrite(text);
  const base = oct ? oct.wire : text;
  let best: any = null;
  for (const mark of MARKS) {
    const rw = rewrite(base, mark);
    if (!rw) continue;
    if (expand(rw.wire, mark) !== base) { console.log('INEXACT', p, mark); continue; }
    for (const kf of keys) {
      const key = kf(mark);
      const wire = key + '\n' + rw.wire;
      const tok = T(wire);
      const exact = expand(rw.wire, mark) === base && (!oct || enallageExpand(base) === text);
      if (!best || tok < best.tokens) best = { tokens: tok, delta: tok - T(text), hits: rw.hits, mark, key, exact, keyTokens: T(key) };
    }
  }
  rows.push({ path: p, raw: T(text), octRaw: oct ? T(base) : null, best });
  console.log(`${p.split('/').pop()!.padEnd(22)} raw=${T(text)} oct=${oct ? T(base) : '-'} best=${best ? `${best.tokens} (${best.delta}) hits=${best.hits} key=${best.keyTokens} ${best.key}` : 'none'}`);
}
const base = rows.reduce((a, r) => a + r.raw, 0);
const after = rows.reduce((a, r) => a + (r.best ? r.best.tokens : r.raw), 0);
console.log(`TOTAL raw ${base} best ${after} delta ${after - base}`);
fs.writeFileSync('bench/x116/receipts/screen-length.json', JSON.stringify({ schema: 'kompkernel-x116-screen-length-v1', totals: { base, after, delta: after - base }, rows }, null, 2) + '\n');
