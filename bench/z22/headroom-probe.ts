// Headroom on the CURRENT PHALANX-P3 wire: tokens spent on each candidate mechanism's target, per file.
// Approximate (token count of matched substrings in isolation). Purpose: choose what to build, not a result.
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { phalanx3Encode } from '@/lib/omega/phalanx3';
const files = [
  ...['find-listing.txt', 'ls-full-iso.txt', 'git-numstat.txt', 'npm-ls.txt', 'node-stacktraces.txt', 'openstack-loghub-26.log', 'git-log-fuller.txt', 'package-lock-head.json'].map(f => `bench/holdout-ops/${f}`),
  ...fs.readdirSync('bench/holdout').map(f => `bench/holdout/${f}`),
  ...fs.readdirSync('bench/z20/samples').map(f => `bench/z20/samples/${f}`),
];
const T = (s: string) => countTokens(s, 'o200k_base');
const tot: Record<string, number> = { wire: 0, hex16: 0, hex16n: 0, url: 0, urln: 0, dupLine: 0, dupLineN: 0, indent: 0, mdTableRule: 0, emailPath: 0, numberRun: 0 };
const rows: string[] = [];
for (const f of files) {
  const raw = fs.readFileSync(f, 'utf8');
  const w = phalanx3Encode(raw, 'o200k_base').wire;
  const wire = w;
  const hex = wire.match(/\b[0-9a-fA-F]{16,}\b/g) ?? [];
  const url = wire.match(/https?:\/\/[^\s)\]"'`<>]+/g) ?? [];
  const seen = new Set<string>(); let dupT = 0, dupN = 0;
  const lines = wire.split('\n');
  const first = new Map<string, number>();
  lines.forEach((l, i) => { if (l.trim().length >= 12) { if (first.has(l)) { dupN++; dupT += T(l); } else first.set(l, i); } });
  const ind = wire.match(/\n[ \t]{2,}/g) ?? [];
  const mdRule = wire.match(/^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?$/gm) ?? [];
  const numRun = wire.match(/\d{9,}/g) ?? [];
  let hexT = 0; for (const h of hex) hexT += T(h);
  let urlT = 0; for (const u of url) urlT += T(u);
  let indT = 0; for (const s of ind) indT += T(s);
  let mdT = 0; for (const s of mdRule) mdT += T(s);
  let numT = 0; for (const s of numRun) numT += T(s);
  tot.wire += T(wire); tot.hex16 += hexT; tot.hex16n += hex.length; tot.url += urlT; tot.urln += url.length;
  tot.dupLine += dupT; tot.dupLineN += dupN; tot.indent += indT; tot.mdTableRule += mdT; tot.numberRun += numT;
  rows.push(`${f.replace(/^bench\//, '')} wire=${T(wire)} hex16=${hex.length}/${hexT}tok url=${url.length}/${urlT}tok dupLine=${dupN}/${dupT}tok indentRuns=${ind.length}/${indT}tok numRun9=${numRun.length}/${numT}tok`);
}
console.log(rows.join('\n'));
console.log('TOTAL', JSON.stringify(tot));
