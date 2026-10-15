import fs from 'node:fs';
import { denTree, DEN_RULE } from '@/lib/omega/dendron';
const all = fs.readFileSync('bench/z51/corpus/git-ls-files-400.txt', 'utf8');
const lines = all.split('\n').slice(0, 40);
const expected = lines.join('\n') + '\n';
const tree = denTree(lines.concat(['']));   // trailing newline = empty last line
const message = DEN_RULE + '\n' + tree.join('\n');
fs.writeFileSync('bench/z51/receipts/blind/expected-original.txt', expected);
fs.writeFileSync('bench/z51/receipts/blind/message.txt', message + '\n');
console.log('lines', lines.length, 'message chars', message.length);
