import { denTree, denExpand, denLines } from '@/lib/omega/dendron';
const cases: string[][] = [
  ['a/b', 'a/c', 'a/d'],
  ['dir/', 'dir/x', 'dir/y'],
  ['a/b', 'a/b/c', 'a/b/d', 'a/e'],
  ['./src/a/x.ts', './src/a/y.ts', './src/b/z.ts'],
  ['/usr/bin/a', '/usr/bin/b', '/usr/lib/c', '/usr/lib/d/e', '/usr/lib/d/f'],
  ['a/x/1', 'a/x/2', 'a/y/1', 'a/y/2', 'a/y/3'],
  ['p/q', 'p/q', 'p/r'],
  ['noslash', 'a/1', 'a/2'],
  ['ünï/cödé/α', 'ünï/cödé/β', 'ünï/ß'],
];
let ok = 0;
for (const c of cases) {
  const t = denTree(c).join('\n');
  const back = denExpand(t);
  const pass = back === c.join('\n');
  if (pass) ok++;
  console.log(pass ? 'OK  ' : 'FAIL', JSON.stringify(t), pass ? '' : JSON.stringify(back));
}
console.log(`${ok}/${cases.length} exact`);
console.log('denLines refuses:', denLines('a/b\na/c\n'), denLines('a/{b}\nx/c\ny/d'), denLines('a b/c\nd/e\nf/g'), denLines('a/b\n\nc/d'));
for (const c of [['a/b','a/c','a/d',''], ['a/b','','c/d','e/f'], ['x/','x/y','x/z','']]) {
  const t = denTree(c).join('\n'); console.log(denExpand(t) === c.join('\n') ? 'OK  ' : 'FAIL', JSON.stringify(t));
}
console.log('trailing-newline lines accepted:', denLines('a/b\na/c\na/d\n') !== null);
