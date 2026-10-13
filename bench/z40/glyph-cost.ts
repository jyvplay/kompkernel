// Z40: per-glyph cl100k/o200k cost of the glyphs that appear in a DAEDALUS wire (tape keys).
import fs from 'node:fs';
import { daedalusEncode } from '@/lib/omega/daedalus';
import { countTokens } from '@/lib/omega/bpe';
const f = process.argv[2];
const dual = process.argv[3] === 'dual';
const t = fs.readFileSync(f, 'utf8');
const r = daedalusEncode(t, 'o200k_base', { dualTokenizer: dual });
const w = r.wire;
const cut = w.indexOf('¶');
const tape = w.slice(1, cut);
const keys = new Set<string>();
const sc = [...tape];
const body = w.slice(cut + 1);
let n = 0, c1 = 0, o1 = 0;
const stats: Record<string, number> = {};
for (const ch of new Set(body)) {
  if (ch.codePointAt(0)! < 0x2000) continue;
  n++;
  const o = countTokens(ch, 'o200k_base'), c = countTokens(ch, 'cl100k_base');
  stats[`o${o}c${c}`] = (stats[`o${o}c${c}`] ?? 0) + 1;
}
console.log(JSON.stringify({ dual, mode: r.mode, script: r.script, msgO: r.messageTokens, wireLen: w.length, nonAsciiDistinctInBody: n, costsOfDistinctNonAsciiBodyChars: stats, sampleTape: tape.slice(0, 40) }));
