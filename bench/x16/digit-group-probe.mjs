// X16 probe: o200k tokens of integers written plain vs with thousands separators, on real numeric fields.
import fs from 'node:fs';
import { encode } from 'gpt-tokenizer/encoding/o200k_base';
const f = process.argv[2];
const rows = fs.readFileSync(f, 'utf8').split('\n').slice(1).filter(Boolean);
const nums = [];
for (const r of rows) for (const c of r.split(',')) if (/^\d{4,}$/.test(c)) nums.push(c);
const grp = (s) => s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
let a = 0, b = 0;
for (const n of nums) { a += encode(n).length; b += encode(grp(n)).length; }
console.log(JSON.stringify({ file: f, ints: nums.length, plainTok: a, groupedTok: b, delta: b - a }));
