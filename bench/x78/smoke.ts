import * as fs from 'node:fs';
import { codecEntries } from '../../src/lib/omega/registry';
const enc: any = 'o200k_base';
const all = codecEntries();
const e: any = all.find((x: any) => x.key === 'kerma');
if (!e) { console.log('FAIL: kerma not registered'); process.exit(1); }
console.log(`registered: ${e.key} (${all.length} codecs total)`);
let ok = 0, fail = 0;
for (const p of process.argv.slice(2)) {
  const t = fs.readFileSync(p, 'utf8');
  const r: any = await e.run(t, enc);
  const good = r.decoded === t;
  good ? ok++ : fail++;
  console.log(`${p.split('/').pop()!.padEnd(24)} one-chat ${String(r.oneChat).padStart(5)} tok  exact=${good}`);
}
console.log(`\nSMOKE ${fail === 0 ? 'PASS' : 'FAIL'} — ${ok} exact, ${fail} not`);
process.exit(fail === 0 ? 0 : 1);
