import fs from 'node:fs';
import { anagennesisEncode, anagennesisMine } from '../../src/lib/omega/anagennesis';
const out: string[] = [];
for (const f of process.argv.slice(2)) {
  try {
    const text = fs.readFileSync(f, 'utf8');
    const mined = anagennesisMine(text);
    out.push(`\n${f} (mined ${mined.length})`);
    for (const r of mined) out.push(`  ${r.field} hits=${r.hits} saved=${r.saved} shape=${r.shape}`);
    for (const r of mined) out.push(`  sentence: ${r.sentence}`);
    const t0 = Date.now();
    const r = anagennesisEncode(text);
    out.push(`  M=${r.messageTokens} frontier=${r.frontierM} exact=${r.exact} ms=${Date.now() - t0}`);
    out.push(`  notes: ${r.notes}`);
  } catch (e: any) {
    out.push(`  THREW ${e?.message ?? e}`);
  }
  fs.writeFileSync('/tmp/an-two.txt', out.join('\n') + '\n');
}
