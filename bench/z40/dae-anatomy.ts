// Z40 analysis: where do DAEDALUS message tokens go? Classifies o200k tokens of the wire.
import fs from 'node:fs';
import { daedalusEncode } from '@/lib/omega/daedalus';
import { tokenStrings } from '@/lib/omega/bpe';
const files = process.argv.slice(2);
for (const f of files) {
  const t = fs.readFileSync(f, 'utf8');
  const r = daedalusEncode(t);
  const toks = tokenStrings(r.wire, "o200k_base").map((x) => x.s);
  fs.mkdirSync("/home/user/z40/wires", { recursive: true }); fs.writeFileSync("/home/user/z40/wires/" + f.split("/").slice(-1)[0] + ".dae.txt", r.wire);
  let glyph = 0, ws = 0, digit = 0, alpha = 0, punct = 0, other = 0, nonAscii = 0, n = 0;
  for (const s of toks) {
    n++;
    if (/^\s+$/.test(s)) ws++;
    else if (/^[^\x00-\x7f]+$/.test(s)) nonAscii++;
    else if (/^\d+$/.test(s)) digit++;
    else if (/^[A-Za-z]+$/.test(s) || /^ ?[A-Za-z]+$/.test(s)) alpha++;
    else if (/^[^\w\s]+$/.test(s)) punct++;
    else other++;
  }
  console.log(JSON.stringify({ f: f.split('/').slice(-2).join('/'), arm: r.winningArm, script: r.script, out: r.outTokens, toksSeen: n, ws, digit, alphaTok: alpha, punct, nonAscii, other, rules: r.phraseRules + r.wordRules, exact: r.exact }));
}
