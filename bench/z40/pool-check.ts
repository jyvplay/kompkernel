// Z40: script chosen per file and how much the dual filter removes from each script pool.
import fs from 'node:fs';
import { daedalusEncode } from '@/lib/omega/daedalus';
import { scriptPool } from '@/lib/omega/ariadne';
import { CHIRON_SCRIPTS } from '@/lib/omega/chiron';
for (const sc of CHIRON_SCRIPTS) {
  const a = scriptPool(sc, 'o200k_base', false), b = scriptPool(sc, 'o200k_base', true);
  console.log(sc.name, 'single chars', a.chars.length, 'dual chars', b.chars.length, 'pairs', a.pairs.size, b.pairs.size);
}
for (const f of process.argv.slice(2)) {
  const t = fs.readFileSync(f, 'utf8');
  const r = daedalusEncode(t, 'o200k_base', { dualTokenizer: true });
  console.log(f.split('/').pop(), 'mode', r.mode, 'script', r.script, 'arm', r.winningArm, 'phraseRules', r.phraseRules, 'wordRules', r.wordRules);
}
