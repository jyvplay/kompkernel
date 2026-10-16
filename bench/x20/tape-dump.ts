// X20 verification helper: dump the rule list of a CHIRON wire with the library parser.
import fs from 'node:fs';
import { chironParseTape, CHIRON_SCRIPTS, CHIRON_SEP } from '@/lib/omega/chiron';
const msg = fs.readFileSync(process.argv[2], 'utf8');
const which = process.argv[3] ?? 'cyrillic';
const s = CHIRON_SCRIPTS.find((x: any) => x.name === which)!;
const start = msg.indexOf('§'); const sep = msg.indexOf(CHIRON_SEP);
const tape = msg.slice(start + 1, sep);
const rules = chironParseTape(tape, s);
console.log('rules:', rules?.length);
rules?.forEach((r: any, i: number) => console.log(String(i).padStart(3), JSON.stringify(r)));
