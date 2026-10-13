// Z43: print the exact one-chat message (kalligraphos) for a styled sample, plus the expected plain text.
import fs from 'node:fs';
import { kalligraphosEncode, kalligraphosDecode } from '@/lib/omega/kalligraphos';
const f = process.env.F!;
const text = fs.readFileSync(f, 'utf8');
const r = kalligraphosEncode(text, 'o200k_base');
const msg = r.decoderPrompt;
fs.writeFileSync('/home/user/z43/selfdecode/message.txt', msg);
console.log(JSON.stringify({ applied: r.kalligraphosApplied, messageTokens: r.messageTokens, inTokens: r.inTokens, roundTrip: kalligraphosDecode(r.wire) === text }));
