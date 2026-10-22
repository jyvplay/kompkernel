import fs from 'node:fs';
import { metathesisEncode } from '@/lib/omega/metathesis';
import { chironParseTape, CHIRON_SCRIPTS } from '@/lib/omega/chiron';
import { scriptOfChar } from '@/lib/omega/syntomia';
import { countTokens } from '@/lib/omega/bpe';
const enc = 'o200k_base' as any;
const T = (s: string) => countTokens(s, enc);
const f = process.env.F || 'bench/holdout-work/kb-article.txt';
const t = fs.readFileSync(f, 'utf8');
const r: any = metathesisEncode(t, enc);
const SEP = '¶';
const si = r.wire.indexOf(SEP);
const tape = r.wire.slice(1, si), body = r.wire.slice(si + 1);
const sc: any = scriptOfChar(tape[0]) || CHIRON_SCRIPTS.find((x: any) => x.name === 'cyrillic');
console.log('script =', sc && sc.name);
const parsed: any = chironParseTape(tape, sc);
// fully expand each rule using earlier rules
const ex = new Map<string, string>();
for (const p of parsed) {
  let s = p.raw;
  for (let pass = 0; pass < 12; pass++) { let n = ''; for (const ch of s) n += ex.get(ch) ?? ch; if (n === s) break; s = n; }
  ex.set(p.glyph, s);
}
console.log('FILE', f, '| rules', parsed.length, '| tape', T(tape), '| body', T(body));
console.log('glyph  occ   len  expTok  expansion');
let totSave = 0, totTape = 0;
const rows: any[] = [];
for (const p of parsed) {
  let occ = 0; for (const ch of body) if (ch === p.glyph) occ++;
  const exp = ex.get(p.glyph)!;
  const eTok = T(exp);
  // tape cost for this entry: glyph(1) + raw phrase tokens
  const tapeCost = T(p.glyph + p.raw);
  const save = occ * (eTok - 1) - tapeCost;
  totSave += save; totTape += tapeCost;
  rows.push({ g: p.glyph, occ, len: exp.length, eTok, tapeCost, save, exp });
}
rows.sort((a, b) => b.save - a.save);
for (const x of rows.slice(0, 40))
  console.log(String(x.g).padEnd(3), String(x.occ).padStart(4), String(x.len).padStart(4),
    String(x.eTok).padStart(5), String(x.tapeCost).padStart(5), String(x.save).padStart(5),
    JSON.stringify(x.exp.slice(0, 46)));
console.log('--- totals: sum(occ*(eTok-1)) =', totSave + totTape, ' tapeCost =', totTape, ' net =', totSave);
const gl = [...body].filter((c: string) => /[Ѐ-ӿ]/.test(c)).length;
console.log('--- body chars', body.length, 'tokens', T(body), '| glyph chars in body', gl,
  '| non-glyph body chars', body.length - gl, '-> tokens', T([...body].filter((c:string)=>!/[Ѐ-ӿ]/.test(c)).join('')));
