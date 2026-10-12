// Z32 headroom probe: where do VERITAS-U wire tokens go? header (sentinel + legend + entries + terminator) vs body.
// Read-only analysis over the 111 fresh docs and the 40 lane-group docs. Uses the committed veritas-u module.
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { veritasUEncode, veritasUDecode } from '@/lib/omega/veritas-u';
const enc = 'o200k_base' as const;
const rows: { group: string; file: string }[] = [];
for (const [p] of [['/home/user/z31/fresh-list.tsv']]) for (const l of fs.readFileSync(p, 'utf8').split('\n').filter(Boolean)) { const [g, f] = l.split('\t'); rows.push({ group: g, file: f }); }
for (const l of fs.readFileSync('/home/user/z31/groups-list.tsv', 'utf8').split('\n').filter(Boolean)) { const [g, f] = l.split('\t'); rows.push({ group: g, file: f }); }
const agg: Record<string, { n: number; inT: number; outT: number; hdrT: number; bodyT: number; entries: number; e1: number }> = {};
let fail = 0;
for (const { group, file } of rows) {
  const t = fs.readFileSync(file.startsWith('/') ? file : '/home/user/kompkernel/' + file, 'utf8');
  const r = veritasUEncode(t, enc);
  if (veritasUDecode(r.wire) !== t) fail++;
  const a = (agg[group] ??= { n: 0, inT: 0, outT: 0, hdrT: 0, bodyT: 0, entries: 0, e1: 0 });
  a.n++; a.inT += r.inTokens; a.outT += r.outTokens;
  if (r.wire.startsWith('[[VXA\n')) {
    const cut = r.wire.indexOf('\n]]\n');
    const hdr = r.wire.slice(0, cut + 4);
    a.hdrT += countTokens(hdr, enc); a.bodyT += countTokens(r.wire.slice(cut + 4), enc);
    a.entries += r.entries.length; a.e1 += r.entries.filter((e) => e.hits <= 1).length;
  } else { a.bodyT += r.outTokens; }
}
console.log('group'.padEnd(14), 'docs', 'identity', 'VXU', 'hdrTok', 'bodyTok', 'hdr%', 'entries', 'entries(hits<=1)');
for (const [g, a] of Object.entries(agg)) console.log(g.padEnd(14), String(a.n).padStart(4), String(a.inT).padStart(8), String(a.outT).padStart(7), String(a.hdrT).padStart(7), String(a.bodyT).padStart(8), ((a.hdrT / a.outT) * 100).toFixed(1).padStart(5) + '%', String(a.entries).padStart(7), String(a.e1).padStart(8));
console.log('round-trip failures', fail);
