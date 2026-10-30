import * as fs from 'node:fs';
// re-derive with the module internals via plan: print file head stats instead
const text = fs.readFileSync('bench/x58/fixtures/gwu-gradebook.csv', 'utf8');
const lines = text.split('\n');
console.log('lines', lines.length, 'first ends CR?', lines[0]!.endsWith('\r'));
console.log('line0 fields', lines[0]!.split(',').length, 'line1', lines[1]!.split(',').length, 'line2', lines[2]!.split(',').length);
const counts = lines.slice(0, 38).map(l => l.split(',').length);
console.log('field counts distinct', [...new Set(counts)]);
