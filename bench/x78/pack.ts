/**
 * X78 — DIGIT-PACK SCREEN. Remove the INTERNAL separators from digit runs and declare
 * the template once. Same information, fewer tokens, because o200k's pretokenizer
 * allows three digits per chunk but charges a whole chunk per separator.
 * Gate: no two templates may share a total digit length, and no bare (unseparated)
 * digit run of that length may exist, or decoding would be ambiguous.
 */
import * as fs from 'node:fs';
import { countTokens as T } from '../../src/lib/omega/bpe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';
const RUN = /\d+(?:[.,:+\-/]\d+)+/g;

export function packDigits(S: string) {
  RUN.lastIndex = 0;
  const runs = S.match(RUN) ?? [];
  // shape -> { pattern, digits, n }
  const shapes = new Map<string, { pattern: string; len: number; n: number }>();
  for (const r of runs) {
    const parts = r.split(/([.,:+\-/])/);
    const groups: string[] = [], seps: string[] = [];
    for (let i = 0; i < parts.length; i += 2) { groups.push(parts[i]); if (parts[i + 1] !== undefined) seps.push(parts[i + 1]); }
    const pattern = groups.map((g, i) => '#'.repeat(g.length) + (seps[i] ?? '')).join('');
    const digits = groups.join('');
    const sh = shapes.get(pattern);
    if (sh) sh.n++; else shapes.set(pattern, { pattern, len: digits.length, n: 1 });
  }
  // collision guard: one template per total length
  const byLen = new Map<number, string[]>();
  for (const { pattern, len } of shapes.values()) { if (!byLen.has(len)) byLen.set(len, []); byLen.get(len)!.push(pattern); }
  // bare digit runs that carry no separator must not collide with a packed length
  RUN.lastIndex = 0;
  const stripped = S.replace(RUN, (m) => ' '.repeat(m.length));
  const bare = new Set<number>();
  for (const m of stripped.match(/\d+/g) ?? []) bare.add(m.length);
  const keep = [...shapes.entries()]
    .filter(([, v]) => v.n >= 2 && byLen.get(v.len)!.length === 1 && !bare.has(v.len))
    .map(([k, v]) => v)
    .sort((a, b) => b.n * (b.pattern.length - b.len) - a.n * (a.pattern.length - a.len));
  if (!keep.length) return null;
  const map = new Map<string, string>();
  for (const v of keep) { const g = v.pattern.split(/[.,:+\-/]/); map.set(g.map((x) => '#'.repeat(x.length)).join(''), v.pattern); }
  RUN.lastIndex = 0;
  const body = S.replace(RUN, (m) => {
    const parts = m.split(/([.,:+\-/])/);
    const groups: string[] = [];
    for (let i = 0; i < parts.length; i += 2) groups.push(parts[i]);
    const key = groups.map((x) => '#'.repeat(x.length)).join('');
    const pat = map.get(key);
    if (!pat) return m;
    // only pack if the template we would use is exactly this run's own pattern
    return groups.join('');
  });
  const contract = '§PACK digits fill #: ' + keep.map((v) => v.pattern).join(' ');
  return { message: contract + '\n' + body, contract, keep, shapes: [...shapes.values()] };
}
const rows: any[] = [];
for (const p of process.argv.slice(2)) {
  const S = fs.readFileSync(p, 'utf8');
  const base: any = tagstackEncode(S, enc);
  const r = packDigits(S);
  if (!r) { console.log(`${p.split('/').pop()!.padEnd(24)} F ${String(base.messageTokens).padStart(5)} | no packable shape`); continue; }
  const rawBefore = T(S, enc), rawAfter = T(r.message, enc);
  const after: any = tagstackEncode(r.message, enc);
  const d = after.messageTokens - base.messageTokens;
  rows.push({ path: p, base: base.messageTokens, after: after.messageTokens, d, rawSaved: rawBefore - rawAfter, pats: r.keep.map((k) => k.pattern) });
  console.log(`${p.split('/').pop()!.padEnd(24)} F ${String(base.messageTokens).padStart(5)} -> ${String(after.messageTokens).padStart(5)} (${d >= 0 ? '+' : ''}${d}) | raw ${rawBefore}->${rawAfter} (${rawBefore - rawAfter >= 0 ? '+' : ''}${rawBefore - rawAfter}) | ${r.keep.map((k) => `${k.pattern}x${k.n}`).join(' ')}`);
  fs.writeFileSync('bench/x78/receipts/pack.json', JSON.stringify(rows, null, 1) + '\n');
}
console.log(`\nTOTAL ${rows.reduce((a, r) => a + r.d, 0)} over ${rows.length} lanes`);
