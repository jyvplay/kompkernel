// z52: writes the TREE TEXT (the layer the reader expands by the brace rule) for the hand-decode sample.
import fs from 'node:fs';
import { densWireLines, densExpand } from '@/lib/omega/dendrons';
const text = fs.readFileSync('bench/z52/receipts/handdecode/sample-expected.txt', 'utf8');
const tree = densWireLines(text, '.').join('\n');
fs.writeFileSync('bench/z52/receipts/handdecode/sample-tree.txt', tree);
console.log('expands-exact', densExpand(tree) === text, 'treeLines', tree.split('\n').length, 'chars', tree.length, 'vs', text.length);
