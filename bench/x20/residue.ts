// X20: show the residual literal text of a DAEDALUS wire (glyph runs -> ⌷), to hunt for unexploited structure.
import fs from 'node:fs';
import { daedalusEncode } from '@/lib/omega/daedalus';
import { CHIRON_SCRIPTS, chironInScript, CHIRON_SEP } from '@/lib/omega/chiron';
const enc = 'o200k_base' as const;
const f = process.argv[2];
const text = fs.readFileSync(f, 'utf8');
const r: any = daedalusEncode(text, enc);
const wire: string = r.wire;
if (wire === text) { console.log('identity arm'); process.exit(0); }
const script = CHIRON_SCRIPTS.find((s: any) => s.name === r.script)!;
const sep = wire.indexOf(CHIRON_SEP);
const body = wire.slice(sep + 1);
let out = '';
for (const c of body) out += chironInScript(script, c.codePointAt(0)!) ? '\u2337' : c;
console.log('=== ' + f + ' (script ' + r.script + ') body-residue:');
console.log(out.replace(/\u2337+/g, '\u2337').slice(Number(process.argv[3] ?? 0), Number(process.argv[3] ?? 0) + Number(process.argv[4] ?? 1800)));
