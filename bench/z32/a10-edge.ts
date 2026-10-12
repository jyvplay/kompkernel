// Z32: PHALANX-A10 adversarial round trips. Each input must come back byte-exact through phalanxA10Decode(wire).
import { phalanxA10Encode, phalanxA10Decode } from '@/lib/omega/phalanx-a10';
import { veritasCEncode, veritasCDecode } from '@/lib/omega/veritas-c';
import { VXA_SENTINEL, VXN_SENTINEL, VXC_SENTINEL } from '@/lib/omega/veritas-a';
const rep = (s: string, n: number) => Array.from({ length: n }, () => s).join('');
const cases: [string, string][] = [
  ['empty', ''],
  ['one char', 'x'],
  ['VXA sentinel prefix', VXA_SENTINEL + 'K=abc\n]]\nK K K'],
  ['VXN sentinel prefix', VXN_SENTINEL + '# VXN\nK=ab\n]]\nK'],
  ['VXC sentinel prefix', VXC_SENTINEL + 'K ab\n]]\nK K'],
  ['VXC sentinel alone', VXC_SENTINEL],
  ['repeated phrase', rep('alpha beta gamma delta ', 40)],
  ['tilde and escapes', rep('a~b ~N ~~ ~R\tend\r\n', 30)],
  ['CRLF text', rep('line one\r\nline two\r\n', 25)],
  ['alias-like chars', rep('¡¢£ ¤¥¦ §¨©ª «¬ ®¯ °± ²³ ´µ ¶· ¸¹º »¼½ ¾¿À ', 12)],
  ['nested phrases', rep('the quick brown fox jumps over the lazy dog ', 20) + rep('the quick brown ', 40)],
  ['json lines', Array.from({ length: 60 }, (_, i) => `{"id":${i},"name":"item-${i % 7}","ok":true}`).join('\n')],
  ['cjk and emoji', rep('中文 字符 🚀 混合 text ', 30)],
  ['long char repeats', rep('abcdefghijklmnopqrstuvwxyz0123456789', 30)],
];
let fail = 0;
for (const [name, t] of cases) {
  let ok = false; let detail = '';
  try {
    const r = phalanxA10Encode(t, 'o200k_base');
    ok = phalanxA10Decode(r.wire) === t && r.decoded === t;
    detail = `layer=${r.layer} in=${r.inTokens} out=${r.outTokens}`;
    const c = veritasCEncode(t, 'o200k_base');
    ok = ok && veritasCDecode(c.wire) === t;
  } catch (e) { detail = 'ERR ' + (e as Error).message; }
  if (!ok) fail++;
  console.log((ok ? 'PASS' : 'FAIL').padEnd(5), name.padEnd(22), detail);
}
console.log('cases', cases.length, 'failures', fail);
