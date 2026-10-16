import fs from 'node:fs';
import { typosRunRe, typosShape, typosLen, typosExpand, TYPOS_SEPS } from '@/lib/omega/typos';
const text = fs.readFileSync(process.argv[2], 'utf8');
const shapes = process.argv[3].split('|');
const re = typosRunRe(TYPOS_SEPS);
const want = new Set(shapes);
let out = ''; let last = 0; let occ = 0;
for (const m of text.matchAll(re)) {
  const sh = typosShape(m[0]);
  if (!want.has(sh)) continue;
  out += text.slice(last, m.index) + m[0].replace(/[^0-9]/g, '');
  last = (m.index ?? 0) + m[0].length; occ++;
}
out += text.slice(last);
const back = typosExpand(out, shapes);
console.log('occ', occ, 'exact', back === text, 'lenDelta', text.length - out.length);
if (back !== text) {
  for (let i = 0; i < Math.max(back.length, text.length); i++) {
    if (back[i] !== text[i]) {
      console.log('first diff at', i);
      console.log('orig:', JSON.stringify(text.slice(Math.max(0, i - 60), i + 60)));
      console.log('back:', JSON.stringify(back.slice(Math.max(0, i - 60), i + 60)));
      break;
    }
  }
}
