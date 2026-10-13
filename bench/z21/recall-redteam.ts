// RECALL-R1 + PHALANX-P3 red team: 25 hand edge cases, 3000 structured fuzz texts (shared columns, '@', ':', digits,
// tabs, CR, nbsp, unicode, identical and near-identical lines), 500 random ASCII (incl. escape-prefixed inputs).
// Body-level round trip (no gate) and full-chain round trip must both be exact.
import { recallEncodeBody, recallDecodeBody, recallEncode, recallDecode, RECALL_HEADER, RECALL_ESC } from '@/lib/omega/recall';
import { phalanx3Encode, phalanx3Decode, PHALANX3_ESC } from '@/lib/omega/phalanx3';
const cases: [string, string][] = [
  ['empty', ''],
  ['single newline', '\n'],
  ['only at-sign', '@'],
  ['literal @3 field', 'abcdefgh @3\nabcdefgh @3\nabcdefgh @3'],
  ['literal @: field', '@:xyzw\n@:xyzw\n@:xyzw'],
  ['field equal 3 lines up', 'aaaa1\nbbbb2\ncccc3\naaaa1'],
  ['field equal only 1 line up', 'wxyz 1\nwxyz 2\nwxyz 3'],
  ['long equal columns', 'longfieldvalue x\nother y\nlongfieldvalue z\nmore w\nlongfieldvalue q'],
  ['window boundary (17 lines)', Array.from({ length: 17 }, (_, i) => (i === 0 ? 'keepme' : 'v' + i)).join('\n') + '\nkeepme'],
  ['window boundary (16 lines)', Array.from({ length: 16 }, (_, i) => (i === 0 ? 'keepme' : 'v' + i)).join('\n') + '\nkeepme'],
  ['tabs and CRLF', 'a\tqqqqqq\r\nb\tqqqqqq\r\nc\tqqqqqq\r\n'],
  ['leading whitespace', '   zzzzzz\n   zzzzzz\n\tzzzzzz'],
  ['unicode fields', 'héllo-αβγδ 1\nwörld-αβγδ 1\nhéllo-αβγδ 1'],
  ['header itself as input', RECALL_HEADER + '\nkkkk'],
  ['escape itself as input', RECALL_ESC + '\nhello world\nhello world'],
  ['field count shift', 'alpha beta gamma\nbeta gamma\nalpha beta gamma'],
  ['empty lines between', 'kkkkk\n\nkkkkk\n\n\nkkkkk'],
  ['phalanx3 identity escape', PHALANX3_ESC + '\nrepeat repeat\nrepeat repeat'],
  ['many repeats', Array.from({ length: 40 }, (_, i) => 'same' + (i % 3) + ' value').join('\n')],
  ['at-prefixed numeric repeats', '@1 @1 @1\n@1 @1 @1\n@1 @1 @1'],
  ['numbers that look like refs', '1234 1234\n1234 5678\n1234 1234'],
  ['nul and control', 'abcd\u0000x\nabcd\u0001y\nabcd\u0000x'],
  ['emoji fields', '🙂🙂🙂🙂 A\n🙂🙂🙂🙂 B\n🙂🙂🙂🙂 A'],
  ['json with at-sign', '{"u":"@user1","k":"@user1"}\n{"u":"@user1","k":"@user2"}\n{"u":"@user1"}'],
  ['ref at line 1', '@2\nxxxxx'],
];
let fails = 0;
function check(label: string, x: string): boolean {
  const body = recallDecodeBody(recallEncodeBody(x, 'o200k_base'));
  const full = recallDecode(recallEncode(x, 'o200k_base').wire);
  const chain = phalanx3Decode(phalanx3Encode(x, 'o200k_base').wire);
  const ok = body === x && full === x && chain === x;
  if (!ok) { fails++; console.log('FAIL', label, { body: body === x, full: full === x, chain: chain === x }); }
  return ok;
}
let pass = 0;
for (const [label, x] of cases) if (check(label, x)) pass++;
console.log(`EDGE: ${pass}/${cases.length} PASS`);

let seed = 0x2545f491 >>> 0;
const rnd = () => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return seed / 4294967296; };
const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
const alpha = ['a', 'b', '0', '1', '@', ':', '.', '/', '-', '&', '^', 'é', '🙂', '=', ' '];
const ws = [' ', ' ', '\t', '  ', '\r', '\u00a0'];
let fuzzPass = 0;
const N = 3000;
const pool: string[] = [];
for (let it = 0; it < N; it++) {
  const nLines = 1 + Math.floor(rnd() * 22);
  const lines: string[] = [];
  for (let li = 0; li < nLines; li++) {
    if (pool.length && rnd() < 0.5) { // reuse a value from earlier, sometimes at the same column
      const nf = 1 + Math.floor(rnd() * 4);
      let line = '';
      for (let f = 0; f < nf; f++) line += (f ? pick(ws) : '') + pick(pool);
      lines.push(line); continue;
    }
    const nf = Math.floor(rnd() * 5);
    let line = '';
    for (let f = 0; f < nf; f++) {
      let s = '';
      const len = Math.floor(rnd() * 9);
      for (let c = 0; c < len; c++) s += pick(alpha);
      if (s === '') s = pick(['@', '@:', '@9', 'k']);
      pool.push(s);
      line += (f ? pick(ws) : (rnd() < 0.15 ? pick(ws) : '')) + s;
    }
    if (rnd() < 0.15) line += pick(ws);
    lines.push(line);
  }
  const x = lines.join(rnd() < 0.1 ? '\r\n' : '\n');
  if (check('fuzz#' + it, x)) fuzzPass++;
  if (fails > 20) break;
}
console.log(`FUZZ: ${fuzzPass}/${N} PASS (shared columns, @ : & ^ digits tabs CR nbsp unicode)`);
let bytePass = 0;
for (let it = 0; it < 500; it++) {
  let x = '';
  const len = Math.floor(rnd() * 200);
  for (let c = 0; c < len; c++) x += String.fromCharCode(Math.floor(rnd() * 128));
  if (it % 50 === 0) x = RECALL_HEADER + '\n' + x;
  if (it % 50 === 1) x = PHALANX3_ESC + '\n' + x;
  if (check('bytes#' + it, x)) bytePass++;
}
console.log(`BYTES: ${bytePass}/500 PASS (random ASCII incl. escape-prefixed inputs)`);
console.log(fails === 0 ? 'ALL EXACT' : `FAILURES: ${fails}`);
