import * as fs from 'node:fs';
import { kanonEncode } from '../../src/lib/omega/kanon';
import { countTokens } from '../../src/lib/omega/bpe';
const enc='o200k_base' as const;const text=fs.readFileSync('bench/holdout-x41/ls-l-real.txt','utf8');
const k=kanonEncode(text,enc);
console.log(JSON.stringify({includes:k.decoderPrompt.includes(k.wire),indexOf:k.decoderPrompt.indexOf(k.wire),wireLen:k.wire.length,promptLen:k.decoderPrompt.length,tail:JSON.stringify(k.decoderPrompt.slice(-80)),M:k.messageTokens,promptTok:countTokens(k.decoderPrompt,enc)}));
