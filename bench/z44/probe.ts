/**
 * Z44 tokenizer probe: the cost of pieces, whitespace and separators.
 * Run: ./bench/z44/build.sh bench/z44/probe.ts
 */
import { countTokens, tokenStrings, type EncodingName } from '../../src/lib/omega/bpe';
const enc: EncodingName = 'o200k_base';
const T = (s: string) => countTokens(s, enc);
const show = (s: string) => `${JSON.stringify(s)} = ${T(s)} tok  [${tokenStrings(s, enc).map((x) => JSON.stringify(x.s)).join(' ')}]`;

const groups: Array<[string, string[]]> = [
  ['whitespace', [' ', '  ', '    ', '        ', '\n', '\n ', '\n  ', '\n    ', '\n        ', '\n                ', '\t', '\n\t', '\n\n', '\n\n\n', 'the', ' the', '\nthe', '\n the', '  the']],
  ['separators in identifiers', ['foo-bar-baz', 'foo bar baz', 'foo_bar_baz', 'foo.bar.baz', 'a1b2c3', 'a 1 b 2 c 3', 'getBoundingClientRect', 'get bounding client rect']],
  ['paths', ['src/lib/omega/daedalus.ts', 'src lib omega daedalus.ts', 'src/ lib/ omega/ daedalus.ts', '/usr/bin/ls', 'usr bin ls', './a/b/c', 'a/b/c', ' a/b/c']],
  ['urls', ['https://github.com', 'github.com', '://', 'https', 'https://github.com/isaacs/node-glob', 'github.com/isaacs/node-glob', 'github.com isaacs node-glob']],
  ['json/punct', ['{"a":1}', '{ "a": 1 }', 'a:1', '"a": 1', '","', '":', ', ', ',']],
  ['dates', ['2026-09-15', '20260915', '2026-09-15T06:02:11Z', '20260915T060211Z', '06:02:11', '060211']],
  ['numbers', ['1,234,567', '1234567', '1.234.567', '3.14159', '314159', '0xdeadbeef', 'd34db33f']],
  ['code', ['function foo(a, b) {', 'function foo(a b) {', 'if (a && b) {', 'if a and b {', 'const x = await f();', 'x = await f()']],
  ['markdown', ['**bold**', 'bold', '- item', 'item', '[text](url)', 'text url', '`code`', 'code']],
  ['misc', ['e.g.', 'for example', 'i.e.', 'that is', '&amp;', '&', '<https://x>', 'https://x']],
];
for (const [g, items] of groups) {
  console.log(`\n## ${g}`);
  for (const s of items) console.log('  ' + show(s));
}
