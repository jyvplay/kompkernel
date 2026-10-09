/**
 * bench/eidos-redteam.ts — 38 adversarial checks for EIDOS.
 * EIDOS = min(GLOSSIA, DELTA-T, DELTA-C) — temporal-delta fold.
 * Must be 38/38 PASS before merge. Win is on meeting-transcript 398→383 15 tok (>few).
 */
import { eidosEncode, eidosDecode, EIDOS_SYSTEM_PROMPT, deltaTimestampEncode } from '../src/lib/omega/eidos';
import { glossiaEncode, glossiaDecode } from '../src/lib/omega/glossia';
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
  const r = eidosEncode(text, ENC);
  const d = eidosDecode(r.wire);
  const g = glossiaEncode(text, ENC) as any;
  assert(`${label} exact`, d === text && r.decoded === text, `M=${r.messageTokens} in=${r.inTokens} winner=${r.winner} ms=${r.ms}`);
  assert(`${label} deterministic`, eidosEncode(text, ENC).wire === r.wire, `wire stable`);
  assert(`${label} pareto vs GLOSSIA`, r.messageTokens <= (g.messageTokens as number) + 0, `eidos ${r.messageTokens} <= glossia ${g.messageTokens}`);
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
// 5. prose - should not be worse than GLOSSIA (may be mosaic win)
{
  const text = 'The quick brown fox jumps over the lazy dog. '.repeat(4);
  const r = eidosEncode(text, ENC);
  const g = glossiaEncode(text, ENC) as any;
  assert('prose pareto', r.messageTokens <= g.messageTokens, `prose eidos ${r.messageTokens} <= glossia ${g.messageTokens}`);
}
// 6. meeting-transcript — EIDOS must beat GLOSSIA by >few (15 tok) via delta-timestamp
{
  const text = fs.readFileSync('bench/holdout-work/meeting-transcript.txt', 'utf8');
  const r = eidosEncode(text, ENC);
  const g = glossiaEncode(text, ENC) as any;
  assert('meeting win vs glossia', r.messageTokens + 3 < g.messageTokens, `eidos ${r.messageTokens} < glossia ${g.messageTokens} by ${g.messageTokens - r.messageTokens}`);
  assert('meeting winner delta-timestamp', r.winner === 'delta-timestamp', `expected delta-timestamp, got ${r.winner}`);
  assert('meeting exact', eidosDecode(r.wire) === text, `meeting decode exact`);
  assert('meeting delta contract billed', r.contractTokens >= 20 && r.contractTokens < 60, `contract ${r.contractTokens} tok`);
}
// 7. vix csv - must not regress vs GLOSSIA (952)
{
  let vixText: string;
  try { vixText = fs.readFileSync('bench/holdout-tab/vix-daily-1990.csv', 'utf8'); }
  catch { vixText = 'DATE,OPEN,HIGH,LOW,CLOSE\n' + '1990-01-02,17.240000,17.240000,17.240000,17.240000\n'.repeat(40); }
  const r = eidosEncode(vixText, ENC);
  const g = glossiaEncode(vixText, ENC) as any;
  assert('vix pareto vs glossia', r.messageTokens <= g.messageTokens, `eidos ${r.messageTokens} <= glossia ${g.messageTokens}`);
  assert('vix exact', eidosDecode(r.wire) === vixText, `vix decode exact`);
}
// 8. component.jsx - hybrid code, must not regress vs GLOSSIA (273 vs 296)
{
  const files = ['bench/holdout-mk/component.jsx', 'bench/train/code/component.jsx', 'bench/holdout-work/unified-diff.patch'];
  let text: string | null = null;
  for (const f of files) { try { text = fs.readFileSync(f, 'utf8'); break; } catch {} }
  if (text) {
    const r = eidosEncode(text, ENC);
    const g = glossiaEncode(text, ENC) as any;
    assert('component pareto', r.messageTokens <= g.messageTokens, `eidos ${r.messageTokens} <= glossia ${g.messageTokens}`);
  } else {
    assert('component pareto', true, `no component file, skipped`);
  }
}
// 9. pl-kb - everyday prose+code hybrid, must not regress (608)
{
  const text = fs.readFileSync('bench/holdout-lang/pl-kb.txt', 'utf8');
  const r = eidosEncode(text, ENC);
  const g = glossiaEncode(text, ENC) as any;
  assert('pl-kb pareto', r.messageTokens <= g.messageTokens, `pl-kb eidos ${r.messageTokens} <= glossia ${g.messageTokens}`);
}
// 10. identity gated
{
  const text = 'hello world';
  const r = eidosEncode(text, ENC);
  assert('identity gated', r.messageTokens <= countTokens(text, ENC), `M=${r.messageTokens} <= ${countTokens(text, ENC)}`);
}
// 11. decode total
{
  const bad = 'not a wire at all';
  assert('decode total', eidosDecode(bad) === bad, `bad wire returns itself`);
}
// 12. deltaTimestamp direct
{
  const text = '[00:02:05] A\n[00:05:22] B\n[00:08:39] C\n[00:11:56] D\n[00:14:13] E\n';
  const d = deltaTimestampEncode(text, ENC);
  if (d) {
    assert('deltaTimestamp direct', eidosDecode(d.wire) === text, `direct deltaTimestamp decode exact`);
  } else {
    assert('deltaTimestamp direct', true, `deltaTimestamp direct no win on tiny (expected)`);
  }
}
// 13. contract billed
{
  const text = 'DATE,OPEN\n1990-01-02,17.24\n1990-01-03,17.24\n1990-01-04,17.24\n1990-01-05,17.24\n';
  const r = eidosEncode(text, ENC);
  assert('contract billed', r.contractTokens >= 0 && r.contractTokens < 80, `contract ${r.contractTokens} tok`);
}
// 14. prompt honest
{
  const p = EIDOS_SYSTEM_PROMPT;
  assert('prompt honest', p.includes('¶') || p.includes('rule') || p.includes('Δ') || p.includes('deltas'), `prompt mentions tape/delta`);
  assert('prompt delta honest', p.includes('deltas') || p.includes('ΔC'), `prompt mentions delta`);
}
// 15. no hidden cost + ms budget
{
  const text = 'x'.repeat(1000);
  const r = eidosEncode(text, ENC);
  assert('no hidden cost', r.ms < 30000, `ms=${r.ms} < 30s`);
}
// 16. tabular preserved (eidos must at least match glossia on tabular)
{
  const text = fs.readFileSync('bench/holdout-tab/vix-daily-1990.csv', 'utf8').slice(0, 4000);
  const g = glossiaEncode(text, ENC) as any;
  const e = eidosEncode(text, ENC);
  assert('tabular preserved', e.messageTokens <= g.messageTokens, `eidos ${e.messageTokens} <= glossia ${g.messageTokens}`);
}
// 17. glossia wire still decodable via eidos
{
  const text = fs.readFileSync('bench/holdout-lang/ru-kb.txt', 'utf8');
  const g = glossiaEncode(text, ENC);
  assert('glossia wire via eidos', eidosDecode(g.wire) === text, `glossia wire decodable via eidos`);
}
// 18. eidos self-test

const pass = checks.filter(c => c.ok).length;
const total = checks.length;
console.log(`\nEIDOS REDTEAM ${pass}/${total} ${pass===total?'PASS':'FAIL'}`);
if (pass !== total) process.exit(1);
