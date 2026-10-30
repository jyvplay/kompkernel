import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { alphafoldExpand, alphafoldPlan } from '../../src/lib/omega/alphafold';

const cases: Array<{ name: string; source: string; plan: boolean }> = [
  { name: 'two alpha-equivalent function bodies', plan: true, source:
    'function totalize(left:number,right:number){\n const sum=left+right; const doubled=sum*2; const adjusted=doubled-right; return adjusted;\n}\nfunction combine(a:number,b:number){\n const result=a+b; const scaled=result*2; const finalValue=scaled-b; return finalValue;\n}\n' },
  { name: 'constant identifiers are factored; only varying bindings remain', plan: true, source:
    'function f(first:number){\n const shared=first+1; const adjusted=shared*2; const finalValue=adjusted-1; return finalValue;\n}\nfunction g(value:number){\n const shared=value+1; const doubled=shared*2; const answer=doubled-1; return answer;\n}\n' },
  { name: 'quoted braces and identifier-like strings are literal', plan: true, source:
    'function one(a:number){\n const text="{ value } a"; const sum=a+1; const doubled=sum*2; const finalValue=doubled-3; return finalValue;\n}\nfunction two(b:number){\n const text="{ value } a"; const result=b+1; const scaled=result*2; const answer=scaled-3; return answer;\n}\n' },
  { name: 'CRLF exact restore, no final newline', plan: true, source:
    'function alpha(arg:number){\r\n const value=arg*2; const next=value+1; const last=next-2; const more=last+4; const finalValue=more/2; return finalValue;\r\n}\r\nfunction beta(input:number){\r\n const out=input*2; const again=out+1; const answer=again-2; const nextValue=answer+4; const result=nextValue/2; return result;\r\n}' },
  { name: 'single function has no reusable template', plan: false, source:
    'function one(arg:number){\n const result=arg+1; const doubled=result*2; const adjusted=doubled-3; return adjusted;\n}\n' },
  { name: 'exact duplicate blocks without renamed identifiers are refused', plan: false, source:
    'function one(arg:number){\n const result=arg+1; const doubled=result*2; const adjusted=doubled-3; return adjusted;\n}\nfunction two(arg:number){\n const result=arg+1; const doubled=result*2; const adjusted=doubled-3; return adjusted;\n}\n' },
  { name: 'plain prose is refused', plan: false, source: 'The quick brown fox jumps over the lazy dog.' },
  { name: 'source collision selects a distinct in-band marker set', plan: true, source:
    '⟦ function one(a:number){ const first=a+1; const second=first*2; const third=second-1; const fourth=third+4; return fourth; } function two(b:number){ const one=b+1; const two=one*2; const three=two-1; const four=three+4; return four; }' },
  { name: 'all reserved marker alphabets cause safe refusal', plan: false, source:
    '⟦⟧⟪⟫§¶※⁂¤¥‡† function one(a:number){ const first=a+1; const second=first*2; const third=second-1; const fourth=third+4; return fourth; } function two(b:number){ const one=b+1; const two=one*2; const three=two-1; const four=three+4; return four; }' },
];
const checks: Array<{ name: string; pass: boolean; details?: unknown }> = [];
let passed = 0;
const vectors: Array<{ name: string; wire: string; expected: string }> = [];
for (const c of cases) {
  const wire = alphafoldPlan(c.source);
  const decoded = wire === null ? c.source : alphafoldExpand(wire);
  const ok = (wire !== null) === c.plan && decoded === c.source;
  checks.push({ name: c.name, pass: ok, details: { planned: wire !== null, exact: decoded === c.source } });
  if (ok) passed++;
  if (wire) vectors.push({ name: c.name, wire, expected: c.source });
}
const fixturePath = 'src/lib/omega/codec-synthesis.ts';
const fixture = fs.readFileSync(fixturePath, 'utf8');
const fixtureWire = alphafoldPlan(fixture);
const references = fixtureWire?.match(/⟦\d+\|/gu)?.length ?? 0;
const fixtureOk = fixtureWire !== null && alphafoldExpand(fixtureWire) === fixture && references >= 10;
checks.push({ name: 'real repository source file: repeated code-synthesis wrappers', pass: fixtureOk,
  details: { sourceSha256: crypto.createHash('sha256').update(fixture).digest('hex'), chars: fixture.length,
    wireChars: fixtureWire?.length ?? null, references } });
if (fixtureOk) passed++;
if (fixtureWire) vectors.push({ name: 'repo-source', wire: fixtureWire, expected: fixture });
if (fixtureWire) {
  const markerAt = fixtureWire.indexOf('⟦0|');
  const end = markerAt >= 0 ? fixtureWire.indexOf('⟧', markerAt) : -1;
  const bad = end > 0 ? fixtureWire.slice(0, markerAt) + '⟦0|not-valid-id⟧' + fixtureWire.slice(end + 1) : fixtureWire;
  const tamperOk = alphafoldExpand(bad) === null;
  checks.push({ name: 'malformed identifier mapping is rejected', pass: tamperOk });
  if (tamperOk) passed++;
  const extra = end > 0 ? fixtureWire.slice(0, end) + ',unused' + fixtureWire.slice(end) : fixtureWire;
  const extraOk = alphafoldExpand(extra) === null;
  checks.push({ name: 'unused extra identifier binding is rejected', pass: extraOk });
  if (extraOk) passed++;
}
const hugeTemplate = 'x'.repeat(600_000);
const amplified = `${'ALPHAFOLD/1 slots=⟪,⟫; refs=⟦,⟧: test'}\n⟦T0⟧\n${hugeTemplate}\n⟦/T0⟧\n⟦BODY⟧\n⟦0|⟧⟦0|⟧`;
const amplificationOk = amplified.length < 1_000_000 && alphafoldExpand(amplified) === null;
checks.push({ name: 'expanded-output amplification is bounded', pass: amplificationOk,
  details: { wireChars: amplified.length, capChars: 1_000_000 } });
if (amplificationOk) passed++;
const twin = spawnSync('python3', ['bench/x63/alphafold-twin.py'], {
  input: JSON.stringify(vectors), encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
});
if (twin.status !== 0) throw new Error(`independent Python decoder failed: ${twin.stderr || twin.stdout}`);
const twinResult = JSON.parse(twin.stdout) as { total: number; passed: number; failures: string[] };
const receipt = { runtime: process.version, checks, summary: { passed, total: checks.length }, independentPython: twinResult,
  fixture: fixturePath };
fs.mkdirSync('bench/x63/receipts', { recursive: true });
fs.writeFileSync('bench/x63/receipts/alphafold-redteam.json', JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify(receipt));
if (passed !== checks.length || twinResult.passed !== twinResult.total) process.exitCode = 1;
