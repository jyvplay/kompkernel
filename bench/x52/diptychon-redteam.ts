// X52 DIPTYCHON red team. Ground truth: real GNU od (child process) and the
// independent Python emulators in bench/x52/dump_emu.py (xxd / hexdump -C are
// absent from this sandbox). The codec must plan+restore byte-exactly on every
// valid dump and refuse (null plan) on every mutation that breaks the frame.
import * as fs from 'node:fs';
import { execSync } from 'node:child_process';
import { diptychonPlan, diptychonRestore } from '../../src/lib/omega/diptychon';
let seed = 0x52d1;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const ri = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));
let checks = 0; const fails: string[] = [];
const expect = (cond: boolean, label: string) => { checks++; if (!cond) fails.push(label); };
fs.mkdirSync('bench/x52/tmp-cross', { recursive: true });
let emitted = 0;

function byteCases(): { name: string; buf: Buffer }[] {
  const mk = (n: number, f: (i: number) => number) => Buffer.from(Array.from({ length: n }, (_, i) => f(i) & 0xff));
  return [
    { name: 'rand1k', buf: mk(1000, () => ri(0, 255)) },
    { name: 'rand4097', buf: mk(4097, () => ri(0, 255)) },
    { name: 'zeros1k', buf: mk(1024, () => 0) },
    { name: 'trapchars', buf: mk(512, (i) => [0x3c, 0x3e, 0x7c, 0x20, 0x7e, 0x2e, 0x0a, 0x00][i % 8]!) },
    { name: 'repeatblocks', buf: Buffer.concat([mk(16, () => 0x41), mk(16, () => 0x41), mk(16, () => 0x41), mk(160, () => ri(0, 255)), mk(16, () => 0x41)]) },
    { name: 'tiny64', buf: mk(64, () => ri(0, 255)) },
    { name: 'text', buf: Buffer.from('The quick brown fox jumps over the lazy dog. '.repeat(20), 'utf8') },
    { name: 'hi-bytes', buf: mk(777, () => ri(0x80, 0xff)) },
  ];
}

function runCase(text: string, label: string, wantPlan = true) {
  const plan = diptychonPlan(text);
  expect((plan !== null) === wantPlan, `${label}: plan presence (got ${plan?.spec.format ?? 'null'})`);
  if (plan) {
    let rt = false;
    try { rt = Buffer.compare(Buffer.from(diptychonRestore(plan.reducedText, plan.spec), 'utf8'), Buffer.from(text, 'utf8')) === 0; } catch { rt = false; }
    expect(rt, `${label}: byte-exact restore`);
    if (emitted < 30) {
      emitted++;
      fs.writeFileSync(`bench/x52/tmp-cross/rt${emitted}.orig`, text);
      fs.writeFileSync(`bench/x52/tmp-cross/rt${emitted}.reduced`, plan.reducedText);
      fs.writeFileSync(`bench/x52/tmp-cross/rt${emitted}.spec.json`, JSON.stringify(plan.spec));
    }
  }
}

for (const { name, buf } of byteCases()) {
  fs.writeFileSync('/tmp/x52-rt.bin', buf);
  const sh = (cmd: string) => execSync(cmd, { encoding: 'utf8', maxBuffer: 8_000_000 });
  // real GNU od variants
  for (const [tag, args] of [['odAxv', 'od -A x -t x1z -v'], ['odDef', 'od -t x1z'], ['odAd', 'od -A d -t x1z -v'], ['odAn', 'od -A n -t x1z -v'], ['odAo', 'od -A o -t x1z -v']] as const) {
    runCase(sh(`${args} /tmp/x52-rt.bin`), `${name}-${tag}`);
  }
  // emulated xxd / hexdump -C variants
  for (const [tag, args] of [['xxd', 'xxd'], ['xxdU', 'xxd /tmp/x52-rt.bin u'], ['xxdG1', 'xxd /tmp/x52-rt.bin g1'], ['xxdG4', 'xxd /tmp/x52-rt.bin g4'], ['xxdDec', 'xxd /tmp/x52-rt.bin d'], ['xxdAuto', 'xxd /tmp/x52-rt.bin a'], ['hdC', 'hdC'], ['hdCNoSq', 'hdC /tmp/x52-rt.bin n']] as const) {
    const cmd = args.includes('/tmp') ? `python3 bench/x52/dump_emu.py ${args}` : `python3 bench/x52/dump_emu.py ${args} /tmp/x52-rt.bin`;
    runCase(sh(cmd), `${name}-${tag}`, !(name === 'zeros1k' && tag === 'xxdAuto'));
  }
}

