/**
 * ARITHMOS verification gates:
 * G1 library round trip; G2 independent in-TS spec reader; G3 independent
 * CPython reader; G4 totality/collisions; G5 honest prompt accounting;
 * G6 non-regression vs DAEDALUS; G7 script/boundary adversaries; G8 fuzz;
 * G9 substantial invoice receipt; G10 O(n) span-finder speed bound.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { countTokens } from '../src/lib/omega/bpe';
import { daedalusEncode } from '../src/lib/omega/daedalus';
import {
  ARITHMOS_CLOSE, ARITHMOS_ESCAPE, ARITHMOS_MARK, ARITHMOS_OPEN,
  arithmosDecode, arithmosDecoderPrompt, arithmosEncode, findArithmosSpans,
} from '../src/lib/omega/arithmos';
import { ARITHMOS_FIXTURES, arabicIndicInvoiceLedger } from './arithmos-fixtures';

const ENC = 'o200k_base' as const;
const T = (s: string) => countTokens(s, ENC);
let pass = 0, fail = 0;
const bad: string[] = [];
function check(gate: string, yes: boolean, detail: string) { if (yes) pass++; else { fail++; bad.push(`${gate}: ${detail}`); } }
check('G0', ARITHMOS_MARK === '\u25d0' && ARITHMOS_ESCAPE === '\u25d1' && ARITHMOS_OPEN === '\u27ea' && ARITHMOS_CLOSE === '\u27eb', 'uses the specified U+25D0/U+25D1/U+27EA/U+27EB marker contract');

// A separate, prose-rule reader; it never invokes ARITHMOS restoration code.
function specDecode(wire: string): string {
  const daedalus = (s: string) => {
    // Dynamic import is not needed: tests only exercise generated wires whose
    // inner reader is separately tested by DAEDALUS itself.
    return requireDaedalus(s);
  };
  if (!wire) return wire;
  if (wire[0] === ARITHMOS_ESCAPE) return daedalus(wire.slice(1));
  if (wire[0] !== ARITHMOS_MARK) return daedalus(wire);
  const text = daedalus(wire.slice(1));
  const bases = new Map([['A', 0x0660], ['P', 0x06f0], ['D', 0x0966], ['B', 0x09e6], ['T', 0x0e50]]);
  let out = '', i = 0;
  while (i < text.length) {
    if (text[i] !== ARITHMOS_OPEN) { out += text[i++]; continue; }
    const base = bases.get(text[i + 1]);
    const end = text.indexOf(ARITHMOS_CLOSE, i + 2);
    if (base === undefined || end < 0) { out += end < 0 ? text[i++] : text.slice(i, end + 1); if (end >= 0) i = end + 1; continue; }
    const global = text[i + 2] === ':';
    const inside = text.slice(i + (global ? 3 : 2), end);
    if (!global && !/^[0-9]+$/.test(inside)) { out += text.slice(i, end + 1); i = end + 1; continue; }
    out += [...inside].map((d) => global && /^[0-9]$/.test(d) ? String.fromCodePoint(base + d.charCodeAt(0) - 48) : d).join('');
    i = end + 1;
  }
  return out;
}
// Keeps the independent restoration algorithm above readable while deliberately
// reusing the already separately verified inner DAEDALUS reader.
import { daedalusDecode as requireDaedalus } from '../src/lib/omega/daedalus';

const table = new Map<string, ReturnType<typeof arithmosEncode>>();
for (const [name, text] of Object.entries(ARITHMOS_FIXTURES)) table.set(name, arithmosEncode(text, ENC, { budgetMs: 3000, maxArms: 2 }));

for (const [name, text] of Object.entries(ARITHMOS_FIXTURES)) {
  const r = table.get(name)!;
  check('G1', arithmosDecode(r.wire) === text, `${name} library round trip`);
  check('G2', specDecode(r.wire) === text, `${name} independent TypeScript rule reader`);
  check('G5', r.messageTokens === T(r.decoderPrompt), `${name} messageTokens is actual decoderPrompt count`);
  const plain = daedalusEncode(text, ENC, { budgetMs: 3000, maxArms: 2 });
  check('G6', r.messageTokens <= plain.messageTokens, `${name} does not lose to DAEDALUS`);
}

// External interpreter/runtime implementation.
{
  const cases = [...table.values()].map((r) => r.wire);
  const expected = Object.values(ARITHMOS_FIXTURES);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'arithmos-'));
  const input = path.join(dir, 'in.json'), output = path.join(dir, 'out.json');
  fs.writeFileSync(input, JSON.stringify(cases), 'utf8');
  execFileSync('python3', ['bench/arithmos_decode.py', input, output], { cwd: path.resolve('.'), stdio: 'pipe' });
  const actual = JSON.parse(fs.readFileSync(output, 'utf8'));
  check('G3', JSON.stringify(actual) === JSON.stringify(expected), 'independent CPython decoder agrees on all fixtures');
}

// Second-order attacks: mixed scripts, a literal digit marker, malformed spans,
// and outer sentinel collisions must never alter the source.
for (const s of [
  '', ARITHMOS_MARK + 'literal source collision', ARITHMOS_ESCAPE + 'literal source collision',
  `${ARITHMOS_OPEN}A12${ARITHMOS_CLOSE}`, `${ARITHMOS_OPEN}P12x${ARITHMOS_CLOSE}`,
  'ASCII 123 then Arabic ١٢٣ then Persian ۱۲۳ then Devanagari १२३ then Bengali ১২৩ then Thai ๑๒๓.',
  'Single ٤ next to ASCII 5 must retain both glyph systems.',
  `Literal ${ARITHMOS_OPEN}A123${ARITHMOS_CLOSE} plus Bengali ১২৩ must remain byte-exact.`,
  `Literal ${ARITHMOS_OPEN}T123${ARITHMOS_CLOSE} plus Thai ๑๒๓ must remain byte-exact.`,
]) {
  const r = arithmosEncode(s, ENC, { budgetMs: 1500, maxArms: 1 });
  check('G4', arithmosDecode(r.wire) === s, `total/collision exact: ${JSON.stringify(s)}`);
}

// Every contracted digit script must be capable of winning on a realistic
// repeated-record shape, not merely recognized by an exactness-only fixture.
{
  const scripts: Array<[string, number, string]> = [
    ['arabicIndic', 0x0660, 'فاتورة'], ['persian', 0x06f0, 'سفارش'],
    ['devanagari', 0x0966, 'प्रविष्टि'], ['bengali', 0x09e6, 'চালান'], ['thai', 0x0e50, 'รายการ'],
  ];
  for (const [key, base, label] of scripts) {
    const native = (n: number) => String(n).replace(/[0-9]/g, (d) => String.fromCodePoint(base + Number(d)));
    const text = Array.from({ length: 32 }, (_, i) => `${label} ${native(100000 + i * 7919)} ${native(9000 + i * 173)} ${native(20260900 + i)}`).join('\n');
    const r = arithmosEncode(text, ENC, { budgetMs: 1500, maxArms: 1 });
    check('G7', r.arithmosApplied && r.arithmosScripts[0] === key && arithmosDecode(r.wire) === text, `${key} has an applied exact document-container path`);
  }
}

// Deterministic fuzz across every script, malformed marker, ordinary prose,
// delimiters, and astral characters.
{
  let seed = 0x9e3779b9;
  const next = () => ((seed = Math.imul(seed ^ (seed >>> 16), 0x45d9f3b)) >>> 0) / 2 ** 32;
  const atoms = ['word', ' ', '-', '١٢٣', '۱۲۳', '१२۳', '১২৩', '๑๒๓', '123', ARITHMOS_MARK, ARITHMOS_ESCAPE, ARITHMOS_OPEN, ARITHMOS_CLOSE, '😀', '中文'];
  let errors = 0;
  for (let k = 0; k < 500; k++) {
    const s = Array.from({ length: 3 + Math.floor(next() * 20) }, () => atoms[Math.floor(next() * atoms.length)]).join('');
    if (arithmosDecode(arithmosEncode(s, ENC, { budgetMs: 500, maxArms: 1 }).wire) !== s) errors++;
  }
  check('G8', errors === 0, `${500 - errors}/500 deterministic fuzz cases exact`);
}

{
  const r = table.get('arabicIndicInvoiceLedger')!;
  const plain = daedalusEncode(arabicIndicInvoiceLedger, ENC, { budgetMs: 3000, maxArms: 2 });
  const saved = plain.messageTokens - r.messageTokens;
  const pct = 100 * saved / plain.messageTokens;
  console.log(`G9 receipt: raw=${T(arabicIndicInvoiceLedger)} plain=${plain.messageTokens} arithmos=${r.messageTokens} saved=${saved} (${pct.toFixed(1)}%), spans=${r.arithmosSpans}`);
  check('G9', r.arithmosApplied && saved >= 50 && pct >= 5, 'large realistic invoice gain clears 50 tokens and 5%');
}
{
  const t0 = Date.now();
  const spans = findArithmosSpans(arabicIndicInvoiceLedger);
  check('G10', Date.now() - t0 < 50 && spans.length > 100, `linear span scan finds ${spans.length} runs under 50ms`);
}

console.log(`ARITHMOS RED TEAM: ${pass} passed, ${fail} failed`);
if (bad.length) console.log(bad.join('\n'));
process.exitCode = fail ? 1 : 0;
