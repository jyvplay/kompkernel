// z54: print the message the reader would see (contract + wire) for one lane. Analysis only.
import fs from 'node:fs';
import { daedalusEncode, daedalusDecoderPrompt } from '@/lib/omega/daedalus';
const text = fs.readFileSync(process.argv[2], 'utf8');
const r: any = daedalusEncode(text, 'o200k_base');
console.log(JSON.stringify({ M: r.messageTokens, wire: r.outTokens, contract: r.contractTokens }));
console.log('---PROMPT-HEAD---');
console.log(JSON.stringify(r.decoderPrompt.slice(-600)));
