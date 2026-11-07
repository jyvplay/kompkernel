/**
 * X78 — TOKENISATION QUIRKS. The currency is TOKENS, not characters. If two strings
 * carry the same information but tokenise differently, the cheaper one is strictly
 * better. No human-designed compressor optimises for this. Which quirks are exploitable
 * and INVERTIBLE (declarable in one short rule an LLM can apply)?
 */
import { countTokens as T } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
const groups: Array<[string, string[]]> = [
  ['ISO date',      ['2026-09-30', '20260930', '2026/09/30', '2026.09.30', '30-09-2026']],
  ['time',          ['08:00:03', '080003', '08:00:03.482', '080003.482']],
  ['IPv4',          ['192.168.1.100', '192168100', '192 168 1 100', '10.0.0.1']],
  ['uuid',          ['a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'a1b2c3d4e5f67890abcdef1234567890']],
  ['semver',        ['v1.2.3', '1.2.3', '10203', '1-2-3']],
  ['hyphen word',   ['baseline-browser-mapping', 'baseline browser mapping', 'baselinebrowsermapping', 'baselineBrowserMapping']],
  ['path',          ['/usr/lib/x86_64-linux-gnu/', 'usr lib x86 64 linux gnu', '/usr/lib/', 'usrlib']],
  ['case',          ['Active', 'active', 'ACTIVE', 'Pending', 'pending']],
  ['kv sep',        ['key: value', 'key:value', 'key = value', 'key=value', 'key\tvalue']],
  ['money',         ['1,234.56', '1234.56', '123456']],
  ['indent',        ['    item', '\titem', '·item', '>item']],
  ['repeatchar',    ['aaaaaaaaaaaaaaaa', 'a16', '----------------', '-16']],
  ['space run',     ['a        b', 'a b', 'a\tb', 'a·b']],
  ['num with unit', ['1024Mi', '1024 Mi', '4096Ki']],
  ['plural words',  ['node_modules/.bin', 'node modules bin', 'nodemodulesbin']],
];
console.log(`${'group'.padEnd(16)} ${'variant'.padEnd(38)} ${'chars'.padStart(5)} ${'tok'.padStart(4)} ${'vs best'.padStart(8)}`);
for (const [g, vs] of groups) {
  const toks = vs.map((v) => T(v, enc));
  const best = Math.min(...toks);
  vs.forEach((v, i) => {
    console.log(`${(i === 0 ? g : '').padEnd(16)} ${JSON.stringify(v).padEnd(38)} ${String(v.length).padStart(5)} ${String(toks[i]).padStart(4)} ${(toks[i] === best ? '  BEST' : `  +${toks[i] - best}`).padStart(8)}`);
  });
}
console.log('\n--- realistic multi-line payloads: same information, different spelling ---');
const ROWS = 12;
const d = (i: number) => `2026-11-${String((i % 28) + 1).padStart(2, '0')}`;
const t = (i: number) => `${String(8 + (i % 10)).padStart(2, '0')}:${String((i * 7) % 60).padStart(2, '0')}:${String((i * 13) % 60).padStart(2, '0')}`;
const variants: Array<[string, string]> = [
  ['dashed ISO + colon time', Array.from({ length: ROWS }, (_, i) => `${d(i)}T${t(i)}Z svc=payment dur=${100 + i}ms`).join('\n')],
  ['packed digits',           Array.from({ length: ROWS }, (_, i) => `${d(i).replace(/-/g, '')}T${t(i).replace(/:/g, '')}Z svc=payment dur=${100 + i}ms`).join('\n')],
  ['ip dashed',               Array.from({ length: ROWS }, (_, i) => `host 192.168.1.${100 + i} ok`).join('\n')],
  ['ip packed',               Array.from({ length: ROWS }, (_, i) => `host 1921681${100 + i} ok`).join('\n')],
];
for (const [name, s] of variants) console.log(`${name.padEnd(26)} ${String(s.length).padStart(5)} chars  ${String(T(s, enc)).padStart(4)} tok`);
