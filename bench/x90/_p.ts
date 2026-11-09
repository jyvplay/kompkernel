import { symphyiaContract, symphyiaParseContract, symphyiaContractRoundTrips } from '../../src/lib/omega/symphyia';
const R = (j: number, i: number, form: any, A: string, B: string): any => ({ j, i, form, A, B, rows: 5, eligible: 5, distinctSource: 5, est: 0 });
const cases: Array<{ rules: any[]; marker: string; crc: string; why: string }> = [
  { rules: [R(11, 9, 'tail', '', '')], marker: '※', crc: '16f86bf2', why: 'ls-l-real as measured: symlink target = link name + tail' },
  { rules: [R(11, 9, 'tail', '/etc/alternatives/', '')], marker: '※', crc: 'a7511409', why: 'ls-la-usrbin as measured: constant prefix + sibling, PROSPHYSIS cannot fire' },
  { rules: [R(2, 4, 'head', '', '')], marker: '჻', crc: '39e50f9b', why: 'dpkg-l-full: package:arch over the arch column' },
  { rules: [R(15, 9, 'full', '/v2/', '/servers/detail')], marker: '⸙', crc: 'deadbeef', why: 'openstack shape (refused by G9, but the form must still be self-describing)' },
  { rules: [R(12, 6, 'full', '**', '**')], marker: '҂', crc: '00112233', why: 'agent-history markdown bold shape (refused by G9)' },
  { rules: [R(3, 1, 'tail', 'x', ''), R(7, 5, 'head', '', 'z')], marker: '※', crc: 'a1b2c3d4', why: 'two rules, mixed forms, one shared marker' },
  { rules: [R(15, 9, 'full', '/v2/', '/x'), R(3, 1, 'tail', '', '')], marker: '⸙', crc: 'ffee0011', why: 'full + tail: the full rule is the only place the marker is named' },
  { rules: [R(4, 2, 'tail', 'a"b', '')], marker: 'ꙮ', crc: '0a0b0c0d', why: 'a quote INSIDE an affix (must be escaped or the contract is ambiguous), marker outside the Cyrillic/Georgian range' },
  { rules: [R(4, 2, 'head', '', 'x\\y')], marker: '※', crc: 'ff00ff00', why: 'a BACKSLASH inside an affix' },
  { rules: [R(4, 2, 'full', ' + text after ', ' in f9 = ')], marker: '※', crc: '12345678', why: 'ADVERSARIAL: affixes containing the contract\'s own grammar, which must not be re-parseable as rules' },
];
let ok = 0;
for (const c of cases) {
  const { rules, marker, crc } = c;
  const line = symphyiaContract(rules, marker, crc);
  const back = symphyiaParseContract(line);
  const rt = symphyiaContractRoundTrips(rules, marker, crc);
  const good = rt && back !== null && back.marker === marker && back.crc === crc && back.rules.length === rules.length
    && back.rules.every((r: any, k: number) => r.j === rules[k].j && r.i === rules[k].i && r.form === rules[k].form && r.A === rules[k].A && r.B === rules[k].B);
  if (good) ok++;
  console.log(`${good ? 'OK  ' : 'FAIL'} ${line}`);
  console.log(`        ${c.why}`);
  if (!good) console.log(`     parsed: ${JSON.stringify(back)}`);
}
console.log(`\ncontract parser round trip: ${ok}/${cases.length}`);
// adversarial: a contract whose rule index was edited must still parse (it is well-formed) —
// the CRC is what catches it, which the fuzz measured at 381/381 refused
const evil = symphyiaContract(cases[0].rules, '※', '16f86bf2').replace('f9', 'f8');
console.log(`\nedited-index contract parses: ${symphyiaParseContract(evil) !== null} (expected true; the CRC, not the parser, must catch it)`);
console.log(`truncated contract refused: ${symphyiaParseContract('X90. Body first. f11 = f9') === null}`);
console.log(`wrong prefix refused: ${symphyiaParseContract('X91. Body first. f11 = f9 (1-based). crc=16f86bf2') === null}`);
