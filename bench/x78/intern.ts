/**
 * X78 — PRE-FRONTIER LONG-LITERAL INTERNING.
 * X77 interned SHORT segments on the WIRE and lost. bench/x78/idcost.ts says the
 * paying regime is L>=8 with n>=5 (or L>=12 with n>=3) with PACKED Cyrillic ids at
 * 0.56 tok each. This screens exactly that regime, on the RAW text, before the
 * frontier sees it: a pre-frontier codec, in the PLATOS architecture.
 */
import * as fs from 'node:fs';
import { countTokens as T } from '../../src/lib/omega/bpe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';
const IDS = 'абвгдежзийклмнопрстуфхцчшщъыьэюя'.split('');
const MINL = 10, MAXL = 40, MINOCC = 3, MAXDICT = 30;

function bestSubstrings(S: string, top: number) {
  const c = new Map<string, number>();
  for (let i = 0; i + MINL <= S.length; i++) {
    const hi = Math.min(MAXL, S.length - i);
    for (let L = MINL; L <= hi; L++) { const s = S.substr(i, L); c.set(s, (c.get(s) ?? 0) + 1); }
  }
  return [...c.entries()].filter(([s, n]) => n >= MINOCC && !s.includes('\n'))
    .map(([s, n]) => ({ s, n, score: n * s.length }))
    .sort((a, b) => b.score - a.score).slice(0, top);
}
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function render(S: string, dict: { s: string; id: string }[]) {
  if (!dict.length) return S;
  const re = new RegExp(dict.map((d) => esc(d.s)).join('|'), 'g');
  const map = new Map(dict.map((d) => [d.s, d.id]));
  const body = S.replace(re, (m) => map.get(m) ?? m);
  const contract = '§INTERN ' + dict.map((d) => `${d.id}=${d.s}`).join(' ');
  return contract + '\n' + body;
}
const rows: any[] = [];
for (const p of process.argv.slice(2)) {
  const S = fs.readFileSync(p, 'utf8');
  const base: any = tagstackEncode(S, enc);
  const cands = bestSubstrings(S, 60);
  const dict: { s: string; id: string }[] = [];
  let bestRaw = T(S, enc), used = new Set<string>();
  for (let round = 0; round < 12 && dict.length < MAXDICT; round++) {
    let pick: any = null, pickTok = bestRaw;
    for (const c of cands) {
      if (used.has(c.s)) continue;
      if (dict.some((d) => d.s.includes(c.s) || c.s.includes(d.s))) continue;
      const trial = dict.concat([{ s: c.s, id: IDS[dict.length] }]);
      if (dict.length >= IDS.length) break;
      const t = T(render(S, trial), enc);
      if (t < pickTok) { pickTok = t; pick = c; }
    }
    if (!pick) break;
    dict.push({ s: pick.s, id: IDS[dict.length] }); used.add(pick.s); bestRaw = pickTok;
  }
  if (!dict.length) { console.log(`${p.split('/').pop()!.padEnd(22)} F ${String(base.messageTokens).padStart(5)} | no candidate`); continue; }
  const out = render(S, dict);
  const after: any = tagstackEncode(out, enc);
  const d = after.messageTokens - base.messageTokens;
  rows.push({ path: p, base: base.messageTokens, after: after.messageTokens, d, dict: dict.length, rawSaved: T(S, enc) - bestRaw });
  console.log(`${p.split('/').pop()!.padEnd(22)} F ${String(base.messageTokens).padStart(5)} -> ${String(after.messageTokens).padStart(5)} (${d >= 0 ? '+' : ''}${d}) | dict ${dict.length} rawSaved ${T(S, enc) - bestRaw}`);
  fs.writeFileSync('bench/x78/receipts/intern.json', JSON.stringify(rows, null, 1) + '\n');
}
console.log(`\nTOTAL ${rows.reduce((a, r) => a + r.d, 0)} over ${rows.length} lanes`);
