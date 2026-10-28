import fs from 'node:fs';
import { daedalusEncode } from '../../src/lib/omega/daedalus';
const enc = 'o200k_base' as const;
const f = process.argv[2];
const text = fs.readFileSync(f, 'utf8');
let out = '';
for (const arms of [2, 4, 6]) {
  const t0 = Date.now();
  const r: any = daedalusEncode(text, enc, { maxArms: arms });
  out += `arms=${arms} M=${r.messageTokens} winner=${r.winningArm} armsRun=${r.armsRun} ms=${Date.now() - t0}\n`;
}
fs.writeFileSync('/tmp/arms.txt', out);
