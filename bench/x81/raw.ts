import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
const CONTRACT = '§SYNALOEPHE put a space between [|] and a following digit';
for (const p of process.argv.slice(2)) {
  const S = fs.readFileSync(p, 'utf8');
  const cen = { spaced: new Map<string, number>(), tight: new Map<string, number>() };
  for (const m of S.matchAll(/(\S) (?=\p{N})/gu)) { const c = m[1]; if (!/\p{N}/u.test(c)) cen.spaced.set(c, (cen.spaced.get(c) ?? 0) + 1); }
  for (const m of S.matchAll(/(\S)(?=\p{N})/gu)) { const c = m[1]; if (!/\p{N}/u.test(c) && S[m.index! + 1] !== ' ') cen.tight.set(c, (cen.tight.get(c) ?? 0) + 1); }
  const usable = [...cen.spaced.keys()].filter((c) => (cen.tight.get(c) ?? 0) === 0);
  const sites = usable.reduce((a, c) => a + (cen.spaced.get(c) ?? 0), 0);
  const set = new Set(usable);
  const t = S.replace(/(\S) (?=\p{N})/gu, (w, c: string) => (set.has(c) ? c : w));
  const ct = `§SYNALOEPHE put a space between [${usable.join('')}] and a following digit`;
  console.log(`${p.split('/').pop()!.padEnd(22)} raw ${String(countTokens(S, enc)).padStart(5)} | sites ${String(sites).padStart(4)} | transformed ${String(countTokens(t, enc)).padStart(5)} (${countTokens(t, enc) - countTokens(S, enc)}) | +contract ${String(countTokens(ct, enc)).padStart(3)} => ${countTokens(ct + '\n' + t, enc) - countTokens(S, enc)}`);
  void CONTRACT;
}
