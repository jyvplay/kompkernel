// Z49 second-order adversary for PARADEIGMA: shapes built to break template induction, type separation,
// chains, anchors, commas and the two readers.  Every case must round-trip byte-exactly under the native
// decoder AND the independent CPython reader; "applied" expectations are checked where they matter.
// Usage: OMEGA_DET=1 bench/tmp/run.sh bench/z49/adversary.ts
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { paradeigmaEncode, paradeigmaDecode } from '@/lib/omega/paradeigma';
const enc = 'o200k_base' as const;

const user = (login: string, id: number, extra = '') => `    {
      "login": "${login}",
      "id": ${id},
      "node_id": "MDQ6VXNlcj${id}",
      "avatar_url": "https://avatars.githubusercontent.com/u/${id}?v=4",
      "gravatar_id": "",
      "url": "https://api.github.com/users/${login}",
      "html_url": "https://github.com/${login}",
      "followers_url": "https://api.github.com/users/${login}/followers",
      "type": "User",
      "site_admin": false${extra}
    }`;
const arr = (items: string[]) => `[\n${items.join(',\n')}\n]\n`;
const users = ['alice', 'bob', 'carol', 'dave', 'erin', 'frank'].map((l, i) => user(l, 1000 + i * 7));
const many = Array.from({ length: 20 }, (_, i) => user(`user${i}x`, 5000 + i * 13));

interface Case { name: string; text: string; expectApplied?: boolean; force?: boolean }
const cases: Case[] = [];
// 1 plain user list: the canonical win
cases.push({ name: 'user-list-20', text: arr(many), expectApplied: true });
cases.push({ name: 'user-list-6-forced', text: arr(users), force: true });
// 2 minority skeleton: one user has a custom avatar; must stay literal, others templated
cases.push({ name: 'minority-literal', text: arr([...users.slice(0, 5), user('zed', 9999).replace('https://avatars.githubusercontent.com/u/9999?v=4', 'https://example.com/zed.png')]), force: true });
// 3 optional field: one object lacks the templated field entirely -> no spurious insertion
cases.push({ name: 'optional-field', text: arr([...users.slice(0, 5), user('yan', 4242).replace('      "followers_url": "https://api.github.com/users/yan/followers",\n', '')]), force: true });
// 4 values with < and > : never templated, never corrupted
cases.push({ name: 'angle-brackets', text: arr(users.map(u => u.replace('"site_admin": false', '"site_admin": false,\n      "sig": "<login> is <id>"'))), force: true });
// 5 keys with escapes and odd characters
cases.push({ name: 'odd-keys', text: arr(users.map(u => u.replace('"site_admin": false', '"site_admin": false,\n      "+1": 0,\n      "a\\"b": "x",\n      "we ird": "https://github.com/' + u.match(/"login": "(\w+)"/)![1] + '"'))) });
// 6 forward reference: html_url equals a LATER field (svn_url) and a template over an earlier field is also possible
cases.push({ name: 'forward-ref', text: arr(users.map(u => u.replace('"type": "User"', '"type": "User",\n      "svn_url": "https://github.com/' + u.match(/"login": "(\w+)"/)![1] + '"'))), force: true });
// 7 mutual reference: created_at == updated_at in every object
cases.push({ name: 'mutual-ref', text: arr(users.map((u, i) => u.replace('"type": "User"', `"created_at": "2024-01-0${i + 1}T00:00:00Z",\n      "updated_at": "2024-01-0${i + 1}T00:00:00Z",\n      "type": "User"`))), force: true });
// 8 same key, different shapes at different depths: issue.url vs user.url
const issue = (n: number, u: string) => `  {
    "url": "https://api.github.com/repos/o/r/issues/${n}",
    "html_url": "https://github.com/o/r/issues/${n}",
    "number": ${n},
    "user": {
      "login": "${u}",
      "id": ${n * 3},
      "url": "https://api.github.com/users/${u}",
      "html_url": "https://github.com/${u}"
    },
    "labels": [
      "bug",
      "p${n}"
    ],
    "state": "open"
  }`;
