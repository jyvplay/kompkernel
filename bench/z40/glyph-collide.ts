// Z40 diagnostic: which glyph characters of ARIADNE's wire also occur as literal characters in the input?
import fs from 'node:fs';
import { ariadneEncode } from '@/lib/omega/ariadne';
import { chironDecode } from '@/lib/omega/chiron';
const text = fs.readFileSync(process.argv[2], 'utf8');
const r = ariadneEncode(text, 'o200k_base', { maxSpan: 12, levels: 6, topK: 8000 });
console.log('mode', r.mode, 'script', r.script, 'M', r.messageTokens, 'decodedOK', chironDecode(r.wire) === text);
const tapeEnd = r.wire.indexOf('¶');
const tape = r.wire.slice(1, tapeEnd);
const chars = [...new Set([...tape])];
const inText = chars.filter((c) => text.includes(c));
console.log('tapeChars', chars.length, 'literalInInput', inText.length, JSON.stringify(inText.slice(0, 40)));
console.log('tape head', JSON.stringify(tape.slice(0, 160)));
