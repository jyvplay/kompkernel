// Cross-check: PARADEIGMA wires decoded by the independent CPython reader (bench/paradeigma_decode.py) and by the native decoder.
// Usage: FILES="a b c" OUT=bench/z49/receipts/xcheck [MODE=forced|real] bench/tmp/run.sh bench/z49/xcheck.ts
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { paradeigmaEncode, paradeigmaDecode } from '@/lib/omega/paradeigma';
const enc = 'o200k_base' as const;
const files = (process.env.FILES || '').split(/\s+/).filter(Boolean);
const forced = (process.env.MODE || 'forced') === 'forced';
const sha = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex').slice(0, 16);
const cases: string[] = [], texts: string[] = [], names: string[] = [], infos: string[] = [];
for (const f of files) {
  const text = fs.readFileSync(f, 'utf8');
  const r = paradeigmaEncode(text, enc, forced ? { force: true } : {});
  if (!r.applied) { console.log(`${f.split('/').pop()}\tnot applied (${r.notes.slice(0, 90)})`); continue; }
  cases.push(r.wire); texts.push(text); names.push(f.split('/').pop()!); infos.push(`${r.templates} templates, ${r.elidedLines} lines, M ${r.messageTokens} vs plain ${r.plainMessageTokens}`);
}
const base = process.env.OUT || 'bench/z49/receipts/xcheck';
const inJ = base + '.cases.json', outJ = base + '.py.json';
fs.writeFileSync(inJ, JSON.stringify(cases));
execFileSync('python3', ['bench/paradeigma_decode.py', inJ, outJ], { stdio: 'inherit' });
const py: string[] = JSON.parse(fs.readFileSync(outJ, 'utf8'));
let ok = 0;
for (let i = 0; i < cases.length; i++) {
  const native = paradeigmaDecode(cases[i]) === texts[i], python = py[i] === texts[i];
  if (native && python) ok++;
  console.log(`${names[i]}\tnative=${native ? 'BYTE_IDENTICAL' : 'MISMATCH'}\tcpython=${python ? 'BYTE_IDENTICAL' : 'MISMATCH'}\tsha256(text)=${sha(texts[i])}\t${infos[i]}`);
}
console.log(`${ok}/${cases.length} byte-identical under both readers (${forced ? 'forced' : 'real'} mode)`);
