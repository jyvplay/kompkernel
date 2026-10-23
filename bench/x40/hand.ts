// X40 hand-decode artifact: write the FULL MESSAGE (contract + wire) as a bare
// LLM would receive it in a single chat box, and report the token split.
import * as fs from 'node:fs';
import { peritropeEncode } from '@/lib/omega/peritrope';
import { countTokens } from '@/lib/omega/bpe';
const enc: any = 'o200k_base';
const p = process.env.F!;
const N = Number(process.env.N || '0');
let t = fs.readFileSync(p, 'utf8');
if (N > 0) t = t.split('\n').slice(0, N).join('\n') + '\n';
const r: any = peritropeEncode(t, enc);
const contract: string = r.contract ?? '';
const wire: string = r.wire;
console.log('peritrope        ', r.peritrope, JSON.stringify(r.peritropePairs));
console.log('antistrophe      ', r.antistrophe);
console.log('messageTokens    ', r.messageTokens);
console.log('contractTokens   ', countTokens(contract, enc));
console.log('wireTokens       ', countTokens(wire, enc));
console.log('sum              ', countTokens(contract, enc) + countTokens(wire, enc));
console.log('--- CONTRACT ---');
console.log(contract);
fs.mkdirSync('/tmp/x40', { recursive: true });
fs.writeFileSync('/tmp/x40/msg.txt', contract + '\n' + wire);
fs.writeFileSync('/tmp/x40/src.txt', t);
console.log('--- wrote /tmp/x40/msg.txt (' + (contract.length + 1 + wire.length) + ' chars) ---');
console.log('--- first 300 chars of message ---');
console.log((contract + '\n' + wire).slice(0, 300));
