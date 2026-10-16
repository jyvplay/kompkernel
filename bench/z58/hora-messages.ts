// X13: whole one-chat messages for the CPython reader. Delta arm and identity arm, from real lanes.
import fs from 'node:fs';
import { horaEncode } from '@/lib/omega/hora';
const files = process.argv.slice(2);
const msgs: string[] = [], expected: string[] = [], arms: string[] = [];
for (const f of files) {
  const text = fs.readFileSync(f, 'utf8');
  const r = horaEncode(text, 'o200k_base');
  msgs.push(r.arm === 'delta' ? r.decoderPrompt : r.daedalus.decoderPrompt);
  expected.push(text);
  arms.push(r.arm);
}
fs.writeFileSync('bench/z58/receipts/hora-messages.json', JSON.stringify(msgs));
fs.writeFileSync('bench/z58/receipts/hora-messages.expected.json', JSON.stringify(expected));
console.log(JSON.stringify({ messages: msgs.length, arms }));
