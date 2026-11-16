import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { archetyponEncode } from '../../src/lib/omega/archetypon';
import { platosTransform } from '../../src/lib/omega/platos';
const CANDS = [
 'After the marker n:side:k, k records follow. Line 1 of them is a template: its field starts set the column edges. Each later record is the same fields joined by single spaces (the last field is the rest of the line); re-space every field but the last to the edge line 1 gives it, R meaning pad on the left, then drop the marker line.',
 '‡n:side:k — k records; record 1 sets each column edge (R = pad on the left); the others are those fields joined by one space. Re-pad them and drop this line.',
 '‡n:side:k: k lines. Line 1 is the column template, R means pad left. The others hold the same fields single-spaced: re-pad them, then drop this line.',
 '‡ n side k: k lines follow; line 1 sets column widths, R = pad left; rest = same fields, single-spaced. Re-pad; drop this line.',
 'After ‡: k records; line 1 sets column widths, R pad-left; rest are its fields single-spaced. Re-pad, drop this line.',
];
for (const c of CANDS) console.log(String(countTokens(c + '\n', 'o200k_base')).padStart(4), c.slice(0, 70));
const LANES = ['bench/holdout-x41/ls-l-real.txt','bench/holdout-x42/dpkg-l.txt','bench/holdout-x41/ps-aux-real.txt',
  'bench/holdout-x42/ps-ef.txt','bench/holdout-x41/ls-real.txt','bench/holdout-tbl/kubectl-get-pods.txt'];
for (const p of LANES) {
  const t = fs.readFileSync(p, 'utf8');
  const tr = platosTransform(t);
  if (!tr) { console.log(p.split('/').pop(), 'no fit'); continue; }
  const child = archetyponEncode(tr.text, 'o200k_base');
  const mk = tr.text.split('\n').find((l: string) => /^[‡¤※°µ¦†◊◈]\d+:/.test(l))!;
  console.log(`${p.split('/').pop()!.padEnd(22)} raw ${countTokens(t,'o200k_base')}  child ${String(child.messageTokens).padStart(5)}  marker '${mk}' (${countTokens(mk + '\n','o200k_base')} tok)  pad ${tr.blk.padMass}`);
}
