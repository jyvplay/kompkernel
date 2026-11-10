import * as fs from 'node:fs';
import { chironDecode } from '../../src/lib/omega/chiron';
const enc: any = 'o200k_base';
const msg = fs.readFileSync('bench/x87/receipts/wires/ls-l-real.wire.txt', 'utf8');
const text = fs.readFileSync('bench/holdout-x41/ls-l-real.txt', 'utf8');
const wire = msg.slice(msg.indexOf('§'));
const dec = chironDecode(wire);
console.log('src bytes', Buffer.byteLength(text), 'decoded bytes', Buffer.byteLength(dec));
console.log('equal?', dec === text);
if (dec !== text) {
  const n = Math.min(dec.length, text.length);
  let i = 0; while (i < n && dec[i] === text[i]) i++;
  console.log('first divergence at char', i, 'of', n);
  console.log('src :', JSON.stringify(text.slice(Math.max(0, i - 60), i + 60)));
  console.log('dec :', JSON.stringify(dec.slice(Math.max(0, i - 60), i + 60)));
}