// framing mutations on one valid od dump: must refuse (null) or stay exact.
{
  const buf = byteCases()[0]!.buf; fs.writeFileSync('/tmp/x52-rt.bin', buf);
  const good = execSync('od -A x -t x1z -v /tmp/x52-rt.bin', { encoding: 'utf8' });
  const lines = good.split('\n');
  const refuseOrExact = (tx: string, label: string) => {
    const plan = diptychonPlan(tx);
    checks++;
    if (plan) { try { if (diptychonRestore(plan.reducedText, plan.spec) !== tx) fails.push(`${label}: inexact`); } catch { fails.push(`${label}: threw`); } }
  };
  const mustRefuse = (tx: string, label: string) => expect(diptychonPlan(tx) === null, `${label}: refused`);
  const flipGutter = [...lines]; { const L = flipGutter[3]!; const gi = L.length - 2; flipGutter[3] = L.slice(0, gi) + (L[gi] === 'X' ? 'Y' : 'X') + L.slice(gi + 1); }
  mustRefuse(flipGutter.join('\n'), 'mut-gutter-flip');
  const badOff = [...lines]; badOff[2] = '0000ff' + badOff[2]!.slice(6);
  mustRefuse(badOff.join('\n'), 'mut-offset');
  const dropped = lines.filter((_, i) => i !== 4);
  mustRefuse(dropped.join('\n'), 'mut-dropped-line');
  mustRefuse(good.slice(0, -1), 'mut-no-final-newline');
  mustRefuse(good.toUpperCase(), 'mut-od-uppercase');
  mustRefuse('*\n' + good, 'mut-leading-star');
  const trunc = [...lines]; trunc[5] = trunc[5]!.slice(0, -3);
  mustRefuse(trunc.join('\n'), 'mut-truncated-gutter');
  refuseOrExact(good.replaceAll('\n', '\r\n'), 'crlf-converted');
  refuseOrExact('# captured dump\n' + good, 'hash-comment-prefix');
  refuseOrExact(good + '\n', 'extra-blank-line');
  const swapped = [...lines]; [swapped[1], swapped[2]] = [swapped[2]!, swapped[1]!];
  mustRefuse(swapped.join('\n'), 'mut-swapped-lines');
  // non-dump inputs must refuse
  mustRefuse('hello world\nthis is prose\nwith several lines\nof text here\n', 'prose');
  mustRefuse('a,b,c\n1,2,3\n4,5,6\n7,8,9\n10,11,12\n', 'csv');
  mustRefuse('', 'empty');
  mustRefuse('000000 7f 45\n', 'too-small');
  // patch-targeted attacks (X52 repair rule): mixed hex case across lines
  // must refuse; digit-only hex (case-free) must plan and stay exact.
  const digitsOnly = Buffer.from(Array.from({ length: 320 }, (_, i) => [0x12, 0x34, 0x56, 0x78, 0x90, 0x21][i % 6]!));
  fs.writeFileSync('/tmp/x52-rt.bin', digitsOnly);
  const xxdDigits = execSync('python3 bench/x52/dump_emu.py xxd /tmp/x52-rt.bin u', { encoding: 'utf8' });
  runCase(xxdDigits, 'xxd-digit-only-upper-flag');
  const withLetters = Buffer.from(Array.from({ length: 320 }, (_, i) => [0xab, 0xcd, 0xef, 0x12][i % 4]!));
  fs.writeFileSync('/tmp/x52-rt.bin', withLetters);
  const xxdUpper = execSync('python3 bench/x52/dump_emu.py xxd /tmp/x52-rt.bin u', { encoding: 'utf8' });
  runCase(xxdUpper, 'xxd-upper-with-letters');
  const mixed = xxdUpper.split('\n'); mixed[2] = mixed[2]!.replace('AB', 'ab');
  mustRefuse(mixed.join('\n'), 'xxd-mixed-case');
}
console.log(JSON.stringify({ seed: '0x52d1', checks, failures: fails.length, fails, emittedForPython: emitted }));
fs.writeFileSync('bench/x52/receipts/diptychon-redteam.json', JSON.stringify({ seed: '0x52d1', checks, failures: fails.length, fails }, null, 2));
process.exit(fails.length ? 1 : 0);
