/** Focused ROSETTA test: self-tests + chaos fixtures + key repo fixtures. */
import { rosettaEncode, rosettaDecode, rosettaSelfTest, rosettaTranspose, ROSETTA_CHAOS_900 } from '@/lib/omega/rosetta';
import { countTokens } from '@/lib/omega/bpe';
import { CHAOS_900, mosaicFixtures, MOSAIC_HANDTRACE_300 } from './fixtures';

async function main() {
  console.log('=== ROSETTA SELF-TESTS ===');
  const st = await rosettaSelfTest('o200k_base');
  let fails = 0;
  for (const t of st) {
    if (!t.pass) fails++;
    console.log(`${t.pass ? 'PASS' : 'FAIL'}  ${t.name.padEnd(46)} ${t.details}`);
  }
  console.log(`${st.length - fails}/${st.length} pass`);

  console.log('\n=== chaos-900 wire inspection ===');
  const r = await rosettaEncode(ROSETTA_CHAOS_900, 'o200k_base');
  console.log('member:', r.member, 'systems:', r.systems, `${r.inTokens}→${r.outTokens}`);
  console.log('roundtrip:', r.decoded === ROSETTA_CHAOS_900 && rosettaDecode(r.wire) === ROSETTA_CHAOS_900);
  console.log('audit:', r.audit.filter((a) => a.exact).map((a) => `${a.member}:${a.tokens}`).join(' '));
  console.log('--- wire ---');
  console.log(r.wire);
  console.log('--- end wire ---');

  // transposition-only detail
  const tr = rosettaTranspose(ROSETTA_CHAOS_900, 'o200k_base');
  console.log('\ntranspose-only systems:', tr.systems, 'tokens:', tr.wire ? countTokens(tr.wire, 'o200k_base') : null);

  // fixture is the bench fixture too
  if (CHAOS_900 !== ROSETTA_CHAOS_900) console.log('NOTE: bench CHAOS_900 differs from codec CHAOS_900');
  const r2 = await rosettaEncode(CHAOS_900, 'o200k_base');
  console.log('bench CHAOS_900:', r2.member, `${r2.inTokens}→${r2.outTokens}`, 'rt:', rosettaDecode(r2.wire) === CHAOS_900);

  console.log('\n=== repo fixtures ===');
  const f = mosaicFixtures();
  const t0 = () => performance.now();
  for (const [name, text] of [
    ['json-log-40', f.jsonLog], ['csv-60', f.csv], ['chat-48', f.chat], ['grid-30', f.grid],
    ['rle-1400', f.rle], ['idrun-200', f.idrun], ['prose', f.prose], ['agent-turn', f.prose + '\n' + f.jsonLog + '\n' + f.rle + '\n' + f.chat],
    ['handtrace-300', MOSAIC_HANDTRACE_300],
  ] as Array<[string, string]>) {
    const s = t0();
    const res = await rosettaEncode(text, 'o200k_base');
    const ms = t0() - s;
    const rt = rosettaDecode(res.wire) === text;
    console.log(`${name.padEnd(14)} ${res.inTokens}→${res.outTokens}  member=${res.member.padEnd(10)} rt=${rt}  ${Math.round(ms)}ms`);
    console.log('   audit:', res.audit.filter(a => a.exact).map(a => `${a.member}:${a.tokens}`).join(' '));
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
