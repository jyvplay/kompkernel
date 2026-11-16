import { prokenoSites, prokenoTransform, prokenoUndo, prokenoContract, prokenoParseContract, prokenoSelfTest, PROKENO_LETTER } from '../../src/lib/omega/prokeno';
const r = prokenoSelfTest();
console.log(`self-test: ${r.pass} pass, ${r.fail} fail`);
for (const l of r.log.filter((x) => x.startsWith('FAIL')).slice(0, 12)) console.log('  ' + l);
// adversarial cases
const cases = [
  'x86_64 libfoo2 1.2.3-4 v1.2\n',
  'root root 4096 Nov 12 10:34 libfoo.so.1 -> libfoo.so.1.2.3\n',
  'a 1 b 2 c3 d 4\n',
  '1 2 3\n',
  '| 1 | 2 |\n',
  'no digits at all\n',
  'x~1 y 1\n',
  '  leading 1 and trailing 2 \n',
  'num 1.num2 2\n',
];
let pass = 0, fail = 0;
for (const src of cases) {
  const sites = prokenoSites(src);
  const cls = new Set<string>(sites.filter((s) => s.kind !== 'skip').map((s) => s.cls));
  const MARK = '@';
  for (const c of cls) {
    if (src.includes(MARK)) continue;
    const t = prokenoTransform(src, new Set([c]), MARK);
    const u = prokenoUndo(t, new Set([c]), MARK);
    if (u === src) pass++; else { fail++; console.log(`FAIL ${JSON.stringify(src)} cls=${c} -> ${JSON.stringify(t)} -> ${JSON.stringify(u)}`); }
  }
  // all classes at once
  const t = prokenoTransform(src, cls, MARK);
  const u = prokenoUndo(t, cls, MARK);
  if (u === src) pass++; else { fail++; console.log(`FAIL(all) ${JSON.stringify(src)} -> ${JSON.stringify(t)} -> ${JSON.stringify(u)}`); }
}
const c1 = prokenoContract([PROKENO_LETTER], '~');
import { countTokens } from '../../src/lib/omega/bpe';
console.log('contract tokens:', countTokens(c1 + '\n', 'o200k_base'));
const c2 = prokenoContract([PROKENO_LETTER, 'P:|', 'P:.'], '^');
console.log('contract1:', c1);
console.log('contract2:', c2);
console.log('parse1 ok:', JSON.stringify(prokenoParseContract(c1)));
console.log('parse2 ok:', JSON.stringify(prokenoParseContract(c2)));
console.log(`adversarial: ${pass} pass, ${fail} fail`);
