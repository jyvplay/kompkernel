/** X87 — the same mutation set that silently corrupted the Ω-Ξ envelope 446 times,
 *  now aimed at ΑΙΘΗΡ. Identical kinds, identical deterministic PRNG, identical N.
 *  Acceptable outcomes are REFUSED and EXACT(no-op). WRONG(silent) must be zero. */
import * as fs from 'node:fs';
import { aitherEncode, aitherDecode } from '../../src/lib/omega/aither';
import { buildAtomAlphabet, countTokens } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
const alpha = buildAtomAlphabet(enc); const M = alpha.atoms.length;
let seed = 0x2f6e2b1; const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 4294967296; };
const ri = (n: number) => Math.floor(rnd() * n);
const randAtom = () => alpha.atoms[ri(M)].trim();
const KINDS = ['flip', 'header-flip', 'swap', 'delete', 'truncate1', 'truncate2', 'extend', 'whitespace'] as const;
function mutate(wire: string, kind: string): string {
  const a = (wire.match(/\S+/g) ?? []); const p = ri(a.length);
  switch (kind) {
    case 'flip': { let x = randAtom(); let g = 0; while (x === a[p] && g++ < 8) x = randAtom(); a[p] = x; break; }
    case 'header-flip': { let x = randAtom(); let g = 0; while (x === a[0] && g++ < 8) x = randAtom(); a[0] = x; break; }
    case 'swap': { const q = ri(a.length); const t = a[p]; a[p] = a[q]; a[q] = t; break; }
    case 'delete': a.splice(p, 1); break;
    case 'truncate1': a.splice(a.length - 1, 1); break;
    case 'truncate2': a.splice(a.length - 2, 2); break;
    case 'extend': a.push(randAtom()); break;
    case 'whitespace': return wire.replace(' ', '  ');
  }
  return a.map(x => ' ' + x).join('');
}
const lanes = (JSON.parse(fs.readFileSync('bench/x80/receipts/frontier.json', 'utf8'))).rows;
const N = Number(process.env.AIFUZZ_N ?? 8);
const tally: Record<string, number> = {}; const byKind: Record<string, Record<string, number>> = {};
const wrongs: any[] = []; let total = 0, hangs = 0; const t00 = Date.now();
for (const r of lanes) {
  const S = fs.readFileSync(r.path, 'utf8');
  const a = await aitherEncode(S, enc, r.tokens);
  if (!a.applied) { console.log('NOT APPLIED', r.path, a.notes); continue; }
  const wire = a.message; const per: Record<string, number> = {};
  for (const kind of KINDS) {
    byKind[kind] ??= {};
    for (let i = 0; i < N; i++) {
      const w = mutate(wire, kind); total++; const t0 = Date.now(); let cls: string;
      try { const out = await aitherDecode(w, enc); cls = out === S ? 'EXACT(no-op)' : 'WRONG(silent)';
        if (cls === 'WRONG(silent)') wrongs.push({ lane: r.path.split('/').pop(), kind, outLen: out.length, srcLen: S.length });
      } catch (e: any) { cls = 'REFUSED'; }
      if (Date.now() - t0 > 20000) hangs++;
      tally[cls] = (tally[cls] ?? 0) + 1; per[cls] = (per[cls] ?? 0) + 1; byKind[kind][cls] = (byKind[kind][cls] ?? 0) + 1;
    }
  }
  console.log(`${r.path.split('/').pop()!.padEnd(22)} atoms=${String(countTokens(wire, enc)).padStart(5)}  ` + Object.entries(per).map(([k,v])=>`${k}=${v}`).join(' ') + `  ${((Date.now()-t00)/1000).toFixed(0)}s`);
  fs.mkdirSync('bench/x87/receipts', { recursive: true });
  fs.writeFileSync('bench/x87/receipts/aither-fuzz.json', JSON.stringify({ M, N, kinds: KINDS, total, tally, byKind, hangs, wrongCount: wrongs.length, wrongs: wrongs.slice(0,60) }, null, 1) + '\n');
}
const eff = total - (tally['EXACT(no-op)'] ?? 0);
console.log(`\nTOTAL ${total} mutations  ${JSON.stringify(tally)}  hangs ${hangs}`);
console.log(`effective mutations ${eff}: refused ${tally['REFUSED'] ?? 0} (${(100*(tally['REFUSED']??0)/eff).toFixed(1)}%)  SILENT-WRONG ${tally['WRONG(silent)'] ?? 0}`);
console.log('by kind: ' + Object.entries(byKind).map(([k,v])=>`${k} ${JSON.stringify(v)}`).join('\n           '));
