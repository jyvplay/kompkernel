/**
 * X91 — RESIDUE DENSITY. The body's literal (non-glyph) text is 44% of the message
 * and is the one block never characterised. Dictionary means are already measured
 * exhausted on it (ΑΝΤΙΓΡΑΦΟΝ: 15/15 REFUSED, SAVE 0 against a census bound of 202).
 * So the question is not "is there repetition left" but "how DENSELY does the
 * tokenizer code what is left" — because a residue coded at 2 chars/token has 2x the
 * headroom of one coded at 4, and the two need completely different mechanisms.
 */
import { countTokensExact } from '../../src/lib/omega/bpe';
import * as fs from 'node:fs';
const ENC = 'o200k_base' as const;
const ct = (s: string) => countTokensExact(s, ENC);

console.log('lane'.padEnd(14), 'resdTok  resdCh  ch/tok | digit  lower  upper  punct  space  long-id(>=8)');
let TT = { t: 0, c: 0 };
for (const f of process.argv.slice(2)) {
  const w = fs.readFileSync(f, 'utf8');
  const sec = w.indexOf('§'), pil = sec >= 0 ? w.indexOf('¶', sec) : -1;
  const body = pil >= 0 ? w.slice(pil + 1) : w;
  const res = [...body].filter(c => c.codePointAt(0)! <= 127).join('');
  const t = ct(res), c = res.length;
  const cls = (re: RegExp) => (res.match(re) || []).join('').length;
  const digit = cls(/[0-9]/g), lower = cls(/[a-z]/g), upper = cls(/[A-Z]/g);
  const space = cls(/[ \t]/g), punct = cls(/[^\w \t]/g);
  const longIds = (res.match(/[A-Za-z0-9_.\-\/]{8,}/g) || []);
  const longIdTok = longIds.reduce((a, s) => a + ct(s), 0); /****** tokens spent on runs >=8 chars */
  console.log(f.split('/').pop()!.replace('.wire.txt', '').padEnd(14),
    String(t).padStart(7), String(c).padStart(8), (c / Math.max(1, t)).toFixed(2).padStart(8), '|',
    String(digit).padStart(5), String(lower).padStart(6), String(upper).padStart(5),
    String(punct).padStart(6), String(space).padStart(5), `${longIdTok}(${longIds.length})`.padStart(12));
  TT.t += t; TT.c += c;
}
console.log('-'.repeat(94));
console.log('TOTAL'.padEnd(14), String(TT.t).padStart(7), String(TT.c).padStart(8), (TT.c / TT.t).toFixed(2).padStart(8));
console.log(`\nresidue total ${TT.t} tokens. English prose codes at ~4.0 ch/tok on this tokenizer;`);
console.log(`anything materially below that is HARD-TO-TOKENIZE ascii (hex, ids, versions, hashes),`);
console.log(`which is a DIFFERENT problem from repetition and needs a different mechanism.`);
