import * as fs from 'node:fs';
import { antistropheEncode, antistropheShow } from '@/lib/omega/antistrophe';
import { chironParseTape } from '@/lib/omega/chiron';
import { scriptOfChar } from '@/lib/omega/akribeia';
const enc: any = 'o200k_base';
const N = Number(process.env.N ?? 0);
const src = fs.readFileSync('bench/holdout-ops/ls-full-iso.txt', 'utf8');
const text = N > 0 ? src.split('\n').slice(0, N).join('\n') + '\n' : src;
const r: any = antistropheEncode(text, enc);
console.log('N', N, 'BYTES', text.length, 'MSGTOK', r.messageTokens, 'anti', r.antistrophe,
  'pair', r.antistrophePair ? r.antistrophePair.map(antistropheShow).join('') : '-', 'gain', r.antistropheGain);
console.log('CONTRACT', JSON.stringify(r.contract));
console.log('WIRE', JSON.stringify(r.wire));
// print the rule table the way a reader would recover it
const w: string = r.wire;
const k = w.indexOf('¶');
const tape = w.slice(1, k);
const sc: any = scriptOfChar(tape[0]);
const rs = chironParseTape(tape, sc);
console.log('--- rule table as parsed ---');
if (rs) for (const x of rs) console.log(JSON.stringify(x.glyph), '=', JSON.stringify(x.raw));
fs.writeFileSync('/tmp/x39/h3-src.txt', text);
fs.writeFileSync('/tmp/x39/h3-wire.txt', r.wire);
fs.writeFileSync('/tmp/x39/h3-contract.txt', r.contract ?? '');
