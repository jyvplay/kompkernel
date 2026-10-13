// Z32 probe (measurement only): how many header tokens would a nested-header rewrite save on VERITAS-U wires?
// Rule under test: an entry phrase P may contain the alias of a SHORTER entry phrase Q (replacing Q's occurrences in P).
// The body is unchanged. Counts real o200k tokens of the header lines before and after.
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { veritasUEncode } from '@/lib/omega/veritas-u';
const enc = 'o200k_base' as const;
const files: { group: string; file: string }[] = [];
for (const l of fs.readFileSync('/home/user/z31/fresh-list.tsv', 'utf8').split('\n').filter(Boolean)) { const [g, f] = l.split('\t'); files.push({ group: g, file: f }); }
for (const l of fs.readFileSync('/home/user/z31/groups-list.tsv', 'utf8').split('\n').filter(Boolean)) { const [g, f] = l.split('\t'); files.push({ group: g, file: f }); }
const agg: Record<string, { hdrOld: number; hdrNew: number; wireOld: number; wireNew: number; docs: number; entriesNested: number; entries: number }> = {};
for (const { group, file } of files) {
  const t = fs.readFileSync(file.startsWith('/') ? file : '/home/user/kompkernel/' + file, 'utf8');
  const r = veritasUEncode(t, enc);
  if (!r.wire.startsWith('[[VXA\n')) continue;
  const a = (agg[group] ??= { hdrOld: 0, hdrNew: 0, wireOld: 0, wireNew: 0, docs: 0, entriesNested: 0, entries: 0 });
  a.docs++;
  const es = r.entries.map((e) => ({ key: e.key, phrase: e.phrase }));
  const byPhrase = new Map(es.map((e) => [e.phrase, e.key] as const));
  const sorted = [...es].sort((x, y) => y.phrase.length - x.phrase.length);
  const newLine = new Map<string, string>();
  let nested = 0;
  for (const e of es) {
    // candidate sub-entries: strictly shorter phrases that occur inside e.phrase
    const subs = es.filter((q) => q.phrase !== e.phrase && q.phrase.length < e.phrase.length && e.phrase.includes(q.phrase)).sort((x, y) => y.phrase.length - x.phrase.length);
    let s = e.phrase; let used = 0;
    for (const q of subs) {
      if (!s.includes(q.phrase)) continue;
      // replace each non-overlapping occurrence in the raw string by the alias key
      const parts = s.split(q.phrase);
      if (parts.length > 1) { s = parts.join(q.key); used++; }
    }
    if (used > 0) nested++;
    newLine.set(e.key, s);
  }
  // header tokens: old vs new (escapes as in the real wire)
  const esc = (x: string) => x.split('~').join('~~').split('\n').join('~N').split('\r').join('~R');
  const hdrOld = es.map((e) => e.key + '=' + esc(e.phrase)).join('\n');
  const hdrNew = es.map((e) => e.key + '=' + esc(newLine.get(e.key)!)).join('\n');
  a.hdrOld += countTokens(hdrOld, enc); a.hdrNew += countTokens(hdrNew, enc);
  const bodyT = countTokens(r.wire.slice(r.wire.indexOf('\n]]\n') + 4), enc);
  a.wireOld += r.outTokens; a.wireNew += r.outTokens - countTokens(hdrOld, enc) + countTokens(hdrNew, enc);
  a.entriesNested += nested; a.entries += es.length;
  void bodyT; void sorted; void byPhrase;
}
let T = { hdrOld: 0, hdrNew: 0, wireOld: 0, wireNew: 0 };
for (const [g, a] of Object.entries(agg)) {
  console.log(g.padEnd(13), 'docs', String(a.docs).padStart(3), 'header', String(a.hdrOld).padStart(7), '->', String(a.hdrNew).padStart(7), `(${(a.hdrNew - a.hdrOld >= 0 ? '+' : '')}${a.hdrNew - a.hdrOld})`, ' wire', String(a.wireOld).padStart(7), '->', String(a.wireNew).padStart(7), `(${((a.wireNew - a.wireOld) / a.wireOld * 100).toFixed(2)}%)`, ' entries nested', a.entriesNested, '/', a.entries);
  T.hdrOld += a.hdrOld; T.hdrNew += a.hdrNew; T.wireOld += a.wireOld; T.wireNew += a.wireNew;
}
console.log('ALL', T, ((T.wireNew - T.wireOld) / T.wireOld * 100).toFixed(2) + '%');
