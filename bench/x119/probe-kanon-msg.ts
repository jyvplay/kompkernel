import * as fs from 'node:fs';
import { kanonEncode } from '../../src/lib/omega/kanon';
import { countTokens } from '../../src/lib/omega/bpe';
Object.assign(process.env,{OMEGA_DET:'1',OMEGA_NO_MEMO:'1',OMEGA_ENGRAM:'0',OMEGA_OURA_MEMO:'0',OMEGA_NO_OROTHESIA:'1'});
const enc='o200k_base' as const;const text=fs.readFileSync('bench/holdout-x41/ls-l-real.txt','utf8');
const k=kanonEncode(text,enc);
console.log(JSON.stringify({M:k.messageTokens,wireTok:countTokens(k.wire,enc),promptTok:countTokens(k.decoderPrompt,enc),promptEndsWithWire:k.decoderPrompt.endsWith(k.wire),concatTok:countTokens(k.decoderPrompt+k.wire,enc),winner:k.winner,gate:k.gate}));
