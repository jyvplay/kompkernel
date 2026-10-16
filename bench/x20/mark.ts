// X20: print a message with script glyphs wrapped in ⟦⟧ so the reader can see token-level glyph identity.
import fs from 'node:fs';
import { CHIRON_SCRIPTS, chironInScript, CHIRON_SEP } from '@/lib/omega/chiron';
const msg = fs.readFileSync(process.argv[2], 'utf8');
const which = process.argv[3] ?? 'cyrillic';
const s = CHIRON_SCRIPTS.find((x: any) => x.name === which)!;
let out = '';
for (const ch of msg) out += chironInScript(s, ch.codePointAt(0)!) ? '\u27e6' + ch + '\u27e7' : ch;
console.log(out);
