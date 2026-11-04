/**
 * SECOND-ORDER ADVERSARY A(C) against PROSPHYSIS, on the shipped code.
 * 15 cases derived from the codec's own structure + a 400-document round-trip fuzz.
 * The failure that matters is silent data loss; losing tokens is not a failure.
 */
import { prosphysisEncode, prosphysisDecode, prosphysisRewrite } from '../../src/lib/omega/prosphysis';
const enc: any = 'o200k_base';
const cases: Array<{ name: string; text: string }> = [
  { name: 'marker already in source', text: 'a -> b\u00a7c\nlrwx 1 r r 9 Jan 1 x -> /p/x\u00a7y' },
  { name: 'marker is the whole tail', text: 'lrwx 1 r r 9 Jan 1 libfoo -> \u00a7' },
  { name: 'target shorter than name', text: 'lrwx 1 r r 9 Jan 1 verylongname -> v' },
  { name: 'target equal to name', text: 'lrwx 1 r r 9 Jan 1 same -> same' },
  { name: 'no arrow at all', text: 'drwxr-xr-x 1 root root 4096 Jan 1 2024 .\n-rw-r--r-- 1 root root 2 Jan 1 2024 z' },
  { name: 'arrow mid-line', text: 'x -> a -> b\nc -> d' },
  { name: 'empty file', text: '' },
  { name: 'single trailing newline', text: 'lrwx 1 r r 1 Jan 1 foo -> foo.bar\n' },
  { name: 'CRLF', text: 'lrwx 1 r r 1 Jan 1 foo -> foo.bar\r\nlrwx 1 r r 1 Jan 1 bar -> bar.baz\r\n' },
  { name: 'unicode name', text: 'lrwx 1 r r 1 Jan 1 日本語.so -> 日本語.so.1' },
  { name: 'quoted target with spaces', text: 'lrwx 1 r r 1 Jan 1 "a b" -> /x/a b.1' },
  { name: 'huge affix', text: `lrwx 1 r r 1 Jan 1 n -> n${'z'.repeat(5000)}` },
  { name: 'cycle bait', text: 'lrwx 1 r r 1 Jan 1 a -> b\nlrwx 1 r r 1 Jan 1 b -> a' },
  { name: 'every line a link, none related', text: Array.from({ length: 200 }, (_, i) => `lrwx 1 r r 1 Jan 1 k${i} -> /z/q${i * 7}.so`).join('\n') },
  { name: 'marker as the name itself', text: 'lrwx 1 r r 1 Jan 1 \u00a7 -> \u00a7.a' },
];
let fails = 0;
for (const c of cases) {
  let line = c.name.padEnd(34);
  try {
    const r = prosphysisEncode(c.text, enc);
    const ok = r.decoded === c.text;
    const claimOk = !r.applied || ok;
    if (!ok || !claimOk) fails++;
    line += ` applied ${String(r.applied).padEnd(5)} exact ${String(ok).padEnd(5)} msg ${String(r.messageTokens).padStart(5)} frontier ${String(r.frontierTokens).padStart(5)} | ${r.notes.slice(0, 40)}`;
  } catch (e) { fails++; line += ` THREW ${(e as Error).message}`; }
  console.log(line);
}
let fz = 0, seed = 12345;
const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
for (let i = 0; i < 400; i++) {
  const n = 1 + Math.floor(rnd() * 6);
  const rows: string[] = [];
  for (let j = 0; j < n; j++) {
    const name = `L${Math.floor(rnd() * 9)}${'.so'.slice(0, Math.floor(rnd() * 4))}`;
    const tgt = rnd() < 0.3 ? name : rnd() < 0.5 ? `${name}${Math.floor(rnd() * 99)}` : `/u/${name}`;
    rows.push(`lrwxrwxrwx 1 r r ${Math.floor(rnd() * 40)} Jan 1 2024 ${name} -> ${tgt}`);
  }
  const t = rows.join('\n');
  const rw = prosphysisRewrite(t, ['suffix', 'prefix']);
  if (prosphysisDecode(rw.wire) !== t) { fz++; console.log('FUZZ FAIL', JSON.stringify(t), JSON.stringify(rw.wire)); }
}
console.log(`\nadversary: ${cases.length} cases, ${fails} failures; fuzz 400 documents, ${fz} non-inverts`);
