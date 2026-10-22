import * as fs from 'node:fs';
import { anadiplosisEncode } from '@/lib/omega/anadiplosis';
const enc: any = 'o200k_base';
const dig = '0123456789';

function mk(set: string): Map<string, string> {
  const m = new Map<string, string>();
  for (let i = 0; i < 10; i++) { m.set(dig[i], set[i]); m.set(set[i], dig[i]); }
  return m;
}
function swap(t: string, m: Map<string, string>): string {
  return t.replace(/[0-9a-zA-Z]/g, (c) => m.get(c) ?? c);
}

/** Restrict the swap to a subset of positions: only swap when it is safe. */
function swapSpans(t: string, m: Map<string, string>, re: RegExp): string {
  return t.replace(re, (s) => s.replace(/[0-9a-zA-Z]/g, (c) => m.get(c) ?? c));
}

const set = process.env.SET || 'ETAOINSRHL';
const mode = process.env.MODE || 'all';
const m = mk(set);

for (const p of (process.env.LANES || '').split(',').filter(Boolean)) {
  if (!fs.existsSync(p)) continue;
  const t = fs.readFileSync(p, 'utf8');
  const base: any = anadiplosisEncode(t, enc);
  let src = t;
  if (mode === 'all') src = swap(t, m);
  else if (mode === 'nonword') {
    // swap only runs that are NOT adjacent to a letter on either side
    src = swapSpans(t, m, /(?<![A-Za-z])[0-9A-Za-z]+(?![A-Za-z])/g);
  }
  const r: any = anadiplosisEncode(src, enc);
  console.log(
    p.split('/').pop()!.padEnd(26), 'set=' + set, 'mode=' + mode,
    'stack=' + String(base.messageTokens).padStart(5),
    'swapStack=' + String(r.messageTokens).padStart(5),
    'delta=' + String(r.messageTokens - base.messageTokens).padStart(6),
    'rules ' + base.rules + '->' + r.rules,
  );
}
