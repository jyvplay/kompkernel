// KOINE-K1 + PHALANX-P2 red team. (1) 24 hand edge cases; (2) 3000 fuzzed structured texts.
// Core property tested on the BODY (no gate): koineDecodeBody(koineEncodeBody(x)) === x.
// Then the full module (koineEncode) and the full chain (phalanx2Encode) must decode exactly.
import { koineEncodeBody, koineDecodeBody, koineEncode, koineDecode, KOINE_HEADER, KOINE_ESC } from '@/lib/omega/koine';
import { phalanx2Encode, phalanx2Decode, PHALANX2_ESC } from '@/lib/omega/phalanx2';
const cases: [string, string][] = [
  ['empty', ''],
  ['single newline', '\n'],
  ['only ampersand', '&'],
  ['literal &: field', '&:x\n&:x'],
  ['literal folded-looking field', '&12:abc\n&12:abd'],
  ['field starting &digits without colon', '&12 x\n&12 y'],
  ['shared 8+ prefix equal fields', '2026-10-12T01:25:56.77410\n2026-10-12T01:25:56.77411'],
  ['equal long fields', 'aaaaaaaaaaaa bbbbbbbbbbbb\naaaaaaaaaaaa bbbbbbbbbbbb'],
  ['leading whitespace line', '      2026-10-12T01:25:56.1111 x\n      2026-10-12T01:25:56.1112 x'],
  ['tabs and CRLF', 'a\t2026-10-12T01:25:56.1111\r\nb\t2026-10-12T01:25:56.1112\r\n'],
  ['trailing spaces', '2026-10-12T01:25:56.1111   \n2026-10-12T01:25:56.1112   '],
  ['unicode fields', 'héllo-wörld-αβγδ 1\nhéllo-wörld-αβγε 2'],
  ['field count shift', 'a bbbbbbbbbb c\nbbbbbbbbbb c\nbbbbbbbbbbX c d'],
  ['header itself as input', KOINE_HEADER + '\n&9:x'],
  ['escape itself as input', KOINE_ESC + '\nhello world'],
  ['header then escape', KOINE_HEADER + '\n' + KOINE_ESC + '\nq'],
  ['marker in middle of field', 'x&9:y 1\nx&9:y 2'],
  ['many blank lines', '\n\n\n2026-10-12T01:25:56.1\n\n\n2026-10-12T01:25:56.2\n\n'],
  ['identical lines', 'same line of text here\nsame line of text here\nsame line of text here'],
  ['prefix longer than ref', 'abcdefghijkl\nabcdefgh'],
  ['ref empty field', '\n\nabcdefghijkl'],
  ['nul and control', 'abcdefghij\u0000x\nabcdefghij\u0001y'],
  ['emoji fields', '🙂🙂🙂🙂🙂🙂🙂🙂A\n🙂🙂🙂🙂🙂🙂🙂🙂B'],
  ['json-like with ampersand', '{"q":"a&b&c&d","id":"0123456789abcdef"}\n{"q":"a&b&c&e","id":"0123456789abcdeg"}'],
  ['ls-like permissions', '-rw-r--r-- 1 user user 2026-10-12 01:38:04.906824326 +0000 index.ts\n-rw-r--r-- 1 user user 2026-10-12 01:38:04.906999999 +0000 index2.ts'],
];
let fails = 0;
function check(label: string, x: string) {
  const body = koineDecodeBody(koineEncodeBody(x, 'o200k_base', 8));
  const body4 = koineDecodeBody(koineEncodeBody(x, 'o200k_base', 4));
  const full = koineDecode(koineEncode(x, 'o200k_base').wire);
  const chain = phalanx2Decode(phalanx2Encode(x, 'o200k_base').wire);
  const ok = body === x && body4 === x && full === x && chain === x;
  if (!ok) { fails++; console.log('FAIL', label, { body: body === x, body4: body4 === x, full: full === x, chain: chain === x }); }
  return ok;
}
let pass = 0;
for (const [label, x] of cases) { if (check(label, x)) pass++; }
console.log(`EDGE: ${pass}/${cases.length} PASS`);

// fuzz: structured listings with shared prefixes, random '&', ':', digits, tabs, CR, unicode; plus random bytes
let seed = 0x9e3779b9 >>> 0;
const rnd = () => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return seed / 4294967296; };
const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
const alpha = ['a', 'b', '0', '1', '9', '&', ':', '.', '/', '-', 'x', 'é', '🙂', '~', '='];
const ws = [' ', ' ', ' ', '\t', '  ', '\r', '\u00a0'];
let fuzzPass = 0;
const N = 3000;
for (let it = 0; it < N; it++) {
  const nLines = 1 + Math.floor(rnd() * 12);
  const lines: string[] = [];
  let prefix = '';
  for (let li = 0; li < nLines; li++) {
    const nf = Math.floor(rnd() * 5);
    const fields: string[] = [];
    for (let f = 0; f < nf; f++) {
      let s = '';
      if (rnd() < 0.5 && prefix.length) s = prefix.slice(0, Math.floor(rnd() * (prefix.length + 1)));
      const len = Math.floor(rnd() * 14);
      for (let c = 0; c < len; c++) s += pick(alpha);
      if (s === '') s = pick(['&', '&:', '&9:', '&0:x', 'k']);
      fields.push(s);
    }
    prefix = fields[0] ?? prefix;
    let line = '';
    for (let f = 0; f < fields.length; f++) line += (f ? pick(ws) : (rnd() < 0.2 ? pick(ws) : '')) + fields[f];
    if (rnd() < 0.2) line += pick(ws);
    lines.push(line);
  }
  const x = lines.join(rnd() < 0.1 ? '\r\n' : '\n');
  if (check('fuzz#' + it, x)) fuzzPass++;
  if (fails > 20) break;
}
console.log(`FUZZ: ${fuzzPass}/${N} PASS (structured, shared prefixes, & : digits tabs CR nbsp unicode)`);
// random bytes incl. header prefix forms
let bytePass = 0;
for (let it = 0; it < 500; it++) {
  let x = '';
  const len = Math.floor(rnd() * 200);
  for (let c = 0; c < len; c++) x += String.fromCharCode(Math.floor(rnd() * 128));
  if (it % 50 === 0) x = KOINE_HEADER + '\n' + x;
  if (it % 50 === 1) x = PHALANX2_ESC + '\n' + x;
  if (check('bytes#' + it, x)) bytePass++;
}
console.log(`BYTES: ${bytePass}/500 PASS (random ASCII incl. escape-prefixed inputs)`);
console.log(fails === 0 ? 'ALL EXACT' : `FAILURES: ${fails}`);
