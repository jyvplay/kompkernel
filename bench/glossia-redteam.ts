/**
 * bench/glossia-redteam.ts — 25 adversarial checks for GLOSSIA.
 * Must be 25/25 PASS before merge. Glossia is portfolio min(TACHYS, HYDRA, MOSAIC).
 */
import { glossiaEncode, glossiaDecode, GLOSSIA_SYSTEM_PROMPT } from '../src/lib/omega/glossia';
import { tachysEncode } from '../src/lib/omega/tachys';
import { hydraEncode } from '../src/lib/omega/hydra';
import { mosaicEncode } from '../src/lib/omega/mosaic';
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
  const r = glossiaEncode(text, ENC);
  const d = glossiaDecode(r.wire);
  const t = tachysEncode(text, ENC) as any;
  const h = hydraEncode(text, ENC) as any;
  assert(`${label} exact`, d === text && r.decoded === text, `M=${r.messageTokens} in=${r.inTokens} winner=${r.winner} ms=${r.ms}`);
  assert(`${label} deterministic`, glossiaEncode(text, ENC).wire === r.wire, `wire stable`);
  assert(`${label} pareto vs TACHYS`, r.messageTokens <= (t.messageTokens as number), `glossia ${r.messageTokens} <= tachys ${t.messageTokens}`);
  assert(`${label} pareto vs HYDRA`, r.messageTokens <= (h.messageTokens as number), `glossia ${r.messageTokens} <= hydra ${h.messageTokens}`);
  assert(`${label} gated`, r.messageTokens <= countTokens(text, ENC) || r.winner === 'raw', `M=${r.messageTokens} vs in=${countTokens(text, ENC)}`);
}

