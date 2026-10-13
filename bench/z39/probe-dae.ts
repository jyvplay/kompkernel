// Z39 probe: DAEDALUS on one file. Prints the arm, the contract cost, and the first wire lines.
import fs from 'node:fs';
import { daedalusEncode } from '@/lib/omega/daedalus';
const f = process.argv[2];
const t = fs.readFileSync(f, 'utf8');
const r = daedalusEncode(t);
console.log(JSON.stringify({ f, inTokens: r.inTokens, messageTokens: r.messageTokens, contract: r.contractTokens, exact: r.exact, arm: r.winningArm, phraseRules: r.phraseRules, wordRules: r.wordRules, blocks: r.blocks, lists: r.lists, script: r.script, ms: r.ms }));
fs.writeFileSync('/home/user/z39/dae-' + f.split('/').pop() + '.wire.txt', r.wire);
fs.writeFileSync('/home/user/z39/dae-' + f.split('/').pop() + '.prompt.txt', r.decoderPrompt);
