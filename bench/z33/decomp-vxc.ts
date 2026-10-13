// Z33: decompose a VERITAS-C wire (measurement only): legend, header, body token counts; entries.
import fs from 'node:fs';
import { veritasCEncode } from '@/lib/omega/veritas-c';
import { countTokens } from '@/lib/omega/bpe';
const f = process.argv[2];
const t = fs.readFileSync(f, 'utf8');
const r = veritasCEncode(t, 'o200k_base');
const lines = r.wire.split('\n');
const endIdx = lines.indexOf(']]');
const header = lines.slice(0, endIdx + 1).join('\n');
const body = lines.slice(endIdx + 1).join('\n');
const legend = lines[1] ?? '';
console.log(JSON.stringify({ mode: r.mode, inTok: r.inTokens, outTok: r.outTokens, entries: r.entries.length, headerTok: countTokens(header, 'o200k_base'), bodyTok: countTokens(body, 'o200k_base'), legendTok: countTokens(legend, 'o200k_base'), exact: r.exact }));
console.log('first entries:', r.entries.slice(0, 6).map((e) => JSON.stringify(e.phrase.slice(0, 40))).join(' | '));
