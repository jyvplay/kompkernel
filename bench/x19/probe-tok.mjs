// X19 probe: how does o200k_base tokenize digit-ish payloads? Cheap, no DAEDALUS.
import { encode } from 'gpt-tokenizer';

const T = (s) => encode(s).length;
const show = (label, s) => {
  const ids = encode(s);
  console.log(label.padEnd(34), String(ids.length).padStart(4), 'chars=' + String(s.length).padStart(4),
    'tok/chars=' + (ids.length / s.length).toFixed(3));
};

console.log('--- decimal runs of length n (random digits) ---');
for (const n of [1,2,3,4,5,6,7,8,9,10,12,15,18,24]) {
  let s = '';
  let x = 1234567;
  for (let i = 0; i < n; i++) { x = (x * 1103515245 + 12345) & 0x7fffffff; s += String(x % 10); }
  show('dec n=' + n, s);
}
console.log('--- hex runs ---');
for (const n of [1,2,3,4,5,6,7,8,9,10,12,16,24]) {
  let s = '';
  let x = 987654321;
  for (let i = 0; i < n; i++) { x = (x * 1103515245 + 12345) & 0x7fffffff; s += '0123456789abcdef'[x % 16]; }
  show('hex n=' + n, s);
}
console.log('--- decimal with separators ---');
show('date 2026-08-14', '2026-08-14');
show('packed 20260814', '20260814');
show('time 10:00:01.234', '10:00:01.234');
show('packed 100001234', '100001234');
show('ip 192.168.1.101', '192.168.1.101');
show('money 18,442.17', '18,442.17');
show('ver 1.2.3', '1.2.3');
show('semver 10.20.300', '10.20.300');

console.log('--- CJK / exotic single chars ---');
show('CJK 1000 chars', Array.from({length:1000},(_,i)=>String.fromCodePoint(0x4e00+i)).join(''));
show('CJK 1000 chars spaced', Array.from({length:1000},(_,i)=>String.fromCodePoint(0x4e00+i)+' ').join(''));
show('digit-per-CJK 1000', Array.from({length:1000},(_,i)=>String.fromCodePoint(0x4e00+(i%10000))).join(''));

console.log('--- how many BMP CJK are 1 token? ---');
let one = 0, tot = 0;
for (let cp = 0x4e00; cp < 0xa000; cp += 1) { tot++; if (T(String.fromCodePoint(cp)) === 1) one++; }
console.log('U+4E00..U+9FFF:', one, '/', tot, 'are exactly 1 token');

console.log('--- base64-ish packing of digits into 1-token chars? ---');
// 4 decimal digits -> one CJK char (0x4e00 + n). cost: 1 token per 4 digits
console.log('dec 12 digits:', T('123456789012'), ' vs 3 CJK chars:', T(String.fromCodePoint(0x4e00+1234)+String.fromCodePoint(0x4e00+5678)+String.fromCodePoint(0x4e00+9012)));

console.log('--- misc: what does a space cost? ---');
show('word word word', 'word word word');
show('word,word,word', 'word,word,word');
