// z50 red-team for SYNARTESIS. Every case is a MUTATION of a real lockfile slice (bench inputs are real; the
// mutation is the adversary). Each row: native round trip, then the CPython reader (bench/synartesis_decode.py).
// usage: bench/tmp/run.sh bench/z50/redteam-syn.ts  (writes bench/z50/receipts/redteam-syn.{cases,py}.json)
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { synartesisEncode, synDecode, SYN_RULE } from '@/lib/omega/synartesis';
const enc = 'o200k_base' as const;
// real entries (whole, from the repository's lockfile) that carry a resolved line, wrapped in a valid JSON skeleton
const src = fs.readFileSync('package-lock.json', 'utf8').split('\n');
const pick: string[] = [];
for (let i = 0, n = 0; i < src.length && n < 8; i++) {
  if (!/^ {4}"node_modules\/[^"]*": \{$/.test(src[i])) continue;
  let j = i + 1; while (src[j] !== '    },' && src[j] !== '    }') j++;
  const block = src.slice(i, j + 1);
  if (block.some(l => /^ {6}"resolved": /.test(l))) { pick.push(...block); n++; }
  i = j;
}
const base = '{\n  "packages": {\n' + pick.join('\n').replace(/\n    \},?$/, '\n    }').replace(/,\s*$/, '') + '\n  }\n}\n';
const L = base.split('\n');
const idx = (re: RegExp, from = 0) => L.findIndex((l, i) => i >= from && re.test(l));
const r1 = idx(/^ {6}"resolved": /);
const cases: { name: string; text: string }[] = [];
cases.push({ name: 'slice (real, 260 lines)', text: base });
{ const a = L.slice(); a.splice(r1, 1); cases.push({ name: 'integrity without resolved (one line deleted)', text: a.join('\n') }); }
{ const a = L.slice(); a[r1] = a[r1].replace(/"https:[^"]*"/, '"https://example.com/x/-/x-1.0.0.tgz"'); cases.push({ name: 'one non-standard resolved URL', text: a.join('\n') }); }
{ const a = L.slice(); const t = a[r1 - 1]; a[r1 - 1] = a[r1]; a[r1] = t; cases.push({ name: 'resolved before version (swapped)', text: a.join('\n') }); }
cases.push({ name: 'payload begins with the rule prefix', text: '∴ npm lock: demo\n' + base });
cases.push({ name: 'payload carries the exact rule line (escape path)', text: SYN_RULE + '\n' + base });
cases.push({ name: 'payload carries the exact escape line (escape path)', text: 'x\n∴ npm lock: literal payload follows\n' + base });
cases.push({ name: 'CRLF line endings', text: base.replace(/\n/g, '\r\n') });
cases.push({ name: 'truncated mid-entry', text: L.slice(0, r1 + 1).join('\n') + '\n' });
{ const a = L.slice(); const v = idx(/^ {6}"version": /); a[v] = a[v].replace(/"([^"]*)",?$/, '"$1-rc.1+build.5",'); const r = idx(/^ {6}"resolved": /, v); if (r === v + 1) a[r] = a[r].replace(/-(\d[^-]*?)\.tgz/, '-$1-rc.1+build.5.tgz'); cases.push({ name: 'prerelease+build version on one entry', text: a.join('\n') }); }
{ const a = L.slice(); a[r1] = a[r1].replace(/,$/, ''); cases.push({ name: 'resolved without trailing comma', text: a.join('\n') }); }
{ const a = L.slice(); const v = idx(/^ {6}"version": /); a.splice(v, 1); cases.push({ name: 'version line removed from one entry', text: a.join('\n') }); }
cases.push({ name: 'empty input', text: '' });
cases.push({ name: 'single newline', text: '\n' });
cases.push({ name: 'not JSON (prose)', text: 'The lockfile lists every package. Resolved URLs are functions of name and version.\n' });
{ const a = L.slice(); const k = idx(/^ {4}"node_modules\//); a[k] = a[k].replace(/"node_modules\/([^"]*)"/, '"node_modules/x/node_modules/@s/$1"'); cases.push({ name: 'nested node_modules key (renamed one entry)', text: a.join('\n') }); }
const rows: any[] = [];
const wires: string[] = [], texts: string[] = [], names: string[] = [];
for (const c of cases) {
  const r = synartesisEncode(c.text, enc, {});
  const native = synDecode(r.wire) === c.text;
  rows.push({ name: c.name, bytes: c.text.length, reducedArm: r.reducedArm, elided: r.elidedResolved, M: r.messageTokens, paradeigmaM: r.paradeigmaM, native, sha: createHash('sha256').update(c.text).digest('hex').slice(0, 12) });
  wires.push(r.wire); texts.push(c.text); names.push(c.name);
}
fs.writeFileSync('bench/z50/receipts/redteam-syn.cases.json', JSON.stringify(wires));
execFileSync('python3', ['bench/synartesis_decode.py', 'bench/z50/receipts/redteam-syn.cases.json', 'bench/z50/receipts/redteam-syn.py.json'], { stdio: 'inherit' });
const py: string[] = JSON.parse(fs.readFileSync('bench/z50/receipts/redteam-syn.py.json', 'utf8'));
let ok = 0;
rows.forEach((row, i) => { row.cpython = py[i] === texts[i]; if (row.native && row.cpython) ok++; console.log(JSON.stringify(row)); });
console.log(`${ok}/${rows.length} byte-identical under both readers`);
const pyRule = execFileSync('python3', ['-c', "import sys; sys.path.insert(0,'bench'); import synartesis_decode as s; sys.stdout.write(s.RULE)"], { encoding: 'utf8' });
console.log('python RULE equals TS SYN_RULE: ' + (pyRule === SYN_RULE));
