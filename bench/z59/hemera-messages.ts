// X14: whole one-chat HEMERA messages (contract + DAEDALUS decoder prompt, or plain DAEDALUS)
// for the CPython reader bench/hemera_decode.py. Writes receipts/hemera-messages.{json,expected.json}.
import fs from 'node:fs';
import { hemeraEncode } from '@/lib/omega/hemera';

const files = process.argv.slice(2);
const msgs: string[] = [], expected: string[] = [], arms: string[] = [];
for (const f of files) {
  const text = fs.readFileSync(f, 'utf8');
  const r = hemeraEncode(text, 'o200k_base');
  msgs.push(r.decoderPrompt);             // delta arms: contract + '\n' + DAEDALUS prompt; identity: plain prompt
  expected.push(text);
  arms.push(r.arm);
}
fs.writeFileSync('bench/z59/receipts/hemera-messages.json', JSON.stringify(msgs));
fs.writeFileSync('bench/z59/receipts/hemera-messages.expected.json', JSON.stringify(expected));
console.log(JSON.stringify({ messages: msgs.length, arms, files }));
