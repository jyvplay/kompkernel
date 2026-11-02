import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { akolouthia2Encode } from '../../src/lib/omega/akolouthia2';
import { diastemaEncode } from '../../src/lib/omega/diastema';
import { metronEncode } from '../../src/lib/omega/metron';
import { synkrisisEncode } from '../../src/lib/omega/synkrisis';
const enc: any = 'o200k_base';
const f = process.argv[2];
const t = fs.readFileSync(f, 'utf8');
const a: any = akolouthia2Encode(t, enc);
const p = a.decoderPrompt as string;
console.log('total prompt tokens', countTokens(p, enc));
// find the longest prefix that is English prose (contract)
const lines = p.split('\n');
for (let i = 0; i < Math.min(6, lines.length); i++) console.log('LINE', i, JSON.stringify(lines[i].slice(0, 300)), countTokens(lines[i], enc));
console.log('--- full contract-ish region ---');
console.log(JSON.stringify(p.slice(0, 120)));
console.log('TAIL', JSON.stringify(p.slice(-400)));
