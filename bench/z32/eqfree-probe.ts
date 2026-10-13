// Z32 probe: token cost of the '=' separator in VXN header lines. Same entries, same body; only the separator changes.
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { veritasNEncode } from '@/lib/omega/veritas-n';
const enc = 'o200k_base' as const;
const files: { group: string; file: string }[] = [];
for (const p of ['/home/user/z31/fresh-list.tsv', '/home/user/z31/groups-list.tsv'])
  for (const l of fs.readFileSync(p, 'utf8').split('\n').filter(Boolean)) { const [g, f] = l.split('\t'); files.push({ group: g, file: f.startsWith('/') ? f : '/home/user/kompkernel/' + f }); }
const agg: Record<string, { docs: number; entries: number; eqTok: number; wire: number }> = {};
for (const { group, file } of files) {
  const t = fs.readFileSync(file, 'utf8');
  const r = veritasNEncode(t, enc);
  if (!r.wire.startsWith('[[VXN\n') || r.entries.length === 0) continue;
  const a = (agg[group] ??= { docs: 0, entries: 0, eqTok: 0, wire: 0 });
  a.docs++; a.entries += r.entries.length; a.wire += r.outTokens;
  // rebuild the wire without '=' in header lines (keys are single chars; the separator is removed)
  const lines = r.wire.split('\n');
  const end = lines.indexOf(']]');
  const noEq = [...lines.slice(0, 2), ...lines.slice(2, end).map((l) => l[0] + l.slice(2)), ...lines.slice(end)].join('\n');
  a.eqTok += r.outTokens - countTokens(noEq, enc);
}
let T = { entries: 0, eqTok: 0, wire: 0 };
for (const [g, a] of Object.entries(agg)) { console.log(g.padEnd(13), 'docs', a.docs, 'entries', a.entries, 'tokens saved by dropping =', a.eqTok, `(${(a.eqTok / a.wire * 100).toFixed(2)}% of wire)`); T.entries += a.entries; T.eqTok += a.eqTok; T.wire += a.wire; }
console.log('ALL entries', T.entries, 'saved', T.eqTok, (T.eqTok / T.wire * 100).toFixed(2) + '%');
