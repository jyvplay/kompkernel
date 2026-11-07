/** X81 v2 — per-character version.
 *  For each char c that ever sits before a digit:
 *    S_c = "c SPACE digit" occurrences (removable, each ~1 tok)
 *    A_c = "c digit" occurrences (no space; makes c ambiguous)
 *  Transform only c with S_c>0 and A_c==0. Contract lists that character set.
 *  No markers needed => fully deterministic. */
import * as fs from 'node:fs';
const rows: any[] = [];
for (const p of process.argv.slice(2)) {
  const S = fs.readFileSync(p, 'utf8');
  const Sc = new Map<string, number>(), Ac = new Map<string, number>();
  for (const m of S.matchAll(/(\S) (?=\p{N})/gu)) { const c = m[1]; if (!/\p{N}/u.test(c)) Sc.set(c, (Sc.get(c) ?? 0) + 1); }
  for (const m of S.matchAll(/(\S)(?=\p{N})/gu)) { const c = m[1]; if (!/\p{N}/u.test(c) && !/^\s$/u.test(c)) { const i = m.index!; if (S[i + 1] !== ' ') Ac.set(c, (Ac.get(c) ?? 0) + 1); } }
  const usable = [...Sc.keys()].filter((c) => (Ac.get(c) ?? 0) === 0);
  const sites = usable.reduce((a, c) => a + (Sc.get(c) ?? 0), 0);
  const blocked = [...Sc.keys()].filter((c) => (Ac.get(c) ?? 0) > 0);
  const blockedSites = blocked.reduce((a, c) => a + (Sc.get(c) ?? 0), 0);
  const net = sites - 14;   // ~14 tok contract
  rows.push({ lane: p.split('/').pop(), sites, blockedSites, net, usable: usable.join(''), blocked: blocked.join('') });
  console.log(`${p.split('/').pop()!.padEnd(24)} usable ${String(sites).padStart(4)}  blocked ${String(blockedSites).padStart(4)}  net ${net >= 0 ? '+' : ''}${String(net).padStart(4)}  chars[${usable.slice(0, 8).join('')}]${blocked.length ? '  blocked[' + blocked.slice(0, 6).join('') + ']' : ''}`);
}
fs.writeFileSync('bench/x81/receipts/census2.json', JSON.stringify(rows, null, 1) + '\n');
const good = rows.filter((r) => r.net > 0).sort((a, b) => b.net - a.net);
console.log(`\npositive naive net: ${good.length}/${rows.length}`);
good.forEach((r) => console.log(`   ${r.lane.padEnd(24)} usable ${String(r.sites).padStart(4)} net ${String(r.net).padStart(4)}  chars[${r.usable}]`));
