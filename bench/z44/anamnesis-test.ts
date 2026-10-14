// Z44 regression test for ANAMNESIS.
//
// This repo has no unit-test framework (no vitest/jest in package.json, no *.test.ts
// anywhere in the tree); its idiom for "is this codec still exact" is a bench
// harness plus an independent decoder plus a shell cross-check. This file follows
// that idiom: plain assertions, non-zero exit on failure. Run it with
//     bash bench/anamnesis-check.sh
// which also runs the CPython cross-decode (bench/anamnesis_decode.py) in a
// separate process against the same wires.
import fs from 'node:fs';
import { buildSessions } from './sessions';
import {
  anamnesisEncode,
  anamnesisDecodeWith,
  createSession,
  anamnesisEncodeMessage,
  anamnesisEncodeSession,
} from '@/lib/omega/anamnesis';
import { daedalusEncode } from '@/lib/omega/daedalus';
import { countTokens } from '@/lib/omega/bpe';

let pass = 0;
const failures: string[] = [];
function check(name: string, cond: boolean, detail = '') {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { failures.push(`${name} ${detail}`); console.log(`  FAIL ${name} ${detail}`); }
}

console.log('ANAMNESIS single-message exactness');
const SINGLE = [
  'bench/holdout-ops/npm-ls.txt',
  'bench/holdout-ops/openstack-loghub-26.log',
  'bench/holdout-mk/dump.sql',
  'bench/holdout-tab/vix-daily-1990.csv',
  'bench/holdout/code-ts.txt',
  'bench/holdout-work/meeting-transcript.txt',
];
for (const f of SINGLE) {
  const t = fs.readFileSync(f, 'utf8');
  for (const gate of [false, true]) {
    const r = anamnesisEncode(t, 'o200k_base', { gate });
    check(`${f.split('/').pop()} gate=${gate} byte-exact`, r.decoded === t, `mode=${r.mode}`);
    // The reported M must account for the wire and, on top of it, the contract.
    check(`${f.split('/').pop()} gate=${gate} M >= wire`,
      r.messageTokens >= countTokens(r.wire, 'o200k_base'),
      `M=${r.messageTokens} wire=${countTokens(r.wire, 'o200k_base')}`);
    check(`${f.split('/').pop()} gate=${gate} contract paid once`,
      r.mode === 'raw' ? r.contractTokens === 0 : r.contractTokens > 0 && r.contractTokens < 120,
      `mode=${r.mode} contract=${r.contractTokens}`);
  }
  // The gated form must never cost more than the shipped frontier encoder.
  const a = anamnesisEncode(t, 'o200k_base', { gate: true });
  const d = daedalusEncode(t, 'o200k_base');
  check(`${f.split('/').pop()} gate never loses to DAEDALUS`, a.messageTokens <= d.messageTokens,
    `ana=${a.messageTokens} dae=${d.messageTokens}`);
}

console.log('ANAMNESIS determinism (two runs, identical wires)');
{
  const t = fs.readFileSync('bench/holdout-ops/npm-ls.txt', 'utf8');
  const a = anamnesisEncode(t, 'o200k_base', { gate: false });
  const b = anamnesisEncode(t, 'o200k_base', { gate: false });
  check('same input -> same wire', a.wire === b.wire);
}

console.log('ANAMNESIS session exactness + independent re-decode');
for (const s of buildSessions()) {
  const r = anamnesisEncodeSession(s.messages, 'o200k_base');
  check(`${s.name} encoder-side exact`, r.exactAll);
  // Independent pass: rebuild the cumulative table by replaying the session, and
  // decode each message with nothing but its own wire and the table it had.
  let ok = true;
  const replay = createSession('o200k_base');
  for (let i = 0; i < r.messages.length; i++) {
    const got = anamnesisDecodeWith(r.messages[i].wire, replay.rules.slice(), replay.priorText.join('\n'));
    if (got !== s.messages[i]) { ok = false; console.log(`       ${s.name} msg ${i} mismatch`); break; }
    anamnesisEncodeMessage(s.messages[i], replay, {});   // advances the table
  }
  check(`${s.name} re-decode from wires alone`, ok);
  const total = r.messages.reduce((a, m) => a + m.messageTokens, 0);
  const raw = s.messages.reduce((a, m) => a + countTokens(m, 'o200k_base'), 0);
  check(`${s.name} session total < raw`, total < raw, `${total} vs ${raw}`);
  console.log(`       ${s.name}: raw=${raw} session=${total} (${(100 * (1 - total / raw)).toFixed(1)}%)`);
}

console.log('ANAMNESIS adversarial and edge inputs');
{
  const edge: [string, string][] = [
    ['empty', ''],
    ['one char', 'a'],
    ['whitespace only', '   \n\t \n'],
    ['markers present in text', 'x «a·b» y «c·d» z'],
    ['chiron delimiters in text', '§tape¶body § more ¶ here'],
    ['cjk only', '漢字漢字漢字漢字漢字漢字漢字漢字'],
    ['repeated long line', Array.from({ length: 40 }, (_, i) => `line ${i} the quick brown fox jumps over the lazy dog`).join('\n')],
    ['single long token run', 'a'.repeat(2000)],
  ];
  for (const [name, t] of edge) {
    const r = anamnesisEncode(t, 'o200k_base', { gate: false });
    check(`single ${name} byte-exact`, r.decoded === t, `mode=${r.mode}`);
    const sess = anamnesisEncodeSession([t, t, `${t} and again ${t}`], 'o200k_base');
    check(`session ${name} byte-exact`, sess.exactAll);
  }
}

console.log(`\n${failures.length ? 'FAILURES: ' + failures.length : 'ALL CHECKS PASSED'} (${pass} checks)`);
for (const f of failures) console.log('  - ' + f);
process.exit(failures.length ? 1 : 0);
