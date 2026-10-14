import fs from 'node:fs';
import { enthymemeEncode, enthymemeDecoderPrompt } from '../../src/lib/omega/enthymeme';
const t = fs.readFileSync(process.argv[2], 'utf8');
const r = enthymemeEncode(t, 'o200k_base', { guardBelow: 0, minRuleSaving: 0 });
console.log(`applied=${r.applied} exact=${r.exact} M=${r.messageTokens} raw=${r.inTokens} plainM=${r.plainMessageTokens}`);
console.log('=== decoder prompt ===');
console.log(enthymemeDecoderPrompt(r.wire));
fs.writeFileSync(process.argv[2].replace(/\.txt$/, '.prompt.txt'), enthymemeDecoderPrompt(r.wire));
