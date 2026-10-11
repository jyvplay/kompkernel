// Red-team: adversarial exactness tests for uuidfold. Pass = every case decodes byte-exact.
import { uuidfoldEncode, uuidfoldDecode, UUIDFOLD_RULE } from '@/lib/omega/uuidfold';
const U = '550e8400-e29b-41d4-a716-446655440000';
const H = U.replace(/-/g, '');
const cases: Record<string, string> = {
  empty: '',
  noUuid: 'hello world',
  oneUuid: `id=${U}`,
  manyUuid: Array(12).fill(0).map((_, i) => `req-${U.slice(0, -1)}${i % 10} ok`).join('\n'),
  bareHexRun: `x ${H} y and ${U}`,
  bareUpperRun: `x ${H.toUpperCase()} y and ${U}`,
  nativeLowerIds: `project ${H} and req ${U} and project ${H.slice(1)}a`,
  upperDashed: `ID=${U.toUpperCase()} and ${U}`,
  digitOnlyUuid: `z=12345678-1234-1234-1234-123456789012 and ${U}`,
  digitOnlyBare: `zero=${'0'.repeat(32)} and ${U} and ${'7'.repeat(32)}`,
  letterUuidAndDigitBare: `a=${'0'.repeat(32)} b=${U} c=${'9'.repeat(32)}`,
  uuidGlued: `a${U}`,
  uuidGluedAfter: `${U}b`,
  uuidInsideWord: `xx${U}`,
  upperUuid: `ID=${U.toUpperCase()} and ${U}`,
  ruleSpoof: `${UUIDFOLD_RULE}\n${U}`,
  offSpoof: `UUIDFOLD: off\n${U}`,
  startsWithTag: `UUIDFOLD: nothing here ${U}`,
  crlf: `a ${U}\r\nb ${U}\r\n`,
  dashNeighbour: `req-${U} and ${U}-x`,
  multiBlank: `${U}\n\n${U}\n\n\n`,
  sixtyFourHexSplit: `${H}${H}`,
  unicode: `名前 ${U} ✓ — “quoted”`,
};
let fail = 0;
for (const [name, t] of Object.entries(cases)) {
  const r = uuidfoldEncode(t, 'o200k_base');
  const ok = uuidfoldDecode(r.wire) === t && r.decoded === t && r.exact;
  if (!ok) fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name.padEnd(18)} mode=${r.mode.padEnd(9)} uuids=${r.uuids} in=${r.inTokens} out=${r.outTokens}`);
}
console.log(fail === 0 ? 'ALL PASS' : `FAILURES: ${fail}`);
process.exit(fail === 0 ? 0 : 1);
