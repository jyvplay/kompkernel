// Z32: evaluate PR #2 codecs (STARLIGHT family, from origin/starlight-pareto-superior-codec-3242116616824848687) on the
// same corpora, o200k tokens, exact decode checked for every document. The PR modules are extracted to a scratch
// directory (/home/user/z32/pr2) with HEAD's bpe.ts; nothing from the PR is added to the repo by this script.
import fs from 'node:fs';
import * as EID from '/home/user/z32/pr2/src/lib/omega/eidolon';
import * as YGG from '/home/user/z32/pr2/src/lib/omega/yggdrasil';
import * as OBL from '/home/user/z32/pr2/src/lib/omega/oblivion';
import * as TER from '/home/user/z32/pr2/src/lib/omega/terminus';
import * as STA from '/home/user/z32/pr2/src/lib/omega/starlight';
import * as PAL from '/home/user/z32/pr2/src/lib/omega/pallas';
import * as CHR from '/home/user/z32/pr2/src/lib/omega/chronos-x1';
import * as AST from '/home/user/z32/pr2/src/lib/omega/starlight-prime';
const enc = 'o200k_base' as const;
type C = { name: string; enc: (t: string) => { wire: string; outTokens: number; inTokens: number }; dec: (w: string) => string };
const codecs: C[] = [
  { name: 'eidolon', enc: (t) => EID.eidolonEncode(t, enc) as any, dec: (w) => EID.eidolonDecode(w) },
  { name: 'yggdrasil', enc: (t) => YGG.yggdrasilEncode(t, enc) as any, dec: (w) => YGG.yggdrasilDecode(w) },
  { name: 'oblivion', enc: (t) => OBL.oblivionEncode(t, enc) as any, dec: (w) => OBL.oblivionDecode(w) },
  { name: 'terminus', enc: (t) => TER.encodeTerminus(t, enc) as any, dec: (w) => TER.decodeTerminus(w) },
  { name: 'starlight', enc: (t) => STA.starlightEncode(t, enc) as any, dec: (w) => STA.starlightDecode(w) },
  { name: 'pallas', enc: (t) => PAL.pallasEncode(t, enc) as any, dec: (w) => PAL.pallasDecode(w) },
  { name: 'chronos-x1', enc: (t) => CHR.chronosEncode(t, enc) as any, dec: (w) => CHR.chronosDecode(w) },
  { name: 'starlight-prime', enc: (t) => AST.astraeaEncode(t, enc) as any, dec: (w) => AST.astraeaDecode(w) },
];
const which = process.argv[2] && process.argv[2] !== 'all' ? process.argv[2].split(',') : codecs.map((c) => c.name);
const listFile = process.argv[3] ?? '/home/user/z31/groups-list.tsv';
const outFile = process.argv[4] ?? '/home/user/z32/pr-eval.jsonl';
const rows = fs.readFileSync(listFile, 'utf8').split('\n').filter(Boolean).map((l) => l.split('\t'));
fs.writeFileSync(outFile, '');
for (const c of codecs.filter((x) => which.includes(x.name))) {
  for (const [group, f] of rows) {
    const t = fs.readFileSync(f.startsWith('/') ? f : '/home/user/kompkernel/' + f, 'utf8');
    let rec: Record<string, unknown> = { codec: c.name, group, file: f };
    try {
      const t0 = Date.now();
      const r = c.enc(t);
      const exact = c.dec(r.wire) === t;
      rec = { ...rec, tokens: r.outTokens, in: r.inTokens, exact, ms: Date.now() - t0 };
    } catch (e) { rec = { ...rec, error: (e as Error).message.slice(0, 160) }; }
    fs.appendFileSync(outFile, JSON.stringify(rec) + '\n');
  }
}
console.log('done', which.join(','), rows.length);
