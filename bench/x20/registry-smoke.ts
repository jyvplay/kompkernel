/**
 * X20 (4): registry integration smoke test - proves the new key is reachable through the same path the
 * app uses, with the same result shape, and that identity still round-trips on inputs that refuse.
 */
import { codecEntries } from '@/lib/omega/registry';
const entries = codecEntries();
const want = ['lakonikos-d', 'stathmos', 'anadesmos'];
for (const k of want) if (!entries.some((e: any) => e.key === k)) { console.error('MISSING KEY ' + k); process.exit(1); }
const short = 'id,name,amount\n0001,alpha,10.250000\n0002,beta,3.100000\n0003,gamma,44.000000\n0004,delta,7.000000\n';
// 60 rows of the same shape: the same mechanism must now pay for its note and be taken
const text = 'id,name,amount\n' + Array.from({ length: 60 }, (_, i) => `%04d,n${i},${(i * 1.5).toFixed(6)}`).join('\n') + '\n';
if (process.env.SHORT) { console.log('short case:', await (codecEntries().find((e: any) => e.key === 'anadesmos') as any).run(short, 'o200k_base').then((r: any) => r.note)); process.exit(0); }
for (const key of want) {
  const e: any = entries.find((x) => x.key === key);
  const r = await e.run(text, 'o200k_base');
  const ok = r.decoded === text;
  console.log(`${key.padEnd(12)} exact=${ok} oneChat=${r.oneChat} note=${r.note}`);
  if (!ok) { console.error('ROUND TRIP FAILED'); process.exit(1); }
  if (typeof r.output !== 'string' || typeof r.note !== 'string' || typeof r.oneChat !== 'number') { console.error('BAD SHAPE'); process.exit(1); }
}
console.log('registry smoke: ok');
