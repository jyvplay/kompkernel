// Z33: inspect DAEDALUS wire anatomy on one file (measurement only).
import fs from 'node:fs';
import { daedalusEncode } from '@/lib/omega/daedalus';
import { countTokens } from '@/lib/omega/bpe';
const f = process.argv[2];
const t = fs.readFileSync(f, 'utf8');
const r = daedalusEncode(t, 'o200k_base');
console.log(JSON.stringify({ in: r.inTokens, out: r.outTokens, M: r.messageTokens, contract: r.contractTokens, arm: r.winningArm, phraseRules: r.phraseRules, wordRules: r.wordRules, blocks: r.blocks, lists: r.lists, script: r.script, exact: r.exact }));
console.log('--- decoderPrompt (tokens ' + countTokens(r.decoderPrompt, 'o200k_base') + ') ---');
console.log(r.decoderPrompt);
console.log('--- wire head ---');
console.log(r.wire.slice(0, Number(process.argv[3] ?? 1200)));
