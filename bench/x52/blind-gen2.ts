import * as fs from 'node:fs';
import { execSync } from 'node:child_process';
import { diptychonPlan, diptychonRestore } from '../../src/lib/omega/diptychon';
let seed = 0x52B2;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const ri = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));
const sh = (c: string) => execSync(c, { encoding: 'utf8' });
// P: od hex (plan default = continuous)
fs.writeFileSync('/tmp/blindP.bin', Buffer.from(Array.from({ length: 84 }, () => ri(0, 255))));
const tP = sh('od -A x -t x1z -v /tmp/blindP.bin');
// Q: od octal + zero squeeze
fs.writeFileSync('/tmp/blindQ.bin', Buffer.concat([Buffer.from(Array.from({ length: 48 }, () => ri(0, 255))), Buffer.alloc(48), Buffer.from(Array.from({ length: 40 }, () => ri(0, 255)))]));
const tQ = sh('od -t x1z /tmp/blindQ.bin');
// R: xxd, but force PAIRS compact by hand-building the message via plan spec override
fs.writeFileSync('/tmp/blindR.bin', Buffer.from(Array.from({ length: 70 }, () => ri(0, 255))));
const tR = sh('python3 bench/x52/dump_emu.py xxd /tmp/blindR.bin');
// S: hexdump -C with squeeze
fs.writeFileSync('/tmp/blindS.bin', Buffer.concat([Buffer.from(Array.from({ length: 64 }, () => ri(0, 255))), Buffer.alloc(32, 0x07), Buffer.from(Array.from({ length: 33 }, () => ri(0, 255)))]));
const tS = sh('python3 bench/x52/dump_emu.py hdC /tmp/blindS.bin');
const cases: [string, string, boolean][] = [['P', tP, false], ['Q', tQ, false], ['R', tR, true], ['S', tS, false]];
for (const [name, text, forcePairs] of cases) {
  const plan = diptychonPlan(text); if (!plan) throw new Error(name);
  let msg = plan.contract + '\n' + plan.reducedText;
  if (forcePairs) {
    // rebuild message with pairs compact using the codec's own spec shape
    const spec2 = { ...plan.spec, compact: 'pairs' as const };
    // reduced pairs text: derive by re-compacting the restored dump's bytes via restore of continuous then manual: use plan items indirectly — simplest: strings replace via decode of continuous lines
    const lines = plan.reducedText.split(plan.spec.eol);
    const paired = lines.map(l => /^[0-9a-f]+$/.test(l) && l.length % 2 === 0 && l.length >= 4 && !(plan.spec.finalOffsetLine && l === lines[lines.length - 2])
      ? (l.match(/../g) ?? []).join(' ') : l).join(plan.spec.eol);
    if (diptychonRestore(paired, spec2) !== text) throw new Error('pairs rebuild');
    msg = plan.contract.replace(/lines of 32 lowercase hex digits \(read each as 16 byte pairs; the last data line may be shorter\)/, 'lines of lowercase hex byte pairs separated by spaces') + '\n' + paired;
  }
  fs.writeFileSync(`bench/x52/blind/hidden/${name}.orig`, text);
  fs.writeFileSync(`bench/x52/blind/visible/${name}.message`, msg);
  console.log(name, plan.spec.format, forcePairs ? 'pairs(forced)' : plan.spec.compact, 'dataLines', plan.dataLines);
}
