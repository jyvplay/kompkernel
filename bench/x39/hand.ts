// X39 decodability: emit one real message to a file so it can be decoded BY
// HAND from the message text alone -- no system prompt, no skills file, no
// tools.  This is the X32 discipline: the claim "a bare language model can
// decode this" is only worth anything if someone actually does it.
//
// The document is a real 40-line slice of a real git-numstat listing, not a
// synthetic fixture.
import * as fs from 'node:fs';
import { antistropheEncode, antistropheShow } from '@/lib/omega/antistrophe';

const enc: any = 'o200k_base';
const src = fs.readFileSync('bench/holdout-ops/git-numstat.txt', 'utf8');
const N = Number(process.env.N ?? 40);
const lines = src.split('\n').slice(0, N);
const text = lines.join('\n') + '\n';

const r: any = antistropheEncode(text, enc);
console.log('=== SOURCE (bytes ' + text.length + ') ===');
console.log(text);
console.log('=== MESSAGE TOKENS: ' + r.messageTokens + '  (raw ' + text.length + ' bytes) ===');
console.log('antistrophe=' + r.antistrophe
  + ' pair=' + (r.antistrophePair ? r.antistrophePair.map(antistropheShow).join('<->') : '-')
  + ' clause=' + JSON.stringify(r.antistropheClause));
console.log('=== FULL CONTRACT ===');
console.log(r.contract);
console.log('=== WIRE ===');
console.log(r.wire);
fs.writeFileSync('/tmp/x39/hand-source.txt', text);
fs.writeFileSync('/tmp/x39/hand-wire.txt', r.wire);
fs.writeFileSync('/tmp/x39/hand-contract.txt', r.contract ?? '');
console.log('=== wrote /tmp/x39/hand-source.txt hand-wire.txt hand-contract.txt ===');