cases.push({ name: 'nested-shapes', text: arr([issue(1, 'annie'), issue(2, 'benny'), issue(3, 'cyrus'), issue(4, 'deedee'), issue(5, 'evelyn')]), force: true });
// 9 text beginning with the mark: must be refused
cases.push({ name: 'starts-with-mark', text: '≡ objects having "x": first: "y": 1\n' + arr(users), expectApplied: false });
// 10 compact JSON (one line) and JSONL: no line structure -> plain
cases.push({ name: 'compact', text: JSON.stringify(JSON.parse(arr(users))) + '\n', expectApplied: false });
cases.push({ name: 'jsonl', text: users.map(u => JSON.stringify(JSON.parse(u))).join('\n') + '\n', expectApplied: false });
// 11 trailing shell noise after the root
cases.push({ name: 'trailing-noise', text: arr(users) + '$ echo done\ndone\n', force: true });
// 12 truncated paste (cut mid-line)
cases.push({ name: 'truncated', text: arr(users).slice(0, -40), force: true });
// 13 numbers as slots and whole-value numeric copies (number == id)
cases.push({ name: 'numeric-copy', text: arr(users.map(u => u.replace('"gravatar_id": ""', '"gravatar_id": "",\n      "number": ' + u.match(/"id": (\d+)/)![1]))), force: true });
// 14 CRLF -> plain
cases.push({ name: 'crlf', text: arr(users).replace(/\n/g, '\r\n'), expectApplied: false });
// 15 two objects only: below break-even -> plain in real mode, exact when forced
cases.push({ name: 'two-objects', text: arr(users.slice(0, 2)) });
cases.push({ name: 'two-objects-forced', text: arr(users.slice(0, 2)), force: true });
// 16 first-field template with a container as the object's first field
cases.push({ name: 'first-before-container', text: arr(users.map((u, i) => `    {\n      "meta": {\n        "k": ${i}\n      },\n      "name": "name${i}",\n      "slug": "x-name${i}"\n    }`)), force: true });
// 17 single-line nested objects and empty containers as constants
cases.push({ name: 'inline-containers', text: arr(users.map(u => u.replace('"gravatar_id": ""', '"gravatar_id": "",\n      "perms": {"admin": false},\n      "tags": []'))), force: true });
// 18 duplicate keys inside an object
cases.push({ name: 'duplicate-keys', text: arr(users.map(u => u.replace('"type": "User"', '"type": "User",\n      "type": "User"'))), force: true });
// 19 sibling value that is a substring of another value with word boundaries on both sides ("node" in "nodejs/node")
cases.push({ name: 'substring-sibling', text: arr(['node', 'npm', 'nvm', 'nan', 'nbd'].map(n => `  {\n    "name": "${n}",\n    "full_name": "nodejs/${n}",\n    "org": "nodejs",\n    "url": "https://api.github.com/repos/nodejs/${n}"\n  }`)), force: true });
// 20 anchor that is an array field: insertion must land after the array's closer
cases.push({ name: 'anchor-after-array', text: arr(users.map((u, i) => `    {\n      "login": "user${i}",\n      "roles": [\n        "a",\n        "b"\n      ],\n      "url": "https://api.github.com/users/user${i}",\n      "n": ${i}\n    }`)), force: true });

const results: { name: string; applied: boolean; native: boolean; python: boolean; M: number; plain: number; note: string }[] = [];
const wires: string[] = [];
for (const c of cases) {
  const r = paradeigmaEncode(c.text, enc, c.force ? { force: true } : {});
  wires.push(r.wire);
  results.push({ name: c.name + (c.force ? ' [forced]' : ''), applied: r.applied, native: paradeigmaDecode(r.wire) === c.text && r.decoded === c.text, python: false, M: r.messageTokens, plain: r.plainMessageTokens, note: r.notes.slice(0, 110) });
}
fs.mkdirSync('bench/z49/receipts', { recursive: true });
fs.writeFileSync('bench/z49/receipts/adversary.cases.json', JSON.stringify(wires));
execFileSync('python3', ['bench/paradeigma_decode.py', 'bench/z49/receipts/adversary.cases.json', 'bench/z49/receipts/adversary.py.json'], { stdio: 'inherit' });
const py: string[] = JSON.parse(fs.readFileSync('bench/z49/receipts/adversary.py.json', 'utf8'));
let ok = 0, fail = 0;
results.forEach((r, i) => {
  r.python = py[i] === cases[i].text;
  const exp = cases[i].expectApplied;
  const expOk = exp === undefined || exp === r.applied;
  const pass = r.native && r.python && expOk;
  if (pass) ok++; else fail++;
  console.log(`${pass ? 'PASS' : 'FAIL'}\t${r.name}\tapplied=${r.applied}${exp !== undefined ? ` (expected ${exp})` : ''}\tnative=${r.native ? 'BYTE_IDENTICAL' : 'MISMATCH'}\tcpython=${r.python ? 'BYTE_IDENTICAL' : 'MISMATCH'}\tM=${r.M} plain=${r.plain}\t${r.note}`);
});
console.log(`${ok}/${results.length} pass, ${fail} fail`);
