// writes the one-chat message for the in-context test with the GRAMMA base and npm+rest FORCED (not a savings claim).
// The original sample is NOT printed.
import fs from 'node:fs';
import { gnomonReduce, gnomonCompose, GNOMON_GRAMMA_DIALECTS } from '@/lib/omega/gnomon';
import { grammaEncode, grammaDecode } from '@/lib/omega/gramma';
const text = fs.readFileSync('bench/z54/incontext/sample.json', 'utf8');
const rules: ('npm' | 'rest')[] = ['npm', 'rest'];
const { reduced, fields } = gnomonReduce(text, rules);
const g = grammaEncode(reduced, 'o200k_base', { dialects: GNOMON_GRAMMA_DIALECTS });
const msg = gnomonCompose(g.decoderPrompt, rules);
fs.writeFileSync('bench/z54/incontext/message.txt', msg);
console.log(JSON.stringify({ fields, dialect: g.winningDialect, exact: g.exact, reducedDecodes: grammaDecode(g.decoderPrompt) === reduced, messageChars: msg.length }));
