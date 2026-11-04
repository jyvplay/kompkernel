/** How much of ls -l is ENTailed by the link name? */
import * as fs from 'node:fs';
import { countTokens as T } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
for (const p of process.argv.slice(2)) {
  const t = fs.readFileSync(p, 'utf8');
  const lines = t.split('\n');
  let arrows = 0, entail = 0, savedChars = 0;
  const ex: string[] = [];
  for (const l of lines) {
    const m = / -> (.*)$/.exec(l);
    if (!m) continue;
    arrows++;
    const target = m[1];
    const pre = l.slice(0, m.index);
    const name = pre.trim().split(/ +/).pop()!;
    const base = target.split('/').pop()!;
    const dir = target.slice(0, target.length - base.length);
    if (base === name || base.startsWith(name) || name.startsWith(base)) {
      entail++;
      savedChars += target.length;
      if (ex.length < 4) ex.push(`${name}  ->  ${target}`);
    }
    void dir;
  }
  console.log(`${p.split('/').pop()} raw ${T(t,enc)} arrows ${arrows} entailed ${entail} targetChars ${savedChars} (${(savedChars/4).toFixed(0)} tok est)`);
  for (const e of ex) console.log('   ' + e);
}