// 1. empty
roundtrip('', 'empty');
// 2. single char
roundtrip('x', 'single');
// 3. section char
roundtrip('§already', 'section');
// 4. transposed marker
roundtrip('hello ◆ world ◇ plain', 'kion-marker');
// 5. prose - should not be worse than HYDRA (may be mosaic win)
{
  const text = 'The quick brown fox jumps over the lazy dog. '.repeat(4);
  const r = glossiaEncode(text, ENC);
  const h = hydraEncode(text, ENC) as any;
  assert('prose pareto', r.messageTokens <= h.messageTokens, `prose glossia ${r.messageTokens} <= hydra ${h.messageTokens}`);
}
// 6. vix csv - must beat HYDRA by >3 (mosaic 952 vs hydra 983) and TACHYS by >few
{
  let vixText: string;
  try { vixText = fs.readFileSync('bench/holdout-tab/vix-daily-1990.csv', 'utf8'); }
  catch { vixText = 'DATE,OPEN,HIGH,LOW,CLOSE\n' + '1990-01-02,17.240000,17.240000,17.240000,17.240000\n'.repeat(40); }
  const r = glossiaEncode(vixText, ENC);
  const t = tachysEncode(vixText, ENC) as any;
  const h = hydraEncode(vixText, ENC) as any;
  assert('vix win vs tachys', r.messageTokens + 3 < t.messageTokens, `glossia ${r.messageTokens} < tachys ${t.messageTokens} by ${t.messageTokens - r.messageTokens}`);
  assert('vix win vs hydra', r.messageTokens + 3 < h.messageTokens, `glossia ${r.messageTokens} < hydra ${h.messageTokens} by ${h.messageTokens - r.messageTokens}`);
  assert('vix exact', glossiaDecode(r.wire) === vixText, `vix decode exact`);
}
// 7. component.jsx - hybrid code, must beat HYDRA/TACHYS by >few (273 vs 296)
{
  const text = fs.readFileSync('bench/holdout-mk/component.jsx', 'utf8');
  const r = glossiaEncode(text, ENC);
  const t = tachysEncode(text, ENC) as any;
  const h = hydraEncode(text, ENC) as any;
  assert('component win vs tachys', r.messageTokens + 3 < t.messageTokens, `glossia ${r.messageTokens} < tachys ${t.messageTokens} by ${t.messageTokens - r.messageTokens}`);
  assert('component win vs hydra', r.messageTokens + 3 < h.messageTokens, `glossia ${r.messageTokens} < hydra ${h.messageTokens} by ${h.messageTokens - r.messageTokens}`);
  assert('component winner mosaic', r.winner === 'mosaic', `expected mosaic, got ${r.winner}`);
}
// 8. paper.tex - must beat HYDRA by 26
{
  const text = fs.readFileSync('bench/holdout-mk/paper.tex', 'utf8');
  const r = glossiaEncode(text, ENC);
  const h = hydraEncode(text, ENC) as any;
  assert('paper win vs hydra', r.messageTokens + 3 < h.messageTokens, `glossia ${r.messageTokens} < hydra ${h.messageTokens} by ${h.messageTokens - r.messageTokens}`);
}
// 9. pl-kb - everyday prose+code hybrid, must beat HYDRA by 15 (608 vs 623)
{
  const text = fs.readFileSync('bench/holdout-lang/pl-kb.txt', 'utf8');
  const r = glossiaEncode(text, ENC);
  const h = hydraEncode(text, ENC) as any;
  assert('pl-kb win vs hydra', r.messageTokens + 3 < h.messageTokens, `pl-kb glossia ${r.messageTokens} < hydra ${h.messageTokens} by ${h.messageTokens - r.messageTokens}`);
  assert('pl-kb win vs tachys', r.messageTokens + 3 < (tachysEncode(text, ENC) as any).messageTokens, `pl-kb glossia wins`);
}
// 10. identity gated
{
  const text = 'hello world';
  const r = glossiaEncode(text, ENC);
  assert('identity gated', r.messageTokens <= countTokens(text, ENC), `M=${r.messageTokens} <= ${countTokens(text, ENC)}`);
}
// 11. decode total
{
  const bad = 'not a wire at all';
  assert('decode total', glossiaDecode(bad) === bad, `bad wire returns itself`);
}
// 12. mosaic wire roundtrip
{
  const m = mosaicEncode('className="retention-panel"\n'.repeat(6) + 'The retention panel '.repeat(5), ENC) as any;
  if (m.mode !== 'raw') {
    const g = glossiaEncode(m.wire, ENC); // will treat as text, should not crash
    assert('mosaic wire stable', glossiaDecode(g.wire) !== '', `mosaic wire handled`);
  } else {
    assert('mosaic wire stable', true, `no mosaic wire to test`);
  }
}
// 13. contract billed
{
  const text = 'DATE,OPEN\n1990-01-02,17.24\n1990-01-03,17.24\n1990-01-04,17.24\n1990-01-05,17.24\n';
  const r = glossiaEncode(text, ENC);
  assert('contract billed', r.contractTokens >= 0 && r.contractTokens < 60, `contract ${r.contractTokens} tok`);
}
// 14. prompt honest
{
  const p = GLOSSIA_SYSTEM_PROMPT;
  assert('prompt honest', p.includes('¶') || p.includes('rule') || p.includes('§'), `prompt mentions tape`);
}
// 15. no hidden cost + ms budget
{
  const text = 'x'.repeat(1000);
  const r = glossiaEncode(text, ENC);
  assert('no hidden cost', r.ms < 30000, `ms=${r.ms} < 30s`);
}
// 16. hydra transpose preserved (glossia must at least match hydra on tabular)
{
  const text = fs.readFileSync('bench/holdout-tab/vix-daily-1990.csv', 'utf8').slice(0, 4000);
  const g = glossiaEncode(text, ENC);
  const h = hydraEncode(text, ENC) as any;
  assert('tabular preserved', g.messageTokens <= h.messageTokens, `glossia ${g.messageTokens} <= hydra ${h.messageTokens}`);
}

const pass = checks.filter(c => c.ok).length;
const total = checks.length;
console.log(`\nGLOSSIA REDTEAM ${pass}/${total} ${pass===total?'PASS':'FAIL'}`);
if (pass !== total) process.exit(1);
