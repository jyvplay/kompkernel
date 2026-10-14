// Z46 probe: how much would folding ">"-quoted repeats of earlier text save on top of DAEDALUS?
import fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { daedalusEncode } from '../../src/lib/omega/daedalus';
const enc = 'o200k_base';
for (const f of process.argv.slice(2)) {
  const t = fs.readFileSync(f, 'utf8');
  const lines = t.split('\n');
  let reduced: string[] = [];
  let i = 0, folded = 0, foldedTok = 0, refs = 0;
  while (i < lines.length) {
    if (/^>/.test(lines[i])) {
      let j = i; while (j < lines.length && /^>/.test(lines[j])) j++;
      const block = lines.slice(i, j);
      const stripped = block.map(l => l.replace(/^> ?/, ''));
      const orig = lines.slice(0, i).join('\n');
      const key = stripped.join('\n');
      if (key.trim().length > 0 && orig.includes(key)) {
        const first = stripped.find(l => l.trim())!.trim().split(/\s+/).slice(0, 3).join(' ');
        const lastLine = [...stripped].reverse().find(l => l.trim())!.trim();
        const last = lastLine.split(/\s+/).slice(-3).join(' ');
        reduced.push(`⟦↶ "${first}" … "${last}"; prefix "> "⟧`);
        folded += block.length; foldedTok += countTokens(block.join('\n'), enc); refs++;
        i = j; continue;
      }
    }
    reduced.push(lines[i]); i++;
  }
  const red = reduced.join('\n');
  const t0 = Date.now();
  const d0 = daedalusEncode(t, enc);
  const d1 = daedalusEncode(red, enc);
  console.log(`${f.split('/').pop()}: raw=${countTokens(t, enc)} D=${d0.messageTokens} | folded ${refs} blocks, ${folded} lines, ${foldedTok} raw tok -> reduced raw=${countTokens(red, enc)} D(reduced)=${d1.messageTokens} (+clause ~25) ms=${Date.now() - t0}`);
}
