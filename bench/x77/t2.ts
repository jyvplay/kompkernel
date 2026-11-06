/**
 * X77 / t2 — how much raw-token redundancy lives inside LONG COMPOSITE IDENTIFIERS?
 * Cheap: pure string work + token counting, no frontier calls.
 *
 * A "long composite run" is a maximal [A-Za-z0-9_./:+-]{8,} that contains at least
 * one separator from . _ / : - +. It is split into segments on those boundaries,
 * each segment keeping its trailing separator. We price:
 *   as-is  = the runs written verbatim
 *   intern = a segment dictionary + one short id per segment occurrence
 * If interning does not win on RAW tokens by a wide margin, it cannot win after the
 * frontier takes its cut.
 */
import * as fs from 'node:fs';
import { countTokens as T } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
const RUN = /[A-Za-z0-9_./:+-]{8,}/g;
const SEP = /[._/:+-]/;
const IDCH = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const id = (n: number) => (n < IDCH.length ? IDCH[n] : '#' + n.toString(36) + '#');
const rows: any[] = [];
for (const p of process.argv.slice(2)) {
  const S = fs.readFileSync(p, 'utf8');
  const runsAll = S.match(RUN) ?? [];
  const runs = runsAll.filter((r) => SEP.test(r.slice(1, -1)) || SEP.test(r));
  if (runs.length < 4) { console.log(`${p.split('/').pop()!.padEnd(20)} -- too few composite runs (${runs.length})`); continue; }
  // segment occurrences
  const occ: string[] = [];
  const perRun: string[][] = [];
  for (const r of runs) {
    const parts = r.split(/([._/:+-])/).filter((x) => x !== '');
    const segs: string[] = [];
    for (let i = 0; i < parts.length; i += 2) segs.push((parts[i] ?? '') + (parts[i + 1] ?? ''));
    perRun.push(segs);
    for (const s of segs) occ.push(s);
  }
  const freq = new Map<string, number>();
  for (const s of occ) freq.set(s, (freq.get(s) ?? 0) + 1);
  const distinct = freq.size;
  const shared = [...freq.entries()].filter(([, n]) => n >= 2);
  const sharedOcc = shared.reduce((a, [, n]) => a + n, 0);
  // ---- price as-is vs interned (raw tokens only) ----
  const asIs = T(runs.join('\n') + '\n', enc);
  // dictionary: "k=seg" lines, only segments used 2+ times
  const dictSegs = shared.map(([s]) => s).sort((a, b) => (freq.get(b)! - freq.get(a)!) || a.localeCompare(b));
  const idx = new Map<string, number>();
  dictSegs.forEach((s, i) => idx.set(s, i));
  const dictText = dictSegs.map((s, i) => `${id(i)}=${s}`).join(' ');
  const bodyText = perRun
    .map((segs) => segs.map((s) => (idx.has(s) ? id(idx.get(s)!) : s)).join(''))
    .join('\n');
  const intern = T(dictText + '\n' + bodyText + '\n', enc);
  const row = {
    path: p, runs: runs.length, occ: occ.length, distinct,
    sharedDict: dictSegs.length, sharedOcc,
    asIs, intern, saveRaw: asIs - intern,
    pctShared: +((sharedOcc / occ.length) * 100).toFixed(1),
  };
  rows.push(row);
  console.log(`${p.split('/').pop()!.padEnd(20)} runs ${String(row.runs).padStart(4)} occ ${String(row.occ).padStart(5)} distinct ${String(row.distinct).padStart(4)} | shared ${String(row.sharedDict).padStart(4)}/${String(row.sharedOcc).padStart(5)} (${String(row.pctShared).padStart(5)}%) | raw ${String(row.asIs).padStart(5)} -> intern ${String(row.intern).padStart(5)} = ${row.saveRaw >= 0 ? '+' : ''}${row.saveRaw}`);
}
fs.writeFileSync('bench/x77/receipts/long-ident.json', JSON.stringify(rows, null, 1) + '\n');
const tot = rows.reduce((a, r) => a + r.saveRaw, 0), base = rows.reduce((a, r) => a + r.asIs, 0);
console.log(`TOTAL asIs ${base} interned ${base - tot}  saving ${tot} (${((tot / base) * 100).toFixed(1)}%)`);
