/**
 * Z44: GRAMMA measurement harness.
 * For each file: identity, DAEDALUS (frontier), STICHOS (existing layout codec),
 * GRAMMA (notation-dialect menu).  Prints the per-dialect candidate table so the
 * selection is visible, and the exactness of every round trip.
 * Run: OMEGA_DET=1 ./bench/z44/build.sh bench/z44/gramma.ts [--msg=<file>] <file>...
 */
import fs from 'node:fs';
import { countTokens, type EncodingName } from '../../src/lib/omega/bpe';
import { daedalusEncode } from '../../src/lib/omega/daedalus';
import { stichosEncode } from '../../src/lib/omega/stichos';
import { grammaEncode } from '../../src/lib/omega/gramma';

const enc: EncodingName = 'o200k_base';
const T = (s: string) => countTokens(s, enc);
const argv = process.argv.slice(2);
const msgOut = argv.find((a) => a.startsWith('--msg='))?.slice(6);
const files = argv.filter((a) => !a.startsWith('--'));
const OUT = process.env.OUT;

async function main() {
  const rows: string[] = [];
  for (const f of files) {
    const text = fs.readFileSync(f, 'utf8');
    const I = T(text);
    const t0 = Date.now();
    const g = grammaEncode(text, enc);
    const gm = Date.now() - t0;
    const back = (await import('../../src/lib/omega/gramma')).grammaDecode(g.decoderPrompt);
    const t1 = Date.now();
    const s = await stichosEncode(text, enc);
    const sm = Date.now() - t1;
    const d = daedalusEncode(text, enc);
    console.log(`\n=== ${f.split('/').slice(-2).join('/')}  I=${I}  DAEDALUS M=${d.messageTokens} (${d.mode}/${d.winningArm}, exact=${d.decoded === text})  STICHOS M=${s.messageTokens} (exact=${s.decoded === text})  GRAMMA M=${g.messageTokens} (${g.winningDialect}, exact=${g.exact}, libDecode=${back === text})`);
    for (const c of g.candidates) {
      console.log(`    ${c.id.padEnd(10)} cheap=${String(c.cheapTokens).padStart(6)} wire=${String(c.wireTokens).padStart(6)} inner M=${String(c.innerMessageTokens).padStart(6)} clause=${String(c.clauseTokens).padStart(3)} -> M=${String(c.M).padStart(6)} ${c.mode}`);
    }
    const dm = d.messageTokens - g.messageTokens;
    const sm2 = s.messageTokens - g.messageTokens;
    console.log(`    DELTA vs DAEDALUS ${-dm} (${((100 * -dm) / d.messageTokens).toFixed(2)}%)   vs STICHOS ${-sm2} (${((100 * -sm2) / Math.max(1, s.messageTokens)).toFixed(2)}%)   encode ${gm}ms`);
    rows.push(JSON.stringify({ file: f, enc, inTokens: I, daedalusM: d.messageTokens, stichosM: s.messageTokens, grammaM: g.messageTokens, dialect: g.winningDialect, clauseTokens: g.clauseTokens, exact: g.exact, libDecode: back === text, stichosExact: s.decoded === text, daedalusExact: d.decoded === text, candidates: g.candidates, ms: gm }));
    if (msgOut) {
      fs.writeFileSync(`${msgOut}.${g.winningDialect}.txt`, g.decoderPrompt);
      fs.writeFileSync(`${msgOut}.expected.txt`, text);
    }
  }
  if (OUT) fs.appendFileSync(OUT, rows.join('\n') + '\n');
  console.log('\ndone');
}
main();
