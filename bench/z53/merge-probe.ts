// z53: subtree-merge probe. For each file and separator: M of the DENS tree text without and with densMergeTails.
// Each tree text is verified to expand back to the input exactly before it is measured.
import fs from 'node:fs';
import { densWireLines, densExpand, DENS_RULE, DENS_RULE_V } from '@/lib/omega/dendrons';
import { daedalusEncode } from '@/lib/omega/daedalus';
import { countTokens } from '@/lib/omega/bpe';
const enc = 'o200k_base' as const;
for (const f of process.argv.slice(2)) {
  const text = fs.readFileSync(f, 'utf8');
  for (const sep of ['.', '/']) {
    for (const merge of [false, true]) {
      const wl = densWireLines(text, sep, merge);
      const tree = wl.join('\n');
      const exact = densExpand(tree) === text;
      const rule = wl.some(l => l.startsWith('!')) ? DENS_RULE_V : DENS_RULE;
      const td: any = daedalusEncode(tree, enc, {});
      const M = countTokens(rule + '\n' + td.decoderPrompt, enc);
      console.log(JSON.stringify({ file: f.split('/').slice(-1)[0], sep, merge, lines: wl.length, chars: tree.length, M, exact }));
    }
  }
}
