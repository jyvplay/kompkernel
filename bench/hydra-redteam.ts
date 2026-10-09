/**
 * bench/hydra-redteam.ts — 12 adversarial checks for HYDRA.
 * Must be 12/12 PASS before merge.
 */
import { hydraEncode, hydraDecode, HYDRA_SYSTEM_PROMPT } from '../src/lib/omega/hydra';
import { tachysEncode } from '../src/lib/omega/tachys';
import { countTokens } from '../src/lib/omega/bpe';
import fs from 'node:fs';

type Enc = 'o200k_base';
const ENC: Enc = 'o200k_base';

interface Check { name: string; ok: boolean; detail: string; }
const checks: Check[] = [];
function assert(name: string, cond: boolean, detail: string) {
  checks.push({ name, ok: cond, detail });
  if (!cond) console.error(`FAIL ${name}: ${detail}`);
  else console.log(`PASS ${name}: ${detail}`);
}

function roundtrip(text: string, label: string) {
  const r = hydraEncode(text, ENC);
  const d = hydraDecode(r.wire);
  const t2 = tachysEncode(text, ENC) as any;
  assert(`${label} exact`, d === text && r.decoded === text, `M=${r.messageTokens} in=${r.inTokens} winner=${r.winner} ms=${r.ms}`);
  assert(`${label} deterministic`, hydraEncode(text, ENC).wire === r.wire, `wire stable`);
  assert(`${label} pareto`, r.messageTokens <= (t2.messageTokens as number), `hydra ${r.messageTokens} <= tachys ${t2.messageTokens}`);
  assert(`${label} gate`, r.messageTokens <= countTokens(text, ENC) || r.winner === 'raw', `M=${r.messageTokens} vs in=${countTokens(text, ENC)}`);
}

// 1. empty
roundtrip('', 'empty');
// 2. single char
roundtrip('x', 'single');
// 3. section char
roundtrip('§already', 'section');
// 4. transposed marker
roundtrip('hello ◆ world ◇ plain', 'kion-marker');
// 5. prose (should be tachys-fast, no transpose)
{
  const text = 'The quick brown fox jumps over the lazy dog. '.repeat(4);
  const r = hydraEncode(text, ENC);
  assert('prose winner', r.winner !== 'kiones-transposed', `prose must not transpose, got ${r.winner}`);
}
// 6. vix csv (must transpose and beat tachys by >3) — use the real holdout file
{
  let vixText: string;
  try { vixText = fs.readFileSync('bench/holdout-tab/vix-daily-1990.csv', 'utf8'); }
  catch { vixText = 'DATE,OPEN,HIGH,LOW,CLOSE\n' + '1990-01-02,17.240000,17.240000,17.240000,17.240000\n1990-01-03,17.250000,17.250000,17.250000,17.250000\n'.repeat(40); }
  const r = hydraEncode(vixText, ENC);
  const t = tachysEncode(vixText, ENC) as any;
  assert('vix win', r.messageTokens + 3 < t.messageTokens, `hydra ${r.messageTokens} < tachys ${t.messageTokens} by ${t.messageTokens - r.messageTokens}`);
  assert('vix transposed', r.winner === 'kiones-transposed', `expected kiones-transposed, got ${r.winner}`);
}
// 7. aapl csv (should NOT transpose — not worth)
{
  const aapl = 'Date,Open,High,Low,Close\n2014-01-02,74.13,74.13,74.13,74.13\n2014-01-03,74.20,74.20,74.20,74.20\n';
  const r = hydraEncode(aapl, ENC);
  assert('aapl no-win', r.winner !== 'kiones-transposed' || r.messageTokens + 3 >= (tachysEncode(aapl, ENC) as any).messageTokens, `aapl should not strictly win`);
}
// 8. identity gated
{
  const text = 'hello world';
  const r = hydraEncode(text, ENC);
  assert('identity gated', r.messageTokens <= countTokens(text, ENC), `M=${r.messageTokens} <= ${countTokens(text, ENC)}`);
}
// 9. decode total
{
  const bad = 'not a wire at all';
  assert('decode total', hydraDecode(bad) === bad, `bad wire returns itself`);
}
// 10. contract size
{
  const text = 'DATE,OPEN\n1990-01-02,17.24\n1990-01-03,17.24\n1990-01-04,17.24\n1990-01-05,17.24\n';
  const r = hydraEncode(text, ENC);
  const ct = r.contractTokens;
  assert('contract billed', ct >= 0 && ct < 60, `contract ${ct} tok`);
}
// 11. prompt honesty
{
  const p = HYDRA_SYSTEM_PROMPT;
  assert('prompt honest', p.includes('◆') && p.includes('§'), `prompt mentions both brackets`);
}
// 12. no hidden cost
{
  const text = 'x'.repeat(1000);
  const r = hydraEncode(text, ENC);
  assert('no hidden cost', r.ms < 30000, `ms=${r.ms} < 30s`);
}

const pass = checks.filter(c => c.ok).length;
const total = checks.length;
console.log(`\nHYDRA REDTEAM ${pass}/${total} ${pass===total?'PASS':'FAIL'}`);
if (pass !== total) process.exit(1);
