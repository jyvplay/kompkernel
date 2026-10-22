import { chironInScript, CHIRON_SCRIPTS } from '@/lib/omega/chiron';
import { countTokens } from '@/lib/omega/bpe';
const cp = '∆'.codePointAt(0) as number;
console.log('cp', cp.toString(16), CHIRON_SCRIPTS.map(s => `${s.name}:${chironInScript(s, cp)}`).join(' '));
for (const s of ['2014', '∆0', '∆-3', '44539475', '∆8', '※0', '1234567', '∆519003']) console.log(JSON.stringify(s), countTokens(s, 'o200k_base'));
