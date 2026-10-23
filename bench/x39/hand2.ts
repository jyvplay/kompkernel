import * as fs from 'node:fs';
import { antistropheEncode, antistropheShow } from '@/lib/omega/antistrophe';
const enc: any = 'o200k_base';
const p = process.env.LANES!;
const t = fs.readFileSync(p, 'utf8');
const r: any = antistropheEncode(t, enc);
console.log('BYTES', t.length, 'MSGTOK', r.messageTokens, 'anti', r.antistrophe,
  'pair', r.antistrophePair ? r.antistrophePair.map(antistropheShow).join('') : '-',
  'gain', r.antistropheGain);
console.log('CONTRACT', JSON.stringify(r.contract));
console.log('WIRE', JSON.stringify(r.wire));
fs.writeFileSync('/tmp/x39/h2-src.txt', t);
fs.writeFileSync('/tmp/x39/h2-wire.txt', r.wire);
fs.writeFileSync('/tmp/x39/h2-contract.txt', r.contract ?? '');
