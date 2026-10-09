import { countTokens, type EncodingName } from '../src/lib/omega/bpe';
const ENC: EncodingName = 'o200k_base';
const T = (s: string) => countTokens(s, ENC);
const cands = '⟦⟧⟨⟩⌈⌉⌊⌋«»⟪⟫†‡§¶•◊★☆♦♠♣♥▲▼►◄●○■□◆◇✓✗↑↓←→↔⇒⇔∀∃∈∉∑∏√∞≈≠≤≥⊕⊗⊥∥∠∆∇∫';
const ok: string[] = []; for (const c of [...cands]) if (T(c)===1) ok.push(c);
console.log('1-token markers:', ok.join(''), `(${ok.length}/${[...cands].length})`);
console.log('cost of a few:', [...'⟦⟨⌈«¶§†•◊'].map(c=>`${c}:${T(c)}`).join(' '));
// in-context cost (a marker glued to digits may cost more)
for (const c of ok.slice(0,20)) {
  const a = T('x '+c+'20260910083456789 y');
  console.log(c, 'in-context total', a);
}
console.log('\n=== marker-free ISO defrag ===');
const one = '2026-09-10T08:34:56.789Z';
console.log(JSON.stringify(one), T(one), '->', JSON.stringify('20260910083456789'), T('20260910083456789'));
const two = '2026-09-10';
console.log(JSON.stringify(two), T(two), '->', T('20260910'));
console.log('"08:34:56"', T('08:34:56'), '-> "083456"', T('083456'));
console.log('"12:34"', T('12:34'), '-> "1234"', T('1234'));
console.log('"192.168.100.254"', T('192.168.100.254'), '-> "192168100254"', T('192168100254'));
console.log('"1,284"', T('1,284'), '-> "1284"', T('1284'));
console.log('"$1,245,600"', T('$1,245,600'), '-> "$1245600"', T('$1245600'));
console.log('"2019-03-14"', T('2019-03-14'));
console.log('"pp. 45-67"', T('pp. 45-67'), ' "45-67"', T('45-67'), ' "4567"', T('4567'));
console.log('"550e8400-e29b-41d4-a716-446655440000"', T('550e8400-e29b-41d4-a716-446655440000'), '-> nodash', T('550e8400e29b41d4a716446655440000'));
