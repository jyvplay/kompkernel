// X17b: print the LAKONIKOS-D decoder prompt for one lane and split its o200k cost into contract and wire.
import fs from 'node:fs';
import { lakonikosDualEncode } from '@/lib/omega/lakonikos-d';
import { countTokens } from '@/lib/omega/bpe';
const file = process.argv[2];
const text = fs.readFileSync(file, 'utf8');
const r = lakonikosDualEncode(text, 'o200k_base');
const wireT = countTokens(r.wire, 'o200k_base');
const totalT = r.messageTokens.o200k_base;
console.log(JSON.stringify({ file, mode: r.mode, exact: r.exact, raw: countTokens(text, 'o200k_base'), wire: wireT, total: totalT, contract: totalT - wireT }));
if (process.argv[3] === 'print') console.log(r.decoderPrompt);
