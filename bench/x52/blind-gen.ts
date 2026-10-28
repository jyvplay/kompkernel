import * as fs from 'node:fs';
import { execSync } from 'node:child_process';
import { diptychonPlan } from '../../src/lib/omega/diptychon';
let seed = 0xD1B1;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const ri = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));
fs.mkdirSync('bench/x52/blind/hidden', { recursive: true });
fs.mkdirSync('bench/x52/blind/visible', { recursive: true });
const sh = (c: string) => execSync(c, { encoding: 'utf8' });
// O: real od hex, 100 bytes (7 lines, partial last)
fs.writeFileSync('/tmp/blindO.bin', Buffer.from(Array.from({ length: 100 }, () => ri(0, 255))));
const tO = sh('od -A x -t x1z -v /tmp/blindO.bin');
// E: real od octal, 200 bytes with a zero run (squeeze)
fs.writeFileSync('/tmp/blindE.bin', Buffer.concat([Buffer.from(Array.from({ length: 80 }, () => ri(0, 255))), Buffer.alloc(64), Buffer.from(Array.from({ length: 56 }, () => ri(0, 255)))]));
const tE = sh('od -t x1z /tmp/blindE.bin');
// X: emulated xxd, 90 bytes
fs.writeFileSync('/tmp/blindX.bin', Buffer.from(Array.from({ length: 90 }, () => ri(0, 255))));
const tX = sh('python3 bench/x52/dump_emu.py xxd /tmp/blindX.bin');
// H: emulated hexdump -C with repeated block squeeze, 176 bytes
fs.writeFileSync('/tmp/blindH.bin', Buffer.concat([Buffer.from(Array.from({ length: 48 }, () => ri(0, 255))), Buffer.alloc(48, 0x2a), Buffer.from(Array.from({ length: 80 }, () => ri(0, 255)))]));
const tH = sh('python3 bench/x52/dump_emu.py hdC /tmp/blindH.bin');
for (const [name, text] of [['O', tO], ['E', tE], ['X', tX], ['H', tH]] as const) {
  const plan = diptychonPlan(text); if (!plan) throw new Error(name);
  fs.writeFileSync(`bench/x52/blind/hidden/${name}.orig`, text);
  fs.writeFileSync(`bench/x52/blind/visible/${name}.message`, plan.contract + '\n' + plan.reducedText);
  console.log(name, plan.spec.format, plan.spec.compact, 'dataLines', plan.dataLines);
}
